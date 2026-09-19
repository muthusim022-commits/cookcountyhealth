"""
Data Cleaning and Transformation Pipeline for CookCountyHealth.
Provides modular, toggleable cleaning operations with dynamic before/after metrics tracking.
"""

from typing import Dict, Any, Tuple, Optional
import re
import pandas as pd
import numpy as np
from src.utils import safe_convert_dates

def standardize_column_name(col: str) -> str:
    """Normalize column names into clean, readable snake_case."""
    s = str(col).strip()
    s = re.sub(r'[\s\-]+', '_', s)
    s = re.sub(r'[^\w_]', '', s)
    # Convert camelCase to snake_case if applicable
    s = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', s)
    s = s.lower()
    # Remove consecutive underscores
    s = re.sub(r'_+', '_', s)
    return s.strip('_')

def clean_dataset(
    df: pd.DataFrame,
    remove_duplicates: bool = True,
    trim_whitespace: bool = True,
    standardize_columns: bool = True,
    normalize_categorical_casing: bool = True,
    convert_dates: bool = True,
    handle_negative_numerics: bool = False,
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Execute selected cleaning operations and return cleaned DataFrame alongside
    detailed before-and-after audit metadata.
    """
    cleaned = df.copy()

    metrics_before = {
        "rows": len(df),
        "columns": len(df.columns),
        "missing_cells": int(df.isna().sum().sum()),
        "duplicate_rows": int(df.duplicated().sum()),
    }

    operations_applied = []

    # 1. Standardize column names
    if standardize_columns:
        old_cols = list(cleaned.columns)
        new_cols = [standardize_column_name(c) for c in old_cols]
        # Resolve duplicates in column names if any
        resolved_cols = []
        seen = {}
        for c in new_cols:
            if c in seen:
                seen[c] += 1
                resolved_cols.append(f"{c}_{seen[c]}")
            else:
                seen[c] = 0
                resolved_cols.append(c)
        cleaned.columns = resolved_cols
        if old_cols != resolved_cols:
            operations_applied.append("Standardized column headers to snake_case")

    # 2. Trim whitespace
    if trim_whitespace:
        trimmed_count = 0
        for col in cleaned.select_dtypes(include=['object', 'string']).columns:
            s = cleaned[col].astype(str)
            has_ws = s.str.contains(r'^\s+|\s+$', regex=True).sum()
            if has_ws > 0:
                cleaned[col] = cleaned[col].apply(lambda x: x.strip() if isinstance(x, str) else x)
                trimmed_count += 1
        if trimmed_count > 0:
            operations_applied.append(f"Trimmed leading/trailing whitespace across {trimmed_count} text column(s)")

    # 3. Normalize categorical capitalization & harmonize gender codes
    if normalize_categorical_casing:
        casing_fixed = 0
        known_acronyms = {'PPO', 'HMO', 'CHIP', 'FEHB', 'ER', 'ICU', 'ED', 'DOB', 'MRN', 'ID', 'ZIP', 'USA'}
        
        def _standardize_gender(val):
            if pd.isna(val) or val is None or str(val).strip() == '':
                return 'Unknown'
            clean = str(val).strip().lower()
            if clean in ['f', 'female', 'fem', 'woman']:
                return 'Female'
            if clean in ['m', 'male', 'masc', 'man']:
                return 'Male'
            if clean in ['nonbinary', 'non-binary', 'nb', 'x', 'genderqueer', 'enby']:
                return 'Non-Binary'
            if clean in ['other', 'o']:
                return 'Other'
            if clean in ['unknown', 'u', 'declined', 'undisclosed', 'not reported']:
                return 'Unknown'
            return str(val).strip().title()

        for col in cleaned.select_dtypes(include=['object', 'string']).columns:
            col_lower = str(col).lower()
            if 'gender' in col_lower or col_lower == 'sex':
                cleaned[col] = cleaned[col].apply(_standardize_gender)
                casing_fixed += 1
                continue
            if any(term in col_lower for term in ['id', 'uuid', 'mrn', 'code', 'zip', 'url']):
                continue
            s = cleaned[col].dropna().astype(str)
            if len(s) == 0:
                continue
            # Normalize casing while preserving standard acronyms
            cleaned[col] = cleaned[col].apply(
                lambda x: x if (not isinstance(x, str) or str(x).strip().upper() in known_acronyms) else str(x).strip().title()
            )
            casing_fixed += 1
        if casing_fixed > 0:
            operations_applied.append(f"Normalized inconsistent capitalization and harmonized gender codes across {casing_fixed} categorical column(s)")

    # 4. Remove duplicate rows
    if remove_duplicates:
        dups_before = int(cleaned.duplicated().sum())
        if dups_before > 0:
            cleaned = cleaned.drop_duplicates().reset_index(drop=True)
            operations_applied.append(f"Removed {dups_before} exact duplicate row(s)")

    # 5. Convert dates
    if convert_dates:
        converted_count = 0
        for col in list(cleaned.columns):
            if not pd.api.types.is_datetime64_any_dtype(cleaned[col]):
                converted_s, is_date = safe_convert_dates(cleaned[col])
                if is_date and converted_s is not None:
                    cleaned[col] = converted_s
                    converted_count += 1
        if converted_count > 0:
            operations_applied.append(f"Converted {converted_count} column(s) into datetime data type")

    # 6. Handle negative clinical/demographic numerics if requested
    if handle_negative_numerics:
        neg_fixed = 0
        for col in cleaned.select_dtypes(include=[np.number]).columns:
            col_lower = str(col).lower()
            if any(term in col_lower for term in ['age', 'visit', 'income', 'systolic', 'bp', 'bmi']):
                neg_mask = cleaned[col] < 0
                count_neg = int(neg_mask.sum())
                if count_neg > 0:
                    cleaned.loc[neg_mask, col] = np.nan
                    neg_fixed += count_neg
        if neg_fixed > 0:
            operations_applied.append(f"Replaced {neg_fixed} invalid negative numeric value(s) with NaN")

    metrics_after = {
        "rows": len(cleaned),
        "columns": len(cleaned.columns),
        "missing_cells": int(cleaned.isna().sum().sum()),
        "duplicate_rows": int(cleaned.duplicated().sum()),
    }

    audit_summary = {
        "metrics_before": metrics_before,
        "metrics_after": metrics_after,
        "operations_applied": operations_applied,
    }

    return cleaned, audit_summary
