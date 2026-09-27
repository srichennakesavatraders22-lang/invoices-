import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  Upload,
  Plus,
  Trash2,
  Zap,
  Columns,
  Eye,
  FileCheck,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsAPI } from '../../api/apiClient';
import PrintableInvoice from '../../components/invoice/PrintableInvoice';

export const CompanySettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);

  // View mode: 'split' (side-by-side with live preview), 'form' (form only), 'preview' (full preview)
  const [viewMode, setViewMode] = useState('split');
  // Zoom scale for the preview sheet
  const [zoomScale, setZoomScale] = useState(0.82);
  // Sample invoice dataset toggle
  const [sampleType, setSampleType] = useState('retail'); // 'retail' or 'wholesale16'
  // Mobile section tab: 'general', 'bank', 'terms', 'preview'
  const [mobileTab, setMobileTab] = useState('general');

  const [formData, setFormData] = useState({
    businessName: '',
    tagline: '',
    address: '',
    mobile: '',
    email: '',
    gstin: '',
    invoicePrefix: 'SCKT/2026-27/',
    logoUrl: '',
    stampUrl: '',
    bankDetails: {
      accountName: '',
      accountNumber: '',
      ifsc: '',
      bankName: '',
      branch: '',
    },
    termsAndConditions: [],
  });

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    setLoading(true);
    try {
      const res = await settingsAPI.getCompany();
      if (res.success && res.data) {
        setFormData({
          ...res.data,
          bankDetails: res.data.bankDetails || {
            accountName: '',
            accountNumber: '',
            ifsc: '',
            bankName: '',
            branch: '',
          },
          termsAndConditions: res.data.termsAndConditions || [],
        });
      }
    } catch (err) {
      toast.error('Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBankChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      bankDetails: { ...prev.bankDetails, [field]: value },
    }));
  };

  const handleTermChange = (index, value) => {
    const updated = [...formData.termsAndConditions];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, termsAndConditions: updated }));
  };

  const addTerm = () => {
    setFormData((prev) => ({
      ...prev,
      termsAndConditions: [
        ...prev.termsAndConditions,
        `${prev.termsAndConditions.length + 1}. `,
      ],
    }));
  };

  const removeTerm = (index) => {
    setFormData((prev) => ({
      ...prev,
      termsAndConditions: prev.termsAndConditions.filter((_, i) => i !== index),
    }));
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('image', file);
    data.append('type', type);

    if (type === 'logo') setUploadingLogo(true);
    else setUploadingStamp(true);

    try {
      const res = await settingsAPI.uploadImage(data);
      if (res.success && res.data?.imageUrl) {
        toast.success(
          `${type === 'stamp' ? 'Company stamp' : 'Company logo'} uploaded to Cloudinary!`
        );
        setFormData((prev) => ({
          ...prev,
          [type === 'stamp' ? 'stampUrl' : 'logoUrl']: res.data.imageUrl,
        }));
      }
    } catch (err) {
      toast.error(err.message || 'Image upload failed');
    } finally {
      if (type === 'logo') setUploadingLogo(false);
      else setUploadingStamp(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsAPI.updateCompany(formData);
      toast.success('Company settings saved successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to save company settings');
    } finally {
      setSaving(false);
    }
  };

  // Zoom helpers
  const handleZoomIn = () => setZoomScale((s) => Math.min(1.2, Number((s + 0.05).toFixed(2))));
  const handleZoomOut = () => setZoomScale((s) => Math.max(0.55, Number((s - 0.05).toFixed(2))));
  const handleZoomReset = () => setZoomScale(0.82);

  // Sample Items Definition
  const sampleRetailItems = [
    { itemName: 'Choco 24', qty: 10, mrp: 480, cgstAmount: 120, igstAmount: 0, amount: 4920 },
    { itemName: 'Vanila 24', qty: 8, mrp: 480, cgstAmount: 96, igstAmount: 0, amount: 3936 },
    { itemName: 'Strawberry Jar', qty: 3, mrp: 620, cgstAmount: 46.5, igstAmount: 0, amount: 1906.5 },
    { itemName: 'Coffee Pilo', qty: 4, mrp: 540, cgstAmount: 54, igstAmount: 0, amount: 2214 },
  ];

  const sampleWholesale16Items = [
    { itemName: '10 M.F Jars (Strawberry)', qty: 3, mrp: 620, cgstAmount: 46.5, igstAmount: 0, amount: 1906.5 },
    { itemName: '5 M.F Jars (Vanilla)', qty: 4, mrp: 620, cgstAmount: 62, igstAmount: 0, amount: 2542 },
    { itemName: 'Milk Jars', qty: 3, mrp: 620, cgstAmount: 46.5, igstAmount: 0, amount: 1906.5 },
    { itemName: 'Pineapple (Choco)', qty: 2, mrp: 620, cgstAmount: 31, igstAmount: 0, amount: 1271 },
    { itemName: 'Green Pilo (Pista)', qty: 5, mrp: 540, cgstAmount: 67.5, igstAmount: 0, amount: 2767.5 },
    { itemName: 'Orange Pilo', qty: 4, mrp: 540, cgstAmount: 54, igstAmount: 0, amount: 2214 },
    { itemName: 'Coffee Pilo', qty: 4, mrp: 540, cgstAmount: 54, igstAmount: 0, amount: 2214 },
    { itemName: 'Mango Pilo', qty: 4, mrp: 540, cgstAmount: 54, igstAmount: 0, amount: 2214 },
    { itemName: 'Butterscotch 24', qty: 6, mrp: 480, cgstAmount: 72, igstAmount: 0, amount: 2952 },
    { itemName: 'Choco 24', qty: 10, mrp: 480, cgstAmount: 120, igstAmount: 0, amount: 4920 },
    { itemName: 'Vanila 24', qty: 8, mrp: 480, cgstAmount: 96, igstAmount: 0, amount: 3936 },
    { itemName: 'Strawberry 24', qty: 6, mrp: 480, cgstAmount: 72, igstAmount: 0, amount: 2952 },
    { itemName: 'Pista 24', qty: 5, mrp: 480, cgstAmount: 60, igstAmount: 0, amount: 2460 },
    { itemName: 'Kaju Pilo', qty: 5, mrp: 540, cgstAmount: 67.5, igstAmount: 0, amount: 2767.5 },
    { itemName: 'Badam Pilo', qty: 5, mrp: 540, cgstAmount: 67.5, igstAmount: 0, amount: 2767.5 },
    { itemName: 'Elaichi Jar', qty: 5, mrp: 680, cgstAmount: 85, igstAmount: 0, amount: 3485 },
  ];

  const currentItems = sampleType === 'wholesale16' ? sampleWholesale16Items : sampleRetailItems;
  const subTotal = currentItems.reduce((sum, item) => sum + (item.amount - item.cgstAmount), 0);
  const totalCgst = currentItems.reduce((sum, item) => sum + item.cgstAmount, 0);
  const grandTotal = currentItems.reduce((sum, item) => sum + item.amount, 0);

  // Build real-time live preview invoice using current form fields
  const previewInvoice = {
    invoiceNumber: `${formData.invoicePrefix || 'SCKT/2026-27/'}0001`,
    invoiceDate: '11-09-2026',
    invoiceTime: '11:45 AM',
    customerSnapshot: {
      name: 'Suresh Kumar',
      businessName: 'M/s Example Retail Store',
      billingAddress: 'Main Road, Kadapa, Andhra Pradesh - 516001',
      shippingAddress: 'Main Road, Kadapa, Andhra Pradesh - 516001',
      gstin: '37XXXXX0000X1ZX',
      mobile: '+91 90000 00000',
      isInterState: false,
    },
    companySnapshot: {
      businessName: formData.businessName || 'SRI CHENNA KESAVA TRADERS',
      tagline: formData.tagline || 'Wholesale & Distribution – Confectionery / Chocolates & Snacks',
      address: formData.address || 'Beside Apsara Theatre, Chinna Chauku, Andhra Pradesh – 516002',
      mobile: formData.mobile || '+91 63613 97790',
      email: formData.email || 'srichennakesavatraders22@gmail.com',
      gstin: formData.gstin || '37XXXXX0000X1ZX',
      logoUrl: formData.logoUrl || '',
      stampUrl: formData.stampUrl || '',
      bankDetails: formData.bankDetails,
      termsAndConditions: formData.termsAndConditions,
    },
    items: currentItems,
    subTotal,
    totalCgst,
    totalSgst: 0,
    totalIgst: 0,
    totalTax: totalCgst,
    grandTotal,
    amountInWords: sampleType === 'wholesale16'
      ? 'Rupees Forty Three Thousand Two Hundred Sixty Five and Twenty Five Paise Only'
      : 'Rupees Twelve Thousand Nine Hundred Sixteen and Fifty Paise Only',
    status: 'Draft',
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading business profile...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4 pb-16">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-sky-100/80 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Building2 className="h-6 w-6 text-sky-500" />
            Company Profile & Invoice Settings
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Configure entity info, Cloudinary logo & stamp, bank details, and inspect the real-time live tax invoice preview as you type
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle (Desktop only) */}
          <div className="hidden lg:flex items-center rounded-xl bg-white border border-sky-200/90 p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'split'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50'
              }`}
              title="Side-by-Side: Settings Form + Live Tax Invoice Preview"
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Split View</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('form')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'form'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50'
              }`}
              title="Form Only"
            >
              <FileCheck className="h-3.5 w-3.5" />
              <span>Form Only</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'preview'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50'
              }`}
              title="Full Preview Only"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview Only</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="hidden sm:flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 px-5 py-2 text-sm font-bold text-white shadow-md shadow-sky-500/20 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Save className="h-4 w-4 stroke-[2.3]" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* PhonePe / Google Pay Style Mobile Tabs */}
      <div className="flex lg:hidden overflow-x-auto gap-1.5 p-1 rounded-2xl bg-white border border-sky-100 shadow-xs mb-3 scrollbar-none">
        <button
          type="button"
          onClick={() => setMobileTab('general')}
          className={`flex-1 min-w-[85px] py-2 px-2.5 text-xs font-bold rounded-xl transition-all ${
            mobileTab === 'general'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          🏢 General
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('bank')}
          className={`flex-1 min-w-[85px] py-2 px-2.5 text-xs font-bold rounded-xl transition-all ${
            mobileTab === 'bank'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          🏦 Bank A/C
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('terms')}
          className={`flex-1 min-w-[85px] py-2 px-2.5 text-xs font-bold rounded-xl transition-all ${
            mobileTab === 'terms'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📜 Terms
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 min-w-[85px] py-2 px-2.5 text-xs font-bold rounded-xl transition-all ${
            mobileTab === 'preview'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          👁️ Live Sheet
        </button>
      </div>

      {/* Main Grid: Form on Left, Live Preview on Right */}
      <div
        className={`grid gap-5 items-start ${
          viewMode === 'split'
            ? 'grid-cols-1 lg:grid-cols-12'
            : 'grid-cols-1'
        }`}
      >
        {/* ================= LEFT COLUMN: SETTINGS FORM ================= */}
        {(viewMode === 'split' || viewMode === 'form') && (
          <div
            className={`space-y-4 ${
              viewMode === 'split' ? 'lg:col-span-6 xl:col-span-7 2xl:col-span-6' : 'w-full'
            }`}
          >
            {/* 1. Basic Profile & Identity */}
            <div className={`water-glass rounded-2xl p-5 space-y-4 border border-sky-100 shadow-xs ${
              mobileTab === 'general' ? 'block' : 'hidden lg:block'
            }`}>
              <div className="flex items-center justify-between border-b border-sky-100 pb-2.5">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Business Identity & Header
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    Printed at the top of every tax invoice & in signature blocks
                  </p>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" /> Live Synced
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Business Name (Invoice Title) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => handleTextChange('businessName', e.target.value)}
                    placeholder="SRI CHENNA KESAVA TRADERS"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 shadow-xs focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Business Tagline / Subtitle
                  </label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => handleTextChange('tagline', e.target.value)}
                    placeholder="Wholesale & Distribution – Confectionery / Chocolates & Snacks"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 shadow-xs focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Registered Business Address *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formData.address}
                    onChange={(e) => handleTextChange('address', e.target.value)}
                    placeholder="Beside Apsara Theatre, Chinna Chauku, Andhra Pradesh – 516002"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-xs text-slate-800 shadow-xs focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Mobile *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.mobile}
                    onChange={(e) => handleTextChange('mobile', e.target.value)}
                    placeholder="+91 63613 97790"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-xs font-mono text-slate-800 shadow-xs focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleTextChange('email', e.target.value)}
                    placeholder="srichennakesavatraders22@gmail.com"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-xs text-slate-800 shadow-xs focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Supplier GSTIN
                  </label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => handleTextChange('gstin', e.target.value.toUpperCase())}
                    placeholder="37XXXXX0000X1ZX"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-xs text-slate-800 font-mono uppercase shadow-xs focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Invoice Sequential Prefix *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.invoicePrefix}
                    onChange={(e) => handleTextChange('invoicePrefix', e.target.value)}
                    placeholder="SCKT/2026-27/"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-xs text-sky-700 font-mono font-bold shadow-xs focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Cloudinary Media Upload (Logo & Stamp) */}
            <div className={`water-glass rounded-2xl p-5 space-y-4 border border-sky-100 shadow-xs ${
              mobileTab === 'general' ? 'block' : 'hidden lg:block'
            }`}>
              <div className="flex items-center justify-between border-b border-sky-100 pb-2.5">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Logos & Digital Seal / Stamp
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    Uploaded directly to Cloudinary CDN and rendered on the live invoice
                  </p>
                </div>
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                  Cloudinary CDN
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Logo Upload */}
                <div className="rounded-xl bg-sky-50/70 p-3.5 border border-sky-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800">Company Logo</span>
                      <span className="text-[10px] text-slate-500">Header Top</span>
                    </div>

                    {formData.logoUrl ? (
                      <div className="mb-3 flex items-center gap-2.5 rounded-lg bg-white p-2 border border-sky-100 shadow-xs">
                        <img
                          src={formData.logoUrl}
                          alt="Logo preview"
                          className="h-10 w-auto max-w-[120px] object-contain"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-emerald-600 font-bold truncate">Active on invoice</p>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, logoUrl: '' })}
                            className="text-xs text-rose-500 hover:underline font-semibold"
                          >
                            Remove Logo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mb-3 italic">
                        No custom logo uploaded. Standard text title used.
                      </p>
                    )}
                  </div>

                  <label className="flex items-center justify-center gap-1.5 rounded-lg bg-white border border-sky-300 hover:bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 cursor-pointer shadow-xs transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingLogo ? 'Uploading to Cloudinary...' : 'Upload New Logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'logo')}
                      className="hidden"
                      disabled={uploadingLogo}
                    />
                  </label>
                </div>

                {/* Stamp Upload */}
                <div className="rounded-xl bg-sky-50/70 p-3.5 border border-sky-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800">Authorised Signatory Stamp</span>
                      <span className="text-[10px] text-slate-500">Signature Box</span>
                    </div>

                    {formData.stampUrl ? (
                      <div className="mb-3 flex items-center gap-2.5 rounded-lg bg-white p-2 border border-sky-100 shadow-xs">
                        <img
                          src={formData.stampUrl}
                          alt="Stamp preview"
                          className="h-10 w-auto max-w-[120px] object-contain"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-emerald-600 font-bold truncate">Active in signature block</p>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, stampUrl: '' })}
                            className="text-xs text-rose-500 hover:underline font-semibold"
                          >
                            Remove Stamp
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mb-3 italic">
                        No digital stamp uploaded. Signature line only.
                      </p>
                    )}
                  </div>

                  <label className="flex items-center justify-center gap-1.5 rounded-lg bg-white border border-sky-300 hover:bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 cursor-pointer shadow-xs transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingStamp ? 'Uploading to Cloudinary...' : 'Upload New Stamp'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'stamp')}
                      className="hidden"
                      disabled={uploadingStamp}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* 3. Bank & Settlement Details */}
            <div className={`water-glass rounded-2xl p-5 space-y-3.5 border border-sky-100 shadow-xs ${
              mobileTab === 'bank' ? 'block' : 'hidden lg:block'
            }`}>
              <div className="flex items-center justify-between border-b border-sky-100 pb-2.5">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Bank & Settlement Details
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    Printed in the payment remittance block beside Terms & Conditions
                  </p>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" /> Live Synced
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={formData.bankDetails?.accountName || ''}
                    onChange={(e) => handleBankChange('accountName', e.target.value)}
                    placeholder="Sri Chenna Kesava Traders"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.bankDetails?.accountNumber || ''}
                    onChange={(e) => handleBankChange('accountNumber', e.target.value)}
                    placeholder="123456789012"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-800 font-mono shadow-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank IFSC Code
                  </label>
                  <input
                    type="text"
                    value={formData.bankDetails?.ifsc || ''}
                    onChange={(e) => handleBankChange('ifsc', e.target.value.toUpperCase())}
                    placeholder="SBIN0001234"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-800 font-mono uppercase shadow-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.bankDetails?.bankName || ''}
                    onChange={(e) => handleBankChange('bankName', e.target.value)}
                    placeholder="State Bank of India"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={formData.bankDetails?.branch || ''}
                    onChange={(e) => handleBankChange('branch', e.target.value)}
                    placeholder="Chinna Chauku, Kadapa"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 4. Terms & Conditions Card */}
            <div className={`water-glass rounded-2xl p-5 space-y-3.5 border border-sky-100 shadow-xs ${
              mobileTab === 'terms' ? 'block' : 'hidden lg:block'
            }`}>
              <div className="flex items-center justify-between border-b border-sky-100 pb-2.5">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Terms & Conditions
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    Printed at the footer of every generated invoice
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addTerm}
                  className="flex items-center gap-1 rounded-lg bg-white border border-sky-200 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-50 shadow-xs transition-colors"
                >
                  <Plus className="h-3 w-3 text-sky-600" />
                  <span>Add Line</span>
                </button>
              </div>

              <div className="space-y-2">
                {formData.termsAndConditions?.map((term, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={term}
                      onChange={(e) => handleTermChange(index, e.target.value)}
                      className="flex-1 rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-sky-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeTerm(index)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                      title="Remove term line"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= RIGHT COLUMN: REAL-TIME LIVE TAX INVOICE PREVIEW ================= */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div
            className={`${mobileTab === 'preview' ? 'block' : 'hidden lg:block'} ${
              viewMode === 'split' ? 'lg:col-span-6 xl:col-span-5 2xl:col-span-6' : 'w-full max-w-4xl mx-auto'
            }`}
          >
            <div className="sticky top-14 water-glass rounded-2xl p-3 shadow-md border border-sky-200/90 space-y-2.5">
              {/* Preview Bar Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 pb-2.5 px-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-xs">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <span>Live Invoice Preview</span>
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Header, logo, stamp, bank & terms update instantly
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sample items dataset switcher */}
                  <div className="flex items-center rounded-lg bg-white border border-sky-100 p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setSampleType('retail')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        sampleType === 'retail'
                          ? 'bg-sky-500 text-white'
                          : 'text-slate-600 hover:text-sky-600'
                      }`}
                      title="Preview with 4 sample confectionery products"
                    >
                      4 Items
                    </button>
                    <button
                      type="button"
                      onClick={() => setSampleType('wholesale16')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        sampleType === 'wholesale16'
                          ? 'bg-sky-500 text-white'
                          : 'text-slate-600 hover:text-sky-600'
                      }`}
                      title="Preview with 16 reference wholesale items"
                    >
                      16 SKUs
                    </button>
                  </div>

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1 rounded-lg bg-white border border-sky-100 px-1.5 py-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      className="p-1 text-slate-500 hover:text-sky-600 rounded transition-colors"
                      title="Zoom out"
                    >
                      <ZoomOut className="h-3 w-3" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-slate-700 min-w-[32px] text-center">
                      {Math.round(zoomScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={handleZoomIn}
                      className="p-1 text-slate-500 hover:text-sky-600 rounded transition-colors"
                      title="Zoom in"
                    >
                      <ZoomIn className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={handleZoomReset}
                      className="p-1 text-slate-400 hover:text-sky-600 rounded transition-colors"
                      title="Reset fit"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Scrollable Printable Invoice Container */}
              <div className="max-h-[calc(100vh-175px)] overflow-y-auto overflow-x-auto rounded-xl border border-sky-200/80 bg-slate-100/70 p-2 shadow-inner">
                <div
                  className="flex justify-center transition-transform duration-150 origin-top"
                  style={{
                    transform: `scale(${zoomScale})`,
                    transformOrigin: 'top center',
                  }}
                >
                  <div className="w-[740px] flex-shrink-0">
                    <PrintableInvoice invoice={previewInvoice} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky PhonePe / Google Pay Style Bottom Save Bar for Mobile */}
      <div className="fixed bottom-16 left-0 right-0 z-30 block lg:hidden bg-white/95 backdrop-blur-xl border-t border-sky-100/90 p-3 shadow-[0_-8px_25px_rgba(14,165,233,0.12)]">
        <div className="max-w-lg mx-auto">
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 py-3 text-sm font-bold text-white shadow-md shadow-sky-500/25 active:scale-98 transition-all disabled:opacity-50"
          >
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Save className="h-4 w-4 stroke-[2.3]" />
                <span>Save Company Profile</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default CompanySettings;
