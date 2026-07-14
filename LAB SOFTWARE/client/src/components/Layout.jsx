import React, { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import useBarcodeScanner from '../hooks/useBarcodeScanner';
import api, { API_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Barcode from './Barcode';
import { 
  X, User, FileText, CreditCard, Activity, Check, Save, Clock, 
  CheckCircle2, AlertCircle, Printer, ShieldAlert, ArrowRight
} from 'lucide-react';

const Layout = () => {
  const { user, hasRole } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Barcode Lookup Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupType, setLookupType] = useState(''); // 'patient', 'bill', 'report'
  const [lookupData, setLookupData] = useState(null);

  // Bill payment states inside modal
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [transactionId, setTransactionId] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Report results entry states inside modal
  const [resultValues, setResultValues] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);

  // Global scanner callback handler (useCallback so useBarcodeScanner doesn't re-register on every render)
  const handleBarcodeScan = useCallback(async (scannedBarcode) => {
    const code = scannedBarcode.trim().toUpperCase();
    if (!code) return;

    setBarcode(code);
    setLookupLoading(true);
    setLookupError('');
    setLookupData(null);
    setLookupType('');
    setModalOpen(true);

    try {
      // Check if code is a report URL (from report's QR code)
      let isReportUrl = false;
      let reportIdFromUrl = null;
      const urlMatch = code.match(/\/REPORTS\/(?:VIEW\/)?(\d+)/i);
      if (urlMatch) {
        isReportUrl = true;
        reportIdFromUrl = urlMatch[1];
      }

      if (/^JL-/.test(code) && !/^JLB-/.test(code) && !/^JLR-/.test(code) && !/^JLS-/.test(code)) {
        // Patient barcode: JL-YYYYMMDD-XXXX
        const patRes = await api.get(`/patients/uhid/${encodeURIComponent(code)}`);
        const historyRes = await api.get(`/patients/${patRes.data.id}/history`);
        setLookupType('patient');
        setLookupData({ patient: patRes.data, history: historyRes.data });
      } else if (/^JLB-/.test(code)) {
        // Bill barcode: JLB-YYYYMMDD-XXXX
        const billRes = await api.get(`/bills/number/${encodeURIComponent(code)}`);
        setLookupType('bill');
        setLookupData(billRes.data);
        
        // Reset/pre-fill payment form fields
        setPaymentAmount(billRes.data.bill.due_amount || '');
        setPaymentMethod('Cash');
        setTransactionId('');
      } else if (/^JLR-/.test(code) || /^JLS-/.test(code) || isReportUrl) {
        // Report/Sample barcode: JLR-ID or JLS-ID or QR Code URL
        let id;
        if (isReportUrl) {
          id = reportIdFromUrl;
        } else {
          const parts = code.split('-');
          id = parts[1];
        }
        
        if (!id || isNaN(id)) {
          throw new Error('Invalid barcode format. Expected JLR-<number> or JLS-<number>.');
        }
        const reportRes = await api.get(`/reports/${id}`);
        setLookupType('report');
        setLookupData(reportRes.data);

        // Prepopulate results entry values
        const report = reportRes.data;
        const values = report.result_values || {};
        const parsedValues = {};
        const params = report.normal_range || [];
        params.forEach(p => {
          parsedValues[p.parameter] = values[p.parameter] !== undefined ? values[p.parameter] : '';
        });
        setResultValues(parsedValues);
      } else {
        throw new Error(`Unrecognized barcode: "${code}". Expected JL-, JLB-, JLR-, or JLS- prefix.`);
      }
    } catch (err) {
      console.error('Barcode lookup error:', err);
      setLookupError(err.response?.data?.error || err.message || 'Record not found in the database');
    } finally {
      setLookupLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bind hardware keyboard listener hook
  useBarcodeScanner(handleBarcodeScan);

  // Record payments inside the modal
  const handleAddPayment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    setPaymentLoading(true);
    try {
      await api.post(`/bills/${lookupData.bill.id}/payments`, {
        amount: amt,
        payment_method: paymentMethod,
        transaction_id: transactionId
      });
      // Re-fetch bill details to refresh the UI
      const billRes = await api.get(`/bills/number/${encodeURIComponent(barcode)}`);
      setLookupData(billRes.data);
      setPaymentAmount(billRes.data.bill.due_amount || '');
      setTransactionId('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Submit test results inside the modal
  const handleSaveReportResults = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await api.put(`/reports/${lookupData.id}/results`, { result_values: resultValues });
      // Re-fetch report details to refresh the UI
      const reportRes = await api.get(`/reports/${lookupData.id}`);
      setLookupData(reportRes.data);
      alert('Test parameters saved and submitted for pathologist sign-off.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save test values');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Sign off/Verify report inside the modal
  const handleApproveReport = async () => {
    setSubmitLoading(true);
    try {
      await api.put(`/reports/${lookupData.id}/approve`);
      // Re-fetch report details to refresh the UI
      const reportRes = await api.get(`/reports/${lookupData.id}`);
      setLookupData(reportRes.data);
      alert('Report verified, approved, and released successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve report');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-navy-950">
      {/* Sidebar mobile overlay backdrop */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-slate-900/55 backdrop-blur-xs transition-opacity sm:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Navbar with Barcode Search prop */}
        <Navbar onSearch={handleBarcodeScan} onMenuClick={() => setMobileSidebarOpen(true)} />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 text-navy-800 dark:text-navy-100">
          <Outlet />
        </main>
      </div>

      {/* Global Barcode Search Lookup Modal Overlay */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center bg-black/60 sm:p-4 backdrop-blur-sm">
          <div 
            className="fixed inset-0" 
            onClick={() => setModalOpen(false)}
          />
          
          {/* On mobile: bottom sheet. On desktop: centered modal */}
          <div className="relative z-10 flex flex-col w-full sm:max-w-3xl rounded-t-2xl sm:rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-navy-850 dark:bg-navy-900 overflow-hidden mt-auto sm:mt-0 max-h-[92vh] sm:max-h-[90vh]">
            {/* Drag handle for mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-navy-700"></div>
            </div>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 sm:px-6 py-3 sm:py-4 dark:border-navy-850">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-coral-500/10 text-coral-500">
                  <Activity size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy-900 dark:text-white">Barcode Quick Retrieval</h3>
                  <p className="text-xs text-navy-450 font-semibold font-mono uppercase">Code: {barcode}</p>
                </div>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-navy-400 hover:bg-slate-100 hover:text-navy-700 dark:hover:bg-navy-850 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body / Viewport */}
            <div className="flex-1 overflow-y-auto p-6">
              {lookupLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-coral-500 border-t-transparent"></div>
                  <p className="text-sm font-semibold text-navy-500 dark:text-navy-400">Fetching record details...</p>
                </div>
              ) : lookupError ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 rounded-full bg-rose-50 p-4 text-rose-500 dark:bg-rose-950/20">
                    <AlertCircle size={40} />
                  </div>
                  <h4 className="text-base font-bold text-navy-900 dark:text-white">Retrieval Failed</h4>
                  <p className="mt-1 text-sm text-navy-500 dark:text-navy-450 max-w-sm">{lookupError}</p>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="mt-6 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-navy-700 hover:bg-slate-200 dark:bg-navy-800 dark:text-navy-300 dark:hover:bg-navy-750"
                  >
                    Dismiss
                  </button>
                </div>
              ) : lookupData ? (
                <div className="space-y-6">
                  {/* Rendering conditional components depending on code lookup type */}

                  {/* 1. Patient Profile View */}
                  {lookupType === 'patient' && (
                    <div className="space-y-6">
                      <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-navy-800 dark:bg-navy-950/25 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coral-500 text-white font-bold text-lg uppercase">
                            {lookupData.patient.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-navy-900 dark:text-white">{lookupData.patient.name}</h4>
                            <p className="text-xs text-navy-450 font-semibold font-mono text-coral-500">{lookupData.patient.uhid}</p>
                          </div>
                        </div>
                        <Barcode value={lookupData.patient.uhid} height={30} />
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div className="rounded-lg border border-slate-100 p-3 dark:border-navy-850">
                          <span className="text-[10px] font-bold text-navy-400 uppercase">Gender / Age</span>
                          <p className="text-sm font-semibold mt-0.5">{lookupData.patient.gender} • {lookupData.patient.age} {lookupData.patient.age_unit}</p>
                        </div>
                        <div className="rounded-lg border border-slate-100 p-3 dark:border-navy-850">
                          <span className="text-[10px] font-bold text-navy-400 uppercase">Phone</span>
                          <p className="text-sm font-semibold mt-0.5">{lookupData.patient.phone}</p>
                        </div>
                        <div className="rounded-lg border border-slate-100 p-3 dark:border-navy-850">
                          <span className="text-[10px] font-bold text-navy-400 uppercase">Referral Doctor</span>
                          <p className="text-sm font-semibold mt-0.5 truncate">{lookupData.patient.referral_doctor_name || 'Self Registered'}</p>
                        </div>
                        <div className="rounded-lg border border-slate-100 p-3 dark:border-navy-850">
                          <span className="text-[10px] font-bold text-navy-400 uppercase">Patient Category</span>
                          <p className="text-sm font-semibold mt-0.5">{lookupData.patient.patient_type || 'General'}</p>
                        </div>
                      </div>

                      {/* Cashless/Insurance details if applicable */}
                      {lookupData.patient.patient_type === 'Insurance' && (
                        <div className="rounded-lg border border-teal-500/20 bg-teal-50/10 p-3 dark:bg-teal-950/5">
                          <h5 className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase mb-2">Insurance Policy Information</h5>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div><span className="text-navy-400">Provider:</span> <span className="font-semibold">{lookupData.patient.insurance_company}</span></div>
                            <div><span className="text-navy-400">Policy Holder:</span> <span className="font-semibold">{lookupData.patient.policy_holder_name}</span></div>
                            <div><span className="text-navy-400">Policy Number:</span> <span className="font-semibold font-mono">{lookupData.patient.policy_number}</span></div>
                            <div><span className="text-navy-400">Coverage Limit:</span> <span className="font-semibold text-coral-500">₹{lookupData.patient.coverage_amount}</span></div>
                          </div>
                        </div>
                      )}

                      {/* Patient Timeline */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-navy-400 uppercase tracking-wider">Clinical Timeline & Visits</h4>
                        
                        <div className="space-y-3">
                          {lookupData.history.bills.length === 0 ? (
                            <p className="text-sm text-navy-450 py-4 text-center">No historic transactions recorded for this patient.</p>
                          ) : (
                            lookupData.history.bills.map(bill => {
                              const relatedReports = lookupData.history.reports.filter(r => r.bill_id === bill.id);
                              return (
                                <div key={bill.id} className="rounded-xl border border-slate-150 p-4 hover:border-slate-300 dark:border-navy-800 dark:hover:border-navy-700 bg-white dark:bg-navy-950/20 space-y-3">
                                  <div className="flex items-center justify-between text-xs font-semibold">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-navy-900 dark:text-white">{bill.bill_number}</span>
                                      <span className="text-navy-400">{new Date(bill.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      bill.payment_status === 'Paid' 
                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' 
                                        : bill.payment_status === 'Partial'
                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20'
                                        : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20'
                                    }`}>
                                      {bill.payment_status}
                                    </span>
                                  </div>
                                  
                                  {/* Bill details */}
                                  <div className="flex justify-between items-center text-xs">
                                    <div>
                                      <span className="text-navy-450">Referral:</span> <span className="font-semibold text-navy-700 dark:text-navy-300">{bill.doctor_name || 'Self'}</span>
                                    </div>
                                    <div>
                                      <span className="text-navy-450">Net Amount:</span> <span className="font-bold text-navy-900 dark:text-white">₹{bill.net_amount.toFixed(2)}</span>
                                    </div>
                                  </div>

                                  {/* Test reports */}
                                  {relatedReports.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100 dark:border-navy-850 space-y-1.5">
                                      <span className="text-[10px] font-bold text-navy-450 uppercase block">Lab Investigations</span>
                                      <div className="flex flex-wrap gap-2">
                                        {relatedReports.map(rep => (
                                          <div 
                                            key={rep.id} 
                                            className="flex items-center gap-1.5 rounded bg-slate-100 px-2 py-1 text-xs dark:bg-navy-800"
                                          >
                                            <span className="font-semibold text-navy-700 dark:text-navy-300">{rep.test_name}</span>
                                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
                                              rep.status === 'Approved' ? 'text-emerald-500' : rep.status === 'Waiting' ? 'text-blue-500' : 'text-amber-500'
                                            }`}>
                                              • {rep.status}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Bill Invoice Receipt Preview */}
                  {lookupType === 'bill' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
                      {/* Left: Receipt details */}
                      <div className="md:col-span-7 space-y-4 md:border-r md:border-slate-100 md:pr-6 dark:md:border-navy-850">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className="text-sm font-bold text-navy-400 uppercase">Bill invoice</h4>
                            <h3 className="text-lg font-extrabold text-navy-900 dark:text-white">{lookupData.bill.bill_number}</h3>
                            <p className="text-xs text-navy-400">{new Date(lookupData.bill.created_at).toLocaleString()}</p>
                          </div>
                          <Barcode value={lookupData.bill.bill_number} height={30} />
                        </div>

                        {/* Patient info */}
                        <div className="rounded-lg bg-slate-50/50 p-3 dark:bg-navy-950/20 text-xs space-y-1.5">
                          <h5 className="font-bold text-coral-500 uppercase text-[10px]">Patient Details</h5>
                          <div><span className="text-navy-400">Name:</span> <span className="font-bold text-navy-900 dark:text-white">{lookupData.bill.patient_name}</span></div>
                          <div><span className="text-navy-400">UHID:</span> <span className="font-semibold font-mono">{lookupData.bill.patient_uhid}</span></div>
                          <div><span className="text-navy-400">Age/Gender:</span> <span className="font-semibold">{lookupData.bill.age} Years • {lookupData.bill.gender}</span></div>
                        </div>

                        {/* Test Items */}
                        <div className="space-y-2">
                          <h5 className="text-[10px] font-bold text-navy-400 uppercase">Diagnostic Investigations</h5>
                          <div className="divide-y divide-slate-100 dark:divide-navy-850">
                            {lookupData.items.map((item, index) => (
                              <div key={index} className="flex justify-between py-2 text-xs">
                                <div>
                                  <p className="font-semibold text-navy-800 dark:text-white">{item.test_name}</p>
                                  <p className="text-[10px] text-navy-400 font-mono">{item.test_code} • {item.department}</p>
                                </div>
                                <span className="font-bold text-navy-900 dark:text-white">₹{item.price.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Receipt calculations */}
                        <div className="border-t border-slate-100 pt-3 dark:border-navy-850 space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-navy-450">Subtotal:</span>
                            <span className="font-semibold">₹{lookupData.bill.total_amount.toFixed(2)}</span>
                          </div>
                          {lookupData.bill.discount_amount > 0 && (
                            <div className="flex justify-between text-rose-500">
                              <span>Discount:</span>
                              <span>-₹{lookupData.bill.discount_amount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-navy-450">GST Amount:</span>
                            <span className="font-semibold">₹{lookupData.bill.gst_amount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold text-sm text-navy-900 dark:border-navy-800 dark:text-white">
                            <span>Net Total:</span>
                            <span>₹{lookupData.bill.net_amount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-emerald-500 font-bold">
                            <span>Paid Amount:</span>
                            <span>₹{lookupData.bill.paid_amount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-amber-500 font-extrabold border-b border-slate-100 pb-1.5 dark:border-navy-800">
                            <span>Remaining Due:</span>
                            <span>₹{lookupData.bill.due_amount.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Print Receipt Link */}
                        <div className="pt-2">
                          <a 
                            href={`/billing`} // Links back to billing screen if they need detailed view
                            onClick={() => setModalOpen(false)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-coral-500 hover:text-coral-600"
                          >
                            <span>Open in Billing Desk</span>
                            <ArrowRight size={12} />
                          </a>
                        </div>
                      </div>

                      {/* Right: Payment collection panel */}
                      <div className="md:col-span-5 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-3">Invoice Operations</h4>
                          
                          {lookupData.bill.due_amount > 0 && hasRole(['Admin', 'Receptionist']) ? (
                            <form onSubmit={handleAddPayment} className="space-y-4">
                              <div className="rounded-lg bg-amber-50/50 border border-amber-500/10 p-3 text-xs text-amber-600 dark:bg-amber-950/10 dark:text-amber-400">
                                This bill has an outstanding balance of <b className="font-extrabold">₹{lookupData.bill.due_amount.toFixed(2)}</b>. Use the form below to record a payment.
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-navy-450 uppercase">Payment Amount (₹)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  max={lookupData.bill.due_amount}
                                  required
                                  value={paymentAmount}
                                  onChange={(e) => setPaymentAmount(e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-navy-450 uppercase">Payment Method</label>
                                <select
                                  value={paymentMethod}
                                  onChange={(e) => setPaymentMethod(e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-900"
                                >
                                  <option value="Cash">Cash</option>
                                  <option value="Card">Card</option>
                                  <option value="UPI">UPI / GPay / PhonePe</option>
                                  <option value="NetBanking">Net Banking</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-navy-450 uppercase">Transaction Reference ID</label>
                                <input
                                  type="text"
                                  placeholder="Txn ID / Ref Number (Optional)"
                                  value={transactionId}
                                  onChange={(e) => setTransactionId(e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800"
                                />
                              </div>

                              <button
                                type="submit"
                                disabled={paymentLoading}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-coral-500 py-2.5 text-xs font-bold text-white shadow-md hover:bg-coral-600 transition-colors"
                              >
                                {paymentLoading ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                ) : (
                                  <>
                                    <CreditCard size={14} />
                                    <span>Collect Payment</span>
                                  </>
                                )}
                              </button>
                            </form>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50/20 text-center">
                              <div className="rounded-full bg-emerald-50 text-emerald-500 p-3 mb-2 dark:bg-emerald-950/20">
                                <Check size={24} />
                              </div>
                              <h5 className="text-sm font-bold text-navy-950 dark:text-white">Fully Paid</h5>
                              <p className="text-xs text-navy-400 max-w-[200px] mt-1">This invoice does not have any pending dues or requires further payments.</p>
                            </div>
                          )}

                          {/* Payments history */}
                          <div className="mt-6 space-y-2">
                            <h5 className="text-[10px] font-bold text-navy-450 uppercase">Transaction Audit History</h5>
                            <div className="space-y-2 max-h-[160px] overflow-y-auto">
                              {lookupData.payments.length === 0 ? (
                                <p className="text-xs text-navy-400">No transactions recorded.</p>
                              ) : (
                                lookupData.payments.map((p, index) => (
                                  <div key={index} className="flex justify-between items-center text-xs border border-slate-100 p-2 rounded dark:border-navy-850">
                                    <div>
                                      <p className="font-semibold text-navy-700 dark:text-navy-300">{p.payment_method}</p>
                                      {p.transaction_id && <p className="text-[9px] font-mono text-navy-400">{p.transaction_id}</p>}
                                    </div>
                                    <span className="font-bold text-emerald-500">₹{p.amount.toFixed(2)}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Report Details / Results Entry View */}
                  {lookupType === 'report' && (
                    <div className="space-y-6">
                      {/* Barcodes section */}
                      <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-navy-800 dark:bg-navy-950/25 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold mb-2 ${
                            lookupData.status === 'Approved' 
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' 
                              : lookupData.status === 'Waiting'
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20'
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20'
                          }`}>
                            <Clock size={12} />
                            <span>Status: {lookupData.status}</span>
                          </span>
                          <h4 className="text-base font-bold text-navy-900 dark:text-white">{lookupData.test_name}</h4>
                          <p className="text-xs text-navy-450 font-semibold truncate">{lookupData.patient_name} • Bill Ref: {lookupData.bill_number}</p>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] font-bold text-navy-400 mb-0.5">Report Barcode</span>
                            <Barcode value={`JLR-${lookupData.id}`} height={22} displayValue={false} />
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] font-bold text-navy-400 mb-0.5">Sample Barcode</span>
                            <Barcode value={`JLS-${lookupData.id}`} height={22} displayValue={false} />
                          </div>
                        </div>
                      </div>

                      {/* Main Report Operation Form */}
                      {lookupData.status !== 'Approved' && hasRole(['Admin', 'Pathologist', 'Lab Technician']) ? (
                        <form onSubmit={handleSaveReportResults} className="space-y-5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-coral-500 uppercase tracking-wider">Laboratory Parameters Entry</h4>
                            {lookupData.status === 'Waiting' && (
                              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">Awaiting Approver verification</span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {lookupData.normal_range?.map((param, index) => {
                              const patientVal = resultValues[param.parameter] || '';
                              
                              let isAbnormal = false;
                              if (patientVal !== '' && !isNaN(patientVal)) {
                                const num = parseFloat(patientVal);
                                if ((param.min !== undefined && num < param.min) || (param.max !== undefined && num > param.max)) {
                                  isAbnormal = true;
                                }
                              }

                              return (
                                <div key={index} className="flex flex-col gap-2 rounded-lg border border-slate-100 p-3 dark:border-navy-800 bg-slate-50/50 dark:bg-navy-950/20">
                                  <div className="flex justify-between text-xs font-bold text-navy-700 dark:text-navy-300">
                                    <span>{param.parameter}</span>
                                    <span className="text-navy-450 font-normal">Ref: {param.min} - {param.max} {param.unit}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      required
                                      value={patientVal}
                                      onChange={(e) => {
                                        setResultValues({
                                          ...resultValues,
                                          [param.parameter]: e.target.value
                                        });
                                      }}
                                      className={`flex-1 rounded-lg border px-3 py-1.5 text-xs focus:outline-none ${
                                        isAbnormal 
                                          ? 'border-rose-500 bg-rose-50/20 text-rose-500 focus:border-rose-600' 
                                          : 'border-slate-200 focus:border-coral-500 dark:border-navy-800 dark:bg-navy-950'
                                      }`}
                                      placeholder="Enter value"
                                    />
                                    <span className="text-xs font-semibold text-navy-450 w-10 text-right">{param.unit}</span>
                                  </div>

                                  {isAbnormal && (
                                    <span className="inline-flex items-center gap-1 text-[9px] text-rose-500 font-bold">
                                      <ShieldAlert size={9} />
                                      <span>Out of bounds!</span>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Save & Approve buttons */}
                          <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-navy-850">
                            <button
                              type="submit"
                              disabled={submitLoading}
                              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-coral-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-coral-500/20 hover:bg-coral-600"
                            >
                              {submitLoading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                              ) : (
                                <>
                                  <Save size={16} />
                                  <span>Submit Lab Values</span>
                                </>
                              )}
                            </button>

                            {lookupData.status === 'Waiting' && hasRole(['Admin', 'Pathologist']) && (
                              <button
                                type="button"
                                onClick={handleApproveReport}
                                disabled={submitLoading}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
                              >
                                {submitLoading ? (
                                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                ) : (
                                  <>
                                    <Check size={16} />
                                    <span>Verify & Release Report</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </form>
                      ) : (
                        // Readonly list of results for non-technical roles or finalized reports
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-navy-400 uppercase tracking-wider">Report Results View</h4>
                          
                          <div className="divide-y divide-slate-100 dark:divide-navy-800 rounded-xl border border-slate-200 dark:border-navy-850 overflow-hidden">
                            {lookupData.normal_range?.map((param, index) => {
                              const patientVal = lookupData.result_values?.[param.parameter] || 'Not entered';
                              
                              let isAbnormal = false;
                              if (patientVal !== 'Not entered' && !isNaN(patientVal)) {
                                const num = parseFloat(patientVal);
                                if ((param.min !== undefined && num < param.min) || (param.max !== undefined && num > param.max)) {
                                  isAbnormal = true;
                                }
                              }

                              return (
                                <div key={index} className="flex justify-between items-center p-3 text-xs bg-white dark:bg-navy-900 hover:bg-slate-50/50">
                                  <div>
                                    <p className="font-bold text-navy-950 dark:text-white">{param.parameter}</p>
                                    <p className="text-[10px] text-navy-400">Reference: {param.min} - {param.max} {param.unit}</p>
                                  </div>
                                  <div className="text-right">
                                    <span className={`font-extrabold text-sm ${isAbnormal ? 'text-rose-500' : 'text-navy-900 dark:text-white'}`}>
                                      {patientVal}
                                    </span>
                                    <span className="text-[10px] font-semibold text-navy-450 ml-1">{param.unit}</span>
                                    {isAbnormal && <span className="block text-[8px] font-bold text-rose-500 uppercase">Abnormal</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Print PDF triggers if finalized */}
                          {lookupData.status === 'Approved' ? (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 border-t border-slate-100 pt-4 dark:border-navy-850">
                              <span className="text-xs text-navy-450 font-semibold">Verify prints:</span>
                              <div className="flex gap-2">
                                <a
                                  href={`${API_BASE_URL}/api/reports/${lookupData.id}/pdf?token=${localStorage.getItem('jyothi_token')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded bg-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-navy-200 dark:bg-navy-800 dark:text-navy-300 dark:hover:bg-navy-750"
                                >
                                  <Printer size={12} />
                                  <span>Official Letterhead</span>
                                </a>
                                <a
                                  href={`${API_BASE_URL}/api/reports/${lookupData.id}/pdf?token=${localStorage.getItem('jyothi_token')}&letterhead=false`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-slate-200 dark:bg-navy-800 dark:text-navy-300 dark:hover:bg-navy-750"
                                >
                                  <Printer size={12} />
                                  <span>Without Letterhead</span>
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-lg bg-blue-50/50 border border-blue-500/10 p-3 text-xs text-blue-600 dark:bg-blue-950/10 dark:text-blue-400">
                              The results entry for this clinical report has not been signed off or verified by an authorized Pathologist yet.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            
            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-3 dark:border-navy-850 dark:bg-navy-950/40">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-navy-700 hover:bg-slate-50 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-300 dark:hover:bg-navy-850"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
