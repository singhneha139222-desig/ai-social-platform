import os
import pymongo
from bson import ObjectId
import torch
import numpy as np
import pandas as pd
from torch_geometric.data import Data
from typing import Dict, List, Tuple
from collections import defaultdict

def get_mongo_db():
    mongo_uri = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/ai-social-platform')
    client = pymongo.MongoClient(mongo_uri)
    return client.get_database()

def build_graph_and_features() -> Tuple[Data, pd.DataFrame, pd.DataFrame]:
    """
    Extracts data from MongoDB and constructs a directed homogeneous graph.
    Returns:
        - PyG Data object (with node features but no labels)
        - label_signals_df: Dataframe with heuristic signals for weak labeling
        - model_features_df: Dataframe with independent features for the GNN model
    """
    db = get_mongo_db()
    
    # 1. Fetch Users
    users = list(db.users.find({}, {
        '_id': 1, 
        'username': 1, 
        'followersCount': 1, 
        'followingCount': 1,
        'createdAt': 1,
        'bio': 1,
        'role': 1
    }))
    
    # Map user ObjectIds to continuous integer indices for PyG
    user_id_to_idx = {str(u['_id']): i for i, u in enumerate(users)}
    idx_to_user_id = {i: str(u['_id']) for i, u in enumerate(users)}
    num_users = len(users)
    
    # 2. Collect edges from Interactions (directed: source -> targetUser or source -> post.author)
    # Edge logic: A follows B -> A -> B
    # A likes/comments B's post -> A -> B
    
    edges_list = set() # (src_idx, dst_idx)
    
    # 2a. Explicit targetUser interactions (Follows)
    target_interactions = db.interactions.find({
        'targetUser': {'$ne': None}
    }, {'user': 1, 'targetUser': 1, 'type': 1})
    
    for interaction in target_interactions:
        src = str(interaction.get('user'))
        dst = str(interaction.get('targetUser'))
        if src in user_id_to_idx and dst in user_id_to_idx:
            edges_list.add((user_id_to_idx[src], user_id_to_idx[dst]))
            
    # 2b. Implicit interactions via Posts (Likes, Comments)
    # First, map posts to their authors
    posts = list(db.posts.find({}, {'_id': 1, 'author': 1}))
    post_author_map = {str(p['_id']): str(p['author']) for p in posts}
    
    post_interactions = db.interactions.find({
        'post': {'$ne': None}
    }, {'user': 1, 'post': 1, 'type': 1})
    
    for interaction in post_interactions:
        src = str(interaction.get('user'))
        post_id = str(interaction.get('post'))
        dst = post_author_map.get(post_id)
        if dst and src in user_id_to_idx and dst in user_id_to_idx and src != dst:
            edges_list.add((user_id_to_idx[src], user_id_to_idx[dst]))
            
    # Construct PyG edge_index
    if edges_list:
        edge_index = torch.tensor(list(edges_list), dtype=torch.long).t().contiguous()
    else:
        edge_index = torch.empty((2, 0), dtype=torch.long)
        
    # 3. Calculate node statistics for feature and label generation
    
    # We will compute:
    # Label Signals (A): post_count, like_given_count, follow_given_count
    # Model Features (B): bio_length, account_age_days
    
    # Compute post count per user
    post_counts = defaultdict(int)
    for p in posts:
        post_counts[str(p['author'])] += 1
        
    # Compute likes/follows given per user
    likes_given = defaultdict(int)
    follows_given = defaultdict(int)
    all_interactions = db.interactions.find({}, {'user': 1, 'type': 1})
    for interaction in all_interactions:
        src = str(interaction.get('user'))
        itype = interaction.get('type')
        if itype == 'like':
            likes_given[src] += 1
        elif itype == 'follow':
            follows_given[src] += 1

    # Extract Dataframes
    label_signals = []
    model_features = []
    
    import datetime
    now = datetime.datetime.now(datetime.timezone.utc)
    
    for i in range(num_users):
        u_id = idx_to_user_id[i]
        u = users[i]
        
        # Label Signals
        label_signals.append({
            'user_id': u_id,
            'posts_count': post_counts[u_id],
            'likes_given': likes_given[u_id],
            'follows_given': follows_given[u_id],
            'followers_count_raw': u.get('followersCount', 0),
            'following_count_raw': u.get('followingCount', 0)
        })
        
        # Model Features
        created_at = u.get('createdAt')
        # Handle naive datetimes by converting to UTC
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=datetime.timezone.utc)
        account_age_days = (now - created_at).days if created_at else 0
        bio_length = len(u.get('bio', ''))
        
        model_features.append({
            'user_id': u_id,
            'account_age_days': account_age_days,
            'bio_length': bio_length
        })
        
    label_signals_df = pd.DataFrame(label_signals)
    model_features_df = pd.DataFrame(model_features)
    
    # Store minimal data in PyG Data (features will be added later after normalization)
    data = Data(edge_index=edge_index, num_nodes=num_users)
    data.user_ids = [idx_to_user_id[i] for i in range(num_users)]
    
    return data, label_signals_df, model_features_df

if __name__ == '__main__':
    data, labels_df, feats_df = build_graph_and_features()
    print(f"Graph nodes: {data.num_nodes}, edges: {data.edge_index.size(1)}")
    print(f"Features df shape: {feats_df.shape}")
    print(f"Label signals df shape: {labels_df.shape}")
