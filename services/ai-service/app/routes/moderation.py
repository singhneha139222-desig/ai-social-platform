"""
Toxicity Moderation API Route.

POST /api/v1/moderation/toxicity
"""
from flask import Blueprint, request, jsonify
import logging

from app.models.toxicity import toxicity_detector

logger = logging.getLogger(__name__)

moderation_bp = Blueprint('moderation', __name__)


import time

@moderation_bp.route('/api/v1/moderation/toxicity', methods=['POST'])
def analyze_toxicity():
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
        t0 = time.perf_counter()
        result = toxicity_detector.predict(text)
        t1 = time.perf_counter()
        inference_ms = (t1 - t0) * 1000
        logger.info(f"[AIMetric] toxicity_inference_ms={inference_ms:.2f}")
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Toxicity prediction error: {e}")
        return jsonify({
            'error': 'Prediction failed',
            'code': 'PREDICTION_ERROR'
        }), 500
