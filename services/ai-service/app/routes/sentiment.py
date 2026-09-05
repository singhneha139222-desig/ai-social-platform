"""
Sentiment Analysis API Route.

POST /api/v1/sentiment
"""
from flask import Blueprint, request, jsonify
import logging

from app.models.sentiment import sentiment_analyzer

logger = logging.getLogger(__name__)

sentiment_bp = Blueprint('sentiment', __name__)


import time

@sentiment_bp.route('/api/v1/sentiment', methods=['POST'])
def analyze_sentiment():
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
        t0 = time.perf_counter()
        result = sentiment_analyzer.predict(text)
        t1 = time.perf_counter()
        inference_ms = (t1 - t0) * 1000
        logger.info(f"[AIMetric] sentiment_inference_ms={inference_ms:.2f}")
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Sentiment prediction error: {e}")
        return jsonify({
            'error': 'Prediction failed',
            'code': 'PREDICTION_ERROR'
        }), 500
