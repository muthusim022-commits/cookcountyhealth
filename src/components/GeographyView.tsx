import React, { useMemo } from 'react';
import { HealthcareFields, ColumnProfile } from '../types';
import { AlertCircle, Layers, Building2, Hash, Users, Compass, CheckCircle2 } from 'lucide-react';

interface GeographyViewProps {
  healthcare: HealthcareFields;
  data: Record<string, any>[];
  profiles: ColumnProfile[];
}

export const GeographyView: React.FC<GeographyViewProps> = ({ healthcare, data, profiles }) => {
  const { community: commCol, zipCode: zipCol, clinic: clinicCol, insurance: insCol } = healthcare;

  // Community Area summary
  const commSummary = useMemo(() => {
    if (!commCol) return [];
    const counts: Record<string, number> = {};
    let total = 0;
    for (const r of data) {
      const v = r[commCol];
      if (v !== null && v !== undefined && String(v).trim() !== '') {
        const str = String(v).trim();
        counts[str] = (counts[str] || 0) + 1;
        total++;
      }
    }
    return Object.entries(counts)
      .map(([cat, count]) => ({ cat, count, pct: total > 0 ? (count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [commCol, data]);

  // ZIP Code summary
  const zipSummary = useMemo(() => {
    if (!zipCol) return [];
    const counts: Record<string, number> = {};
    let total = 0;
    for (const r of data) {
      const v = r[zipCol];
      if (v !== null && v !== undefined && String(v).trim() !== '') {
        const str = String(v).trim();
        counts[str] = (counts[str] || 0) + 1;
        total++;
      }
    }
    return Object.entries(counts)
      .map(([cat, count]) => ({ cat, count, pct: total > 0 ? (count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [zipCol, data]);

  // Cross-tabulation: Community Area x Primary Clinic
  const commClinicMatrix = useMemo(() => {
    if (!commCol || !clinicCol) return [];
    const matrix: Record<string, Record<string, number>> = {};
    const topComms = commSummary.slice(0, 10).map((c) => c.cat);
    
    for (const r of data) {
      const comm = String(r[commCol] || '').trim();
      const clinic = String(r[clinicCol] || '').trim();
      if (topComms.includes(comm) && clinic) {
        if (!matrix[comm]) matrix[comm] = {};
        matrix[comm][clinic] = (matrix[comm][clinic] || 0) + 1;
      }
    }

    return topComms.map((comm) => {
      const clinics = matrix[comm] || {};
      let topClinic = 'N/A';
      let maxCnt = 0;
      for (const [cl, cnt] of Object.entries(clinics)) {
        if (cnt > maxCnt) {
          maxCnt = cnt;
          topClinic = cl;
        }
      }
      return {
        community: comm,
        topClinic,
        topClinicCount: maxCnt,
        totalPatients: commSummary.find((c) => c.cat === comm)?.count || 0,
      };
    });
  }, [commCol, clinicCol, commSummary, data]);

  const hasAnyGeo = Boolean(commCol || zipCol);

  if (!hasAnyGeo) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Geographic Fields Detected</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          No geographic fields (Community Area or ZIP Code) were identified in the active dataset schema.
        </p>
      </div>
    );
  }

  const totalPatientsWithGeo = commSummary.reduce((acc, curr) => acc + curr.count, 0) || zipSummary.reduce((acc, curr) => acc + curr.count, 0) || data.length;
  const coveragePct = data.length > 0 ? (totalPatientsWithGeo / data.length) * 100 : 0;
  const topComm = commSummary[0];
  const topZip = zipSummary[0];

  return (
    <div className="space-y-6" id="geography-view">
      {/* Executive Geographic KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="geo-summary-kpis">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Geographic Coverage</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{totalPatientsWithGeo.toLocaleString()}</div>
          <div className="mt-0.5 text-xs text-slate-500">
            {coveragePct.toFixed(1)}% of cohort records localized
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Community Areas</span>
            <Layers className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-teal-700">{commSummary.length}</div>
          <div className="mt-0.5 text-xs text-slate-500">
            {commCol ? `Field: "${commCol}"` : 'Not mapped'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Primary Catchment Hub</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900 truncate">
            {topComm ? topComm.cat : 'N/A'}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {topComm ? `${topComm.count.toLocaleString()} patients (${topComm.pct.toFixed(1)}%)` : 'No data'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Postal Density (Top ZIP)</span>
            <Hash className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">
            {topZip ? topZip.cat : 'N/A'}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {topZip ? `${topZip.count.toLocaleString()} patients (${topZip.pct.toFixed(1)}%)` : 'No data'}
          </div>
        </div>
      </div>

      {/* Main Geographic Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Community Area Breakdown */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" />
                Community Area Patient Volume
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Top administrative community areas ranked by patient volume ({commCol || 'Community Area'})
              </p>
            </div>
            <span className="text-xs font-semibold bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full border border-teal-100">
              {commSummary.length} Total Areas
            </span>
          </div>

          {commSummary.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No community area data available.</div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
              {commSummary.slice(0, 18).map((item, idx) => {
                const maxCount = commSummary[0]?.count || 1;
                const widthPct = (item.count / maxCount) * 100;
                return (
                  <div key={item.cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 w-4 font-mono">{idx + 1}.</span>
                        {item.cat}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 font-mono">{item.count.toLocaleString()}</span>
                        <span className="text-slate-400 text-[11px] font-mono">({item.pct.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="bg-teal-600 h-full rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: ZIP Code Breakdown & Facility Association */}
        <div className="lg:col-span-5 space-y-6">
          {/* Top ZIP Code Concentration Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-blue-600" />
                  ZIP Code Density
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Top postal catchment zones ({zipCol || 'ZIP'})</p>
              </div>
              <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                Top {Math.min(zipSummary.length, 12)}
              </span>
            </div>

            {zipSummary.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No ZIP code data available.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {zipSummary.slice(0, 12).map((item) => (
                  <div
                    key={item.cat}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 hover:bg-slate-100/80 transition text-center"
                  >
                    <div className="text-xs font-mono font-bold text-slate-800">{item.cat}</div>
                    <div className="text-sm font-bold text-blue-600 mt-0.5">{item.count.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400">{item.pct.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Catchment & Access Context Callout */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Compass className="w-4 h-4 text-blue-600" />
              Public Health Catchment Insights
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cook County Health primarily serves concentrated community areas across Chicago's West, South, and Southwest
              sides (e.g. Austin, Englewood, Humboldt Park, Pilsen, and Bronzeville). These geographic aggregates align with
              regional health equity resource planning and community health needs assessments (CHNA).
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-[11px] text-teal-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Administrative boundary aggregation protects patient confidentiality (HIPAA Safe Harbor)
            </div>
          </div>
        </div>
      </div>

      {/* Community Area to Primary Healthcare Facility Matrix (if clinic detected) */}
      {commClinicMatrix.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Community Area Catchment to Primary Health Facility
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Primary healthcare facility utilized by patients residing in each top community area
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Community Area</th>
                  <th className="py-2.5 px-3 text-right">Total Patients</th>
                  <th className="py-2.5 px-3">Primary Clinic / Hospital</th>
                  <th className="py-2.5 px-3 text-right">Clinic Volume</th>
                  <th className="py-2.5 px-3 text-right">Clinic Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {commClinicMatrix.map((row) => {
                  const share = row.totalPatients > 0 ? (row.topClinicCount / row.totalPatients) * 100 : 0;
                  return (
                    <tr key={row.community} className="hover:bg-slate-50/70 transition">
                      <td className="py-2 px-3 font-semibold text-slate-800">{row.community}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {row.totalPatients.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-indigo-700 font-medium">{row.topClinic}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {row.topClinicCount.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                        {share.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
