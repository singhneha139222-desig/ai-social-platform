"""
AI Service Entry Point.
Loads models at startup and starts the Flask server.
"""
import logging
import sys
from waitress import serve

from app import create_app
from app.config import PORT, DEBUG
from app.models.toxicity import toxicity_detector
from app.models.sentiment import sentiment_analyzer

logger = logging.getLogger(__name__)


def main():
    """Load models and start the server."""
    logger.info("=" * 60)
    logger.info("AI Service Starting")
    logger.info("=" * 60)

    # Load models (once at startup, not per-request)
    try:
        logger.info("Loading AI models... This may take a few minutes on first run.")
        toxicity_detector.load()
        sentiment_analyzer.load()
        
        from app.models.media_moderation import media_moderator
        media_moderator.load()
        
        from app.models.language import language_moderator
        language_moderator.load()
        
        from app.models.bot_model import bot_detector
        bot_detector.load()
        
        logger.info("All models loaded successfully!")
    except Exception as e:
        logger.error(f"FATAL: Failed to load models: {e}")
        logger.error("The AI service will start in degraded mode.")
        logger.error("Models will report as not loaded via /health endpoint.")
        # Don't exit — let the service start so health checks can report status

    # Create and run the Flask app
    app = create_app()

    logger.info(f"Starting AI service via Waitress on port {PORT} with 8 threads")
    serve(app, host='0.0.0.0', port=PORT, threads=8)


if __name__ == '__main__':
    main()
