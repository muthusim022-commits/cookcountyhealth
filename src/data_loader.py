"""
Data Ingestion Module for CookCountyHealth EDA Application.
Handles resilient CSV loading, multi-encoding detection, delimiter inference, and metadata tracking.
"""

from typing import Tuple, Dict, Any, Optional
import io
import csv
import pandas as pd
import streamlit as st

ENCODINGS_TO_TRY = ["utf-8", "utf-8-sig", "latin-1", "cp1252", "iso-8859-1"]

def infer_delimiter(sample_bytes: bytes) -> str:
    """Infer delimiter (comma, tab, semicolon, pipe) using csv.Sniffer."""
    try:
        sample_text = sample_bytes.decode("utf-8", errors="ignore")[:4096]
        sniffer = csv.Sniffer()
        dialect = sniffer.sniff(sample_text, delimiters=[",", "\t", ";", "|"])
        return dialect.delimiter
    except Exception:
        return ","

def load_csv_file(file_or_path: Any) -> Tuple[Optional[pd.DataFrame], Dict[str, Any], Optional[str]]:
    """
    Ingest a CSV from an uploaded file buffer or local filesystem path.
    Resiliently handles encodings and delimiters without assuming fixed schemas.
    """
    metadata: Dict[str, Any] = {
        "filename": "dataset.csv",
        "size_bytes": 0,
        "encoding_used": None,
        "delimiter_used": ",",
        "rows": 0,
        "columns": 0,
    }

    raw_bytes: bytes = b""

    try:
        if isinstance(file_or_path, str):
            metadata["filename"] = file_or_path.split("/")[-1]
            with open(file_or_path, "rb") as f:
                raw_bytes = f.read()
        elif hasattr(file_or_path, "read"):
            metadata["filename"] = getattr(file_or_path, "name", "uploaded_file.csv")
            raw_bytes = file_or_path.read()
            if hasattr(file_or_path, "seek"):
                file_or_path.seek(0)
        else:
            return None, metadata, "Unsupported file input format."

        metadata["size_bytes"] = len(raw_bytes)
        if len(raw_bytes) == 0:
            return None, metadata, "Uploaded file is completely empty."

        delimiter = infer_delimiter(raw_bytes)
        metadata["delimiter_used"] = delimiter

        df: Optional[pd.DataFrame] = None
        used_enc = None

        for enc in ENCODINGS_TO_TRY:
            try:
                df = pd.read_csv(
                    io.BytesIO(raw_bytes),
                    encoding=enc,
                    sep=delimiter,
                    low_memory=False,
                    on_bad_lines="skip"
                )
                used_enc = enc
                break
            except (UnicodeDecodeError, pd.errors.ParserError):
                continue

        if df is None or used_enc is None:
            return None, metadata, "Failed to decode CSV. Tried encodings: " + ", ".join(ENCODINGS_TO_TRY)

        metadata["encoding_used"] = used_enc
        metadata["rows"] = len(df)
        metadata["columns"] = len(df.columns)

        return df, metadata, None

    except Exception as e:
        return None, metadata, f"Error processing file: {str(e)}"

@st.cache_data(show_spinner=False)
def get_cached_dataframe(file_bytes: bytes, filename: str) -> Tuple[Optional[pd.DataFrame], Dict[str, Any], Optional[str]]:
    """Cached loader for streamlit to prevent recalculation on UI interactions."""
    file_io = io.BytesIO(file_bytes)
    setattr(file_io, "name", filename)
    return load_csv_file(file_io)
