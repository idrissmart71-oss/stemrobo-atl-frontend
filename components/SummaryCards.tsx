
import React from 'react';
import { formatINR } from '../constants';
import { ATLSummary } from '../types';

interface SummaryCardsProps {
  summary: ATLSummary;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <p className="text-slate-500 text-sm font-medium mb-1">Total Sanctioned</p>
        <p className="text-2xl font-bold text-slate-900">{formatINR(summary.totalSanctioned)}</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <p className="text-slate-500 text-sm font-medium mb-1">Total Utilized</p>
        <p className="text-2xl font-bold text-indigo-600">{formatINR(summary.totalUtilized)}</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <p className="text-slate-500 text-sm font-medium mb-1">Current Balance</p>
        <p className="text-2xl font-bold text-emerald-600">{formatINR(summary.balance)}</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <p className="text-slate-500 text-sm font-medium mb-1">Utilization Rate</p>
        <div className="flex items-center">
          <p className="text-2xl font-bold text-slate-900">
            {((summary.totalUtilized / summary.totalSanctioned) * 100).toFixed(1)}%
          </p>
          <div className="ml-3 w-full bg-slate-100 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full" 
              style={{ width: `${Math.min(100, (summary.totalUtilized / summary.totalSanctioned) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
