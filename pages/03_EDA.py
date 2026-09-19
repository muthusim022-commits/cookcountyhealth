"""
Page 03: Exploratory Data Analysis (EDA) & Relationship Explorer
Dynamic numeric and categorical distributions, IQR outlier detection, correlation matrix,
and intelligent automated chart routing based on variable datatypes.
"""

import streamlit as st
import pandas as pd
import numpy as np

from src.analysis import (
    calculate_numeric_summary,
    calculate_categorical_summary,
    calculate_date_summary,
    detect_iqr_outliers,
    compute_correlation_matrix,
)
from src.visualizations import (
    plot_numeric_distribution,
    plot_categorical_bar,
    plot_temporal_trend,
    plot_correlation_heatmap,
    plot_outlier_boxplot,
    plot_relationship,
)
from src.utils import detect_column_types, format_number, format_percentage

st.set_page_config(page_title="EDA | CookCountyHealth", page_icon="📈", layout="wide")

st.title("📈 Exploratory & Statistical Engine")
st.markdown("Automated univariate profiling, statistical outlier boundaries, correlation diagnostics, and bivariate relationship discovery.")

if "cleaned_df" not in st.session_state or st.session_state["cleaned_df"] is None:
    st.warning("Please upload a CSV dataset on the main page or load the sample data to view this page.")
    st.stop()

df = st.session_state.get("filtered_df", st.session_state["cleaned_df"])
col_types = detect_column_types(df)

eda_tab1, eda_tab2, eda_tab3, eda_tab4, eda_tab5 = st.tabs([
    "📊 Numeric Distributions & Outliers",
    "🏷️ Categorical Frequencies",
    "📅 Temporal Trend Analysis",
    "🔗 Correlation Matrix",
    "🔀 Relationship Explorer",
])

# 1. NUMERIC DISTRIBUTIONS & OUTLIERS
with eda_tab1:
    st.subheader("Numeric Variable Analysis")
    numeric_cols = col_types["numeric"]

    if not numeric_cols:
        st.info("No numeric columns detected in the active dataset.")
    else:
        sel_num = st.selectbox("Select Numeric Column", options=numeric_cols, key="eda_sel_num")
        if sel_num:
            stats = calculate_numeric_summary(df[sel_num])
            outliers = detect_iqr_outliers(df[sel_num])

            # Stats cards
            s1, s2, s3, s4, s5, s6 = st.columns(6)
            s1.metric("Mean", format_number(stats["mean"]))
            s2.metric("Median", format_number(stats["median"]))
            s3.metric("Std Dev", format_number(stats["std"]))
            s4.metric("Min", format_number(stats["min"]))
            s5.metric("Max", format_number(stats["max"]))
            s6.metric("IQR", format_number(stats["iqr"]))

            # Distribution chart
            col_chart1, col_chart2 = st.columns([3, 2])
            with col_chart1:
                st.plotly_chart(plot_numeric_distribution(df[sel_num], sel_num), use_container_width=True)

            with col_chart2:
                st.markdown("#### IQR Outlier Analysis")
                st.caption(
                    "Outliers identified using standard boxplot fences: "
                    r"$\text{Lower} = Q_1 - 1.5 \times \text{IQR}$, $\text{Upper} = Q_3 + 1.5 \times \text{IQR}$."
                )
                o1, o2 = st.columns(2)
                o1.metric("Lower Fence", format_number(outliers["lower_bound"]))
                o2.metric("Upper Fence", format_number(outliers["upper_bound"]))
                
                o3, o4 = st.columns(2)
                o3.metric("Outlier Count", format_number(outliers["outlier_count"]))
                o4.metric("Outlier Proportion", format_percentage(outliers["outlier_pct"]))

                st.plotly_chart(
                    plot_outlier_boxplot(df[sel_num], sel_num, outliers["lower_bound"], outliers["upper_bound"]),
                    use_container_width=True
                )
                st.info("Statistical outliers are valid data points representing clinical or operational variance and are not removed automatically.")

# 2. CATEGORICAL FREQUENCIES
with eda_tab2:
    st.subheader("Categorical Variable Analysis")
    cat_cols = col_types["categorical"]

    if not cat_cols:
        st.info("No categorical columns detected in the active dataset.")
    else:
        c_sel_col, c_sel_top = st.columns([3, 1])
        with c_sel_col:
            sel_cat = st.selectbox("Select Categorical Column", options=cat_cols, key="eda_sel_cat")
        with c_sel_top:
            top_n = st.slider("Top N Categories", min_value=5, max_value=50, value=15, step=5)

        if sel_cat:
            cat_summary = calculate_categorical_summary(df[sel_cat], top_n=top_n)
            total_uniques = df[sel_cat].nunique(dropna=True)
            missing_in_cat = df[sel_cat].isna().sum()

            mc1, mc2, mc3 = st.columns(3)
            mc1.metric("Unique Categories", format_number(total_uniques))
            mc2.metric("Modal Category", str(cat_summary.iloc[0]["Category"]) if len(cat_summary) > 0 else "N/A")
            mc3.metric("Missing Values", format_number(missing_in_cat))

            col_barchart, col_bartable = st.columns([3, 2])
            with col_barchart:
                st.plotly_chart(plot_categorical_bar(cat_summary, sel_cat, top_n=top_n), use_container_width=True)
            with col_bartable:
                st.markdown("#### Frequency Distribution Table")
                st.dataframe(cat_summary, use_container_width=True)

