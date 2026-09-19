"""
Page 06: Geographic Analysis & Regional Demographics
Community area aggregation, postal code distribution, and health facility catchment analysis.
"""

import streamlit as st
import pandas as pd
import plotly.express as px

from src.utils import detect_healthcare_fields, detect_column_types, format_number
from src.analysis import calculate_categorical_summary

st.set_page_config(page_title="06 Geography | CookCountyHealth", page_icon="🗺️", layout="wide")

st.title("🗺️ Geographic Distribution & Regional Catchment")
st.markdown("Community-level concentrations, postal code distribution, and health system geographic footprint.")

if "cleaned_df" not in st.session_state or st.session_state["cleaned_df"] is None:
    st.warning("Please upload a CSV dataset on the main page or load the sample data to view this page.")
    st.stop()

df = st.session_state.get("filtered_df", st.session_state["cleaned_df"])
hc = detect_healthcare_fields(df)
col_types = detect_column_types(df)

has_comm = hc["community"] and hc["community"] in df.columns
has_zip = hc["zip_code"] and hc["zip_code"] in df.columns
has_clinic = hc["clinic"] and hc["clinic"] in df.columns

if not has_comm and not has_zip:
    st.warning("No geographic fields (Community Area or ZIP Code) were detected in this dataset.")
    st.stop()

# Executive Summary KPIs
k1, k2, k3, k4 = st.columns(4)
total_geo_records = len(df.dropna(subset=[col for col in [hc["community"], hc["zip_code"]] if col and col in df.columns]))
k1.metric("Geographically Profiled", f"{total_geo_records:,}")

if has_comm:
    comm_col = hc["community"]
    comm_summary = calculate_categorical_summary(df[comm_col], top_n=25)
    k2.metric("Community Areas", f"{df[comm_col].nunique():,}")
    top_comm_val = comm_summary['Category'].iloc[0] if len(comm_summary) > 0 else "N/A"
    k3.metric("Top Community Area", str(top_comm_val))
else:
    comm_summary = pd.DataFrame()
    k2.metric("Community Areas", "N/A")
    k3.metric("Top Community Area", "N/A")

if has_zip:
    zip_col = hc["zip_code"]
    zip_summary = calculate_categorical_summary(df[zip_col], top_n=20)
    top_zip_val = zip_summary['Category'].iloc[0] if len(zip_summary) > 0 else "N/A"
    k4.metric("Dominant ZIP Code", str(top_zip_val))
else:
    zip_summary = pd.DataFrame()
    k4.metric("Dominant ZIP Code", "N/A")

st.divider()

# COMMUNITY AREA & ZIP CODE AGGREGATIONS
tab_comm, tab_zip = st.tabs(["Community Area Concentrations", "ZIP Code Breakdown"])

with tab_comm:
    if has_comm:
        c1, c2 = st.columns([3, 2])
        with c1:
            fig_comm = px.bar(
                comm_summary,
                x="Count",
                y="Category",
                orientation="h",
                text="Count",
                title=f"Patients by Community Area ({comm_col})",
                color="Count",
                color_continuous_scale="Teal",
                template="plotly_white",
            )
            fig_comm.update_layout(yaxis=dict(autorange="reversed"), coloraxis_showscale=False)
            fig_comm.update_traces(texttemplate='%{text:,}', textposition='outside')
            st.plotly_chart(fig_comm, use_container_width=True)
        with c2:
            st.markdown("#### Community Area Distribution Table")
            st.dataframe(comm_summary, use_container_width=True)

        if has_clinic:
            st.markdown("#### Community Area Catchment to Primary Health Facility")
            cross_comm_clinic = pd.crosstab(df[comm_col], df[hc["clinic"]])
            st.dataframe(cross_comm_clinic.head(15), use_container_width=True)
    else:
        st.info("Community area field not present in current dataset.")

with tab_zip:
    if has_zip:
        z1, z2 = st.columns([3, 2])
        with z1:
            fig_zip = px.bar(
                zip_summary,
                x="Count",
                y="Category",
                orientation="h",
                text="Count",
                title=f"Patients by ZIP Code ({zip_col})",
                color="Count",
                color_continuous_scale="Blues",
                template="plotly_white",
            )
            fig_zip.update_layout(yaxis=dict(autorange="reversed"), coloraxis_showscale=False)
            fig_zip.update_traces(texttemplate='%{text:,}', textposition='outside')
            st.plotly_chart(fig_zip, use_container_width=True)
        with z2:
            st.markdown("#### ZIP Code Distribution Table")
            st.dataframe(zip_summary, use_container_width=True)
    else:
        st.info("ZIP Code field not present in current dataset.")

