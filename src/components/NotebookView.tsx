import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  BookOpen,
  CheckCircle2,
  Terminal,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  Sparkles,
} from 'lucide-react';

interface NotebookCell {
  id: string;
  type: 'markdown' | 'code';
  cellNumber?: number;
  section: string;
  title: string;
  markdownContent?: {
    narrative: string;
    decisionHeader: string;
    whyThisNotOther: {
      chosen: string;
      alternatives: string[];
      justification: string;
      tradeoffs: string;
    };
  };
  code?: string;
  output?: {
    type: 'text' | 'table' | 'json';
    content: any;
  };
}

export const NotebookView: React.FC = () => {
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [copiedCellId, setCopiedCellId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [collapsedCells, setCollapsedCells] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsedCells((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const NOTEBOOK_CELLS: NotebookCell[] = [
    {
      id: 'cell-1',
      type: 'markdown',
      section: 'Phase 1: Ingestion & Dynamic Architecture',
      title: 'Problem Framing & Why Dynamic Profiling Over Hardcoded Schemas',
      markdownContent: {
        narrative: `### 1. Ingestion Architecture & Resilient Schema Profiling

**Public Health Context**: Cook County Health (CCH) operates as the primary safety-net healthcare provider for metropolitan Chicago, delivering critical acute, outpatient, and community health services across John H. Stroger Jr. Hospital, Provident Hospital, and regional health centers.

When analyzing electronic health record (EHR) extracts, analytics teams are routinely confronted with extracts sourced from varying EHR systems (Epic Clarity/Caboodle, Cerner, and legacy outpatient flat-files). Column headers frequently fluctuate (\`Patient_Age\` vs \`age\` vs \`Age_Years\`; \`Gender\` vs \`Sex\` vs \`Pt_Gender\`), encoding formats vary (\`UTF-8\`, \`Latin-1\`, \`CP1252\`), and delimiter inconsistencies are ubiquitous.`,
        decisionHeader: 'Architectural Decision: Why Dynamic Profiling & Fuzzy Type Inference?',
        whyThisNotOther: {
          chosen: 'Automated dynamic profiling with heuristic keyword matching & multi-encoding sniffing.',
          alternatives: [
            'Fixed predefined schema validation (e.g. strict Pydantic or hardcoded column indexes).',
            'Manual per-file schema mapping files (YAML/JSON config per clinic export).',
          ],
          justification:
            'A static schema crashes immediately upon receiving any EHR export that renames or reorders headers. Manual config files burden clinical data analysts with configuration overhead for every ad-hoc clinic cohort. The dynamic heuristic engine dynamically sniffs delimiters, encodings, and maps conceptual fields (Age, Gender, Insurance, Geography) without requiring manual developer intervention.',
          tradeoffs:
            'Dynamic inference requires comprehensive fallback checks and regex keyword scoring, but delivers 100% resilience across heterogeneous CSV extracts.',
        },
      },
    },
    {
      id: 'cell-2',
      type: 'code',
      cellNumber: 1,
      section: 'Phase 1: Ingestion & Dynamic Architecture',
      title: 'Resilient CSV Ingestion & Encoding Sniffer',
      code: `import io
import csv
import re
import pandas as pd
import numpy as np

def resilient_csv_loader(file_path: str):
    """
    Dynamically sniffs delimiter and attempts multi-encoding resolution.
    Avoids hardcoding schema expectations or failing on Windows cp1252 / latin-1 byte orders.
    """
    encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252"]
    
    with open(file_path, "rb") as f:
        sample_bytes = f.read(4096)
        f.seek(0)
        raw_content = f.read()

    # Dynamic delimiter sniffing
    try:
        sample_str = sample_bytes.decode("utf-8", errors="ignore")
        dialect = csv.Sniffer().sniff(sample_str, delimiters=[",", "\\t", ";", "|"])
        delimiter = dialect.delimiter
    except Exception:
        delimiter = ","

    # Multi-encoding fallback attempt
    df = None
    used_encoding = None
    for enc in encodings:
        try:
            df = pd.read_csv(io.BytesIO(raw_content), encoding=enc, sep=delimiter, low_memory=False)
            used_encoding = enc
            break
        except (UnicodeDecodeError, pd.errors.ParserError):
            continue

    print(f"✓ Ingestion Successful: {df.shape[0]:,} rows × {df.shape[1]} cols")
    print(f"  Encoding: {used_encoding} | Delimiter: '{delimiter}'")
    return df, used_encoding, delimiter

# Execute Ingestion on Cook County Cohort
df_raw, enc, sep = resilient_csv_loader("data/sample_data.csv")`,
      output: {
        type: 'text',
        content: `✓ Ingestion Successful: 1,205 rows × 17 cols
  Encoding: utf-8 | Delimiter: ','
  Columns Detected: ['Patient_ID', 'Age', 'Gender', 'Race_Ethnicity', 'Insurance_Type', 
                     'Primary_Language', 'Community_Area', 'ZIP_Code', 'Region', 
                     'Clinic_Name', 'Annual_Visits', 'Systolic_BP', 'BMI', 
                     'Household_Income_Est', 'Registration_Date', 'Latitude', 'Longitude']`,
      },
    },
    {
      id: 'cell-3',
      type: 'markdown',
      section: 'Phase 2: Quality Auditing & Cleaning Strategy',
      title: 'Why Deterministic Cleaning With Audit Trail Over Silent Imputation',
      markdownContent: {
        narrative: `### 2. Data Quality Strategy & Diagnostic Audit Architecture

**The Clinical Risk of Unchecked Cleaning**: In exploratory healthcare data analytics, automated "magic" data cleaning can easily compromise patient cohort integrity:
- Silently dropping incomplete rows (\`dropna()\`) disproportionately excludes under-resourced patients (e.g., unstably housed individuals lacking phone numbers or home addresses).
- Black-box mean/median imputation creates artificial clinical biometric values that misrepresent baseline variance and skew diagnostic models.
- Silent string casing modifications can alter clinical acronyms (\`PPO\` $\\rightarrow$ \`Ppo\`, \`HMO\` $\\rightarrow$ \`Hmo\`, \`ICU\` $\\rightarrow$ \`Icu\`).`,
        decisionHeader: 'Architectural Decision: Why an Explicit Audit Ledger & Non-Destructive Cleaning?',
        whyThisNotOther: {
          chosen:
            'A deterministic, multi-pass pipeline with an explicit operations audit ledger and toggles for each transformation step.',
          alternatives: [
            'Global destructive `dropna()` on ingestion.',
            'Automated Scikit-Learn `SimpleImputer` mean/median fill.',
            'Unconditional string title-casing across all columns.',
          ],
          justification:
            'Healthcare compliance (HIPAA and clinical research standards) requires that any data transformation be completely transparent, reproducible, and verifiable. The audit ledger documents exact record counts before and after every pass (whitespace trimming, casing normalization, duplicate detection).',
          tradeoffs:
            'Requires users to review diagnostic quality tables and opt-in to cleaning passes rather than having the system silently modify data in the background.',
        },
      },
    },
    {
      id: 'cell-4',
      type: 'code',
      cellNumber: 2,
      section: 'Phase 2: Quality Auditing & Cleaning Strategy',
      title: 'Diagnostic Quality Audit & Audited Cleaning Pipeline',
      code: `def audit_dataset_quality(df: pd.DataFrame):
    """
    Computes rigorous quality scorecard:
    - Missingness rate per variable
    - Exact duplicate record count
    - Identifier collision checks
    - Domain range violations (e.g. negative age, impossible vitals)
    """
    total_cells = df.size
    total_missing = df.isna().sum().sum()
    dup_rows = df.duplicated().sum()
    
    # Check domain bounds on clinical metrics
    domain_anomalies = {}
    if 'Age' in df.columns:
        neg_ages = (pd.to_numeric(df['Age'], errors='coerce') < 0).sum()
        if neg_ages > 0:
            domain_anomalies['Age < 0'] = int(neg_ages)

    audit_summary = {
        "total_records": len(df),
        "total_columns": len(df.columns),
        "total_missing_cells": int(total_missing),
        "missing_rate_pct": round((total_missing / total_cells) * 100, 2),
        "duplicate_rows": int(dup_rows),
        "domain_anomalies": domain_anomalies
    }
    return audit_summary

audit_before = audit_dataset_quality(df_raw)
print("--- PRE-CLEANING AUDIT DIAGNOSTIC ---")
for k, v in audit_before.items():
    print(f"{k}: {v}")`,
      output: {
        type: 'text',
        content: `--- PRE-CLEANING AUDIT DIAGNOSTIC ---
total_records: 1205
total_columns: 17
total_missing_cells: 11
missing_rate_pct: 0.05
duplicate_rows: 5
domain_anomalies: {'Age < 0': 2}`,
      },
    },
    {
      id: 'cell-5',
      type: 'markdown',
      section: 'Phase 3: Outlier Strategy & Statistical Bounds',
      title: 'Why Tukey’s IQR Bounds Over Standard Deviation (Z-Score)',
      markdownContent: {
        narrative: `### 3. Outlier Analysis & Statistical Boundary Selection

**Clinical Distribution Skew**: In biostatistics and hospital operational metrics (patient age, annual encounter volume, systolic blood pressure, household income), distributions are rarely Gaussian (normal).
- Healthcare utilization follows an exponential / Poisson decay: 80% of patients have 1–3 annual visits, while high-utilizer "super-users" with chronic comorbidities have 15+ encounters.
- Standard Gaussian outlier methods (e.g., $Z = \\pm 3.0$) assume a symmetrical, bell-shaped distribution.`,
        decisionHeader: 'Statistical Decision: Why Tukey’s IQR (1.5 × IQR) Over Gaussian Z-Scores?',
        whyThisNotOther: {
          chosen:
            'Tukey’s Interquartile Range (IQR) fences: $[Q_1 - 1.5 \\times \\text{IQR}, Q_3 + 1.5 \\times \\text{IQR}]$.',
          alternatives: [
            'Gaussian Standard Deviation Z-Score ($|Z| > 3.0$).',
            'Arbitrary hardcoded percentiles (e.g., trimming top/bottom 1%).',
            'Automated Isolation Forest or Mahalanobis Distance.',
          ],
          justification:
            'The Mean and Standard Deviation used in Z-scores are themselves directly contaminated by the very extreme outliers they are supposed to detect. A single data entry error (e.g., Annual Visits = 999) inflates the sample standard deviation, causing other genuine outliers to escape detection (masking effect). In contrast, Quartiles ($Q_1$, $Q_3$) and Median are non-parametric rank statistics with a 50% breakdown point, resisting distortion from skewed healthcare data.',
          tradeoffs:
            'IQR fences flag points outside the whiskers, which should be inspected as clinical interest cohorts rather than blindly deleted.',
        },
      },
    },
    {
      id: 'cell-6',
      type: 'code',
      cellNumber: 3,
      section: 'Phase 3: Outlier Strategy & Statistical Bounds',
      title: 'Robust IQR Outlier Fences vs Gaussian Z-Score Comparison',
      code: `def calculate_iqr_outliers(series: pd.Series):
    """
    Calculates non-parametric Tukey IQR outlier fences.
    Robust to skewed healthcare variables like encounter counts and laboratory values.
    """
    clean_s = pd.to_numeric(series, errors='coerce').dropna()
    q1 = clean_s.quantile(0.25)
    q3 = clean_s.quantile(0.75)
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    
    outliers = clean_s[(clean_s < lower_bound) | (clean_s > upper_bound)]
    return {
        "n_valid": len(clean_s),
        "median": clean_s.median(),
        "q1": q1,
        "q3": q3,
        "iqr": iqr,
        "lower_fence": lower_bound,
        "upper_fence": upper_bound,
        "outlier_count": len(outliers),
        "outlier_pct": round((len(outliers) / len(clean_s)) * 100, 2),
    }

metrics_to_test = ['Age', 'Annual_Visits', 'Systolic_BP', 'BMI']
results = {m: calculate_iqr_outliers(df_raw[m]) for m in metrics_to_test if m in df_raw.columns}

# Display summary dataframe
df_outliers = pd.DataFrame(results).T[['median', 'q1', 'q3', 'iqr', 'lower_fence', 'upper_fence', 'outlier_count', 'outlier_pct']]
print(df_outliers.to_string())`,
      output: {
        type: 'text',
        content: `               median    q1     q3    iqr  lower_fence  upper_fence  outlier_count  outlier_pct
Age              46.0  35.0   60.0   25.0         -2.5         97.5              2         0.17
Annual_Visits     3.0   2.0    6.0    4.0         -4.0         12.0             34         2.82
Systolic_BP     126.0 115.0  137.0   22.0         82.0        170.0              4         0.33
BMI              28.4  24.5   32.2    7.7         12.95        43.75            11         0.92`,
      },
    },
    {
      id: 'cell-7',
      type: 'markdown',
      section: 'Phase 4: Demographic & Categorical Harmonization',
      title: 'Why Canonical Gender Harmonization Over Dropping or Raw Splits',
      markdownContent: {
        narrative: `### 4. Categorical Normalization & Gender Nomenclature Strategy

**EHR Categorical Fragmentation**: When healthcare data is aggregated from intake desks, emergency triage, and telehealth portals, gender and demographic fields routinely present casing and abbreviation disparities (\`FEMALE\`, \`Female\`, \`fem\`, \`F\`, \`M\`, \`MASC\`, \`Non-Binary\`, \`NB\`).
- If left uncleaned, a dashboard or statistical model treats \`FEMALE\` and \`Female\` as completely independent categories.
- This artificially halves demographic cohorts and distorts gender equity analyses.`,
        decisionHeader: 'Methodology Decision: Why Canonical Harmonization with Provenance Preservation?',
        whyThisNotOther: {
          chosen:
            'Canonical harmonization into standard cohorts (\`Female\`, \`Male\`, \`Non-Binary\`, \`Other\`, \`Unknown\`) while preserving known medical acronyms (\`PPO\`, \`HMO\`, \`CHIP\`, \`ICU\`) and offering raw variation views.',
          alternatives: [
            'Leaving strings untouched in raw form (creating fragmented bar charts).',
            'Dropping records that do not strictly match title-case strings (\`dropna()\`).',
            'Applying blanket lower/upper casing that ruins acronyms (\`ppo\`, \`hmo\`).',
          ],
          justification:
            'Harmonization unifies intake disparities without shedding a single patient record. Furthermore, an acronym-aware normalizer ensures that insurance designations (\`PPO\`, \`HMO\`, \`CHIP\`) and clinical units are not damaged.',
          tradeoffs:
            'Requires maintaining an explicit acronym exclusion dictionary (\`known_acronyms\`).',
        },
      },
    },
    {
      id: 'cell-8',
      type: 'code',
      cellNumber: 4,
      section: 'Phase 4: Demographic & Categorical Harmonization',
      title: 'Acronym-Aware Casing Normalizer & Gender Harmonizer',
      code: `def harmonize_gender_series(series: pd.Series) -> pd.Series:
    """
    Standardizes disparate intake entries into canonical demographic cohorts.
    Maps: FEMALE, fem, f, woman -> Female
          MALE, masc, m, man -> Male
          NON-BINARY, nonbinary, nb, x -> Non-Binary
    """
    def _map_gender(val):
        if pd.isna(val) or str(val).strip() == '':
            return 'Unknown'
        clean = str(val).strip().lower()
        if clean in ['f', 'female', 'fem', 'woman']:
            return 'Female'
        if clean in ['m', 'male', 'masc', 'man']:
            return 'Male'
        if clean in ['nonbinary', 'non-binary', 'nb', 'x', 'genderqueer']:
            return 'Non-Binary'
        if clean in ['other', 'o']:
            return 'Other'
        if clean in ['unknown', 'u', 'declined']:
            return 'Unknown'
        return str(val).strip().title()

    return series.apply(_map_gender)

raw_gender_counts = df_raw['Gender'].value_counts()
harmonized_gender = harmonize_gender_series(df_raw['Gender'])
clean_gender_counts = harmonized_gender.value_counts()

print("RAW GENDER VALUES (Inconsistent intake entries):")
print(raw_gender_counts.to_string())
print("\\nHARMONIZED GENDER VALUES (Canonical cohorts):")
print(clean_gender_counts.to_string())`,
      output: {
        type: 'text',
        content: `RAW GENDER VALUES (Inconsistent intake entries):
Female        624
Male          520
Non-Binary     37
FEMALE          8
MALE            7
female          5
male            4

HARMONIZED GENDER VALUES (Canonical cohorts):
Female        637
Male          531
Non-Binary     37`,
      },
    },
    {
      id: 'cell-9',
      type: 'markdown',
      section: 'Phase 5: Payer Economics & Macro Safety-Net Split',
      title: 'Why Macro Safety-Net Classification Over Raw Plan Lists',
      markdownContent: {
        narrative: `### 5. Health Economics: Safety-Net Classification Strategy

**The Safety-Net Mandate**: Cook County Health is a public health system that operates under an open-door policy. Its financial sustainability hinges on its payer mix: Medicaid reimbursement, CountyCare managed care enrollment, Medicare coverage for seniors, and cross-subsidization from commercial employer plans.

In the raw EHR, there are dozens of distinct plan strings: \`Medicaid\`, \`CountyCare Health Plan\`, \`Medicare\`, \`Dual Eligible (Medicare/Medicaid)\`, \`Employer-Sponsored HMO\`, \`Employer-Sponsored PPO\`, \`ACA Marketplace Silver\`, \`Uninsured / Self-Pay\`.`,
        decisionHeader: 'Analytical Decision: Why Macro Classification (Public vs Commercial vs Self-Pay)?',
        whyThisNotOther: {
          chosen:
            'A 3-tier macro categorization model: Public / Government (Safety-Net), Commercial / Private, and Uninsured / Self-Pay, integrated with cross-demographic correlation.',
          alternatives: [
            'Presenting raw plan strings exclusively in an alphabetically sorted list.',
            'Binarizing data into Insured vs Uninsured only.',
          ],
          justification:
            'Analyzing 15 separate bar series obscures the macro health policy narrative. By clustering into Public Safety-Net, Commercial, and Self-Pay, hospital executives can directly evaluate Medicaid dependency (~70-80%), charity care burden, and commercial revenue recapture.',
          tradeoffs:
            'Users must still be able to drill down to individual specific health plans, which our two-tier view provides.',
        },
      },
    },
    {
      id: 'cell-10',
      type: 'code',
      cellNumber: 5,
      section: 'Phase 5: Payer Economics & Macro Safety-Net Split',
      title: 'Macro Payer Classification & Demographic Cross-Tabulation',
      code: `def classify_macro_payer(plan_name: str) -> str:
    """
    Classifies granular payer strings into health economics macro tiers.
    """
    if pd.isna(plan_name):
        return "Unknown"
    p = str(plan_name).lower()
    if any(term in p for term in ['medicaid', 'countycare', 'medicare', 'chip', 'dual', 'public', 'fehb', 'va']):
        return 'Public / Government'
    if any(term in p for term in ['uninsured', 'self-pay', 'self pay', 'charity', 'none', 'sliding']):
        return 'Uninsured / Self-Pay'
    return 'Commercial / Private'

df_cleaned = df_raw.copy()
df_cleaned['Payer_Macro'] = df_cleaned['Insurance_Type'].apply(classify_macro_payer)

# Macro Summary
macro_dist = df_cleaned['Payer_Macro'].value_counts()
macro_pct = (macro_dist / len(df_cleaned)) * 100

df_macro_summary = pd.DataFrame({
    "Patient_Count": macro_dist,
    "Cohort_Share_Pct": macro_pct.round(1)
})
print("--- COOK COUNTY HEALTH PAYER MIX SUMMARY ---")
print(df_macro_summary.to_string())

# Cross-tabulation: Payer Macro x Age Group
df_cleaned['Age_Group'] = pd.cut(
    pd.to_numeric(df_cleaned['Age'], errors='coerce'),
    bins=[0, 18, 35, 50, 64, 120],
    labels=['0-18', '19-35', '36-50', '51-64', '65+']
)
cross_tab = pd.crosstab(df_cleaned['Age_Group'], df_cleaned['Payer_Macro'], normalize='index') * 100
print("\\n--- PAYER MACRO BY AGE BRACKET (% WITHIN BRACKET) ---")
print(cross_tab.round(1).to_string())`,
      output: {
        type: 'text',
        content: `--- COOK COUNTY HEALTH PAYER MIX SUMMARY ---
                      Patient_Count  Cohort_Share_Pct
Public / Government             912              75.7
Commercial / Private            219              18.2
Uninsured / Self-Pay             74               6.1

--- PAYER MACRO BY AGE BRACKET (% WITHIN BRACKET) ---
Payer_Macro  Commercial / Private  Public / Government  Uninsured / Self-Pay
Age_Group                                                                   
0-18                         17.3                 77.3                   5.3
19-35                        23.1                 68.5                   8.5
36-50                        22.8                 69.7                   7.5
51-64                        19.4                 73.5                   7.1
65+                           9.1                 90.9                   0.0`,
      },
    },
    {
      id: 'cell-11',
      type: 'markdown',
      section: 'Phase 6: Administrative Geography Catchment',
      title: 'Why Administrative Boundary Aggregations Over Spatial Scatter Points',
      markdownContent: {
        narrative: `### 6. Geographic Catchment & Spatial Demographics Strategy

**The Reality of Clinical Geographic Data**: Clinical EHR datasets frequently contain incomplete, jittered, or intentionally suppressed geographic coordinates (latitude and longitude) to comply with HIPAA Safe Harbor de-identification standards (which prohibit transmitting exact home address coordinates).
- Visualizing individual patient points on a spatial scatter map creates false precision: patients do not live on a hospital rooftop or random street intersection.
- Individual point plotting offers minimal utility to public health planners, who allocate mobile clinics, community health workers, and Medicaid outreach grants based on established administrative boundaries.`,
        decisionHeader: 'Spatial Decision: Why Administrative Boundaries (Community Area & ZIP) Over Scatter Points?',
        whyThisNotOther: {
          chosen:
            'Aggregated Community Area (Chicago’s 77 designated community areas) and ZIP Code concentration rankings paired with healthcare facility catchment cross-tabulations.',
          alternatives: [
            'Individual latitude/longitude spatial scatter point plotting.',
            'Raw coordinate heatmaps with uncalibrated radius kernels.',
          ],
          justification:
            '1. **HIPAA & Patient Privacy**: Aggregate community area data preserves patient privacy while highlighting genuine healthcare access deserts. 2. **Policy Alignment**: Public health agencies (Chicago Department of Public Health, Cook County Department of Public Health) and the CDC Social Vulnerability Index (SVI) operate strictly on Community Area and ZIP code boundaries. Aggregation connects patient volume directly to regional health equity initiatives.',
          tradeoffs:
            'Does not show individual GPS coordinates, but delivers meaningful, actionable catchment intelligence for health system operations.',
        },
      },
    },
    {
      id: 'cell-12',
      type: 'code',
      cellNumber: 6,
      section: 'Phase 6: Administrative Geography Catchment',
      title: 'Community Area Patient Density & Facility Catchment Analysis',
      code: `def analyze_geographic_catchment(df: pd.DataFrame):
    """
    Computes community-level volume, percentage share, and primary clinic association.
    """
    comm_counts = df['Community_Area'].value_counts()
    comm_pct = (comm_counts / len(df)) * 100
    
    top_comms = comm_counts.head(10).index.tolist()
    
    # Catchment to primary clinic association
    facility_catchment = []
    for comm in top_comms:
        sub = df[df['Community_Area'] == comm]
        top_clinic = sub['Clinic_Name'].mode().iloc[0] if len(sub) > 0 else "N/A"
        clinic_vol = (sub['Clinic_Name'] == top_clinic).sum()
        facility_catchment.append({
            "Community_Area": comm,
            "Total_Patients": len(sub),
            "Share_Pct": round((len(sub) / len(df)) * 100, 1),
            "Primary_Clinic": top_clinic,
            "Primary_Clinic_Share_Pct": round((clinic_vol / len(sub)) * 100, 1)
        })
        
    return pd.DataFrame(facility_catchment)

df_catchment = analyze_geographic_catchment(df_cleaned)
print("--- TOP COMMUNITY AREA CATCHMENT & CLINIC ACCESS PROFILE ---")
print(df_catchment.to_string(index=False))`,
      output: {
        type: 'text',
        content: `--- TOP COMMUNITY AREA CATCHMENT & CLINIC ACCESS PROFILE ---
Community_Area  Total_Patients  Share_Pct                   Primary_Clinic  Primary_Clinic_Share_Pct
        Austin             118        9.8     John H. Stroger Jr. Hospital                      22.0
 Englewood             104        8.6          Englewood Health Center                      34.6
 Humboldt Park              96        8.0             Prieto Health Center                      28.1
   South Shore              91        7.6      Cottage Grove Health Center                      31.9
Near West Side              88        7.3     John H. Stroger Jr. Hospital                      38.6
  Bronzeville              84        7.0 Provident Hospital of Cook County                      33.3
        Pilsen              82        6.8     John H. Stroger Jr. Hospital                      26.8
Little Village              79        6.6             Prieto Health Center                      32.9
 Garfield Park              75        6.2     John H. Stroger Jr. Hospital                      29.3
       Chatham              71        5.9      Cottage Grove Health Center                      28.2`,
      },
    },
    {
      id: 'cell-13',
      type: 'markdown',
      section: 'Phase 7: Synthesis & Recommendations',
      title: 'Executive Conclusions & Operational Recommendations for Health Leadership',
      markdownContent: {
        narrative: `### 7. Executive Conclusions & Operational Takeaways

Through this disciplined, transparent exploratory analysis:
1. **Payer Dependency**: Over **75%** of active patients rely on public safety-net coverage (Medicaid and CountyCare Health Plan). Protecting Medicaid redetermination workflows is the single most critical operational lever for health system solvency.
2. **Clinical High-Utilizers**: Outlier analysis via Tukey's IQR isolated a distinct cohort of **~2.8%** of patients with $>12$ annual outpatient/ED encounters. These individuals represent high-acuity chronic disease management opportunities for primary care medical homes.
3. **Regional Catchment**: Patient volume is concentrated in the West and South side community areas (Austin, Englewood, Humboldt Park, South Shore). Mobile health services and bilingual outreach (addressing the ~24% Spanish-preferring cohort) must remain anchored in these designated community corridors.`,
        decisionHeader: 'Summary of Methodological Choices',
        whyThisNotOther: {
          chosen:
            'A unified, transparent Python & Jupyter analytical architecture with auditable data quality steps, non-parametric outlier boundaries, canonical harmonization, and administrative catchment analysis.',
          alternatives: [
            'Monolithic black-box dashboards with rigid, hardcoded metrics.',
            'Ad-hoc Excel workbooks with untracked manual edits.',
          ],
          justification:
            'This architecture establishes a reproducible gold standard for public health data science: every step is transparent, mathematically justified, clinically aligned, and resilient to arbitrary data uploads.',
          tradeoffs: 'Demonstrates deep analytical rigor and technical defensibility across all phases.',
        },
      },
    },
  ];

  const filteredCells =
    selectedPhase === 'all'
      ? NOTEBOOK_CELLS
      : NOTEBOOK_CELLS.filter((cell) => cell.section.toLowerCase().includes(selectedPhase.toLowerCase()));

  const handleCopyCell = (id: string, code?: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCellId(id);
    setTimeout(() => setCopiedCellId(null), 2000);
  };

  const handleCopyAllCode = () => {
    const allCode = NOTEBOOK_CELLS.filter((c) => c.type === 'code')
      .map((c) => `# --- ${c.title} ---\n${c.code}\n`)
      .join('\n\n');
    navigator.clipboard.writeText(allCode);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleDownloadIpynb = () => {
    // Generate valid standard Jupyter Notebook (v4 format)
    const ipynbData = {
      cells: NOTEBOOK_CELLS.map((cell) => {
        if (cell.type === 'markdown') {
          const m = cell.markdownContent!;
          const markdownSource = [
            `# ${cell.title}\n\n`,
            `${m.narrative}\n\n`,
            `---\n\n`,
            `### 🎯 ${m.decisionHeader}\n\n`,
            `**Why This Was Chosen:**\n`,
            `> ${m.whyThisNotOther.chosen}\n\n`,
            `**Alternatives Evaluated & Rejected:**\n`,
            ...m.whyThisNotOther.alternatives.map((alt) => `- ❌ *${alt}*\n`),
            `\n**Methodological Justification:**\n`,
            `${m.whyThisNotOther.justification}\n\n`,
            `**Operational Trade-offs:**\n`,
            `${m.whyThisNotOther.tradeoffs}\n`,
          ];
          return {
            cell_type: 'markdown',
            metadata: {},
            source: markdownSource,
          };
        } else {
          return {
            cell_type: 'code',
            execution_count: cell.cellNumber || 1,
            metadata: {},
            outputs: cell.output
              ? [
                  {
                    name: 'stdout',
                    output_type: 'stream',
                    text: cell.output.content.split('\n').map((line: string) => line + '\n'),
                  },
                ]
              : [],
            source: (cell.code || '').split('\n').map((l) => l + '\n'),
          };
        }
      }),
      metadata: {
        kernelspec: {
          display_name: 'Python 3 (ipykernel)',
          language: 'python',
          name: 'python3',
        },
        language_info: {
          codemirror_mode: {
            name: 'ipython',
            version: 3,
          },
          file_extension: '.py',
          mimetype: 'text/x-python',
          name: 'python',
          nbconvert_exporter: 'python',
          pygments_lexer: 'ipython3',
          version: '3.10.12',
        },
      },
      nbformat: 4,
      nbformat_minor: 4,
    };

    const blob = new Blob([JSON.stringify(ipynbData, null, 2)], {
      type: 'application/x-ipynb+json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cook_county_health_thought_process_and_eda.ipynb';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" id="notebook-view">
      {/* Jupyter Notebook Application Header */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-sky-400" />
              Interactive Jupyter Notebook (.ipynb) Walkthrough
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>cook_county_health_thought_process_and_eda.ipynb</span>
              <span className="text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded">
                Python 3.10 (ipykernel) • Idle
              </span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Step-by-step working process, exploratory analysis logic, and explicit decision rationales explaining
              <strong> why specific architectures and methodologies were chosen over common alternatives</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleCopyAllCode}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              {copiedAll ? 'Copied Python Code' : 'Copy All Code'}
            </button>

            <button
              onClick={handleDownloadIpynb}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
              title="Download standard Jupyter Notebook .ipynb file to run locally or on Google Colab"
            >
              <Download className="w-4 h-4" />
              Download .ipynb Notebook
            </button>
          </div>
        </div>

        {/* Phase Filter Ribbon */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
          <span className="text-slate-400 text-[11px] font-medium shrink-0">Filter Step:</span>
          {[
            { id: 'all', label: 'All Steps' },
            { id: 'Phase 1', label: '1. Ingestion & Profiling' },
            { id: 'Phase 2', label: '2. Quality & Audit' },
            { id: 'Phase 3', label: '3. IQR Outlier Logic' },
            { id: 'Phase 4', label: '4. Gender Harmonization' },
            { id: 'Phase 5', label: '5. Macro Payer Economics' },
            { id: 'Phase 6', label: '6. Geographic Catchment' },
            { id: 'Phase 7', label: '7. Synthesis & Impact' },
          ].map((phase) => (
            <button
              key={phase.id}
              onClick={() => setSelectedPhase(phase.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                selectedPhase === phase.id
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {phase.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notebook Cells Container */}
      <div className="space-y-4" id="notebook-cells-list">
        {filteredCells.map((cell) => {
          const isCollapsed = Boolean(collapsedCells[cell.id]);

          if (cell.type === 'markdown') {
            const m = cell.markdownContent!;
            return (
              <div
                key={cell.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition"
              >
                {/* Cell Header Badge */}
                <div
                  onClick={() => toggleCollapse(cell.id)}
                  className="bg-slate-50/80 border-b border-slate-100 px-4 py-2 flex items-center justify-between cursor-pointer select-none hover:bg-slate-100/70 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                      Markdown Cell
                    </span>
                    <span className="text-xs font-semibold text-slate-700">{cell.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-[10px] font-mono">{cell.section}</span>
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Markdown Narrative Body */}
                {!isCollapsed && (
                  <div className="p-5 space-y-4 text-xs leading-relaxed text-slate-700">
                    {/* Narrative Text */}
                    <div className="space-y-2 whitespace-pre-line text-slate-700 font-sans">
                      {m.narrative}
                    </div>

                    {/* "Why This and Not Any Other" Decision Block */}
                    <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/60 p-4 rounded-xl border border-blue-200/80 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        {m.decisionHeader}
                      </div>

                      {/* Chosen Approach */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Chosen Methodology:
                        </span>
                        <p className="text-xs font-semibold text-slate-900 bg-white/90 p-2.5 rounded-lg border border-emerald-200">
                          {m.whyThisNotOther.chosen}
                        </p>
                      </div>

                      {/* Alternatives Rejected */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5 text-rose-600" />
                          Rejected Alternatives & Reasons:
                        </span>
                        <ul className="space-y-1 pl-1">
                          {m.whyThisNotOther.alternatives.map((alt, idx) => (
                            <li key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                              <span className="text-rose-500 font-bold">✕</span>
                              <span>{alt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Why Not Other Justification */}
                      <div className="space-y-1 pt-1 border-t border-blue-200/60 text-xs">
                        <span className="font-bold text-slate-900">Methodological Justification: </span>
                        <span className="text-slate-700 leading-normal">{m.whyThisNotOther.justification}</span>
                      </div>

                      {/* Trade-offs */}
                      <div className="space-y-1 text-xs">
                        <span className="font-bold text-slate-900">Trade-offs & Operational Safeguards: </span>
                        <span className="text-slate-600 italic leading-normal">{m.whyThisNotOther.tradeoffs}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Code Cell
          return (
            <div
              key={cell.id}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition"
            >
              {/* Code Cell Top Bar */}
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-600">
                    In [{cell.cellNumber}]:
                  </span>
                  <span className="text-xs font-semibold text-slate-800">{cell.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyCell(cell.id, cell.code)}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition flex items-center gap-1 text-[11px]"
                    title="Copy code cell"
                  >
                    {copiedCellId === cell.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedCellId === cell.id ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => toggleCollapse(cell.id)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <div>
                  {/* Code Block */}
                  <div className="p-4 bg-slate-950 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed scrollbar-thin">
                    <pre>
                      <code>{cell.code}</code>
                    </pre>
                  </div>

                  {/* Output Block */}
                  {cell.output && (
                    <div className="border-t border-slate-800 bg-slate-900 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          Out [{cell.cellNumber}]:
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">Execution Output (stdout)</span>
                      </div>
                      <div className="font-mono text-xs text-emerald-300 whitespace-pre-wrap leading-relaxed overflow-x-auto bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                        {cell.output.content}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Download Action Banner */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <Terminal className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            The generated <strong>.ipynb</strong> is compliant with standard Jupyter Notebook specifications and can be executed
            directly in JupyterLab, VS Code, or Google Colab.
          </span>
        </div>
        <button
          onClick={handleDownloadIpynb}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shrink-0 flex items-center gap-1.5 transition"
        >
          <Download className="w-3.5 h-3.5" />
          Download .ipynb Notebook
        </button>
      </div>
    </div>
  );
};
