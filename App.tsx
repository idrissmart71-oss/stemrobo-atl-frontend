import React, { useState, useMemo, useRef } from 'react';
import { createWorker } from 'tesseract.js';
import { 
  Transaction, 
  ATLSummary, 
  TrancheType, 
  ExpenseCategory,
  AuditObservation,
  ComplianceCheck,
  RiskLevel
} from './types';
import { 
  ATL_FUNDING_LIMITS, 
  formatINR,
  BRAND_FOOTER
} from './constants';
import { analyzeTransactionsAI } from './services/geminiService';
import { SummaryCards } from './components/SummaryCards';
import { UtilisationCertificate, AuditIntelligenceReport } from './components/Reports';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'reports'>('dashboard');
  const [mode, setMode] = useState<'Auditor' | 'School'>('School');
  const [accountType, setAccountType] = useState<'Savings' | 'Current'>('Savings');
  const [schoolName, setSchoolName] = useState('Central Academy Senior Secondary School');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [observations, setObservations] = useState<AuditObservation[]>([]);
  const [checklist, setChecklist] = useState<ComplianceCheck[]>([]);

  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const summary = useMemo<ATLSummary>(() => {
    const limits = accountType === 'Current' ? ATL_FUNDING_LIMITS.NET_WITH_TDS : ATL_FUNDING_LIMITS.GROSS;
    
    const totalSanctioned = ATL_FUNDING_LIMITS.GROSS.TOTAL;
    
    const debits = transactions.filter(t => t.type === 'Debit' && t.category !== ExpenseCategory.INELIGIBLE);
    const credits = transactions.filter(t => t.type === 'Credit' || t.category === ExpenseCategory.INTEREST || t.category === ExpenseCategory.GRANT_RECEIPT);
    
    const totalUtilized = debits.reduce((acc, t) => acc + t.amount, 0);
    const nonRecurringUtilized = debits.filter(t => t.category === ExpenseCategory.NON_RECURRING).reduce((acc, t) => acc + t.amount, 0);
    const recurringUtilized = debits.filter(t => t.category === ExpenseCategory.RECURRING).reduce((acc, t) => acc + t.amount, 0);
    const interestEarned = credits.filter(t => t.category === ExpenseCategory.INTEREST).reduce((acc, t) => acc + t.amount, 0);

    const nonRecCap = limits.T1_NON_RECURRING;
    const overspentNR = nonRecurringUtilized > nonRecCap;
    
    const highRiskCount = transactions.filter(t => t.riskScore === 'HIGH').length;
    let riskScore: RiskLevel = 'LOW';
    if (highRiskCount > 0 || overspentNR) riskScore = 'HIGH';
    else if (transactions.filter(t => t.riskScore === 'MEDIUM').length > 3) riskScore = 'MEDIUM';

    const trancheBreakdown = {
      [TrancheType.TRANCHE_1]: { received: limits.TRANCHE_1, spent: 0 },
      [TrancheType.TRANCHE_2]: { received: limits.TRANCHE_2, spent: 0 },
      [TrancheType.TRANCHE_3]: { received: limits.TRANCHE_3, spent: 0 },
      [TrancheType.NONE]: { received: 0, spent: 0 },
    };

    debits.forEach(t => { if (trancheBreakdown[t.tranche]) trancheBreakdown[t.tranche].spent += t.amount; });

    const totalReceivedNet = (limits.TRANCHE_1 + limits.TRANCHE_2 + limits.TRANCHE_3);
    const currentBalance = totalReceivedNet + interestEarned - totalUtilized;

    return { 
      totalSanctioned, 
      totalUtilized, 
      nonRecurringUtilized, 
      recurringUtilized, 
      balance: currentBalance, 
      interestEarned, 
      riskScore, 
      trancheBreakdown 
    };
  }, [transactions, accountType]);

  // OCR function using Tesseract.js
  const extractTextFromFile = async (file: File): Promise<string> => {
    setOcrProgress(0);
    console.log('🔍 Starting Tesseract OCR...');
    console.log('File:', file.name, 'Type:', file.type, 'Size:', file.size);
    
    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          console.log('Tesseract:', m);
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });

      console.log('✅ Tesseract worker created');
      
      const { data: { text } } = await worker.recognize(file);
      
      console.log('✅ OCR complete, text length:', text.length);
      console.log('First 200 chars:', text.substring(0, 200));
      
      await worker.terminate();
      setOcrProgress(0);
      
      return text;
    } catch (error: any) {
      console.error('❌ OCR Error:', error);
      setOcrProgress(0);
      throw new Error(`OCR failed: ${error.message}`);
    }
  };

  const handleProcess = async () => {
    if (!inputText.trim() && !selectedFile) return;
    setIsProcessing(true);
    
    try {
      let textToAnalyze = inputText.trim();

      // If file selected, extract text using Tesseract OCR
      if (selectedFile) {
        console.log('📄 File selected, extracting text with Tesseract OCR...');
        textToAnalyze = await extractTextFromFile(selectedFile);
        console.log('✅ OCR completed, extracted', textToAnalyze.length, 'characters');
        
        if (!textToAnalyze || textToAnalyze.length < 50) {
          alert('Could not extract readable text from the file. Please ensure the image/PDF is clear.');
          return;
        }
      }

      // Send text to Gemini for analysis
      const result = await analyzeTransactionsAI(
        textToAnalyze,
        undefined, // No file data needed anymore
        mode,
        accountType
      );
      
      const mappedTransactions = result.transactions.map((t: any, idx: number) => ({ 
        ...t, 
        id: `txn-${Date.now()}-${idx}` 
      }));
      
      setTransactions(prev => [...prev, ...mappedTransactions]);
      setObservations(result.observations || []);
      setChecklist(result.complianceChecklist || []);
      
      setInputText('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setActiveTab('transactions');
    } catch (error: any) {
      alert(error.message || 'Analysis failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setOcrProgress(0);
    }
  };

  const chartData = [
    { 
      name: 'Non-Recurring (Capital)', 
      spent: summary.nonRecurringUtilized, 
      budget: accountType === 'Current' ? ATL_FUNDING_LIMITS.NET_WITH_TDS.T1_NON_RECURRING : ATL_FUNDING_LIMITS.GROSS.T1_NON_RECURRING 
    },
    { 
      name: 'Recurring (Ops)', 
      spent: summary.recurringUtilized, 
      budget: 1000000 
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <nav className="bg-slate-900 text-white p-4 sticky top-0 z-50 no-print border-b border-indigo-500/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
              <span className="text-white font-black text-xl">SR</span>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none uppercase">STEMROBO</h1>
              <p className="text-[9px] tracking-[0.2em] opacity-60 uppercase font-black">Audit Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
             <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
               <button onClick={() => setAccountType('Savings')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${accountType === 'Savings' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>SAVINGS</button>
               <button onClick={() => setAccountType('Current')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${accountType === 'Current' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>CURRENT (TDS)</button>
             </div>
             <div className="w-px h-6 bg-slate-700 hidden md:block" />
             <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
               <button onClick={() => setMode('School')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'School' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>SCHOOL</button>
               <button onClick={() => setMode('Auditor')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'Auditor' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>AUDITOR</button>
             </div>
             <div className="w-px h-6 bg-slate-700 hidden md:block" />
             <div className="flex space-x-1 bg-white/5 p-1 rounded-xl">
               {(['dashboard', 'transactions', 'reports'] as const).map(tab => (
                 <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === tab ? 'bg-indigo-600 text-white' : 'hover:bg-white/10 text-slate-400'}`}>{tab}</button>
               ))}
             </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 leading-tight">ATL Grant Management</h2>
                <p className="text-slate-500 font-medium">Account: <span className="font-bold text-slate-900">{accountType}</span> | Mode: <span className="font-bold text-slate-900">{mode}</span></p>
              </div>
              <div className={`px-4 py-2 rounded-2xl border-2 flex items-center space-x-3 ${summary.riskScore === 'HIGH' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                <div className={`w-3 h-3 rounded-full animate-pulse ${summary.riskScore === 'HIGH' ? 'bg-red-600' : 'bg-emerald-600'}`}></div>
                <span className="text-xs font-black uppercase tracking-widest">Compliance Level: {summary.riskScore}</span>
              </div>
            </div>

            <SummaryCards summary={summary} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-xl shadow-indigo-900/5 border border-slate-100">
                <div className="flex justify-between items-start mb-8">
                  <h3 className="font-black text-slate-900 uppercase tracking-tighter text-lg">Grant Allocation Split (Tranche 1)</h3>
                  <div className="flex space-x-4 text-[10px] font-bold uppercase tracking-widest">
                    <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-indigo-600 mr-2"></div> Capital Fund</span>
                    <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div> Operational Fund</span>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="spent" radius={[8, 8, 0, 0]} barSize={60}>
                        {chartData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={index === 0 ? (entry.spent > entry.budget ? '#dc2626' : '#4f46e5') : '#10b981'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 p-5 bg-indigo-50 rounded-2xl space-y-2">
                   <div className="flex justify-between text-[11px] font-bold text-indigo-900 uppercase">
                     <span>T1 Recurring (Ops): ₹2,00,000</span>
                     <span>T1 Non-Recurring (Capital): {accountType === 'Current' ? '₹9,76,000 (Net)' : '₹10,00,000 (Gross)'}</span>
                   </div>
                   <div className="w-full h-1 bg-indigo-200 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600" style={{ width: accountType === 'Current' ? '83%' : '83.3%' }}></div>
                   </div>
                   <p className="text-[10px] text-indigo-400 font-medium italic">Note: TDS is deducted from the Capital/Non-Recurring portion only.</p>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-2xl shadow-indigo-900/20">
                <h3 className="font-black uppercase tracking-tighter text-lg mb-6">Audit Engine</h3>
                <div className="space-y-6">
                  <div onClick={() => fileInputRef.current?.click()} className="group border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center cursor-pointer hover:border-indigo-500 transition-all bg-slate-800/50">
                    <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])} className="hidden" accept="application/pdf,image/*" />
                    <div className="text-slate-500 group-hover:text-indigo-400 transition-colors">
                      <svg className="w-10 h-10 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      <p className="text-xs font-bold uppercase">{selectedFile ? selectedFile.name : 'Upload PDF/Image'}</p>
                      <p className="text-[10px] mt-1 opacity-50">FREE OCR - No billing required</p>
                    </div>
                  </div>
                  
                  {ocrProgress > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-indigo-400 font-bold">Extracting Text...</span>
                        <span className="text-slate-400">{ocrProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${ocrProgress}%` }}></div>
                      </div>
                    </div>
                  )}
                  
                  <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Or paste transaction text directly..." className="w-full h-24 bg-slate-800 border border-slate-700 rounded-xl p-4 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-slate-300" />
                  <button onClick={handleProcess} disabled={isProcessing || (!inputText.trim() && !selectedFile)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/20 transition-all disabled:opacity-50">
                    {isProcessing ? (ocrProgress > 0 ? `OCR: ${ocrProgress}%` : "Analyzing...") : `Analyze ${accountType} Audit`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200 border border-slate-100 overflow-hidden">
             <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
               <div>
                 <h2 className="text-xl font-black text-slate-900 uppercase">Financial Traceability</h2>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                   {accountType} Audit Context | Cap Check: {accountType === 'Current' ? '9.76L' : '10L'}
                 </p>
               </div>
               <button onClick={() => { setTransactions([]); setObservations([]); setChecklist([]); }} className="text-xs font-black text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl transition-all uppercase">Purge Registry</button>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-xs font-medium">
                 <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest">
                   <tr>
                     <th className="p-6">Date</th>
                     <th className="p-6">Traceable Narration</th>
                     <th className="p-6 text-right">Amount (₹)</th>
                     <th className="p-6">Audit Category</th>
                     <th className="p-6 text-center">Verification</th>
                     <th className="p-6 text-right">Audit Severity</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {transactions.map((txn) => (
                     <tr key={txn.id} className="group hover:bg-slate-50/50 transition-colors">
                       <td className="p-6">
                         <p className="text-slate-900 font-bold">{txn.date}</p>
                         <p className="text-[10px] text-slate-400 uppercase font-black">{txn.financialYear}</p>
                       </td>
                       <td className="p-6">
                         <p className="font-bold text-slate-800 mb-1">{txn.narration}</p>
                         <div className="flex space-x-2 text-[9px] font-black uppercase tracking-tighter">
                           <span className="text-indigo-600">GST: {txn.gstNo || 'MISSING'}</span>
                           <span className="text-slate-400">VOUCHER: {txn.voucherNo || 'PENDING'}</span>
                         </div>
                       </td>
                       <td className={`p-6 text-right font-black ${txn.type === 'Debit' ? 'text-slate-900' : 'text-emerald-600'}`}>
                         {txn.type === 'Debit' ? '-' : '+'}{formatINR(txn.amount)}
                       </td>
                       <td className="p-6">
                         <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                           txn.category === ExpenseCategory.NON_RECURRING ? 'bg-indigo-100 text-indigo-700' : 
                           txn.category === ExpenseCategory.RECURRING ? 'bg-emerald-100 text-emerald-700' : 
                           txn.category === ExpenseCategory.GRANT_RECEIPT ? 'bg-slate-900 text-white' :
                           'bg-red-50 text-red-600'
                         }`}>{txn.category}</span>
                       </td>
                       <td className="p-6 text-center">
                         <div className={`text-[10px] font-black uppercase tracking-tighter ${txn.verificationStatus === 'Verified' ? 'text-emerald-500' : 'text-amber-500'}`}>{txn.verificationStatus}</div>
                       </td>
                       <td className="p-6 text-right">
                         <div className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                           txn.riskScore === 'HIGH' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 
                           txn.riskScore === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 
                           'bg-slate-100 text-slate-400'
                         }`}>{txn.riskScore}</div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-12">
            <div className="flex justify-between items-center no-print px-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase">Official Export Center</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  Budget: ₹2L Recurring | {accountType === 'Current' ? '₹9.76L' : '₹10L'} Capital (Non-Rec)
                </p>
              </div>
              <button onClick={() => window.print()} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-500/30 hover:scale-105 transition-all">Export To PDF</button>
            </div>
            <div className="space-y-12">
               <UtilisationCertificate transactions={transactions} summary={summary} schoolName={schoolName} />
               <AuditIntelligenceReport transactions={transactions} summary={summary} schoolName={schoolName} checklist={checklist} observations={observations} />
            </div>
          </div>
        )}
      </main>

      <footer className="bg-slate-950 text-slate-500 p-12 no-print border-t border-slate-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="max-w-xs">
            <div className="flex items-center space-x-2 mb-6">
              <div className="bg-indigo-600 p-1 rounded">
                <span className="text-white font-black text-sm">SR</span>
              </div>
              <p className="font-black text-white text-lg tracking-tight uppercase">STEMROBO</p>
            </div>
            <p className="text-xs leading-relaxed opacity-50 font-medium">
              ATL Audit Intelligence Engine with FREE OCR. Enforcing NITI Aayog capital expenditure caps and TDS reconciliation protocols.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-12 text-[10px] font-black uppercase tracking-widest">
             <div className="space-y-4">
               <p className="text-slate-100">Audit Protocol</p>
               <ul className="space-y-2 opacity-50"><li>NITI Aayog AIM Guidelines</li><li>Capital Fund Caps</li><li>PFMS Compliance</li></ul>
             </div>
             <div className="space-y-4">
               <p className="text-slate-100">Support</p>
               <ul className="space-y-2 opacity-50"><li>STEMROBO Compliance</li><li>TDS Reconciliation</li><li>Audit Documentation</li></ul>
             </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-900 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.3em] opacity-30">
          <span>{BRAND_FOOTER}</span>
          <span>© 2024 STEMROBO TECHNOLOGIES PVT. LTD.</span>
        </div>
      </footer>
    </div>
  );
};

export default App;