import React, { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import {
  DatasetMeta,
  ColumnProfile,
  CleaningOptions,
  CleaningAudit,
  HealthcareFields,
} from './types';
import {
  detectColumnTypes,
  detectHealthcareFields,
  cleanData,
  standardizeGender,
} from './clientAnalytics';
import { OverviewView } from './components/OverviewView';
import { DataQualityView } from './components/DataQualityView';
import { EdaView } from './components/EdaView';
import { DemographicsView } from './components/DemographicsView';
import { InsuranceView } from './components/InsuranceView';
import { GeographyView } from './components/GeographyView';
import { NotebookView } from './components/NotebookView';
import {
  Upload,
  Database,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  Activity,
  Layers,
  BarChart2,
  Users,
  CreditCard,
  MapPin,
  BookOpen,
  CheckCircle,
} from 'lucide-react';

export default function App() {
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [rawColumns, setRawColumns] = useState<string[]>([]);
  const [meta, setMeta] = useState<DatasetMeta>({
    filename: 'No dataset loaded',
    sizeBytes: 0,
    encoding: 'utf-8',
    delimiter: ',',
    rowCount: 0,
    colCount: 0,
  });

  const [activeTab, setActiveTab] = useState<
    'overview' | 'quality' | 'eda' | 'demographics' | 'insurance' | 'geography' | 'notebook'
  >('overview');

  const [cleaningOptions, setCleaningOptions] = useState<CleaningOptions>({
    removeDuplicates: true,
    trimWhitespace: true,
    standardizeColumns: true,
    normalizeCasing: true,
    convertDates: true,
    coerceNegativeNumerics: true,
  });

  const [cleanedData, setCleanedData] = useState<Record<string, any>[]>([]);
  const [cleanedColumns, setCleanedColumns] = useState<string[]>([]);
  const [cleaningAudit, setCleaningAudit] = useState<CleaningAudit | null>(null);

  // Global Reactive Filter States
  const [filterInsurance, setFilterInsurance] = useState<string[]>([]);
  const [filterClinic, setFilterClinic] = useState<string[]>([]);
  const [filterGender, setFilterGender] = useState<string[]>([]);
  const [ageRange, setAgeRange] = useState<[number, number]>([0, 100]);

  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sample dataset on mount
  useEffect(() => {
    loadSampleDataset();
  }, []);

  const loadSampleDataset = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch('/data/sample_data.csv');
      if (!resp.ok) throw new Error('Could not fetch sample dataset');
      const text = await resp.text();
      processCsvText(text, 'CookCountyHealth_Cohort.csv', text.length);
    } catch (err) {
      console.error('Failed to load sample dataset:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const processCsvText = (csvString: string, filename: string, sizeBytes: number) => {
    const results = Papa.parse<Record<string, any>>(csvString, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    const parsedData = (results.data || []).filter((r) => Object.keys(r).length > 0);
    const cols = results.meta.fields || (parsedData[0] ? Object.keys(parsedData[0]) : []);

    setRawData(parsedData);
    setRawColumns(cols);

    setMeta({
      filename,
      sizeBytes,
      encoding: 'utf-8',
      delimiter: results.meta.delimiter || ',',
      rowCount: parsedData.length,
      colCount: cols.length,
    });

    // Apply baseline cleaning
    const initialClean = cleanData(parsedData, cols, cleaningOptions);
    setCleanedData(initialClean.cleanedData);
    setCleanedColumns(initialClean.newColumns);
    setCleaningAudit(initialClean.audit);

    // Reset filters
    setFilterInsurance([]);
    setFilterClinic([]);
    setFilterGender([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processCsvText(content, file.name, file.size);
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const handleApplyCleaning = () => {
    if (rawData.length === 0) return;
    const result = cleanData(rawData, rawColumns, cleaningOptions);
    setCleanedData(result.cleanedData);
    setCleanedColumns(result.newColumns);
    setCleaningAudit(result.audit);
  };

  const handleDownloadCsv = () => {
    if (cleanedData.length === 0) return;
    const csv = Papa.unparse(cleanedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CookCountyHealth_Cleaned_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Detected Profiles & Healthcare Fields
  const columnProfiles: ColumnProfile[] = useMemo(() => {
    return detectColumnTypes(cleanedData, cleanedColumns);
  }, [cleanedData, cleanedColumns]);

  const healthcareFields: HealthcareFields = useMemo(() => {
    return detectHealthcareFields(cleanedColumns);
  }, [cleanedColumns]);

  // Compute Available Filter Options dynamically from active data
  const filterOptions = useMemo(() => {
    const insCol = healthcareFields.insurance;
    const clinicCol = healthcareFields.clinic;
    const genderCol = healthcareFields.gender;
    const ageCol = healthcareFields.age;

    const insSet = new Set<string>();
    const clinicSet = new Set<string>();
    const genderSet = new Set<string>();
    let minAge = 0;
    let maxAge = 100;

    if (insCol) {
      cleanedData.forEach((r) => r[insCol] && insSet.add(String(r[insCol])));
    }
    if (clinicCol) {
      cleanedData.forEach((r) => r[clinicCol] && clinicSet.add(String(r[clinicCol])));
    }
    if (genderCol) {
      cleanedData.forEach((r) => {
        if (r[genderCol] !== null && r[genderCol] !== undefined && r[genderCol] !== '') {
          genderSet.add(standardizeGender(r[genderCol]));
        }
      });
    }
    if (ageCol) {
      const ages = cleanedData
        .map((r) => Number(r[ageCol]))
        .filter((v) => !isNaN(v) && v >= 0);
      if (ages.length > 0) {
        minAge = Math.min(...ages);
        maxAge = Math.max(...ages);
      }
    }

    return {
      insurance: Array.from(insSet).sort(),
      clinics: Array.from(clinicSet).sort(),
      genders: Array.from(genderSet).sort(),
      minAge,
      maxAge,
    };
  }, [cleanedData, healthcareFields]);

  // Apply Global Filters to generate reactive subset
  const filteredData = useMemo(() => {
    const insCol = healthcareFields.insurance;
    const clinicCol = healthcareFields.clinic;
    const genderCol = healthcareFields.gender;
    const ageCol = healthcareFields.age;

    return cleanedData.filter((row) => {
      if (insCol && filterInsurance.length > 0 && !filterInsurance.includes(String(row[insCol]))) {
        return false;
      }
      if (clinicCol && filterClinic.length > 0 && !filterClinic.includes(String(row[clinicCol]))) {
        return false;
      }
      if (genderCol && filterGender.length > 0) {
        const rowVal = row[genderCol];
        const rowStd = standardizeGender(rowVal);
        if (!filterGender.includes(rowStd) && !filterGender.includes(String(rowVal))) {
          return false;
        }
      }
      if (ageCol) {
        const age = Number(row[ageCol]);
        if (!isNaN(age) && (age < ageRange[0] || age > ageRange[1])) {
          return false;
        }
      }
      return true;
    });
  }, [cleanedData, healthcareFields, filterInsurance, filterClinic, filterGender, ageRange]);

  const hasActiveFilters =
    filterInsurance.length > 0 ||
    filterClinic.length > 0 ||
    filterGender.length > 0 ||
    ageRange[0] > (filterOptions.minAge || 0) ||
    ageRange[1] < (filterOptions.maxAge || 100);

  const resetFilters = () => {
    setFilterInsurance([]);
    setFilterClinic([]);
    setFilterGender([]);
    setAgeRange([filterOptions.minAge, filterOptions.maxAge]);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col" id="app-root">
      {/* Top Application Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs" id="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm font-bold text-lg">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">CookCountyHealth</h1>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-full border border-blue-200">
                  Interactive EDA Engine
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Patient Demographics, Payer Mix & Geospatial Health Utilization Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              Upload CSV
            </button>
            <button
              onClick={loadSampleDataset}
              disabled={isLoading}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5" />
              {isLoading ? 'Loading...' : 'Load Sample Data'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex space-x-1 overflow-x-auto border-t border-slate-100 text-xs font-semibold scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Data Overview
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'quality'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Data Quality
          </button>
          <button
            onClick={() => setActiveTab('eda')}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'eda'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Exploratory EDA
          </button>
          <button
            onClick={() => setActiveTab('demographics')}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'demographics'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Demographics
          </button>
          <button
            onClick={() => setActiveTab('insurance')}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'insurance'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Insurance & Payer Mix
          </button>
          <button
            onClick={() => setActiveTab('geography')}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'geography'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Geography
          </button>
          <button
            onClick={() => setActiveTab('notebook')}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'notebook'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            07 Thought Process (.ipynb)
          </button>
        </div>
      </header>

      {/* Global Interactive Filter Ribbon */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 text-xs shadow-2xs" id="filter-ribbon">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Global Filters:</span>
            </div>

            {/* Insurance Multi-select Filter */}
            {filterOptions.insurance.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Coverage:</span>
                <select
                  value={filterInsurance[0] || 'All'}
                  onChange={(e) => setFilterInsurance(e.target.value === 'All' ? [] : [e.target.value])}
                  className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium"
                >
                  <option value="All">All Coverage ({filterOptions.insurance.length})</option>
                  {filterOptions.insurance.map((ins) => (
                    <option key={ins} value={ins}>
                      {ins}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Clinic Filter */}
            {filterOptions.clinics.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Clinic:</span>
                <select
                  value={filterClinic[0] || 'All'}
                  onChange={(e) => setFilterClinic(e.target.value === 'All' ? [] : [e.target.value])}
                  className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium"
                >
                  <option value="All">All Facilities ({filterOptions.clinics.length})</option>
                  {filterOptions.clinics.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Gender Filter */}
            {filterOptions.genders.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Gender:</span>
                <select
                  value={filterGender[0] || 'All'}
                  onChange={(e) => setFilterGender(e.target.value === 'All' ? [] : [e.target.value])}
                  className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium"
                >
                  <option value="All">All Genders</option>
                  {filterOptions.genders.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition underline"
              >
                <RefreshCw className="w-3 h-3" />
                Reset Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-slate-500">
            <div>
              Active Cohort:{' '}
              <strong className="text-slate-900 font-mono">{filteredData.length.toLocaleString()}</strong> of{' '}
              <span className="font-mono">{cleanedData.length.toLocaleString()}</span> records
            </div>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[10px]">
                Filtered
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1" id="main-content">
        {activeTab === 'overview' && (
          <OverviewView
            meta={meta}
            profiles={columnProfiles}
            data={filteredData}
            columns={cleanedColumns}
            healthcare={healthcareFields}
          />
        )}

        {activeTab === 'quality' && (
          <DataQualityView
            profiles={columnProfiles}
            rawData={rawData}
            cleanedData={cleanedData}
            rawColumns={rawColumns}
            cleanedColumns={cleanedColumns}
            audit={cleaningAudit}
            cleaningOptions={cleaningOptions}
            setCleaningOptions={setCleaningOptions}
            onApplyCleaning={handleApplyCleaning}
            onDownloadCsv={handleDownloadCsv}
          />
        )}

        {activeTab === 'eda' && (
          <EdaView profiles={columnProfiles} data={filteredData} columns={cleanedColumns} />
        )}

        {activeTab === 'demographics' && (
          <DemographicsView healthcare={healthcareFields} data={filteredData} />
        )}

        {activeTab === 'insurance' && (
          <InsuranceView healthcare={healthcareFields} data={filteredData} />
        )}

        {activeTab === 'geography' && (
          <GeographyView healthcare={healthcareFields} data={filteredData} profiles={columnProfiles} />
        )}

        {activeTab === 'notebook' && <NotebookView />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500 mt-auto" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>CookCountyHealth</strong> • Portfolio Exploratory Data Analysis & Quality Audit Application
          </div>
          <div className="text-slate-400">
            Streamlit Architecture & Python Statistical Engine • nalytics for Bussiness Intelligent
          </div>
        </div>
      </footer>
    </div>
  );
}
