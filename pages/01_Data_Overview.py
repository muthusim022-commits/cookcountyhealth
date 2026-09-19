"""
Page 01: Data Overview
Displays ingestion metadata, file attributes, schema inventory, and descriptive statistics.
"""

import streamlit as st
import pandas as pd
from src.data_profiler import generate_profile_summary
from src.utils import detect_column_types, format_bytes, format_number

st.set_page_config(page_title="Data Overview | CookCountyHealth", page_icon="📋", layout="wide")

st.title("📋 Data Overview & Ingestion Metadata")
st.markdown("Detailed inspection of file properties, memory usage, schema topology, and initial records.")

if "cleaned_df" not in st.session_state or st.session_state["cleaned_df"] is None:
    st.warning("Please upload a CSV dataset on the main page or load the sample data to view this page.")
    st.stop()

df = st.session_state.get("filtered_df", st.session_state["cleaned_df"])
meta = st.session_state.get("metadata", {})
profile = generate_profile_summary(df)

# Top metrics cards
m1, m2, m3, m4, m5 = st.columns(5)
m1.metric("Rows", format_number(profile["n_rows"]))
m2.metric("Columns", format_number(profile["n_cols"]))
m3.metric("Memory", profile["memory_usage_human"])
m4.metric("Encoding", meta.get("encoding_used", "N/A"))
m5.metric("Delimiter", f"'{meta.get('delimiter_used', ',')}'")

st.divider()

# Schema & Data Type Breakdown
col_types = profile["col_types"]
st.subheader("Schema Inventory")
t1, t2, t3, t4 = st.columns(4)
t1.info(f"**Numeric ({len(col_types['numeric'])})**\n\n" + ", ".join(col_types['numeric']) if col_types['numeric'] else "None")
t2.info(f"**Categorical ({len(col_types['categorical'])})**\n\n" + ", ".join(col_types['categorical']) if col_types['categorical'] else "None")
t3.info(f"**Datetime ({len(col_types['datetime'])})**\n\n" + ", ".join(col_types['datetime']) if col_types['datetime'] else "None")
t4.info(f"**Identifiers ({len(col_types['identifier'])})**\n\n" + ", ".join(col_types['identifier']) if col_types['identifier'] else "None")

# Data Preview with customizable rows
st.subheader("Interactive Data Explorer")
preview_rows = st.slider("Preview Rows", min_value=5, max_value=200, value=25, step=5)
st.dataframe(df.head(preview_rows), use_container_width=True)

# Descriptive Statistics Table
st.subheader("Descriptive Summary")
tab_num_summary, tab_cat_summary = st.tabs(["Numeric Variables Summary", "Categorical Variables Summary"])

with tab_num_summary:
    if col_types["numeric"]:
        st.dataframe(df[col_types["numeric"]].describe().T, use_container_width=True)
    else:
        st.write("No numeric columns detected in this dataset.")

with tab_cat_summary:
    if col_types["categorical"]:
        st.dataframe(df[col_types["categorical"]].describe().T, use_container_width=True)
    else:
        st.write("No categorical columns detected in this dataset.")
