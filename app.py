"""
CookCountyHealth — Patient Demographics & Insurance EDA
Main Streamlit Application Entrypoint & Ingestion Controller
"""

import os
import streamlit as st
import pandas as pd
import numpy as np

# Set page configuration
st.set_page_config(
    page_title="CookCountyHealth — Patient Demographics & Insurance EDA",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="expanded",
)

from src.data_loader import load_csv_file
from src.data_profiler import generate_profile_summary
from src.data_cleaner import clean_dataset
from src.utils import detect_column_types, detect_healthcare_fields, format_number, format_bytes

# Initialize Session State
if "raw_df" not in st.session_state:
    st.session_state["raw_df"] = None
if "cleaned_df" not in st.session_state:
    st.session_state["cleaned_df"] = None
if "clean_audit" not in st.session_state:
    st.session_state["clean_audit"] = None
if "metadata" not in st.session_state:
    st.session_state["metadata"] = None
if "filtered_df" not in st.session_state:
    st.session_state["filtered_df"] = None

def init_data(df: pd.DataFrame, meta: dict):
    """Store loaded dataset and initialize default cleaned copy."""
    st.session_state["raw_df"] = df
    st.session_state["metadata"] = meta
    cleaned, audit = clean_dataset(
        df,
        remove_duplicates=False,
        trim_whitespace=True,
        standardize_columns=False,
        normalize_categorical_casing=False,
        convert_dates=True,
        handle_negative_numerics=False,
    )
    st.session_state["cleaned_df"] = cleaned
    st.session_state["clean_audit"] = audit
    st.session_state["filtered_df"] = cleaned

# Sidebar Header & Ingestion Controls
with st.sidebar:
    st.markdown("## 🏥 CookCountyHealth")
    st.caption("Patient Demographics & Insurance EDA")
    st.divider()

    st.markdown("### 📥 Data Ingestion")
    uploaded_file = st.file_uploader(
        "Upload CSV Dataset",
        type=["csv"],
        help="Upload any demographic, insurance, or operational CSV file."
    )

    if uploaded_file is not None:
        if st.session_state.get("last_uploaded_name") != uploaded_file.name:
            with st.spinner("Ingesting and inspecting dataset..."):
                df, meta, err = load_csv_file(uploaded_file)
                if err:
                    st.error(err)
                elif df is not None:
                    st.session_state["last_uploaded_name"] = uploaded_file.name
                    init_data(df, meta)
                    st.success(f"Loaded {meta['rows']:,} rows × {meta['columns']} columns.")
    else:
        # Option to load sample dataset if no file uploaded
        sample_path = "data/sample_data.csv"
        if os.path.exists(sample_path) and st.session_state["raw_df"] is None:
            if st.button("Load Sample Dataset", type="primary", use_container_width=True):
                with st.spinner("Loading dataset..."):
                    df, meta, err = load_csv_file(sample_path)
                    if err:
                        st.error(err)
                    elif df is not None:
                        init_data(df, meta)
                        st.success(f"Loaded {meta['rows']:,} rows × {meta['columns']} columns.")

    # Global Dynamic Filtering (Enabled once dataset is active)
    active_df = st.session_state.get("cleaned_df")
    filtered_df = active_df

    if active_df is not None and len(active_df) > 0:
        st.divider()
        st.markdown("### 🔍 Global Filters")
        st.caption("Filters dynamically update all downstream pages.")

        col_types = detect_column_types(active_df)
        working_df = active_df.copy()

        # Categorical filters (columns with manageable cardinality 2..40)
        filter_candidates = [
            c for c in col_types["categorical"]
            if 2 <= working_df[c].nunique(dropna=True) <= 40
        ]

        selected_cat_filters = {}
        for cat_col in filter_candidates[:4]:
            unique_vals = sorted([str(x) for x in working_df[cat_col].dropna().unique()])
            selected = st.multiselect(
                f"Filter {cat_col}",
                options=unique_vals,
                default=[],
                key=f"filter_cat_{cat_col}"
            )
            if selected:
                selected_cat_filters[cat_col] = selected
                working_df = working_df[working_df[cat_col].astype(str).isin(selected)]

        # Numeric Range Filter (if numeric columns exist)
        num_cols = col_types["numeric"]
        if num_cols:
            filter_num_col = st.selectbox(
                "Filter Numeric Range",
                options=["None"] + num_cols,
                index=0,
                key="filter_num_select"
            )
            if filter_num_col != "None":
                col_min = float(working_df[filter_num_col].min())
                col_max = float(working_df[filter_num_col].max())
                if col_min < col_max:
                    selected_range = st.slider(
                        f"Range for {filter_num_col}",
                        min_value=col_min,
                        max_value=col_max,
                        value=(col_min, col_max),
                        key=f"filter_slider_{filter_num_col}"
                    )
                    working_df = working_df[
                        (working_df[filter_num_col] >= selected_range[0]) &
                        (working_df[filter_num_col] <= selected_range[1])
                    ]

        st.session_state["filtered_df"] = working_df
        st.caption(f"Showing **{len(working_df):,}** of **{len(active_df):,}** records.")

