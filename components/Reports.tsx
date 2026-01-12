
import React from 'react';
import { BRAND_HEADER, BRAND_FOOTER, StemroboLogo, formatINR } from '../constants';
import { Transaction, ATLSummary, ComplianceCheck, AuditObservation } from '../types';

interface ReportProps {
  transactions: Transaction[];
  summary: ATLSummary;
  schoolName: string;
  checklist?: ComplianceCheck[];
  observations?: AuditObservation[];
}

export const UtilisationCertificate: React.FC<ReportProps> = ({ summary, schoolName }) => {
  const fy = "FY 2023-24";
  return (
    <div className="bg-white p-12 shadow-lg border border-slate-200 max-w-4xl mx-auto print:shadow-none print:border-none my-8">
      <div className="flex justify-between items-start mb-8 border-b pb-4">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{BRAND_HEADER}</p>
          <h1 className="text-xl font-bold text-slate-900 mt-2">FORM GFR 12-A</h1>
          <p className="text-lg font-semibold mt-1">Utilisation Certificate (UC)</p>
        </div>
        <StemroboLogo />
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-slate-800">
        <p>Certified that out of <span className="font-bold">{formatINR(summary.totalSanctioned)}</span> sanctioned for <span className="font-bold underline">{schoolName}</span>, a sum of <span className="font-bold">{formatINR(summary.totalUtilized)}</span> has been utilized. The unspent balance of <span className="font-bold">{formatINR(summary.balance)}</span> is being carried forward / refunded.</p>

        <table className="w-full border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-50">
              <th className="border p-2 text-left">Component</th>
              <th className="border p-2 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border p-2">Grant General (Recurring)</td><td className="border p-2 text-right">{formatINR(summary.recurringUtilized)}</td></tr>
            <tr><td className="border p-2">Capital Assets (Non-Recurring)</td><td className="border p-2 text-right">{formatINR(summary.nonRecurringUtilized)}</td></tr>
            <tr><td className="border p-2">Interest Earned</td><td className="border p-2 text-right text-emerald-600">{formatINR(summary.interestEarned)}</td></tr>
            <tr className="font-bold bg-slate-50"><td className="border p-2">Total Utilization</td><td className="border p-2 text-right">{formatINR(summary.totalUtilized)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="mt-12 pt-12 flex justify-between">
        <div className="text-center w-48 border-t border-slate-400 pt-2 font-bold">Principal Seal</div>
        <div className="text-center w-48 border-t border-slate-400 pt-2 font-bold">CA Signature</div>
      </div>
    </div>
  );
};

export const AuditIntelligenceReport: React.FC<ReportProps> = ({ transactions, checklist, observations }) => {
  return (
    <div className="bg-slate-50 p-10 border border-slate-200 max-w-4xl mx-auto my-8 print:bg-white">
      <div className="flex justify-between border-b pb-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900 uppercase">Audit Intelligence Summary</h2>
        <StemroboLogo />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-bold text-slate-700 mb-3 text-sm flex items-center">
            <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
            COMPLIANCE CHECKLIST
          </h3>
          <div className="space-y-2">
            {checklist?.map((check, i) => (
              <div key={i} className="flex items-start bg-white p-3 rounded border border-slate-100 shadow-sm">
                <span className="mr-3 mt-0.5">
                  {check.status === 'Compliant' ? '✔' : check.status === 'Warning' ? '⚠' : '❌'}
                </span>
                <div>
                  <p className="font-bold text-xs">{check.label}</p>
                  <p className="text-[10px] text-slate-500">{check.comment}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-slate-700 mb-3 text-sm flex items-center">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
            RISK OBSERVATIONS
          </h3>
          <div className="space-y-2">
            {observations?.map((obs, i) => (
              <div key={i} className={`p-3 rounded border shadow-sm ${obs.severity === 'HIGH' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
                <div className="flex justify-between mb-1">
                  <span className={`text-[9px] font-bold px-1.5 rounded uppercase ${obs.severity === 'HIGH' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-700'}`}>{obs.severity}</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">{obs.type}</span>
                </div>
                <p className="text-xs font-bold text-slate-800">{obs.observation}</p>
                <p className="text-[10px] text-slate-600 italic mt-1">Rec: {obs.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h3 className="font-bold text-slate-700 mb-3 text-sm">EVIDENCE & TRACEABILITY MAP</h3>
      <table className="w-full text-[10px] border-collapse bg-white">
        <thead>
          <tr className="bg-slate-100">
            <th className="border p-2 text-left">Ref/Date</th>
            <th className="border p-2 text-left">Evidence/Narration</th>
            <th className="border p-2 text-center">Status</th>
            <th className="border p-2 text-right">Risk</th>
          </tr>
        </thead>
        <tbody>
          {transactions.slice(0, 15).map((t, i) => (
            <tr key={i} className="hover:bg-slate-50 transition-colors">
              <td className="border p-2 font-mono">{t.date}</td>
              <td className="border p-2">
                <p className="font-bold">{t.narration}</p>
                <p className="text-slate-400">Voucher: {t.voucherNo || 'N/A'} | GST: {t.gstNo || 'N/A'}</p>
              </td>
              <td className="border p-2 text-center">
                <span className={`px-1 rounded-full ${t.verificationStatus === 'Verified' ? 'text-emerald-600' : 'text-amber-600'}`}>● {t.verificationStatus}</span>
              </td>
              <td className={`border p-2 text-right font-bold ${t.riskScore === 'HIGH' ? 'text-red-600' : 'text-slate-400'}`}>{t.riskScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-8 text-center text-[9px] opacity-40 uppercase tracking-tighter">{BRAND_FOOTER}</div>
    </div>
  );
};
