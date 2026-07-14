import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Search, Stethoscope, Phone, Mail, Edit3, 
  Trash2, X, Eye, FileSpreadsheet, IndianRupee, AlertCircle 
} from 'lucide-react';

const Doctors = () => {
  const { hasRole } = useAuth();
  
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Monthly Referral Summary States
  const [monthlyReferrals, setMonthlyReferrals] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // Modals & Panels
  const [formOpen, setFormOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [ledgerData, setLedgerData] = useState({ totalReferredAmount: 0, totalCommissionEarned: 0, bills: [] });
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Form states
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [commission, setCommission] = useState(0);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/doctors?search=${search}`);
      setDoctors(res.data);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve doctor directory.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyReferrals = async () => {
    try {
      setMonthlyLoading(true);
      const res = await api.get('/doctors/referrals/monthly');
      setMonthlyReferrals(res.data);
    } catch (err) {
      console.error('Failed to fetch monthly referrals summary:', err);
    } finally {
      setMonthlyLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [search]);

  useEffect(() => {
    fetchMonthlyReferrals();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const payload = {
        name,
        phone,
        email: email || null,
        specialization: specialization || null,
        commission_percentage: parseFloat(commission) || 0
      };

      if (editId) {
        await api.put(`/doctors/${editId}`, payload);
      } else {
        await api.post('/doctors', payload);
      }

      // Reset
      setName('');
      setPhone('');
      setEmail('');
      setSpecialization('');
      setCommission(0);
      setEditId(null);
      setFormOpen(false);

      fetchDoctors();
      fetchMonthlyReferrals();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save doctor details.');
    }
  };

  const startEdit = (doc) => {
    setEditId(doc.id);
    setName(doc.name);
    setPhone(doc.phone);
    setEmail(doc.email || '');
    setSpecialization(doc.specialization || '');
    setCommission(doc.commission_percentage || 0);
    setFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this doctor from referral program?')) return;
    try {
      await api.delete(`/doctors/${id}`);
      fetchDoctors();
      fetchMonthlyReferrals();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete doctor.');
    }
  };

  const openLedgerPanel = async (doc) => {
    setSelectedDoctor(doc);
    setLedgerOpen(true);
    setLedgerLoading(true);
    try {
      const response = await api.get(`/doctors/${doc.id}/commissions`);
      setLedgerData(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLedgerLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Referral Doctors</h1>
          <p className="text-sm text-navy-500 dark:text-navy-450">Manage doctors network, set commission structures, and review financial ledgers.</p>
        </div>
        <button
          onClick={() => {
            setEditId(null); setName(''); setPhone(''); setEmail(''); setSpecialization(''); setCommission(0);
            setFormOpen(true);
          }}
          className="flex items-center justify-center gap-2 rounded-lg bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-coral-500/20 hover:bg-coral-600 transition-all self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add New Doctor</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400">
          <AlertCircle size={18} className="shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Search & Monthly Summary Container */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Search */}
        <div className="md:col-span-1 h-fit flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-navy-850 dark:bg-navy-900">
          <Search size={18} className="text-navy-400" />
          <input
            type="text"
            placeholder="Search by Name, Spec, Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-navy-900 focus:outline-none dark:text-white"
          />
        </div>

        {/* Monthly Referral Payouts Summary */}
        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-navy-850 dark:bg-navy-900">
          <h2 className="text-sm font-bold uppercase tracking-wider text-coral-500 mb-3 flex items-center gap-1.5">
            <FileSpreadsheet size={16} />
            <span>Monthly Referral & Commission Summary (All Doctors)</span>
          </h2>
          {monthlyLoading ? (
            <div className="flex py-6 justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-coral-500 border-t-transparent"></div>
            </div>
          ) : monthlyReferrals.length > 0 ? (
            <div className="overflow-x-auto max-h-[160px] overflow-y-auto pr-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-navy-500 uppercase dark:border-navy-800 dark:text-navy-450 pb-2">
                    <th className="py-2">Month</th>
                    <th className="py-2 text-right">Total Referred Billing</th>
                    <th className="py-2 text-right">Total Commission Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-navy-850 text-navy-800 dark:text-navy-200">
                  {monthlyReferrals.map((m) => (
                    <tr key={m.month} className="hover:bg-slate-55/30 dark:hover:bg-navy-800/10">
                      <td className="py-2.5 font-bold text-navy-900 dark:text-white">
                        {new Date(m.month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </td>
                      <td className="py-2.5 text-right font-semibold">
                        ₹{m.totalReferredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 text-right font-extrabold text-coral-500">
                        ₹{m.totalCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-navy-400 py-4 text-center">No doctor referral records found.</p>
          )}
        </div>
      </div>

      {/* Grid List */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-coral-500 border-t-transparent"></div>
          </div>
        ) : doctors.length > 0 ? (
          doctors.map((doc) => (
            <div 
              key={doc.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-navy-850 dark:bg-navy-900 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-rose-50 p-2.5 text-coral-500 dark:bg-coral-950/20">
                      <Stethoscope size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-navy-900 dark:text-white">{doc.name}</h3>
                      <p className="text-xs text-navy-450 font-semibold">{doc.specialization || 'General Physician'}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-coral-50 px-2.5 py-0.5 text-xs font-bold text-coral-600 dark:bg-coral-950/30 dark:text-coral-400">
                    {doc.commission_percentage}% Comm.
                  </span>
                </div>

                <div className="space-y-1 text-xs text-navy-500 dark:text-navy-400 pt-2 border-t border-slate-50 dark:border-navy-850">
                  <p className="flex items-center gap-2"><Phone size={12} /> {doc.phone}</p>
                  {doc.email && <p className="flex items-center gap-2"><Mail size={12} /> {doc.email}</p>}
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-between border-t border-slate-50 dark:border-navy-850 pt-4 mt-4">
                <button
                  onClick={() => openLedgerPanel(doc)}
                  className="flex items-center gap-1 text-xs font-semibold text-coral-500 hover:text-coral-600"
                >
                  <Eye size={14} />
                  <span>Ledger Report</span>
                </button>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => startEdit(doc)}
                    className="p-1 text-navy-400 hover:text-navy-600 dark:hover:text-white"
                  >
                    <Edit3 size={16} />
                  </button>
                  {hasRole(['Admin']) && (
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="p-1 text-navy-400 hover:text-rose-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-navy-400">
            No referral doctors found.
          </div>
        )}
      </div>

      {/* Doctor Create/Edit Drawer Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/55 backdrop-blur-sm">
          <div className="h-full w-full max-w-md bg-white p-6 shadow-2xl overflow-y-auto dark:bg-navy-900 transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-navy-800">
              <h2 className="text-lg font-bold text-navy-900 dark:text-white">{editId ? 'Edit Doctor Profile' : 'Register Referral Doctor'}</h2>
              <button onClick={() => setFormOpen(false)} className="text-navy-400 hover:text-navy-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Doctor Name *</label>
                <input
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Ramesh Kumar"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Phone Number *</label>
                <input
                  type="text" required value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter 10-digit number"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Email Address</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Specialization / Department</label>
                <input
                  type="text" value={specialization} onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Cardiologist, Pathologist"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Commission rate (%)</label>
                <input
                  type="number" min="0" max="100" step="0.5" value={commission} onChange={(e) => setCommission(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-coral-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-coral-600 transition-all mt-6"
              >
                {editId ? 'Save Profile Details' : 'Register Referral'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Report Drawer Modal */}
      {ledgerOpen && selectedDoctor && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/55 backdrop-blur-sm">
          <div className="h-full w-full max-w-lg bg-white p-6 shadow-2xl overflow-y-auto dark:bg-navy-900 transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-navy-800">
              <div>
                <h2 className="text-lg font-bold text-navy-900 dark:text-white">Referral Ledger Report</h2>
                <p className="text-xs text-navy-500 font-semibold">{selectedDoctor.name} • {selectedDoctor.commission_percentage}% Rate</p>
              </div>
              <button onClick={() => setLedgerOpen(false)} className="text-navy-400 hover:text-navy-600">
                <X size={20} />
              </button>
            </div>

            {ledgerLoading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral-500 border-t-transparent"></div>
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                {/* Aggregated Commission Stat Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-navy-950">
                    <p className="text-xs font-semibold text-navy-400 uppercase tracking-wider">Total Referred Billing</p>
                    <h4 className="text-lg font-extrabold text-navy-800 dark:text-white mt-1">₹{parseFloat(ledgerData.totalReferredAmount || 0).toFixed(2)}</h4>
                  </div>
                  <div className="rounded-xl bg-coral-50/50 p-4 dark:bg-coral-950/10">
                    <p className="text-xs font-semibold text-coral-550 uppercase tracking-wider">Commission Earned</p>
                    <h4 className="text-lg font-extrabold text-coral-500 dark:text-coral-450 mt-1">₹{parseFloat(ledgerData.totalCommissionEarned || 0).toFixed(2)}</h4>
                  </div>
                </div>

                {/* Referred Bills Table */}
                <div>
                  <h3 className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-3">Referred Billing Transactions</h3>
                  
                  {ledgerData.bills.length > 0 ? (
                    <div className="space-y-3">
                      {ledgerData.bills.map((bill) => {
                        const billNet = parseFloat(bill.net_amount) || 0;
                        const billComm = billNet * (parseFloat(selectedDoctor.commission_percentage) / 100);
                        return (
                          <div key={bill.id} className="flex justify-between items-center rounded-lg border border-slate-100 p-3.5 dark:border-navy-800 text-sm">
                            <div>
                              <p className="font-semibold text-navy-800 dark:text-white">{bill.bill_number}</p>
                              <p className="text-xs text-navy-450 dark:text-navy-500">{bill.patient_name} • {new Date(bill.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">₹{parseFloat(billNet || 0).toFixed(2)}</p>
                              <p className="text-xs text-coral-500 font-semibold">Comm: ₹{parseFloat(billComm || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-navy-400 py-6 text-center">No bills referred by this doctor yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Doctors;
