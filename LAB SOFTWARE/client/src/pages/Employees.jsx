import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Plus, Search, UserCheck, Shield, Phone, Mail, 
  Edit3, UserMinus, X, AlertCircle, Trash2
} from 'lucide-react';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Drawer Form states
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Staff');
  const [isActive, setIsActive] = useState(true);

  const roles = ['Admin', 'Receptionist', 'Pathologist', 'Lab Technician', 'Staff', 'Doctor'];

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/employees?search=${search}`);
      setEmployees(response.data);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve employee list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const payload = {
        name,
        phone,
        email: email || null,
        role,
        is_active: isActive
      };

      // Password required only on new registration, optional on updates
      if (password) payload.password = password;

      if (editId) {
        await api.put(`/employees/${editId}`, payload);
      } else {
        if (!password) {
          setError('Password is required for new employee registrations.');
          return;
        }
        await api.post('/employees', payload);
      }

      // Reset Form
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setRole('Staff');
      setIsActive(true);
      setEditId(null);
      setFormOpen(false);

      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save staff credentials.');
    }
  };

  const startEdit = (emp) => {
    setEditId(emp.id);
    setName(emp.name);
    setPhone(emp.phone);
    setEmail(emp.email || '');
    setPassword('');
    setRole(emp.role);
    setIsActive(emp.is_active);
    setFormOpen(true);
  };

  const handleToggleActive = async (id, currentActive) => {
    const actionText = currentActive ? 'suspend' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionText} this employee account?`)) return;
    try {
      await api.post(`/employees/${id}/toggle-active`);
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${actionText} account.`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to PERMANENTLY delete this employee account? This action cannot be undone.')) return;
    try {
      await api.delete(`/employees/${id}`);
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete employee account.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Staff Management</h1>
          <p className="text-sm text-navy-500 dark:text-navy-450">Provision staff portal access credentials, update roles, and manage system logs.</p>
        </div>
        <button
          onClick={() => {
            setEditId(null); setName(''); setPhone(''); setEmail(''); setPassword(''); setRole('Staff'); setIsActive(true);
            setFormOpen(true);
          }}
          className="flex items-center justify-center gap-2 rounded-lg bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-coral-500/20 hover:bg-coral-600 transition-all self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Register Staff Member</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400">
          <AlertCircle size={18} className="shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-navy-850 dark:bg-navy-900">
        <Search size={18} className="text-navy-400" />
        <input
          type="text"
          placeholder="Search by Name, Role, Phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-sm text-navy-900 focus:outline-none dark:text-white"
        />
      </div>

      {/* Staff Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-850 dark:bg-navy-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-navy-500 uppercase tracking-wider dark:border-navy-800 dark:bg-navy-900/50 dark:text-navy-400">
                <th className="px-6 py-4">Employee Name</th>
                <th className="px-6 py-4">Contact Phone</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role Assigned</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-navy-800 dark:divide-navy-850 dark:text-navy-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-coral-500 border-t-transparent"></div>
                  </td>
                </tr>
              ) : employees.length > 0 ? (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-navy-800/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-navy-900 dark:text-white">{emp.name}</td>
                    <td className="px-6 py-4">{emp.phone}</td>
                    <td className="px-6 py-4 text-navy-500 dark:text-navy-400">{emp.email || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold">
                        <Shield size={12} className="text-coral-500" />
                        <span>{emp.role}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded px-2.5 py-0.5 text-xs font-semibold ${
                        emp.is_active 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' 
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'
                      }`}>
                        {emp.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => startEdit(emp)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-850 transition-colors"
                      >
                        <Edit3 size={12} />
                        <span>Edit</span>
                      </button>
                      
                      <button 
                        onClick={() => handleToggleActive(emp.id, emp.is_active)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold transition-colors ${
                          emp.is_active 
                            ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:border-amber-250 dark:border-navy-800' 
                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-250 dark:border-navy-800'
                        }`}
                      >
                        {emp.is_active ? <UserMinus size={12} /> : <UserCheck size={12} />}
                        <span>{emp.is_active ? 'Suspend' : 'Activate'}</span>
                      </button>

                      <button 
                        onClick={() => handleDelete(emp.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:border-navy-800 dark:hover:bg-rose-950/20 transition-colors"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-navy-400">
                    No employees matching the search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/55 backdrop-blur-sm">
          <div className="h-full w-full max-w-md bg-white p-6 shadow-2xl overflow-y-auto dark:bg-navy-900 transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-navy-800">
              <h2 className="text-lg font-bold text-navy-900 dark:text-white">
                {editId ? 'Modify Staff Credentials' : 'Provision Staff Portal Access'}
              </h2>
              <button onClick={() => setFormOpen(false)} className="text-navy-400 hover:text-navy-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Staff Name *</label>
                <input
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Reddy"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Phone Number *</label>
                <input
                  type="text" required value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Email Address</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. email@jyothilab.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Portal Password {editId && '(leave blank to keep unchanged)'}</label>
                <input
                  type="password" required={!editId} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={editId ? 'Enter new password' : 'Enter password'}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Role Permission Group *</label>
                <select
                  value={role} onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                >
                  {roles.map((r, i) => (
                    <option key={i} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  id="isActiveCheck"
                  className="h-4 w-4 rounded border-slate-300 text-coral-500 focus:ring-coral-500"
                />
                <label htmlFor="isActiveCheck" className="text-sm text-navy-700 dark:text-navy-300 select-none cursor-pointer">
                  Account is Active / Enabled
                </label>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-coral-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-coral-600 transition-all mt-6"
              >
                {editId ? 'Save Changes' : 'Provision Login Credentials'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Employees;
