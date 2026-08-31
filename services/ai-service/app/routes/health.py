"""
Health Check API Route.

GET /health
"""
from flask import Blueprint, jsonify

from app.models.toxicity import toxicity_detector
from app.models.sentiment import sentiment_analyzer

health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint.
    Reports service status and model loading states.
    """
    toxicity_status = 'loaded' if toxicity_detector.is_loaded else 'not_loaded'
    sentiment_status = 'loaded' if sentiment_analyzer.is_loaded else 'not_loaded'

    all_healthy = toxicity_detector.is_loaded and sentiment_analyzer.is_loaded

    return jsonify({
        'status': 'healthy' if all_healthy else 'degraded',
        'service': 'ai-service',
        'models': {
            'toxicity': {
                'status': toxicity_status,
                'model': toxicity_detector.model_name,
            },
            'sentiment': {
                'status': sentiment_status,
                'model': sentiment_analyzer.model_name,
            },
        },
    }), 200 if all_healthy else 503
