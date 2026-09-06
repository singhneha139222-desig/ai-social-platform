import torch
import numpy as np
from torch_geometric.data import Data
from sklearn.model_selection import train_test_split
import pandas as pd

def create_leakage_safe_split(data: Data, labels_df: pd.DataFrame, train_ratio=0.7, val_ratio=0.15) -> Data:
    """
    Creates leakage-safe stratified train/val/test masks for PyG Data.
    Excludes uncertain pseudo-labels entirely (mask = False).
    """
    # Get weak labels aligned with data nodes
    df_ordered = labels_df.set_index('user_id').loc[data.user_ids].reset_index()
    weak_labels = df_ordered['weak_label'].values # 1.0, 0.0, or np.nan
    
    # 1. Identify valid nodes (not np.nan)
    valid_mask = ~np.isnan(weak_labels)
    valid_indices = np.where(valid_mask)[0]
    valid_labels = weak_labels[valid_indices]
    
    # Stratified split on valid nodes only
    # Note: if there are very few nodes (e.g., test dev environment), fallback to random
    try:
        train_idx, temp_idx, y_train, y_temp = train_test_split(
            valid_indices, valid_labels, train_size=train_ratio, stratify=valid_labels, random_state=42
        )
        val_size_adjusted = val_ratio / (1.0 - train_ratio)
        val_idx, test_idx, _, _ = train_test_split(
            temp_idx, y_temp, train_size=val_size_adjusted, stratify=y_temp, random_state=42
        )
    except ValueError:
        # Fallback if too few samples for stratification
        np.random.seed(42)
        np.random.shuffle(valid_indices)
        n_train = int(len(valid_indices) * train_ratio)
        n_val = int(len(valid_indices) * val_ratio)
        train_idx = valid_indices[:n_train]
        val_idx = valid_indices[n_train:n_train+n_val]
        test_idx = valid_indices[n_train+n_val:]
        
    # Create boolean masks
    train_mask = torch.zeros(data.num_nodes, dtype=torch.bool)
    val_mask = torch.zeros(data.num_nodes, dtype=torch.bool)
    test_mask = torch.zeros(data.num_nodes, dtype=torch.bool)
    
    train_mask[train_idx] = True
    val_mask[val_idx] = True
    test_mask[test_idx] = True
    
    data.train_mask = train_mask
    data.val_mask = val_mask
    data.test_mask = test_mask
    
    # Assign labels to PyG Data (fill NaNs with 0 temporarily, but masks exclude them)
    # y must be float for BCEWithLogitsLoss
    data.y = torch.tensor(np.nan_to_num(weak_labels, nan=0.0), dtype=torch.float).view(-1, 1)
    
    return data
