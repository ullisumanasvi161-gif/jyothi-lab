import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Search, Plus, Trash2, Printer, X, Check, 
  IndianRupee, ReceiptText, FileText, ArrowRight, UserPlus 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Barcode from '../components/Barcode';

const Billing = () => {
  // Search & catalogs
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [tests, setTests] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [testSearch, setTestSearch] = useState('');
  
  // Selected billing details
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedTests, setSelectedTests] = useState([]); // cart
  
  // Billing calculations
  const [discount, setDiscount] = useState(0);
  const [gstPercent, setGstPercent] = useState(5); // default 5%
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [transactionId, setTransactionId] = useState('');

  // Cashless / Corporate Billing states
  const [isCashless, setIsCashless] = useState(false);
  const [insuranceCompany, setInsuranceCompany] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [insuranceId, setInsuranceId] = useState('');
  const [corporateCompany, setCorporateCompany] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receiptBill, setReceiptBill] = useState(null); // holds generated bill for preview
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptHeader, setReceiptHeader] = useState({
    labName: 'Jyothi Lab',
    tagline: 'Precision Diagnostics, Care & Trust',
    address: '12-34 Main Road, Opp Metro, Hyderabad',
    phone: '+91 98765 43210',
    email: 'info@jyothilab.com',
    gstin: '36AAAAA1111A1Z1'
  });

  // Fetch catalogs
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

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/doctors');
      setDoctors(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchTests = async () => {
    try {
      const res = await api.get('/tests');
      setTests(res.data);
    } catch (err) { console.error(err); }
  };

  const handlePatientSearch = async (val) => {
    setPatientSearch(val);
    if (val.length > 2) {
      try {
        const res = await api.get(`/patients?search=${val}&limit=5`);
        setPatients(res.data.patients);
      } catch (err) { console.error(err); }
    } else {
      setPatients([]);
    }
  };

  const handleSelectPatient = (p) => {
    setSelectedPatient(p);
    setPatients([]);
    if (p.patient_type && p.patient_type !== 'General') {
      setIsCashless(true);
      setInsuranceCompany(p.insurance_company || '');
      setPolicyNumber(p.policy_number || '');
      setInsuranceId(p.insurance_id || '');
      setCorporateCompany(p.corporate_company || '');
      setPaidAmount(0);
      setPaymentMethod('Insurance Claim');
    } else {
      setIsCashless(false);
      setInsuranceCompany('');
      setPolicyNumber('');
      setInsuranceId('');
      setCorporateCompany('');
      setPaymentMethod('Cash');
    }
  };

  useEffect(() => {
    fetchDoctors();
    fetchTests();
    fetchSettings();
  }, []);

  // Cart operations
  const addTestToBill = (test) => {
    if (selectedTests.some(t => t.id === test.id)) return;
    setSelectedTests([...selectedTests, test]);
  };

  const removeTestFromBill = (id) => {
    setSelectedTests(selectedTests.filter(t => t.id !== id));
  };

  // Live calculations
  const subtotal = selectedTests.reduce((sum, t) => sum + parseFloat(t.price), 0);
  const discountVal = parseFloat(discount) || 0;
  const discountedSubtotal = Math.max(0, subtotal - discountVal);
  const gstVal = discountedSubtotal * (parseFloat(gstPercent) / 100);
  const netTotal = discountedSubtotal + gstVal;
  const due = Math.max(0, netTotal - (parseFloat(paidAmount) || 0));

  const handleGenerateBill = async () => {
    if (!selectedPatient) {
      setError('Please select a patient.');
      return;
    }
    if (selectedTests.length === 0) {
      setError('Please add at least one diagnostic test.');
      return;
    }
    if ((parseFloat(paidAmount) || 0) > netTotal) {
      setError('Paid amount cannot exceed net total.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const payload = {
        patient_id: selectedPatient.id,
        referral_doctor_id: selectedDoctorId ? parseInt(selectedDoctorId) : null,
        test_ids: selectedTests.map(t => t.id),
        discount_amount: discountVal,
        gst_percentage: gstPercent,
        paid_amount: parseFloat(paidAmount) || 0,
        payment_method: isCashless ? 'Insurance Claim' : paymentMethod,
        transaction_id: transactionId || null,
        is_cashless: isCashless ? 1 : 0,
        claim_status: isCashless ? 'Pre-Auth Pending' : 'None',
        claim_amount: isCashless ? (netTotal - (parseFloat(paidAmount) || 0)) : 0,
        insurance_company: isCashless ? insuranceCompany : null,
        policy_number: isCashless ? policyNumber : null,
        insurance_id: isCashless ? insuranceId : null,
        corporate_company: isCashless ? corporateCompany : null
      };

      const res = await api.post('/bills', payload);
      
      // Fetch details of the newly created bill to populate receipt preview
      const billDetails = await api.get(`/bills/${res.data.id}`);
      setReceiptBill(billDetails.data);
      setShowReceiptModal(true);

      // Reset cart states
      setSelectedPatient(null);
      setSelectedDoctorId('');
      setSelectedTests([]);
      setDiscount(0);
      setPaidAmount(0);
      setTransactionId('');
      setPatientSearch('');
      setTestSearch('');
      setIsCashless(false);
      setInsuranceCompany('');
      setPolicyNumber('');
      setInsuranceId('');
      setCorporateCompany('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate billing invoice.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    const printContent = document.getElementById('receipt-print-area').innerHTML;
    const originalContent = document.body.innerHTML;
    
    // Create print window style overrides
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
    // Restore page
    document.body.innerHTML = originalContent;
    window.location.reload(); // Refresh state safely
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Billing Desk</h1>
        <p className="text-sm text-navy-500 dark:text-navy-450">Issue invoices, deduct discounts, apply GST, and print patient receipts.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400">
          <X size={18} className="shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Columns - Form Builders */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Patient Selector */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-navy-850 dark:bg-navy-900">
            <h3 className="text-sm font-bold uppercase tracking-wider text-coral-500 mb-4">Step 1: Patient Details</h3>
            
            {!selectedPatient ? (
              <div className="space-y-4">
                <div className="relative flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-navy-800 dark:bg-navy-950">
                  <Search size={18} className="text-navy-400" />
                  <input
                    type="text"
                    placeholder="Search patient by UHID, Name, or Phone..."
                    value={patientSearch}
                    onChange={(e) => handlePatientSearch(e.target.value)}
                    className="w-full bg-transparent text-sm text-navy-900 focus:outline-none dark:text-white"
                  />
                </div>

                {/* Dropdown list of searched patients */}
                {patients.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 shadow-lg dark:border-navy-850 dark:bg-navy-900 dark:divide-navy-800 max-h-48 overflow-y-auto">
                    {patients.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPatient(p)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-navy-800"
                      >
                        <div>
                          <p className="font-semibold text-sm text-navy-900 dark:text-white">{p.name}</p>
                          <p className="text-xs text-navy-450 dark:text-navy-500">{p.phone} • Age: {p.age}</p>
                        </div>
                        <span className="font-mono text-xs font-bold text-coral-500">{p.uhid}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs text-navy-400">
                  <span>Search requires at least 3 characters.</span>
                  <Link to="/patients" className="inline-flex items-center gap-1 text-coral-500 hover:underline">
                    <UserPlus size={14} />
                    <span>Quick Register Patient</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg bg-emerald-50/50 border border-emerald-200 p-4 dark:bg-emerald-950/10 dark:border-emerald-900">
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-bold text-navy-900 dark:text-white">{selectedPatient.name}</p>
                  <p className="text-xs text-navy-500 dark:text-navy-400">
                    UHID: <span className="font-mono font-semibold">{selectedPatient.uhid}</span> • Phone: {selectedPatient.phone}
                  </p>
                  {selectedPatient.patient_type && selectedPatient.patient_type !== 'General' && (
                    <div className="text-xs text-coral-600 dark:text-coral-450 font-medium bg-coral-500/10 px-2.5 py-1.5 rounded-lg border border-coral-500/20 mt-2 space-y-0.5 max-w-sm">
                      <p><strong>Plan Type:</strong> {selectedPatient.patient_type}</p>
                      {selectedPatient.patient_type === 'Corporate' && <p><strong>Corporate:</strong> {selectedPatient.corporate_company}</p>}
                      <p><strong>Insurance Co:</strong> {selectedPatient.insurance_company}</p>
                      <p><strong>Policy No:</strong> {selectedPatient.policy_number} • ID: {selectedPatient.insurance_id}</p>
                      <p><strong>Cover Max:</strong> ₹{parseFloat(selectedPatient.coverage_amount || 0).toFixed(2)}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="rounded-full bg-slate-200 p-1.5 text-navy-600 hover:bg-slate-300 dark:bg-navy-800 dark:text-navy-300 align-top self-start"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Referral Doctor */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-navy-850 dark:bg-navy-900">
            <h3 className="text-sm font-bold uppercase tracking-wider text-coral-500 mb-4">Step 2: Referral Doctor</h3>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
            >
              <option value="">Self / Walk-in</option>
              {doctors.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialization})</option>
              ))}
            </select>
          </div>

          {/* Add Diagnostic Tests */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-navy-850 dark:bg-navy-900">
            <h3 className="text-sm font-bold uppercase tracking-wider text-coral-500 mb-4">Step 3: Add Diagnostic Tests</h3>
            
            {/* Live search input for diagnostic tests */}
            <div className="relative flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 mb-4 dark:border-navy-800 dark:bg-navy-950">
              <Search size={18} className="text-navy-400" />
              <input
                type="text"
                placeholder="Search test by name or code..."
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-navy-900 focus:outline-none dark:text-white"
              />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 max-h-60 overflow-y-auto pr-2">
              {tests.filter(t => 
                t.name.toLowerCase().includes(testSearch.toLowerCase()) || 
                t.code.toLowerCase().includes(testSearch.toLowerCase())
              ).map(t => {
                const added = selectedTests.some(st => st.id === t.id);
                return (
                  <div 
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:border-coral-300 transition-all dark:border-navy-800"
                  >
                    <div>
                      <p className="font-semibold text-sm text-navy-850 dark:text-white">{t.name}</p>
                      <p className="text-xs text-navy-450 dark:text-navy-500 font-semibold">{t.code} • ₹{t.price}</p>
                    </div>
                    <button
                      onClick={() => addTestToBill(t)}
                      disabled={added}
                      className={`rounded-lg p-1.5 transition-colors ${
                        added 
                          ? 'bg-emerald-55 text-emerald-500' 
                          : 'bg-coral-500 text-white hover:bg-coral-600'
                      }`}
                    >
                      {added ? <Check size={16} /> : <Plus size={16} />}
                    </button>
                  </div>
                );
              })}
              {tests.filter(t => 
                t.name.toLowerCase().includes(testSearch.toLowerCase()) || 
                t.code.toLowerCase().includes(testSearch.toLowerCase())
              ).length === 0 && (
                <div className="col-span-2 py-8 text-center text-navy-400">
                  No tests found matching "{testSearch}".
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column - Billing Cart Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-md dark:border-navy-850 dark:bg-navy-900 h-fit">
          <h3 className="text-sm font-bold uppercase tracking-wider text-coral-500 mb-4">Invoice Cart</h3>

          {/* Selected Tests List */}
          <div className="space-y-3 max-h-48 overflow-y-auto border-b border-slate-100 pb-4 mb-4 dark:border-navy-800">
            {selectedTests.length > 0 ? (
              selectedTests.map(t => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-navy-800 dark:text-white">{t.name}</p>
                    <p className="text-xs text-navy-450 font-mono">{t.code}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">₹{t.price}</span>
                    <button 
                      onClick={() => removeTestFromBill(t.id)}
                      className="text-navy-400 hover:text-rose-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-24 flex-col items-center justify-center text-center text-navy-400 dark:text-navy-600">
                <ReceiptText size={28} className="mb-2" />
                <p className="text-xs">No tests added to cart.</p>
              </div>
            )}
          </div>

          {/* Fee calculations */}
          <div className="space-y-3 text-sm border-b border-slate-100 pb-4 mb-4 dark:border-navy-800">
            <div className="flex justify-between">
              <span className="text-navy-500 dark:text-navy-400">Subtotal</span>
              <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
            </div>

            {/* Discount */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-navy-500 dark:text-navy-400">Discount (INR)</span>
              <input
                type="number"
                min="0"
                max={subtotal}
                value={discount}
                onChange={(e) => setDiscount(Math.min(subtotal, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
              />
            </div>

            {/* GST */}
            <div className="flex items-center justify-between">
              <span className="text-navy-500 dark:text-navy-400">GST Tax rate</span>
              <select
                value={gstPercent}
                onChange={(e) => setGstPercent(parseInt(e.target.value))}
                className="rounded border border-slate-200 px-2 py-1 text-right text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
              >
                <option value="0">0% (Exempt)</option>
                <option value="5">5% (GST)</option>
                <option value="12">12% (GST)</option>
                <option value="18">18% (GST)</option>
              </select>
            </div>

            <div className="flex justify-between text-base font-bold text-navy-900 dark:text-white pt-2">
              <span>Net Total</span>
              <span className="text-coral-500">₹{netTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Section */}
          <div className="space-y-4">
            {selectedPatient && selectedPatient.patient_type !== 'General' && (
              <div className="rounded-xl border border-slate-150 bg-slate-50/50 p-4 dark:border-navy-800 dark:bg-navy-950/30 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs uppercase tracking-wider text-coral-500">
                  <input
                    type="checkbox"
                    checked={isCashless}
                    onChange={(e) => {
                      setIsCashless(e.target.checked);
                      if (e.target.checked) {
                        setPaidAmount(0);
                        setPaymentMethod('Insurance Claim');
                        setInsuranceCompany(selectedPatient.insurance_company || '');
                        setPolicyNumber(selectedPatient.policy_number || '');
                        setInsuranceId(selectedPatient.insurance_id || '');
                        setCorporateCompany(selectedPatient.corporate_company || '');
                      } else {
                        setPaymentMethod('Cash');
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-coral-500 focus:ring-coral-500"
                  />
                  <span>Apply Cashless Billing</span>
                </label>

                {isCashless && (
                  <div className="space-y-2 text-xs">
                    {selectedPatient.patient_type === 'Corporate' && (
                      <div>
                        <label className="text-navy-550 block mb-0.5">Corporate Company</label>
                        <input
                          type="text" value={corporateCompany} onChange={(e) => setCorporateCompany(e.target.value)}
                          className="w-full rounded border border-slate-250 px-2 py-1.5 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-navy-550 block mb-0.5">Insurance Provider</label>
                      <input
                        type="text" value={insuranceCompany} onChange={(e) => setInsuranceCompany(e.target.value)}
                        className="w-full rounded border border-slate-250 px-2 py-1.5 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-navy-550 block mb-0.5">Policy Number</label>
                        <input
                          type="text" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)}
                          className="w-full rounded border border-slate-250 px-2 py-1.5 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                        />
                      </div>
                      <div>
                        <label className="text-navy-550 block mb-0.5">Insurance ID</label>
                        <input
                          type="text" value={insuranceId} onChange={(e) => setInsuranceId(e.target.value)}
                          className="w-full rounded border border-slate-250 px-2 py-1.5 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Paid Amount (INR)</label>
              <input
                type="number"
                min="0"
                max={netTotal}
                value={paidAmount}
                onChange={(e) => setPaidAmount(Math.min(netTotal, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Method</label>
                <select
                  value={isCashless ? 'Insurance Claim' : paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={isCashless}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950 disabled:opacity-75"
                >
                  {isCashless ? (
                    <option value="Insurance Claim">Insurance Claim</option>
                  ) : (
                    <>
                      <option>Cash</option>
                      <option>Card</option>
                      <option>UPI</option>
                      <option>Net Banking</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Transaction ID</label>
                <input
                  type="text"
                  placeholder="Ref No."
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>
            </div>

            <div className="flex justify-between text-xs text-navy-400 font-semibold pt-1">
              <span>Remaining Due:</span>
              <span className={due > 0 ? 'text-rose-500' : 'text-emerald-500'}>₹{due.toFixed(2)}</span>
            </div>

            <button
              onClick={handleGenerateBill}
              disabled={loading || selectedTests.length === 0 || !selectedPatient}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-coral-500 py-3 text-sm font-bold text-white shadow-lg shadow-coral-500/25 hover:bg-coral-600 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <ReceiptText size={16} />
                  <span>Generate & Print Bill</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>

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

              <div className="flex flex-col items-center justify-center pt-2 pb-4 border-t border-dashed border-slate-200">
                <Barcode value={receiptBill.bill.bill_number} height={35} width={1.2} displayValue={true} />
              </div>

              <div className="text-center text-[10px] pt-2 text-slate-500">
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
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-800 text-center text-navy-700 dark:text-navy-300"
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

export default Billing;
