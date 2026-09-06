import os
import json
import joblib
import torch
from bson import ObjectId
import datetime

from app.bot_detection.dataset import get_mongo_db
from app.bot_detection.model import BotDetectionGraphSAGE
from app.bot_detection.features import build_node_features
from torch_geometric.data import Data
import pandas as pd

class BotDetectionInference:
    def __init__(self, cache_dir='models_cache'):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Load Config
        config_path = os.path.join(cache_dir, 'gnn_config.json')
        if not os.path.exists(config_path):
            raise FileNotFoundError("Bot Detection model not found. Run training first.")
            
        with open(config_path, 'r') as f:
            self.config = json.load(f)
            
        self.max_neighbors = self.config.get('max_neighbors', 50)
        self.max_hops = self.config.get('max_hops', 2)
        
        # Load Scaler
        scaler_path = os.path.join(cache_dir, 'feature_scaler.pkl')
        self.scaler = joblib.load(scaler_path)
        
        # Load Model
        self.model = BotDetectionGraphSAGE(
            in_channels=self.config['in_channels'],
            hidden_channels=self.config['hidden_channels'],
            out_channels=1
        ).to(self.device)
        
        model_path = os.path.join(cache_dir, 'graphsage_bot_detect.pt')
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.eval()

    def get_ego_graph(self, target_user_id: str):
        """Constructs a bounded k-hop ego graph for the target user."""
        db = get_mongo_db()
        
        visited_nodes = set([target_user_id])
        current_frontier = set([target_user_id])
        
        edges_list = set() # (src, dst)
        
        # Extract k-hop neighborhood manually to respect MongoDB bounds
        for hop in range(self.max_hops):
            next_frontier = set()
            for user_id in current_frontier:
                try:
                    obj_id = ObjectId(user_id)
                except:
                    continue
                    
                # 1. Target follows someone
                out_interactions = list(db.interactions.find(
                    {'user': obj_id, 'targetUser': {'$ne': None}},
                    {'targetUser': 1}
                ).limit(self.max_neighbors))
                for ix in out_interactions:
                    dst = str(ix.get('targetUser'))
                    edges_list.add((user_id, dst))
                    if dst not in visited_nodes:
                        visited_nodes.add(dst)
                        next_frontier.add(dst)
                        
                # 2. Someone follows target
                in_interactions = list(db.interactions.find(
                    {'targetUser': obj_id},
                    {'user': 1}
                ).limit(self.max_neighbors))
                for ix in in_interactions:
                    src = str(ix.get('user'))
                    edges_list.add((src, user_id))
                    if src not in visited_nodes:
                        visited_nodes.add(src)
                        next_frontier.add(src)
            current_frontier = next_frontier
            if not current_frontier:
                break
                
        # Now fetch user data for visited_nodes
        users = list(db.users.find({'_id': {'$in': [ObjectId(uid) for uid in visited_nodes if len(uid) == 24]}}))
        user_id_to_idx = {str(u['_id']): i for i, u in enumerate(users)}
        idx_to_user_id = {i: str(u['_id']) for i, u in enumerate(users)}
        num_users = len(users)
        
        # Re-map edges to integer indices
        mapped_edges = []
        for src, dst in edges_list:
            if src in user_id_to_idx and dst in user_id_to_idx:
                mapped_edges.append((user_id_to_idx[src], user_id_to_idx[dst]))
                
        if mapped_edges:
            edge_index = torch.tensor(mapped_edges, dtype=torch.long).t().contiguous()
        else:
            edge_index = torch.empty((2, 0), dtype=torch.long)
            
        # Extract Model Features (NO LABEL SIGNALS LEAKED)
        now = datetime.datetime.now(datetime.timezone.utc)
        model_features = []
        for u in users:
            created_at = u.get('createdAt')
            if created_at and created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=datetime.timezone.utc)
            account_age_days = (now - created_at).days if created_at else 0
            bio_length = len(u.get('bio', ''))
            
            model_features.append({
                'user_id': str(u['_id']),
                'account_age_days': account_age_days,
                'bio_length': bio_length
            })
            
        model_features_df = pd.DataFrame(model_features)
        
        data = Data(edge_index=edge_index, num_nodes=num_users)
        data.user_ids = [idx_to_user_id[i] for i in range(num_users)]
        
        # Extract label signals for the UI response (NOT input to GNN)
        target_u = next((u for u in users if str(u['_id']) == target_user_id), None)
        signals_dict = {}
        if target_u:
            target_obj_id = target_u['_id']
            signals_dict['followers'] = target_u.get('followersCount', 0)
            signals_dict['following'] = target_u.get('followingCount', 0)
            signals_dict['posts_count'] = db.posts.count_documents({'author': target_obj_id})
            signals_dict['likes_given'] = db.interactions.count_documents({'user': target_obj_id, 'type': 'like'})
        
        return data, model_features_df, signals_dict

    def predict(self, user_id: str):
        # 1. Bounded ego graph
        data, model_features_df, signals = self.get_ego_graph(user_id)
        
        # Cold start check
        total_interactions = signals.get('followers', 0) + signals.get('following', 0) + signals.get('posts_count', 0)
        if total_interactions < 3:
            return {
                "status": "insufficient_data",
                "message": "User has fewer than 3 interactions."
            }
            
        # 2. Add features exactly like training
        data = build_node_features(data, model_features_df)
        
        # 3. Scaler Transform
        scaled_x = self.scaler.transform(data.x.numpy())
        data.x = torch.tensor(scaled_x, dtype=torch.float).to(self.device)
        data.edge_index = data.edge_index.to(self.device)
        
        # Find target node index
        try:
            target_idx = data.user_ids.index(user_id)
        except ValueError:
            return {"status": "error", "message": "User not found in graph"}
            
        # 4. Inference
        with torch.no_grad():
            out = self.model(data.x, data.edge_index)
            # Apply sigmoid to get bot probability for the target node
            prob = torch.sigmoid(out[target_idx]).item()
            
        risk_level = "Low"
        if prob > self.config['thresholds']['bot']:
            risk_level = "Critical"
        elif prob > 0.6:
            risk_level = "High"
        elif prob > 0.4:
            risk_level = "Medium"
            
        return {
            "status": "success",
            "botProbability": float(prob),
            "riskLevel": risk_level,
            "modelVersion": "graphsage-v1",
            "behavioralSignals": signals
        }
