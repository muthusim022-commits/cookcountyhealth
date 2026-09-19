"""
Automated Data Profiling and Quality Auditing Module for CookCountyHealth.
Generates comprehensive dynamic profile summaries without predetermined assumptions.
"""

from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from src.utils import detect_column_types, format_bytes, safe_convert_dates

def generate_profile_summary(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Profile an entire DataFrame dynamically.
    Returns structured statistics for metrics, KPIs, and quality review.
    """
    n_rows = len(df)
    n_cols = len(df.columns)
    memory_usage = df.memory_usage(deep=True).sum()

    col_types = detect_column_types(df)

    # Missing values
    total_cells = max(1, n_rows * n_cols)
    total_missing = int(df.isna().sum().sum())
    missing_pct = (total_missing / total_cells) * 100.0

    # Duplicates
    dup_rows_count = int(df.duplicated().sum())
    dup_rows_pct = (dup_rows_count / max(1, n_rows)) * 100.0

    # Constant columns & High cardinality
    constant_cols: List[str] = []
    high_cardinality_cols: List[str] = []

    for col in df.columns:
        nunq = df[col].nunique(dropna=False)
        if nunq <= 1:
            constant_cols.append(col)
        elif col in col_types["categorical"] and nunq > 50 and (nunq / max(1, n_rows)) > 0.3:
            high_cardinality_cols.append(col)

    # Potential ID duplicates
    id_duplicates: Dict[str, int] = {}
    for id_col in col_types["identifier"]:
        id_dup_count = int(df[id_col].duplicated().sum())
        if id_dup_count > 0:
            id_duplicates[id_col] = id_dup_count

    return {
        "n_rows": n_rows,
        "n_cols": n_cols,
        "memory_usage_bytes": memory_usage,
        "memory_usage_human": format_bytes(memory_usage),
        "col_types": col_types,
        "total_missing_cells": total_missing,
        "missing_percentage": missing_pct,
        "duplicate_rows": dup_rows_count,
        "duplicate_rows_pct": dup_rows_pct,
        "constant_columns": constant_cols,
        "high_cardinality_columns": high_cardinality_cols,
        "id_duplicates": id_duplicates,
    }

def generate_column_quality_table(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create a detailed dynamic audit table for every column:
    | Column | Data Type | Missing | Missing % | Unique | Potential Issues |
    """
    n_rows = len(df)
    rows_data = []

    col_types = detect_column_types(df)

    for col in df.columns:
        s = df[col]
        missing_count = int(s.isna().sum())
        missing_pct = (missing_count / max(1, n_rows)) * 100.0
        unique_count = int(s.nunique(dropna=True))
        dtype_str = str(s.dtype)

        issues: List[str] = []

        if missing_count > 0:
            if missing_pct > 40.0:
                issues.append(f"High missingness ({missing_pct:.1f}%)")
            else:
                issues.append(f"{missing_count} missing ({missing_pct:.1f}%)")

        if unique_count == 1:
            issues.append("Constant column (single value)")
        elif unique_count == 0 and n_rows > 0:
            issues.append("All values are null")

        # Check numeric inconsistencies
        if pd.api.types.is_numeric_dtype(s):
            non_null_num = s.dropna()
            # If negative values exist in domains like age, visits, bp
            col_lower = str(col).lower()
            if any(term in col_lower for term in ["age", "visit", "count", "income", "bp", "bmi", "weight", "height"]):
                neg_count = int((non_null_num < 0).sum())
                if neg_count > 0:
                    issues.append(f"{neg_count} negative value(s) found in {col}")
            # Extreme zero check
            zeros = int((non_null_num == 0).sum())
            if zeros > 0 and any(term in col_lower for term in ["bp", "bmi", "heart_rate", "temp"]):
                issues.append(f"{zeros} zero-value clinical readings")

        # Check string / categorical inconsistencies
        elif pd.api.types.is_object_dtype(s) or pd.api.types.is_string_dtype(s):
            non_null_str = s.dropna().astype(str)
            if len(non_null_str) > 0:
                # Leading / trailing whitespace
                whitespace_count = int(non_null_str.str.contains(r'^\s+|\s+$', regex=True).sum())
                if whitespace_count > 0:
                    issues.append(f"{whitespace_count} value(s) with whitespace padding")

                # Casing inconsistency
                unique_raw = set(non_null_str.unique())
                unique_lower = {x.lower().strip() for x in unique_raw}
                if len(unique_raw) > len(unique_lower):
                    diff = len(unique_raw) - len(unique_lower)
                    issues.append(f"Capitalization variance ({diff} case-split entries)")

                # Check if potential unparsed date
                _, is_date = safe_convert_dates(s)
                if is_date and not pd.api.types.is_datetime64_any_dtype(s):
                    issues.append("Detected date formatted as text string")

        issue_summary = "; ".join(issues) if issues else "None detected"

        rows_data.append({
            "Column": str(col),
            "Data Type": dtype_str,
            "Missing": missing_count,
            "Missing %": round(missing_pct, 2),
            "Unique": unique_count,
            "Potential Issues": issue_summary,
        })

    return pd.DataFrame(rows_data)
