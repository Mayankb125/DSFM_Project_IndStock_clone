from __future__ import annotations

from typing import List, Dict, Any
import threading


_model_lock = threading.Lock()
_pipeline = None


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
    pipe = _load_pipeline()
    outputs = pipe(texts, truncation=True)
    results: List[Dict[str, Any]] = []
    for scores in outputs:
        # scores is list of dicts: {label, score}
        best = max(scores, key=lambda s: s['score']) if scores else {'label': 'NEUTRAL', 'score': 0.0}
        results.append({
            'label': best['label'],
            'confidence': float(best['score']),
            'score': float(score_to_numeric(best['label'], float(best['score'])))
        })
    return results


