/**
 * Client-Side Statistical and Data Processing Engine
 * Implements equivalent logic to Pandas/NumPy for runtime browser evaluation.
 */

import { ColumnProfile, DatasetMeta, HealthcareFields, OutlierStats, CleaningOptions, CleaningAudit } from './types';

export function detectColumnTypes(data: Record<string, any>[], columns: string[]): ColumnProfile[] {
  const rowCount = data.length;

  return columns.map((col) => {
    let nonNullCount = 0;
    let numericCount = 0;
    let dateCount = 0;
    let boolCount = 0;
    const uniqueSet = new Set<string>();
    const sampleValues: (string | number)[] = [];
    const numValues: number[] = [];

    const dateRegex = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/;

    for (let i = 0; i < rowCount; i++) {
      const val = data[i][col];
      if (val !== undefined && val !== null && val !== '') {
        nonNullCount++;
        const strVal = String(val).trim();
        uniqueSet.add(strVal);

        if (sampleValues.length < 5 && !sampleValues.includes(strVal)) {
          sampleValues.push(strVal);
        }

        if (typeof val === 'boolean' || strVal.toLowerCase() === 'true' || strVal.toLowerCase() === 'false') {
          boolCount++;
        }

        const parsedNum = Number(val);
        if (!isNaN(parsedNum) && typeof val !== 'boolean') {
          numericCount++;
          numValues.push(parsedNum);
        } else if (dateRegex.test(strVal) && !isNaN(Date.parse(strVal))) {
          dateCount++;
        }
      }
    }

    const missingCount = rowCount - nonNullCount;
    const missingPct = rowCount > 0 ? (missingCount / rowCount) * 100 : 0;
    const uniqueCount = uniqueSet.size;

    let dtype: ColumnProfile['dtype'] = 'categorical';
    const colLower = col.toLowerCase();

    if (boolCount / Math.max(1, nonNullCount) > 0.8) {
      dtype = 'boolean';
    } else if (
      (colLower.includes('id') || colLower.includes('mrn') || colLower.includes('key')) &&
      uniqueCount / Math.max(1, nonNullCount) > 0.95 &&
      rowCount > 15
    ) {
      dtype = 'identifier';
    } else if (numericCount / Math.max(1, nonNullCount) > 0.85) {
      dtype = 'numeric';
    } else if (dateCount / Math.max(1, nonNullCount) > 0.6) {
      dtype = 'datetime';
    }

    const potentialIssues: string[] = [];
    if (missingCount > 0) {
      potentialIssues.push(`${missingCount} missing (${missingPct.toFixed(1)}%)`);
    }
    if (uniqueCount === 1) {
      potentialIssues.push('Constant column (1 unique value)');
    }

    // Numeric statistics
    let min: number | undefined;
    let max: number | undefined;
    let mean: number | undefined;
    let median: number | undefined;
    let std: number | undefined;
    let q1: number | undefined;
    let q3: number | undefined;
    let iqr: number | undefined;
    let skewness: number | undefined;

    if (dtype === 'numeric' && numValues.length > 0) {
      numValues.sort((a, b) => a - b);
      min = numValues[0];
      max = numValues[numValues.length - 1];
      const sum = numValues.reduce((acc, v) => acc + v, 0);
      mean = sum / numValues.length;

      const mid = Math.floor(numValues.length / 2);
      median = numValues.length % 2 !== 0 ? numValues[mid] : (numValues[mid - 1] + numValues[mid]) / 2;

      const variance = numValues.reduce((acc, v) => acc + Math.pow(v - mean!, 2), 0) / Math.max(1, numValues.length - 1);
      std = Math.sqrt(variance);

      const getQuantile = (q: number) => {
        const pos = (numValues.length - 1) * q;
        const base = Math.floor(pos);
        const rest = pos - base;
        if (numValues[base + 1] !== undefined) {
          return numValues[base] + rest * (numValues[base + 1] - numValues[base]);
        }
        return numValues[base];
      };

      q1 = getQuantile(0.25);
      q3 = getQuantile(0.75);
      iqr = q3 - q1;

      // Skewness
      if (std > 0 && numValues.length > 2) {
        const m3 = numValues.reduce((acc, v) => acc + Math.pow(v - mean!, 3), 0) / numValues.length;
        skewness = m3 / Math.pow(std, 3);
      }

      if (min < 0 && (colLower.includes('age') || colLower.includes('visit') || colLower.includes('income') || colLower.includes('bp'))) {
        potentialIssues.push(`${numValues.filter((v) => v < 0).length} negative numeric value(s)`);
      }
    }

    if (dtype === 'categorical') {
      const lowerSet = new Set(Array.from(uniqueSet).map((s) => s.toLowerCase().trim()));
      if (uniqueSet.size > lowerSet.size) {
        potentialIssues.push(`Casing variance (${uniqueSet.size - lowerSet.size} split entries)`);
      }
      let whitespaceCount = 0;
      for (const val of uniqueSet) {
        if (/^\s+|\s+$/.test(val)) whitespaceCount++;
      }
      if (whitespaceCount > 0) {
        potentialIssues.push(`${whitespaceCount} padded strings`);
      }
    }

    return {
      name: col,
      dtype,
      missingCount,
      missingPct,
      uniqueCount,
      sampleValues,
      potentialIssues: potentialIssues.length ? potentialIssues : ['None detected'],
      min,
      max,
      mean,
      median,
      std,
      q1,
      q3,
      iqr,
      skewness,
    };
  });
}

