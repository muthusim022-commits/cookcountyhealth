import React, { useState, useMemo } from 'react';
import { ColumnProfile } from '../types';
import { computeIqrOutliers, computePearsonCorrelation } from '../clientAnalytics';
import { BarChart3, TrendingUp, ScatterChart, Network, Layers, AlertCircle, Info } from 'lucide-react';

interface EdaViewProps {
  profiles: ColumnProfile[];
  data: Record<string, any>[];
  columns: string[];
}

export const EdaView: React.FC<EdaViewProps> = ({ profiles, data, columns }) => {
  const [activeTab, setActiveTab] = useState<'numeric' | 'categorical' | 'temporal' | 'correlation' | 'relationship'>('numeric');

  const numericProfiles = profiles.filter((p) => p.dtype === 'numeric');
  const catProfiles = profiles.filter((p) => p.dtype === 'categorical');
  const dateProfiles = profiles.filter((p) => p.dtype === 'datetime');

  // State for Numeric tab
  const [selectedNumeric, setSelectedNumeric] = useState<string>(numericProfiles[0]?.name || '');
  const [histogramBins, setHistogramBins] = useState<number>(20);

  // State for Categorical tab
  const [selectedCategorical, setSelectedCategorical] = useState<string>(catProfiles[0]?.name || '');
  const [topNCats, setTopNCats] = useState<number>(12);

  // State for Temporal tab
  const [selectedDate, setSelectedDate] = useState<string>(dateProfiles[0]?.name || '');
  const [dateInterval, setDateInterval] = useState<'monthly' | 'yearly'>('monthly');

  // State for Correlation tab
  const [selectedCorrCols, setSelectedCorrCols] = useState<string[]>(numericProfiles.slice(0, 5).map((p) => p.name));

  // State for Relationship Explorer
  const [relX, setRelX] = useState<string>(columns[0] || '');
  const [relY, setRelY] = useState<string>(columns[1] || columns[0] || '');
  const [relColor, setRelColor] = useState<string>('None');

  // Calculations for selected numeric
  const numericStats = useMemo(() => {
    if (!selectedNumeric) return null;
    const prof = numericProfiles.find((p) => p.name === selectedNumeric);
    const vals = data
      .map((r) => Number(r[selectedNumeric]))
      .filter((v) => !isNaN(v) && v !== null && v !== undefined);

    const outlierInfo = computeIqrOutliers(vals);
    return { prof, vals, outlierInfo };
  }, [selectedNumeric, data, numericProfiles]);

  // Histogram calculation
  const histogramData = useMemo(() => {
    if (!numericStats || numericStats.vals.length === 0) return [];
    const min = numericStats.prof?.min ?? Math.min(...numericStats.vals);
    const max = numericStats.prof?.max ?? Math.max(...numericStats.vals);
    if (min === max) return [{ binLabel: `${min}`, count: numericStats.vals.length }];

    const binWidth = (max - min) / histogramBins;
    const bins = Array.from({ length: histogramBins }, (_, i) => ({
      binStart: min + i * binWidth,
      binEnd: min + (i + 1) * binWidth,
      binLabel: `${(min + i * binWidth).toFixed(1)} - ${(min + (i + 1) * binWidth).toFixed(1)}`,
      count: 0,
    }));

    for (const v of numericStats.vals) {
      let idx = Math.floor((v - min) / binWidth);
      if (idx >= histogramBins) idx = histogramBins - 1;
      if (idx >= 0) bins[idx].count++;
    }
    return bins;
  }, [numericStats, histogramBins]);

  // Calculations for selected categorical
  const categoricalData = useMemo(() => {
    if (!selectedCategorical) return { items: [], total: 0 };
    const counts: Record<string, number> = {};
    let total = 0;
    for (const r of data) {
      const raw = r[selectedCategorical];
      if (raw !== null && raw !== undefined && raw !== '') {
        const val = String(raw).trim();
        counts[val] = (counts[val] || 0) + 1;
        total++;
      }
    }
    const sorted = Object.entries(counts)
      .map(([cat, count]) => ({
        category: cat,
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      items: sorted.slice(0, topNCats),
      total,
      uniqueCount: sorted.length,
    };
  }, [selectedCategorical, data, topNCats]);

  // Calculations for temporal trends
  const temporalData = useMemo(() => {
    if (!selectedDate) return [];
    const counts: Record<string, number> = {};
    for (const r of data) {
      const raw = r[selectedDate];
      if (raw) {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          const key =
            dateInterval === 'monthly'
              ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
              : `${d.getFullYear()}`;
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }
    return Object.entries(counts)
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [selectedDate, data, dateInterval]);

  // Correlation matrix
  const correlationMatrix = useMemo(() => {
    if (selectedCorrCols.length < 2) return null;
    const matrix: { x: string; y: string; val: number }[] = [];
    const colArrays = selectedCorrCols.map((col) => ({
      name: col,
      vals: data.map((r) => Number(r[col])),
    }));

    for (const c1 of colArrays) {
      for (const c2 of colArrays) {
        const corr = c1.name === c2.name ? 1.0 : computePearsonCorrelation(c1.vals, c2.vals);
        matrix.push({ x: c1.name, y: c2.name, val: corr });
      }
    }
    return matrix;
  }, [selectedCorrCols, data]);

  // Relationship Routing Determination
  const relationshipRouting = useMemo(() => {
    const profX = profiles.find((p) => p.name === relX);
    const profY = profiles.find((p) => p.name === relY);
    const typeX = profX?.dtype || 'categorical';
    const typeY = profY?.dtype || 'categorical';

    if (typeX === 'numeric' && typeY === 'numeric') {
      return { chartType: 'Scatter Plot', rationale: 'Numeric × Numeric' };
    }
    if (typeX === 'categorical' && typeY === 'numeric') {
      return { chartType: 'Box Plot', rationale: 'Categorical × Numeric' };
    }
    if (typeX === 'numeric' && typeY === 'categorical') {
      return { chartType: 'Horizontal Box Plot', rationale: 'Numeric × Categorical' };
    }
    if (typeX === 'datetime' && typeY === 'numeric') {
      return { chartType: 'Time Series Trend', rationale: 'Datetime × Numeric' };
    }
    return { chartType: 'Grouped Cross-Tabulation', rationale: 'Categorical × Categorical' };
  }, [relX, relY, profiles]);

  return (
    <div className="space-y-6" id="eda-view">
      {/* Subnavigation Bar */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs font-semibold" id="eda-tabs">
        <button
          onClick={() => setActiveTab('numeric')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === 'numeric'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Numeric & Outliers
        </button>
        <button
          onClick={() => setActiveTab('categorical')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === 'categorical'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Categorical Frequencies
        </button>
        <button
          onClick={() => setActiveTab('temporal')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === 'temporal'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Temporal Trends
        </button>
        <button
          onClick={() => setActiveTab('correlation')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === 'correlation'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Network className="w-4 h-4" />
          Correlation Matrix
        </button>
        <button
          onClick={() => setActiveTab('relationship')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === 'relationship'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ScatterChart className="w-4 h-4" />
          Relationship Explorer
        </button>
      </div>

      {/* 1. NUMERIC & OUTLIERS TAB */}
      {activeTab === 'numeric' && (
        <div className="space-y-5" id="eda-numeric-section">
          {numericProfiles.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              No numeric columns detected in the active dataset.
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Select Numeric Variable:</span>
                  <select
                    value={selectedNumeric}
                    onChange={(e) => setSelectedNumeric(e.target.value)}
                    className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {numericProfiles.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>Histogram Bins:</span>
                  {[10, 20, 30].map((b) => (
                    <button
                      key={b}
                      onClick={() => setHistogramBins(b)}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        histogramBins === b ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Statistics Cards */}
              {numericStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-400 block font-medium">Mean</span>
                    <span className="text-base font-bold text-slate-900">{numericStats.prof?.mean?.toFixed(2) ?? 'N/A'}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-400 block font-medium">Median</span>
                    <span className="text-base font-bold text-slate-900">{numericStats.prof?.median?.toFixed(2) ?? 'N/A'}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-400 block font-medium">Std Dev</span>
                    <span className="text-base font-bold text-slate-900">{numericStats.prof?.std?.toFixed(2) ?? 'N/A'}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-400 block font-medium">Min</span>
                    <span className="text-base font-bold text-slate-900">{numericStats.prof?.min?.toFixed(1) ?? 'N/A'}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-400 block font-medium">Max</span>
                    <span className="text-base font-bold text-slate-900">{numericStats.prof?.max?.toFixed(1) ?? 'N/A'}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-400 block font-medium">Q1 (25%)</span>
                    <span className="text-base font-bold text-slate-900">{numericStats.outlierInfo.q1.toFixed(1)}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-400 block font-medium">Q3 (75%)</span>
                    <span className="text-base font-bold text-slate-900">{numericStats.outlierInfo.q3.toFixed(1)}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-400 block font-medium">IQR</span>
                    <span className="text-base font-bold text-slate-900">{numericStats.outlierInfo.iqr.toFixed(1)}</span>
                  </div>
                </div>
              )}

              {/* Histogram & Outliers Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Histogram Visualizer */}
                <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Distribution Histogram: {selectedNumeric}</h4>
                  <div className="h-64 flex items-end gap-1.5 pt-6 pb-2 border-b border-slate-200">
                    {histogramData.map((bin, i) => {
                      const maxCount = Math.max(...histogramData.map((b) => b.count), 1);
                      const heightPct = (bin.count / maxCount) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="w-full bg-blue-600 rounded-t hover:bg-blue-700 transition"
                          />
                          <div className="absolute -top-7 hidden group-hover:block bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-20">
                            {bin.binLabel}: {bin.count.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-mono">
                    <span>{numericStats?.prof?.min?.toFixed(1)}</span>
                    <span>Values</span>
                    <span>{numericStats?.prof?.max?.toFixed(1)}</span>
                  </div>
                </div>

                {/* IQR Outlier Detection Card */}
                {numericStats && (
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-1">IQR Statistical Outlier Detection</h4>
                      <p className="text-xs text-slate-500 mb-4">
                        Evaluates boundaries via Q1 - 1.5×IQR and Q3 + 1.5×IQR.
                      </p>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between p-2 bg-slate-50 rounded">
                          <span className="text-slate-500">Lower Fence:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {numericStats.outlierInfo.lowerBound.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-50 rounded">
                          <span className="text-slate-500">Upper Fence:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {numericStats.outlierInfo.upperBound.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between p-2 bg-rose-50 rounded text-rose-900">
                          <span>Outlier Count:</span>
                          <span className="font-mono font-bold">
                            {numericStats.outlierInfo.outlierCount.toLocaleString()} (
                            {numericStats.outlierInfo.outlierPct.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-amber-50 rounded-lg text-amber-800 text-[11px] flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                      <span>
                        Statistical outliers reflect natural clinical and operational variation and are kept intact
                        during baseline EDA.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 2. CATEGORICAL FREQUENCIES TAB */}
      {activeTab === 'categorical' && (
        <div className="space-y-5" id="eda-categorical-section">
          {catProfiles.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              No categorical columns detected in the active dataset.
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Select Categorical Variable:</span>
                  <select
                    value={selectedCategorical}
                    onChange={(e) => setSelectedCategorical(e.target.value)}
                    className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-blue-500"
                  >
                    {catProfiles.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} ({p.uniqueCount} uniques)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>Top Categories:</span>
                  {[5, 10, 15, 20].map((n) => (
                    <button
                      key={n}
                      onClick={() => setTopNCats(n)}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        topNCats === n ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Horizontal Bar Chart */}
                <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-900 mb-4">
                    Frequency Distribution: {selectedCategorical} (Top {categoricalData.items.length})
                  </h4>
                  <div className="space-y-2.5">
                    {categoricalData.items.map((item) => {
                      const maxPct = categoricalData.items[0]?.pct || 1;
                      const widthPct = (item.pct / maxPct) * 100;
                      return (
                        <div key={item.category} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-800 truncate max-w-[240px]">{item.category}</span>
                            <span className="text-slate-500 font-mono">
                              {item.count.toLocaleString()} ({item.pct.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              style={{ width: `${widthPct}%` }}
                              className="bg-teal-600 h-full rounded-full transition-all"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Table View */}
                <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-900 mb-3">Category Breakdown Table</h4>
                  <div className="overflow-y-auto max-h-80 border border-slate-200 rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 text-slate-700">
                        <tr>
                          <th className="px-3 py-2">Category</th>
                          <th className="px-3 py-2 text-right">Count</th>
                          <th className="px-3 py-2 text-right">Share %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {categoricalData.items.map((item) => (
                          <tr key={item.category} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5 font-medium text-slate-800 truncate max-w-[150px]">
                              {item.category}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-600">
                              {item.count.toLocaleString()}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-600">{item.pct.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. TEMPORAL TRENDS TAB */}
      {activeTab === 'temporal' && (
        <div className="space-y-5" id="eda-temporal-section">
          {dateProfiles.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              No datetime columns detected in the active dataset.
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Select Date Variable:</span>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5"
                  >
                    {dateProfiles.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => setDateInterval('monthly')}
                    className={`px-3 py-1 rounded font-medium ${
                      dateInterval === 'monthly' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Monthly Aggregation
                  </button>
                  <button
                    onClick={() => setDateInterval('yearly')}
                    className={`px-3 py-1 rounded font-medium ${
                      dateInterval === 'yearly' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Yearly Aggregation
                  </button>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 mb-4">Registration & Encounter Volume Over Time</h4>
                <div className="h-64 flex items-end gap-1 border-b border-slate-200 pt-6 pb-2">
                  {temporalData.map((d, idx) => {
                    const maxCount = Math.max(...temporalData.map((t) => t.count), 1);
                    const heightPct = (d.count / maxCount) * 100;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full bg-blue-600/90 rounded-t hover:bg-blue-700 transition"
                        />
                        <div className="absolute -top-7 hidden group-hover:block bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-20">
                          {d.period}: {d.count.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-mono">
                  <span>{temporalData[0]?.period}</span>
                  <span>Timeline</span>
                  <span>{temporalData[temporalData.length - 1]?.period}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 4. CORRELATION MATRIX TAB */}
      {activeTab === 'correlation' && (
        <div className="space-y-5" id="eda-correlation-section">
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Methodological Guidance:</strong> Correlation indicates the strength and direction of linear
              association between numerical variables. It does not establish causation.
            </div>
          </div>

          {numericProfiles.length < 2 ? (
            <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              At least two numeric columns are required to construct a correlation matrix.
            </div>
          ) : (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="mb-4">
                <span className="text-xs font-semibold text-slate-700 block mb-1.5">Select Numeric Columns:</span>
                <div className="flex flex-wrap gap-2">
                  {numericProfiles.map((p) => {
                    const isSelected = selectedCorrCols.includes(p.name);
                    return (
                      <button
                        key={p.name}
                        onClick={() => {
                          if (isSelected) {
                            if (selectedCorrCols.length > 2) {
                              setSelectedCorrCols(selectedCorrCols.filter((c) => c !== p.name));
                            }
                          } else {
                            setSelectedCorrCols([...selectedCorrCols, p.name]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Heatmap Matrix */}
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse font-mono">
                  <thead>
                    <tr>
                      <th className="p-2 text-left font-sans text-slate-500">Variable</th>
                      {selectedCorrCols.map((c) => (
                        <th key={c} className="p-2 text-center text-slate-700 font-semibold whitespace-nowrap">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCorrCols.map((rCol) => (
                      <tr key={rCol} className="border-t border-slate-100">
                        <td className="p-2 font-semibold text-slate-800 font-sans whitespace-nowrap">{rCol}</td>
                        {selectedCorrCols.map((cCol) => {
                          const cell = correlationMatrix?.find((m) => m.x === rCol && m.y === cCol);
                          const val = cell ? cell.val : 0;
                          const absVal = Math.abs(val);

                          // Color interpolation based on positive or negative correlation
                          const bgColor =
                            val > 0
                              ? `rgba(37, 99, 235, ${Math.min(1, absVal * 0.8 + 0.1)})`
                              : `rgba(225, 29, 72, ${Math.min(1, absVal * 0.8 + 0.1)})`;
                          const textColor = absVal > 0.4 ? '#ffffff' : '#1e293b';

                          return (
                            <td
                              key={cCol}
                              style={{ backgroundColor: bgColor, color: textColor }}
                              className="p-2.5 text-center font-bold border border-white"
                            >
                              {val.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. RELATIONSHIP EXPLORER TAB */}
      {activeTab === 'relationship' && (
        <div className="space-y-5" id="eda-relationship-section">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">X-Axis Variable</label>
              <select
                value={relX}
                onChange={(e) => setRelX(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-blue-500"
              >
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Y-Axis Variable</label>
              <select
                value={relY}
                onChange={(e) => setRelY(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-blue-500"
              >
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Color Grouping (Optional)</label>
              <select
                value={relColor}
                onChange={(e) => setRelColor(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-blue-500"
              >
                <option value="None">None</option>
                {catProfiles
                  .filter((p) => p.uniqueCount <= 12)
                  .map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Intelligent Routing Banner */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded text-[10px]">
              Intelligent Router
            </span>
            <span>
              Routed to <strong>{relationshipRouting.chartType}</strong> based on variable types:{' '}
              <code>{relX}</code> ({relationshipRouting.rationale}).
            </span>
          </div>

          {/* Visual Canvas Representation */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
            <div className="max-w-xl mx-auto space-y-4">
              <div className="h-64 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center p-6 relative overflow-hidden">
                {relationshipRouting.chartType === 'Scatter Plot' && (
                  <div className="w-full h-full relative">
                    <div className="absolute inset-0 flex items-center justify-center opacity-70">
                      {data.slice(0, 150).map((r, i) => {
                        const xVal = Number(r[relX]);
                        const yVal = Number(r[relY]);
                        const xMin = numericProfiles.find((p) => p.name === relX)?.min ?? 0;
                        const xMax = numericProfiles.find((p) => p.name === relX)?.max ?? 100;
                        const yMin = numericProfiles.find((p) => p.name === relY)?.min ?? 0;
                        const yMax = numericProfiles.find((p) => p.name === relY)?.max ?? 100;

                        const left = ((xVal - xMin) / (xMax - xMin || 1)) * 90 + 5;
                        const bottom = ((yVal - yMin) / (yMax - yMin || 1)) * 90 + 5;

                        return (
                          <div
                            key={i}
                            style={{ left: `${left}%`, bottom: `${bottom}%` }}
                            className="absolute w-2 h-2 rounded-full bg-blue-600 hover:scale-150 transition-transform"
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {relationshipRouting.chartType !== 'Scatter Plot' && (
                  <div className="text-slate-500 space-y-2">
                    <BarChart3 className="w-10 h-10 text-slate-400 mx-auto" />
                    <div className="font-semibold text-slate-800 text-sm">
                      {relationshipRouting.chartType}: {relY} across {relX}
                    </div>
                    <p className="text-xs text-slate-400">
                      In the local Streamlit runtime, this renders as interactive Plotly {relationshipRouting.chartType}.
                    </p>
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-500">
                Visualizing relationship between <strong>{relX}</strong> and <strong>{relY}</strong> across{' '}
                {data.length.toLocaleString()} records.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
