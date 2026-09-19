import React, { useState } from 'react';
import { ColumnProfile, DatasetMeta, HealthcareFields } from '../types';
import { FileText, Database, HardDrive, Hash, CheckCircle, Table, ArrowDown } from 'lucide-react';

interface OverviewViewProps {
  meta: DatasetMeta;
  profiles: ColumnProfile[];
  data: Record<string, any>[];
  columns: string[];
  healthcare: HealthcareFields;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  meta,
  profiles,
  data,
  columns,
  healthcare,
}) => {
  const [previewLimit, setPreviewLimit] = useState(20);

  const numericCols = profiles.filter((p) => p.dtype === 'numeric');
  const catCols = profiles.filter((p) => p.dtype === 'categorical');
  const dateCols = profiles.filter((p) => p.dtype === 'datetime');
  const idCols = profiles.filter((p) => p.dtype === 'identifier');

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6" id="overview-view">
      {/* File Ingestion Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3" id="file-metrics-bar">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm" id="metric-records">
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <Database className="w-4 h-4 text-blue-600" />
            <span>Active Records</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{data.length.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-0.5">Parsed from {meta.filename}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm" id="metric-columns">
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <Hash className="w-4 h-4 text-teal-600" />
            <span>Columns</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{columns.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">{numericCols.length} num, {catCols.length} cat</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm" id="metric-memory">
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <HardDrive className="w-4 h-4 text-indigo-600" />
            <span>Memory Size</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatBytes(meta.sizeBytes)}</div>
          <div className="text-xs text-slate-400 mt-0.5">Encoding: {meta.encoding}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm" id="metric-delimiter">
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4 text-amber-600" />
            <span>Delimiter</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">'{meta.delimiter}'</div>
          <div className="text-xs text-slate-400 mt-0.5">Auto-detected dialect</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm" id="metric-validity">
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Status</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">Operational</div>
          <div className="text-xs text-slate-400 mt-0.5">Schema dynamic profile ready</div>
        </div>
      </div>

      {/* Schema Topology */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm" id="schema-inventory">
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Table className="w-5 h-5 text-blue-600" />
          Column Schema Inventory & Inferred Datatypes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3.5 bg-blue-50/50 rounded-lg border border-blue-100" id="schema-num">
            <div className="text-xs font-bold text-blue-900 mb-1">NUMERIC ({numericCols.length})</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {numericCols.map((c) => (
                <span key={c.name} className="px-2 py-0.5 bg-blue-100/80 text-blue-800 text-xs font-mono rounded">
                  {c.name}
                </span>
              ))}
              {numericCols.length === 0 && <span className="text-xs text-slate-400">None detected</span>}
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/50 rounded-lg border border-emerald-100" id="schema-cat">
            <div className="text-xs font-bold text-emerald-900 mb-1">CATEGORICAL ({catCols.length})</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {catCols.map((c) => (
                <span key={c.name} className="px-2 py-0.5 bg-emerald-100/80 text-emerald-800 text-xs font-mono rounded">
                  {c.name}
                </span>
              ))}
              {catCols.length === 0 && <span className="text-xs text-slate-400">None detected</span>}
            </div>
          </div>

          <div className="p-3.5 bg-purple-50/50 rounded-lg border border-purple-100" id="schema-dates">
            <div className="text-xs font-bold text-purple-900 mb-1">DATETIME ({dateCols.length})</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {dateCols.map((c) => (
                <span key={c.name} className="px-2 py-0.5 bg-purple-100/80 text-purple-800 text-xs font-mono rounded">
                  {c.name}
                </span>
              ))}
              {dateCols.length === 0 && <span className="text-xs text-slate-400">None detected</span>}
            </div>
          </div>

          <div className="p-3.5 bg-amber-50/50 rounded-lg border border-amber-100" id="schema-ids">
            <div className="text-xs font-bold text-amber-900 mb-1">IDENTIFIERS ({idCols.length})</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {idCols.map((c) => (
                <span key={c.name} className="px-2 py-0.5 bg-amber-100/80 text-amber-800 text-xs font-mono rounded">
                  {c.name}
                </span>
              ))}
              {idCols.length === 0 && <span className="text-xs text-slate-400">None detected</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Dataset Table Preview */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm" id="dataset-preview-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Dataset Table Preview</h3>
            <p className="text-xs text-slate-500">
              Showing first {Math.min(previewLimit, data.length)} of {data.length.toLocaleString()} active rows
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Rows to preview:</span>
            {[10, 25, 50, 100].map((num) => (
              <button
                key={num}
                onClick={() => setPreviewLimit(num)}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  previewLimit === num ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-96">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
              <tr>
                <th className="px-3 py-2 text-slate-400 font-mono font-medium border-r border-slate-200 w-12 text-center">
                  #
                </th>
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-slate-700 font-semibold whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.slice(0, previewLimit).map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3 py-1.5 text-slate-400 text-center font-mono border-r border-slate-100">
                    {idx + 1}
                  </td>
                  {columns.map((col) => (
                    <td key={col} className="px-3 py-1.5 text-slate-700 whitespace-nowrap">
                      {row[col] !== null && row[col] !== undefined && row[col] !== '' ? (
                        String(row[col])
                      ) : (
                        <span className="text-slate-300 italic font-mono">null</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