# MAIN PAGE CONTENT
st.title("CookCountyHealth — Patient Demographics & Insurance EDA")
st.markdown(
    """
    **An interactive, production-grade Exploratory Data Analysis (EDA) application.**
    Upload any healthcare CSV dataset or load the reference Cook County cohort to dynamically inspect,
    profile, clean, explore, and visualize demographic and insurance distributions.
    """
)

if st.session_state["raw_df"] is None:
    st.info("👈 Please upload a CSV file or click **'Load CookCountyHealth Dataset'** in the sidebar to begin.")
    
    st.markdown("### Core EDA Workflow")
    flow_col1, flow_col2, flow_col3, flow_col4 = st.columns(4)
    with flow_col1:
        st.markdown("#### 1. Ingestion & Profiling\nUpload any CSV, auto-detect encodings, delimiters, schema, and column types.")
    with flow_col2:
        st.markdown("#### 2. Quality & Cleaning\nAudit missing cells, casing anomalies, duplicates, and execute toggleable clean pipelines.")
    with flow_col3:
        st.markdown("#### 3. EDA & Relationships\nExamine distributions, IQR outliers, correlation matrix, and variable-pair routing.")
    with flow_col4:
        st.markdown("#### 4. Healthcare & Maps\nExplore demographic cohorts, insurance breakdowns, cross-tabs, and GIS coordinates.")

