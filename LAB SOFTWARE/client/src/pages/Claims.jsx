import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Search, X, ShieldCheck, Edit3, AlertCircle, CheckCircle, Clock, 
  ChevronLeft, ChevronRight, FileText, IndianRupee, HeartHandshake
} from 'lucide-react';

const Claims = () => {
  const [claims, setClaims] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Settle modal states
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [settleOpen, setSettleOpen] = useState(false);
  const [claimStatus, setClaimStatus] = useState('Pre-Auth Approved');
  const [settledAmount, setSettledAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [transactionId, setTransactionId] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      setError('');
      const statusParam = statusFilter === 'All' ? '' : statusFilter;
      const response = await api.get(`/bills/claims?search=${search}&status=${statusParam}&page=${page}&limit=10`);
      setClaims(response.data.claims);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      console.error(err);
      setError('Could not fetch cashless claims data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [search, statusFilter, page]);

  const openSettleModal = (claim) => {
    setSelectedClaim(claim);
    setClaimStatus(claim.claim_status);
    setSettledAmount(claim.due_amount); // Default settlement amount to remaining due
    setPaymentMethod('Bank Transfer');
    setTransactionId('');
    setSettleOpen(true);
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setError('');
    try {
      const payload = {
        claim_status: claimStatus,
        settled_amount: claimStatus === 'Claim Settled' ? parseFloat(settledAmount) || 0 : 0,
        payment_method: claimStatus === 'Claim Settled' ? paymentMethod : null,
        transaction_id: claimStatus === 'Claim Settled' ? transactionId : null
      };

      await api.put(`/bills/${selectedClaim.id}/claim-status`, payload);
      setSettleOpen(false);
      fetchClaims();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update claim details.');
    } finally {
      setModalLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pre-Auth Pending':
        return 'bg-amber-50 text-amber-600 border border-amber-250 dark:bg-amber-950/20 dark:text-amber-400';
      case 'Pre-Auth Approved':
        return 'bg-blue-50 text-blue-600 border border-blue-250 dark:bg-blue-950/20 dark:text-blue-400';
      case 'Claim Submitted':
        return 'bg-purple-50 text-purple-600 border border-purple-250 dark:bg-purple-950/20 dark:text-purple-400';
      case 'Claim Settled':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400';
      case 'Rejected':
        return 'bg-rose-50 text-rose-600 border border-rose-250 dark:bg-rose-950/20 dark:text-rose-400';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-950/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="text-coral-500" />
          <span>Claim Tracking Desk</span>
        </h1>
        <p className="text-sm text-navy-500 dark:text-navy-450">Track cashless billing requests, pre-authorization details, and record insurance claim settlements.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400">
          <AlertCircle size={18} className="shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="flex flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-navy-850 dark:bg-navy-900">
          <Search size={18} className="text-navy-400" />
          <input
            type="text"
            placeholder="Search by Bill Number, Name or Phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-transparent text-sm text-navy-900 focus:outline-none dark:text-white"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-navy-450 dark:text-navy-350 whitespace-nowrap">Filter Status</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none dark:border-navy-850 dark:bg-navy-900"
          >
            <option value="All">All Claims</option>
            <option value="Pre-Auth Pending">Pre-Auth Pending</option>
            <option value="Pre-Auth Approved">Pre-Auth Approved</option>
            <option value="Claim Submitted">Claim Submitted</option>
            <option value="Claim Settled">Claim Settled</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Claims Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-850 dark:bg-navy-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-navy-500 uppercase tracking-wider dark:border-navy-800 dark:bg-navy-900/50 dark:text-navy-400">
                <th className="px-6 py-4">Bill No</th>
                <th className="px-6 py-4">Patient Name</th>
                <th className="px-6 py-4">Coverage Plan Details</th>
                <th className="px-6 py-4">Claim Amount</th>
                <th className="px-6 py-4">Balance Due</th>
                <th className="px-6 py-4">Claim Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-navy-800 dark:divide-navy-850 dark:text-navy-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-navy-400">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-coral-500 border-t-transparent"></div>
                  </td>
                </tr>
              ) : claims.length > 0 ? (
                claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/50 dark:hover:bg-navy-800/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-navy-900 dark:text-white">
                      <div>{claim.bill_number}</div>
                      <span className="text-[10px] text-navy-400 font-normal">{new Date(claim.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold">{claim.patient_name}</div>
                      <span className="font-mono text-xs text-navy-450 dark:text-navy-500">{claim.patient_uhid}</span>
                    </td>
                    <td className="px-6 py-4 space-y-0.5">
                      {claim.corporate_company && (
                        <p className="text-xs"><strong className="text-navy-500 dark:text-navy-400">Corporate:</strong> {claim.corporate_company}</p>
                      )}
                      <p className="text-xs"><strong className="text-navy-500 dark:text-navy-400">Insurance Co:</strong> {claim.insurance_company}</p>
                      <p className="text-xs text-navy-450 dark:text-navy-500">Policy: {claim.policy_number} • ID: {claim.insurance_id}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-navy-900 dark:text-white">₹{parseFloat(claim.claim_amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 font-semibold text-rose-500">₹{parseFloat(claim.due_amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${getStatusBadge(claim.claim_status)}`}>
                        {claim.claim_status === 'Pre-Auth Pending' && <Clock size={12} />}
                        {claim.claim_status === 'Claim Settled' && <CheckCircle size={12} />}
                        <span>{claim.claim_status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openSettleModal(claim)}
                        disabled={claim.claim_status === 'Claim Settled' && claim.due_amount <= 0}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy-650 hover:bg-slate-50 disabled:opacity-50 dark:border-navy-800 dark:text-navy-300 dark:hover:bg-navy-850 transition-colors"
                      >
                        <Edit3 size={12} />
                        <span>Update Status</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-navy-450">
                    No cashless insurance claims found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-navy-850">
            <span className="text-xs text-navy-500 dark:text-navy-400">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="rounded border border-slate-200 p-1 text-navy-600 hover:bg-slate-50 disabled:opacity-40 dark:border-navy-850 dark:text-navy-350 dark:hover:bg-navy-900"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded border border-slate-200 p-1 text-navy-600 hover:bg-slate-50 disabled:opacity-40 dark:border-navy-850 dark:text-navy-350 dark:hover:bg-navy-900"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settle / Update Claim Drawer Modal */}
      {settleOpen && selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-navy-900 transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-navy-800">
              <div className="flex items-center gap-2">
                <HeartHandshake className="text-coral-500" size={20} />
                <h2 className="text-lg font-bold text-navy-900 dark:text-white">Settle & Update Claim</h2>
              </div>
              <button 
                onClick={() => setSettleOpen(false)}
                className="rounded-lg p-1 text-navy-400 hover:bg-slate-100 dark:hover:bg-navy-800"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="mt-6 space-y-4">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-navy-950 space-y-1.5 text-xs">
                <p><strong>Patient Name:</strong> {selectedClaim.patient_name} ({selectedClaim.patient_uhid})</p>
                <p><strong>Bill / Invoice:</strong> {selectedClaim.bill_number} (₹{selectedClaim.net_amount})</p>
                <p><strong>Claim Provider:</strong> {selectedClaim.insurance_company}</p>
                <p><strong>Policy Number:</strong> {selectedClaim.policy_number}</p>
                <p className="font-semibold text-rose-500"><strong>Outstanding Balance:</strong> ₹{parseFloat(selectedClaim.due_amount).toFixed(2)}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Claim Status *</label>
                <select
                  value={claimStatus} onChange={(e) => setClaimStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                >
                  <option value="Pre-Auth Pending">Pre-Auth Pending</option>
                  <option value="Pre-Auth Approved">Pre-Auth Approved</option>
                  <option value="Claim Submitted">Claim Submitted</option>
                  <option value="Claim Settled">Claim Settled & Disbursed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {claimStatus === 'Claim Settled' && (
                <div className="border-t border-slate-100 dark:border-navy-800 pt-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Settlement Disbursed Amount (INR) *</label>
                    <div className="relative flex items-center rounded-lg border border-slate-200 px-3 dark:border-navy-800 dark:bg-navy-950">
                      <IndianRupee size={16} className="text-navy-400 mr-1.5" />
                      <input
                        type="number" required value={settledAmount}
                        onChange={(e) => setSettledAmount(Math.min(selectedClaim.due_amount, Math.max(0, parseFloat(e.target.value) || 0)))}
                        placeholder="Enter amount" min="0.1" step="any"
                        className="w-full bg-transparent py-2 text-sm focus:outline-none focus:ring-0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Settlement Method</label>
                      <select
                        value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                      >
                        <option>Bank Transfer</option>
                        <option>Card</option>
                        <option>UPI</option>
                        <option>Net Banking</option>
                        <option>Cash</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Transaction Ref ID</label>
                      <input
                        type="text" placeholder="Ref No." value={transactionId} onChange={(e) => setTransactionId(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 rounded-lg bg-coral-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-coral-500/20 hover:bg-coral-600 disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : 'Save & Update'}
                </button>
                <button
                  type="button"
                  onClick={() => setSettleOpen(false)}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-800 text-center text-navy-700 dark:text-navy-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Claims;
