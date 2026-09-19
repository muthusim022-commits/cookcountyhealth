"""
Page 05: Insurance & Coverage Payer Analysis
Dynamic analysis of health plan distribution, uninsured rates, payer mix by age cohort,
and clinic-level coverage profiles without hardcoded assumptions.
"""

import streamlit as st
import pandas as pd
import plotly.express as px

from src.utils import detect_healthcare_fields, format_number, format_percentage
from src.analysis import calculate_categorical_summary, compute_crosstab_analysis
from src.visualizations import plot_categorical_bar

st.set_page_config(page_title="Insurance | CookCountyHealth", page_icon="💳", layout="wide")

st.title("💳 Insurance & Payer Mix Analysis")
st.markdown("Dynamic evaluation of healthcare coverage, public vs private payer distribution, and coverage disparities across demographic segments.")

if "cleaned_df" not in st.session_state or st.session_state["cleaned_df"] is None:
    st.warning("Please upload a CSV dataset on the main page or load the sample data to view this page.")
    st.stop()

df = st.session_state.get("filtered_df", st.session_state["cleaned_df"])
hc = detect_healthcare_fields(df)

if not hc["insurance"] or hc["insurance"] not in df.columns:
    st.warning("⚠️ No insurance or coverage-related column was detected in this dataset.")
    st.info("Ensure your dataset contains a field such as 'Insurance', 'Insurance_Type', 'Payer', or 'Coverage'.")
    st.stop()

ins_col = hc["insurance"]
ins_summary = calculate_categorical_summary(df[ins_col])

# TOP LEVEL PAYER MIX METRICS
top_payer = ins_summary.iloc[0]["Category"] if len(ins_summary) > 0 else "N/A"
top_payer_share = ins_summary.iloc[0]["Percentage"] if len(ins_summary) > 0 else 0.0
total_plans = len(ins_summary)

st.subheader("Payer Distribution Scorecard")
ip1, ip2, ip3, ip4 = st.columns(4)
ip1.metric("Payer Categories Identified", format_number(total_plans))
ip2.metric("Dominant Coverage Plan", str(top_payer))
ip3.metric("Dominant Plan Share", format_percentage(top_payer_share))
ip4.metric("Valid Insured Records", format_number(df[ins_col].notna().sum()))

st.divider()

# PRIMARY PAYER MIX VISUALIZATIONS & MACRO SAFETY-NET SPLIT
col_chart, col_macro = st.columns([3, 2])
with col_chart:
    st.markdown("#### Coverage Payer Mix (Program Distribution)")
    st.plotly_chart(plot_categorical_bar(ins_summary, ins_col, top_n=15), use_container_width=True)

with col_macro:
    st.markdown("#### Macro Safety-Net Classification")
    # Classify each program
    def _classify_payer(p):
        p_str = str(p).lower()
        if any(term in p_str for term in ['medicaid', 'countycare', 'medicare', 'chip', 'dual', 'public', 'fehb', 'va']):
            return 'Public / Government'
        if any(term in p_str for term in ['uninsured', 'self-pay', 'self pay', 'charity', 'none', 'sliding']):
            return 'Uninsured / Self-Pay'
        return 'Commercial / Private'

    df_macro = df[[ins_col]].dropna().copy()
    df_macro['Macro_Category'] = df_macro[ins_col].apply(_classify_payer)
    macro_counts = df_macro['Macro_Category'].value_counts().reset_index()
    macro_counts.columns = ['Category', 'Count']
    macro_counts['Percentage'] = (macro_counts['Count'] / macro_counts['Count'].sum()) * 100.0

    fig_donut = px.pie(
        macro_counts,
        names='Category',
        values='Count',
        hole=0.45,
        color='Category',
        color_discrete_map={
            'Public / Government': '#2563eb',
            'Commercial / Private': '#059669',
            'Uninsured / Self-Pay': '#ea580c',
        },
        title="Public Safety-Net vs Commercial Composition",
        template="plotly_white",
    )
    fig_donut.update_traces(textposition='inside', textinfo='percent+label')
    fig_donut.update_layout(showlegend=False, margin=dict(t=30, b=10, l=10, r=10))
    st.plotly_chart(fig_donut, use_container_width=True)

st.divider()

# AGE X INSURANCE ANALYSIS
if hc["age"] and hc["age"] in df.columns:
    st.subheader("Age Profile Across Insurance Types")
    st.markdown("Inspect how patient age varies systematically across coverage programs.")

    fig_age_ins = px.box(
        df,
        x=ins_col,
        y=hc["age"],
        color=ins_col,
        title=f"Patient Age Distribution by Coverage Program ({hc['age']} × {ins_col})",
        template="plotly_white",
    )
    fig_age_ins.update_layout(xaxis_tickangle=-30, showlegend=False)
    st.plotly_chart(fig_age_ins, use_container_width=True)

# GENDER X INSURANCE & CLINIC X INSURANCE TABS
cross_tab1, cross_tab2 = st.tabs(["Gender × Insurance", "Facility / Clinic × Insurance"])

with cross_tab1:
    if hc["gender"] and hc["gender"] in df.columns:
        st.subheader("Gender Distribution across Coverage Types")
        ct_gender = compute_crosstab_analysis(df, ins_col, hc["gender"], normalize=True)
        fig_g_ins = px.bar(
            ct_gender,
            title="Gender Proportion (%) within Each Insurance Category",
            barmode="stack",
            template="plotly_white",
        )
        fig_g_ins.update_layout(yaxis_title="Proportion (%)", xaxis_tickangle=-30)
        st.plotly_chart(fig_g_ins, use_container_width=True)
        st.dataframe(ct_gender.round(1), use_container_width=True)
    else:
        st.info("Gender column not detected for bivariate coverage cross-tabulation.")

with cross_tab2:
    if hc["clinic"] and hc["clinic"] in df.columns:
        st.subheader("Clinic Facility Payer Distribution")
        top_clinics = df[hc["clinic"]].value_counts().head(8).index
        sub_clinic = df[df[hc["clinic"]].isin(top_clinics)]
        ct_clinic = pd.crosstab(sub_clinic[hc["clinic"]], sub_clinic[ins_col], normalize="index") * 100.0

        fig_clinic_ins = px.bar(
            ct_clinic,
            title=f"Payer Mix by Top Health Facilities ({hc['clinic']})",
            barmode="stack",
            template="plotly_white",
        )
        fig_clinic_ins.update_layout(yaxis_title="Proportion (%)", xaxis_tickangle=-25)
        st.plotly_chart(fig_clinic_ins, use_container_width=True)
        st.dataframe(ct_clinic.round(1), use_container_width=True)
    else:
        st.info("Clinic or facility column not detected for facility payer analysis.")
