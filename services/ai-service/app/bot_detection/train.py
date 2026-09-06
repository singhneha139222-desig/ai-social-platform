import os
import torch
import numpy as np
import json
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score

from dataset import build_graph_and_features
from labels import generate_weak_labels
from features import build_node_features
from split import create_leakage_safe_split
from model import BotDetectionGraphSAGE

def evaluate_model(y_true, y_pred, y_prob, name="Model"):
    try:
        p = precision_score(y_true, y_pred)
        r = recall_score(y_true, y_pred)
        f1 = f1_score(y_true, y_pred)
        auc = roc_auc_score(y_true, y_prob)
    except ValueError:
        p, r, f1, auc = 0, 0, 0, 0
    print(f"[{name}] Precision: {p:.4f} | Recall: {r:.4f} | F1: {f1:.4f} | ROC-AUC: {auc:.4f}")
    return p, r, f1, auc

def run_training_pipeline():
    # 1. Load Data
    data, label_signals_df, model_features_df = build_graph_and_features()
    
    # 2. Generate Weak Labels
    labels_df = generate_weak_labels(label_signals_df)
    
    # 3. Add Features
    data = build_node_features(data, model_features_df)
    
    # 4. Leakage-safe split
    data = create_leakage_safe_split(data, labels_df)
    
    # 5. Fit Scaler ONLY on train mask
    scaler = StandardScaler()
    x_train = data.x[data.train_mask].numpy()
    if len(x_train) > 0:
        scaler.fit(x_train)
    data.x = torch.tensor(scaler.transform(data.x.numpy()), dtype=torch.float)
    
    # Check if we have positive classes in train (to avoid error if data is too small)
    y_train = data.y[data.train_mask].numpy().flatten()
    if len(y_train) == 0 or len(np.unique(y_train)) < 2:
        print("Not enough data to train (missing classes in training set). Generating mock artifacts for development.")
        # Create mock artifacts for dev
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        model = BotDetectionGraphSAGE(in_channels=data.x.size(1), hidden_channels=32, out_channels=1)
        os.makedirs('models_cache', exist_ok=True)
        torch.save(model.state_dict(), 'models_cache/graphsage_bot_detect.pt')
        joblib.dump(scaler, 'models_cache/feature_scaler.pkl')
        config = {
            'in_channels': data.x.size(1),
            'hidden_channels': 32,
            'feature_version': 'v1',
            'label_strategy_version': 'weak-v1',
            'max_neighbors': 50,
            'max_hops': 2,
            'thresholds': {'bot': 0.8, 'human': 0.2}
        }
        with open('models_cache/gnn_config.json', 'w') as f:
            json.dump(config, f)
        return
        
    # Baseline: Random Forest
    rf = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
    rf.fit(x_train, y_train)
    
    # Evaluate Baseline
    x_test = data.x[data.test_mask].numpy()
    y_test = data.y[data.test_mask].numpy().flatten()
    
    if len(y_test) > 0 and len(np.unique(y_test)) > 1:
        rf_preds = rf.predict(x_test)
        rf_probs = rf.predict_proba(x_test)[:, 1]
        evaluate_model(y_test, rf_preds, rf_probs, name="Random Forest Baseline")
    else:
        print("Not enough data in test set for Random Forest evaluation.")
    
    # 6. GraphSAGE Training
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = BotDetectionGraphSAGE(in_channels=data.x.size(1), hidden_channels=32, out_channels=1)
    data = data.to(device)
    model = model.to(device)
    
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=5e-4)
    
    # Class weights for BCEWithLogitsLoss
    pos_count = (data.y[data.train_mask] == 1).sum().item()
    neg_count = (data.y[data.train_mask] == 0).sum().item()
    pos_weight = torch.tensor([neg_count / max(pos_count, 1)]).to(device)
    criterion = torch.nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    
    model.train()
    for epoch in range(100):
        optimizer.zero_grad()
        out = model(data.x, data.edge_index)
        loss = criterion(out[data.train_mask], data.y[data.train_mask])
        loss.backward()
        optimizer.step()
        
    # Evaluate GraphSAGE
    model.eval()
    with torch.no_grad():
        out = model(data.x, data.edge_index)
        probs = torch.sigmoid(out[data.test_mask]).cpu().numpy().flatten()
        preds = (probs > 0.5).astype(int)
        
    if len(y_test) > 0 and len(np.unique(y_test)) > 1:
        evaluate_model(y_test, preds, probs, name="GraphSAGE")
    else:
        print("Not enough data in test set for GraphSAGE evaluation.")
        
    # 7. Save Model Artifacts
    os.makedirs('models_cache', exist_ok=True)
    torch.save(model.state_dict(), 'models_cache/graphsage_bot_detect.pt')
    joblib.dump(scaler, 'models_cache/feature_scaler.pkl')
    
    config = {
        'in_channels': data.x.size(1),
        'hidden_channels': 32,
        'feature_version': 'v1',
        'label_strategy_version': 'weak-v1',
        'max_neighbors': 50,
        'max_hops': 2,
        'thresholds': {'bot': 0.8, 'human': 0.2}
    }
    with open('models_cache/gnn_config.json', 'w') as f:
        json.dump(config, f)
        
    print("Training complete. Artifacts saved.")

if __name__ == '__main__':
    run_training_pipeline()
