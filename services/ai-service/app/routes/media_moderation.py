"""
Media Moderation API Route.

POST /api/v1/moderation/image
POST /api/v1/moderation/video
"""
from flask import Blueprint, request, jsonify
import logging
from app.models.media_moderation import media_moderator

logger = logging.getLogger(__name__)

media_bp = Blueprint('media_moderation', __name__)

@media_bp.route('/api/v1/moderation/image', methods=['POST'])
def analyze_image():
    if not media_moderator.is_loaded:
        return jsonify({
            'error': 'Media model not loaded',
            'code': 'MODEL_NOT_LOADED'
        }), 503

    data = request.get_json()
    if not data or 'path' not in data:
        return jsonify({
            'error': 'Request body must include image path',
            'code': 'MISSING_PATH'
        }), 400

    image_path = data['path']

    try:
        result = media_moderator.predict_image(image_path)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Image prediction error: {e}")
        return jsonify({
            'error': 'Prediction failed',
            'code': 'PREDICTION_ERROR',
            'details': str(e)
        }), 500

@media_bp.route('/api/v1/moderation/video', methods=['POST'])
def analyze_video():
    if not media_moderator.is_loaded:
        return jsonify({
            'error': 'Media model not loaded',
            'code': 'MODEL_NOT_LOADED'
        }), 503

    data = request.get_json()
    if not data or 'path' not in data:
        return jsonify({
            'error': 'Request body must include video path',
            'code': 'MISSING_PATH'
        }), 400

    video_path = data['path']

    try:
        result = media_moderator.predict_video(video_path)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Video prediction error: {e}")
        return jsonify({
            'error': 'Prediction failed',
            'code': 'PREDICTION_ERROR',
            'details': str(e)
        }), 500
