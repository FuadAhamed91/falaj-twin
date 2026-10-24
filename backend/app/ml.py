"""Optional Isolation-Forest supplement to the deterministic rules.

This is SUPPLEMENTARY. The rules are the reliable baseline; the model is trained
on synthetic 'normal' OT traffic features and evaluated on a labelled synthetic
set so its contribution is measurable, not asserted.
"""
from __future__ import annotations

# numpy / scikit-learn are imported lazily so the core API and engine run even
# where the (large) ML wheels are not installed. The ML model is supplementary.
import importlib

_np = None
_RNG = None


def _numpy():
    global _np, _RNG
    if _np is None:
        _np = importlib.import_module("numpy")
        _RNG = _np.random.default_rng(42)
    return _np


def ml_available() -> bool:
    try:
        importlib.import_module("numpy")
        importlib.import_module("sklearn")
        return True
    except Exception:
        return False


def _normal(n):
    np = _numpy()
    # Normal OT behaviour: mostly same-zone, in-hours, read-heavy, steady rate.
    x = np.column_stack([
        _RNG.integers(0, 2, n) * 0.1,              # rarely cross-zone
        _RNG.integers(0, 2, n) * 0.1,              # rarely off-hours
        _RNG.integers(0, 2, n) * 0.15,             # rarely a write
        np.abs(_RNG.normal(0, 0.4, n)),            # steady rate
        _RNG.integers(0, 2, n) * 0.1,              # rarely a new peer
    ])
    return x


def _attack(n):
    np = _numpy()
    # Attack behaviour: cross-zone, off-hours, writes, bursty, new peers.
    x = np.column_stack([
        0.8 + _RNG.normal(0, 0.1, n),
        0.7 + _RNG.normal(0, 0.15, n),
        0.8 + _RNG.normal(0, 0.1, n),
        2.5 + np.abs(_RNG.normal(0, 0.6, n)),
        0.9 + _RNG.normal(0, 0.1, n),
    ])
    return x


class AnomalyModel:
    def __init__(self) -> None:
        from sklearn.ensemble import IsolationForest
        self.model = IsolationForest(n_estimators=120, contamination=0.08, random_state=42)
        self._train()
        self.metrics = self._evaluate()

    def _train(self) -> None:
        self.model.fit(_normal(800))

    def _evaluate(self) -> dict:
        np = _numpy()
        # Labelled synthetic test set: 1 = attack (anomaly), 0 = normal.
        xn, xa = _normal(200), _attack(60)
        X = np.vstack([xn, xa])
        y = np.array([0] * len(xn) + [1] * len(xa))
        pred = (self.model.predict(X) == -1).astype(int)  # -1 == anomaly
        tp = int(((pred == 1) & (y == 1)).sum())
        fp = int(((pred == 1) & (y == 0)).sum())
        fn = int(((pred == 0) & (y == 1)).sum())
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        return {"precision": round(precision, 3), "recall": round(recall, 3), "f1": round(f1, 3),
                "note": "Supplementary only; deterministic rules remain the baseline."}

    def score(self, features: list[float]) -> dict:
        np = _numpy()
        x = np.array(features, dtype=float).reshape(1, -1)
        is_anom = bool(self.model.predict(x)[0] == -1)
        raw = float(self.model.decision_function(x)[0])
        return {"anomaly": is_anom, "score": round(raw, 4)}


_MODEL: AnomalyModel | None = None


def get_model() -> AnomalyModel:
    global _MODEL
    if _MODEL is None:
        _MODEL = AnomalyModel()
    return _MODEL
