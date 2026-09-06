import torch
import logging
from app.config import XAI_TOP_K

logger = logging.getLogger(__name__)

def generate_gradient_x_input_explanation(model, tokenizer, text: str, target_idx: int, target_category: str, max_length: int, device: str) -> dict:
    """
    Generates a token-level attribution explanation using Gradient x Input.
    """
    try:
        # Important: this function must be called outside of torch.inference_mode() / no_grad()
        with torch.enable_grad():
            inputs = tokenizer(
                text,
                return_tensors='pt',
                truncation=True,
                max_length=max_length,
                padding=True
            ).to(device)
            
            input_ids = inputs['input_ids']
            attention_mask = inputs['attention_mask']
            
            # 1. Extract embeddings and enable gradients
            embeddings = model.get_input_embeddings()(input_ids)
            embeddings.requires_grad_(True)
            embeddings.retain_grad()
            
            # 2. Forward pass with embeddings (ensure not in inference_mode)
            outputs = model(inputs_embeds=embeddings, attention_mask=attention_mask)
            logits = outputs.logits
            
            # 3. Target class logit
            target_logit = logits[0, target_idx]
            
            # 4. Backward pass
            model.zero_grad()
            target_logit.backward()
            
            # 5. Extract gradients and compute importance
            gradients = embeddings.grad
            # Gradient x Input: L2 norm over hidden dimension
            importance_scores = (gradients * embeddings).norm(dim=-1).squeeze(0).cpu().tolist()
            
            # 6. Map tokens to scores
            tokens = tokenizer.convert_ids_to_tokens(input_ids.squeeze(0).tolist())
            
            word_scores = {}
            current_word = ""
            current_score = 0.0
            
            for token, score in zip(tokens, importance_scores):
                # Skip special tokens
                if token in [tokenizer.cls_token, tokenizer.sep_token, tokenizer.pad_token, '<s>', '</s>', '<pad>', '[CLS]', '[SEP]', '[PAD]']:
                    continue
                    
                is_new_word = False
                
                # SentencePiece / DeBERTa prefix
                if token.startswith('\u2581'):
                    token = token.replace('\u2581', '')
                    is_new_word = True
                # BERT subword suffix
                elif token.startswith('##'):
                    token = token.replace('##', '')
                    is_new_word = False
                elif not current_word:
                    is_new_word = True
                else:
                    # Some tokenizers might just append without markers
                    is_new_word = False
                    # If it's punctuation, it's often a separate word, but we'll stick to a simple heuristic
                    if not token.isalnum():
                        is_new_word = True
                
                if is_new_word and current_word:
                    word_scores[current_word] = max(word_scores.get(current_word, 0), current_score)
                    current_word = token
                    current_score = score
                else:
                    current_word += token
                    current_score = max(current_score, score)
                    
            if current_word:
                 word_scores[current_word] = max(word_scores.get(current_word, 0), current_score)
                 
            # 7. Normalize scores
            max_score = max(word_scores.values()) if word_scores else 1.0
            if max_score == 0: 
                max_score = 1.0
            
            top_words = []
            for word, score in word_scores.items():
                if not word.strip(): continue
                normalized = round(score / max_score, 4)
                if normalized > 0.1: # Threshold to filter noise
                    top_words.append({"token": word, "importance": normalized})
                    
            top_words = sorted(top_words, key=lambda x: x['importance'], reverse=True)[:XAI_TOP_K]
            
            return {
                "status": "success",
                "method": "gradient_x_input",
                "targetCategory": target_category,
                "topTokens": top_words,
                "summary": f"The highlighted text spans received the highest attribution for the selected {target_category} prediction."
            }
    except Exception as e:
        logger.error(f"XAI calculation failed: {e}")
        return {
            "status": "unavailable",
            "method": "gradient_x_input",
            "error_code": "XAI_INFERENCE_FAILED",
            "targetCategory": target_category,
            "summary": "Model identified high toxicity confidence; token-level explanation unavailable."
        }
