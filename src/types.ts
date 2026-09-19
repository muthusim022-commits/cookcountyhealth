/**
 * Shared TypeScript types for CookCountyHealth EDA Application
 */

export interface DatasetMeta {
  filename: string;
  sizeBytes: number;
  encoding: string;
  delimiter: string;
  rowCount: number;
  colCount: number;
}

export interface ColumnProfile {
  name: string;
  dtype: 'numeric' | 'categorical' | 'datetime' | 'boolean' | 'identifier';
  missingCount: number;
  missingPct: number;
  uniqueCount: number;
  sampleValues: (string | number)[];
  potentialIssues: string[];
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  q1?: number;
  q3?: number;
  iqr?: number;
  skewness?: number;
}

export interface CleaningOptions {
  removeDuplicates: boolean;
  trimWhitespace: boolean;
  standardizeColumns: boolean;
  normalizeCasing: boolean;
  convertDates: boolean;
  coerceNegativeNumerics: boolean;
}

export interface CleaningAudit {
  rowsBefore: number;
  rowsAfter: number;
  colsBefore: number;
  colsAfter: number;
  missingBefore: number;
  missingAfter: number;
  duplicatesBefore: number;
  duplicatesAfter: number;
  operationsApplied: string[];
}

export interface HealthcareFields {
  age?: string;
  gender?: string;
  insurance?: string;
  raceEthnicity?: string;
  language?: string;
  community?: string;
  zipCode?: string;
  clinic?: string;
  visits?: string;
  registrationDate?: string;
  latitude?: string;
  longitude?: string;
  income?: string;
  systolicBp?: string;
  bmi?: string;
}

export interface OutlierStats {
  q1: number;
  q3: number;
  iqr: number;
  lowerBound: number;
  upperBound: number;
  outlierCount: number;
  outlierPct: number;
}
