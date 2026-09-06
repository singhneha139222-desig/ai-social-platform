import logging
import time
import torch
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification

from app.config import DEVICE, MODEL_CACHE_DIR, XAI_ENABLED
from app.models.xai_utils import generate_gradient_x_input_explanation

logger = logging.getLogger(__name__)

# Constants
LANG_DETECT_MODEL = "papluca/xlm-roberta-base-language-detection"
MULTILINGUAL_TOXIC_MODEL = "unitary/multilingual-toxic-xlm-roberta"
TOXICITY_LABELS = ['toxic', 'severe_toxic', 'obscene', 'threat', 'insult', 'identity_hate']

class LanguageModerator:
    def __init__(self):
        self.lang_pipe = None
        self.tox_model = None
        self.tox_tokenizer = None
        self.device = DEVICE
        self._loaded = False

    def load(self):
        try:
            logger.info("Loading language detection model...")
            # Language detector (pipeline automatically uses cache if specified)
            self.lang_pipe = pipeline("text-classification", model=LANG_DETECT_MODEL, device=0 if self.device.startswith('cuda') else -1, model_kwargs={'cache_dir': MODEL_CACHE_DIR})
            
            logger.info("Loading multilingual toxicity model...")
            self.tox_tokenizer = AutoTokenizer.from_pretrained(MULTILINGUAL_TOXIC_MODEL, cache_dir=MODEL_CACHE_DIR)
            self.tox_model = AutoModelForSequenceClassification.from_pretrained(MULTILINGUAL_TOXIC_MODEL, cache_dir=MODEL_CACHE_DIR)
            self.tox_model.to(self.device)
            self.tox_model.eval()
            
            self._loaded = True
            logger.info("Multilingual models loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load multilingual models: {e}")
            raise

    @property
    def is_loaded(self):
        return self._loaded
        
    def detect_language(self, text: str) -> dict:
        if not self._loaded:
            raise RuntimeError("Multilingual models not loaded")
            
        res = self.lang_pipe(text[:512], top_k=1)[0]
        return {
            'language': res['label'],
            'confidence': res['score']
        }
        
    def predict_toxicity(self, text: str) -> dict:
        if not self._loaded:
            raise RuntimeError("Multilingual models not loaded")
            
        t0 = time.perf_counter()
        
        inputs = self.tox_tokenizer(
            text,
            return_tensors='pt',
            truncation=True,
            max_length=128,
            padding=True
        ).to(self.device)
        
        with torch.inference_mode():
            outputs = self.tox_model(**inputs)
            probs = torch.sigmoid(outputs.logits).squeeze().cpu().tolist()
            
        if isinstance(probs, float):
            probs = [probs]
            
        categories = {}
        for i, label in enumerate(TOXICITY_LABELS):
            if i < len(probs):
                categories[label] = round(probs[i], 6)
            else:
                categories[label] = 0.0

        toxicity_score = max(categories.values())
        
        decision = 'publish'
        if toxicity_score > 0.90:
            decision = 'reject'
        elif toxicity_score > 0.70:
            decision = 'flag'
            
        t1 = time.perf_counter()
        
        result = {
            'toxicity_score': round(toxicity_score, 6),
            'categories': categories,
            'decision': decision,
            'model': MULTILINGUAL_TOXIC_MODEL,
            'inferenceTimeMs': round((t1 - t0) * 1000, 2)
        }
        
        # XAI Execution Policy
        if XAI_ENABLED and (decision == 'flag' or decision == 'reject'):
            # Determine target category
            target_category = max(categories, key=categories.get)
            target_idx = TOXICITY_LABELS.index(target_category)
            
            logger.info(f"Generating XAI for multilingual target: {target_category} (idx: {target_idx})")
            
            xai_t0 = time.perf_counter()
            # max_length is 128 for tox_tokenizer in this file
            explanation = generate_gradient_x_input_explanation(
                self.tox_model, self.tox_tokenizer, text, target_idx, target_category, 128, self.device
            )
            xai_t1 = time.perf_counter()
            logger.info(f"[AIMetric] Multilingual XAI_ms={(xai_t1 - xai_t0)*1000:.2f}")
            
            result['explanation'] = explanation
            
        return result

language_moderator = LanguageModerator()
