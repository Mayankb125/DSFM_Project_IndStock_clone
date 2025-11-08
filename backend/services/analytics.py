import math
from typing import Dict, List, Tuple, Any

import numpy as np
import pandas as pd
import yfinance as yf


def fetch_adjusted_close(tickers: List[str], start: str | None = None, end: str | None = None) -> pd.DataFrame:
    data = yf.download(tickers=tickers, start=start, end=end, auto_adjust=False, progress=False)[('Adj Close')]
    if isinstance(data, pd.Series):
        data = data.to_frame()
    data = data.dropna(how='all')
    data = data.sort_index()
    return data


def compute_log_returns(adj_close: pd.DataFrame) -> pd.DataFrame:
    returns = np.log(adj_close / adj_close.shift(1))
    returns = returns.dropna(how='all')
    return returns


def compute_correlation_matrix(returns: pd.DataFrame) -> pd.DataFrame:
    # Use pairwise complete observations
    return returns.corr()


def marchenko_pastur_bounds(T: int, N: int) -> Tuple[float, float]:
    if T <= 0 or N <= 0:
        raise ValueError("T and N must be positive")
    q = T / N
    lambda_min = (1 - (1 / math.sqrt(q))) ** 2 if q >= 1 else (1 - math.sqrt(q)) ** 2
    lambda_max = (1 + (1 / math.sqrt(q))) ** 2 if q >= 1 else (1 + math.sqrt(q)) ** 2
    return float(lambda_min), float(lambda_max)


def rmt_denoise_correlation(corr: pd.DataFrame, T: int) -> Dict[str, Any]:
    # Eigen-decomposition
    eigvals, eigvecs = np.linalg.eigh(corr.values)
    # Sort ascending
    idx = np.argsort(eigvals)
    eigvals = eigvals[idx]
    eigvecs = eigvecs[:, idx]

    N = corr.shape[0]
    lmin, lmax = marchenko_pastur_bounds(T=T, N=N)

    # Keep eigenvalues outside noise band, replace noisy ones with their average inside band
    clean_eigvals = eigvals.copy()
    mask_noise = (eigvals >= lmin) & (eigvals <= lmax)
    if mask_noise.any():
        avg_noise = eigvals[mask_noise].mean()
        clean_eigvals[mask_noise] = avg_noise

    # Reconstruct denoised correlation
    Lambda = np.diag(clean_eigvals)
    denoised = eigvecs @ Lambda @ eigvecs.T
    # Ensure symmetry and unit diagonal
    denoised = (denoised + denoised.T) / 2.0
    np.fill_diagonal(denoised, 1.0)

    return {
        'eigenvalues_sorted': eigvals.tolist(),
        'lambda_min': float(lmin),
        'lambda_max': float(lmax),
        'denoised_correlation': pd.DataFrame(denoised, index=corr.index, columns=corr.columns)
    }


def compute_momentum(adj_close: pd.DataFrame, window_days: int = 7) -> pd.Series:
    if adj_close.shape[0] < window_days + 1:
        return pd.Series(index=adj_close.columns, dtype=float)
    recent = adj_close.iloc[-(window_days + 1):]
    momentum = recent.iloc[-1] / recent.iloc[0] - 1.0
    return momentum


def compute_rsi(adj_close: pd.DataFrame, period: int = 14) -> pd.Series:
    if adj_close.shape[0] < period + 1:
        return pd.Series(index=adj_close.columns, dtype=float)
    delta = adj_close.diff()
    gain = delta.clip(lower=0).rolling(window=period, min_periods=period).mean()
    loss = (-delta.clip(upper=0)).rolling(window=period, min_periods=period).mean()
    rs = gain / (loss.replace(0, np.nan))
    rsi = 100 - (100 / (1 + rs))
    return rsi.iloc[-1]


def compute_annualized_volatility(returns: pd.DataFrame) -> pd.Series:
    # daily returns to annualized volatility (approx sqrt(252))
    vol = returns.std(skipna=True) * np.sqrt(252)
    return vol


