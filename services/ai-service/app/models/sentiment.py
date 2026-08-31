"""
Sentiment Analysis Model.

Model: lxyuan/distilbert-base-multilingual-cased-sentiments-student
Architecture: DistilBERT (multilingual cased) fine-tuned via knowledge distillation
              from a teacher model for 3-class sentiment classification.
Dataset: Trained on multiple sentiment datasets through knowledge distillation.
         The teacher model was trained on a combination of sentiment datasets.
Labels: positive, neutral, negative (3-class, directly supported — no artificial mapping).

Why this model:
  The project specification requires DistilBERT for sentiment analysis with
  positive/neutral/negative classification. Unlike SST-2 (binary: positive/negative),
  this model natively supports all three classes, avoiding the need for
  artificial neutral class construction via confidence thresholds.

Input: Raw text string (max 512 tokens after DistilBERT tokenization).
Preprocessing: DistilBERT tokenizer handles tokenization and special tokens.
Inference: Forward pass through DistilBERT → softmax → class probabilities.

Output:
  {
    "label": "positive" | "neutral" | "negative",
    "score": float in [0, 1],  # confidence for the predicted label
    "all_scores": {            # probabilities for all classes
      "positive": float,
      "neutral": float,
      "negative": float
    },
    "model": "lxyuan/distilbert-base-multilingual-cased-sentiments-student"
  }

Label Mapping:
  The model's output labels map directly to our target labels:
    - "positive" → "positive"
    - "neutral"  → "neutral"
    - "negative" → "negative"
  No additional mapping or thresholding is required.

Limitations:
  - Primarily trained on English data despite being multilingual
  - Sentiment is context-dependent; short texts may be ambiguous
  - Knowledge-distilled model trades some accuracy for inference speed
  - May not capture domain-specific sentiment (e.g., financial, medical)
"""
import logging
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from app.config import SENTIMENT_MODEL, DEVICE, MODEL_CACHE_DIR

logger = logging.getLogger(__name__)

# Expected label order from the model
SENTIMENT_LABELS = ['positive', 'neutral', 'negative']


class SentimentAnalyzer:
    """
    DistilBERT-based 3-class sentiment analysis.
    Model is loaded once at initialization and reused for all requests.
    """

    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.device = DEVICE
        self.model_name = SENTIMENT_MODEL
        self._loaded = False
        self._label_map = {}

    def load(self):
        """Load model and tokenizer. Called once at startup."""
        try:
            logger.info(f"Loading sentiment model: {self.model_name}")
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

            # Build label mapping from model config
            if hasattr(self.model.config, 'id2label'):
                self._label_map = self.model.config.id2label
                logger.info(f"Model label mapping: {self._label_map}")
            else:
                # Fallback mapping
                self._label_map = {i: label for i, label in enumerate(SENTIMENT_LABELS)}
                logger.warning(f"Using fallback label mapping: {self._label_map}")

            self._loaded = True
            logger.info("Sentiment model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load sentiment model: {e}")
            raise

    @property
    def is_loaded(self):
        return self._loaded

    def predict(self, text: str) -> dict:
        """
        Analyze text sentiment.

        Args:
            text: Input text string

        Returns:
            dict with label, score, all_scores, model
        """
        if not self._loaded:
            raise RuntimeError("Sentiment model not loaded. Call load() first.")

        if not text or not text.strip():
            return {
                'label': 'neutral',
                'score': 1.0,
                'all_scores': {'positive': 0.0, 'neutral': 1.0, 'negative': 0.0},
                'model': self.model_name
            }

        # Tokenize
        inputs = self.tokenizer(
            text,
            return_tensors='pt',
            truncation=True,
            max_length=512,
            padding=True
        ).to(self.device)

        # Inference
        with torch.no_grad():
            outputs = self.model(**inputs)
            probabilities = torch.softmax(outputs.logits, dim=-1).squeeze().cpu().tolist()

        # Handle single-dimension output
        if isinstance(probabilities, float):
            probabilities = [probabilities]

        # Map model output indices to our labels
        all_scores = {}
        for idx, prob in enumerate(probabilities):
            model_label = self._label_map.get(idx, f'label_{idx}')
            # Normalize label to our expected set
            normalized_label = self._normalize_label(model_label)
            all_scores[normalized_label] = round(prob, 6)

        # Ensure all expected labels exist
        for label in SENTIMENT_LABELS:
            if label not in all_scores:
                all_scores[label] = 0.0

        # Get the predicted label (highest probability)
        predicted_label = max(all_scores, key=all_scores.get)
        predicted_score = all_scores[predicted_label]

        return {
            'label': predicted_label,
            'score': round(predicted_score, 6),
            'all_scores': all_scores,
            'model': self.model_name
        }

    @staticmethod
    def _normalize_label(label: str) -> str:
        """
        Normalize model output labels to our expected set.
        The chosen model uses lowercase 'positive', 'neutral', 'negative' directly,
        but this handles potential variations for robustness.
        """
        label_lower = label.lower().strip()
        label_mappings = {
            'positive': 'positive',
            'pos': 'positive',
            'neutral': 'neutral',
            'neu': 'neutral',
            'negative': 'negative',
            'neg': 'negative',
        }
        return label_mappings.get(label_lower, label_lower)


# Singleton instance
sentiment_analyzer = SentimentAnalyzer()
