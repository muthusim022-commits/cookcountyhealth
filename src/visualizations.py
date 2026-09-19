"""
Visualization Engine for CookCountyHealth.
Generates responsive, interactive Plotly visualizations with automatic variable-type routing.
"""

from typing import Optional, List
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go

# Clean, professional healthcare palette
COLOR_PRIMARY = "#1E40AF"  # Deep blue
COLOR_ACCENT = "#0D9488"   # Teal
COLOR_MUTED = "#64748B"    # Slate
COLOR_WARN = "#E11D48"     # Rose / Crimson

CHART_TEMPLATE = "plotly_white"

def plot_numeric_distribution(series: pd.Series, col_name: str, bins: int = 30) -> go.Figure:
    """Create a unified histogram and marginal boxplot for a numeric variable."""
    clean_s = series.dropna()
    fig = px.histogram(
        clean_s,
        x=col_name,
        nbins=bins,
        marginal="box",
        title=f"Distribution of {col_name}",
        color_discrete_sequence=[COLOR_PRIMARY],
        template=CHART_TEMPLATE,
    )
    fig.update_layout(
        xaxis_title=col_name,
        yaxis_title="Record Count",
        bargap=0.08,
        margin=dict(l=40, r=40, t=60, b=40),
        font=dict(family="system-ui, -apple-system, sans-serif"),
    )
    return fig

def plot_categorical_bar(df_cat: pd.DataFrame, col_name: str, top_n: int = 15) -> go.Figure:
    """Create a clean horizontal or vertical bar chart for categorical distributions."""
    plot_df = df_cat.head(top_n)
    fig = px.bar(
        plot_df,
        x="Count",
        y="Category",
        orientation="h",
        text="Count",
        title=f"Frequency Breakdown: {col_name} (Top {len(plot_df)})",
        color="Count",
        color_continuous_scale="Blues",
        template=CHART_TEMPLATE,
    )
    fig.update_layout(
        yaxis=dict(autorange="reversed"),
        xaxis_title="Count",
        yaxis_title=col_name,
        coloraxis_showscale=False,
        margin=dict(l=40, r=40, t=60, b=40),
        font=dict(family="system-ui, -apple-system, sans-serif"),
    )
    fig.update_traces(texttemplate='%{text:,}', textposition='outside')
    return fig

def plot_temporal_trend(df_counts: pd.DataFrame, x_col: str, y_col: str = "Records", title: str = "Records Over Time") -> go.Figure:
    """Generate an interactive line and area chart for datetime aggregations."""
    fig = px.area(
        df_counts,
        x=x_col,
        y=y_col,
        title=title,
        color_discrete_sequence=[COLOR_PRIMARY],
        template=CHART_TEMPLATE,
    )
    fig.update_traces(mode="lines+markers", line=dict(width=2.5))
    fig.update_layout(
        xaxis_title=x_col,
        yaxis_title=y_col,
        margin=dict(l=40, r=40, t=60, b=40),
        font=dict(family="system-ui, -apple-system, sans-serif"),
    )
    return fig

def plot_correlation_heatmap(corr_df: pd.DataFrame) -> go.Figure:
    """Generate a clean annotated correlation matrix heatmap."""
    z = corr_df.values
    x = list(corr_df.columns)
    y = list(corr_df.index)

    fig = px.imshow(
        z,
        x=x,
        y=y,
        color_continuous_scale="RdBu_r",
        zmin=-1.0,
        zmax=1.0,
        text_auto=".2f",
        title="Pearson Correlation Matrix",
        template=CHART_TEMPLATE,
    )
    fig.update_layout(
        margin=dict(l=40, r=40, t=60, b=40),
        font=dict(family="system-ui, -apple-system, sans-serif"),
    )
    return fig

def plot_outlier_boxplot(series: pd.Series, col_name: str, lower_bound: float, upper_bound: float) -> go.Figure:
    """Display an interactive boxplot with visual IQR upper/lower bound threshold guides."""
    clean_s = series.dropna()
    fig = go.Figure()
    fig.add_trace(go.Box(
        y=clean_s,
        name=col_name,
        boxpoints="outliers",
        marker_color=COLOR_PRIMARY,
        line_color=COLOR_PRIMARY,
    ))

    # Add threshold guide lines if finite
    if not np.isnan(lower_bound):
        fig.add_hline(y=lower_bound, line_dash="dash", line_color=COLOR_WARN, annotation_text=f"Lower Bound ({lower_bound:.1f})")
    if not np.isnan(upper_bound):
        fig.add_hline(y=upper_bound, line_dash="dash", line_color=COLOR_WARN, annotation_text=f"Upper Bound ({upper_bound:.1f})")

    fig.update_layout(
        title=f"Statistical Outlier Inspection: {col_name}",
        yaxis_title=col_name,
        template=CHART_TEMPLATE,
        margin=dict(l=40, r=40, t=60, b=40),
        font=dict(family="system-ui, -apple-system, sans-serif"),
    )
    return fig

