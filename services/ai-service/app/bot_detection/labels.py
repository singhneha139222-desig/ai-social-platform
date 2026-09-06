import numpy as np
import pandas as pd

def generate_weak_labels(label_signals_df: pd.DataFrame) -> pd.DataFrame:
    """
    Generates weakly supervised pseudo-labels for Bot Detection based on heuristic signals.
    Returns the dataframe with added columns: 'bot_score' and 'weak_label'.
    'weak_label': 1.0 (Bot), 0.0 (Human), np.nan (Uncertain - to be excluded)
    """
    df = label_signals_df.copy()
    
    # Initialize score
    df['bot_score'] = 0.0
    
    # Signal 1: Zero reciprocal follows (high following, 0 followers)
    # Give high bot score if they follow many but have 0 followers
    suspicious_follow_ratio = (df['following_count_raw'] > 20) & (df['followers_count_raw'] == 0)
    df.loc[suspicious_follow_ratio, 'bot_score'] += 0.4
    
    # Signal 2: Excessive posting
    if df['posts_count'].max() > 0:
        p95_posts = np.percentile(df['posts_count'], 95)
        excessive_posts = df['posts_count'] > max(p95_posts, 20)
        df.loc[excessive_posts, 'bot_score'] += 0.3
        
    # Signal 3: Excessive likes given
    if df['likes_given'].max() > 0:
        p95_likes = np.percentile(df['likes_given'], 95)
        excessive_likes = df['likes_given'] > max(p95_likes, 50)
        df.loc[excessive_likes, 'bot_score'] += 0.3
        
    # Signal 4: Human-like behavior (decreases bot score)
    # Has a healthy follower count or normal activity
    healthy_followers = df['followers_count_raw'] > 5
    df.loc[healthy_followers, 'bot_score'] -= 0.3
    
    # Cap bot_score between 0 and 1
    df['bot_score'] = df['bot_score'].clip(0, 1)
    
    # Assign weak labels
    df['weak_label'] = np.nan
    df.loc[df['bot_score'] > 0.8, 'weak_label'] = 1.0
    df.loc[df['bot_score'] < 0.2, 'weak_label'] = 0.0
    
    return df
