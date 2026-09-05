"""
Toxicity Detection Model.

Model: unitary/toxic-bert
Architecture: BERT-base-uncased fine-tuned on the Jigsaw Toxic Comment Classification dataset.
Dataset: Jigsaw/Conversation AI toxic comment dataset (~160k Wikipedia talk page comments).
Labels: toxic, severe_toxic, obscene, threat, insult, identity_hate (multi-label).

Input: Raw text string (max 512 tokens after BERT tokenization).
Preprocessing: BERT WordPiece tokenizer handles tokenization, lowercasing, and special tokens.
Inference: Forward pass through BERT → sigmoid activation per label → probabilities in [0, 1].

Scoring Strategy:
  The overall toxicity score is the MAXIMUM probability across all 6 toxic categories.
  Rationale: This is a conservative approach — if ANY category has high probability,
  the content should be moderated. This is documented and explainable for FYP viva.

  Alternative strategies considered:
  - Mean across categories: Less conservative, might miss content that is specifically
    threatening but not obscene. Rejected for safety reasons.
  - Weighted sum: Would require subjective weighting of harm categories.
    Rejected for simplicity and reproducibility.

Output:
  {
    "toxicity_score": float in [0, 1],  # max across categories
    "categories": {                      # individual category probabilities
      "toxic": float,
      "severe_toxic": float,
      "obscene": float,
      "threat": float,
      "insult": float,
      "identity_hate": float
    },
    "decision": "publish" | "flag" | "reject",
    "model": "unitary/toxic-bert"
  }

Limitations:
  - English-only (trained on English Wikipedia comments)
  - May not detect coded language, sarcasm, or context-dependent toxicity
  - Multi-label but not multi-class — doesn't distinguish severity within categories
  - Training data bias from Wikipedia's specific content patterns
"""
import logging
import time
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from app.config import TOXICITY_MODEL, DEVICE, MODEL_CACHE_DIR

logger = logging.getLogger(__name__)

# Category labels for unitary/toxic-bert (order matches model output)
TOXICITY_LABELS = [
    'toxic', 'severe_toxic', 'obscene', 'threat', 'insult', 'identity_hate'
]


class ToxicityDetector:
    """
    BERT-based toxicity detection using unitary/toxic-bert.
    Model is loaded once at initialization and reused for all requests.
    """

    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.device = DEVICE
        self.model_name = TOXICITY_MODEL
        self._loaded = False

    def load(self):
        """Load model and tokenizer. Called once at startup."""
        try:
            logger.info(f"Loading toxicity model: {self.model_name}")
            logger.info(f"Device: {self.device}")
            logger.info(f"Cache dir: {MODEL_CACHE_DIR}")

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

            logger.info(f"Toxicity model loaded successfully. Labels: {TOXICITY_LABELS}")
        except Exception as e:
            logger.error(f"Failed to load toxicity model: {e}")
            raise

    @property
    def is_loaded(self):
        return self._loaded

    def predict(self, text: str) -> dict:
        """
        Analyze text for toxicity.

        Args:
            text: Input text string

        Returns:
            dict with toxicity_score, categories, decision, model
        """
        if not self._loaded:
            raise RuntimeError("Toxicity model not loaded. Call load() first.")

        if not text or not text.strip():
            return {
                'toxicity_score': 0.0,
                'categories': {label: 0.0 for label in TOXICITY_LABELS},
                'decision': 'publish',
                'model': self.model_name
            }

        t0 = time.perf_counter()
        # Tokenize
        inputs = self.tokenizer(
            text,
            return_tensors='pt',
            truncation=True,
            max_length=128, # Phase 12: Reduced from 512 for performance
            padding=True
        ).to(self.device)
        t_token = time.perf_counter()
        tokenization_ms = (t_token - t0) * 1000

        # Inference
        with torch.no_grad():
            outputs = self.model(**inputs)
            t_infer = time.perf_counter()
            model_inference_ms = (t_infer - t_token) * 1000
            
            # Apply sigmoid for multi-label probabilities
            probabilities = torch.sigmoid(outputs.logits).squeeze().cpu().tolist()
            t_post = time.perf_counter()
            tensor_ms = (t_post - t_infer) * 1000

        # Handle single-dimension output
        if isinstance(probabilities, float):
            probabilities = [probabilities]

        # Build category map
        categories = {}
        for i, label in enumerate(TOXICITY_LABELS):
            if i < len(probabilities):
                categories[label] = round(probabilities[i], 6)
            else:
                categories[label] = 0.0

        # Overall score = max across categories (conservative approach)
        toxicity_score = max(categories.values())

        # Apply moderation thresholds
        decision = self._get_decision(toxicity_score)
        
        t_final = time.perf_counter()
        postprocess_ms = (t_final - t_post) * 1000
        
        logger.info(f"[AIMetric] tokenization_ms={tokenization_ms:.2f} model_inference_ms={model_inference_ms:.2f} tensor_ms={tensor_ms:.2f} postprocess_ms={postprocess_ms:.2f}")

        return {
            'toxicity_score': round(toxicity_score, 6),
            'categories': categories,
            'decision': decision,
            'model': self.model_name
        }

    @staticmethod
    def _get_decision(score: float) -> str:
        """
        Apply moderation thresholds.
        These must match backend/src/utils/constants.js thresholds.

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


# Singleton instance
toxicity_detector = ToxicityDetector()
