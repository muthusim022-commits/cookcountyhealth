#!/usr/bin/env python3
"""
CookCountyHealth - Sample Data Generation Script
Generates a representative patient demographics, healthcare utilization, and insurance dataset.
Includes realistic data-quality characteristics (casing variations, whitespace, missing values, duplicates)
for demonstrating ingestion, profiling, quality auditing, and cleaning pipelines.
"""

import csv
import random
from datetime import datetime, timedelta

def generate_dataset(num_records=1200, output_path="data/sample_data.csv"):
    random.seed(42)

    community_areas = [
        ("Austin", "60644", 41.8906, -87.7640, "West"),
        ("Humboldt Park", "60651", 41.9022, -87.7020, "West"),
        ("Englewood", "60621", 41.7798, -87.6433, "South"),
        ("Near West Side", "60612", 41.8744, -87.6633, "Central"),
        ("South Shore", "60649", 41.7606, -87.5750, "South"),
        ("Bronzeville", "60653", 41.8250, -87.6180, "South"),
        ("Pilsen", "60608", 41.8562, -87.6563, "Southwest"),
        ("Little Village", "60623", 41.8458, -87.7139, "Southwest"),
        ("Albany Park", "60625", 41.9683, -87.7144, "North"),
        ("Rogers Park", "60626", 42.0094, -87.6700, "Far North"),
        ("Uptown", "60640", 41.9658, -87.6533, "Far North"),
        ("Bridgeport", "60616", 41.8364, -87.6487, "South"),
        ("Roseland", "60628", 41.7050, -87.6250, "Far South"),
        ("Chatham", "60619", 41.7410, -87.6140, "South"),
        ("Garfield Park", "60624", 41.8814, -87.7225, "West"),
    ]

    clinics = [
        "John H. Stroger Jr. Hospital",
        "Provident Hospital of Cook County",
        "Ruth M. Rothstein CORE Center",
        "Cottage Grove Health Center",
        "Englewood Health Center",
        "Near South Health Center",
        "Arlington Heights Health Center",
        "Robbins Health Center",
        "Prieto Health Center",
    ]

    insurance_types = [
        "Medicaid",
        "Medicare",
        "CountyCare Health Plan",
        "Employer-Sponsored HMO",
        "Employer-Sponsored PPO",
        "ACA Marketplace Silver",
        "Uninsured / Self-Pay",
        "Dual Eligible (Medicare/Medicaid)",
    ]

    races = [
        "Black or African American",
        "Hispanic or Latino",
        "White",
        "Asian",
        "Two or More Races",
        "Other",
    ]

    languages = ["English", "Spanish", "Cantonese", "Arabic", "Polish", "Tagalog"]

    base_start_date = datetime(2021, 1, 1)

    records = []
    
    for i in range(1, num_records + 1):
        pid = f"CCH-{i:05d}"
        
        # Age distribution
        age = int(random.gauss(47, 18))
        if age < 0:
            age = random.randint(1, 17)
        elif age > 95:
            age = 92

        # Occasional data quality edge case: negative age in 2 records to test validation
        if i in [142, 580]:
            age = -3

        gender = random.choices(["Female", "Male", "Non-Binary"], weights=[53, 44, 3])[0]
        
        # Inconsistent capitalization in a few rows for testing cleaning pipeline
        if i % 85 == 0:
            gender = gender.lower()
        elif i % 113 == 0:
            gender = gender.upper()

        comm_name, zip_code, base_lat, base_lon, region = random.choice(community_areas)
        # small jitter for coordinates
        lat = round(base_lat + random.uniform(-0.015, 0.015), 5)
        lon = round(base_lon + random.uniform(-0.015, 0.015), 5)

        # Correlate insurance somewhat realistically with age
        if age >= 65:
            ins = random.choices(["Medicare", "Dual Eligible (Medicare/Medicaid)", "CountyCare Health Plan", "Employer-Sponsored PPO"], weights=[60, 20, 10, 10])[0]
        elif age < 19:
            ins = random.choices(["Medicaid", "CountyCare Health Plan", "Employer-Sponsored HMO", "Uninsured / Self-Pay"], weights=[55, 25, 15, 5])[0]
        else:
            ins = random.choices(insurance_types, weights=[28, 5, 22, 14, 12, 11, 8, 0])[0]

        # Whitespace variations in a few rows for testing strip whitespace
        if i % 67 == 0:
            ins = f"  {ins}  "

        race = random.choices(races, weights=[38, 30, 18, 7, 4, 3])[0]
        lang = random.choices(languages, weights=[65, 24, 4, 3, 2, 2])[0]
        clinic = random.choice(clinics)

        # Registration date
        days_offset = random.randint(0, 1400)
        reg_date = (base_start_date + timedelta(days=days_offset)).strftime("%Y-%m-%d")

        # Clinical / operational metrics
        annual_visits = max(1, int(random.expovariate(0.3) + 1))
        systolic_bp = int(random.gauss(126, 16))
        bmi = round(random.gauss(28.4, 5.8), 1)
        income_est = int(max(10000, random.gauss(38000, 16000)))

        # Introduce realistic missing values (None / empty string)
        if i in [23, 104, 312, 744]:
            bmi = ""
        if i in [55, 419, 891]:
            systolic_bp = ""
        if i in [71, 512]:
            income_est = ""
        if i in [88, 620]:
            lang = ""

        row = {
            "Patient_ID": pid,
            "Age": age,
            "Gender": gender,
            "Race_Ethnicity": race,
            "Insurance_Type": ins,
            "Primary_Language": lang,
            "Community_Area": comm_name,
            "ZIP_Code": zip_code,
            "Region": region,
            "Clinic_Name": clinic,
            "Annual_Visits": annual_visits,
            "Systolic_BP": systolic_bp,
            "BMI": bmi,
            "Household_Income_Est": income_est,
            "Registration_Date": reg_date,
            "Latitude": lat,
            "Longitude": lon,
        }
        records.append(row)

    # Add a few intentional duplicate rows (e.g. 5 duplicate rows) to test duplicate detection
    for dup_idx in [10, 45, 120, 250, 400]:
        dup_row = dict(records[dup_idx])
        records.append(dup_row)

    fieldnames = [
        "Patient_ID",
        "Age",
        "Gender",
        "Race_Ethnicity",
        "Insurance_Type",
        "Primary_Language",
        "Community_Area",
        "ZIP_Code",
        "Region",
        "Clinic_Name",
        "Annual_Visits",
        "Systolic_BP",
        "BMI",
        "Household_Income_Est",
        "Registration_Date",
        "Latitude",
        "Longitude",
    ]

    import os
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f"Generated {len(records)} records at {output_path}")

if __name__ == "__main__":
    generate_dataset()
