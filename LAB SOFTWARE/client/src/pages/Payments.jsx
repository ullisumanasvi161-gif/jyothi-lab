import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Search, Download, Calendar, ArrowUpDown, ChevronLeft, 
  ChevronRight, CreditCard, FileSpreadsheet, IndianRupee,
  Printer, X, Check, FileText
} from 'lucide-react';

const Payments = () => {
  const [activeTab, setActiveTab] = useState('history'); // 'history' or 'dues'
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Stats
  const [totalCollected, setTotalCollected] = useState(0);

  // Receipt Preview Modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptBill, setReceiptBill] = useState(null);
  const [fetchingBillId, setFetchingBillId] = useState(null);
  const [receiptHeader, setReceiptHeader] = useState({
    labName: 'Jyothi Lab',
    tagline: 'Precision Diagnostics, Care & Trust',
    address: '12-34 Main Road, Opp Metro, Hyderabad',
    phone: '+91 98765 43210',
    email: 'info@jyothilab.com',
    gstin: '36AAAAA1111A1Z1'
  });

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data && res.data.receipt_header) {
        setReceiptHeader(res.data.receipt_header);
      }
    } catch (err) {
      console.error('Failed to fetch receipt settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Filters from the UI
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('All');
  const [search, setSearch] = useState('');

  // Pagination & limits
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Dues States
  const [dues, setDues] = useState([]);
  const [duesLoading, setDuesLoading] = useState(false);
  const [totalOutstandingDues, setTotalOutstandingDues] = useState(0);
  const [duesSearch, setDuesSearch] = useState('');
  const [duesPage, setDuesPage] = useState(1);
  const [duesLimit, setDuesLimit] = useState(10);
  const [duesTotalPages, setDuesTotalPages] = useState(1);
  const [duesTotalItems, setDuesTotalItems] = useState(0);

  // Dues Collection Modal
  const [selectedDuePatient, setSelectedDuePatient] = useState(null); // holds patient info
  const [patientBills, setPatientBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);
  
  // Inline collection state inside modal
  const [activeCollectBillId, setActiveCollectBillId] = useState(null); // which bill we are paying
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('Cash');
  const [collectTxId, setCollectTxId] = useState('');
  const [collectLoading, setCollectLoading] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError('');
      
      const queryParams = new URLSearchParams({
        page,
        limit,
        fromDate,
        toDate,
        search,
        paymentMethod
      });

      const response = await api.get(`/bills/payments?${queryParams.toString()}`);
      setPayments(response.data.payments);
      setTotalPages(response.data.totalPages);
      setTotalItems(response.data.total);
      setTotalCollected(response.data.totalAmountCollected);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve payment history.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDues = async () => {
    try {
      setDuesLoading(true);
      setError('');
      const queryParams = new URLSearchParams({
        page: duesPage,
        limit: duesLimit,
        search: duesSearch
      });
      const response = await api.get(`/bills/dues?${queryParams.toString()}`);
      setDues(response.data.dues);
      setDuesTotalPages(response.data.totalPages);
      setDuesTotalItems(response.data.total);
      setTotalOutstandingDues(response.data.totalOutstandingDues);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve outstanding dues.');
    } finally {
      setDuesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchPayments();
    } else {
      fetchDues();
    }
  }, [page, limit, paymentMethod, activeTab, duesPage, duesLimit]);

  const handleDuesSearchSubmit = (e) => {
    e.preventDefault();
    setDuesPage(1);
    fetchDues();
  };

  const handleOpenCollectModal = async (patient) => {
    setSelectedDuePatient(patient);
    setPatientBills([]);
    setActiveCollectBillId(null);
    setCollectAmount('');
    setCollectTxId('');
    setCollectMethod('Cash');
    
    try {
      setLoadingBills(true);
      const res = await api.get(`/bills/patient/${patient.patient_id}/dues`);
      setPatientBills(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to retrieve patient due bills.');
    } finally {
      setLoadingBills(false);
    }
  };

  const handleStartCollect = (bill) => {
    setActiveCollectBillId(bill.id);
    setCollectAmount(bill.due_amount.toString());
    setCollectTxId('');
    setCollectMethod('Cash');
  };

  const handleSaveCollectPayment = async (e, billId) => {
    e.preventDefault();
    const amt = parseFloat(collectAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    try {
      setCollectLoading(true);
      await api.post(`/bills/${billId}/payments`, {
        amount: amt,
        payment_method: collectMethod,
        transaction_id: collectTxId
      });
      
      // Refresh patient bills inside modal
      const res = await api.get(`/bills/patient/${selectedDuePatient.patient_id}/dues`);
      setPatientBills(res.data);
      setActiveCollectBillId(null);
      setCollectAmount('');
      setCollectTxId('');
      
      // Refresh list
      fetchDues();
      fetchPayments();
      
      alert('Payment collected successfully!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to record payment.');
    } finally {
      setCollectLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  const handleViewReceipt = async (billId) => {
    try {
      setFetchingBillId(billId);
      const res = await api.get(`/bills/${billId}`);
      setReceiptBill(res.data);
      setShowReceiptModal(true);
    } catch (err) {
      console.error(err);
      alert('Failed to retrieve receipt details.');
    } finally {
      setFetchingBillId(null);
    }
  };

  const handlePrintReceipt = () => {
    const printContent = document.getElementById('receipt-print-area').innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
      <style>
        @media print {
          body { background: white; color: black; padding: 20px; font-family: monospace; }
          .no-print { display: none; }
        }
      </style>
      <div>${printContent}</div>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  const downloadCSV = () => {
    if (payments.length === 0) return;
    
    // CSV headers
    const headers = ['Sr. No.', 'Payment Date', 'Patient Name (Paid By)', 'Bill Number', 'Payment Method', 'Amount (INR)'];
    
    // CSV rows
    const rows = payments.map((p, idx) => [
      totalItems - ((page - 1) * limit + idx),
      new Date(p.payment_date).toLocaleDateString('en-GB'),
      p.patient_name,
      p.bill_number,
      p.payment_method,
      parseFloat(p.payment_amount || 0).toFixed(2)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `JyothiLab_Payment_History_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Payment History</h1>
        <p className="text-sm text-navy-500 dark:text-navy-450">Track billing collection records, monitor daily revenue totals, and export payments audit trails.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 dark:border-navy-800">
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-4 px-6 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-coral-500 text-coral-500'
              : 'border-transparent text-navy-450 hover:text-navy-900 dark:hover:text-white'
          }`}
        >
          Payment Collection History
        </button>
        <button
          onClick={() => setActiveTab('dues')}
          className={`pb-4 px-6 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'dues'
              ? 'border-coral-500 text-coral-500'
              : 'border-transparent text-navy-450 hover:text-navy-900 dark:hover:text-white'
          }`}
        >
          Outstanding Patient Dues
        </button>
      </div>

      {activeTab === 'history' ? (
        <>
          {/* Stats Cards & Date Filters */}
          <div className="grid gap-6 md:grid-cols-4">
            {/* Total Collected Stat */}
            <div className="md:col-span-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-navy-850 dark:bg-navy-900 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider dark:text-navy-400">Total Filtered Collection</p>
                <h3 className="text-2xl font-extrabold text-coral-500 mt-2">₹{parseFloat(totalCollected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
              </div>
              <p className="text-xs text-navy-400 dark:text-navy-500 mt-4">Based on active search filters</p>
            </div>

            {/* Date Filters Panel */}
            <div className="md:col-span-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-navy-850 dark:bg-navy-900">
              <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="text-xs font-bold text-navy-500 uppercase tracking-wider block mb-1">From Date</label>
                  <div className="relative flex items-center">
                    <Calendar size={16} className="absolute left-3 text-navy-400 pointer-events-none" />
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <label className="text-xs font-bold text-navy-500 uppercase tracking-wider block mb-1">To Date</label>
                  <div className="relative flex items-center">
                    <Calendar size={16} className="absolute left-3 text-navy-400 pointer-events-none" />
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    className="rounded-lg bg-coral-500 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-coral-500/20 hover:bg-coral-600 transition-all"
                  >
                    Search
                  </button>
                  
                  <select
                    value={paymentMethod}
                    onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                  >
                    <option value="All">Total Payment Collection</option>
                    <option value="Cash">Cash Payments</option>
                    <option value="Card">Card Payments</option>
                    <option value="UPI">UPI Payments</option>
                    <option value="Net Banking">Net Banking</option>
                  </select>

                  <button
                    type="button"
                    onClick={downloadCSV}
                    disabled={payments.length === 0}
                    className="flex items-center justify-center gap-2 rounded-lg bg-coral-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-coral-500/20 hover:bg-coral-600 disabled:opacity-50 transition-all"
                  >
                    <Download size={16} />
                    <span>Download</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Main Table Container */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-850 dark:bg-navy-900">
            {/* Table Top Controls */}
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-navy-850">
              <div className="flex items-center gap-2">
                <span className="text-sm text-navy-500 dark:text-navy-450">Show</span>
                <select
                  value={limit}
                  onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-navy-500 dark:text-navy-450">entries</span>
              </div>

              <form onSubmit={handleSearchSubmit} className="relative flex items-center max-w-xs w-full">
                <Search size={16} className="absolute left-3 text-navy-400" />
                <input
                  type="text"
                  placeholder="Search patients, bills..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); }}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </form>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-navy-500 uppercase tracking-wider dark:border-navy-800 dark:bg-navy-900/50 dark:text-navy-400">
                    <th className="px-6 py-4">Sr. No</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Paid By (Patient Name)</th>
                    <th className="px-6 py-4">Bill No</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4">Total Amount</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-navy-800 dark:divide-navy-850 dark:text-navy-200">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-coral-500 border-t-transparent"></div>
                      </td>
                    </tr>
                  ) : payments.length > 0 ? (
                    payments.map((p, idx) => {
                      const srNo = totalItems - ((page - 1) * limit + idx);
                      return (
                        <tr key={p.payment_id} className="hover:bg-slate-50/50 dark:hover:bg-navy-800/30 transition-colors">
                          <td className="px-6 py-4 font-semibold text-navy-500 dark:text-navy-400">{srNo}</td>
                          <td className="px-6 py-4">
                            {new Date(p.payment_date).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 font-bold text-navy-900 dark:text-white">
                            <div>{p.patient_name}</div>
                            <div className="text-[11px] text-navy-400 font-normal font-mono">{p.patient_uhid}</div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-navy-700 dark:text-navy-300 font-mono text-xs">
                            {p.bill_number}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800 dark:bg-navy-800 dark:text-navy-300">
                              <CreditCard size={12} className="text-navy-550" />
                              <span>{p.payment_method}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-navy-900 dark:text-white">
                            ₹{parseFloat(p.payment_amount || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleViewReceipt(p.bill_id)}
                              disabled={fetchingBillId === p.bill_id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-850 transition-colors"
                            >
                              {fetchingBillId === p.bill_id ? (
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border border-coral-500 border-t-transparent"></div>
                              ) : (
                                <Printer size={12} />
                              )}
                              <span>Print Receipt</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-navy-450 dark:text-navy-500">
                        No payment collection records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 p-5 dark:border-navy-850">
                <span className="text-xs text-navy-500 dark:text-navy-400">
                  Showing page {page} of {totalPages} ({totalItems} transactions)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-50 dark:border-navy-800 dark:hover:bg-navy-800"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pNum = i + 1;
                    return (
                      <button
                        key={pNum}
                        onClick={() => setPage(pNum)}
                        className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                          page === pNum
                            ? 'bg-coral-500 text-white shadow-md'
                            : 'border border-slate-200 hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-800'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}

                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-50 dark:border-navy-800 dark:hover:bg-navy-800"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Stats Cards & Search Panel for Dues */}
          <div className="grid gap-6 md:grid-cols-4">
            {/* Total Outstanding Dues Stat */}
            <div className="md:col-span-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-navy-850 dark:bg-navy-900 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider dark:text-navy-400">Total Outstanding Dues</p>
                <h3 className="text-2xl font-extrabold text-rose-500 mt-2">₹{parseFloat(totalOutstandingDues || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
              </div>
              <p className="text-xs text-navy-400 dark:text-navy-500 mt-4">Unpaid or partially paid balances</p>
            </div>

            {/* Dues Search Panel */}
            <div className="md:col-span-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-navy-850 dark:bg-navy-900">
              <form onSubmit={handleDuesSearchSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="text-xs font-bold text-navy-500 uppercase tracking-wider block mb-1">Search Patient</label>
                  <div className="relative flex items-center">
                    <Search size={16} className="absolute left-3 text-navy-400" />
                    <input
                      type="text"
                      placeholder="Search by name, phone, or UHID..."
                      value={duesSearch}
                      onChange={(e) => setDuesSearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    className="rounded-lg bg-coral-500 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-coral-500/20 hover:bg-coral-600 transition-all"
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDuesSearch(''); setDuesPage(1); setTimeout(() => fetchDues(), 0); }}
                    className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-navy-800 dark:bg-navy-950 transition-all"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Dues Table Container */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-850 dark:bg-navy-900">
            {/* Table Top Controls */}
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-navy-850">
              <div className="flex items-center gap-2">
                <span className="text-sm text-navy-500 dark:text-navy-450">Show</span>
                <select
                  value={duesLimit}
                  onChange={(e) => { setDuesLimit(parseInt(e.target.value)); setDuesPage(1); }}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-navy-500 dark:text-navy-450">entries</span>
              </div>
            </div>

            {/* Dues Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-navy-500 uppercase tracking-wider dark:border-navy-800 dark:bg-navy-900/50 dark:text-navy-400">
                    <th className="px-6 py-4">Sr. No</th>
                    <th className="px-6 py-4">Patient Name</th>
                    <th className="px-6 py-4">UHID</th>
                    <th className="px-6 py-4">Phone Number</th>
                    <th className="px-6 py-4">Due Bills</th>
                    <th className="px-6 py-4">Total Outstanding Due</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-navy-800 dark:divide-navy-850 dark:text-navy-200">
                  {duesLoading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-coral-500 border-t-transparent"></div>
                      </td>
                    </tr>
                  ) : dues.length > 0 ? (
                    dues.map((d, idx) => {
                      const srNo = duesTotalItems - ((duesPage - 1) * duesLimit + idx);
                      return (
                        <tr key={d.patient_id} className="hover:bg-slate-50/50 dark:hover:bg-navy-800/30 transition-colors">
                          <td className="px-6 py-4 font-semibold text-navy-500 dark:text-navy-400">{srNo}</td>
                          <td className="px-6 py-4 font-bold text-navy-900 dark:text-white">
                            {d.patient_name}
                          </td>
                          <td className="px-6 py-4 font-semibold font-mono text-xs text-navy-700 dark:text-navy-300">
                            {d.patient_uhid}
                          </td>
                          <td className="px-6 py-4 text-navy-600 dark:text-navy-400">
                            {d.patient_phone || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-950/20 dark:text-rose-400">
                              {d.due_bills_count} {d.due_bills_count === 1 ? 'bill' : 'bills'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-extrabold text-rose-600 dark:text-rose-400">
                            ₹{parseFloat(d.total_due || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleOpenCollectModal(d)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 hover:bg-coral-600 text-white px-3.5 py-1.5 text-xs font-bold shadow-md shadow-coral-500/10 hover:shadow-coral-500/20 transition-all"
                            >
                              <IndianRupee size={12} />
                              <span>Collect Payment</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-navy-450 dark:text-navy-500">
                        No outstanding patient dues found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Dues Pagination Footer */}
            {duesTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 p-5 dark:border-navy-850">
                <span className="text-xs text-navy-500 dark:text-navy-400">
                  Showing page {duesPage} of {duesTotalPages} ({duesTotalItems} patients)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={duesPage === 1}
                    onClick={() => setDuesPage(p => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-50 dark:border-navy-800 dark:hover:bg-navy-800"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {Array.from({ length: duesTotalPages }).map((_, i) => {
                    const pNum = i + 1;
                    return (
                      <button
                        key={pNum}
                        onClick={() => setDuesPage(pNum)}
                        className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                          duesPage === pNum
                            ? 'bg-coral-500 text-white shadow-md'
                            : 'border border-slate-200 hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-800'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}

                  <button
                    disabled={duesPage === duesTotalPages}
                    onClick={() => setDuesPage(p => Math.min(duesTotalPages, p + 1))}
                    className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-50 dark:border-navy-800 dark:hover:bg-navy-800"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Collect Outstanding Dues Modal */}
      {selectedDuePatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-900 border border-slate-100 dark:border-navy-800 transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-navy-800">
              <div>
                <h2 className="text-lg font-bold text-navy-900 dark:text-white">Collect Outstanding Dues</h2>
                <p className="text-xs text-navy-450 dark:text-navy-500">View outstanding patient invoices and record new payment installments.</p>
              </div>
              <button 
                onClick={() => setSelectedDuePatient(null)}
                className="rounded-lg p-1.5 text-navy-400 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Patient Meta Summary */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-150 dark:bg-navy-950 dark:border-navy-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-navy-400 uppercase font-bold tracking-wider block">Patient Name</span>
                <span className="text-navy-900 font-bold dark:text-white text-sm">{selectedDuePatient.patient_name}</span>
              </div>
              <div>
                <span className="text-navy-400 uppercase font-bold tracking-wider block">Patient UHID</span>
                <span className="text-navy-900 font-semibold font-mono dark:text-white text-sm">{selectedDuePatient.patient_uhid}</span>
              </div>
              <div>
                <span className="text-navy-400 uppercase font-bold tracking-wider block">Outstanding Balance</span>
                <span className="text-rose-500 font-extrabold text-sm">₹{parseFloat(selectedDuePatient.total_due || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Due Bills List */}
            <div className="mt-6 space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {loadingBills ? (
                <div className="flex justify-center items-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral-500 border-t-transparent"></div>
                </div>
              ) : patientBills.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8 text-emerald-500 font-semibold">
                  <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center mb-3">
                    <Check size={24} className="text-emerald-550" />
                  </div>
                  <p className="text-sm">All invoices have been fully paid for this patient!</p>
                </div>
              ) : (
                patientBills.map((bill) => (
                  <div 
                    key={bill.id}
                    className="border border-slate-150 rounded-xl p-4 bg-white dark:border-navy-800 dark:bg-navy-900/50 space-y-3 shadow-sm hover:border-slate-200 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-navy-850 dark:text-white text-sm">{bill.bill_number}</span>
                          <span className="text-[10px] text-navy-450 font-semibold font-mono bg-slate-100 px-2 py-0.5 rounded dark:bg-navy-850 dark:text-navy-400">
                            {new Date(bill.created_at).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        <p className="text-xs text-navy-450 mt-1">Status: <span className="font-semibold text-rose-500">{bill.payment_status}</span></p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-navy-400 block uppercase tracking-wide">Remaining Due</span>
                        <span className="font-extrabold text-rose-600 dark:text-rose-400 text-sm">₹{parseFloat(bill.due_amount || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-dashed border-slate-100 dark:border-navy-800 text-[11px] text-navy-500">
                      <div>
                        Total: <span className="font-semibold text-navy-800 dark:text-white">₹{parseFloat(bill.net_amount).toFixed(2)}</span>
                      </div>
                      <div>
                        Paid: <span className="font-semibold text-emerald-600">₹{parseFloat(bill.paid_amount).toFixed(2)}</span>
                      </div>
                      <div>
                        Discount: <span className="font-semibold">₹{parseFloat(bill.discount_amount).toFixed(2)}</span>
                      </div>
                    </div>

                    {activeCollectBillId !== bill.id ? (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleStartCollect(bill)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-coral-500 hover:bg-coral-50 text-coral-500 px-3.5 py-1.5 text-xs font-bold transition-all dark:hover:bg-coral-500/10"
                        >
                          <IndianRupee size={12} />
                          <span>Record Installment</span>
                        </button>
                      </div>
                    ) : (
                      <form 
                        onSubmit={(e) => handleSaveCollectPayment(e, bill.id)} 
                        className="bg-slate-50 dark:bg-navy-950 p-4 rounded-xl border border-slate-200 dark:border-navy-800 space-y-4 transition-all"
                      >
                        <div className="text-xs font-bold text-navy-700 dark:text-white border-b border-slate-100 pb-2 dark:border-navy-800 uppercase tracking-wide">
                          Collect Installment Payment
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-navy-500 block mb-1">Payment Amount (INR)</label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              max={bill.due_amount}
                              required
                              value={collectAmount}
                              onChange={(e) => setCollectAmount(e.target.value)}
                              className="w-full rounded-lg border border-slate-250 bg-white px-3 py-2 text-xs focus:outline-none dark:border-navy-800 dark:bg-navy-900"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-navy-500 block mb-1">Payment Method</label>
                            <select
                              value={collectMethod}
                              onChange={(e) => setCollectMethod(e.target.value)}
                              className="w-full rounded-lg border border-slate-250 bg-white px-2.5 py-2 text-xs focus:outline-none dark:border-navy-800 dark:bg-navy-900"
                            >
                              <option>Cash</option>
                              <option>Card</option>
                              <option>UPI</option>
                              <option>Net Banking</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-navy-500 block mb-1">Transaction Ref ID (Optional)</label>
                            <input
                              type="text"
                              placeholder="Ref Number"
                              value={collectTxId}
                              onChange={(e) => setCollectTxId(e.target.value)}
                              className="w-full rounded-lg border border-slate-250 bg-white px-3 py-2 text-xs focus:outline-none dark:border-navy-800 dark:bg-navy-900"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setActiveCollectBillId(null)}
                            className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={collectLoading}
                            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/10 flex items-center gap-1.5 disabled:opacity-50 transition-all"
                          >
                            {collectLoading ? (
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent"></div>
                            ) : (
                              <>
                                <Check size={14} />
                                <span>Save Payment</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Controls */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-navy-800">
              <button
                onClick={() => setSelectedDuePatient(null)}
                className="rounded-lg border border-slate-200 px-6 py-2.5 text-xs font-semibold hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-850 text-center text-navy-700 dark:text-navy-300 transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice receipt printable modal */}
      {showReceiptModal && receiptBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-navy-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-navy-800 no-print">
              <h2 className="text-lg font-bold text-navy-900 dark:text-white">Receipt Preview</h2>
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="rounded-lg p-1 text-navy-400 hover:bg-slate-100 dark:hover:bg-navy-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Print Area */}
            <div id="receipt-print-area" className="py-4 font-mono text-xs text-navy-850 dark:text-white space-y-4">
              <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-300">
                <h3 className="text-lg font-extrabold">{(receiptHeader.labName || 'JYOTHI LAB').toUpperCase()}</h3>
                <p className="text-[10px]">{receiptHeader.tagline || 'Precision Diagnostics, Care & Trust'}</p>
                <p className="text-[9px]">{receiptHeader.address || '12-34 Main Road, Opp Metro, Hyderabad'}</p>
                <p className="text-[9px]">Phone: {receiptHeader.phone || '+91 98765 43210'} | GSTIN: {receiptHeader.gstin || '36AAAAA1111A1Z1'}</p>
              </div>

              {/* Patient Meta info */}
              <div className="grid grid-cols-2 gap-2 text-[10px] pb-4 border-b border-dashed border-slate-200">
                <p><strong>UHID     :</strong> {receiptBill.bill.patient_uhid}</p>
                <p><strong>Date     :</strong> {new Date(receiptBill.bill.created_at).toLocaleString()}</p>
                <p><strong>Name     :</strong> {receiptBill.bill.patient_name}</p>
                <p><strong>Bill No  :</strong> {receiptBill.bill.bill_number}</p>
                <p><strong>Age/Gen  :</strong> {receiptBill.bill.age} Yrs / {receiptBill.bill.gender}</p>
                <p><strong>Ref By   :</strong> {receiptBill.bill.doctor_name || 'Self'}</p>
              </div>

              {/* Items list */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold border-b border-slate-200 pb-1">
                  <span>TEST DESCRIPTION</span>
                  <span>PRICE (INR)</span>
                </div>
                {receiptBill.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-0.5">
                    <span>{item.test_name} ({item.test_code})</span>
                    <span>{parseFloat(item.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-slate-300 pt-3 space-y-1 text-right">
                <p>Subtotal: ₹{parseFloat(receiptBill.bill.total_amount).toFixed(2)}</p>
                <p>Discount: -₹{parseFloat(receiptBill.bill.discount_amount).toFixed(2)}</p>
                <p>GST Applied ({receiptBill.bill.gst_amount > 0 ? receiptBill.bill.gst_amount : '0'}): ₹{parseFloat(receiptBill.bill.gst_amount).toFixed(2)}</p>
                <p className="font-bold text-sm">Net Payable: ₹{parseFloat(receiptBill.bill.net_amount).toFixed(2)}</p>
                <p className="text-emerald-600 font-bold">Paid Amount: ₹{parseFloat(receiptBill.bill.paid_amount).toFixed(2)}</p>
                {receiptBill.bill.due_amount > 0 && (
                  <p className="text-rose-500 font-bold">Remaining Due: ₹{parseFloat(receiptBill.bill.due_amount).toFixed(2)}</p>
                )}
                <p className="text-[10px] text-slate-500">Method: {receiptBill.bill.payment_status} via {receiptBill.payments[0]?.payment_method || 'N/A'}</p>
              </div>

              <div className="text-center text-[10px] pt-4 border-t border-dashed border-slate-200 text-slate-500">
                <p>Thank you for choosing {receiptHeader.labName || 'Jyothi Lab'}.</p>
                <p>Access your reports online at www.{(receiptHeader.labName || 'jyothilab').toLowerCase().replace(/[^a-z0-9]/g, '')}.com/reports</p>
              </div>
            </div>

            {/* Modal Controls */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-navy-800 no-print">
              <button
                onClick={handlePrintReceipt}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-coral-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-coral-500/20 hover:bg-coral-600"
              >
                <Printer size={16} />
                <span>Print Thermal Copy</span>
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-850 text-center text-navy-700 dark:text-navy-300"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
