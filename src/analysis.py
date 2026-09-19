"""
Analytical Engine for CookCountyHealth.
Computes dynamic numeric metrics, IQR outliers, correlations, categorical breakdowns,
and healthcare-specific cross-tabulations from runtime DataFrames without hardcoded values.
"""

from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np
from src.utils import detect_healthcare_fields

def calculate_numeric_summary(series: pd.Series) -> Dict[str, Any]:
    """Calculate descriptive statistics and percentiles for a numeric column."""
    clean_s = series.dropna()
    if len(clean_s) == 0:
        return {
            "count": 0,
            "mean": np.nan,
            "std": np.nan,
            "median": np.nan,
            "min": np.nan,
            "max": np.nan,
            "q1": np.nan,
            "q3": np.nan,
            "iqr": np.nan,
            "skewness": np.nan,
        }

    q1 = float(clean_s.quantile(0.25))
    q3 = float(clean_s.quantile(0.75))
    iqr = q3 - q1

    return {
        "count": int(len(clean_s)),
        "mean": float(clean_s.mean()),
        "std": float(clean_s.std()) if len(clean_s) > 1 else 0.0,
        "median": float(clean_s.median()),
        "min": float(clean_s.min()),
        "max": float(clean_s.max()),
        "q1": q1,
        "q3": q3,
        "iqr": iqr,
        "skewness": float(clean_s.skew()) if len(clean_s) > 2 else 0.0,
    }

def detect_iqr_outliers(series: pd.Series) -> Dict[str, Any]:
    """
    Detect statistical outliers using the standard 1.5 * IQR rule:
    Lower Bound = Q1 - 1.5 * IQR
    Upper Bound = Q3 + 1.5 * IQR
    """
    clean_s = series.dropna()
    total_valid = len(clean_s)
    if total_valid == 0:
        return {
            "q1": np.nan,
            "q3": np.nan,
            "iqr": np.nan,
            "lower_bound": np.nan,
            "upper_bound": np.nan,
            "outlier_count": 0,
            "outlier_pct": 0.0,
            "outliers_series": pd.Series(dtype=float),
        }

    q1 = float(clean_s.quantile(0.25))
    q3 = float(clean_s.quantile(0.75))
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr

    outlier_mask = (clean_s < lower_bound) | (clean_s > upper_bound)
    outlier_count = int(outlier_mask.sum())
    outlier_pct = (outlier_count / max(1, total_valid)) * 100.0

    return {
        "q1": q1,
        "q3": q3,
        "iqr": iqr,
        "lower_bound": lower_bound,
        "upper_bound": upper_bound,
        "outlier_count": outlier_count,
        "outlier_pct": outlier_pct,
        "outliers_series": clean_s[outlier_mask],
    }

def calculate_categorical_summary(series: pd.Series, top_n: Optional[int] = None) -> pd.DataFrame:
    """Calculate dynamic counts, percentages, and cumulative proportions for a categorical column."""
    clean_s = series.dropna().astype(str)
    total = len(clean_s)
    if total == 0:
        return pd.DataFrame(columns=["Category", "Count", "Percentage", "Cumulative %"])

    counts = clean_s.value_counts()
    if top_n and top_n > 0:
        counts = counts.head(top_n)

    df_cat = counts.reset_index()
    df_cat.columns = ["Category", "Count"]
    df_cat["Percentage"] = (df_cat["Count"] / total) * 100.0
    df_cat["Cumulative %"] = df_cat["Percentage"].cumsum()
    return df_cat

def calculate_date_summary(series: pd.Series) -> Dict[str, Any]:
    """Calculate date ranges and temporal aggregations dynamically."""
    dt_series = pd.to_datetime(series, errors='coerce').dropna()
    if len(dt_series) == 0:
        return {
            "earliest_date": None,
            "latest_date": None,
            "span_days": 0,
            "monthly_counts": pd.DataFrame(),
            "yearly_counts": pd.DataFrame(),
        }

    earliest = dt_series.min()
    latest = dt_series.max()
    span_days = (latest - earliest).days if pd.notna(earliest) and pd.notna(latest) else 0

    monthly = dt_series.dt.to_period("M").value_counts().sort_index().reset_index()
    monthly.columns = ["Month", "Records"]
    monthly["Month"] = monthly["Month"].astype(str)

    yearly = dt_series.dt.to_period("Y").value_counts().sort_index().reset_index()
    yearly.columns = ["Year", "Records"]
    yearly["Year"] = yearly["Year"].astype(str)

    return {
        "earliest_date": earliest,
        "latest_date": latest,
        "span_days": span_days,
        "monthly_counts": monthly,
        "yearly_counts": yearly,
    }

def compute_correlation_matrix(df: pd.DataFrame, numeric_cols: Optional[List[str]] = None) -> pd.DataFrame:
    """Compute Pearson correlation matrix across numeric columns."""
    if numeric_cols is None:
        numeric_cols = list(df.select_dtypes(include=[np.number]).columns)

    if len(numeric_cols) < 2:
        return pd.DataFrame()

    corr = df[numeric_cols].corr(method="pearson")
    return corr

def get_age_group_distribution(age_series: pd.Series) -> pd.DataFrame:
    """Dynamically bin age series into standard demographic cohorts."""
    clean_ages = pd.to_numeric(age_series, errors='coerce').dropna()
    # Filter out potential negative ages for cohorting
    valid_ages = clean_ages[clean_ages >= 0]
    if len(valid_ages) == 0:
        return pd.DataFrame(columns=["Age Group", "Count", "Percentage"])

    bins = [0, 18, 35, 50, 65, 120]
    labels = ["0-17 (Pediatric)", "18-34 (Young Adult)", "35-49 (Adult)", "50-64 (Middle-Aged)", "65+ (Senior)"]

    age_cohorts = pd.cut(valid_ages, bins=bins, labels=labels, right=False)
    cohort_counts = age_cohorts.value_counts().reindex(labels).fillna(0).reset_index()
    cohort_counts.columns = ["Age Group", "Count"]
    cohort_counts["Percentage"] = (cohort_counts["Count"] / max(1, len(valid_ages))) * 100.0
    return cohort_counts

def compute_crosstab_analysis(df: pd.DataFrame, col1: str, col2: str, normalize: bool = True) -> pd.DataFrame:
    """Compute flexible cross-tabulation between any two categorical or binned fields."""
    if col1 not in df.columns or col2 not in df.columns:
        return pd.DataFrame()

    ct = pd.crosstab(df[col1], df[col2], normalize='index' if normalize else False)
    if normalize:
        ct = ct * 100.0
    return ct
