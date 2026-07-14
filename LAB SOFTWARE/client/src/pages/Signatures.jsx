import React, { useState, useEffect } from 'react';
import api, { API_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  PenTool, Plus, Trash2, Edit3, X, AlertCircle, 
  CheckCircle2, Sparkles, User, Info, FileImage, ShieldAlert
} from 'lucide-react';

const Signatures = () => {
  const { user, hasRole } = useAuth();
  
  // Signature list and employee lookup catalog
  const [signatures, setSignatures] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [selectedUserId, setSelectedUserId] = useState('');
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('All');
  
  const [signatureFile, setSignatureFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Departments list catalog
  const departments = [
    { name: 'All Departments (Default Fallback)', value: 'All' },
    { name: 'Hematology', value: 'Hematology' },
    { name: 'Biochemistry', value: 'Biochemistry' },
    { name: 'Clinical Pathology', value: 'Clinical Pathology' },
    { name: 'Microbiology', value: 'Microbiology' },
    { name: 'Serology', value: 'Serology' },
    { name: 'Hormones / Immunology', value: 'Hormones' }
  ];

  const fetchSignatures = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/signatures');
      setSignatures(res.data);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve digital signatures registry.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      const res = await api.get('/employees');
      // Filter for roles that sign off reports (Admin, Pathologist, Doctor)
      const signingStaff = res.data.filter(u => 
        ['Admin', 'Pathologist', 'Doctor'].includes(u.role) && u.is_active
      );
      setStaffUsers(signingStaff);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSignatures();
    fetchStaffUsers();
  }, []);

  const openAddModal = () => {
    setIsEdit(false);
    setEditId(null);
    setSelectedUserId('');
    setName('');
    setDesignation('');
    setDepartment('All');
    setSignatureFile(null);
    setPreviewUrl('');
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const openEditModal = (sig) => {
    setIsEdit(true);
    setEditId(sig.id);
    setSelectedUserId(sig.user_id);
    setName(sig.name);
    setDesignation(sig.designation);
    setDepartment(sig.department || 'All');
    setSignatureFile(null);
    setPreviewUrl(`${API_BASE_URL}${sig.signature_path}`);
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSignatureFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitLoading(true);

    try {
      const formData = new FormData();
      formData.append('user_id', selectedUserId);
      formData.append('name', name);
      formData.append('designation', designation);
      formData.append('department', department);
      if (signatureFile) {
        formData.append('signature', signatureFile);
      }

      if (isEdit) {
        await api.put(`/signatures/${editId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setSuccess('Digital signature updated successfully.');
      } else {
        if (!signatureFile) {
          setError('Please select a signature image file to upload.');
          setSubmitLoading(false);
          return;
        }
        await api.post('/signatures', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setSuccess('New digital signature uploaded and assigned successfully.');
      }

      setTimeout(() => {
        setModalOpen(false);
        fetchSignatures();
      }, 1000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to save digital signature.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id, doctorName) => {
    if (!window.confirm(`Are you sure you want to permanently delete the digital signature for ${doctorName}?`)) {
      return;
    }
    try {
      setError('');
      setSuccess('');
      await api.delete(`/signatures/${id}`);
      setSuccess('Digital signature record deleted.');
      fetchSignatures();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to delete digital signature.');
    }
  };

  const handleUserSelect = (userId) => {
    setSelectedUserId(userId);
    const selectedUser = staffUsers.find(u => u.id === parseInt(userId));
    if (selectedUser) {
      setName(selectedUser.name);
      // Pre-fill designation based on roles
      if (selectedUser.role === 'Pathologist') {
        setDesignation('MD, Consultant Pathologist');
      } else if (selectedUser.role === 'Doctor') {
        setDesignation('MBBS, Consultant Physician');
      } else {
        setDesignation('Medical Director');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white flex items-center gap-2">
            <PenTool className="text-coral-500" />
            <span>Digital Signatures Registry</span>
          </h1>
          <p className="text-sm text-navy-500 dark:text-navy-450">
            Upload authorized digital signatures to place automatically on finalized diagnostic reports.
          </p>
        </div>
        
        {hasRole(['Admin', 'Pathologist']) && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-coral-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-coral-500/25 hover:bg-coral-600 transition-all self-start sm:self-center"
          >
            <Plus size={16} />
            <span>Add Signature</span>
          </button>
        )}
      </div>

      {/* Message Banners */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-rose-500">
          <AlertCircle size={18} className="shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={18} className="shrink-0" />
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}

      {/* Grid List View */}
      {loading && signatures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-coral-500 border-t-transparent"></div>
          <p className="text-sm font-semibold text-navy-450">Loading signatures registry...</p>
        </div>
      ) : signatures.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {signatures.map((sig) => (
            <div 
              key={sig.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-navy-850 dark:bg-navy-900 hover:shadow-md transition-all relative overflow-hidden group"
            >
              {/* Top Banner Ribbon */}
              <div className="absolute top-0 right-0 bg-coral-500/10 text-coral-500 text-[9px] font-bold px-2 py-0.5 rounded-bl font-mono uppercase">
                Dept: {sig.department}
              </div>

              <div className="space-y-4">
                {/* User Info */}
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-50 text-navy-600 dark:bg-navy-800 dark:text-navy-300">
                    <User size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-navy-900 dark:text-white">{sig.name}</h4>
                    <p className="text-xs text-navy-450 font-semibold">{sig.designation}</p>
                    <span className="inline-block mt-1 text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-navy-800 dark:text-navy-400 px-1.5 py-0.5 rounded">
                      Linked: {sig.user_name} ({sig.user_role})
                    </span>
                  </div>
                </div>

                {/* Checkered Signature Preview Box */}
                <div 
                  className="flex h-24 w-full items-center justify-center rounded-lg border border-slate-100 p-2 relative"
                  style={{
                    backgroundImage: 'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
                    backgroundSize: '12px 12px',
                    backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <img 
                    src={`${API_BASE_URL}${sig.signature_path}`} 
                    alt={`Signature for ${sig.name}`}
                    className="max-h-full max-w-full object-contain print:mix-blend-multiply"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100 dark:border-navy-800">
                {hasRole(['Admin', 'Pathologist']) && (
                  <button
                    onClick={() => openEditModal(sig)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-navy-700 px-2.5 py-1.5 text-xs font-semibold dark:border-navy-800 dark:bg-navy-900 dark:text-navy-300 dark:hover:bg-navy-850"
                  >
                    <Edit3 size={12} />
                    <span>Edit</span>
                  </button>
                )}
                {hasRole(['Admin']) && (
                  <button
                    onClick={() => handleDelete(sig.id, sig.name)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-250 bg-rose-50/10 hover:bg-rose-50 text-rose-500 px-2.5 py-1.5 text-xs font-semibold dark:border-rose-900/30"
                  >
                    <Trash2 size={12} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-200 dark:border-navy-800 rounded-2xl bg-white dark:bg-navy-900 text-center">
          <div className="rounded-full bg-coral-500/10 text-coral-500 p-4 mb-3">
            <Sparkles size={32} />
          </div>
          <h4 className="text-base font-bold text-navy-900 dark:text-white">No Digital Signatures Found</h4>
          <p className="text-xs text-navy-450 mt-1 max-w-xs leading-normal">
            No authorized signature images are currently registered. Click 'Add Signature' to upload your first signature.
          </p>
        </div>
      )}

      {/* Add/Edit Signature Dialog Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div 
            className="fixed inset-0" 
            onClick={() => !submitLoading && setModalOpen(false)}
          />

          <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-navy-850 dark:bg-navy-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-navy-800">
              <h3 className="text-lg font-bold text-navy-900 dark:text-white">
                {isEdit ? 'Update Digital Signature' : 'Upload Digital Signature'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                disabled={submitLoading}
                className="rounded-lg p-1.5 text-navy-400 hover:bg-slate-100 hover:text-navy-700 dark:hover:bg-navy-850 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Select System User/Doctor */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy-450 uppercase tracking-wide">Assign to Portal User</label>
                <select
                  disabled={isEdit || submitLoading}
                  value={selectedUserId}
                  onChange={(e) => handleUserSelect(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950 disabled:opacity-65"
                >
                  <option value="">-- Select Doctor / Pathologist --</option>
                  {staffUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
                <p className="text-[10px] text-navy-450 flex items-center gap-1 mt-1 leading-normal">
                  <Info size={10} />
                  <span>Only active accounts with Admin, Pathologist or Doctor roles are listed.</span>
                </p>
              </div>

              {/* Display Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy-450 uppercase tracking-wide">Doctor / Print Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DR. LAKSHMI PRASAD, MD"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitLoading}
                  className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800"
                />
              </div>

              {/* Designation */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy-450 uppercase tracking-wide">Designation / Degree</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Consultant Pathologist"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  disabled={submitLoading}
                  className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800"
                />
              </div>

              {/* Department Assignment */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy-450 uppercase tracking-wide">Department Scope Assignment</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={submitLoading}
                  className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                >
                  {departments.map(dept => (
                    <option key={dept.value} value={dept.value}>{dept.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-coral-500 flex items-center gap-1 mt-1 leading-normal font-semibold">
                  <Sparkles size={10} />
                  <span>Report PDFs automatically inherit matching department-assigned signatures.</span>
                </p>
              </div>

              {/* File Image Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy-450 uppercase tracking-wide">Signature Image file</label>
                
                <div className="flex items-center gap-3">
                  <label className="flex flex-1 items-center justify-center gap-2 border border-dashed border-slate-350 rounded-lg p-4 cursor-pointer hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-850">
                    <FileImage size={16} className="text-navy-400" />
                    <span className="text-xs font-bold text-navy-700 dark:text-navy-300">
                      {signatureFile ? signatureFile.name : 'Select image...'}
                    </span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleFileChange}
                      required={!isEdit}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Upload Preview box */}
                {previewUrl && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-navy-400 block uppercase">Upload Preview</span>
                    <div 
                      className="flex h-20 w-full items-center justify-center rounded-lg border border-slate-200 p-2"
                      style={{
                        backgroundImage: 'linear-gradient(45deg, #f8fafc 25%, transparent 25%), linear-gradient(-45deg, #f8fafc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f8fafc 75%), linear-gradient(-45deg, transparent 75%, #f8fafc 75%)',
                        backgroundSize: '10px 10px',
                        backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-navy-800">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-coral-500 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-coral-600"
                >
                  {submitLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <span>Save Signature</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitLoading}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-xs font-semibold hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-800 text-center text-navy-700 dark:text-navy-300"
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

export default Signatures;