export function detectHealthcareFields(columns: string[]): HealthcareFields {
  const fields: HealthcareFields = {};
  const patterns: Record<keyof HealthcareFields, RegExp[]> = {
    age: [/^age$/i, /^patient_age$/i, /^age_years$/i, /current_age/i],
    gender: [/^gender$/i, /^sex$/i, /patient_gender/i, /biological_sex/i],
    insurance: [/^insurance/i, /^payer/i, /^coverage/i, /^plan/i, /^health_plan/i],
    raceEthnicity: [/^race/i, /^ethnicity/i, /^race_ethnicity/i],
    language: [/^primary_language/i, /^language/i, /^pref_language/i],
    community: [/^community/i, /^neighborhood/i, /^municipality/i, /^suburb/i],
    zipCode: [/^zip/i, /^postal/i],
    clinic: [/^clinic/i, /^facility/i, /^hospital/i, /^provider/i],
    visits: [/^visits/i, /^annual_visits/i, /^admissions/i, /^encounters/i],
    registrationDate: [/^registration_date/i, /^admission_date/i, /^admit/i, /^visit_date/i, /^date/i],
    latitude: [/^lat$/i, /^latitude$/i, /geo_lat/i],
    longitude: [/^lon$/i, /^long$/i, /^longitude$/i, /geo_lon/i],
    income: [/^income/i, /^household_income/i],
    systolicBp: [/^systolic/i, /^bp_systolic/i],
    bmi: [/^bmi$/i, /body_mass/i],
  };

  for (const [key, regexList] of Object.entries(patterns)) {
    for (const col of columns) {
      const clean = col.trim().replace(/[\s\-]+/g, '_');
      if (regexList.some((r) => r.test(clean))) {
        (fields as any)[key] = col;
        break;
      }
    }
  }

  return fields;
}

export function computeIqrOutliers(values: number[]): OutlierStats {
  if (!values.length) {
    return { q1: 0, q3: 0, iqr: 0, lowerBound: 0, upperBound: 0, outlierCount: 0, outlierPct: 0 };
  }
  const sorted = [...values].filter((v) => !isNaN(v)).sort((a, b) => a - b);
  const n = sorted.length;

  const getQ = (q: number) => {
    const pos = (n - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
  };

  const q1 = getQ(0.25);
  const q3 = getQ(0.75);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outliers = sorted.filter((v) => v < lowerBound || v > upperBound);
  const outlierCount = outliers.length;
  const outlierPct = n > 0 ? (outlierCount / n) * 100 : 0;

  return {
    q1,
    q3,
    iqr,
    lowerBound,
    upperBound,
    outlierCount,
    outlierPct,
  };
}

export function computePearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;

  let sumX = 0, sumY = 0;
  let validCount = 0;
  for (let i = 0; i < n; i++) {
    if (!isNaN(x[i]) && !isNaN(y[i])) {
      sumX += x[i];
      sumY += y[i];
      validCount++;
    }
  }
  if (validCount < 3) return 0;

  const meanX = sumX / validCount;
  const meanY = sumY / validCount;

  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    if (!isNaN(x[i]) && !isNaN(y[i])) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
  }

  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

