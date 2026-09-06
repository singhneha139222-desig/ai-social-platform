import torch
import torch.nn.functional as F
from torch_geometric.nn import SAGEConv

class BotDetectionGraphSAGE(torch.nn.Module):
    def __init__(self, in_channels, hidden_channels=32, out_channels=1, dropout=0.5):
        super(BotDetectionGraphSAGE, self).__init__()
        self.conv1 = SAGEConv(in_channels, hidden_channels)
        self.conv2 = SAGEConv(hidden_channels, hidden_channels)
        self.lin = torch.nn.Linear(hidden_channels, out_channels)
        self.dropout = dropout

    def forward(self, x, edge_index):
        # Layer 1
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)
        
        # Layer 2
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)
        
        # Classification head
        out = self.lin(x)
        return out
