import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Send,
  Sparkles,
  ArrowLeft,
  Building,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Columns,
  Maximize2,
  FileCheck,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { invoicesAPI, customersAPI, productsAPI, settingsAPI } from '../../api/apiClient';
import PrintableInvoice from '../../components/invoice/PrintableInvoice';
import numberToWordsIndian from '../../utils/amountInWords';
import { getISTTimeString, formatISTInvoiceDate, convertTo12HourFormat, convertDateToInputFormat, convertDateFromInputFormat, convertTimeToInputFormat } from '../../utils/timeUtils';

/**
 * InvoiceScaler — Scales a 760px-wide invoice to fill its container.
 * Uses ResizeObserver so it re-calculates on panel/window resize.
 */
const INVOICE_NATURAL_WIDTH = 760;
const InvoiceScaler = ({ children }) => {
  const wrapperRef = useRef(null);
  const innerRef = useRef(null);

  const recalc = useCallback(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;

    // Reset transform to measure natural dimensions
    inner.style.transform = 'none';
    inner.style.width = `${INVOICE_NATURAL_WIDTH}px`;

    const containerWidth = wrapper.parentElement?.clientWidth || wrapper.clientWidth || INVOICE_NATURAL_WIDTH;
    const naturalHeight = inner.scrollHeight;
    const scale = Math.min(1, containerWidth / INVOICE_NATURAL_WIDTH);

    // Center horizontally: offset = (containerWidth - scaledWidth) / 2
    const scaledWidth = INVOICE_NATURAL_WIDTH * scale;
    const offsetX = Math.max(0, (containerWidth - scaledWidth) / 2);

    inner.style.transformOrigin = 'top left';
    inner.style.transform = `translateX(${offsetX}px) scale(${scale})`;
    // Height of wrapper = natural height × scale (since scale shrinks visually)
    wrapper.style.height = `${naturalHeight * scale}px`;
  }, []);

  useEffect(() => {
    // Initial recalc after paint
    const t = setTimeout(recalc, 50);
    const ro = new ResizeObserver(recalc);
    if (wrapperRef.current?.parentElement) ro.observe(wrapperRef.current.parentElement);
    window.addEventListener('resize', recalc);
    return () => { clearTimeout(t); ro.disconnect(); window.removeEventListener('resize', recalc); };
  }, [recalc, children]);

  return (
    <div ref={wrapperRef} className="relative overflow-hidden w-full">
      <div ref={innerRef}>
        {children}
      </div>
    </div>
  );
};

