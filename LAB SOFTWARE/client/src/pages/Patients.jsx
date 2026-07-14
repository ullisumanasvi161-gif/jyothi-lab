import React, { useState, useEffect } from 'react';
import api, { API_BASE_URL } from '../services/api';
import { 
  Plus, Search, User, Phone, MapPin, Mail, Calendar, 
  ChevronLeft, ChevronRight, X, Eye, Printer, AlertCircle, Clock, CheckCircle,
  Edit3, Upload
} from 'lucide-react';

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Drawer states
  const [registerOpen, setRegisterOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState({ bills: [], reports: [] });
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('');
  const [ageUnit, setAgeUnit] = useState('Years');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [referralDoctorId, setReferralDoctorId] = useState('');

  // Edit & Insurance states
  const [editId, setEditId] = useState(null);
  const [patientType, setPatientType] = useState('General');
  const [insuranceCompany, setInsuranceCompany] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [policyHolderName, setPolicyHolderName] = useState('');
  const [insuranceId, setInsuranceId] = useState('');
  const [coverageAmount, setCoverageAmount] = useState('');
  const [corporateCompany, setCorporateCompany] = useState('');
  const [docPath, setDocPath] = useState('');
  const [docUploading, setDocUploading] = useState(false);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/patients?search=${search}&page=${page}&limit=10`);
      setPatients(response.data.patients);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve patient directory.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/doctors');
      setDoctors(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [search, page]);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const resetForm = () => {
    setName('');
    setPhone('');
    setGender('Male');
    setAge('');
    setAgeUnit('Years');
    setEmail('');
    setAddress('');
    setReferralDoctorId('');
    setPatientType('General');
    setInsuranceCompany('');
    setPolicyNumber('');
    setPolicyHolderName('');
    setInsuranceId('');
    setCoverageAmount('');
    setCorporateCompany('');
    setDocPath('');
    setEditId(null);
    setRegisterOpen(false);
  };

  const startEdit = (pat) => {
    setEditId(pat.id);
    setName(pat.name);
    setPhone(pat.phone);
    setGender(pat.gender);
    setAge(pat.age);
    setAgeUnit(pat.age_unit || 'Years');
    setEmail(pat.email || '');
    setAddress(pat.address || '');
    setReferralDoctorId(pat.referral_doctor_id || '');
    setPatientType(pat.patient_type || 'General');
    setInsuranceCompany(pat.insurance_company || '');
    setPolicyNumber(pat.policy_number || '');
    setPolicyHolderName(pat.policy_holder_name || '');
    setInsuranceId(pat.insurance_id || '');
    setCoverageAmount(pat.coverage_amount || '');
    setCorporateCompany(pat.corporate_company || '');
    setDocPath(pat.insurance_document_path || '');
    setRegisterOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('document', file);

    try {
      setDocUploading(true);
      setError('');
      const res = await api.post('/patients/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDocPath(res.data.filePath);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to upload insurance document.');
    } finally {
      setDocUploading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const payload = {
        name,
        gender,
        age: parseInt(age),
        age_unit: ageUnit,
        phone,
        email: email || null,
        address: address || null,
        referral_doctor_id: referralDoctorId ? parseInt(referralDoctorId) : null,
        patient_type: patientType,
        insurance_company: patientType !== 'General' ? insuranceCompany : null,
        policy_number: patientType !== 'General' ? policyNumber : null,
        policy_holder_name: patientType !== 'General' ? policyHolderName : null,
        insurance_id: patientType !== 'General' ? insuranceId : null,
        coverage_amount: patientType !== 'General' ? parseFloat(coverageAmount) || 0.0 : 0.0,
        corporate_company: patientType === 'Corporate' ? corporateCompany : null,
        insurance_document_path: patientType !== 'General' ? docPath : null
      };

      if (editId) {
        await api.put(`/patients/${editId}`, payload);
      } else {
        await api.post('/patients', payload);
      }
      
      resetForm();
      fetchPatients();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save patient details.');
    }
  };

  const openHistoryDrawer = async (patient) => {
    setSelectedPatient(patient);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const response = await api.get(`/patients/${patient.id}/history`);
      setPatientHistory(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="relative space-y-6">
      {/* Top action header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Patients Directory</h1>
          <p className="text-sm text-navy-500 dark:text-navy-450">Manage profiles, UHID timelines, and medical histories.</p>
        </div>
        <button
          onClick={() => { resetForm(); setRegisterOpen(true); }}
          className="flex items-center justify-center gap-2 rounded-lg bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-coral-500/20 hover:bg-coral-600 transition-all self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Live search input */}
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-navy-850 dark:bg-navy-900">
        <Search size={16} className="shrink-0 text-navy-400" />
        <input
          type="text"
          placeholder="Search by UHID, Name or Phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full bg-transparent text-sm text-navy-900 placeholder-navy-400 focus:outline-none dark:text-white"
          style={{ fontSize: '16px' }}
        />
        {search && (
          <button onClick={() => { setSearch(''); setPage(1); }} className="text-navy-400 hover:text-navy-600 shrink-0">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Mobile Card List — shown on small screens only */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral-500 border-t-transparent"></div>
          </div>
        ) : patients.length > 0 ? (
          patients.map((pat) => (
            <div key={pat.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-navy-850 dark:bg-navy-900 animate-fade-in">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-navy-900 dark:text-white text-sm">{pat.name}</span>
                    {pat.patient_type && pat.patient_type !== 'General' && (
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        pat.patient_type === 'Insurance' 
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400' 
                          : 'bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400'
                      }`}>
                        {pat.patient_type}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[11px] font-bold text-coral-500 mt-0.5">{pat.uhid}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-navy-500 dark:text-navy-400">{pat.age} {pat.age_unit} / {pat.gender}</p>
                  <p className="text-xs font-medium text-navy-700 dark:text-navy-300 mt-0.5">{pat.phone}</p>
                </div>
              </div>
              {pat.referral_doctor_name && (
                <p className="text-[11px] text-navy-400 mt-2">Dr. {pat.referral_doctor_name}</p>
              )}
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-navy-850">
                <button
                  onClick={() => startEdit(pat)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-850 transition-colors"
                >
                  <Edit3 size={12} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => openHistoryDrawer(pat)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-coral-50 px-3 py-2 text-xs font-medium text-coral-600 hover:bg-coral-100 dark:bg-coral-950/15 dark:text-coral-400 transition-colors"
                >
                  <Eye size={12} />
                  <span>Medical History</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-navy-400 dark:border-navy-850 dark:bg-navy-900">
            No patients matching this criteria.
          </div>
        )}
      </div>

      {/* Desktop Table — hidden on mobile */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-850 dark:bg-navy-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-navy-500 uppercase tracking-wider dark:border-navy-800 dark:bg-navy-900/50 dark:text-navy-400">
                <th className="px-6 py-4">UHID</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Age/Gender</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Referral Doctor</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-navy-800 dark:divide-navy-850 dark:text-navy-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-navy-400">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-coral-500 border-t-transparent"></div>
                  </td>
                </tr>
              ) : patients.length > 0 ? (
                patients.map((pat) => (
                  <tr key={pat.id} className="hover:bg-slate-50/50 dark:hover:bg-navy-800/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-coral-500 dark:text-coral-450">{pat.uhid}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-navy-900 dark:text-white">{pat.name}</div>
                      {pat.patient_type && pat.patient_type !== 'General' && (
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold mt-1 ${
                          pat.patient_type === 'Insurance' 
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400' 
                            : 'bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400'
                        }`}>
                          {pat.patient_type}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">{pat.age} {pat.age_unit} / {pat.gender}</td>
                    <td className="px-6 py-4">{pat.phone}</td>
                    <td className="px-6 py-4 text-navy-500 dark:text-navy-400">{pat.referral_doctor_name || 'Self'}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => startEdit(pat)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-850 transition-colors"
                      >
                        <Edit3 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => openHistoryDrawer(pat)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-navy-600 hover:bg-slate-50 dark:border-navy-800 dark:text-navy-300 dark:hover:bg-navy-850 transition-colors"
                      >
                        <Eye size={14} />
                        <span>Medical History</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-navy-400">
                    No patients matching this criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
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

      {/* Mobile Pagination */}
      {totalPages > 1 && (
        <div className="flex md:hidden items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-navy-850 dark:bg-navy-900">
          <span className="text-xs text-navy-500">Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-navy-600 disabled:opacity-40 dark:border-navy-800"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-navy-600 disabled:opacity-40 dark:border-navy-800"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Drawer Overlay for Registration */}
      {registerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/55 backdrop-blur-sm">
          <div className="h-full w-full sm:max-w-md bg-white shadow-2xl overflow-y-auto dark:bg-navy-900 animate-slide-in-right">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white dark:border-navy-800 dark:bg-navy-900 px-4 sm:px-6 py-4">
              <h2 className="text-base sm:text-lg font-bold text-navy-900 dark:text-white">
                {editId ? 'Edit Patient Profile' : 'Register Patient'}
              </h2>
              <button
                onClick={() => setRegisterOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-slate-100 hover:text-navy-600 dark:hover:bg-navy-800 transition-colors"
                aria-label="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Patient Name *</label>
                <input
                  type="text" required value={name} onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="Enter full name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Age *</label>
                  <input
                    type="number" required value={age} onChange={(e) => setAge(e.target.value)}
                    placeholder="Age" min="1"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Age Unit</label>
                  <select
                    value={ageUnit} onChange={(e) => setAgeUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                  >
                    <option>Years</option>
                    <option>Months</option>
                    <option>Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Gender *</label>
                <select
                  value={gender} onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Phone Number *</label>
                <input
                  type="text" required value={phone} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) setPhone(val);
                  }}
                  maxLength={10}
                  placeholder="Enter 10-digit number"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Email (Optional)</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Address (Optional)</label>
                <textarea
                  value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter residential address" rows="2"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Referral Doctor (Optional)</label>
                <select
                  value={referralDoctorId} onChange={(e) => setReferralDoctorId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                >
                  <option value="">Self / Walk-in</option>
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialization})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wide block mb-1">Patient Type *</label>
                <select
                  value={patientType} onChange={(e) => setPatientType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                >
                  <option value="General">General Patient</option>
                  <option value="Insurance">Insurance Patient</option>
                  <option value="Corporate">Corporate Patient</option>
                </select>
              </div>

              {patientType !== 'General' && (
                <div className="border-t border-slate-100 dark:border-navy-800 pt-4 space-y-4">
                  <h3 className="text-xs font-bold text-coral-500 uppercase tracking-wider">Insurance & Corporate Details</h3>
                  
                  {patientType === 'Corporate' && (
                    <div>
                      <label className="text-xs font-semibold text-navy-500 block mb-1">Corporate Company Name *</label>
                      <input
                        type="text" required value={corporateCompany} onChange={(e) => setCorporateCompany(e.target.value)}
                        placeholder="e.g. Acme Corp"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-navy-500 block mb-1">Insurance Provider / TPA *</label>
                    <input
                      type="text" required value={insuranceCompany} onChange={(e) => setInsuranceCompany(e.target.value)}
                      placeholder="e.g. Star Health, HDFC Ergo"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-navy-500 block mb-1">Policy Number *</label>
                      <input
                        type="text" required value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)}
                        placeholder="Policy No"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-navy-500 block mb-1">Policy Holder Name *</label>
                      <input
                        type="text" required value={policyHolderName} onChange={(e) => setPolicyHolderName(e.target.value)}
                        placeholder="Holder Name"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-navy-500 block mb-1">Insurance ID / Card No *</label>
                      <input
                        type="text" required value={insuranceId} onChange={(e) => setInsuranceId(e.target.value)}
                        placeholder="ID Card No"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-navy-500 block mb-1">Coverage Amount (INR)</label>
                      <input
                        type="number" value={coverageAmount} onChange={(e) => setCoverageAmount(e.target.value)}
                        placeholder="Max limit" min="0"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-navy-500 block mb-1">Upload Insurance Card / Document</label>
                    <div className="flex items-center gap-3">
                      <label className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-350 p-4 text-xs text-navy-550 dark:border-navy-800 cursor-pointer hover:bg-slate-50 hover:text-navy-800 transition-colors">
                        <Upload size={16} />
                        <span>{docUploading ? 'Uploading...' : 'Choose File'}</span>
                        <input
                          type="file" accept="image/*,application/pdf" onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      {docPath && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 rounded-lg">
                          <CheckCircle size={14} />
                          <span>Uploaded</span>
                        </div>
                      )}
                    </div>
                    {docPath && (
                      <p className="text-[10px] text-navy-450 dark:text-navy-500 mt-1 truncate">
                        Path: {docPath}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={docUploading}
                className="w-full rounded-lg bg-coral-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-coral-600 active:bg-coral-700 disabled:opacity-50 transition-colors"
              >
                {editId ? 'Save Patient Changes' : 'Register Profile'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Drawer Overlay for History */}
      {historyOpen && selectedPatient && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/55 backdrop-blur-sm">
          <div className="h-full w-full sm:max-w-lg bg-white shadow-2xl overflow-y-auto dark:bg-navy-900 animate-slide-in-right">
            {/* Sticky header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white dark:border-navy-800 dark:bg-navy-900 px-4 sm:px-6 py-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-navy-900 dark:text-white">Medical File &amp; History</h2>
                <p className="text-xs text-navy-450 dark:text-navy-500 font-mono">{selectedPatient.uhid}</p>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-slate-100 hover:text-navy-600 dark:hover:bg-navy-800 transition-colors"
                aria-label="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer body */}
            <div className="p-4 sm:p-6">
              {/* Patient profile details */}
              <div className="mt-2 rounded-xl bg-slate-50 p-4 space-y-2 text-sm dark:bg-navy-950">
                <p><strong className="text-navy-500 dark:text-navy-400">Full Name:</strong> {selectedPatient.name}</p>
                <p><strong className="text-navy-500 dark:text-navy-400">Age / Gender:</strong> {selectedPatient.age} {selectedPatient.age_unit} / {selectedPatient.gender}</p>
                <p><strong className="text-navy-500 dark:text-navy-400">Contact No:</strong> {selectedPatient.phone}</p>
                {selectedPatient.email && <p><strong className="text-navy-500 dark:text-navy-400">Email:</strong> {selectedPatient.email}</p>}
                {selectedPatient.address && <p><strong className="text-navy-500 dark:text-navy-400">Address:</strong> {selectedPatient.address}</p>}
                <p><strong className="text-navy-500 dark:text-navy-400">Referral Doctor:</strong> {selectedPatient.referral_doctor_name || 'Self'}</p>
                <p><strong className="text-navy-500 dark:text-navy-400">Patient Type:</strong> {selectedPatient.patient_type || 'General'}</p>
                {selectedPatient.patient_type && selectedPatient.patient_type !== 'General' && (
                  <>
                    {selectedPatient.patient_type === 'Corporate' && (
                      <p><strong className="text-navy-500 dark:text-navy-400">Corporate Co:</strong> {selectedPatient.corporate_company}</p>
                    )}
                    <p><strong className="text-navy-500 dark:text-navy-400">Insurance Co:</strong> {selectedPatient.insurance_company}</p>
                    <p><strong className="text-navy-500 dark:text-navy-400">Policy Number:</strong> {selectedPatient.policy_number}</p>
                    <p><strong className="text-navy-500 dark:text-navy-400">Policy Holder:</strong> {selectedPatient.policy_holder_name}</p>
                    <p><strong className="text-navy-500 dark:text-navy-400">Insurance ID:</strong> {selectedPatient.insurance_id}</p>
                    <p><strong className="text-navy-500 dark:text-navy-400">Coverage Max:</strong> ₹{parseFloat(selectedPatient.coverage_amount || 0).toFixed(2)}</p>
                    {selectedPatient.insurance_document_path && (
                      <p>
                        <strong className="text-navy-500 dark:text-navy-400">Document:</strong>{' '}
                        <a
                          href={`${API_BASE_URL}${selectedPatient.insurance_document_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-coral-500 font-semibold hover:underline"
                        >
                          View Policy Card / ID
                        </a>
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* History tabs */}
              <div className="mt-6">
                <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wide dark:text-white mb-4">Historical Records</h3>

                {historyLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-coral-500 border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Invoices List */}
                    <div>
                      <h4 className="text-xs font-bold text-coral-500 uppercase tracking-wider mb-2">Generated Bills</h4>
                      {patientHistory.bills.length > 0 ? (
                        <div className="space-y-2">
                          {patientHistory.bills.map((bill) => (
                            <div key={bill.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 dark:border-navy-800">
                              <div>
                                <p className="font-semibold text-sm text-navy-800 dark:text-white">{bill.bill_number}</p>
                                <p className="text-xs text-navy-450 dark:text-navy-550">{new Date(bill.created_at).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold">₹{bill.net_amount}</p>
                                <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                                  bill.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20'
                                }`}>{bill.payment_status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-navy-400">No bills generated for this patient.</p>
                      )}
                    </div>

                    {/* Reports List */}
                    <div>
                      <h4 className="text-xs font-bold text-coral-500 uppercase tracking-wider mb-2">Diagnostic Reports</h4>
                      {patientHistory.reports.length > 0 ? (
                        <div className="space-y-2">
                          {patientHistory.reports.map((rep) => (
                            <div key={rep.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 dark:border-navy-800">
                              <div>
                                <p className="font-semibold text-sm text-navy-800 dark:text-white">{rep.test_name}</p>
                                <p className="text-xs text-navy-450 dark:text-navy-550">{rep.department}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                {rep.status === 'Approved' ? (
                                  <div className="flex gap-2">
                                    <a
                                      href={`${API_BASE_URL}/api/reports/${rep.id}/pdf?token=${localStorage.getItem('jyothi_token')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex h-8 px-2.5 items-center justify-center gap-1 rounded bg-coral-50 text-coral-500 hover:bg-coral-100 dark:bg-coral-950/15 text-xs font-semibold"
                                      title="Print Report with Letterhead"
                                    >
                                      <Printer size={13} />
                                      <span className="hidden sm:inline">With Head</span>
                                    </a>
                                    <a
                                      href={`${API_BASE_URL}/api/reports/${rep.id}/pdf?token=${localStorage.getItem('jyothi_token')}&letterhead=false`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex h-8 px-2.5 items-center justify-center gap-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-800 dark:text-navy-300 dark:hover:bg-navy-750 text-xs font-semibold"
                                      title="Print Report without Letterhead"
                                    >
                                      <Printer size={13} />
                                      <span className="hidden sm:inline">Without Head</span>
                                    </a>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-medium">
                                    <Clock size={12} />
                                    <span>{rep.status}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-navy-400">No test reports requested yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;
