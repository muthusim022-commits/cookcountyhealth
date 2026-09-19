"""
Page 04: Patient Demographics Analysis
Examines age distributions, gender ratios, race/ethnicity composition, and linguistic diversity.
Adapts dynamically to detected healthcare columns without hardcoded assumptions.
"""

import streamlit as st
import pandas as pd
import plotly.express as px

from src.utils import detect_healthcare_fields, format_number, format_percentage
from src.analysis import get_age_group_distribution, calculate_categorical_summary
from src.visualizations import plot_numeric_distribution, plot_categorical_bar

st.set_page_config(page_title="Demographics | CookCountyHealth", page_icon="👥", layout="wide")

st.title("👥 Patient Demographics Analysis")
st.markdown("Dynamic evaluation of patient age distribution, gender identification, race/ethnicity cohorts, and linguistic profiles.")

if "cleaned_df" not in st.session_state or st.session_state["cleaned_df"] is None:
    st.warning("Please upload a CSV dataset on the main page or load the sample data to view this page.")
    st.stop()

df = st.session_state.get("filtered_df", st.session_state["cleaned_df"])
hc = detect_healthcare_fields(df)

# Check if ANY demographic columns are available
demog_cols = [hc["age"], hc["gender"], hc["race_ethnicity"], hc["language"]]
available_demogs = [c for c in demog_cols if c and c in df.columns]

if not available_demogs:
    st.warning("⚠️ No standard demographic columns (Age, Gender, Race/Ethnicity, Language) were detected in this dataset.")
    st.info("You can explore general variable distributions in the **03 EDA** page.")
    st.stop()

# 1. AGE DEMOGRAPHICS
if hc["age"] and hc["age"] in df.columns:
    age_col = hc["age"]
    clean_age = pd.to_numeric(df[age_col], errors='coerce').dropna()
    valid_age = clean_age[clean_age >= 0]

    st.subheader("1. Age Cohort & Distribution Analysis")
    a1, a2, a3, a4 = st.columns(4)
    a1.metric("Average Patient Age", f"{valid_age.mean():.1f} yrs")
    a2.metric("Median Age", f"{valid_age.median():.1f} yrs")
    a3.metric("Youngest Patient", f"{int(valid_age.min())} yrs")
    a4.metric("Oldest Patient", f"{int(valid_age.max())} yrs")

    col_age_hist, col_age_cohorts = st.columns([3, 2])
    with col_age_hist:
        st.plotly_chart(plot_numeric_distribution(valid_age, age_col), use_container_width=True)

    with col_age_cohorts:
        cohort_df = get_age_group_distribution(valid_age)
        fig_cohort = px.bar(
            cohort_df,
            x="Age Group",
            y="Count",
            text="Count",
            color="Count",
            color_continuous_scale="Teal",
            title="Patients by Standardized Age Cohort",
            template="plotly_white",
        )
        fig_cohort.update_traces(texttemplate='%{text:,}', textposition='outside')
        fig_cohort.update_layout(coloraxis_showscale=False, yaxis_title="Patients")
        st.plotly_chart(fig_cohort, use_container_width=True)
        st.dataframe(cohort_df, use_container_width=True)

    st.divider()

# 2. GENDER DEMOGRAPHICS
if hc["gender"] and hc["gender"] in df.columns:
    gender_col = hc["gender"]
    st.subheader("2. Gender Identification Distribution")

    harmonize = st.checkbox("Harmonize gender casing & short-codes (e.g. FEMALE / F → Female)", value=True)
    if harmonize:
        def _std_g(val):
            if pd.isna(val) or str(val).strip() == '':
                return 'Unknown'
            v = str(val).strip().lower()
            if v in ['f', 'female', 'fem', 'woman']:
                return 'Female'
            if v in ['m', 'male', 'masc', 'man']:
                return 'Male'
            if v in ['nonbinary', 'non-binary', 'nb', 'x', 'genderqueer']:
                return 'Non-Binary'
            if v in ['other', 'o']:
                return 'Other'
            return str(val).strip().title()
        gender_series = df[gender_col].apply(_std_g)
    else:
        gender_series = df[gender_col]

    gender_summary = calculate_categorical_summary(gender_series)
    g_col1, g_col2 = st.columns([2, 3])

    with g_col1:
        fig_gender_pie = px.pie(
            gender_summary,
            names="Category",
            values="Count",
            title=f"Gender Composition ({gender_col})",
            hole=0.45,
            template="plotly_white",
            color_discrete_sequence=px.colors.qualitative.Safe,
        )
        st.plotly_chart(fig_gender_pie, use_container_width=True)

    with g_col2:
        st.markdown("#### Frequency Table")
        st.dataframe(gender_summary, use_container_width=True)

    st.divider()

# 3. RACE / ETHNICITY & LANGUAGE
r_col, l_col = st.columns(2)

with r_col:
    if hc["race_ethnicity"] and hc["race_ethnicity"] in df.columns:
        race_col = hc["race_ethnicity"]
        st.subheader("3. Race / Ethnicity Composition")
        race_summary = calculate_categorical_summary(df[race_col])
        st.plotly_chart(plot_categorical_bar(race_summary, race_col, top_n=10), use_container_width=True)
        st.dataframe(race_summary, use_container_width=True)
    else:
        st.info("Race/Ethnicity column not detected.")

with l_col:
    if hc["language"] and hc["language"] in df.columns:
        lang_col = hc["language"]
        st.subheader("4. Primary Language Diversity")
        lang_summary = calculate_categorical_summary(df[lang_col])
        st.plotly_chart(plot_categorical_bar(lang_summary, lang_col, top_n=10), use_container_width=True)
        st.dataframe(lang_summary, use_container_width=True)
    else:
        st.info("Primary language column not detected.")

# BIVARIATE DEMOGRAPHIC CROSS-TABULATION
if hc["age"] and hc["gender"] and hc["age"] in df.columns and hc["gender"] in df.columns:
    st.divider()
    st.subheader("5. Demographic Cross-Section: Age Distribution by Gender")
    fig_age_gender = px.box(
        df,
        x=hc["gender"],
        y=hc["age"],
        color=hc["gender"],
        title=f"Patient Age Spread across Gender Identities ({hc['age']} × {hc['gender']})",
        template="plotly_white",
    )
    st.plotly_chart(fig_age_gender, use_container_width=True)