else:
    df_current = st.session_state["filtered_df"]
    df_raw = st.session_state["raw_df"]
    meta = st.session_state["metadata"]

    # DYNAMIC KPI CARDS
    st.markdown("### 📊 Dynamic Operational KPIs")
    kpi1, kpi2, kpi3, kpi4, kpi5 = st.columns(5)
    
    kpi1.metric("Active Records", f"{len(df_current):,}", delta=f"{len(df_current) - len(df_raw):,}" if len(df_current) != len(df_raw) else None)
    kpi2.metric("Total Columns", f"{len(df_current.columns)}")
    
    total_missing = int(df_current.isna().sum().sum())
    total_cells = max(1, len(df_current) * len(df_current.columns))
    kpi3.metric("Missing Values", f"{total_missing:,}", f"{(total_missing/total_cells)*100:.1f}%")
    
    dup_count = int(df_current.duplicated().sum())
    kpi4.metric("Duplicate Rows", f"{dup_count:,}", f"{(dup_count/max(1, len(df_current)))*100:.1f}%")
    
    # Dynamic Domain KPIs if detected
    hc_fields = detect_healthcare_fields(df_current)
    if hc_fields["age"] and hc_fields["age"] in df_current.columns:
        avg_age = float(pd.to_numeric(df_current[hc_fields["age"]], errors='coerce').mean())
        kpi5.metric("Average Age", f"{avg_age:.1f} yrs")
    elif hc_fields["insurance"] and hc_fields["insurance"] in df_current.columns:
        ins_types = df_current[hc_fields["insurance"]].nunique()
        kpi5.metric("Insurance Types", f"{ins_types}")
    else:
        mem_bytes = df_current.memory_usage(deep=True).sum()
        kpi5.metric("Memory Footprint", format_bytes(mem_bytes))

    # SECOND ROW HEALTHCARE METRICS IF DETECTED
    hc_detected_count = sum(1 for v in hc_fields.values() if v and v in df_current.columns)
    if hc_detected_count >= 3:
        h1, h2, h3, h4 = st.columns(4)
        if hc_fields["insurance"] and hc_fields["insurance"] in df_current.columns:
            top_payer = df_current[hc_fields["insurance"]].mode().iloc[0] if len(df_current) > 0 else "N/A"
            h1.metric("Primary Coverage Category", str(top_payer))
        if hc_fields["clinic"] and hc_fields["clinic"] in df_current.columns:
            clinics = df_current[hc_fields["clinic"]].nunique()
            h2.metric("Active Health Centers", f"{clinics:,}")
        if hc_fields["community"] and hc_fields["community"] in df_current.columns:
            comms = df_current[hc_fields["community"]].nunique()
            h3.metric("Community Areas Represented", f"{comms:,}")
        if hc_fields["visits"] and hc_fields["visits"] in df_current.columns:
            total_encounters = pd.to_numeric(df_current[hc_fields["visits"]], errors='coerce').sum()
            h4.metric("Total Patient Encounters", f"{int(total_encounters):,}")

    st.divider()

    # PRIMARY TABS
    tab_inspect, tab_profile, tab_export, tab_nav = st.tabs([
        "📋 Data Preview & Inspector",
        "🔬 Profile Overview",
        "💾 Raw vs Cleaned & Export",
        "🚀 Navigation Guide",
    ])

    with tab_inspect:
        st.subheader("Interactive Dataset Inspector")
        st.dataframe(df_current.head(100), use_container_width=True)
        st.caption(f"Previewing first 100 rows of {len(df_current):,} active filtered records.")

    with tab_profile:
        st.subheader("Data Type & Column Inventory")
        col_types = detect_column_types(df_current)
        p1, p2, p3 = st.columns(3)
        with p1:
            st.markdown(f"**Numeric Columns ({len(col_types['numeric'])})**")
            st.write(col_types["numeric"] if col_types["numeric"] else "None detected")
        with p2:
            st.markdown(f"**Categorical Columns ({len(col_types['categorical'])})**")
            st.write(col_types["categorical"] if col_types["categorical"] else "None detected")
        with p3:
            st.markdown(f"**Datetime & ID Columns ({len(col_types['datetime']) + len(col_types['identifier'])})**")
            st.write({"Datetime": col_types["datetime"], "IDs": col_types["identifier"]})

    with tab_export:
        st.subheader("Dataset Comparison & Export")
        c1, c2 = st.columns(2)
        with c1:
            st.markdown(f"**Raw Dataset ({len(df_raw):,} rows × {len(df_raw.columns)} cols)**")
            st.dataframe(df_raw.head(20), use_container_width=True)
        with c2:
            st.markdown(f"**Cleaned/Filtered Dataset ({len(df_current):,} rows × {len(df_current.columns)} cols)**")
            st.dataframe(df_current.head(20), use_container_width=True)

        csv_buffer = df_current.to_csv(index=False).encode("utf-8")
        st.download_button(
            label="📥 Download Cleaned & Filtered CSV",
            data=csv_buffer,
            file_name="Cleaned_export.csv",
            mime="text/csv",
            type="primary",
        )

    with tab_nav:
        st.subheader("Multi-Page Analysis Directory")
        st.markdown(
            """
            Use the sidebar pages to navigate to in-depth modules:
            - **01 Data Overview**: File metadata, encoding validation, schema inventory.
            - **02 Data Quality**: Missingness matrix, casing anomalies, duplicate analysis, and cleaning pipeline controls.
            - **03 EDA**: Univariate numeric distributions, categorical bar charts, temporal trends, IQR outliers, and correlation heatmaps.
            - **04 Demographics**: Age cohorts, gender breakdowns, race/ethnicity, and language cross-sections.
            - **05 Insurance**: Payer distribution, age × insurance cross-tabs, clinic breakdowns.
            - **06 Geography**: Dynamic mapping and community area analysis.
            """
        )
