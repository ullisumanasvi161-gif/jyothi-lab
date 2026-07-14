import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Settings as SettingsIcon, Receipt, FileText, Mail, 
  MessageSquare, Save, CheckCircle2, AlertCircle 
} from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('receipt');
  
  // Settings values
  const [receiptHeader, setReceiptHeader] = useState({
    labName: 'Jyothi Lab',
    tagline: 'Precision Diagnostics, Care & Trust',
    address: '',
    phone: '',
    email: '',
    gstin: ''
  });

  const [reportSettings, setReportSettings] = useState({
    footer: 'This is an electronically verified report. Signature is uploaded by the Pathologist.',
    emailEnabled: true,
    whatsappEnabled: true
  });

  const [emailSettings, setEmailSettings] = useState({
    host: 'smtp.mailtrap.io',
    port: '2525',
    user: '',
    pass: '',
    from: 'no-reply@jyothilab.com'
  });

  const [whatsappSettings, setWhatsappSettings] = useState({
    apiUrl: 'https://api.mockwhatsapp.com/v1/send',
    token: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/settings');
      
      if (res.data.receipt_header) setReceiptHeader(res.data.receipt_header);
      if (res.data.report_settings) setReportSettings(res.data.report_settings);
      if (res.data.email_settings) setEmailSettings(res.data.email_settings);
      if (res.data.whatsapp_settings) setWhatsappSettings(res.data.whatsapp_settings);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve configuration settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        receipt_header: receiptHeader,
        report_settings: reportSettings,
        email_settings: emailSettings,
        whatsapp_settings: whatsappSettings
      };

      await api.put('/settings', payload);
      setSuccess('All configurations saved successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Branding & System Settings</h1>
        <p className="text-sm text-navy-500 dark:text-navy-450">Customize print invoices, verification report layouts, and email/WhatsApp gateways.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400">
          <AlertCircle size={18} className="shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-450">
          <CheckCircle2 size={18} className="shrink-0" />
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}

      {/* Tabs list */}
      <div className="flex border-b border-slate-200 dark:border-navy-850">
        <button
          onClick={() => setActiveTab('receipt')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all ${
            activeTab === 'receipt' 
              ? 'border-coral-500 text-coral-500' 
              : 'border-transparent text-navy-500 hover:text-navy-850 dark:hover:text-white'
          }`}
        >
          <Receipt size={16} />
          <span>Receipt Layout</span>
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all ${
            activeTab === 'report' 
              ? 'border-coral-500 text-coral-500' 
              : 'border-transparent text-navy-500 hover:text-navy-850 dark:hover:text-white'
          }`}
        >
          <FileText size={16} />
          <span>Reports Format</span>
        </button>

        <button
          onClick={() => setActiveTab('gateway')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all ${
            activeTab === 'gateway' 
              ? 'border-coral-500 text-coral-500' 
              : 'border-transparent text-navy-500 hover:text-navy-850 dark:hover:text-white'
          }`}
        >
          <MessageSquare size={16} />
          <span>Notification Gateways</span>
        </button>
      </div>

      {/* Form content */}
      <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-navy-850 dark:bg-navy-900">
        
        {activeTab === 'receipt' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-coral-500 uppercase tracking-wider mb-2">Print Invoice Configuration</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-navy-550 uppercase tracking-wide block mb-1">Laboratory Name</label>
                <input
                  type="text"
                  value={receiptHeader.labName}
                  onChange={(e) => setReceiptHeader({ ...receiptHeader, labName: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-navy-550 uppercase tracking-wide block mb-1">Branding Tagline</label>
                <input
                  type="text"
                  value={receiptHeader.tagline}
                  onChange={(e) => setReceiptHeader({ ...receiptHeader, tagline: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-550 uppercase tracking-wide block mb-1">Clinic Address</label>
              <textarea
                value={receiptHeader.address}
                onChange={(e) => setReceiptHeader({ ...receiptHeader, address: e.target.value })}
                rows="2"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-navy-550 uppercase tracking-wide block mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={receiptHeader.phone}
                  onChange={(e) => setReceiptHeader({ ...receiptHeader, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-navy-550 uppercase tracking-wide block mb-1">Contact Email</label>
                <input
                  type="text"
                  value={receiptHeader.email}
                  onChange={(e) => setReceiptHeader({ ...receiptHeader, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-navy-550 uppercase tracking-wide block mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={receiptHeader.gstin}
                  onChange={(e) => setReceiptHeader({ ...receiptHeader, gstin: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-coral-500 uppercase tracking-wider mb-2">Diagnostic Report Configuration</h3>

            <div>
              <label className="text-xs font-semibold text-navy-550 uppercase tracking-wide block mb-1">Report Footer Disclaimer</label>
              <textarea
                value={reportSettings.footer}
                onChange={(e) => setReportSettings({ ...reportSettings, footer: e.target.value })}
                rows="3"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
              />
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={reportSettings.whatsappEnabled}
                  onChange={(e) => setReportSettings({ ...reportSettings, whatsappEnabled: e.target.checked })}
                  id="waNotificationCheck"
                  className="h-4 w-4 rounded border-slate-350 text-coral-500 focus:ring-coral-500"
                />
                <label htmlFor="waNotificationCheck" className="text-sm text-navy-700 dark:text-navy-300 cursor-pointer">
                  Enable automated WhatsApp messages upon report approval
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={reportSettings.emailEnabled}
                  onChange={(e) => setReportSettings({ ...reportSettings, emailEnabled: e.target.checked })}
                  id="emailNotificationCheck"
                  className="h-4 w-4 rounded border-slate-350 text-coral-500 focus:ring-coral-500"
                />
                <label htmlFor="emailNotificationCheck" className="text-sm text-navy-700 dark:text-navy-300 cursor-pointer">
                  Enable automated Email notifications upon report approval
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gateway' && (
          <div className="space-y-6">
            {/* Email Gateway */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-coral-500 uppercase tracking-wider flex items-center gap-1.5">
                <Mail size={14} />
                <span>SMTP Email Gateway Credentials</span>
              </h3>
              
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-navy-550 uppercase tracking-wide block mb-1">SMTP Server Host</label>
                  <input
                    type="text"
                    value={emailSettings.host}
                    onChange={(e) => setEmailSettings({ ...emailSettings, host: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-navy-550 uppercase tracking-wide block mb-1">SMTP Port</label>
                  <input
                    type="text"
                    value={emailSettings.port}
                    onChange={(e) => setEmailSettings({ ...emailSettings, port: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-navy-550 uppercase tracking-wide block mb-1">SMTP Username</label>
                  <input
                    type="text"
                    value={emailSettings.user}
                    onChange={(e) => setEmailSettings({ ...emailSettings, user: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-navy-550 uppercase tracking-wide block mb-1">SMTP Password</label>
                  <input
                    type="password"
                    value={emailSettings.pass}
                    onChange={(e) => setEmailSettings({ ...emailSettings, pass: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                  />
                </div>
              </div>
            </div>

            {/* WhatsApp Gateway */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-navy-800">
              <h3 className="text-xs font-bold text-coral-500 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare size={14} />
                <span>WhatsApp Business API Credentials</span>
              </h3>

              <div>
                <label className="text-xs font-semibold text-navy-550 uppercase tracking-wide block mb-1">WhatsApp API URL Endpoint</label>
                <input
                  type="text"
                  value={whatsappSettings.apiUrl}
                  onChange={(e) => setWhatsappSettings({ ...whatsappSettings, apiUrl: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-550 uppercase tracking-wide block mb-1">Bearer Access Token</label>
                <input
                  type="password"
                  value={whatsappSettings.token}
                  placeholder="Enter API token key"
                  onChange={(e) => setWhatsappSettings({ ...whatsappSettings, token: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none dark:border-navy-800 dark:bg-navy-950"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg bg-coral-500 py-3 px-6 text-sm font-bold text-white shadow-lg hover:bg-coral-600 transition-all mt-8"
        >
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          ) : (
            <>
              <Save size={16} />
              <span>Save Configurations</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default Settings;
