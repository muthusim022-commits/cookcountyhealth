# CookCountyHealth — Patient Demographics & Insurance EDA

An interactive Exploratory Data Analysis (EDA) application built with Python and Streamlit to ingest, profile, clean, analyze, visualize, and interactively explore patient demographics, healthcare utilization, and insurance coverage.

---

## Overview

I designed and engineered **CookCountyHealth** as a full-featured, production-ready data exploration application. I built this system to solve a common limitation in standard dashboards: rigid hardcoding. Rather than fixing metrics, labels, and charts to one pre-determined file, I created an adaptable analytical engine that dynamically calculates every key performance indicator, distribution, statistical test, outlier boundary, and visualization at runtime from whichever dataset the user uploads.

The application incorporates an automated diagnostic data-quality audit, interactive cleaning pipeline controls with before-and-after audit tracking, dynamic univariate and bivariate exploratory analysis, intelligent visualization routing based on variable data types, and interactive geographic mapping.

---

## Objective

I wanted to demonstrate my ability to take complex healthcare data through the complete data analysis lifecycle:

$$\text{Ingest} \longrightarrow \text{Inspect} \longrightarrow \text{Profile} \longrightarrow \text{Clean} \longrightarrow \text{Transform} \longrightarrow \text{Explore} \longrightarrow \text{Analyze} \longrightarrow \text{Visualize} \longrightarrow \text{Export}$$

Specifically, I set out to prove that I can:
- Architect modular, maintainable Python applications following software engineering best practices.
- Implement robust data ingestion that handles multi-encoding files and variable delimiters.
- Build automated profiling engines that audit missingness, duplicates, constant columns, and cardinality without manual configuration.
- Design transparent data cleaning pipelines with interactive controls and audit tracking.
- Apply statistical techniques (like IQR fences, Pearson correlation, cross-tabulations) dynamically.
- Implement rule-based visualization routing that chooses optimal charts based on mathematical variable types.
- Deliver interactive spatial mapping with dynamic color and size dimensions using Plotly.

---

## Features

- **Dynamic CSV Ingestion:** Ingests any CSV dataset via `st.file_uploader()`, dynamically sensing file encoding (`utf-8`, `latin-1`, `cp1252`), delimiter format, byte size, and column topology.
- **Automated Data Profiling:** Computes row counts, column counts, memory footprint, data type distributions, cardinality ratios, and identifier uniqueness automatically.
- **Data Quality Diagnostic Audit:** Dynamically identifies missing value counts and percentages, duplicate rows, duplicate identifiers, negative domain values (e.g., invalid ages), and casing inconsistencies.
- **Interactive Cleaning Pipeline:** User-toggleable operations to remove duplicates, strip whitespace, standardize column names to `snake_case`, normalize casing, safely parse datetimes, and coerce negative values, featuring real-time before-and-after audit metrics.
- **Univariate Numeric Analysis:** Computes mean, median, standard deviation, minimum, maximum, quartiles (Q1, Q3), IQR, and skewness, paired with distribution histograms and boxplots.
- **Statistical Outlier Detection:** Implements IQR fences ($\text{Lower} = Q_1 - 1.5 \times \text{IQR}$, $\text{Upper} = Q_3 + 1.5 \times \text{IQR}$) with outlier counts and visual boundary thresholds.
- **Categorical Frequency Breakdown:** Calculates value counts, percentages, and cumulative proportions with adjustable Top-N horizontal bar charts.
- **Temporal Trend Analysis:** Automatically parses datetime fields to plot registration and encounter volumes over monthly and yearly intervals.
- **Automated Relationship Explorer:** Automatically evaluates the data types of user-selected X and Y variables to route to the mathematically appropriate chart:
  - *Numeric × Numeric* $\rightarrow$ Scatter Plot with trendline
  - *Categorical × Numeric* $\rightarrow$ Box Plot
  - *Numeric × Categorical* $\rightarrow$ Horizontal Box Plot
  - *Categorical × Categorical* $\rightarrow$ Grouped / Stacked Bar Chart
  - *Datetime × Numeric* $\rightarrow$ Time-Series Line Chart
- **Domain Healthcare Demographics:** Identifies demographic fields using flexible fuzzy matching to evaluate age cohorts, gender composition, race/ethnicity, and linguistic diversity.
- **Insurance & Payer Mix Analysis:** Evaluates coverage distribution, payer shares, and cross-tabulations across age groups, gender, and clinical facilities.
- **Interactive Geographic Mapping:** Renders patient and facility coordinates on a zoomable, pan-enabled OpenStreetMap layer, allowing dynamic selection of color, size, and tooltip dimensions.
- **Global Reactive Filtering:** Sidebar categorical multiselects and numeric range sliders dynamically update all downstream pages and KPIs.
- **Cleaned Data Export:** Allows users to download the cleaned, filtered dataset as a CSV file.

---

## Technology Stack

- **Language:** Python 3.10+
- **Application Framework:** Streamlit
- **Data Manipulation:** Pandas, NumPy
- **Interactive Visualization:** Plotly (Plotly Express & Graph Objects)

---

## Project Structure

