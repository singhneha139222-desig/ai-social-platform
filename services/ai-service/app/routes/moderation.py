"""
Toxicity Moderation API Route.

POST /api/v1/moderation/toxicity
"""
from flask import Blueprint, request, jsonify
import logging

from app.models.toxicity import toxicity_detector
from app.models.language import language_moderator
from app.models.bot_model import bot_detector

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
        
        # 1. Detect language
        lang_res = None
        if language_moderator.is_loaded:
            lang_res = language_moderator.detect_language(text)
            
        # 2. Choose model based on language
        # If no lang_res, or if language is english (en), use DeBERTa
        result = None
        if not lang_res or lang_res['language'] == 'en':
            result = toxicity_detector.predict(text)
            if lang_res:
                result['language'] = lang_res['language']
                result['languageConfidence'] = lang_res['confidence']
            else:
                result['language'] = 'en'
                result['languageConfidence'] = 1.0
        else:
            # Non-English or Hinglish (hi) detected, use multilingual model
            result = language_moderator.predict_toxicity(text)
            result['language'] = lang_res['language']
            result['languageConfidence'] = lang_res['confidence']

        t1 = time.perf_counter()
        inference_ms = (t1 - t0) * 1000
        logger.info(f"[AIMetric] toxicity_inference_ms={inference_ms:.2f} (lang={result.get('language', 'unknown')})")
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Toxicity prediction error: {e}")
        return jsonify({
            'error': 'Prediction failed',
            'code': 'PREDICTION_ERROR'
        }), 500

@moderation_bp.route('/api/v1/moderation/bot-detect', methods=['POST'])
def analyze_bot():
    if not bot_detector.is_loaded:
        return jsonify({
            'error': 'Bot Detection model not loaded',
            'code': 'MODEL_NOT_LOADED'
        }), 503
        
    data = request.get_json()
    if not data or 'userId' not in data:
        return jsonify({
            'error': 'userId is required',
            'code': 'MISSING_INPUT'
        }), 400
        
    try:
        t0 = time.perf_counter()
        result = bot_detector.predict(data['userId'])
        t1 = time.perf_counter()
        
        result['inferenceTimeMs'] = (t1 - t0) * 1000
        logger.info(f"[AIMetric] bot_inference_ms={result['inferenceTimeMs']:.2f}")
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Bot detection error: {e}")
        return jsonify({
            'error': 'Bot detection failed',
            'code': 'PREDICTION_ERROR'
        }), 500