def plot_relationship(
    df: pd.DataFrame,
    x_col: str,
    y_col: str,
    x_type: str,
    y_type: str,
    color_col: Optional[str] = None
) -> go.Figure:
    """
    Intelligently select and render the appropriate chart based on variable types:
    - Numeric x Numeric -> Scatter plot
    - Categorical x Numeric -> Box plot
    - Numeric x Categorical -> Horizontal Box plot
    - Categorical x Categorical -> Stacked / Grouped bar chart
    - Datetime x Numeric -> Time-series Line chart
    """
    sample_df = df.copy()
    # Limit sample size for scatter plot if extremely large to maintain responsiveness
    if len(sample_df) > 5000 and x_type == "numeric" and y_type == "numeric":
        sample_df = sample_df.sample(5000, random_state=42)

    # 1. Numeric x Numeric -> Scatter
    if x_type == "numeric" and y_type == "numeric":
        fig = px.scatter(
            sample_df,
            x=x_col,
            y=y_col,
            color=color_col if color_col in sample_df.columns else None,
            trendline="ols" if len(sample_df.dropna(subset=[x_col, y_col])) > 5 else None,
            title=f"Scatter Plot: {y_col} vs {x_col}",
            template=CHART_TEMPLATE,
            opacity=0.7,
        )

    # 2. Categorical x Numeric -> Box Plot
    elif x_type == "categorical" and y_type == "numeric":
        # Limit categories if too many
        top_cats = sample_df[x_col].value_counts().head(12).index
        filtered = sample_df[sample_df[x_col].isin(top_cats)]
        fig = px.box(
            filtered,
            x=x_col,
            y=y_col,
            color=color_col if color_col in filtered.columns else x_col,
            title=f"Box Plot: {y_col} across {x_col}",
            template=CHART_TEMPLATE,
        )

    # 3. Numeric x Categorical -> Horizontal Box Plot
    elif x_type == "numeric" and y_type == "categorical":
        top_cats = sample_df[y_col].value_counts().head(12).index
        filtered = sample_df[sample_df[y_col].isin(top_cats)]
        fig = px.box(
            filtered,
            x=x_col,
            y=y_col,
            orientation="h",
            color=color_col if color_col in filtered.columns else y_col,
            title=f"Box Plot: {x_col} across {y_col}",
            template=CHART_TEMPLATE,
        )

    # 4. Categorical x Categorical -> Grouped/Stacked Bar
    elif x_type == "categorical" and y_type == "categorical":
        ct = pd.crosstab(sample_df[x_col], sample_df[y_col]).reset_index()
        melted = ct.melt(id_vars=[x_col], var_name=y_col, value_name="Count")
        fig = px.bar(
            melted,
            x=x_col,
            y="Count",
            color=y_col,
            barmode="group",
            title=f"Cross-Tabulation: {y_col} by {x_col}",
            template=CHART_TEMPLATE,
        )

    # 5. Datetime x Numeric -> Time Series
    elif x_type == "datetime" and y_type == "numeric":
        temp_df = sample_df.dropna(subset=[x_col, y_col]).sort_values(by=x_col)
        fig = px.line(
            temp_df,
            x=x_col,
            y=y_col,
            color=color_col if color_col in temp_df.columns else None,
            title=f"Time Series: {y_col} over {x_col}",
            template=CHART_TEMPLATE,
        )

    # Fallback -> Bar chart
    else:
        fig = px.histogram(
            sample_df,
            x=x_col,
            y=y_col if y_type == "numeric" else None,
            title=f"Relationship Explorer: {y_col} vs {x_col}",
            template=CHART_TEMPLATE,
        )

    fig.update_layout(
        margin=dict(l=40, r=40, t=60, b=40),
        font=dict(family="system-ui, -apple-system, sans-serif"),
    )
    return fig

def plot_geographic_map(
    df: pd.DataFrame,
    lat_col: str,
    lon_col: str,
    color_col: Optional[str] = None,
    size_col: Optional[str] = None,
    hover_cols: Optional[List[str]] = None,
) -> go.Figure:
    """
    Generate an interactive Mapbox/OpenStreetMap scatter visualization.
    Uses free carto-positron tiles without requiring proprietary API tokens.
    """
    clean_geo = df.dropna(subset=[lat_col, lon_col]).copy()
    # Filter valid coordinates range
    clean_geo = clean_geo[
        (clean_geo[lat_col] >= -90) & (clean_geo[lat_col] <= 90) &
        (clean_geo[lon_col] >= -180) & (clean_geo[lon_col] <= 180)
    ]

    if len(clean_geo) == 0:
        fig = go.Figure()
        fig.update_layout(
            title="No valid geographic coordinates found within acceptable boundaries (-90..90, -180..180).",
            template=CHART_TEMPLATE
        )
        return fig

    # Sampling for responsive map rendering if large
    if len(clean_geo) > 3000:
        clean_geo = clean_geo.sample(3000, random_state=42)

    center_lat = float(clean_geo[lat_col].median())
    center_lon = float(clean_geo[lon_col].median())

    kwargs = {
        "data_frame": clean_geo,
        "lat": lat_col,
        "lon": lon_col,
        "zoom": 10,
        "center": dict(lat=center_lat, lon=center_lon),
        "mapbox_style": "carto-positron",
        "title": "Geographic Patient & Facility Distribution",
        "template": CHART_TEMPLATE,
    }

    if color_col and color_col in clean_geo.columns:
        kwargs["color"] = color_col

    if size_col and size_col in clean_geo.columns:
        # Ensure non-negative positive values for marker size
        clean_geo["_map_size"] = clean_geo[size_col].fillna(clean_geo[size_col].median()).clip(lower=1)
        kwargs["size"] = "_map_size"
        kwargs["size_max"] = 16

    if hover_cols:
        valid_hover = [c for c in hover_cols if c in clean_geo.columns]
        if valid_hover:
            kwargs["hover_data"] = valid_hover

    fig = px.scatter_mapbox(**kwargs)
    fig.update_layout(
        margin=dict(l=0, r=0, t=40, b=0),
        font=dict(family="system-ui, -apple-system, sans-serif"),
    )
    return fig
