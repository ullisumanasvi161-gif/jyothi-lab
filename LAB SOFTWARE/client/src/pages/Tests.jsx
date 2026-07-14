import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Search, FlaskConical, Edit3, Trash2, X, 
  Layers, AlertCircle, Save, CheckCircle
} from 'lucide-react';

const Tests = () => {
  const { hasRole } = useAuth();

  const [tests, setTests] = useState([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Drawer Form states
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Biochemistry');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('mg/dL');
  const [template, setTemplate] = useState('');
  const [description, setDescription] = useState('');
  
  // Interactive Reference Ranges List
  const [parameters, setParameters] = useState([{ parameter: '', min: '', max: '', unit: '' }]);

  const departments = ['Biochemistry', 'Hematology', 'Microbiology', 'Pathology', 'Serology', 'Urinalysis'];

  const fetchTests = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/tests?search=${search}&department=${deptFilter}`);
      setTests(response.data);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve diagnostic tests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, [search, deptFilter]);

  const addParameterRow = () => {
    setParameters([...parameters, { parameter: '', min: '', max: '', unit: '' }]);
  };

  const removeParameterRow = (idx) => {
    setParameters(parameters.filter((_, i) => i !== idx));
  };

  const handleParamChange = (idx, field, val) => {
    const updated = [...parameters];
    updated[idx][field] = val;
    setParameters(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      
      // Clean and validate parameter arrays
      const cleanedParams = parameters
        .filter(p => p.parameter.trim() !== '')
        .map(p => ({
          parameter: p.parameter.trim(),
          min: p.min !== '' ? parseFloat(p.min) : 0,
          max: p.max !== '' ? parseFloat(p.max) : 0,
          unit: p.unit.trim()
        }));

      const payload = {
        code,
        name,
        department,
        price: parseFloat(price) || 0,
        normal_range: cleanedParams,
        unit: unit || '',
        template: template || '',
        description: description || ''
      };

      if (editId) {
        await api.put(`/tests/${editId}`, payload);
      } else {
        await api.post('/tests', payload);
      }

      // Reset Form
      setCode('');
      setName('');
      setDepartment('Biochemistry');
      setPrice('');
      setUnit('mg/dL');
      setTemplate('');
      setDescription('');
      setParameters([{ parameter: '', min: '', max: '', unit: '' }]);
      setEditId(null);
      setFormOpen(false);

      fetchTests();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save diagnostic test details.');
    }
  };

  const startEdit = (test) => {
    setEditId(test.id);
    setCode(test.code);
    setName(test.name);
    setDepartment(test.department);
    setPrice(test.price);
    setUnit(test.unit || '');
    setTemplate(test.template || '');
    setDescription(test.description || '');

    // Load ranges JSON
    let parsedRanges = [];
    try {
      parsedRanges = typeof test.normal_range === 'string' ? JSON.parse(test.normal_range) : (test.normal_range || []);
    } catch {
      parsedRanges = [];
    }

    setParameters(parsedRanges.length > 0 ? parsedRanges : [{ parameter: '', min: '', max: '', unit: '' }]);
    setFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this test template from catalog?')) return;
    try {
      await api.delete(`/tests/${id}`);
      fetchTests();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete test.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Tests & Packages Catalog</h1>
          <p className="text-sm text-navy-500 dark:text-navy-450">Maintain clinic testing inventory, department structures, reference ranges, and pricing tables.</p>
        </div>
        <button
          onClick={() => {
            setEditId(null); setCode(''); setName(''); setDepartment('Biochemistry'); setPrice(''); setUnit('mg/dL'); setTemplate('');
            setDescription('');
            setParameters([{ parameter: '', min: '', max: '', unit: '' }]);
            setFormOpen(true);
          }}
          className="flex items-center justify-center gap-2 rounded-lg bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-coral-500/20 hover:bg-coral-600 transition-all self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Create Diagnostic Test</span>
        </button>
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
            placeholder="Search by Code or Test Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-navy-900 focus:outline-none dark:text-white"
          />
        </div>

        {/* Dept Filter */}
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-navy-400" />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none dark:border-navy-850 dark:bg-navy-900"
          >
            <option value="">All Departments</option>
            {departments.map((d, i) => (
              <option key={i} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tests Catalog Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-850 dark:bg-navy-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-navy-500 uppercase tracking-wider dark:border-navy-800 dark:bg-navy-900/50 dark:text-navy-400">
                <th className="px-6 py-4">Sr. No.</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Test Name</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Parameters Checked</th>
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
              ) : tests.length > 0 ? (
                tests.map((test, index) => {
                  let paramsCount = 0;
                  try {
                    const parsed = typeof test.normal_range === 'string' ? JSON.parse(test.normal_range) : (test.normal_range || []);
                    paramsCount = parsed.length;
                  } catch {
                    paramsCount = 0;
                  }

                  return (
                    <tr key={test.id} className="hover:bg-slate-50/50 dark:hover:bg-navy-800/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-navy-500 dark:text-navy-400">{index + 1}</td>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-coral-500 dark:text-coral-450">{test.code}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-navy-900 dark:text-white">{test.name}</div>
                        {test.description && (
                          <div className="text-xs text-navy-450 dark:text-navy-550 italic font-normal mt-0.5 max-w-xs truncate" title={test.description}>
                            {test.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-navy-500 dark:text-navy-450">{test.department}</td>
                      <td className="px-6 py-4 font-bold">₹{parseFloat(test.price).toFixed(2)}</td>
                      <td className="px-6 py-4">{paramsCount} parameters</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => startEdit(test)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-850 transition-colors"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                        {hasRole(['Admin']) && (
                          <button 
                            onClick={() => handleDelete(test.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:border-navy-800 dark:hover:bg-rose-950/20 transition-colors"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-navy-400">
                    No diagnostic tests configured in catalog.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Creation / Edit Drawer Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/55 backdrop-blur-sm">
          <div className="h-full w-full max-w-xl bg-white p-6 shadow-2xl overflow-y-auto dark:bg-navy-900 transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-navy-800">
              <h2 className="text-lg font-bold text-navy-900 dark:text-white">{editId ? 'Edit Test Configuration' : 'Create Diagnostic Test'}</h2>
              <button onClick={() => setFormOpen(false)} className="text-navy-400 hover:text-navy-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Test Code *</label>
                  <input
                    type="text" required value={code} onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. CBC, LFT"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Test Price (INR) *</label>
                  <input
                    type="number" required value={price} onChange={(e) => setPrice(e.target.value)}
                    placeholder="₹ Price" min="0"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Test Name *</label>
                <input
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Fasting Blood Sugar"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Test Description / Notes (optional)</label>
                <textarea
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Requires 8-10 hours fasting prior to sample collection."
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Department *</label>
                  <select
                    value={department} onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                  >
                    {departments.map((d, i) => (
                      <option key={i} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Test Unit (optional)</label>
                  <input
                    type="text" value={unit} onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. mg/dL, Profile"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                  />
                </div>
              </div>

              {/* Reference Parameters Builder */}
              <div className="border-t border-slate-100 dark:border-navy-800 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-coral-500 uppercase tracking-wider">Reference Parameters</h3>
                  <button
                    type="button"
                    onClick={addParameterRow}
                    className="flex items-center gap-1 text-xs font-bold text-navy-600 hover:text-navy-900 dark:text-navy-300 dark:hover:text-white"
                  >
                    <Plus size={14} />
                    <span>Add Parameter</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {parameters.map((param, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-50 bg-slate-50/50 p-3 dark:border-navy-800 dark:bg-navy-950/20">
                      <div className="grid grid-cols-4 gap-2 flex-1">
                        <input
                          type="text" required placeholder="Name"
                          value={param.parameter}
                          onChange={(e) => handleParamChange(idx, 'parameter', e.target.value)}
                          className="rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none dark:border-navy-850 dark:bg-navy-950"
                        />
                        <input
                          type="number" step="any" placeholder="Min"
                          value={param.min}
                          onChange={(e) => handleParamChange(idx, 'min', e.target.value)}
                          className="rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none dark:border-navy-850 dark:bg-navy-950"
                        />
                        <input
                          type="number" step="any" placeholder="Max"
                          value={param.max}
                          onChange={(e) => handleParamChange(idx, 'max', e.target.value)}
                          className="rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none dark:border-navy-850 dark:bg-navy-950"
                        />
                        <input
                          type="text" placeholder="Unit"
                          value={param.unit}
                          onChange={(e) => handleParamChange(idx, 'unit', e.target.value)}
                          className="rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none dark:border-navy-850 dark:bg-navy-950"
                        />
                      </div>
                      
                      {parameters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeParameterRow(idx)}
                          className="text-navy-400 hover:text-rose-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-coral-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-coral-600 transition-all mt-6"
              >
                Save Configured Template
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Tests;
