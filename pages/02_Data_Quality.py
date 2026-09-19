"""
Page 02: Data Quality & Cleaning Pipeline
Audits missingness, duplicate entities, casing variances, whitespace anomalies,
and provides interactive controls to execute data cleaning with before/after audit tracking.
"""

import streamlit as st
import pandas as pd
from src.data_profiler import generate_profile_summary, generate_column_quality_table
from src.data_cleaner import clean_dataset
from src.utils import format_number, format_percentage

st.set_page_config(page_title="Data Quality | CookCountyHealth", page_icon="🔬", layout="wide")

st.title("🔬 Data Quality Audit & Cleaning Pipeline")
st.markdown("Automated diagnostic assessment of dataset integrity, integrity violations, and interactive cleaning execution.")

if "raw_df" not in st.session_state or st.session_state["raw_df"] is None:
    st.warning("Please upload a CSV dataset on the main page or load the sample data to view this page.")
    st.stop()

raw_df = st.session_state["raw_df"]
cleaned_df = st.session_state["cleaned_df"]
audit_summary = st.session_state.get("clean_audit")

# TOP LEVEL QUALITY METRICS
profile_raw = generate_profile_summary(raw_df)
profile_cleaned = generate_profile_summary(cleaned_df)

st.subheader("Data Quality Scorecard (Current State)")
q1, q2, q3, q4 = st.columns(4)
q1.metric("Duplicate Rows", f"{profile_cleaned['duplicate_rows']:,}", f"{profile_cleaned['duplicate_rows_pct']:.1f}%")
q2.metric("Total Missing Cells", f"{profile_cleaned['total_missing_cells']:,}", f"{profile_cleaned['missing_percentage']:.2f}%")
q3.metric("Constant Columns", f"{len(profile_cleaned['constant_columns'])}")
q4.metric("High Cardinality Columns", f"{len(profile_cleaned['high_cardinality_columns'])}")

# Potential ID duplicate check
if profile_cleaned["id_duplicates"]:
    st.warning(f"⚠️ Potential duplicate identifiers detected: {profile_cleaned['id_duplicates']}")

st.divider()

# INTERACTIVE CLEANING CONTROLS SECTION
st.subheader("⚙️ Data Cleaning Pipeline Controls")
st.markdown("Toggle specific transformation steps to test and apply remediation strategies dynamically:")

clean_col1, clean_col2, clean_col3 = st.columns(3)
with clean_col1:
    opt_trim_ws = st.checkbox("Trim text whitespace", value=True, help="Strip leading and trailing whitespaces from string values.")
    opt_std_cols = st.checkbox("Standardize column names", value=True, help="Convert column headers into standardized snake_case format.")
with clean_col2:
    opt_casing = st.checkbox("Normalize categorical casing", value=True, help="Resolve inconsistencies like 'male' vs 'Male'.")
    opt_dates = st.checkbox("Convert dates safely", value=True, help="Parse detected date patterns into standard datetime timestamps.")
with clean_col3:
    opt_remove_dups = st.checkbox("Remove exact duplicate rows", value=True, help="Drop redundant identical records.")
    opt_handle_neg = st.checkbox("Coerce negative ages/metrics to NaN", value=True, help="Set invalid negative clinical/demographic values to missing.")

if st.button("Apply Cleaning Transformations", type="primary"):
    with st.spinner("Executing cleaning pipeline..."):
        new_cleaned, new_audit = clean_dataset(
            raw_df,
            remove_duplicates=opt_remove_dups,
            trim_whitespace=opt_trim_ws,
            standardize_columns=opt_std_cols,
            normalize_categorical_casing=opt_casing,
            convert_dates=opt_dates,
            handle_negative_numerics=opt_handle_neg,
        )
        st.session_state["cleaned_df"] = new_cleaned
        st.session_state["clean_audit"] = new_audit
        st.session_state["filtered_df"] = new_cleaned
        st.success("Cleaning operations successfully applied!")
        st.rerun()

# BEFORE VS AFTER AUDIT SUMMARY
if audit_summary:
    st.subheader("📊 Before vs After Transformation Audit")
    b = audit_summary["metrics_before"]
    a = audit_summary["metrics_after"]

    col_b1, col_b2, col_b3, col_b4 = st.columns(4)
    col_b1.metric("Rows", f"{a['rows']:,}", delta=a['rows'] - b['rows'])
    col_b2.metric("Columns", f"{a['columns']:,}", delta=a['columns'] - b['columns'])
    col_b3.metric("Missing Cells", f"{a['missing_cells']:,}", delta=a['missing_cells'] - b['missing_cells'], delta_color="inverse")
    col_b4.metric("Duplicates", f"{a['duplicate_rows']:,}", delta=a['duplicate_rows'] - b['duplicate_rows'], delta_color="inverse")

    if audit_summary["operations_applied"]:
        st.markdown("**Applied Operations:**")
        for op in audit_summary["operations_applied"]:
            st.markdown(f"- ✅ {op}")

st.divider()

# DYNAMIC COLUMN AUDIT TABLE
st.subheader("📋 Column-Level Quality Diagnostic Matrix")
st.markdown("Detailed breakdown of missingness proportions, unique counts, and inferred data anomalies.")
quality_table = generate_column_quality_table(cleaned_df)
st.dataframe(quality_table, use_container_width=True)

st.divider()

# RAW VS CLEANED INSPECTION TABS
tab_raw, tab_clean, tab_download = st.tabs(["Raw Data View", "Cleaned Data View", "Export Cleaned Dataset"])

with tab_raw:
    st.caption(f"Raw Input: {len(raw_df):,} rows × {len(raw_df.columns)} columns")
    st.dataframe(raw_df.head(50), use_container_width=True)

with tab_clean:
    st.caption(f"Cleaned State: {len(cleaned_df):,} rows × {len(cleaned_df.columns)} columns")
    st.dataframe(cleaned_df.head(50), use_container_width=True)

with tab_download:
    st.markdown("Download the cleaned dataset as a CSV file:")
    csv_bytes = cleaned_df.to_csv(index=False).encode("utf-8")
    st.download_button(
        label="📥 Download Cleaned Dataset (CSV)",
        data=csv_bytes,
        file_name="CookCountyHealth_cleaned.csv",
        mime="text/csv",
        type="primary"
    )
