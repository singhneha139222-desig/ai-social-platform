"""
Toxicity Detection Model Factory.

Supports both the legacy unitary/toxic-bert and the modern DeBERTa model for improved performance.
Models are loaded once at initialization and reused for all requests.
"""
import logging
import time
import torch
from abc import ABC, abstractmethod
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from app.config import MODERATION_MODEL, TOXICITY_MODEL, DEBERTA_MODEL, DEVICE, MODEL_CACHE_DIR, XAI_ENABLED
from app.models.xai_utils import generate_gradient_x_input_explanation

logger = logging.getLogger(__name__)

# Jigsaw Toxicity labels
TOXICITY_LABELS = [
    'toxic', 'severe_toxic', 'obscene', 'threat', 'insult', 'identity_hate'
]


class BaseModerationModel(ABC):
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.device = DEVICE
        self.model_name = ""
        self._loaded = False
        self.max_length = 128

    def load(self):
        """Load model and tokenizer. Called once at startup."""
        try:
            logger.info(f"Loading moderation model: {self.model_name}")
            logger.info(f"Device: {self.device}")
            
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                cache_dir=MODEL_CACHE_DIR
            )
            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.model_name,
                cache_dir=MODEL_CACHE_DIR
            )
            self.model.to(self.device)
            self.model.eval()
            self._loaded = True

            logger.info(f"Model loaded successfully. Labels: {TOXICITY_LABELS}")
        except Exception as e:
            logger.error(f"Failed to load moderation model: {e}")
            raise

    @property
    def is_loaded(self):
        return self._loaded

    def predict(self, text: str) -> dict:
        if not self._loaded:
            raise RuntimeError(f"Model {self.model_name} not loaded. Call load() first.")

        if not text or not text.strip():
            return {
                'toxicity_score': 0.0,
                'categories': {label: 0.0 for label in TOXICITY_LABELS},
                'decision': 'publish',
                'model': self.model_name,
                'inferenceTimeMs': 0
            }

        t0 = time.perf_counter()
        
        # Tokenize
        inputs = self.tokenizer(
            text,
            return_tensors='pt',
            truncation=True,
            max_length=self.max_length,
            padding=True
        ).to(self.device)
        
        t_token = time.perf_counter()

        # Inference
        with torch.inference_mode(): # More efficient than no_grad
            outputs = self.model(**inputs)
            t_infer = time.perf_counter()
            
            # Extract logits and apply sigmoid
            probabilities = self._process_logits(outputs.logits)
            t_post = time.perf_counter()

        categories = {}
        for i, label in enumerate(TOXICITY_LABELS):
            if i < len(probabilities):
                categories[label] = round(probabilities[i], 6)
            else:
                categories[label] = 0.0

        toxicity_score = max(categories.values())
        decision = self._get_decision(toxicity_score)
        
        t_final = time.perf_counter()
        
        tokenization_ms = (t_token - t0) * 1000
        model_inference_ms = (t_infer - t_token) * 1000
        tensor_ms = (t_post - t_infer) * 1000
        postprocess_ms = (t_final - t_post) * 1000
        total_ms = (t_final - t0) * 1000
        
        logger.info(f"[AIMetric] {self.model_name} | total_ms={total_ms:.2f} tokenization_ms={tokenization_ms:.2f} model_inference_ms={model_inference_ms:.2f} tensor_ms={tensor_ms:.2f}")

        result = {
            'toxicity_score': round(toxicity_score, 6),
            'categories': categories,
            'decision': decision,
            'model': self.model_name,
            'inferenceTimeMs': round(total_ms, 2)
        }
        
        # XAI Execution Policy
        if XAI_ENABLED and (decision == 'flag' or decision == 'reject'):
            # Determine target category
            target_category = max(categories, key=categories.get)
            target_idx = TOXICITY_LABELS.index(target_category)
            
            logger.info(f"Generating XAI for target: {target_category} (idx: {target_idx})")
            
            xai_t0 = time.perf_counter()
            explanation = generate_gradient_x_input_explanation(
                self.model, self.tokenizer, text, target_idx, target_category, self.max_length, self.device
            )
            xai_t1 = time.perf_counter()
            logger.info(f"[AIMetric] XAI_ms={(xai_t1 - xai_t0)*1000:.2f}")
            
            result['explanation'] = explanation
            
        return result

    @abstractmethod
    def _process_logits(self, logits: torch.Tensor) -> list:
        pass

    @staticmethod
    def _get_decision(score: float) -> str:
        """
        score <= 0.70      → publish
        0.70 < score <= 0.90 → flag
        score > 0.90       → reject
        """
        if score > 0.90:
            return 'reject'
        elif score > 0.70:
            return 'flag'
        else:
            return 'publish'


class ToxicBertModel(BaseModerationModel):
    def __init__(self):
        super().__init__()
        self.model_name = TOXICITY_MODEL

    def _process_logits(self, logits: torch.Tensor) -> list:
        probs = torch.sigmoid(logits).squeeze().cpu().tolist()
        return [probs] if isinstance(probs, float) else probs


class DebertaModerationModel(BaseModerationModel):
    def __init__(self):
        super().__init__()
        self.model_name = DEBERTA_MODEL

    def _process_logits(self, logits: torch.Tensor) -> list:
        probs = torch.sigmoid(logits).squeeze().cpu().tolist()
        return [probs] if isinstance(probs, float) else probs


def get_moderation_model():
    """Factory method to get the configured moderation model."""
    if MODERATION_MODEL.lower() == 'deberta':
        return DebertaModerationModel()
    elif MODERATION_MODEL.lower() == 'toxicbert':
        return ToxicBertModel()
    else:
        logger.warning(f"Unknown MODERATION_MODEL: {MODERATION_MODEL}. Falling back to DeBERTa.")
        return DebertaModerationModel()

# Singleton instance
toxicity_detector = get_moderation_model()
