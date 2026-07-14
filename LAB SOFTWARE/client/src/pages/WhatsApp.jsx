import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  MessageCircle, Send, RefreshCw, Plus, Trash2, Edit3, CheckCircle2,
  XCircle, Clock, AlertCircle, Users, ChevronLeft, ChevronRight,
  Search, Zap, FileText, BarChart2, Copy, Check, Eye, Star,
  Phone, X, Save, Info, RotateCcw, Wifi, WifiOff
} from 'lucide-react';

// ── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    'Sent': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30',
    'Sent (Simulated)': 'bg-sky-50 text-sky-600 dark:bg-sky-950/30',
    'Delivered': 'bg-green-100 text-green-700 dark:bg-green-950/30',
    'Failed': 'bg-rose-50 text-rose-600 dark:bg-rose-950/30',
    'Pending': 'bg-amber-50 text-amber-600 dark:bg-amber-950/30',
    'Retry': 'bg-orange-50 text-orange-600 dark:bg-orange-950/30'
  };
  const icons = {
    'Sent': <CheckCircle2 size={11} />,
    'Sent (Simulated)': <Wifi size={11} />,
    'Delivered': <CheckCircle2 size={11} />,
    'Failed': <XCircle size={11} />,
    'Pending': <Clock size={11} />,
    'Retry': <RotateCcw size={11} />
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${map[status] || 'bg-slate-100 text-slate-500'}`}>
      {icons[status] || <Clock size={11} />}
      {status}
    </span>
  );
}

// ── Copy Button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={handleCopy} className="rounded p-1 text-navy-400 hover:text-coral-500 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors" title="Copy">
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
}

// ── Template Variables Helper ─────────────────────────────────────────────────
const TEMPLATE_VARS = ['{{patient_name}}', '{{test_name}}', '{{bill_number}}', '{{report_date}}', '{{lab_name}}', '{{phone}}'];

export default function WhatsApp() {
  const [activeTab, setActiveTab] = useState('send');
  const [stats, setStats] = useState({ total: 0, sent: 0, delivered: 0, failed: 0, pending: 0, unsentApproved: 0 });

  // Send tab state
  const [unsentReports, setUnsentReports] = useState([]);
  const [sendSearch, setSendSearch] = useState('');
  const [selectedReports, setSelectedReports] = useState(new Set());
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [sendingId, setSendingId] = useState(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [sendResults, setSendResults] = useState({});
  const [unsentLoading, setUnsentLoading] = useState(true);

  // Logs tab state
  const [logs, setLogs] = useState([]);
  const [logSearch, setLogSearch] = useState('');
  const [logStatus, setLogStatus] = useState('All');
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);

  // Templates tab state
  const [templateList, setTemplateList] = useState([]);
  const [tplModalOpen, setTplModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [tplForm, setTplForm] = useState({ name: '', description: '', body: '', is_default: false });
  const [tplSaving, setTplSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [receiptHeader, setReceiptHeader] = useState({
    labName: 'Jyothi Lab',
    tagline: 'Precision Diagnostics, Care & Trust',
    address: 'Bellary Road, Kurnool',
    phone: '9856628943',
    email: 'info@jyothilab.com'
  });

  // Bulk confirm modal
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const LOG_LIMIT = 20;

  // ── Fetchers ─────────────────────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/settings');
      if (res.data && res.data.receipt_header) {
        setReceiptHeader(res.data.receipt_header);
      }
    } catch { /* silent */ }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/stats');
      setStats(res.data);
    } catch { /* silent */ }
  }, []);

  const fetchUnsentReports = useCallback(async () => {
    setUnsentLoading(true);
    try {
      const res = await api.get('/whatsapp/unsent', { params: { search: sendSearch } });
      setUnsentReports(res.data);
    } catch { /* silent */ } finally { setUnsentLoading(false); }
  }, [sendSearch]);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await api.get('/whatsapp/logs', { params: { search: logSearch, status: logStatus !== 'All' ? logStatus : '', page: logPage, limit: LOG_LIMIT } });
      setLogs(res.data.logs || []);
      setLogTotal(res.data.total || 0);
    } catch { /* silent */ } finally { setLogsLoading(false); }
  }, [logSearch, logStatus, logPage]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/templates');
      setTemplateList(res.data || []);
      setTemplates(res.data || []);
      // Set default template
      const def = res.data?.find(t => t.is_default === 1 || t.is_default === true);
      if (def) setSelectedTemplate(String(def.id));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchStats(); fetchTemplates(); fetchSettings(); }, [fetchStats, fetchTemplates, fetchSettings]);
  useEffect(() => { if (activeTab === 'send') fetchUnsentReports(); }, [activeTab, fetchUnsentReports]);
  useEffect(() => { if (activeTab === 'logs') fetchLogs(); }, [activeTab, fetchLogs]);
  useEffect(() => { if (activeTab === 'templates') fetchTemplates(); }, [activeTab, fetchTemplates]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { if (activeTab === 'send') fetchUnsentReports(); }, 400);
    return () => clearTimeout(t);
  }, [sendSearch]);
  useEffect(() => {
    const t = setTimeout(() => { if (activeTab === 'logs') { setLogPage(1); fetchLogs(); } }, 400);
    return () => clearTimeout(t);
  }, [logSearch, logStatus]);

  // ── Send Single ───────────────────────────────────────────────────────────────
  const handleSendSingle = async (reportId) => {
    setSendingId(reportId);
    try {
      const res = await api.post(`/whatsapp/send/${reportId}`, { template_id: selectedTemplate || null });
      setSendResults(prev => ({ ...prev, [reportId]: res.data }));
      fetchStats();
      
      if (res.data.success && res.data.phone) {
        const text = res.data.messageBody + (res.data.pdfUrl ? `\n\nDownload Report: ${res.data.pdfUrl}` : '');
        const waUrl = `https://api.whatsapp.com/send?phone=${res.data.phone}&text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank');
      }
    } catch (err) {
      setSendResults(prev => ({ ...prev, [reportId]: { success: false, error: err.response?.data?.error || 'Send failed' } }));
    } finally { setSendingId(null); }
  };

  // ── Bulk Send ─────────────────────────────────────────────────────────────────
  const handleBulkSend = async () => {
    setBulkConfirmOpen(false);
    setBulkSending(true);
    const ids = selectedReports.size > 0 ? [...selectedReports] : unsentReports.filter(r => !r.already_sent).map(r => r.report_id);
    try {
      const res = await api.post('/whatsapp/bulk', { report_ids: ids, template_id: selectedTemplate || null });
      const newResults = {};
      (res.data.results || []).forEach(r => { newResults[r.reportId] = r; });
      setSendResults(prev => ({ ...prev, ...newResults }));
      setSelectedReports(new Set());
      fetchStats();
      fetchUnsentReports();
    } catch { /* silent */ } finally { setBulkSending(false); }
  };

  // ── Retry ─────────────────────────────────────────────────────────────────────
  const handleRetry = async (logId) => {
    setRetryingId(logId);
    try {
      const res = await api.post(`/whatsapp/retry/${logId}`);
      fetchLogs();
      fetchStats();
      
      if (res.data.success && res.data.phone) {
        const text = res.data.messageBody + (res.data.pdfUrl ? `\n\nDownload Report: ${res.data.pdfUrl}` : '');
        const waUrl = `https://api.whatsapp.com/send?phone=${res.data.phone}&text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank');
      }
    } catch { /* silent */ } finally { setRetryingId(null); }
  };

  // ── Template CRUD ─────────────────────────────────────────────────────────────
  const openNewTemplate = () => {
    setEditingTemplate(null);
    setTplForm({ name: '', description: '', body: '', is_default: false });
    setTplModalOpen(true);
  };
  const openEditTemplate = (tpl) => {
    setEditingTemplate(tpl);
    setTplForm({ name: tpl.name, description: tpl.description || '', body: tpl.body, is_default: !!(tpl.is_default) });
    setTplModalOpen(true);
  };
  const saveTemplate = async () => {
    if (!tplForm.name.trim() || !tplForm.body.trim()) return;
    setTplSaving(true);
    try {
      if (editingTemplate) {
        await api.put(`/whatsapp/templates/${editingTemplate.id}`, tplForm);
      } else {
        await api.post('/whatsapp/templates', tplForm);
      }
      setTplModalOpen(false);
      fetchTemplates();
    } catch { /* silent */ } finally { setTplSaving(false); }
  };
  const deleteTemplate = async (id) => {
    try { await api.delete(`/whatsapp/templates/${id}`); fetchTemplates(); } catch { /* silent */ }
    setDeleteConfirm(null);
  };
  const insertVar = (v) => setTplForm(f => ({ ...f, body: f.body + v }));

  const toggleSelect = (id) => {
    setSelectedReports(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    const unsent = unsentReports.filter(r => !r.already_sent).map(r => r.report_id);
    setSelectedReports(new Set(unsent));
  };
  const clearSelection = () => setSelectedReports(new Set());

  const totalPages = Math.ceil(logTotal / LOG_LIMIT);

  // Preview rendered template
  const previewBody = previewTemplate
    ? previewTemplate.body
        .replace(/\{\{patient_name\}\}/g, 'John Doe')
        .replace(/\{\{test_name\}\}/g, 'Complete Blood Count')
        .replace(/\{\{bill_number\}\}/g, 'JLB-20260604-0001')
        .replace(/\{\{report_date\}\}/g, '04/06/2026')
        .replace(/\{\{lab_name\}\}/g, receiptHeader.labName || 'Jyothi Lab')
        .replace(/\{\{phone\}\}/g, receiptHeader.phone || '9856628943')
        .replace(/\{\{address\}\}/g, receiptHeader.address || 'Bellary Road, Kurnool')
        .replace(/\{\{email\}\}/g, receiptHeader.email || 'info@jyothilab.com')
    : '';

  return (
    <div className="space-y-6 pb-8">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/30">
            <MessageCircle size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-navy-900 dark:text-white">WhatsApp Report Delivery</h1>
            <p className="text-xs text-navy-450 dark:text-navy-400">Send approved lab reports to patients via WhatsApp</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 dark:border-emerald-800/40 dark:bg-emerald-950/20">
          {process.env.NODE_ENV !== 'production' ? (
            <><WifiOff size={13} className="text-sky-500" /><span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">Simulation Mode</span></>
          ) : (
            <><Wifi size={13} className="text-emerald-500" /><span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">WhatsApp Connected</span></>
          )}
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Unsent Reports', value: stats.unsentApproved, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20', icon: <FileText size={16} /> },
          { label: 'Total Sent', value: stats.sent, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20', icon: <Send size={16} /> },
          { label: 'Delivered', value: stats.delivered, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/20', icon: <CheckCircle2 size={16} /> },
          { label: 'Failed', value: stats.failed, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/20', icon: <XCircle size={16} /> },
          { label: 'Pending', value: stats.pending, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20', icon: <Clock size={16} /> },
          { label: 'Total Logs', value: stats.total, color: 'text-navy-600 dark:text-navy-300', bg: 'bg-slate-50 dark:bg-navy-900', icon: <BarChart2 size={16} /> }
        ].map((s, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border border-slate-200/70 bg-white p-3 shadow-sm dark:border-navy-800 dark:bg-navy-900">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${s.bg} ${s.color}`}>{s.icon}</div>
            <div>
              <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] font-semibold text-navy-400 dark:text-navy-500 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100/60 p-1 dark:border-navy-800 dark:bg-navy-900/50">
        {[
          { id: 'send', label: 'Send Reports', icon: <Send size={14} /> },
          { id: 'logs', label: 'Delivery Logs', icon: <BarChart2 size={14} /> },
          { id: 'templates', label: 'Templates', icon: <FileText size={14} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-emerald-600 shadow-sm dark:bg-navy-800 dark:text-emerald-400'
                : 'text-navy-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200'
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: SEND REPORTS
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'send' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-navy-800 dark:bg-navy-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  type="text"
                  placeholder="Search patient, bill, test..."
                  value={sendSearch}
                  onChange={e => setSendSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none dark:border-navy-700 dark:bg-navy-950 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-navy-450 whitespace-nowrap">Template:</label>
                <select
                  value={selectedTemplate}
                  onChange={e => setSelectedTemplate(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs focus:border-emerald-500 focus:outline-none dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                >
                  {templates.map(t => (
                    <option key={t.id} value={String(t.id)}>{t.name}{t.is_default ? ' ★' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedReports.size > 0 && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{selectedReports.size} selected</span>
              )}
              <button onClick={selectAll} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-slate-50 dark:border-navy-700 dark:text-navy-300 dark:hover:bg-navy-800">
                Select Unsent
              </button>
              {selectedReports.size > 0 && (
                <button onClick={clearSelection} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-slate-50 dark:border-navy-700 dark:text-navy-300 dark:hover:bg-navy-800">
                  Clear
                </button>
              )}
              <button
                onClick={() => setBulkConfirmOpen(true)}
                disabled={bulkSending || (unsentReports.filter(r => !r.already_sent).length === 0)}
                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/25 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {bulkSending ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Zap size={13} />}
                {selectedReports.size > 0 ? `Send ${selectedReports.size} Selected` : 'Bulk Send All'}
              </button>
              <button onClick={fetchUnsentReports} className="rounded-lg border border-slate-200 p-2 text-navy-400 hover:bg-slate-50 dark:border-navy-700 dark:hover:bg-navy-800">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Reports table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-800 dark:bg-navy-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-navy-800">
                    <th className="w-8 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedReports.size === unsentReports.filter(r => !r.already_sent).length && unsentReports.filter(r => !r.already_sent).length > 0}
                        onChange={e => e.target.checked ? selectAll() : clearSelection()}
                        className="rounded border-slate-300 accent-emerald-500"
                      />
                    </th>
                    {['Patient', 'Phone', 'Test', 'Bill #', 'Status', 'Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-navy-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unsentLoading ? (
                    <tr><td colSpan={7} className="py-16 text-center text-sm text-navy-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
                        <span>Loading approved reports...</span>
                      </div>
                    </td></tr>
                  ) : unsentReports.length === 0 ? (
                    <tr><td colSpan={7} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-emerald-50 p-4 dark:bg-emerald-950/20">
                          <CheckCircle2 size={32} className="text-emerald-500" />
                        </div>
                        <p className="text-sm font-semibold text-navy-600 dark:text-navy-300">All approved reports have been sent!</p>
                        <p className="text-xs text-navy-400">No pending deliveries found.</p>
                      </div>
                    </td></tr>
                  ) : (
                    unsentReports.map(report => {
                      const result = sendResults[report.report_id];
                      const isSending = sendingId === report.report_id;
                      const alreadySent = report.already_sent > 0;
                      return (
                        <tr key={report.report_id} className="border-b border-slate-50 hover:bg-slate-50/50 dark:border-navy-850 dark:hover:bg-navy-950/30 transition-colors">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedReports.has(report.report_id)}
                              onChange={() => toggleSelect(report.report_id)}
                              disabled={alreadySent}
                              className="rounded border-slate-300 accent-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-navy-900 dark:text-white text-xs">{report.patient_name}</p>
                            <p className="text-[10px] text-navy-400 font-mono">{report.patient_uhid}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Phone size={11} className="text-emerald-500" />
                              <span className="text-xs font-mono text-navy-700 dark:text-navy-300">{report.patient_phone}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-navy-800 dark:text-white">{report.test_name}</p>
                            <p className="text-[10px] text-navy-400">{report.department}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-navy-500 dark:text-navy-400">{report.bill_number}</span>
                          </td>
                          <td className="px-4 py-3">
                            {alreadySent && !result ? (
                              <StatusBadge status="Sent" />
                            ) : result ? (
                              <StatusBadge status={result.status || (result.success ? 'Sent' : 'Failed')} />
                            ) : (
                              <StatusBadge status="Pending" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {alreadySent && !result ? (
                              <span className="text-[10px] text-navy-400 font-semibold">Already sent</span>
                            ) : (
                              <button
                                onClick={() => handleSendSingle(report.report_id)}
                                disabled={isSending || !!result?.success}
                                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {isSending ? (
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : result?.success ? (
                                  <Check size={12} />
                                ) : (
                                  <Send size={12} />
                                )}
                                {isSending ? 'Sending…' : result?.success ? 'Sent!' : 'Send'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: DELIVERY LOGS
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-navy-800 dark:bg-navy-900 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input
                type="text"
                placeholder="Search patient, bill, phone..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none dark:border-navy-700 dark:bg-navy-950 dark:text-white"
              />
            </div>
            <div className="flex gap-1.5">
              {['All', 'Sent', 'Sent (Simulated)', 'Delivered', 'Failed', 'Pending'].map(s => (
                <button
                  key={s}
                  onClick={() => { setLogStatus(s); setLogPage(1); }}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                    logStatus === s
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-100 text-navy-500 hover:bg-slate-200 dark:bg-navy-800 dark:text-navy-400 dark:hover:bg-navy-750'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button onClick={fetchLogs} className="rounded-lg border border-slate-200 p-2 text-navy-400 hover:bg-slate-50 dark:border-navy-700 dark:hover:bg-navy-800 ml-auto">
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Logs table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-800 dark:bg-navy-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-navy-800">
                    {['Patient', 'Phone', 'Test / Bill', 'Message ID', 'Status', 'Retries', 'Sent At', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-navy-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    <tr><td colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
                        <span className="text-sm text-navy-400">Loading logs...</span>
                      </div>
                    </td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-slate-100 p-4 dark:bg-navy-800">
                          <BarChart2 size={28} className="text-navy-400" />
                        </div>
                        <p className="text-sm font-semibold text-navy-500">No delivery logs found</p>
                        <p className="text-xs text-navy-400">Logs will appear here after reports are sent.</p>
                      </div>
                    </td></tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 dark:border-navy-850 dark:hover:bg-navy-950/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-navy-900 dark:text-white text-xs">{log.patient_name}</p>
                          <p className="text-[10px] text-navy-400">{new Date(log.created_at).toLocaleDateString('en-IN')}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-mono text-navy-600 dark:text-navy-300">{log.patient_phone}</span>
                            <CopyBtn text={log.patient_phone} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-navy-800 dark:text-white truncate max-w-[140px]">{log.test_name}</p>
                          <p className="text-[10px] font-mono text-navy-400">{log.bill_number}</p>
                        </td>
                        <td className="px-4 py-3">
                          {log.wa_message_id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-mono text-navy-400 truncate max-w-[80px]">{log.wa_message_id}</span>
                              <CopyBtn text={log.wa_message_id} />
                            </div>
                          ) : log.error_message ? (
                            <span className="text-[10px] text-rose-400 truncate max-w-[100px] block" title={log.error_message}>{log.error_message}</span>
                          ) : (
                            <span className="text-[10px] text-navy-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={log.status} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold ${log.retry_count > 0 ? 'text-amber-500' : 'text-navy-400'}`}>{log.retry_count}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] text-navy-400">
                            {log.sent_at ? new Date(log.sent_at).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {(log.status === 'Failed' || log.status === 'Pending') && log.retry_count < 5 && (
                            <button
                              onClick={() => handleRetry(log.id)}
                              disabled={retryingId === log.id}
                              className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
                            >
                              {retryingId === log.id ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <RotateCcw size={11} />}
                              Retry
                            </button>
                          )}
                          {log.retry_count >= 5 && (
                            <span className="text-[10px] text-rose-400 font-semibold">Max retries</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-navy-850">
                <p className="text-xs text-navy-400">Showing {((logPage - 1) * LOG_LIMIT) + 1}–{Math.min(logPage * LOG_LIMIT, logTotal)} of {logTotal}</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setLogPage(p => Math.max(1, p - 1))}
                    disabled={logPage === 1}
                    className="rounded-lg border border-slate-200 p-1.5 text-navy-400 hover:bg-slate-50 disabled:opacity-40 dark:border-navy-700 dark:hover:bg-navy-800"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="flex items-center px-2 text-xs font-semibold text-navy-600 dark:text-navy-300">{logPage} / {totalPages}</span>
                  <button
                    onClick={() => setLogPage(p => Math.min(totalPages, p + 1))}
                    disabled={logPage === totalPages}
                    className="rounded-lg border border-slate-200 p-1.5 text-navy-400 hover:bg-slate-50 disabled:opacity-40 dark:border-navy-700 dark:hover:bg-navy-800"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: TEMPLATES
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy-900 dark:text-white">Message Templates</h3>
              <p className="text-[11px] text-navy-400">Customize WhatsApp messages with dynamic patient variables</p>
            </div>
            <button
              onClick={openNewTemplate}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/25 hover:bg-emerald-600 transition-colors"
            >
              <Plus size={14} /> New Template
            </button>
          </div>

          {/* Variable reference */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-800/40 dark:bg-sky-950/10">
            <div className="flex items-start gap-2">
              <Info size={14} className="text-sky-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-sky-700 dark:text-sky-400 mb-1">Available Template Variables</p>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARS.map(v => (
                    <code key={v} className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-mono text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">{v}</code>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templateList.length === 0 ? (
              <div className="col-span-3 py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-slate-100 p-4 dark:bg-navy-800">
                    <FileText size={28} className="text-navy-400" />
                  </div>
                  <p className="text-sm text-navy-500">No templates yet. Create your first one!</p>
                </div>
              </div>
            ) : templateList.map(tpl => (
              <div key={tpl.id} className="group relative flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm hover:border-emerald-300 hover:shadow-md dark:border-navy-800 dark:bg-navy-900 dark:hover:border-emerald-700 transition-all overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 p-4 dark:border-navy-800">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {(tpl.is_default === 1 || tpl.is_default === true) && (
                        <span className="flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-600 dark:bg-amber-950/20">
                          <Star size={8} fill="currentColor" /> DEFAULT
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-navy-900 dark:text-white truncate">{tpl.name}</h4>
                    {tpl.description && <p className="text-[10px] text-navy-400 mt-0.5 truncate">{tpl.description}</p>}
                  </div>
                </div>
                {/* Body preview */}
                <div className="flex-1 p-4">
                  <pre className="text-[11px] text-navy-600 dark:text-navy-300 whitespace-pre-wrap font-sans leading-relaxed max-h-28 overflow-hidden line-clamp-6">
                    {tpl.body}
                  </pre>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 border-t border-slate-100 p-3 dark:border-navy-800">
                  <button
                    onClick={() => setPreviewTemplate(tpl)}
                    className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-navy-600 hover:bg-slate-200 dark:bg-navy-800 dark:text-navy-300 dark:hover:bg-navy-750"
                  >
                    <Eye size={11} /> Preview
                  </button>
                  <button
                    onClick={() => openEditTemplate(tpl)}
                    className="flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1.5 text-[11px] font-semibold text-sky-600 hover:bg-sky-100 dark:bg-sky-950/20 dark:text-sky-400"
                  >
                    <Edit3 size={11} /> Edit
                  </button>
                  {!(tpl.is_default === 1 || tpl.is_default === true) && (
                    <button
                      onClick={() => setDeleteConfirm(tpl.id)}
                      className="ml-auto flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-500 hover:bg-rose-100 dark:bg-rose-950/20"
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          BULK CONFIRM MODAL
      ══════════════════════════════════════════════════════════════ */}
      {bulkConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-navy-850 dark:bg-navy-900 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/30">
                <Zap size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-900 dark:text-white">Confirm Bulk Send</h3>
                <p className="text-xs text-navy-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-navy-600 dark:text-navy-300 mb-5">
              You are about to send WhatsApp messages to <span className="font-bold text-emerald-600">{selectedReports.size > 0 ? selectedReports.size : unsentReports.filter(r => !r.already_sent).length}</span> patients with their approved lab reports.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setBulkConfirmOpen(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-navy-600 hover:bg-slate-50 dark:border-navy-700 dark:text-navy-300 dark:hover:bg-navy-800">
                Cancel
              </button>
              <button onClick={handleBulkSend} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20">
                <Send size={14} /> Send Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TEMPLATE PREVIEW MODAL
      ══════════════════════════════════════════════════════════════ */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-navy-850 dark:bg-navy-900 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-navy-800">
              <h3 className="text-sm font-bold text-navy-900 dark:text-white">Message Preview — {previewTemplate.name}</h3>
              <button onClick={() => setPreviewTemplate(null)} className="rounded-lg p-1 text-navy-400 hover:bg-slate-100 dark:hover:bg-navy-800">
                <X size={16} />
              </button>
            </div>
            {/* WhatsApp chat bubble UI */}
            <div className="p-4 bg-[#e5ddd5] dark:bg-[#0d1117] min-h-[200px]">
              <div className="max-w-[85%] ml-auto">
                <div className="rounded-xl rounded-tr-sm bg-[#dcf8c6] dark:bg-[#005c4b] px-4 py-3 shadow-sm">
                  <pre className="text-sm text-[#111b21] dark:text-white whitespace-pre-wrap font-sans leading-relaxed">{previewBody}</pre>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] text-[#667781] dark:text-[#8696a0]">12:34 PM</span>
                    <CheckCircle2 size={12} className="text-[#53bdeb]" />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-end">
                  <div className="flex gap-1 rounded-xl bg-[#dcf8c6] dark:bg-[#005c4b] px-3 py-2 shadow-sm">
                    <FileText size={14} className="text-[#667781] dark:text-[#8696a0]" />
                    <span className="text-xs text-[#111b21] dark:text-white font-semibold">Lab_Report.pdf</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 dark:border-navy-800">
              <p className="text-[10px] text-navy-400 text-center">Sample preview with test data. Actual names/values will differ.</p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TEMPLATE CREATE / EDIT MODAL
      ══════════════════════════════════════════════════════════════ */}
      {tplModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-navy-850 dark:bg-navy-900 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-navy-800">
              <h3 className="text-base font-bold text-navy-900 dark:text-white">
                {editingTemplate ? 'Edit Template' : 'New Message Template'}
              </h3>
              <button onClick={() => setTplModalOpen(false)} className="rounded-lg p-1.5 text-navy-400 hover:bg-slate-100 dark:hover:bg-navy-800">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold text-navy-400 uppercase mb-1">Template Name *</label>
                <input
                  type="text"
                  value={tplForm.name}
                  onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Standard Report Ready"
                  className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-navy-700 dark:text-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-navy-400 uppercase mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={tplForm.description}
                  onChange={e => setTplForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of when to use this template"
                  className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-navy-700 dark:text-white"
                />
              </div>

              {/* Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-navy-400 uppercase">Message Body *</label>
                  <div className="flex flex-wrap gap-1">
                    {TEMPLATE_VARS.map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVar(v)}
                        className="rounded bg-sky-50 px-1.5 py-0.5 text-[9px] font-mono text-sky-600 hover:bg-sky-100 dark:bg-sky-950/20 dark:text-sky-400 transition-colors"
                      >
                        + {v}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={tplForm.body}
                  onChange={e => setTplForm(f => ({ ...f, body: e.target.value }))}
                  rows={10}
                  placeholder="Type your WhatsApp message here. Use {{variable}} placeholders above..."
                  className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none dark:border-navy-700 dark:text-white resize-none"
                />
                <p className="text-[10px] text-navy-400 mt-1">Supports WhatsApp markdown: *bold*, _italic_, ~strikethrough~</p>
              </div>

              {/* Default toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setTplForm(f => ({ ...f, is_default: !f.is_default }))}
                  className={`relative h-5 w-9 rounded-full transition-colors ${tplForm.is_default ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-navy-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${tplForm.is_default ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-xs font-semibold text-navy-700 dark:text-navy-300">Set as default template</span>
              </label>
            </div>

            <div className="flex gap-3 border-t border-slate-100 px-6 py-4 dark:border-navy-800">
              <button onClick={() => setTplModalOpen(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-navy-600 hover:bg-slate-50 dark:border-navy-700 dark:text-navy-300 dark:hover:bg-navy-800">
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                disabled={tplSaving || !tplForm.name.trim() || !tplForm.body.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
              >
                {tplSaving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save size={14} />}
                {editingTemplate ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ───────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-navy-850 dark:bg-navy-900 p-6">
            <div className="flex flex-col items-center gap-3 text-center mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/20">
                <Trash2 size={22} className="text-rose-500" />
              </div>
              <h3 className="text-base font-bold text-navy-900 dark:text-white">Delete Template?</h3>
              <p className="text-sm text-navy-500 dark:text-navy-400">This template will be permanently removed and cannot be recovered.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-navy-600 hover:bg-slate-50 dark:border-navy-700">Cancel</button>
              <button onClick={() => deleteTemplate(deleteConfirm)} className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white hover:bg-rose-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