export const CreateEditInvoice = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // View Layout Mode: 'split' (side-by-side), 'form' (form only), 'preview' (full preview)
  const [viewMode, setViewMode] = useState('split');
  // Mobile segmented tab: 'form' or 'preview'
  const [mobileTab, setMobileTab] = useState('form');

  // Reference Data
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [company, setCompany] = useState(null);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [shippingAddress, setShippingAddress] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [notes, setNotes] = useState('Standard distribution delivery via Chinna Chauku dispatch.');
  const [invoiceDate, setInvoiceDate] = useState(formatISTInvoiceDate);
  const [invoiceTime, setInvoiceTime] = useState(getISTTimeString);
  const [dateError, setDateError] = useState('');

  // ─── NEW: Payment, Discount, Transport ───────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentBreakdown, setPaymentBreakdown] = useState([]);
  const [showMixedPayment, setShowMixedPayment] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [transportMode, setTransportMode] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [lrNumber, setLrNumber] = useState('');

  // Dynamic Line Items
  const [items, setItems] = useState([
    {
      productId: '',
      productName: '',
      qty: 10,
      mrp: 0,
      unit: 'Boxes',
      cgstPercent: 2.5,
      sgstPercent: 0,
      igstPercent: 5.0,
      taxableAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      lineAmount: 0,
    },
  ]);

  useEffect(() => {
    loadInitialData();
  }, [id]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [custRes, prodRes, compRes] = await Promise.all([
        customersAPI.getAll({ all: 'true' }),
        productsAPI.getAll({ all: 'true' }),
        settingsAPI.getCompany(),
      ]);

      if (custRes.data) setCustomers(custRes.data);
      if (prodRes.data) setProducts(prodRes.data);
      if (compRes.data) setCompany(compRes.data);

      if (isEditMode) {
        const invRes = await invoicesAPI.getById(id);
        if (invRes.data) {
          const inv = invRes.data;
          setSelectedCustomerId(inv.customer);
          setInvoiceDate(inv.invoiceDate);
          setInvoiceTime(convertTo12HourFormat(inv.invoiceTime));
          setNotes(inv.notes || '');
          setShippingAddress(inv.customerSnapshot?.shippingAddress || '');
          setPaymentMethod(inv.paymentMethod || '');
          setDiscountPercent(inv.discountPercent || 0);
          setDueDate(inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '');
          setTransportMode(inv.transportMode || '');
          setVehicleNumber(inv.vehicleNumber || '');
          setLrNumber(inv.lrNumber || '');
          if (inv.paymentBreakdown && inv.paymentBreakdown.length > 0) {
            setPaymentBreakdown(inv.paymentBreakdown.map((p) => ({ method: p.method, amount: p.amount, reference: p.reference || '' })));
            setShowMixedPayment(inv.paymentMethod === 'Mixed');
          }

          const mappedItems = inv.items.map((it) => ({
            productId: it.product,
            productName: it.itemName,
            qty: it.qty,
            mrp: it.mrp,
            unit: it.unit || 'Boxes',
            cgstPercent: it.cgstPercent,
            sgstPercent: it.sgstPercent,
            igstPercent: it.igstPercent,
            taxableAmount: it.taxableAmount,
            cgstAmount: it.cgstAmount,
            sgstAmount: it.sgstAmount,
            igstAmount: it.igstAmount,
            lineAmount: it.amount,
          }));
          setItems(mappedItems);
        }
      } else {
        if (custRes.data && custRes.data.length > 0) {
          selectCustomer(custRes.data[0]);
        }
        if (prodRes.data && prodRes.data.length > 0) {
          const p = prodRes.data[0];
          const isInterState = custRes.data && custRes.data.length > 0 ? custRes.data[0].isInterState : false;
          
          let cp = parseFloat(p.cgstPercent) || 0;
          let sp = parseFloat(p.sgstPercent) || 0;
          let ip = parseFloat(p.igstPercent) || 0;

          if (cp === 0 && sp === 0 && ip === 0) {
            cp = 2.5; sp = 2.5; ip = 5.0;
          }

          let useIgst = isInterState;
          if (ip === 0 && (cp > 0 || sp > 0)) useIgst = false;
          else if (cp === 0 && sp === 0 && ip > 0) useIgst = true;

          const taxable = 10 * p.mrp;
          let cgstAmt = 0, sgstAmt = 0, igstAmt = 0;

          if (useIgst) {
            igstAmt = (taxable * ip) / 100;
            cp = 0; sp = 0;
          } else {
            cgstAmt = (taxable * cp) / 100;
            sgstAmt = (taxable * sp) / 100;
            ip = 0;
          }

          setItems([
            {
              productId: p._id,
              productName: p.name,
              qty: 10,
              mrp: p.mrp,
              unit: p.unit || 'Boxes',
              cgstPercent: cp,
              sgstPercent: sp,
              igstPercent: ip,
              taxableAmount: taxable,
              cgstAmount: Number(cgstAmt.toFixed(2)),
              sgstAmount: Number(sgstAmt.toFixed(2)),
              igstAmount: Number(igstAmt.toFixed(2)),
              lineAmount: Number((taxable + cgstAmt + sgstAmt + igstAmt).toFixed(2)),
            },
          ]);
        }
      }
    } catch (err) {
      toast.error('Failed to load invoice setup data');
    } finally {
      setLoading(false);
    }
  };

  const selectCustomer = (cust) => {
    setSelectedCustomerId(cust._id);
    setSelectedCustomer(cust);
    setShippingAddress(cust.shippingAddress || cust.billingAddress);
    setSameAsBilling(cust.sameAsBilling !== undefined ? cust.sameAsBilling : true);
  };

  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    const cust = customers.find((c) => c._id === custId);
    if (cust) {
      selectCustomer(cust);
    }
  };

  // Line Item Calculations
  const calculateLineTaxes = (itemConfig, qty, isInterState) => {
    const mrp = itemConfig.mrp || 0;
    const taxable = qty * mrp;

    let cp = parseFloat(itemConfig.cgstPercent) || 0;
    let sp = parseFloat(itemConfig.sgstPercent) || 0;
    let ip = parseFloat(itemConfig.igstPercent) || 0;

    if (cp === 0 && sp === 0 && ip === 0) {
      cp = 2.5; sp = 2.5; ip = 5.0;
    }

    let useIgst = isInterState;
    // Override interstate logic if product explicitly only supports one type
    if (ip === 0 && (cp > 0 || sp > 0)) useIgst = false;
    else if (cp === 0 && sp === 0 && ip > 0) useIgst = true;

    let cgstAmt = 0, sgstAmt = 0, igstAmt = 0;

    if (useIgst) {
      igstAmt = (taxable * ip) / 100;
      cp = 0; sp = 0;
    } else {
      cgstAmt = (taxable * cp) / 100;
      sgstAmt = (taxable * sp) / 100;
      ip = 0;
    }

    return {
      taxableAmount: taxable,
      cgstPercent: cp,
      sgstPercent: sp,
      igstPercent: ip,
      cgstAmount: Number(cgstAmt.toFixed(2)),
      sgstAmount: Number(sgstAmt.toFixed(2)),
      igstAmount: Number(igstAmt.toFixed(2)),
      lineAmount: Number((taxable + cgstAmt + sgstAmt + igstAmt).toFixed(2)),
    };
  };

  const updateRowProduct = (index, productId) => {
    const prod = products.find((p) => p._id === productId);
    if (!prod) return;

    const newItems = [...items];
    const qty = newItems[index].qty || 1;
    const isInterState = selectedCustomer?.isInterState || false;
    
    const taxData = calculateLineTaxes(prod, qty, isInterState);

    newItems[index] = {
      productId: prod._id,
      productName: prod.name,
      qty,
      mrp: prod.mrp,
      unit: prod.unit || 'Boxes',
      ...taxData
    };

    setItems(newItems);
  };

  const updateRowQty = (index, qtyVal) => {
    let qty = qtyVal === '' ? '' : parseInt(qtyVal, 10);
    if (qty !== '' && (isNaN(qty) || qty < 0)) qty = 0;

    const numericQty = qty === '' ? 0 : qty;
    const newItems = [...items];
    const row = newItems[index];
    const isInterState = selectedCustomer?.isInterState || false;
    const taxData = calculateLineTaxes(row, numericQty, isInterState);

    newItems[index] = {
      ...row,
      qty,
      ...taxData
    };

    setItems(newItems);
  };

  const incrementQty = (index) => {
    const current = items[index]?.qty || 1;
    updateRowQty(index, current + 1);
  };

  const decrementQty = (index) => {
    const current = items[index]?.qty || 1;
    if (current > 1) {
      updateRowQty(index, current - 1);
    }
  };

  const addRow = () => {
    const defaultProduct = products[0];
    if (!defaultProduct) {
      toast.error('Please create products in catalog first');
      return;
    }

    const qty = 5;
    const isInterState = selectedCustomer?.isInterState || false;
    const taxData = calculateLineTaxes(defaultProduct, qty, isInterState);

    setItems([
      ...items,
      {
        productId: defaultProduct._id,
        productName: defaultProduct.name,
        qty,
        mrp: defaultProduct.mrp,
        unit: defaultProduct.unit || 'Boxes',
        ...taxData
      },
    ]);
  };

  const removeRow = (index) => {
    if (items.length <= 1) {
      toast.error('Invoice must have at least one line item');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const loadReferenceInvoiceSKUs = () => {
    if (!products || products.length === 0) return;
    const quantities = [10, 8, 6, 6, 5, 4, 3, 3, 4, 3, 2, 2, 6, 5, 4, 4];
    const isInterState = selectedCustomer?.isInterState || false;

    const populated = products.map((p, idx) => {
      const qty = quantities[idx % quantities.length] || 5;
      const taxData = calculateLineTaxes(p, qty, isInterState);

      return {
        productId: p._id,
        productName: p.name,
        qty,
        mrp: p.mrp,
        unit: p.unit || 'Boxes',
        ...taxData
      };
    });

    setItems(populated);
    toast.success('Loaded full 16-SKU wholesale order!');
  };

  // Computations
  const subTotal = items.reduce((acc, row) => acc + (row.taxableAmount || 0), 0);
  const totalCgst = items.reduce((acc, row) => acc + (row.cgstAmount || 0), 0);
  const totalSgst = items.reduce((acc, row) => acc + (row.sgstAmount || 0), 0);
  const totalIgst = items.reduce((acc, row) => acc + (row.igstAmount || 0), 0);
  const totalTax = totalCgst + totalSgst + totalIgst;
  const isIgstInvoice = totalIgst > 0 || (totalCgst === 0 && totalSgst === 0 && selectedCustomer?.isInterState);
  
  const discountAmt = Number(((subTotal + totalTax) * (discountPercent || 0) / 100).toFixed(2));
  const grandTotal = Math.max(0, subTotal + totalTax - discountAmt);
  const totalBoxes = items.reduce((acc, row) => acc + (row.qty || 0), 0);
  const liveAmountInWords = numberToWordsIndian(grandTotal);

  // Date format validator: DD-MM-YYYY
  const validateDate = (val) => {
    const regex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;
    return regex.test(val);
  };

  const handleInvoiceDateChange = (val) => {
    setInvoiceDate(val);
    if (val && !validateDate(val)) {
      setDateError('Invalid date format. Use DD-MM-YYYY');
    } else {
      setDateError('');
    }
  };

  // Mixed payment breakdown helpers
  const addPaymentEntry = () => {
    setPaymentBreakdown([...paymentBreakdown, { method: 'Cash', amount: '', reference: '' }]);
  };
  const removePaymentEntry = (i) => {
    setPaymentBreakdown(paymentBreakdown.filter((_, idx) => idx !== i));
  };
  const updatePaymentEntry = (i, field, val) => {
    const updated = [...paymentBreakdown];
    updated[i] = { ...updated[i], [field]: val };
    setPaymentBreakdown(updated);
  };
  const totalPaid = paymentBreakdown.reduce((s, p) => s + Number(p.amount || 0), 0);

  const formatINR = (val) => {
    return Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Build live invoice snapshot object for the side preview
  const livePreviewInvoice = {
    invoiceNumber: company?.invoicePrefix ? `${company.invoicePrefix}PREVIEW` : 'SCKT/2026-27/0002',
    invoiceDate,
    invoiceTime,
    customerSnapshot: {
      name: selectedCustomer?.name || 'Customer Contact',
      businessName: selectedCustomer?.businessName || 'M/s Example Retail Store',
      billingAddress: selectedCustomer?.billingAddress || 'Main Road, Kadapa, Andhra Pradesh - 516001',
      shippingAddress: sameAsBilling
        ? (selectedCustomer?.billingAddress || 'Main Road, Kadapa, Andhra Pradesh - 516001')
        : (shippingAddress || selectedCustomer?.billingAddress || 'Shipping Address'),
      gstin: selectedCustomer?.gstin || '37XXXXX0000X1ZX',
      mobile: selectedCustomer?.mobile || '+91 90000 00000',
      isInterState: Boolean(selectedCustomer?.isInterState),
    },
    companySnapshot: company || {
      businessName: 'SRI CHENNA KESAVA TRADERS',
      tagline: 'Wholesale & Distribution – Confectionery / Chocolates & Snacks',
      address: 'Beside Apsara Theatre, Chinna Chauku, Andhra Pradesh – 516002',
      mobile: '+91 63613 97790',
      email: 'srichennakesavatraders22@gmail.com',
      gstin: '37XXXXX0000X1ZX',
      termsAndConditions: [
        '1. Goods once sold will not be taken back or exchanged.',
        '2. Interest @ 24% p.a. will be charged if payment is not made within the due date.',
        '3. All disputes are subject to Kadapa jurisdiction only.',
        '4. Please check the goods at the time of delivery.',
        '5. This is a computer generated invoice.',
      ],
    },
    items: items.map((it) => ({
      _id: it.productId,
      itemName: it.productName || 'Selected Item',
      qty: it.qty,
      mrp: it.mrp,
      cgstAmount: it.cgstAmount,
      sgstAmount: it.sgstAmount,
      igstAmount: it.igstAmount,
      amount: it.lineAmount,
    })),
    subTotal,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax,
    grandTotal,
    amountInWords: liveAmountInWords,
    status: 'Draft',
    paymentMethod: showMixedPayment && paymentBreakdown.length > 1 ? 'Mixed' : paymentMethod,
    paymentBreakdown,
  };

  const handleSubmit = async (status = 'Sent') => {
    if (!selectedCustomerId) {
      return toast.error('Please select a customer for this invoice');
    }

    // Date format validation
    if (invoiceDate && !validateDate(invoiceDate)) {
      return toast.error('Invoice date must be in DD-MM-YYYY format');
    }

    const payloadItems = items.map((it) => ({
      product: it.productId,
      qty: it.qty,
    }));

    if (payloadItems.some((it) => !it.product)) {
      return toast.error('Please select a valid product for each row');
    }
    if (payloadItems.some((it) => !it.qty || it.qty < 1)) {
      return toast.error('Quantity must be at least 1 for all rows');
    }

    // Check for duplicate SKUs
    const ids = payloadItems.map((it) => it.product);
    const hasDuplicates = ids.length !== new Set(ids).size;
    if (hasDuplicates) {
      toast(`Warning: Same SKU added multiple times. Consider merging rows.`, { icon: '⚠️', duration: 4000 });
    }

    // Validate mixed payment if enabled
    if (showMixedPayment && paymentBreakdown.length > 0) {
      const hasInvalidEntry = paymentBreakdown.some((p) => !p.method || !p.amount || Number(p.amount) <= 0);
      if (hasInvalidEntry) {
        return toast.error('All payment entries must have a valid method and amount');
      }
    }

    setSaving(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        shippingAddress: sameAsBilling ? selectedCustomer?.billingAddress : shippingAddress,
        items: payloadItems,
        notes,
        status,
        invoiceDate,
        invoiceTime,
        paymentMethod: showMixedPayment && paymentBreakdown.length > 1 ? 'Mixed' : paymentMethod,
        paymentBreakdown: showMixedPayment && paymentBreakdown.length > 0 ? paymentBreakdown : [],
        discountPercent: Number(discountPercent || 0),
        dueDate: dueDate || null,
        transportMode: transportMode || '',
        vehicleNumber: vehicleNumber || '',
        lrNumber: lrNumber || '',
      };

      let res;
      if (isEditMode) {
        res = await invoicesAPI.update(id, payload);
        toast.success('Invoice updated successfully!');
      } else {
        res = await invoicesAPI.create(payload);
        toast.success(`Tax Invoice ${res.data.invoiceNumber} Generated!`);
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
      }

      navigate(`/invoices/${res.data._id}`);
    } catch (err) {
      toast.error(err.message || 'Error generating invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading invoice builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header & Layout Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/invoices')}
            className="rounded-xl border border-sky-100 bg-white/90 p-2.5 text-slate-600 hover:bg-sky-50 hover:text-sky-600 shadow-xs transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-sky-500" />
              {isEditMode ? 'Edit Tax Invoice' : 'Dynamic Tax Invoice Generator'}
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Sri Chenna Kesava Traders — Official GST Wholesale Billing Engine
            </p>
          </div>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Layout Mode Pill Selector (Desktop only) */}
          <div className="hidden lg:flex items-center rounded-xl bg-white border border-sky-100 p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                viewMode === 'split'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50'
              }`}
              title="Side-by-Side: Builder + Live Tax Invoice"
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Split View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('form')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                viewMode === 'form'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50'
              }`}
              title="Maximize Builder Form"
            >
              <FileCheck className="h-3.5 w-3.5" />
              <span>Form Only</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                viewMode === 'preview'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50'
              }`}
              title="Full Tax Invoice Sheet"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview Only</span>
            </button>
          </div>

          <button
            type="button"
            onClick={loadReferenceInvoiceSKUs}
            className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-white/90 px-3 py-2 text-xs font-bold text-sky-600 hover:bg-sky-50 shadow-xs transition-all"
            title="Populate 16 reference SKUs matching the sample invoice PDF"
          >
            <Sparkles className="h-4 w-4 text-sky-500" />
            <span className="hidden sm:inline">Load 16 Sample SKUs</span>
            <span className="inline sm:hidden">16 Samples</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit('Draft')}
            className="hidden sm:inline-flex rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-50"
          >
            Save Draft
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit('Sent')}
            className="hidden sm:flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-sky-500/25 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Send className="h-4 w-4 stroke-[2.3]" />
                <span>Generate Invoice</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* PhonePe / Google Pay Style Mobile Mode Segmented Switcher */}
      <div className="flex lg:hidden rounded-2xl bg-white border border-sky-200/80 p-1 shadow-xs">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mobileTab === 'form'
              ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck className="h-4 w-4" />
          <span>Invoice Builder</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mobileTab === 'preview'
              ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Eye className="h-4 w-4" />
          <span>Live Bill (Rs. {formatINR(grandTotal)})</span>
        </button>
      </div>

      {/* Main Container: Split or Full Views */}
      <div className={`grid gap-6 items-start ${
        viewMode === 'split'
          ? 'grid-cols-1 lg:grid-cols-12'
          : 'grid-cols-1'
      }`}>
        {/* ================= LEFT / MAIN BUILDER FORM ================= */}
        {(viewMode === 'split' || viewMode === 'form') && (
          <div className={`space-y-5 ${mobileTab === 'form' ? 'block' : 'hidden lg:block'} ${viewMode === 'split' ? 'lg:col-span-6 xl:col-span-7' : 'w-full'}`}>
            {/* Customer & Billing Card */}
            <div className="water-glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-sky-100/90 pb-3 mb-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Building className="h-4 w-4 text-sky-500" />
                  Customer Information
                </h2>
                {selectedCustomer && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      selectedCustomer.isInterState
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {isIgstInvoice ? 'Interstate (IGST 5%)' : 'Intrastate (CGST/SGST)'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Select Retail Customer Store *
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={handleCustomerChange}
                    className="w-full rounded-xl border border-sky-200/90 bg-white/95 px-3.5 py-2.5 text-sm font-semibold text-slate-800 shadow-xs focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.businessName} ({c.name}) - {c.billingAddress}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCustomer && (
                  <>
                    <div className="rounded-xl bg-sky-50/50 p-3.5 border border-sky-100/80 shadow-inner">
                      <p className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                        Bill To Details:
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {selectedCustomer.businessName}
                      </p>
                      <p className="text-xs text-slate-600 whitespace-pre-line mt-0.5">
                        {selectedCustomer.billingAddress}
                      </p>
                      <p className="text-xs font-mono font-bold text-sky-700 mt-2">
                        GSTIN: {selectedCustomer.gstin || 'UNREGISTERED'}
                      </p>
                      <p className="text-xs font-medium text-slate-600">
                        Mobile: {selectedCustomer.mobile}
                      </p>
                    </div>

                    <div className="rounded-xl bg-sky-50/50 p-3.5 border border-sky-100/80 shadow-inner flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Ship To Address:
                          </p>
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sameAsBilling}
                              onChange={(e) => {
                                setSameAsBilling(e.target.checked);
                                if (e.target.checked) {
                                  setShippingAddress(selectedCustomer.billingAddress);
                                }
                              }}
                              className="rounded text-sky-600 h-3.5 w-3.5"
                            />
                            <span>Same as Bill To</span>
                          </label>
                        </div>

                        {sameAsBilling ? (
                          <p className="text-xs text-slate-600 whitespace-pre-line mt-1">
                            {selectedCustomer.billingAddress}
                          </p>
                        ) : (
                          <textarea
                            rows={2}
                            value={shippingAddress}
                            onChange={(e) => setShippingAddress(e.target.value)}
                            placeholder="Enter shipping address..."
                            className="w-full rounded-lg border border-sky-200 bg-white p-2 text-xs text-slate-800 focus:outline-none"
                          />
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Invoice Date & Time */}
            <div className="water-glass rounded-2xl p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">
                    Invoice Sequential Number
                  </span>
                  <div className="font-mono text-xs font-black text-sky-700 bg-sky-50/70 p-2 rounded-xl border border-sky-100">
                    {company?.invoicePrefix || 'SCKT/2026-27/'} [Auto]
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    value={convertDateToInputFormat(invoiceDate)}
                    onChange={(e) => handleInvoiceDateChange(convertDateFromInputFormat(e.target.value))}
                    className={`w-full rounded-xl border bg-white px-3 py-1.5 text-xs text-slate-800 font-mono font-semibold focus:outline-none ${
                      dateError ? 'border-red-400 focus:border-red-500' : 'border-sky-200 focus:border-sky-500'
                    }`}
                  />
                  {dateError && (
                    <p className="text-[10px] text-red-500 font-semibold mt-0.5">⚠ {dateError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Invoice Time
                  </label>
                  <input
                    type="time"
                    value={convertTimeToInputFormat(invoiceTime)}
                    onChange={(e) => setInvoiceTime(convertTo12HourFormat(e.target.value))}
                    className="w-full rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-800 font-mono font-semibold focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Line-Items Table */}
            <div className="water-glass rounded-2xl overflow-hidden shadow-md">
              <div className="flex items-center justify-between border-b border-sky-100 p-4 bg-gradient-to-r from-sky-50/60 to-white">
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-850">
                    Line Items & Wholesale SKUs
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select chocolate/confectionery SKU and box quantity. Rates update instantly.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 text-xs font-bold text-sky-700 shadow-xs transition-colors"
                >
                  <Plus className="h-4 w-4 text-sky-600" />
                  <span>Add Row</span>
                </button>
              </div>

              {/* MOBILE VIEW: Touch-first Item Cards (PhonePe / Google Pay Style) */}
              <div className="block md:hidden p-3 space-y-3 max-h-[500px] overflow-y-auto">
                {items.map((row, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-sky-100 bg-white/90 p-3.5 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-sky-50 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 font-mono text-xs font-black text-sky-700">
                          #{index + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          Product Line Item
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* SKU Selection */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Select SKU
                      </label>
                      <select
                        value={row.productId}
                        onChange={(e) => updateRowProduct(index, e.target.value)}
                        className="w-full rounded-xl border border-sky-200/90 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-xs focus:border-sky-500 focus:outline-none"
                      >
                        <option value="">-- Choose SKU --</option>
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} ({p.packType}) - Rs. {Number(p.mrp).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Box Quantity Stepper + MRP */}
                    <div className="flex items-center justify-between bg-sky-50/50 rounded-xl p-2.5 border border-sky-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Quantity (Boxes)
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => decrementQty(index)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-sky-200 text-slate-700 font-black text-sm active:scale-90 shadow-2xs hover:bg-sky-50"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            onWheel={(e) => e.target.blur()}
                            onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                            min="0"
                            value={row.qty}
                            onChange={(e) => updateRowQty(index, e.target.value)}
                            className="w-14 text-center rounded-lg border border-sky-200 bg-white py-1 text-xs font-mono font-bold text-slate-900 shadow-xs focus:border-sky-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => incrementQty(index)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-sky-200 text-slate-700 font-black text-sm active:scale-90 shadow-2xs hover:bg-sky-50"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          MRP / Rate
                        </span>
                        <p className="font-mono text-xs font-bold text-slate-800 mt-1">
                          Rs. {formatINR(row.mrp)}
                        </p>
                      </div>
                    </div>

                    {/* Tax & Line Amount breakdown */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-sky-50">
                      <div className="text-slate-500 text-[10.5px]">
                        Tax ({isIgstInvoice ? 'IGST' : 'CGST/SGST'}):{' '}
                        <span className="font-mono font-bold text-slate-700">
                          Rs.{' '}
                          {isIgstInvoice
                            ? formatINR(row.igstAmount)
                            : formatINR((row.cgstAmount || 0) + (row.sgstAmount || 0))}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Row Total
                        </span>
                        <span className="font-mono text-sm font-black text-sky-700">
                          Rs. {formatINR(row.lineAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addRow}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sky-200 bg-sky-50/50 py-3 text-xs font-bold text-sky-700 hover:bg-sky-100/60 active:scale-98 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Add Another Product Item</span>
                </button>
              </div>

              {/* DESKTOP VIEW: Full Data Table */}
              <div className="hidden md:block overflow-x-auto max-h-[460px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-sky-100 bg-sky-50/90 backdrop-blur-md text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="py-2.5 pl-3 w-10 text-center">#</th>
                      <th className="py-2.5 min-w-[200px]">Item SKU Name</th>
                      <th className="py-2.5 w-24 text-center">Qty (Boxes)</th>
                      <th className="py-2.5 w-24 text-right">MRP (Rs.)</th>
                      <th className="py-2.5 w-24 text-right">Taxable</th>
                      {!isIgstInvoice && (
                        <>
                          <th className="py-2.5 w-20 text-right">CGST</th>
                          <th className="py-2.5 w-20 text-right">SGST</th>
                        </>
                      )}
                      {isIgstInvoice && (
                        <th className="py-2.5 w-24 text-right">IGST</th>
                      )}
                      <th className="py-2.5 w-28 text-right">Amount (Rs.)</th>
                      <th className="py-2.5 pr-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100/70">
                    {items.map((row, index) => (
                      <tr key={index} className="hover:bg-sky-50/30 transition-colors">
                        <td className="py-2 pl-3 text-center font-mono text-xs font-bold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-2">
                          <select
                            value={row.productId}
                            onChange={(e) => updateRowProduct(index, e.target.value)}
                            className="w-full rounded-lg border border-sky-200/90 bg-white/90 px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-xs focus:border-sky-500 focus:outline-none"
                          >
                            <option value="">-- Choose SKU --</option>
                            {products.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.name} ({p.packType}) - Rs. {Number(p.mrp).toFixed(2)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 text-center">
                          <input
                            type="number"
                            onWheel={(e) => e.target.blur()}
                            onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                            min="0"
                            value={row.qty}
                            onChange={(e) => updateRowQty(index, e.target.value)}
                            className="w-16 text-center rounded-lg border border-sky-200 bg-white py-1 text-xs font-mono font-bold text-slate-900 shadow-xs focus:border-sky-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 text-right font-mono text-xs font-semibold text-slate-600">
                          {formatINR(row.mrp)}
                        </td>
                        <td className="py-2 text-right font-mono text-xs font-semibold text-slate-600">
                          {formatINR(row.taxableAmount)}
                        </td>
                        {!isIgstInvoice && (
                          <>
                            <td className="py-2 text-right font-mono text-xs font-semibold text-slate-600">
                              {formatINR(row.cgstAmount)}
                            </td>
                            <td className="py-2 text-right font-mono text-xs font-semibold text-slate-600">
                              {formatINR(row.sgstAmount)}
                            </td>
                          </>
                        )}
                        {isIgstInvoice && (
                          <td className="py-2 text-right font-mono text-xs font-semibold text-slate-600">
                            {formatINR(row.igstAmount)}
                          </td>
                        )}
                        <td className="py-2 text-right font-mono font-bold text-slate-900 text-xs">
                          {formatINR(row.lineAmount)}
                        </td>
                        <td className="py-2 pr-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Order Notes & Summary + Payment & Discount */}
              <div className="border-t border-sky-100 bg-white/75 p-4 space-y-4">
                {/* Notes row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Order / Delivery Notes
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Vehicle number, dispatch instructions..."
                      className="w-full rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none"
                    />
                    <p className="text-[11px] font-semibold text-slate-500 mt-1.5">
                      Total Order: <span className="text-sky-600 font-extrabold">{totalBoxes} Boxes</span> across {items.length} SKUs.
                    </p>
                  </div>

                  {/* Totals Summary */}
                  <div className="rounded-xl border border-sky-200/90 bg-gradient-to-br from-sky-50/80 via-white to-teal-50/80 p-3 space-y-1.5 shadow-xs">
                    <div className="flex justify-between text-xs font-medium text-slate-600">
                      <span>Sub Total:</span>
                      <span className="font-mono font-bold text-slate-800">Rs. {formatINR(subTotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-slate-600">
                      <span>{isIgstInvoice ? 'IGST:' : 'CGST:'}</span>
                      <span className="font-mono font-bold text-slate-800">
                        Rs. {formatINR(isIgstInvoice ? totalIgst : totalCgst)}
                      </span>
                    </div>
                    {!isIgstInvoice && (
                      <div className="flex justify-between text-xs font-medium text-slate-600">
                        <span>SGST:</span>
                        <span className="font-mono font-bold text-slate-800">
                          Rs. {formatINR(totalSgst)}
                        </span>
                      </div>
                    )}
                    {discountPercent > 0 && (
                      <div className="flex justify-between text-xs font-medium text-emerald-700">
                        <span>Discount ({discountPercent}%):</span>
                        <span className="font-mono font-bold">- Rs. {formatINR(discountAmt)}</span>
                      </div>
                    )}
                    <div className="border-t border-sky-200 pt-1.5 flex justify-between text-sm font-extrabold text-slate-900">
                      <span>Grand Total:</span>
                      <span className="font-mono text-sky-600 text-base font-black">
                        Rs. {formatINR(grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ─── NEW: Payment Method + Discount + Due Date ─── */}
                <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3.5 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">Payment & Financial Details</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Payment Method */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => {
                          setPaymentMethod(e.target.value);
                          setShowMixedPayment(false);
                          setPaymentBreakdown([]);
                        }}
                        className="w-full rounded-xl border border-sky-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-sky-500 focus:outline-none"
                      >
                        <option value="">-- Select --</option>
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Credit">Credit</option>
                      </select>
                    </div>

                    {/* Discount % */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Discount %</label>
                      <input
                        type="number"
                        onWheel={(e) => e.target.blur()}
                        onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                        min="0"
                        max="100"
                        step="0.5"
                        value={discountPercent}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') setDiscountPercent('');
                          else setDiscountPercent(Math.min(100, Math.max(0, Number(val))));
                        }}
                        className="w-full rounded-xl border border-sky-200 bg-white px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-800 focus:border-sky-500 focus:outline-none"
                        placeholder="0"
                      />
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Due Date</label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full rounded-xl border border-sky-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-sky-500 focus:outline-none"
                      />
                    </div>

                    {/* Mixed Payment Toggle */}
                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showMixedPayment}
                          onChange={(e) => {
                            setShowMixedPayment(e.target.checked);
                            if (e.target.checked && paymentBreakdown.length === 0) {
                              setPaymentBreakdown([
                                { method: 'Cash', amount: '', reference: '' },
                                { method: 'UPI', amount: '', reference: '' },
                              ]);
                            }
                          }}
                          className="rounded text-sky-600 h-3.5 w-3.5"
                        />
                        <span className="text-xs font-bold text-slate-600">Split / Mixed Payment</span>
                      </label>
                    </div>
                  </div>

                  {/* Mixed Payment Breakdown */}
                  {showMixedPayment && (
                    <div className="rounded-xl border border-sky-200 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-700">Payment Breakdown</p>
                        <div className="flex items-center gap-2">
                          {totalPaid > 0 && (
                            <span className={`text-[10px] font-bold ${Math.abs(totalPaid - grandTotal) < 0.01 ? 'text-emerald-600' : 'text-orange-600'}`}>
                              Paid: Rs. {formatINR(totalPaid)} / Rs. {formatINR(grandTotal)}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={addPaymentEntry}
                            className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-lg hover:bg-sky-100"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                      {paymentBreakdown.map((entry, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-center">
                          <select
                            value={entry.method}
                            onChange={(e) => updatePaymentEntry(i, 'method', e.target.value)}
                            className="col-span-3 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
                          >
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Bank Transfer">Bank</option>
                            <option value="Credit">Credit</option>
                          </select>
                          <input
                            type="number"
                            onWheel={(e) => e.target.blur()}
                            onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                            min="0"
                            placeholder="Amount"
                            value={entry.amount}
                            onChange={(e) => updatePaymentEntry(i, 'amount', e.target.value)}
                            className="col-span-4 rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-xs font-mono font-bold text-slate-900 focus:border-sky-500 focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Ref / Txn ID"
                            value={entry.reference}
                            onChange={(e) => updatePaymentEntry(i, 'reference', e.target.value)}
                            className="col-span-4 rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-xs text-slate-600 focus:border-sky-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => removePaymentEntry(i)}
                            className="col-span-1 flex items-center justify-center text-slate-400 hover:text-rose-500"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Transport Details */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Transport Mode</label>
                      <input
                        type="text"
                        value={transportMode}
                        onChange={(e) => setTransportMode(e.target.value)}
                        placeholder="Road / Rail / Air"
                        className="w-full rounded-xl border border-sky-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Vehicle No.</label>
                      <input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        placeholder="AP 05 XX 0000"
                        className="w-full rounded-xl border border-sky-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">LR Number</label>
                      <input
                        type="text"
                        value={lrNumber}
                        onChange={(e) => setLrNumber(e.target.value)}
                        placeholder="LR / E-Way bill no."
                        className="w-full rounded-xl border border-sky-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= RIGHT / SIDE-BY-SIDE LIVE TAX INVOICE PREVIEW ================= */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div className={`${mobileTab === 'preview' ? 'block' : 'hidden lg:block'} ${viewMode === 'split' ? 'lg:col-span-6 xl:col-span-5' : 'w-full'}`}>
            <div className="sticky top-16 water-glass rounded-2xl p-3 shadow-md space-y-2">
              {/* Preview Bar Header */}
              <div className="flex items-center justify-between border-b border-sky-100 pb-2 px-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Zap className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Live Tax Invoice Preview
                    </h3>
                    <p className="text-[9.5px] text-slate-500">
                      Synchronized live with Sri Chenna Kesava Traders template
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[9.5px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Live Sync
                  </span>
                </div>
              </div>

              {/* Scrollable Printable Invoice Container — scale-to-fit */}
              <div
                className="overflow-y-auto overflow-x-hidden rounded-xl border border-sky-200/80 bg-white shadow-inner"
                style={{ maxHeight: 'calc(100vh - 185px)' }}
              >
                {/* 
                  Strategy: Invoice is naturally 760px wide.
                  We render it at full width inside an overflow:hidden wrapper,
                  then CSS scales it down. The outer wrapper height = invoice height × scale,
                  preventing clipping.
                */}
                <InvoiceScaler>
                  <PrintableInvoice invoice={livePreviewInvoice} />
                </InvoiceScaler>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PhonePe / Google Pay Style Sticky Checkout Bar for Mobile */}
      <div className="fixed bottom-16 left-0 right-0 z-30 block lg:hidden bg-white/95 backdrop-blur-xl border-t border-sky-100/90 p-3 shadow-[0_-8px_25px_rgba(14,165,233,0.12)]">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Total ({totalBoxes} Boxes)
            </p>
            <p className="text-base font-black font-mono text-slate-900">
              Rs. {formatINR(grandTotal)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit('Draft')}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 active:scale-95 shadow-2xs"
            >
              Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit('Sent')}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 px-4 py-2 text-xs font-black text-white shadow-md shadow-sky-500/25 active:scale-95 transition-all"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 stroke-[2.3]" />
                  <span>Generate Bill ➔</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateEditInvoice;
