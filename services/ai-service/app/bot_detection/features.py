import torch
from torch_geometric.data import Data
from torch_geometric.utils import degree
import pandas as pd

def add_graph_features(data: Data) -> Data:
    """
    Computes graph structural features (in-degree, out-degree) and appends
    them to the node feature matrix x.
    """
    # edge_index is shape [2, num_edges]
    # row = source (out-degree), col = destination (in-degree)
    row, col = data.edge_index
    
    out_deg = degree(row, data.num_nodes, dtype=torch.float)
    in_deg = degree(col, data.num_nodes, dtype=torch.float)
    
    # Reshape to [num_nodes, 1]
    out_deg = out_deg.view(-1, 1)
    in_deg = in_deg.view(-1, 1)
    
    graph_features = torch.cat([in_deg, out_deg], dim=1)
    
    if data.x is not None:
        data.x = torch.cat([data.x, graph_features], dim=1)
    else:
        data.x = graph_features
        
    return data

def build_node_features(data: Data, model_features_df: pd.DataFrame) -> Data:
    """
    Combines independent behavioral features with graph features.
    Excludes label-generating features as per Option C (Leakage-safe).
    """
    # model_features_df has: user_id, account_age_days, bio_length
    # Convert to tensor matching the order in data.user_ids
    
    # Ensure ordered correctly
    df_ordered = model_features_df.set_index('user_id').loc[data.user_ids].reset_index()
    
    feature_cols = ['account_age_days', 'bio_length']
    feature_tensor = torch.tensor(df_ordered[feature_cols].values, dtype=torch.float)
    
    # Assign to data.x
    data.x = feature_tensor
    
    # Add graph structural features
    data = add_graph_features(data)
    
    return data