```text
CookCountyHealth/
│
├── app.py                      # Main Streamlit entrypoint & global filter controller
├── generate_sample_data.py     # Data generation script for testing
├── requirements.txt            # Project dependencies
├── README.md                   # Project documentation
├── .gitignore                  # Git ignore rules
│
├── data/
│   └── sample_data.csv         # Healthcare cohort dataset for immediate testing
│
├── src/
│   ├── __init__.py             # Package initializer
│   ├── data_loader.py          # Resilient CSV ingestion & encoding handler
│   ├── data_profiler.py        # Automated profiling & quality diagnostic audit
│   ├── data_cleaner.py         # Modular cleaning pipeline with audit tracking
│   ├── analysis.py             # Descriptive statistics, IQR outliers, correlations
│   ├── visualizations.py       # Plotly chart generators & type-based router
│   └── utils.py                # Type detection, formatting, domain field matchers
│
└── pages/
    ├── 01_Data_Overview.py     # Ingestion metadata, schema inventory, raw preview
    ├── 02_Data_Quality.py      # Missingness matrix, anomalies, cleaning controls
    ├── 03_EDA.py               # Numeric, categorical, temporal, correlation, relationships
    ├── 04_Demographics.py      # Age cohorts, gender, race/ethnicity, language
    ├── 05_Insurance.py         # Payer mix, age x insurance, facility distributions
    └── 06_Geography.py         # Interactive GIS map, community area aggregations
```

---

## EDA Workflow

I structured the application to reflect the standard data analysis lifecycle:

1. **Ingest:** Upload a CSV file through Streamlit or load the reference Cook County dataset.
2. **Profile:** Extract structural attributes (dimensions, dtypes, memory, cardinality) without manual configuration.
3. **Audit Quality:** Scan every column for missingness percentages, duplicate records, identifier collisions, and data anomalies.
4. **Clean:** Selectively execute cleaning steps (whitespace stripping, column standardization, casing normalization, datetime conversion) and review before-and-after deltas.
5. **Explore:** Analyze univariate distributions, detect statistical outliers using IQR fences, and evaluate correlations.
6. **Analyze Relationships:** Inspect bivariate pairings through automated chart routing.
7. **Examine Demographics & Insurance:** Analyze healthcare-specific segments when demographic fields are identified.
8. **Map Geography:** Visualize spatial patient distribution using interactive latitude/longitude maps.
9. **Filter & Export:** Interactively slice the dataset using global filters and download the refined dataset.

---

## Key Technical Features & Design Choices

### 1. Dynamic Execution
I made it a strict architectural requirement that analytical conclusions, counts, categories, or percentages are dynamic and based on the user-provided data. Every metric is computed at runtime from the active DataFrame. If a user uploads a dataset with 50 rows or 50,000 rows, the application recalculates all summaries automatically.

### 2. Flexible Healthcare Field Matching
Rather than requiring exact column names like `Patient_Age` or `Insurance_Type`, I built a regex-based matcher in `src/utils.py` that recognizes common naming variations (e.g., `age`, `patient_age`, `age_years`, `payer`, `coverage`, `plan`). If a specific column type is absent, the application gracefully informs the user without throwing exceptions or crashing.

### 3. Automated Visualization Routing
In the Relationship Explorer (`pages/03_EDA.py`), I developed a routing engine that inspects the datatypes of the selected X and Y variables and automatically selects the appropriate chart type.

### 4. Interactive GIS Mapping
I implemented mapping using Plotly's `scatter_mapbox` with Carto-Positron tiles, avoiding external proprietary map API tokens. Users can dynamically configure marker color and marker size from any detected column.

---
## Application Live Link
https://cookcountyhealth.vercel.app/

## Running Locally

To run the application on your local machine:

### 1. Clone the repository
```bash
git clone https://github.com/your-username/CookCountyHealth.git
cd CookCountyHealth
```

### 2. Set up a virtual environment (recommended)
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Launch the application
```bash
streamlit run app.py
```

The application will open in your default browser at `http://localhost:8501`.

---

## What I Demonstrated

In this project, I demonstrated my ability to:
- **Ingest diverse data formats:** Build resilient file readers that handle varying encodings, delimiters, and file sizes.
- **Assess data quality systematically:** Identify missingness patterns, casing discrepancies, duplicate keys, and out-of-range values.
- **Implement data cleaning pipelines:** Program programmatic transformations with before-and-after audit tracking.
- **Conduct exploratory data analysis:** Compute descriptive statistics, percentiles, IQR outlier boundaries, and correlation matrices.
- **Design data visualizations:** Create interactive, publication-grade Plotly charts tailored to data types.
- **Build modular Python architectures:** Separate concerns cleanly across loader, profiler, cleaner, analysis, visualization, and UI modules.
- **Create interactive web applications:** Use Streamlit session state, caching, multiselect filters, sliders, and tabs to deliver a responsive user experience.
- **Analyze healthcare domains:** Interpret patient demographic distributions, age cohorting, and payer mix dynamics.

---

## Limitations

- **Browser Memory Constraints:** While the application handles datasets of tens of thousands of rows smoothly, uploading exceptionally large files (>500,000 rows) directly into browser memory may cause rendering latency in Plotly charts unless downsampling is applied.
- **Bivariate Correlation:** The correlation engine currently focuses on Pearson correlation for numerical variables; non-linear associations and categorical association metrics (such as Cramér's V) are not yet integrated into the automated matrix.
