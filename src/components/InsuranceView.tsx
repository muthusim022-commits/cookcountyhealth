import React, { useMemo, useState } from 'react';
import { HealthcareFields } from '../types';
import { CreditCard, AlertCircle, ShieldCheck, BarChart3, Table as TableIcon, HeartPulse, Sparkles } from 'lucide-react';
import { classifyPayerCategory, toTitleCase } from '../clientAnalytics';

interface InsuranceViewProps {
  healthcare: HealthcareFields;
  data: Record<string, any>[];
}

export const InsuranceView: React.FC<InsuranceViewProps> = ({ healthcare, data }) => {
  const { insurance: insCol, age: ageCol, clinic: clinicCol } = healthcare;
  const [distributionView, setDistributionView] = useState<'chart' | 'table'>('chart');

  // Individual payer program summary
  const payerSummary = useMemo(() => {
    if (!insCol) return null;
    const counts: Record<string, number> = {};
    let total = 0;
    for (const r of data) {
      const v = r[insCol];
      if (v !== null && v !== undefined && v !== '') {
        const str = toTitleCase(String(v).trim());
        counts[str] = (counts[str] || 0) + 1;
        total++;
      }
    }
    const items = Object.entries(counts)
      .map(([cat, count]) => {
        const pct = total > 0 ? (count / total) * 100 : 0;
        const meta = classifyPayerCategory(cat);
        return {
          cat,
          count,
          pct,
          ...meta,
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      items,
      total,
      topPayer: items[0]?.cat || 'None',
      topShare: items[0]?.pct || 0,
    };
  }, [insCol, data]);

  // Macro Payer Classification (Public / Commercial / Self-Pay)
  const macroClassification = useMemo(() => {
    if (!payerSummary) return null;

    let publicCount = 0;
    let commercialCount = 0;
    let selfPayCount = 0;

    for (const item of payerSummary.items) {
      if (item.category === 'Public / Government') {
        publicCount += item.count;
      } else if (item.category === 'Uninsured / Self-Pay') {
        selfPayCount += item.count;
      } else {
        commercialCount += item.count;
      }
    }

    const total = payerSummary.total;
    const publicPct = total > 0 ? (publicCount / total) * 100 : 0;
    const commercialPct = total > 0 ? (commercialCount / total) * 100 : 0;
    const selfPayPct = total > 0 ? (selfPayCount / total) * 100 : 0;
    const safetyNetBurdenPct = publicPct + selfPayPct;

    return {
      publicCount,
      publicPct,
      commercialCount,
      commercialPct,
      selfPayCount,
      selfPayPct,
      safetyNetBurdenPct,
      total,
    };
  }, [payerSummary]);

  // Cross-dimensional Profile: Payer × Demographics & Facility
  const crossProfile = useMemo(() => {
    if (!insCol) return [];
    const map: Record<
      string,
      {
        payer: string;
        ages: number[];
        clinics: Record<string, number>;
        count: number;
      }
    > = {};

    for (const r of data) {
      const p = r[insCol];
      if (p !== null && p !== undefined && p !== '') {
        const payerName = toTitleCase(String(p).trim());
        if (!map[payerName]) {
          map[payerName] = { payer: payerName, ages: [], clinics: {}, count: 0 };
        }
        map[payerName].count++;

        if (ageCol) {
          const a = Number(r[ageCol]);
          if (!isNaN(a) && a >= 0) {
            map[payerName].ages.push(a);
          }
        }

        if (clinicCol && r[clinicCol]) {
          const c = String(r[clinicCol]).trim();
          map[payerName].clinics[c] = (map[payerName].clinics[c] || 0) + 1;
        }
      }
    }

    return Object.values(map)
      .map((entry) => {
        const meta = classifyPayerCategory(entry.payer);
        const hasAges = entry.ages.length > 0;
        const avgAge = hasAges ? entry.ages.reduce((acc, v) => acc + v, 0) / entry.ages.length : null;
        const sortedAges = hasAges ? [...entry.ages].sort((x, y) => x - y) : [];
        const medianAge = hasAges ? sortedAges[Math.floor(sortedAges.length / 2)] : null;
        const minAge = hasAges ? sortedAges[0] : null;
        const maxAge = hasAges ? sortedAges[sortedAges.length - 1] : null;

        // Top clinic for this payer
        let topClinic = '—';
        let topClinicCount = 0;
        for (const [cName, cCount] of Object.entries(entry.clinics)) {
          if (cCount > topClinicCount) {
            topClinic = cName;
            topClinicCount = cCount;
          }
        }

        const pct = payerSummary ? (entry.count / Math.max(1, payerSummary.total)) * 100 : 0;

        return {
          payer: entry.payer,
          count: entry.count,
          pct,
          category: meta.category,
          tag: meta.tag,
          color: meta.color,
          badgeBg: meta.badgeBg,
          avgAge,
          medianAge,
          minAge,
          maxAge,
          topClinic,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [insCol, ageCol, clinicCol, data, payerSummary]);

  if (!insCol || !payerSummary) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-800">No Insurance Column Detected</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          The uploaded dataset does not contain an insurance or payer column. Upload a dataset with columns such as
          'Insurance', 'Payer', or 'Coverage' to activate this module.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="insurance-view">
      {/* 1. Executive Metric Scorecards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5" id="insurance-scorecard">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-blue-600" />
            Active Coverage Plans
          </div>
          <div className="text-2xl font-bold text-slate-900">{payerSummary.items.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">Identified payer classifications</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Dominant Plan</div>
          <div className="text-lg font-bold text-slate-900 truncate" title={payerSummary.topPayer}>
            {payerSummary.topPayer}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {payerSummary.topShare.toFixed(1)}% of all insured records
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Safety-Net Rate
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {macroClassification?.safetyNetBurdenPct.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Public programs & uninsured volume</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Valid Records</div>
          <div className="text-2xl font-bold text-slate-900">{payerSummary.total.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-0.5">With non-null payer documentation</div>
        </div>
      </div>

      {/* 2. Primary Analysis Grid: Plan Distribution + Macro Safety-Net Classification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Coverage Payer Mix (with Bar/Table Toggle instead of redundant side-by-side) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-sm" id="payer-distribution-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Coverage Payer Mix ({insCol})
              </h4>
              <p className="text-[11px] text-slate-500">
                Volume and percentage distribution across individual insurance programs
              </p>
            </div>

            {/* View format switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium self-start sm:self-auto">
              <button
                onClick={() => setDistributionView('chart')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition ${
                  distributionView === 'chart'
                    ? 'bg-white text-blue-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Visual distribution bars"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Bars
              </button>
              <button
                onClick={() => setDistributionView('table')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition ${
                  distributionView === 'table'
                    ? 'bg-white text-blue-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tabular summary"
              >
                <TableIcon className="w-3.5 h-3.5" />
                Table
              </button>
            </div>
          </div>

          {distributionView === 'chart' ? (
            <div className="space-y-3">
              {payerSummary.items.map((item) => (
                <div key={item.cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-800 font-semibold">{item.cat}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${item.badgeBg}`}>
                        {item.tag}
                      </span>
                    </div>
                    <span className="text-slate-600 font-mono">
                      {item.count.toLocaleString()} <span className="text-slate-400 font-normal">({item.pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                      className="h-full rounded-full transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="px-3 py-2">Coverage Program</th>
                    <th className="px-3 py-2">Classification</th>
                    <th className="px-3 py-2 text-right">Patients</th>
                    <th className="px-3 py-2 text-right">Share %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payerSummary.items.map((item) => (
                    <tr key={item.cat} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-medium text-slate-800">{item.cat}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${item.badgeBg}`}>
                          {item.tag}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-700 font-semibold">
                        {item.count.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">{item.pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Macro Safety-Net Classification & Public Health System Split */}
        {macroClassification && (
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between" id="macro-payer-card">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-blue-600" />
                  Payer Category Macro Split
                </h4>
                <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                  Public Health Mix
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-4">
                Cook County Health safety-net mission breakdown across governmental, commercial, and uninsured patient cohorts.
              </p>

              {/* Multi-segment stacked distribution bar */}
              <div className="space-y-1.5 mb-5">
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Macro Composition</span>
                  <span className="font-mono">100.0%</span>
                </div>
                <div className="w-full h-4 bg-slate-100 rounded-lg overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${macroClassification.publicPct}%` }}
                    className="bg-blue-600 h-full transition-all"
                    title={`Public / Government: ${macroClassification.publicPct.toFixed(1)}%`}
                  />
                  <div
                    style={{ width: `${macroClassification.commercialPct}%` }}
                    className="bg-emerald-600 h-full transition-all"
                    title={`Commercial / Private: ${macroClassification.commercialPct.toFixed(1)}%`}
                  />
                  <div
                    style={{ width: `${macroClassification.selfPayPct}%` }}
                    className="bg-orange-500 h-full transition-all"
                    title={`Uninsured / Self-Pay: ${macroClassification.selfPayPct.toFixed(1)}%`}
                  />
                </div>
              </div>

              {/* Macro categories */}
              <div className="space-y-2.5">
                <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Public / Government</div>
                      <div className="text-[10px] text-slate-500">Medicaid, CountyCare, Medicare, CHIP</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-blue-700">
                      {macroClassification.publicCount.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {macroClassification.publicPct.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-emerald-100 bg-emerald-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Commercial / Private</div>
                      <div className="text-[10px] text-slate-500">Employer PPO, HMO, Commercial Plans</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-emerald-700">
                      {macroClassification.commercialCount.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {macroClassification.commercialPct.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-orange-100 bg-orange-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Uninsured / Self-Pay</div>
                      <div className="text-[10px] text-slate-500">Self-Pay, Charity Care, Sliding Scale</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-orange-700">
                      {macroClassification.selfPayCount.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {macroClassification.selfPayPct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Safety-Net Mission Insight */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-800">Public Health Insight: </span>
              {macroClassification.safetyNetBurdenPct >= 50 ? (
                <span>
                  Safety-net programs account for{' '}
                  <strong className="text-blue-700">{macroClassification.safetyNetBurdenPct.toFixed(1)}%</strong> of total patient coverage, reflecting the health system's core public safety-net mission.
                </span>
              ) : (
                <span>
                  Commercial coverage represents{' '}
                  <strong className="text-emerald-700">{macroClassification.commercialPct.toFixed(1)}%</strong> of the active patient census.
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Cross-Tabulation Profile: Payer × Demographics (Non-redundant operational matrix) */}
      {crossProfile.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm" id="cross-profile-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Payer Demographics & Clinical Utilization Profile
              </h4>
              <p className="text-[11px] text-slate-500">
                Cross-dimensional correlation of coverage types with patient age and primary clinical access points
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="px-3.5 py-2.5">Coverage Program</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5 text-right">Patients</th>
                  <th className="px-3 py-2.5 text-right">Share %</th>
                  {ageCol && <th className="px-3 py-2.5 text-right">Mean Age</th>}
                  {ageCol && <th className="px-3 py-2.5 text-right">Median Age</th>}
                  {ageCol && <th className="px-3 py-2.5 text-right">Age Span</th>}
                  {clinicCol && <th className="px-3.5 py-2.5">Top Facility Access</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {crossProfile.map((row) => (
                  <tr key={row.payer} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3.5 py-2.5 font-semibold text-slate-900">{row.payer}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${row.badgeBg}`}>
                        {row.tag}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-800 font-semibold">
                      {row.count.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">{row.pct.toFixed(1)}%</td>
                    {ageCol && (
                      <td className="px-3 py-2.5 text-right font-mono text-blue-600 font-semibold">
                        {row.avgAge !== null ? `${row.avgAge.toFixed(1)} yrs` : '—'}
                      </td>
                    )}
                    {ageCol && (
                      <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                        {row.medianAge !== null ? `${row.medianAge.toFixed(1)} yrs` : '—'}
                      </td>
                    )}
                    {ageCol && (
                      <td className="px-3 py-2.5 text-right font-mono text-slate-400">
                        {row.minAge !== null && row.maxAge !== null ? `${row.minAge}–${row.maxAge} yrs` : '—'}
                      </td>
                    )}
                    {clinicCol && (
                      <td className="px-3.5 py-2.5 text-slate-700 truncate max-w-[200px]">
                        {row.topClinic}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
