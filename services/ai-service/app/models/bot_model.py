import logging
import time

logger = logging.getLogger(__name__)

class BotDetectorSingleton:
    def __init__(self):
        self.is_loaded = False
        self.model = None

    def load(self):
        try:
            from app.bot_detection.inference import BotDetectionInference
            self.model = BotDetectionInference()
            self.is_loaded = True
            logger.info("Bot Detection GraphSAGE model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load Bot Detection model: {e}")
            self.is_loaded = False

    def predict(self, user_id: str):
        if not self.is_loaded:
            raise RuntimeError("Bot Detection model not loaded")
        return self.model.predict(user_id)

bot_detector = BotDetectorSingleton()
