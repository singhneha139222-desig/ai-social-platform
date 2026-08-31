"""
Toxicity Moderation API Route.

POST /api/v1/moderation/toxicity
"""
from flask import Blueprint, request, jsonify
import logging

from app.models.toxicity import toxicity_detector

logger = logging.getLogger(__name__)

moderation_bp = Blueprint('moderation', __name__)


@moderation_bp.route('/api/v1/moderation/toxicity', methods=['POST'])
def analyze_toxicity():
    """
    Analyze text for toxicity.

    Request:
        { "text": "example text" }

    Response:
        {
            "toxicity_score": 0.12,
            "categories": { "toxic": 0.12, ... },
            "decision": "publish",
            "model": "unitary/toxic-bert"
        }
    """
    if not toxicity_detector.is_loaded:
        return jsonify({
            'error': 'Toxicity model not loaded',
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
        result = toxicity_detector.predict(text)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Toxicity prediction error: {e}")
        return jsonify({
            'error': 'Prediction failed',
            'code': 'PREDICTION_ERROR'
        }), 500