# 3. TEMPORAL TRENDS
with eda_tab3:
    st.subheader("Temporal Trends & Time Series")
    date_cols = col_types["datetime"]

    if not date_cols:
        st.info("No datetime columns detected in this dataset.")
    else:
        sel_date = st.selectbox("Select Date Column", options=date_cols, key="eda_sel_date")
        if sel_date:
            date_stats = calculate_date_summary(df[sel_date])
            d1, d2, d3 = st.columns(3)
            d1.metric("Earliest Date", str(date_stats["earliest_date"].strftime("%Y-%m-%d") if date_stats["earliest_date"] else "N/A"))
            d2.metric("Latest Date", str(date_stats["latest_date"].strftime("%Y-%m-%d") if date_stats["latest_date"] else "N/A"))
            d3.metric("Observed Duration", f"{date_stats['span_days']:,} days")

            granularity = st.radio("Aggregation Interval", ["Monthly", "Yearly"], horizontal=True)
            if granularity == "Monthly" and not date_stats["monthly_counts"].empty:
                st.plotly_chart(
                    plot_temporal_trend(date_stats["monthly_counts"], x_col="Month", y_col="Records", title=f"Monthly Registration Volume ({sel_date})"),
                    use_container_width=True
                )
            elif granularity == "Yearly" and not date_stats["yearly_counts"].empty:
                st.plotly_chart(
                    plot_temporal_trend(date_stats["yearly_counts"], x_col="Year", y_col="Records", title=f"Yearly Volume Trend ({sel_date})"),
                    use_container_width=True
                )

# 4. CORRELATION MATRIX
with eda_tab4:
    st.subheader("Bivariate Correlation Heatmap")
    st.markdown(
        "> **Methodological Note:** Correlation indicates the strength and direction of association "
        "between numerical variables. It does not establish causation."
    )

    numeric_cols = col_types["numeric"]
    if len(numeric_cols) < 2:
        st.info("At least two numeric columns are required to construct a correlation matrix.")
    else:
        sel_corrs = st.multiselect(
            "Select Numerical Columns for Correlation Matrix",
            options=numeric_cols,
            default=numeric_cols[:6],
            key="eda_sel_corr_cols"
        )
        if len(sel_corrs) >= 2:
            corr_df = compute_correlation_matrix(df, sel_corrs)
            st.plotly_chart(plot_correlation_heatmap(corr_df), use_container_width=True)
            st.dataframe(corr_df.round(3), use_container_width=True)
        else:
            st.warning("Please select at least 2 numerical columns.")

# 5. RELATIONSHIP EXPLORER (INTELLIGENT CHART ROUTING)
with eda_tab5:
    st.subheader("Bivariate Relationship Explorer")
    st.markdown("Intelligently chooses the optimal visualization based on mathematical variable datatypes.")

    all_cols = list(df.columns)
    rx1, rx2, rx3 = st.columns(3)

    with rx1:
        x_var = st.selectbox("X-Axis Variable", options=all_cols, index=0, key="rel_x")
    with rx2:
        y_var = st.selectbox("Y-Axis Variable", options=all_cols, index=min(1, len(all_cols) - 1), key="rel_y")
    with rx3:
        color_candidates = ["None"] + [c for c in col_types["categorical"] if df[c].nunique() <= 15]
        color_var = st.selectbox("Color Legend (Optional)", options=color_candidates, index=0, key="rel_color")

    def get_var_type(col_name: str) -> str:
        if col_name in col_types["numeric"]:
            return "numeric"
        if col_name in col_types["datetime"]:
            return "datetime"
        return "categorical"

    x_type = get_var_type(x_var)
    y_type = get_var_type(y_var)

    # Display routing justification
    routing_map = {
        ("numeric", "numeric"): "Scatter Plot (Numeric × Numeric)",
        ("categorical", "numeric"): "Vertical Box Plot (Categorical × Numeric)",
        ("numeric", "categorical"): "Horizontal Box Plot (Numeric × Categorical)",
        ("categorical", "categorical"): "Grouped Bar Chart (Categorical × Categorical)",
        ("datetime", "numeric"): "Time-Series Line Chart (Datetime × Numeric)",
    }
    chart_rationale = routing_map.get((x_type, y_type), "Histogram / Cross-Distribution")
    st.info(f"💡 **Automated Chart Selection:** Routed to **{chart_rationale}** based on `{x_var}` ({x_type}) and `{y_var}` ({y_type}).")

    color_arg = color_var if color_var != "None" else None
    fig_rel = plot_relationship(df, x_var, y_var, x_type, y_type, color_col=color_arg)
    st.plotly_chart(fig_rel, use_container_width=True)
