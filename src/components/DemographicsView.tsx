import React, { useMemo, useState } from 'react';
import { HealthcareFields } from '../types';
import { Users, AlertCircle, Sparkles, Info } from 'lucide-react';
import { standardizeGender, toTitleCase } from '../clientAnalytics';

interface DemographicsViewProps {
  healthcare: HealthcareFields;
  data: Record<string, any>[];
}

export const DemographicsView: React.FC<DemographicsViewProps> = ({ healthcare, data }) => {
  const { age: ageCol, gender: genderCol, raceEthnicity: raceCol, language: langCol } = healthcare;
  const [harmonizeGender, setHarmonizeGender] = useState<boolean>(true);

  // Age statistics and cohorting
  const ageData = useMemo(() => {
    if (!ageCol) return null;
    const ages = data
      .map((r) => Number(r[ageCol]))
      .filter((v) => !isNaN(v) && v >= 0);

    if (ages.length === 0) return null;

    const sum = ages.reduce((acc, v) => acc + v, 0);
    const avg = sum / ages.length;
    const sorted = [...ages].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    // Standard cohorts
    const cohorts = [
      { label: '0-17 (Pediatric)', min: 0, max: 17, count: 0 },
      { label: '18-34 (Young Adult)', min: 18, max: 34, count: 0 },
      { label: '35-49 (Adult)', min: 35, max: 49, count: 0 },
      { label: '50-64 (Middle-Aged)', min: 50, max: 64, count: 0 },
      { label: '65+ (Senior)', min: 65, max: 150, count: 0 },
    ];

    for (const a of ages) {
      for (const c of cohorts) {
        if (a >= c.min && a <= c.max) {
          c.count++;
          break;
        }
      }
    }

    return {
      avg,
      median,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      cohorts,
      total: ages.length,
    };
  }, [ageCol, data]);

  // Gender analytics (Harmonized canonical groups & Raw variations)
  const genderAnalytics = useMemo(() => {
    if (!genderCol) return null;

    const rawCounts: Record<string, number> = {};
    const harmonizedCounts: Record<string, number> = {};
    const variantsMap: Record<string, Record<string, number>> = {};
    let total = 0;

    for (const r of data) {
      const g = r[genderCol];
      if (g !== null && g !== undefined && g !== '') {
        const rawStr = String(g).trim();
        rawCounts[rawStr] = (rawCounts[rawStr] || 0) + 1;

        const std = standardizeGender(rawStr);
        harmonizedCounts[std] = (harmonizedCounts[std] || 0) + 1;

        if (!variantsMap[std]) variantsMap[std] = {};
        variantsMap[std][rawStr] = (variantsMap[std][rawStr] || 0) + 1;

        total++;
      }
    }

    const rawSummary = Object.entries(rawCounts)
      .map(([cat, count]) => ({
        cat,
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const harmonizedSummary = Object.entries(harmonizedCounts)
      .map(([cat, count]) => ({
        cat,
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
        variants: variantsMap[cat] || {},
        hasMultipleVariants: Object.keys(variantsMap[cat] || {}).length > 1,
      }))
      .sort((a, b) => b.count - a.count);

    const hadInconsistencies = rawSummary.length > harmonizedSummary.length;

    return {
      rawSummary,
      harmonizedSummary,
      hadInconsistencies,
      rawCategoriesCount: rawSummary.length,
      harmonizedCategoriesCount: harmonizedSummary.length,
      total,
    };
  }, [genderCol, data]);

  // Race / Ethnicity summary (with title casing normalization)
  const raceSummary = useMemo(() => {
    if (!raceCol) return null;
    const counts: Record<string, number> = {};
    let total = 0;
    for (const r of data) {
      const v = r[raceCol];
      if (v) {
        const str = toTitleCase(String(v).trim());
        counts[str] = (counts[str] || 0) + 1;
        total++;
      }
    }
    return Object.entries(counts)
      .map(([cat, count]) => ({
        cat,
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [raceCol, data]);

  // Language summary (with title casing normalization)
  const langSummary = useMemo(() => {
    if (!langCol) return null;
    const counts: Record<string, number> = {};
    let total = 0;
    for (const r of data) {
      const v = r[langCol];
      if (v) {
        const str = toTitleCase(String(v).trim());
        counts[str] = (counts[str] || 0) + 1;
        total++;
      }
    }
    return Object.entries(counts)
      .map(([cat, count]) => ({
        cat,
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [langCol, data]);

  const hasAnyDemog = ageCol || genderCol || raceCol || langCol;

  if (!hasAnyDemog) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-800">No Demographic Columns Detected</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          The uploaded dataset does not contain recognizable demographic columns (Age, Gender, Race/Ethnicity,
          Language). General distributions can be explored in the EDA tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="demographics-view">
      {/* 1. Age Cohorts & Distribution */}
      {ageData && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm" id="age-cohorts-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Age Demographics & Cohort Stratification
              </h3>
              <p className="text-xs text-slate-500">Based on dynamic field: {ageCol}</p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Average</span>
                <span className="font-bold text-slate-800">{ageData.avg.toFixed(1)} yrs</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Median</span>
                <span className="font-bold text-slate-800">{ageData.median.toFixed(1)} yrs</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Min</span>
                <span className="font-bold text-slate-800">{ageData.min} yrs</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Max</span>
                <span className="font-bold text-slate-800">{ageData.max} yrs</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {ageData.cohorts.map((c) => {
              const pct = (c.count / Math.max(1, ageData.total)) * 100;
              return (
                <div key={c.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700">{c.label}</span>
                    <span className="text-slate-500 font-mono">
                      {c.count.toLocaleString()} patients ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div style={{ width: `${pct}%` }} className="bg-blue-600 h-full rounded-full transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Gender & Race/Ethnicity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Gender Breakdown */}
        {genderAnalytics && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm" id="gender-breakdown-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  Gender Composition ({genderCol})
                  {harmonizeGender && genderAnalytics.hadInconsistencies && (
                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded border border-emerald-200 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Harmonized
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {harmonizeGender
                    ? `${genderAnalytics.harmonizedCategoriesCount} canonical cohorts (casing & short-codes unified)`
                    : `${genderAnalytics.rawCategoriesCount} literal raw string variants in dataset`}
                </p>
              </div>

              {/* View Toggle if multiple raw variants were present */}
              {genderAnalytics.hadInconsistencies && (
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium self-start sm:self-auto">
                  <button
                    onClick={() => setHarmonizeGender(true)}
                    className={`px-2 py-1 rounded-md transition ${
                      harmonizeGender
                        ? 'bg-white text-blue-600 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Harmonized
                  </button>
                  <button
                    onClick={() => setHarmonizeGender(false)}
                    className={`px-2 py-1 rounded-md transition ${
                      !harmonizeGender
                        ? 'bg-white text-blue-600 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Raw ({genderAnalytics.rawCategoriesCount})
                  </button>
                </div>
              )}
            </div>

            {/* Harmonization Notice */}
            {harmonizeGender && genderAnalytics.hadInconsistencies && (
              <div className="mb-3.5 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Inconsistencies Harmonized:</strong> Variations such as{' '}
                  <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-[10px]">FEMALE</code>,{' '}
                  <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-[10px]">Female</code>, and{' '}
                  <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-[10px]">F</code> are combined into
                  canonical groups to prevent duplicate reporting.
                </div>
              </div>
            )}

            <div className="space-y-3">
              {(harmonizeGender ? genderAnalytics.harmonizedSummary : genderAnalytics.rawSummary).map((g: any) => {
                const variantEntries = g.variants ? Object.entries(g.variants as Record<string, number>) : [];
                return (
                  <div key={g.cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-800 font-semibold">{g.cat}</span>
                        {harmonizeGender && g.hasMultipleVariants && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({variantEntries.length} variants merged)
                          </span>
                        )}
                      </div>
                      <span className="text-slate-600 font-mono font-semibold">
                        {g.count.toLocaleString()}{' '}
                        <span className="text-slate-400 font-normal">({g.pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        style={{ width: `${g.pct}%` }}
                        className="bg-emerald-600 h-full rounded-full transition-all"
                      />
                    </div>

                    {/* Sub-variant counts if merged */}
                    {harmonizeGender && g.hasMultipleVariants && (
                      <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2.5 gap-y-0.5 pt-0.5">
                        {variantEntries.map(([vName, vCount]) => (
                          <span key={vName}>
                            <span className="font-mono text-slate-600">{vName}</span>: {vCount.toLocaleString()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Race / Ethnicity Breakdown */}
        {raceSummary && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm" id="race-breakdown-card">
            <h4 className="text-sm font-bold text-slate-900 mb-3">Race & Ethnicity ({raceCol})</h4>
            <div className="space-y-3">
              {raceSummary.slice(0, 7).map((r) => (
                <div key={r.cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700 truncate max-w-[200px]">{r.cat}</span>
                    <span className="text-slate-500 font-mono">
                      {r.count.toLocaleString()} ({r.pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div style={{ width: `${r.pct}%` }} className="bg-indigo-600 h-full rounded-full transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Primary Language */}
      {langSummary && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm" id="language-card">
          <h4 className="text-sm font-bold text-slate-900 mb-3">Primary Language Diversity ({langCol})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {langSummary.map((l) => (
              <div key={l.cat} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-xs font-semibold text-slate-800 block truncate">{l.cat}</span>
                <span className="text-base font-bold text-blue-600 font-mono">{l.count.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 block">{l.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
