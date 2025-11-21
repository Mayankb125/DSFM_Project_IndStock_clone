from __future__ import annotations

from typing import List, Dict, Any
import threading


_model_lock = threading.Lock()
_pipeline = None
_cache_lock = threading.Lock()
# simple in-memory cache for text -> result (keep small to avoid memory issues)
_results_cache = {}
_RESULTS_CACHE_MAX = 1000


def _load_pipeline():
    global _pipeline
    if _pipeline is not None:
        return _pipeline
    with _model_lock:
        if _pipeline is None:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification, TextClassificationPipeline
            model_name = "ProsusAI/finbert"
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = AutoModelForSequenceClassification.from_pretrained(model_name)
            _pipeline = TextClassificationPipeline(model=model, tokenizer=tokenizer, return_all_scores=True)
    return _pipeline


def score_to_numeric(label: str, confidence: float) -> float:
    # Map labels to [-1, 1]
    if label.upper() == 'POSITIVE':
        return confidence
    if label.upper() == 'NEGATIVE':
        return -confidence
    # NEUTRAL
    return 0.0


def analyze_texts(texts: List[str]) -> List[Dict[str, Any]]:
    if not texts:
        return []
    # Use cached results when available to avoid re-scoring identical texts
    pipe = _load_pipeline()
    outputs = []
    results: List[Dict[str, Any]] = []

    to_score = []
    to_score_idx = []
    # first check cache for each text
    with _cache_lock:
        for i, t in enumerate(texts):
            key = t.strip()[:200]  # truncated key to avoid huge keys
            if key in _results_cache:
                results.append(_results_cache[key])
            else:
                # placeholder to maintain order
                results.append(None)
                to_score.append(t)
                to_score_idx.append(i)

    if to_score:
        scored = pipe(to_score, truncation=True)
        for idx, scores in enumerate(scored):
            best = max(scores, key=lambda s: s['score']) if scores else {'label': 'NEUTRAL', 'score': 0.0}
            out = {
                'label': best['label'],
                'confidence': float(best['score']),
                'score': float(score_to_numeric(best['label'], float(best['score'])))
            }
            # write back to results list in correct position
            results[to_score_idx[idx]] = out
            # cache it (with truncation key)
            key = to_score[idx].strip()[:200]
            with _cache_lock:
                if len(_results_cache) >= _RESULTS_CACHE_MAX:
                    # simple eviction: drop one arbitrary item
                    _results_cache.pop(next(iter(_results_cache)))
                _results_cache[key] = out

    # final results ready
    return results