export const KNOWN_ACRONYMS = new Set([
  'PPO',
  'HMO',
  'CHIP',
  'FEHB',
  'ER',
  'ICU',
  'ED',
  'DOB',
  'MRN',
  'ID',
  'ZIP',
  'US',
  'USA',
  'CCH',
  'CDC',
  'CMS',
  'ACA',
]);

export function toTitleCase(str: string): string {
  if (!str) return str;
  const trimmed = str.trim();
  if (KNOWN_ACRONYMS.has(trimmed.toUpperCase())) {
    return trimmed.toUpperCase();
  }
  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (word.includes('-')) {
        return word
          .split('-')
          .map((sub) =>
            KNOWN_ACRONYMS.has(sub.toUpperCase())
              ? sub.toUpperCase()
              : sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase()
          )
          .join('-');
      }
      if (KNOWN_ACRONYMS.has(word.toUpperCase())) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function standardizeGender(val: any): string {
  if (val === null || val === undefined || val === '') {
    return 'Unknown / Not Specified';
  }
  const str = String(val).trim();
  const lower = str.toLowerCase().replace(/[^a-z0-9\-]/g, '');

  if (lower === 'f' || lower === 'female' || lower === 'fem' || lower === 'woman') {
    return 'Female';
  }
  if (lower === 'm' || lower === 'male' || lower === 'masc' || lower === 'man') {
    return 'Male';
  }
  if (
    lower === 'nonbinary' ||
    lower === 'non-binary' ||
    lower === 'nb' ||
    lower === 'x' ||
    lower === 'genderqueer' ||
    lower === 'enby'
  ) {
    return 'Non-Binary';
  }
  if (lower === 'other' || lower === 'o') {
    return 'Other';
  }
  if (
    lower === 'unknown' ||
    lower === 'u' ||
    lower === 'declined' ||
    lower === 'undisclosed' ||
    lower === 'notreported' ||
    lower === 'refused'
  ) {
    return 'Unknown';
  }

  // Fallback to formatted title case
  return toTitleCase(str);
}

export function classifyPayerCategory(payer: string): {
  category: 'Public / Government' | 'Commercial / Private' | 'Uninsured / Self-Pay';
  tag: string;
  color: string;
  badgeBg: string;
} {
  const p = (payer || '').toLowerCase();
  if (
    p.includes('medicaid') ||
    p.includes('countycare') ||
    p.includes('medicare') ||
    p.includes('chip') ||
    p.includes('dual') ||
    p.includes('public') ||
    p.includes('fehb') ||
    p.includes('tricare') ||
    p.includes('va ') ||
    p.includes('veterans')
  ) {
    return {
      category: 'Public / Government',
      tag: 'Public',
      color: '#2563eb', // blue-600
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }
  if (
    p.includes('uninsured') ||
    p.includes('self-pay') ||
    p.includes('self pay') ||
    p.includes('charity') ||
    p.includes('none') ||
    p.includes('sliding') ||
    p.includes('indigent')
  ) {
    return {
      category: 'Uninsured / Self-Pay',
      tag: 'Self-Pay',
      color: '#ea580c', // orange-600
      badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
    };
  }
  return {
    category: 'Commercial / Private',
    tag: 'Commercial',
    color: '#059669', // emerald-600
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
}

export function cleanData(
  rawData: Record<string, any>[],
  columns: string[],
  options: CleaningOptions
): { cleanedData: Record<string, any>[]; newColumns: string[]; audit: CleaningAudit } {
  let data = rawData.map((row) => ({ ...row }));
  let currentCols = [...columns];
  const applied: string[] = [];

  const rowsBefore = rawData.length;
  const colsBefore = columns.length;
  const countMissing = (arr: Record<string, any>[], cols: string[]) =>
    arr.reduce((acc, r) => acc + cols.filter((c) => r[c] === null || r[c] === undefined || r[c] === '').length, 0);

  const missingBefore = countMissing(rawData, columns);

  // 1. Standardize columns
  if (options.standardizeColumns) {
    const colMap: Record<string, string> = {};
    currentCols = currentCols.map((c) => {
      const clean = c.trim().toLowerCase().replace(/[\s\-]+/g, '_').replace(/[^\w_]/g, '');
      colMap[c] = clean;
      return clean;
    });

    data = data.map((row) => {
      const newRow: Record<string, any> = {};
      for (const [oldKey, val] of Object.entries(row)) {
        newRow[colMap[oldKey] || oldKey] = val;
      }
      return newRow;
    });
    applied.push('Standardized column headers to snake_case format');
  }

  // 2. Trim whitespace
  if (options.trimWhitespace) {
    let trimmed = false;
    data = data.map((row) => {
      const newRow: Record<string, any> = {};
      for (const [k, v] of Object.entries(row)) {
        if (typeof v === 'string') {
          const stripped = v.trim();
          if (stripped !== v) trimmed = true;
          newRow[k] = stripped;
        } else {
          newRow[k] = v;
        }
      }
      return newRow;
    });
    if (trimmed) applied.push('Trimmed leading/trailing whitespaces across string columns');
  }

  // 3. Normalize categorical casing & harmonize gender codes
  if (options.normalizeCasing) {
    let harmonizedCount = 0;
    data = data.map((row) => {
      const newRow: Record<string, any> = {};
      for (const [k, v] of Object.entries(row)) {
        const kLower = k.toLowerCase();
        if (typeof v === 'string') {
          // If gender column, harmonize all casing and short codes (e.g., F/FEMALE -> Female)
          if (kLower.includes('gender') || kLower === 'sex') {
            const standardized = standardizeGender(v);
            if (standardized !== v) harmonizedCount++;
            newRow[k] = standardized;
          } else if (!kLower.includes('id') && !kLower.includes('zip') && !kLower.includes('url')) {
            // General categorical normalization
            newRow[k] = toTitleCase(v);
          } else {
            newRow[k] = v;
          }
        } else {
          newRow[k] = v;
        }
      }
      return newRow;
    });
    applied.push(
      harmonizedCount > 0
        ? `Normalized categorical casing and harmonized ${harmonizedCount} gender variations (e.g. FEMALE/F → Female)`
        : 'Normalized inconsistent categorical casing to Title Case'
    );
  }

  // 4. Remove duplicate rows
  const dupsBefore = data.length - new Set(data.map((r) => JSON.stringify(r))).size;
  if (options.removeDuplicates) {
    const seen = new Set<string>();
    const deduplicated: Record<string, any>[] = [];
    for (const row of data) {
      const str = JSON.stringify(row);
      if (!seen.has(str)) {
        seen.add(str);
        deduplicated.push(row);
      }
    }
    if (deduplicated.length < data.length) {
      applied.push(`Removed ${data.length - deduplicated.length} duplicate rows`);
    }
    data = deduplicated;
  }

  // 5. Coerce negative numeric values
  if (options.coerceNegativeNumerics) {
    let coerced = 0;
    data = data.map((row) => {
      const newRow: Record<string, any> = {};
      for (const [k, v] of Object.entries(row)) {
        const kLower = k.toLowerCase();
        if (
          (kLower.includes('age') || kLower.includes('visit') || kLower.includes('income') || kLower.includes('bp')) &&
          typeof v === 'number' &&
          v < 0
        ) {
          newRow[k] = null;
          coerced++;
        } else {
          newRow[k] = v;
        }
      }
      return newRow;
    });
    if (coerced > 0) {
      applied.push(`Coerced ${coerced} negative domain values to null`);
    }
  }

  const missingAfter = countMissing(data, currentCols);
  const dupsAfter = data.length - new Set(data.map((r) => JSON.stringify(r))).size;

  return {
    cleanedData: data,
    newColumns: currentCols,
    audit: {
      rowsBefore,
      rowsAfter: data.length,
      colsBefore,
      colsAfter: currentCols.length,
      missingBefore,
      missingAfter,
      duplicatesBefore: dupsBefore,
      duplicatesAfter: dupsAfter,
      operationsApplied: applied,
    },
  };
}
