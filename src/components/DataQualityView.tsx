import React, { useState } from 'react';
import { ColumnProfile, CleaningOptions, CleaningAudit } from '../types';
import { ShieldAlert, CheckCircle2, Wrench, Download, AlertTriangle, ArrowRight } from 'lucide-react';

interface DataQualityViewProps {
  profiles: ColumnProfile[];
  rawData: Record<string, any>[];
  cleanedData: Record<string, any>[];
  rawColumns: string[];
  cleanedColumns: string[];
  audit: CleaningAudit | null;
  cleaningOptions: CleaningOptions;
  setCleaningOptions: React.Dispatch<React.SetStateAction<CleaningOptions>>;
  onApplyCleaning: () => void;
  onDownloadCsv: () => void;
}

export const DataQualityView: React.FC<DataQualityViewProps> = ({
  profiles,
  rawData,
  cleanedData,
  rawColumns,
  cleanedColumns,
  audit,
  cleaningOptions,
  setCleaningOptions,
  onApplyCleaning,
  onDownloadCsv,
}) => {
  const [activeDataTab, setActiveDataTab] = useState<'audit' | 'raw' | 'cleaned'>('audit');

  const totalMissing = profiles.reduce((acc, p) => acc + p.missingCount, 0);
  const totalCells = Math.max(1, cleanedData.length * cleanedColumns.length);
  const missingPct = (totalMissing / totalCells) * 100;
  const duplicateRows = audit ? audit.duplicatesBefore : 0;
  const constantCols = profiles.filter((p) => p.uniqueCount === 1);

  return (
    <div className="space-y-6" id="data-quality-view">
      {/* Scorecard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" id="quality-scorecard">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Missing Cells
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalMissing.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-0.5">{missingPct.toFixed(2)}% of total matrix cells</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            Duplicate Rows
          </div>
          <div className="text-2xl font-bold text-slate-900">{duplicateRows.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-0.5">Identified via exact row hash match</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-500" />
            Constant Columns
          </div>
          <div className="text-2xl font-bold text-slate-900">{constantCols.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {constantCols.length ? constantCols.map((c) => c.name).join(', ') : 'None (all vary)'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-blue-500" />
            Clean Status
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {audit && audit.operationsApplied.length > 0 ? `${audit.operationsApplied.length} Applied` : 'Ready'}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Interactive pipeline available</div>
        </div>
      </div>

      {/* Interactive Cleaning Pipeline Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm" id="cleaning-controls-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              Automated Data Cleaning Pipeline
            </h3>
            <p className="text-xs text-slate-500">
              Select modular data transformations to inspect and execute against the active dataset.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onApplyCleaning}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition shadow-sm flex items-center gap-1.5"
            >
              Apply Transformations
            </button>
            <button
              onClick={onDownloadCsv}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download Cleaned CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={cleaningOptions.trimWhitespace}
              onChange={(e) => setCleaningOptions((prev) => ({ ...prev, trimWhitespace: e.target.checked }))}
              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-slate-800">Trim Whitespace</span>
              <p className="text-slate-500 text-[11px]">Remove leading and trailing whitespace from strings</p>
            </div>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={cleaningOptions.standardizeColumns}
              onChange={(e) => setCleaningOptions((prev) => ({ ...prev, standardizeColumns: e.target.checked }))}
              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-slate-800">Standardize Column Names</span>
              <p className="text-slate-500 text-[11px]">Convert headers to consistent snake_case format</p>
            </div>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={cleaningOptions.normalizeCasing}
              onChange={(e) => setCleaningOptions((prev) => ({ ...prev, normalizeCasing: e.target.checked }))}
              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-slate-800">Normalize Categorical Casing</span>
              <p className="text-slate-500 text-[11px]">Standardize casing inconsistencies to Title Case</p>
            </div>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={cleaningOptions.removeDuplicates}
              onChange={(e) => setCleaningOptions((prev) => ({ ...prev, removeDuplicates: e.target.checked }))}
              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-slate-800">Remove Duplicate Rows</span>
              <p className="text-slate-500 text-[11px]">Drop identical duplicated records</p>
            </div>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={cleaningOptions.coerceNegativeNumerics}
              onChange={(e) => setCleaningOptions((prev) => ({ ...prev, coerceNegativeNumerics: e.target.checked }))}
              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-slate-800">Coerce Negative Ages/Counts</span>
              <p className="text-slate-500 text-[11px]">Convert impossible negative values to null</p>
            </div>
          </label>
        </div>

        {/* Before vs After Audit Card */}
        {audit && (
          <div className="mt-4 p-4 bg-blue-50/70 rounded-lg border border-blue-100" id="audit-delta-box">
            <div className="text-xs font-bold text-blue-900 mb-2">BEFORE VS AFTER CLEANING AUDIT</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded border border-blue-200">
                <span className="text-slate-500 block">Row Count</span>
                <span className="font-bold text-slate-800">
                  {audit.rowsBefore.toLocaleString()} <ArrowRight className="inline w-3 h-3 text-blue-600" />{' '}
                  {audit.rowsAfter.toLocaleString()}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded border border-blue-200">
                <span className="text-slate-500 block">Column Count</span>
                <span className="font-bold text-slate-800">
                  {audit.colsBefore} <ArrowRight className="inline w-3 h-3 text-blue-600" /> {audit.colsAfter}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded border border-blue-200">
                <span className="text-slate-500 block">Missing Cells</span>
                <span className="font-bold text-slate-800">
                  {audit.missingBefore.toLocaleString()} <ArrowRight className="inline w-3 h-3 text-blue-600" />{' '}
                  {audit.missingAfter.toLocaleString()}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded border border-blue-200">
                <span className="text-slate-500 block">Duplicate Rows</span>
                <span className="font-bold text-slate-800">
                  {audit.duplicatesBefore.toLocaleString()} <ArrowRight className="inline w-3 h-3 text-blue-600" />{' '}
                  {audit.duplicatesAfter.toLocaleString()}
                </span>
              </div>
            </div>
            {audit.operationsApplied.length > 0 && (
              <div className="mt-2 text-xs text-blue-800">
                <span className="font-semibold">Applied Operations: </span>
                {audit.operationsApplied.join(' • ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Column Quality Diagnostic Matrix */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm" id="column-diagnostic-matrix">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Column-Level Quality Diagnostic Matrix</h3>
            <p className="text-xs text-slate-500">
              Audit table dynamically evaluating missingness, unique cardinalities, and anomalies per column.
            </p>
          </div>
          <div className="flex gap-1 border border-slate-200 rounded p-1 bg-slate-50 text-xs">
            <button
              onClick={() => setActiveDataTab('audit')}
              className={`px-3 py-1 rounded font-medium ${
                activeDataTab === 'audit' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              Quality Matrix
            </button>
            <button
              onClick={() => setActiveDataTab('raw')}
              className={`px-3 py-1 rounded font-medium ${
                activeDataTab === 'raw' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              Raw View ({rawData.length})
            </button>
            <button
              onClick={() => setActiveDataTab('cleaned')}
              className={`px-3 py-1 rounded font-medium ${
                activeDataTab === 'cleaned' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              Cleaned View ({cleanedData.length})
            </button>
          </div>
        </div>

        {activeDataTab === 'audit' && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                <tr>
                  <th className="px-3.5 py-2.5">Column</th>
                  <th className="px-3.5 py-2.5">Inferred DType</th>
                  <th className="px-3.5 py-2.5 text-right">Missing</th>
                  <th className="px-3.5 py-2.5 text-right">Missing %</th>
                  <th className="px-3.5 py-2.5 text-right">Unique</th>
                  <th className="px-3.5 py-2.5">Diagnostic Observations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profiles.map((p) => {
                  const hasIssues = p.potentialIssues[0] !== 'None detected';
                  return (
                    <tr key={p.name} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3.5 py-2 font-mono font-medium text-slate-900">{p.name}</td>
                      <td className="px-3.5 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                            p.dtype === 'numeric'
                              ? 'bg-blue-100 text-blue-800'
                              : p.dtype === 'categorical'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.dtype === 'datetime'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.dtype}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono text-slate-700">{p.missingCount.toLocaleString()}</td>
                      <td className="px-3.5 py-2 text-right font-mono text-slate-700">
                        {p.missingPct > 0 ? (
                          <span className={p.missingPct > 25 ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                            {p.missingPct.toFixed(1)}%
                          </span>
                        ) : (
                          '0.0%'
                        )}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono text-slate-700">{p.uniqueCount.toLocaleString()}</td>
                      <td className="px-3.5 py-2">
                        {hasIssues ? (
                          <span className="text-amber-700 font-medium">{p.potentialIssues.join(' • ')}</span>
                        ) : (
                          <span className="text-slate-400">Clean</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeDataTab === 'raw' && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-80">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-semibold text-slate-700">
                <tr>
                  {rawColumns.map((col) => (
                    <th key={col} className="px-3 py-2 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rawData.slice(0, 30).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {rawColumns.map((col) => (
                      <td key={col} className="px-3 py-1.5 whitespace-nowrap text-slate-700">
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeDataTab === 'cleaned' && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-80">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-semibold text-slate-700">
                <tr>
                  {cleanedColumns.map((col) => (
                    <th key={col} className="px-3 py-2 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cleanedData.slice(0, 30).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {cleanedColumns.map((col) => (
                      <td key={col} className="px-3 py-1.5 whitespace-nowrap text-slate-700">
                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-300 italic font-mono">null</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
