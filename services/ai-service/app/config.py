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
MODERATION_MODEL = os.getenv('MODERATION_MODEL', 'deberta')
TOXICITY_MODEL = os.getenv('TOXICITY_MODEL', 'unitary/toxic-bert')
DEBERTA_MODEL = os.getenv('DEBERTA_MODEL', 'Emmytheo/Deberta-v3-finetuned-hate-speech-jigsaw-toxic-comments')
SENTIMENT_MODEL = os.getenv('SENTIMENT_MODEL', 'lxyuan/distilbert-base-multilingual-cased-sentiments-student')

# Device: 'cpu', 'cuda', or 'auto'
DEVICE = os.getenv('DEVICE', 'cpu')

# Model cache directory
MODEL_CACHE_DIR = os.getenv('MODEL_CACHE_DIR', './models_cache')

# XAI Configuration
XAI_ENABLED = os.getenv('XAI_ENABLED', 'true').lower() == 'true'
XAI_TOP_K = int(os.getenv('XAI_TOP_K', '5'))
