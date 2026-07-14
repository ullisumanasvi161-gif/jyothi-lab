import React, { useState, useEffect } from 'react';
import api, { API_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  FileSpreadsheet, Search, Filter, Clock, CheckCircle2, 
  AlertCircle, Edit3, Printer, Save, Check, X, ShieldAlert 
} from 'lucide-react';
import Barcode from '../components/Barcode';

const Reports = () => {
  const { user, hasRole } = useAuth();
  
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // Pending, Waiting, Approved
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Selected report actions
  const [activeReport, setActiveReport] = useState(null);
  const [resultValues, setResultValues] = useState({}); // parameter -> value
  const [actionPanelOpen, setActionPanelOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Label printing states
  const [labelReport, setLabelReport] = useState(null);
  const [showLabelModal, setShowLabelModal] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/reports?search=${search}&status=${statusFilter}`);
      setReports(response.data);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve reports queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [search, statusFilter]);

  const openActionPanel = (report) => {
    setActiveReport(report);
    
    // Pre-populate input values if they exist
    const values = report.result_values || {};
    const parsedValues = {};
    
    // Ensure we initialize fields for all parameters
    const params = report.normal_range || [];
    params.forEach(p => {
      parsedValues[p.parameter] = values[p.parameter] !== undefined ? values[p.parameter] : '';
    });

    setResultValues(parsedValues);
    setActionPanelOpen(true);
  };

  const handleValueChange = (parameter, val) => {
    setResultValues({
      ...resultValues,
      [parameter]: val
    });
  };

  // Lab Technician / Pathologist saves parameters
  const handleSaveResults = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await api.put(`/reports/${activeReport.id}/results`, { result_values: resultValues });
      setActionPanelOpen(false);
      fetchReports();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save test values.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Pathologist approves report
  const handleApproveReport = async () => {
    setSubmitLoading(true);
    try {
      await api.put(`/reports/${activeReport.id}/approve`);
      setActionPanelOpen(false);
      fetchReports();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve report.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handlePrintTubeLabel = (report) => {
    setLabelReport(report);
    setShowLabelModal(true);
  };

  const executeLabelPrint = () => {
    const printContent = document.getElementById('tube-label-print-area').innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
      <style>
        @page {
          size: 2in 1in;
          margin: 0;
        }
        @media print {
          body { 
            background: white; 
            color: black; 
            margin: 0; 
            padding: 0;
          }
          #tube-label-print-area {
            width: 2in;
            height: 1in;
            box-sizing: border-box;
            padding: 4px;
            page-break-inside: avoid;
          }
        }
      </style>
      <div style="width: 2in; height: 1in; display: flex; justify-content: center; align-items: center;">
        ${printContent}
      </div>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Clinical Reports Queue</h1>
          <p className="text-sm text-navy-500 dark:text-navy-450">Input medical parameters, verify results, and authorize report releases.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400">
          <AlertCircle size={18} className="shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="flex flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-navy-850 dark:bg-navy-900">
          <Search size={18} className="text-navy-400" />
          <input
            type="text"
            placeholder="Search by UHID, Patient, Bill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-navy-900 focus:outline-none dark:text-white"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-navy-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none dark:border-navy-850 dark:bg-navy-900"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending Entry</option>
            <option value="Waiting">Waiting Approval</option>
            <option value="Approved">Approved / Finalized</option>
          </select>
        </div>
      </div>

      {/* Reports Table Queue */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-850 dark:bg-navy-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-navy-500 uppercase tracking-wider dark:border-navy-800 dark:bg-navy-900/50 dark:text-navy-400">
                <th className="px-6 py-4">Bill No</th>
                <th className="px-6 py-4">UHID</th>
                <th className="px-6 py-4">Patient Name</th>
                <th className="px-6 py-4">Test Name</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Status</th>
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
              ) : reports.length > 0 ? (
                reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/50 dark:hover:bg-navy-800/30 transition-colors">
                    <td className="px-6 py-4 font-semibold">{rep.bill_number}</td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-coral-500 dark:text-coral-450">{rep.patient_uhid}</td>
                    <td className="px-6 py-4 font-semibold text-navy-900 dark:text-white">{rep.patient_name}</td>
                    <td className="px-6 py-4 font-semibold text-navy-700 dark:text-navy-300">{rep.test_name}</td>
                    <td className="px-6 py-4 text-navy-500 dark:text-navy-400">{rep.department}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        rep.status === 'Approved' 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450' 
                          : rep.status === 'Waiting'
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-450'
                          : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-450'
                      }`}>
                        {rep.status === 'Approved' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        <span>{rep.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handlePrintTubeLabel(rep)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-navy-700 hover:bg-slate-50 dark:text-navy-300 dark:border-navy-800 dark:hover:bg-navy-850 transition-colors"
                        title="Print Sample Collection Tube Label (Thermal Sticker)"
                      >
                        <Printer size={12} />
                        <span>Tube Label</span>
                      </button>

                      {rep.status !== 'Approved' && hasRole(['Admin', 'Pathologist', 'Lab Technician']) ? (
                        <button
                          onClick={() => openActionPanel(rep)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-coral-600 transition-colors"
                        >
                          <Edit3 size={12} />
                          <span>{rep.status === 'Pending' ? 'Enter Results' : 'Review & Edit'}</span>
                        </button>
                      ) : null}

                      {rep.status === 'Approved' ? (
                        <div className="inline-flex rounded-lg border border-slate-200 dark:border-navy-800 divide-x divide-slate-200 dark:divide-navy-800 overflow-hidden">
                          <a
                            href={`${API_BASE_URL}/api/reports/${rep.id}/pdf?token=${localStorage.getItem('jyothi_token')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-slate-50 dark:text-navy-300 dark:hover:bg-navy-850 transition-colors"
                            title="Print report on official letterhead"
                          >
                            <Printer size={12} />
                            <span>With Letterhead</span>
                          </a>
                          <a
                            href={`${API_BASE_URL}/api/reports/${rep.id}/pdf?token=${localStorage.getItem('jyothi_token')}&letterhead=false`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-slate-50 dark:text-navy-300 dark:hover:bg-navy-850 transition-colors"
                            title="Print report on blank paper (hides official header/logo)"
                          >
                            <Printer size={12} />
                            <span>Without Letterhead</span>
                          </a>
                        </div>
                      ) : (
                        rep.status === 'Waiting' && hasRole(['Admin', 'Pathologist']) ? (
                          <button
                            onClick={() => openActionPanel(rep)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                          >
                            <Check size={12} />
                            <span>Verify Report</span>
                          </button>
                        ) : null
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-navy-400">
                    No reports currently in queue matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Result Entry & Pathologist Verification Drawer */}
      {activeReport && actionPanelOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="h-full w-full max-w-lg bg-white p-6 shadow-2xl overflow-y-auto dark:bg-navy-900 transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-navy-800">
              <div>
                <h2 className="text-lg font-bold text-navy-900 dark:text-white">
                  {activeReport.status === 'Waiting' && hasRole(['Admin', 'Pathologist']) 
                    ? 'Verify Lab Parameters' 
                    : 'Input Laboratory Results'
                  }
                </h2>
                <p className="text-xs text-navy-500 font-semibold">{activeReport.patient_name} • {activeReport.test_name}</p>
              </div>
              <button onClick={() => setActionPanelOpen(false)} className="text-navy-400 hover:text-navy-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveResults} className="mt-6 space-y-6">
              {/* Parameters Input Table */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-coral-500 uppercase tracking-wider">Test Parameters</h3>
                
                <div className="space-y-3">
                  {activeReport.normal_range?.map((param, index) => {
                    const patientVal = resultValues[param.parameter] || '';
                    
                    // Live check for abnormal limits
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
                        
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            required
                            value={patientVal}
                            onChange={(e) => handleValueChange(param.parameter, e.target.value)}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                              isAbnormal 
                                ? 'border-rose-500 bg-rose-50/20 text-rose-500 focus:border-rose-600' 
                                : 'border-slate-200 focus:border-coral-500 dark:border-navy-800 dark:bg-navy-950'
                            }`}
                            placeholder="Enter value"
                          />
                          <span className="text-xs font-semibold text-navy-450 w-12">{param.unit}</span>
                        </div>

                        {isAbnormal && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-500 font-bold">
                            <ShieldAlert size={10} />
                            <span>Value is out of normal reference range bounds!</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4 border-t border-slate-100 dark:border-navy-800">
                {/* Save Draft Button */}
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-coral-500 py-3 text-sm font-bold text-white shadow-lg shadow-coral-500/20 hover:bg-coral-600"
                >
                  {submitLoading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save & Submit for Approval</span>
                    </>
                  )}
                </button>

                {/* Pathologist Approve Button */}
                {activeReport.status === 'Waiting' && hasRole(['Admin', 'Pathologist']) && (
                  <button
                    type="button"
                    onClick={handleApproveReport}
                    disabled={submitLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700"
                  >
                    {submitLoading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Verify & Sign Off Report</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tube Label Thermal Sticker Preview Modal */}
      {showLabelModal && labelReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 no-print">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-navy-900 border border-slate-200 dark:border-navy-850">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-navy-800">
              <h2 className="text-sm font-bold uppercase tracking-wider text-coral-500">Tube Sticker Preview</h2>
              <button 
                onClick={() => setShowLabelModal(false)}
                className="rounded-lg p-1 text-navy-450 hover:bg-slate-150 dark:hover:bg-navy-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Print Sticker Frame */}
            <div className="flex justify-center py-6 bg-slate-50 dark:bg-navy-950/40 rounded-lg border border-dashed border-slate-200 dark:border-navy-800 mt-4">
              <div 
                id="tube-label-print-area" 
                className="bg-white text-black p-1.5 flex flex-col justify-between"
                style={{
                  width: '2in',
                  height: '1in',
                  fontFamily: 'monospace',
                  fontSize: '7px',
                  lineHeight: '1.1',
                  boxSizing: 'border-box',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderBottom: '0.5px solid black', paddingBottom: '1px' }}>
                  <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {labelReport.patient_name}
                  </span>
                  <span>{labelReport.patient_gender?.charAt(0)}/{labelReport.patient_age}</span>
                </div>
                <div style={{ fontWeight: 'bold', marginTop: '1px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {labelReport.test_name} ({labelReport.test_code})
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '5px', fontWeight: 'bold', marginBottom: '1px' }}>{labelReport.patient_uhid}</span>
                    <Barcode value={labelReport.patient_uhid} height={18} width={0.7} displayValue={false} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '5px', fontWeight: 'bold', marginBottom: '1px' }}>SAMPLE: JLS-{labelReport.id}</span>
                    <Barcode value={`JLS-${labelReport.id}`} height={18} width={0.7} displayValue={false} />
                  </div>
                </div>
              </div>
            </div>

            {/* Sticker Specs */}
            <div className="mt-3 text-[10px] text-navy-405 dark:text-navy-500 font-medium">
              <p>Sticker dimensions: 2 in x 1 in (50.8 mm x 25.4 mm)</p>
              <p className="mt-1 font-semibold text-coral-500">Dual Code 128 barcodes for patient card verification and tube collection tracking.</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-navy-800">
              <button
                onClick={executeLabelPrint}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-coral-500 py-2 text-xs font-bold text-white shadow-lg shadow-coral-500/20 hover:bg-coral-600"
              >
                <Printer size={14} />
                <span>Print Sticker</span>
              </button>
              <button
                onClick={() => setShowLabelModal(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-800 text-center text-navy-700 dark:text-navy-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Reports;
