import React, { useState } from 'react';
import api from '../services/api';
import { Download, Calendar, FileSpreadsheet, AlertCircle } from 'lucide-react';

const Export = () => {
  const [txStartDate, setTxStartDate] = useState('');
  const [txEndDate, setTxEndDate] = useState('');
  
  const [testStartDate, setTestStartDate] = useState('');
  const [testEndDate, setTestEndDate] = useState('');

  const [loadingTx, setLoadingTx] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);
  const [error, setError] = useState('');

  const handleTxExport = async (e) => {
    e.preventDefault();
    if (!txStartDate || !txEndDate) {
      setError('Please choose both start and end dates.');
      return;
    }
    
    setError('');
    setLoadingTx(true);
    try {
      const token = localStorage.getItem('jyothi_token');
      // Directly download the CSV file from browser using an anchor tag containing authorization headers
      const downloadUrl = `http://localhost:5000/api/export/transactions?startDate=${txStartDate}&endDate=${txEndDate}&token=${token}`;
      
      // To ensure authorization works when triggering download, we fetch it or use standard window open.
      // Since express route has authMiddleware, let's download the blob using axios and trigger download in JS!
      // This is extremely professional because it keeps our security headers 100% active and secure!
      const res = await api.get(`/export/transactions?startDate=${txStartDate}&endDate=${txEndDate}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Transactions_${txStartDate}_to_${txEndDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      setError('Export failed. Ensure the server has records for this range.');
    } finally {
      setLoadingTx(false);
    }
  };

  const handleTestExport = async (e) => {
    e.preventDefault();
    if (!testStartDate || !testEndDate) {
      setError('Please choose both start and end dates.');
      return;
    }

    setError('');
    setLoadingTest(true);
    try {
      const res = await api.get(`/export/tests?startDate=${testStartDate}&endDate=${testEndDate}`, {
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `TestWiseVolumes_${testStartDate}_to_${testEndDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      setError('Export failed. Check connection.');
    } finally {
      setLoadingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Data Export Center</h1>
        <p className="text-sm text-navy-500 dark:text-navy-450">Download diagnostic tests volume logs and business ledger sheets in Excel CSV formats.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400 max-w-xl">
          <AlertCircle size={18} className="shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Grid of export cards */}
      <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
        
        {/* Card 1: Transactions ledger */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-navy-850 dark:bg-navy-900 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-coral-50 p-2.5 text-coral-500 dark:bg-coral-950/20">
                <FileSpreadsheet size={20} />
              </div>
              <h3 className="font-bold text-base text-navy-900 dark:text-white">Billing & Revenue Ledger</h3>
            </div>
            <p className="text-xs text-navy-450 dark:text-navy-550 leading-relaxed">
              Export comprehensive billing data including invoice totals, GST tax amounts, discounts applied, and paid/due statuses.
            </p>

            {/* Form */}
            <form onSubmit={handleTxExport} className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-navy-450 uppercase block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={txStartDate}
                    onChange={(e) => setTxStartDate(e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs focus:outline-none dark:border-navy-850 dark:bg-navy-950"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-navy-450 uppercase block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={txEndDate}
                    onChange={(e) => setTxEndDate(e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs focus:outline-none dark:border-navy-850 dark:bg-navy-950"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingTx}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-coral-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-coral-500/10 hover:bg-coral-600 disabled:opacity-50 transition-all mt-4"
              >
                {loadingTx ? (
                  <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent"></div>
                ) : (
                  <>
                    <Download size={14} />
                    <span>Download Ledger CSV</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Card 2: Test volume logs */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-navy-850 dark:bg-navy-900 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-rose-50 p-2.5 text-coral-500 dark:bg-coral-950/20">
                <Download size={20} />
              </div>
              <h3 className="font-bold text-base text-navy-900 dark:text-white">Diagnostic Volume Logs</h3>
            </div>
            <p className="text-xs text-navy-450 dark:text-navy-550 leading-relaxed">
              Export diagnostic test statistics showing total times each test code was ordered and total revenue accrued.
            </p>

            {/* Form */}
            <form onSubmit={handleTestExport} className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-navy-450 uppercase block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={testStartDate}
                    onChange={(e) => setTestStartDate(e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs focus:outline-none dark:border-navy-850 dark:bg-navy-950"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-navy-450 uppercase block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={testEndDate}
                    onChange={(e) => setTestEndDate(e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs focus:outline-none dark:border-navy-850 dark:bg-navy-950"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingTest}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-coral-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-coral-500/10 hover:bg-coral-600 disabled:opacity-50 transition-all mt-4"
              >
                {loadingTest ? (
                  <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent"></div>
                ) : (
                  <>
                    <Download size={14} />
                    <span>Download Test Volume CSV</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Export;
