"""
AI Service Flask Application Factory.
"""
import logging
from flask import Flask

from app.routes.moderation import moderation_bp
from app.routes.sentiment import sentiment_bp
from app.routes.health import health_bp

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # Register blueprints
    app.register_blueprint(moderation_bp)
    app.register_blueprint(sentiment_bp)
    app.register_blueprint(health_bp)

    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        return {'error': 'Not found', 'code': 'NOT_FOUND'}, 404

    @app.errorhandler(500)
    def server_error(e):
        logger.error(f"Internal server error: {e}")
        return {'error': 'Internal server error', 'code': 'INTERNAL_ERROR'}, 500

    return app
