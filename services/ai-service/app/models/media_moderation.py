import logging
import time
import torch
import cv2
import os
from PIL import Image
from transformers import AutoModelForImageClassification, ViTImageProcessor

from app.config import DEVICE, MODEL_CACHE_DIR

logger = logging.getLogger(__name__)

# Constants
NSFW_IMAGE_MODEL = "Falconsai/nsfw_image_detection"
VIDEO_SAMPLE_COUNT = 5
VIDEO_NSFW_THRESHOLD = 0.8
IMAGE_NSFW_THRESHOLD = 0.8

class MediaModerator:
    def __init__(self):
        self.model = None
        self.processor = None
        self.device = DEVICE
        self.model_name = NSFW_IMAGE_MODEL
        self._loaded = False

    def load(self):
        try:
            logger.info(f"Loading media moderation model: {self.model_name}")
            self.processor = ViTImageProcessor.from_pretrained(
                self.model_name,
                cache_dir=MODEL_CACHE_DIR
            )
            self.model = AutoModelForImageClassification.from_pretrained(
                self.model_name,
                cache_dir=MODEL_CACHE_DIR
            )
            self.model.to(self.device)
            self.model.eval()
            self._loaded = True
            logger.info(f"Media model loaded successfully. Labels: {self.model.config.id2label}")
        except Exception as e:
            logger.error(f"Failed to load media moderation model: {e}")
            raise

    @property
    def is_loaded(self):
        return self._loaded

    def _predict_image_pil(self, image: Image.Image) -> dict:
        t0 = time.perf_counter()
        inputs = self.processor(images=image, return_tensors="pt").to(self.device)
        
        with torch.inference_mode():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1).squeeze().cpu().tolist()
            
        t1 = time.perf_counter()
        
        # Falconsai/nsfw_image_detection labels: 0: normal, 1: nsfw
        nsfw_prob = probs[1]
        
        decision = 'publish'
        status = 'published'
        reason = 'Image is safe'
        
        if nsfw_prob > IMAGE_NSFW_THRESHOLD:
            decision = 'reject'
            status = 'rejected'
            reason = f'NSFW score {nsfw_prob:.4f} exceeds rejection threshold'
        elif nsfw_prob > 0.5:
            decision = 'flag'
            status = 'flagged'
            reason = f'NSFW score {nsfw_prob:.4f} flagged for review'
            
        return {
            'toxicity_score': nsfw_prob,
            'categories': {
                'nsfw': round(nsfw_prob, 6),
                'normal': round(probs[0], 6)
            },
            'decision': decision,
            'status': status,
            'reason': reason,
            'model': self.model_name,
            'inferenceTimeMs': round((t1 - t0) * 1000, 2)
        }

    def predict_image(self, image_path: str) -> dict:
        if not self._loaded:
            raise RuntimeError("Media model not loaded")
        
        try:
            if image_path.startswith('http://') or image_path.startswith('https://'):
                import requests
                from io import BytesIO
                response = requests.get(image_path, timeout=10)
                response.raise_for_status()
                image = Image.open(BytesIO(response.content))
            else:
                if not os.path.exists(image_path):
                    raise FileNotFoundError(f"Image not found: {image_path}")
                image = Image.open(image_path)
                
            if image.mode != 'RGB':
                image = image.convert('RGB')
            return self._predict_image_pil(image)
        except Exception as e:
            logger.error(f"Error predicting image {image_path}: {e}")
            raise

    def predict_video(self, video_path: str) -> dict:
        if not self._loaded:
            raise RuntimeError("Media model not loaded")
            
        is_url = video_path.startswith('http://') or video_path.startswith('https://')
        if not is_url and not os.path.exists(video_path):
            raise FileNotFoundError(f"Video not found: {video_path}")
            
        t0 = time.perf_counter()
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")
            
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames == 0:
            cap.release()
            raise ValueError(f"Video has no frames: {video_path}")
            
        # Sample frames evenly
        step = max(1, total_frames // VIDEO_SAMPLE_COUNT)
        sampled_indices = [i * step for i in range(VIDEO_SAMPLE_COUNT)]
        
        flagged_frames = 0
        max_nsfw_score = 0.0
        categories_sum = {'nsfw': 0.0, 'normal': 0.0}
        
        valid_frames = 0
        
        for idx in sampled_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if not ret:
                continue
                
            # Convert BGR (OpenCV) to RGB (PIL)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(frame_rgb)
            
            res = self._predict_image_pil(pil_img)
            nsfw_score = res['toxicity_score']
            
            if nsfw_score > max_nsfw_score:
                max_nsfw_score = nsfw_score
                
            if nsfw_score > VIDEO_NSFW_THRESHOLD:
                flagged_frames += 1
                
            categories_sum['nsfw'] += res['categories']['nsfw']
            categories_sum['normal'] += res['categories']['normal']
            valid_frames += 1
            
        cap.release()
        
        if valid_frames == 0:
            raise ValueError("Could not extract any valid frames from video")
            
        # Aggregation logic
        flagged_ratio = flagged_frames / valid_frames
        
        decision = 'publish'
        status = 'published'
        reason = 'Video is safe'
        
        if flagged_ratio > 0.5:
            decision = 'reject'
            status = 'rejected'
            reason = f'Video rejected: {flagged_frames}/{valid_frames} frames exceeded NSFW threshold'
        elif flagged_frames > 0:
            decision = 'flag'
            status = 'flagged'
            reason = f'Video flagged: {flagged_frames}/{valid_frames} frames exceeded NSFW threshold'
            
        t1 = time.perf_counter()
        
        return {
            'toxicity_score': max_nsfw_score,
            'categories': {
                'nsfw': round(categories_sum['nsfw'] / valid_frames, 6),
                'normal': round(categories_sum['normal'] / valid_frames, 6)
            },
            'decision': decision,
            'status': status,
            'reason': reason,
            'model': self.model_name,
            'inferenceTimeMs': round((t1 - t0) * 1000, 2),
            'framesSampled': valid_frames,
            'flaggedFrames': flagged_frames
        }

media_moderator = MediaModerator()
