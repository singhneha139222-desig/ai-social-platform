"""
Sentiment Analysis API Route.

POST /api/v1/sentiment
"""
from flask import Blueprint, request, jsonify
import logging

from app.models.sentiment import sentiment_analyzer

logger = logging.getLogger(__name__)

sentiment_bp = Blueprint('sentiment', __name__)


@sentiment_bp.route('/api/v1/sentiment', methods=['POST'])
def analyze_sentiment():
    """
    Analyze text sentiment.

    Request:
        { "text": "example text" }

    Response:
        {
            "label": "positive",
            "score": 0.94,
            "all_scores": { "positive": 0.94, "neutral": 0.04, "negative": 0.02 },
            "model": "lxyuan/distilbert-base-multilingual-cased-sentiments-student"
        }
    """
    if not sentiment_analyzer.is_loaded:
        return jsonify({
            'error': 'Sentiment model not loaded',
            'code': 'MODEL_NOT_LOADED'
        }), 503

    data = request.get_json()
    if not data:
        return jsonify({
            'error': 'Request body is required',
            'code': 'MISSING_BODY'
        }), 400

    text = data.get('text', '')
    if not isinstance(text, str):
        return jsonify({
            'error': 'Text must be a string',
            'code': 'INVALID_INPUT'
        }), 400

    try:
        result = sentiment_analyzer.predict(text)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Sentiment prediction error: {e}")
        return jsonify({
            'error': 'Prediction failed',
            'code': 'PREDICTION_ERROR'
        }), 500
