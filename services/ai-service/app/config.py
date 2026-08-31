"""
AI Service Configuration.
Loads settings from environment variables with sensible defaults.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Server
PORT = int(os.getenv('AI_PORT', '5001'))
DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'

# Models
TOXICITY_MODEL = os.getenv('TOXICITY_MODEL', 'unitary/toxic-bert')
SENTIMENT_MODEL = os.getenv('SENTIMENT_MODEL', 'lxyuan/distilbert-base-multilingual-cased-sentiments-student')

# Device: 'cpu', 'cuda', or 'auto'
DEVICE = os.getenv('DEVICE', 'cpu')

# Model cache directory
MODEL_CACHE_DIR = os.getenv('MODEL_CACHE_DIR', './models_cache')
