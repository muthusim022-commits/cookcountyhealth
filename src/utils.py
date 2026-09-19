"""
Utility functions for data type detection, formatting, and domain field identification.
"""

from typing import Dict, List, Optional, Tuple, Any
import re
import pandas as pd
import numpy as np

def format_number(val: Any, decimals: int = 2) -> str:
    """Safely format numbers with commas and fixed decimals."""
    if val is None or pd.isna(val):
        return "N/A"
    if isinstance(val, (int, np.integer)):
        return f"{val:,}"
    if isinstance(val, (float, np.floating)):
        return f"{val:,.{decimals}f}"
    return str(val)

def format_percentage(val: Any, decimals: int = 1) -> str:
    """Format float into percentage string."""
    if val is None or pd.isna(val):
        return "N/A"
    return f"{float(val):.{decimals}f}%"

def format_bytes(num_bytes: int) -> str:
    """Convert bytes to human-readable string (KB, MB, GB)."""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if abs(num_bytes) < 1024.0:
            return f"{num_bytes:3.1f} {unit}"
        num_bytes /= 1024.0
    return f"{num_bytes:.1f} PB"

def safe_convert_dates(series: pd.Series, threshold: float = 0.85) -> Tuple[Optional[pd.Series], bool]:
    """
    Attempt safe conversion to datetime if at least `threshold` of non-null values
    can be parsed as dates, without turning numeric integers into epochs.
    """
    if pd.api.types.is_datetime64_any_dtype(series):
        return series, True

    # Do not treat pure small numeric sequences as dates
    if pd.api.types.is_numeric_dtype(series):
        return None, False

    non_null = series.dropna().astype(str)
    if len(non_null) == 0:
        return None, False

    # Sample for speed on large datasets
    sample_size = min(len(non_null), 500)
    sample = non_null.sample(sample_size, random_state=42)

    # Check if strings resemble common date patterns before invoking pd.to_datetime
    date_regex = re.compile(r'^\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}')
    matching_pattern = sample.str.match(date_regex).sum()
    if matching_pattern / sample_size < 0.5:
        return None, False

    try:
        converted = pd.to_datetime(sample, errors='coerce')
        success_rate = converted.notna().sum() / sample_size
        if success_rate >= threshold:
            full_converted = pd.to_datetime(series, errors='coerce')
            return full_converted, True
    except Exception:
        pass

    return None, False

def detect_column_types(df: pd.DataFrame) -> Dict[str, List[str]]:
    """
    Dynamically classify columns into numeric, categorical, datetime, boolean, and potential IDs.
    Does not assume predetermined column names.
    """
    type_map = {
        "numeric": [],
        "categorical": [],
        "datetime": [],
        "boolean": [],
        "identifier": [],
    }

    n_rows = len(df)

    for col in df.columns:
        s = df[col]
        dtype = s.dtype

        # Check boolean
        if pd.api.types.is_bool_dtype(dtype):
            type_map["boolean"].append(col)
            continue

        # Check datetime
        if pd.api.types.is_datetime64_any_dtype(dtype):
            type_map["datetime"].append(col)
            continue

        # Check numeric
        if pd.api.types.is_numeric_dtype(dtype):
            # Check if this numeric is actually an ID (e.g. Patient_ID as sequential int, 100% unique)
            col_lower = str(col).lower()
            if any(id_kw in col_lower for id_kw in ['id', 'mrn', 'identifier', 'patient_num']) and s.nunique() == n_rows and n_rows > 10:
                type_map["identifier"].append(col)
            else:
                type_map["numeric"].append(col)
            continue

        # Object / String column checks
        non_null_s = s.dropna()
        if len(non_null_s) > 0:
            # Check if likely ID column
            col_lower = str(col).lower()
            is_id_name = any(id_kw in col_lower for id_kw in ['id', 'mrn', 'account', 'number', 'key', 'uuid', 'guid', 'patient'])
            is_high_unique = (s.nunique() / max(1, len(non_null_s))) > 0.95 and len(non_null_s) > 20

            if is_id_name and is_high_unique:
                type_map["identifier"].append(col)
                continue

            # Check potential date strings
            _, is_date = safe_convert_dates(s)
            if is_date:
                type_map["datetime"].append(col)
                continue

        # Default to categorical
        type_map["categorical"].append(col)

    return type_map

def detect_healthcare_fields(df: pd.DataFrame) -> Dict[str, Optional[str]]:
    """
    Dynamically identify healthcare domain columns using flexible fuzzy keyword matching.
    Returns mapping of standardized concept -> actual matching column name in DataFrame.
    """
    field_keywords = {
        "age": [r"^age$", r"^patient_age$", r"^age_years$", r"current_age"],
        "gender": [r"^gender$", r"^sex$", r"patient_gender", r"biological_sex"],
        "insurance": [r"^insurance", r"^insurance_type$", r"^payer", r"^coverage", r"^health_plan", r"^plan_type"],
        "race_ethnicity": [r"^race", r"^ethnicity", r"^race_ethnicity", r"demographic_race"],
        "language": [r"^primary_language", r"^language", r"^pref_language"],
        "community": [r"^community", r"^community_area", r"^neighborhood", r"^municipality", r"^suburb"],
        "zip_code": [r"^zip", r"^zip_code", r"^postal", r"^postal_code"],
        "region": [r"^region$", r"^district$", r"^zone$", r"^geographic_region"],
        "clinic": [r"^clinic", r"^clinic_name$", r"^facility", r"^hospital", r"^health_center", r"^site_name", r"^provider"],
        "visits": [r"^visits", r"^annual_visits", r"^encounter_count", r"^admissions", r"^num_visits"],
        "registration_date": [r"^registration_date", r"^admission_date", r"^admit_date", r"^encounter_date", r"^visit_date", r"^enrollment_date", r"^admitted"],
        "latitude": [r"^lat$", r"^latitude$", r"^patient_lat", r"^geo_lat"],
        "longitude": [r"^lon$", r"^long$", r"^longitude$", r"^patient_lon", r"^geo_lon"],
        "systolic_bp": [r"^systolic", r"^bp_systolic", r"^systolic_bp"],
        "bmi": [r"^bmi$", r"^body_mass_index"],
        "income": [r"^income", r"^household_income", r"^est_income", r"^annual_income"],
    }

    matched: Dict[str, Optional[str]] = {}

    for concept, patterns in field_keywords.items():
        found_col = None
        for col in df.columns:
            clean_col = str(col).strip().lower().replace(" ", "_").replace("-", "_")
            for pat in patterns:
                if re.search(pat, clean_col):
                    found_col = col
                    break
            if found_col:
                break
        matched[concept] = found_col

    return matched
