import React, { useState, useEffect, useRef } from 'react';
import {
  Package, Plus, Search, Edit2, Trash2, X, AlertTriangle, Calculator,
  Download, Upload, Image, BarChart3, RefreshCw, Eye, Filter, FileSpreadsheet, CheckSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { productsAPI } from '../../api/apiClient';

export const DEFAULT_FLAVOURS = [
  'Choco',
  'Strawberry',
  'Vanilla',
  'Coffee',
  'Butterscotch',
  'Hazelnut',
  'Dark Cocoa',
  'Mint',
  'Caramel',
  'Crunch',
  'Eclair',
  'Toffee',
];

export const DEFAULT_PACK_TYPES = [
  '24-pack',
  '18-pack',
  '20-pack',
  '30-pack',
  '40-pack',
  '50-pack',
  'Jar',
  'Pouch',
  'Box',
  'Tin',
  'Jumbo',
  'Family Pack',
];

const EMPTY_FORM = {
  name: '',
  category: 'Choco',
  packType: '24-pack',
  piecePrice: 4,
  piecesPerBox: 24,
  boxesPerCarton: 12,
  stockPieces: 0,
  minStockPieces: 10,
  gstPercent: 5,
  hsnCode: '18069010',
  expiryDate: '',
  batchNumber: '',
  manufacturingDate: '',
  supplierName: '',
  discountPercent: 0,
  imageUrl: '',
};

// Validation rules
const validateProductForm = (data) => {
  const errors = {};
  if (!data.name.trim()) errors.name = 'Product name is required';
  if (!data.category.trim()) errors.category = 'Flavour is required';
  if (!data.packType.trim()) errors.packType = 'Pack type is required';
  if (!data.piecePrice || Number(data.piecePrice) < 0) errors.piecePrice = 'Piece price must be 0 or more';
  if (!data.piecesPerBox || Number(data.piecesPerBox) < 1) errors.piecesPerBox = 'Pieces per box must be at least 1';
  if (!data.boxesPerCarton || Number(data.boxesPerCarton) < 1) errors.boxesPerCarton = 'Boxes per carton must be at least 1';
  if (Number(data.stockPieces) < 0) errors.stockPieces = 'Stock cannot be negative';
  if (Number(data.minStockPieces) < 0) errors.minStockPieces = 'Min stock cannot be negative';
  if (data.expiryDate) {
    const expiry = new Date(data.expiryDate);
    if (isNaN(expiry)) errors.expiryDate = 'Invalid expiry date';
  }
  return errors;
};

const getDaysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  const diff = new Date(expiryDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const ExpiryChip = ({ expiryDate }) => {
  const days = getDaysUntilExpiry(expiryDate);
  if (days === null) return <span className="text-slate-300 text-xs">—</span>;
  if (days < 0) return <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[9px] font-black">EXPIRED</span>;
  if (days <= 7) return <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[9px] font-bold animate-pulse">{days}d left</span>;
  if (days <= 15) return <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[9px] font-bold">{days}d</span>;
  if (days <= 30) return <span className="rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 text-[9px] font-bold">{days}d</span>;
  return <span className="text-[9px] text-slate-400 font-mono">{new Date(expiryDate).toLocaleDateString('en-IN')}</span>;
};

export const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [packTypeFilter, setPackTypeFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [packTypes, setPackTypes] = useState([]);
  const [meta, setMeta] = useState({});
  const [stockFilter, setStockFilter] = useState(''); // '' | 'low' | 'expiring'
  const [stockMode, setStockMode] = useState('Boxes'); // 'Boxes' | 'Cartons' | 'Pieces'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [calcPiecesPerBox, setCalcPiecesPerBox] = useState(24);
  const [calcBoxesPerCarton, setCalcBoxesPerCarton] = useState(12);
  const [calcCartons, setCalcCartons] = useState('');
  const [calcBoxes, setCalcBoxes] = useState('');
  const [calcPieces, setCalcPieces] = useState('');

  const handleCalcCartonsChange = (val) => {
    setCalcCartons(val);
    const ctns = parseFloat(val);
    const ppb = Number(calcPiecesPerBox) || 1;
    const bpc = Number(calcBoxesPerCarton) || 1;
    if (!isNaN(ctns) && ctns >= 0) {
      setCalcBoxes(String(Math.round(ctns * bpc)));
      setCalcPieces(String(Math.round(ctns * ppb * bpc)));
    } else if (val === '') {
      setCalcBoxes('');
      setCalcPieces('');
    }
  };

  const handleCalcBoxesChange = (val) => {
    setCalcBoxes(val);
    const boxes = parseFloat(val);
    const ppb = Number(calcPiecesPerBox) || 1;
    const bpc = Number(calcBoxesPerCarton) || 1;
    if (!isNaN(boxes) && boxes >= 0) {
      setCalcPieces(String(Math.round(boxes * ppb)));
      setCalcCartons(String((boxes / bpc).toFixed(1).replace(/\.0$/, '')));
    } else if (val === '') {
      setCalcCartons('');
      setCalcPieces('');
    }
  };

  const handleCalcPiecesChange = (val) => {
    setCalcPieces(val);
    const pcs = parseInt(val, 10);
    const ppb = Number(calcPiecesPerBox) || 1;
    const bpc = Number(calcBoxesPerCarton) || 1;
    if (!isNaN(pcs) && pcs >= 0) {
      setCalcBoxes(String(Math.floor(pcs / ppb)));
      setCalcCartons(String(Math.floor(pcs / (ppb * bpc))));
    } else if (val === '') {
      setCalcBoxes('');
      setCalcCartons('');
    }
  };

  const openViewModal = (prod) => {
    setViewingProduct(prod);
    setIsViewModalOpen(true);
  };

  // Image upload state
  const [imageFile, setImageFile] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);
  const [isBulkImportPreviewOpen, setIsBulkImportPreviewOpen] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState(null);
  const [bulkImportPreviewData, setBulkImportPreviewData] = useState([]);
  const [bulkImportHeaders, setBulkImportHeaders] = useState([]);

  // Form State
  const [formData, setFormData] = useState(EMPTY_FORM);

  // Custom Flavours & Pack Types State (with LocalStorage persistence)
  const [customFlavours, setCustomFlavours] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('custom_flavours') || '[]');
    } catch {
      return [];
    }
  });
  const [customPackTypes, setCustomPackTypes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('custom_pack_types') || '[]');
    } catch {
      return [];
    }
  });

  const [isCustomFlavour, setIsCustomFlavour] = useState(false);
  const [isCustomPackType, setIsCustomPackType] = useState(false);
  const [newFlavourInput, setNewFlavourInput] = useState('');
  const [newPackTypeInput, setNewPackTypeInput] = useState('');

  // Combined lists
  const allFlavours = Array.from(new Set([
    ...DEFAULT_FLAVOURS,
    ...customFlavours,
    ...categories,
    ...(formData.category ? [formData.category] : [])
  ]));

  const allPackTypesList = Array.from(new Set([
    ...DEFAULT_PACK_TYPES,
    ...customPackTypes,
    ...packTypes,
    ...(formData.packType ? [formData.packType] : [])
  ]));

  const handleSaveCustomFlavour = () => {
    const trimmed = newFlavourInput.trim();
    if (!trimmed) return;
    const updated = Array.from(new Set([...customFlavours, trimmed]));
    setCustomFlavours(updated);
    try {
      localStorage.setItem('custom_flavours', JSON.stringify(updated));
    } catch {}
    updateField('category', trimmed);
    setIsCustomFlavour(false);
    setNewFlavourInput('');
    toast.success(`Flavour "${trimmed}" added!`);
  };

  const handleSaveCustomPackType = () => {
    const trimmed = newPackTypeInput.trim();
    if (!trimmed) return;
    const updated = Array.from(new Set([...customPackTypes, trimmed]));
    setCustomPackTypes(updated);
    try {
      localStorage.setItem('custom_pack_types', JSON.stringify(updated));
    } catch {}
    updateField('packType', trimmed);
    setIsCustomPackType(false);
    setNewPackTypeInput('');
    toast.success(`Pack type "${trimmed}" added!`);
  };

  // 3-Way Synchronized Stock Input States
  const [stockCartonsInput, setStockCartonsInput] = useState('');
  const [stockBoxesInput, setStockBoxesInput] = useState('');
  const [stockPiecesInput, setStockPiecesInput] = useState('');

  // Min Stock Alert Unit: 'cartons' (default) | 'boxes' | 'pieces'
  const [minStockUnit, setMinStockUnit] = useState('cartons');
  const [minStockInputVal, setMinStockInputVal] = useState('1');

  const handleMinStockChange = (val, unit = minStockUnit) => {
    setMinStockInputVal(val);
    const num = parseFloat(val);
    const ppb = Number(formData.piecesPerBox) || 1;
    const bpc = Number(formData.boxesPerCarton) || 1;
    if (!isNaN(num) && num >= 0) {
      let totalPieces = 0;
      if (unit === 'cartons') {
        totalPieces = Math.round(num * ppb * bpc);
      } else if (unit === 'boxes') {
        totalPieces = Math.round(num * ppb);
      } else {
        totalPieces = Math.round(num);
      }
      updateField('minStockPieces', totalPieces);
    } else if (val === '') {
      updateField('minStockPieces', 0);
    }
  };

  const handleMinStockUnitChange = (newUnit) => {
    const prevUnit = minStockUnit;
    const currentVal = parseFloat(minStockInputVal);
    const ppb = Number(formData.piecesPerBox) || 1;
    const bpc = Number(formData.boxesPerCarton) || 1;
    
    setMinStockUnit(newUnit);

    if (!isNaN(currentVal) && currentVal >= 0) {
      // Calculate total pieces from previous unit
      let pcs = 0;
      if (prevUnit === 'cartons') pcs = currentVal * ppb * bpc;
      else if (prevUnit === 'boxes') pcs = currentVal * ppb;
      else pcs = currentVal;

      let convertedVal = String(currentVal);
      if (newUnit === 'cartons') {
        const ctns = pcs / (ppb * bpc);
        convertedVal = Number.isInteger(ctns) ? String(ctns) : ctns.toFixed(1).replace(/\.0$/, '');
      } else if (newUnit === 'boxes') {
        const bxs = pcs / ppb;
        convertedVal = Number.isInteger(bxs) ? String(bxs) : bxs.toFixed(1).replace(/\.0$/, '');
      } else {
        convertedVal = String(Math.round(pcs));
      }

      setMinStockInputVal(convertedVal);
      updateField('minStockPieces', Math.round(pcs));
    }
  };

  const onCartonsChange = (val) => {
    setStockCartonsInput(val);
    const ctns = parseFloat(val);
    const ppb = Number(formData.piecesPerBox) || 1;
    const bpc = Number(formData.boxesPerCarton) || 1;
    if (!isNaN(ctns) && ctns >= 0) {
      const totalPcs = Math.round(ctns * ppb * bpc);
      const totalBoxes = Math.round(ctns * bpc);
      setStockBoxesInput(String(totalBoxes));
      setStockPiecesInput(String(totalPcs));
      updateField('stockPieces', totalPcs);
    } else if (val === '') {
      setStockBoxesInput('');
      setStockPiecesInput('');
      updateField('stockPieces', 0);
    }
  };

  const onBoxesChange = (val) => {
    setStockBoxesInput(val);
    const boxes = parseFloat(val);
    const ppb = Number(formData.piecesPerBox) || 1;
    const bpc = Number(formData.boxesPerCarton) || 1;
    if (!isNaN(boxes) && boxes >= 0) {
      const totalPcs = Math.round(boxes * ppb);
      const ctns = (boxes / bpc).toFixed(1).replace(/\.0$/, '');
      setStockCartonsInput(String(ctns));
      setStockPiecesInput(String(totalPcs));
      updateField('stockPieces', totalPcs);
    } else if (val === '') {
      setStockCartonsInput('');
      setStockPiecesInput('');
      updateField('stockPieces', 0);
    }
  };

  const onPiecesChange = (val) => {
    setStockPiecesInput(val);
    const pcs = parseInt(val, 10);
    const ppb = Number(formData.piecesPerBox) || 1;
    const bpc = Number(formData.boxesPerCarton) || 1;
    if (!isNaN(pcs) && pcs >= 0) {
      const boxes = Math.floor(pcs / ppb);
      const ctns = Math.floor(pcs / (ppb * bpc));
      setStockBoxesInput(String(boxes));
      setStockCartonsInput(String(ctns));
      updateField('stockPieces', pcs);
    } else if (val === '') {
      setStockBoxesInput('');
      setStockCartonsInput('');
      updateField('stockPieces', 0);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter, packTypeFilter, stockFilter, page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        search: search || undefined,
        category: categoryFilter || undefined,
        packType: packTypeFilter || undefined,
        lowStock: stockFilter === 'low' ? 'true' : undefined,
        expiringSoon: stockFilter === 'expiring' ? 'true' : undefined,
        page,
        limit: 20,
      };
      const res = await productsAPI.getAll(params);
      if (res.success && res.data) {
        setProducts(res.data);
        setTotalPages(res.pagination?.pages || 1);
        setTotalCount(res.pagination?.total || 0);
        if (res.meta) {
          setCategories(res.meta.categories || []);
          setPackTypes(res.meta.packTypes || []);
          setMeta(res.meta);
        }
      }
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const openAddModal = () => {
    setSelectedProduct(null);
    setFormData({
      ...EMPTY_FORM,
      minStockPieces: 24 * 12, // 1 Carton by default
    });
    setFormErrors({});
    setImageFile(null);
    setIsCustomFlavour(false);
    setIsCustomPackType(false);
    setNewFlavourInput('');
    setNewPackTypeInput('');
    setStockCartonsInput('0');
    setStockBoxesInput('0');
    setStockPiecesInput('0');
    setMinStockUnit('cartons');
    setMinStockInputVal('1');
    setIsModalOpen(true);
  };

  const openEditModal = (prod) => {
    setSelectedProduct(prod);
    setFormErrors({});
    setImageFile(null);
    setIsCustomFlavour(false);
    setIsCustomPackType(false);
    setNewFlavourInput('');
    setNewPackTypeInput('');
    const ppb = prod.piecesPerBox || 24;
    const bpc = prod.boxesPerCarton || prod.boxesPerCotton || 12;
    const pcs = prod.stockPieces || 0;
    setStockPiecesInput(String(pcs));
    setStockBoxesInput(String(Math.floor(pcs / ppb)));
    setStockCartonsInput(String(Math.floor(pcs / (ppb * bpc))));

    // Determine best initial unit for Min Stock Alert (default Carton)
    const minPcs = prod.minStockPieces ?? (ppb * bpc);
    const ctnPcs = ppb * bpc;
    if (minPcs > 0 && minPcs % ctnPcs === 0) {
      setMinStockUnit('cartons');
      setMinStockInputVal(String(minPcs / ctnPcs));
    } else if (minPcs > 0 && minPcs % ppb === 0) {
      setMinStockUnit('boxes');
      setMinStockInputVal(String(minPcs / ppb));
    } else {
      setMinStockUnit('pieces');
      setMinStockInputVal(String(minPcs));
    }

    setFormData({
      name: prod.name,
      category: prod.category,
      packType: prod.packType,
      piecePrice:      prod.piecePrice    ?? 4,
      piecesPerBox:    prod.piecesPerBox  ?? 24,
      boxesPerCarton:  prod.boxesPerCarton ?? prod.boxesPerCotton ?? 12,
      stockPieces:     prod.stockPieces   ?? 0,
      minStockPieces:  prod.minStockPieces ?? 10,
      gstPercent:      prod.gstPercent    ?? 5,
      hsnCode:         prod.hsnCode       || '18069010',
      expiryDate:      prod.expiryDate ? prod.expiryDate.split('T')[0] : '',
      batchNumber:     prod.batchNumber   || '',
      manufacturingDate: prod.manufacturingDate ? prod.manufacturingDate.split('T')[0] : '',
      supplierName:    prod.supplierName  || '',
      discountPercent: prod.discountPercent || 0,
      imageUrl:        prod.imageUrl      || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const errors = validateProductForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fix the form errors before saving');
      return;
    }
    setFormErrors({});
    setSaving(true);
    try {
      // Auto-persist new flavour and pack type to localStorage
      if (formData.category && !DEFAULT_FLAVOURS.includes(formData.category) && !customFlavours.includes(formData.category)) {
        const updated = [...customFlavours, formData.category];
        setCustomFlavours(updated);
        try { localStorage.setItem('custom_flavours', JSON.stringify(updated)); } catch {}
      }
      if (formData.packType && !DEFAULT_PACK_TYPES.includes(formData.packType) && !customPackTypes.includes(formData.packType)) {
        const updated = [...customPackTypes, formData.packType];
        setCustomPackTypes(updated);
        try { localStorage.setItem('custom_pack_types', JSON.stringify(updated)); } catch {}
      }

      let savedProduct;
      if (selectedProduct) {
        const res = await productsAPI.update(selectedProduct._id, formData);
        savedProduct = res.data;
        toast.success('Product updated successfully!');
      } else {
        const res = await productsAPI.create(formData);
        savedProduct = res.data;
        toast.success('New product SKU created!');
      }

      // Upload image if selected
      if (imageFile && savedProduct?._id) {
        setImageUploading(true);
        try {
          const fd = new FormData();
          fd.append('image', imageFile);
          await productsAPI.uploadImage(savedProduct._id, fd);
          toast.success('Product image uploaded!');
        } catch {
          toast.error('Image upload failed but product saved');
        } finally {
          setImageUploading(false);
        }
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Error saving product');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      await productsAPI.delete(selectedProduct._id);
      toast.success('Product deleted successfully');
      setIsDeleteModalOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Error deleting product');
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = () => {
    window.open(productsAPI.getExportUrl(), '_blank');
    toast.success('Downloading products catalog...');
  };

  const handleDownloadTemplate = () => {
    window.open(productsAPI.getTemplateUrl(), '_blank');
    toast.success('Downloading import template...');
  };

  const handleDownloadSample = () => {
    window.open(productsAPI.getSampleUrl(), '_blank');
    toast.success('Downloading styled sample Excel sheet with 16 pre-filled SKUs...');
  };

  const toggleSelectProduct = (id) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.length === products.length && products.length > 0) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map((p) => p._id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const res = await productsAPI.bulkDelete(selectedProductIds);
      if (res.success) {
        toast.success(res.message || `Deleted ${selectedProductIds.length} products`);
        setSelectedProductIds([]);
        setIsBulkDeleteMode(false);
        setIsBulkDeleteModalOpen(false);
        fetchProducts();
      } else {
        toast.error(res.message || 'Failed to delete products');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Bulk delete failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkImportFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Please upload an Excel or CSV file (.xlsx, .xls, .csv)');
      return;
    }
    setBulkImportFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (data.length > 0) {
          setBulkImportHeaders(data[0]);
          setBulkImportPreviewData(data.slice(1)); // show all rows
        }
      } catch (err) {
        toast.error('Could not read preview of excel file.');
      }
    };
    reader.readAsBinaryString(file);
    if (importInputRef.current) importInputRef.current.value = '';
  };

  const openBulkImportModal = () => {
    setBulkImportFile(null);
    setBulkImportPreviewData([]);
    setBulkImportHeaders([]);
    setIsBulkImportPreviewOpen(true);
  };
  const confirmBulkImport = async () => {
    if (!bulkImportFile) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', bulkImportFile);
      const res = await productsAPI.bulkImport(fd);
      if (res.success) {
        toast.success(res.message || 'Import successful!');
        if (res.data?.errors?.length > 0) {
          toast(`${res.data.errors.length} rows had errors`, { icon: '⚠️' });
        }
        setIsBulkImportPreviewOpen(false);
        setBulkImportFile(null);
        fetchProducts();
      }
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const updateField = (field, value) => {
    setFormData((f) => {
      const next = { ...f, [field]: value };
      if (field === 'piecesPerBox' || field === 'boxesPerCarton') {
        const ppb = Number(field === 'piecesPerBox' ? value : f.piecesPerBox) || 1;
        const bpc = Number(field === 'boxesPerCarton' ? value : f.boxesPerCarton) || 1;
        const pcs = Number(f.stockPieces) || 0;
        setStockBoxesInput(String(Math.floor(pcs / ppb)));
        setStockCartonsInput(String(Math.floor(pcs / (ppb * bpc))));
        if (minStockUnit === 'cartons') {
          next.minStockPieces = Math.round((parseFloat(minStockInputVal) || 0) * ppb * bpc);
        } else if (minStockUnit === 'boxes') {
          next.minStockPieces = Math.round((parseFloat(minStockInputVal) || 0) * ppb);
        }
      }
      return next;
    });
    if (formErrors[field]) {
      setFormErrors((e) => { const { [field]: _, ...rest } = e; return rest; });
    }
  };

  const totalStockBoxes = meta.totalStockBoxes !== undefined 
    ? meta.totalStockBoxes 
    : (meta.totalStock !== undefined && meta.totalStock > 0
      ? meta.totalStock
      : products.reduce((sum, p) => sum + Math.floor((p.stockPieces || 0) / (p.piecesPerBox || 1)), 0));

  const totalStockCartons = meta.totalStockCartons !== undefined 
    ? meta.totalStockCartons 
    : products.reduce((sum, p) => sum + Math.floor((p.stockPieces || 0) / ((p.piecesPerBox || 1) * (p.boxesPerCarton || 1))), 0);

  const totalStockPieces = meta.totalStockPieces !== undefined 
    ? meta.totalStockPieces 
    : products.reduce((sum, p) => sum + (p.stockPieces || 0), 0);

  const currentStockCount = stockMode === 'Cartons' 
    ? totalStockCartons 
    : stockMode === 'Pieces' 
    ? totalStockPieces 
    : totalStockBoxes;

  return (
    <div className="space-y-3 lg:space-y-5">
      <div className="water-glass rounded-2xl border border-sky-200 p-3 lg:p-4 shadow-sm">
        {/* Row 1: Title, Alerts, Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-4 mb-3 pb-3 lg:mb-4 lg:pb-4 border-b border-sky-100/60">
          
          {/* Left: Title & Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center items-start gap-2">

                <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Package className="h-5 w-5 text-sky-500" />
                  Products & SKU Catalog
                </h1>
                <button
                  type="button"
                  onClick={() => setIsCalcModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 px-2.5 py-1 text-[11px] sm:text-xs font-bold text-white shadow-md shadow-sky-500/20 transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                >
                  <Calculator className="h-3.5 w-3.5" />
                  
                </button>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{totalCount} SKUs Available</p>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center gap-2 bg-sky-50/50 rounded-xl px-2 py-1 border border-sky-100 mt-1 sm:mt-0 sm:ml-2">
              <span className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-bold text-sky-700 shadow-sm border border-sky-100">
                Total: {totalCount}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mx-1">
                Page {page} of {Math.max(1, totalPages)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-lg bg-white border border-sky-200 px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm hover:bg-sky-50 disabled:opacity-40 transition-colors"
                >
                  Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="rounded-lg bg-white border border-sky-200 px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm hover:bg-sky-50 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Middle: Compact Alerts */}
          {(meta.expiredCount > 0 || meta.expiringCount > 0 || meta.lowStockCount > 0) && (
            <div className="hidden xl:flex flex-1 justify-center min-w-0 px-4">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 max-w-full">
                {meta.expiredCount > 0 && (
                  <div
                    onClick={() => { setStockFilter('expiring'); setPage(1); }}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-red-50 text-red-700 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-red-200 cursor-pointer hover:bg-red-100 transition-colors shadow-xs"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {meta.expiredCount} EXPIRED
                  </div>
                )}
                {meta.expiringCount > 0 && (
                  <div
                    onClick={() => { setStockFilter('expiring'); setPage(1); }}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-orange-50 text-orange-700 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors shadow-xs"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {meta.expiringCount} Expiring
                  </div>
                )}
                {meta.lowStockCount > 0 && (
                  <div
                    onClick={() => { setStockFilter('low'); setPage(1); }}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-colors shadow-xs"
                  >
                    <Package className="h-4 w-4" />
                    {meta.lowStockCount} Low Stock
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right: Actions */}
          <div className="hidden xl:flex flex-wrap items-center justify-end gap-2">
            {!isBulkDeleteMode ? (
              <button
                type="button"
                onClick={() => setIsBulkDeleteMode(true)}
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-xs transition-all"
                title="Click to select products for bulk deletion"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                <span>Bulk Delete</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkDeleteMode(false);
                    setSelectedProductIds([]);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-xs transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  disabled={selectedProductIds.length === 0}
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                    selectedProductIds.length > 0
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 hover:bg-rose-700 animate-pulse'
                      : 'bg-rose-100 text-rose-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete ({selectedProductIds.length})</span>
                </button>
              </div>
            )}
            <button onClick={() => window.open(productsAPI.getExportUrl(), '_blank')} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 shadow-xs transition-all">
              <Download className="h-3.5 w-3.5" /><span>Export</span>
            </button>
            <button onClick={openBulkImportModal} disabled={importing} className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100 shadow-xs transition-all disabled:opacity-60">
              {importing ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" /> : <Upload className="h-3.5 w-3.5" />}
              <span>{importing ? 'Importing...' : 'Bulk Import'}</span>
            </button>
            <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBulkImportFileSelect} />
            
            {/* Total Stock Stat Badge with Dynamic Mode Toggle */}
            <div className="flex items-center gap-2.5 rounded-xl border border-sky-150 bg-gradient-to-r from-sky-50 via-white to-teal-50 px-3 py-1.5 shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-teal-500 text-white shadow-sm shrink-0">
                <Package className="h-4 w-4 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Total {stockMode}
                  </p>
                  {/* Mode Toggles */}
                  <div className="inline-flex rounded-md border border-sky-200 bg-white p-0.5 shadow-2xs">
                    {['Boxes', 'Cartons', 'Pieces'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setStockMode(mode)}
                        className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded transition-all ${
                          stockMode === mode
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-sm font-black text-slate-800 leading-tight font-mono mt-0.5">
                  {currentStockCount.toLocaleString('en-IN')}
                </p>
              </div>
              {meta.totalStockValue > 0 && (
                <div className="pl-2 border-l border-sky-200 ml-1">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Stock Value</p>
                  <p className="text-[11px] font-black text-teal-700 font-mono">
                    Rs. {Number(meta.totalStockValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              )}
            </div>
            
            <button onClick={openAddModal} className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-600 active:scale-[0.98]">
              <Plus className="h-4 w-4 stroke-[3]" /><span>Add SKU</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search, Filters */}
        <div className="flex flex-col xl:flex-row items-center gap-3">
          <div className="flex items-center gap-2 w-full xl:w-auto flex-1">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by SKU, flavour, pack type..."
                className="w-full rounded-xl border border-sky-200/90 bg-white/95 py-2 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 shadow-sm"
              />
            </form>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sky-700 hover:bg-sky-100 transition-colors"
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden xl:flex flex-row items-center gap-3">
            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="w-full md:w-40 rounded-xl border border-sky-200/90 bg-white/95 py-2 px-3 text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none shadow-sm">
              <option value="">All Flavours</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={packTypeFilter} onChange={(e) => { setPackTypeFilter(e.target.value); setPage(1); }} className="w-full md:w-36 rounded-xl border border-sky-200/90 bg-white/95 py-2 px-3 text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none shadow-sm">
              <option value="">All Pack Types</option>
              {packTypes.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); setPage(1); }} className="w-full md:w-36 rounded-xl border border-sky-200/90 bg-white/95 py-2 px-3 text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none shadow-sm">
              <option value="">All Stock</option>
              <option value="low">⚠️ Low Stock</option>
              <option value="expiring">📅 Expiring Soon</option>
            </select>
            <button onClick={() => { setSearch(''); setCategoryFilter(''); setPackTypeFilter(''); setStockFilter(''); setPage(1); }} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-xs transition-all" title="Reset Filters">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile Filter & Actions Menu */}
        {isMobileMenuOpen && (
          <div className="xl:hidden mt-3 pt-3 border-t border-sky-100/60 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-2">
              {!isBulkDeleteMode ? (
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteMode(true)}
                  className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-xs"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  <span>Bulk Delete</span>
                </button>
              ) : (
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkDeleteMode(false);
                      setSelectedProductIds([]);
                    }}
                    className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    disabled={selectedProductIds.length === 0}
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-black transition-all ${
                      selectedProductIds.length > 0
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                        : 'bg-rose-100 text-rose-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete ({selectedProductIds.length})</span>
                  </button>
                </div>
              )}
              <button onClick={() => window.open(productsAPI.getExportUrl(), '_blank')} className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 shadow-xs">
                <Download className="h-3.5 w-3.5" /><span>Export</span>
              </button>
              <button onClick={openBulkImportModal} disabled={importing} className="flex items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100 shadow-xs disabled:opacity-60">
                {importing ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" /> : <Upload className="h-3.5 w-3.5" />}
                <span>Import</span>
              </button>
              <button onClick={openAddModal} className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-2 py-1.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:bg-sky-600">
                <Plus className="h-4 w-4 stroke-[3]" /><span>Add SKU</span>
              </button>
            </div>

            {/* Mobile Stat Badge with Mode Toggle */}
            <div className="flex flex-col gap-2 rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50 to-teal-50 p-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-teal-500 text-white shadow-sm">
                    <Package className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total {stockMode}</p>
                    <p className="text-sm font-black text-slate-800 leading-tight font-mono">{currentStockCount.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                {/* Mobile Mode Toggles */}
                <div className="inline-flex rounded-md border border-sky-200 bg-white p-0.5 shadow-2xs">
                  {['Boxes', 'Cartons', 'Pieces'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setStockMode(mode)}
                      className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded transition-all ${
                        stockMode === mode
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              {meta.totalStockValue > 0 && (
                <div className="pt-1.5 border-t border-sky-200/60 flex items-center justify-between text-[10px]">
                  <span className="font-bold uppercase tracking-wider text-slate-500">Total Stock Value</span>
                  <span className="font-black text-teal-700 font-mono">Rs. {Number(meta.totalStockValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              )}
            </div>

            {/* Mobile Alerts */}
            {(meta.expiredCount > 0 || meta.expiringCount > 0 || meta.lowStockCount > 0) && (
              <div className="flex flex-wrap gap-2">
                {meta.expiredCount > 0 && (
                  <div
                    onClick={() => { setStockFilter('expiring'); setPage(1); setIsMobileMenuOpen(false); }}
                    className="flex-1 min-w-[100px] flex justify-center items-center gap-1.5 bg-red-50 text-red-700 px-2 py-1.5 rounded-xl text-xs font-bold border border-red-200 cursor-pointer shadow-sm"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {meta.expiredCount} EXPIRED
                  </div>
                )}
                {meta.expiringCount > 0 && (
                  <div
                    onClick={() => { setStockFilter('expiring'); setPage(1); setIsMobileMenuOpen(false); }}
                    className="flex-1 min-w-[100px] flex justify-center items-center gap-1.5 bg-orange-50 text-orange-700 px-2 py-1.5 rounded-xl text-xs font-bold border border-orange-200 cursor-pointer shadow-sm"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {meta.expiringCount} Expiring
                  </div>
                )}
                {meta.lowStockCount > 0 && (
                  <div
                    onClick={() => { setStockFilter('low'); setPage(1); setIsMobileMenuOpen(false); }}
                    className="flex-1 min-w-[100px] flex justify-center items-center gap-1.5 bg-yellow-50 text-yellow-700 px-2 py-1.5 rounded-xl text-xs font-bold border border-yellow-200 cursor-pointer shadow-sm"
                  >
                    <Package className="h-3.5 w-3.5" />
                    {meta.lowStockCount} Low Stock
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 pb-1">
              <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="w-full rounded-xl border border-sky-200/90 bg-white/95 py-2 px-2 text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none shadow-sm">
                <option value="">All Flavours</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={packTypeFilter} onChange={(e) => { setPackTypeFilter(e.target.value); setPage(1); }} className="w-full rounded-xl border border-sky-200/90 bg-white/95 py-2 px-2 text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none shadow-sm">
                <option value="">All Pack Types</option>
                {packTypes.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); setPage(1); }} className="w-full rounded-xl border border-sky-200/90 bg-white/95 py-2 px-2 text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none shadow-sm">
                <option value="">All Stock</option>
                <option value="low">⚠️ Low Stock</option>
                <option value="expiring">📅 Expiring Soon</option>
              </select>
              <button onClick={() => { setSearch(''); setCategoryFilter(''); setPackTypeFilter(''); setStockFilter(''); setPage(1); }} className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-xs" title="Reset Filters">
                <RefreshCw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selection Action Banner above Table */}
      {isBulkDeleteMode && (
        <div className="flex items-center justify-between bg-gradient-to-r from-rose-600 to-red-600 text-white px-4 py-2.5 rounded-2xl shadow-lg shadow-rose-600/20 mb-3 animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-rose-600 text-xs font-black shadow-xs">
              {selectedProductIds.length}
            </span>
            <span className="text-xs font-bold">
              {selectedProductIds.length > 0 ? `${selectedProductIds.length} selected` : 'Select products to delete'}
            </span>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="ml-2 text-xs font-bold underline text-white/90 hover:text-white"
            >
              {selectedProductIds.length === products.length && products.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsBulkDeleteMode(false);
                setSelectedProductIds([]);
              }}
              className="text-xs font-bold bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl transition-colors"
            >
              Exit Selection
            </button>
            <button
              type="button"
              disabled={selectedProductIds.length === 0}
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className={`flex items-center gap-1.5 text-xs font-black px-4 py-1.5 rounded-xl shadow-sm transition-all ${
                selectedProductIds.length > 0
                  ? 'bg-white text-rose-700 hover:bg-rose-50 cursor-pointer'
                  : 'bg-white/40 text-white/70 cursor-not-allowed'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-600 stroke-[2.5]" />
              <span>Delete Selected ({selectedProductIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="water-glass rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[1000px]">
            <thead>
              <tr className="border-b border-sky-100 bg-sky-50/50 text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
                {isBulkDeleteMode && (
                  <th className="py-3.5 pl-4 w-10 text-center animate-in fade-in duration-150">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.length === products.length && products.length > 0}
                      onChange={toggleSelectAll}
                      title="Select / Deselect All SKUs"
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer accent-sky-600"
                    />
                  </th>
                )}
                <th className="py-3.5 pl-2 w-12">Image</th>
                <th className="py-3.5">Product Name</th>
                <th className="py-3.5">Flavour</th>
                <th className="py-3.5">Pack Type</th>
                <th className={`py-3.5 text-center transition-colors ${stockMode === 'Pieces' ? 'text-sky-700 font-black bg-sky-100/60 rounded-t-lg' : ''}`}>Stock (Pcs)</th>
                <th className={`py-3.5 text-center transition-colors ${stockMode === 'Boxes' ? 'text-sky-700 font-black bg-sky-100/60 rounded-t-lg' : ''}`}>Boxes</th>
                <th className={`py-3.5 text-center transition-colors ${stockMode === 'Cartons' ? 'text-sky-700 font-black bg-sky-100/60 rounded-t-lg' : ''}`}>Cartons</th>
                <th className="py-3.5 text-center hidden md:table-cell">Exp Date</th>
                <th className="py-3.5 text-right">Piece Price</th>
                <th className="py-3.5 text-right">Box Price</th>
                <th className="py-3.5 text-right">Carton Price</th>
                <th className="py-3.5 text-center hidden lg:table-cell">GST</th>
                <th className="py-3.5 text-center hidden xl:table-cell">HSN</th>
                <th className="py-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/70">
              {loading ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent mx-auto" />
                  </td>
                </tr>
              ) : products.length > 0 ? (
                products.map((prod) => {
                  const isLowStock = (prod.stockPieces ?? 0) <= (prod.minStockPieces ?? 10);
                  const isOutOfStock = (prod.stockPieces ?? 0) === 0;
                  const isSelected = selectedProductIds.includes(prod._id);
                  return (
                    <tr
                      key={prod._id}
                      className={`hover:bg-sky-50/30 transition-colors group ${
                        isSelected ? 'bg-sky-50/60' : ''
                      }`}
                    >
                      {/* Checkbox Cell */}
                      {isBulkDeleteMode && (
                        <td className="py-3 pl-4 text-center animate-in fade-in duration-150">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectProduct(prod._id)}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer accent-sky-600"
                          />
                        </td>
                      )}
                      {/* Image Cell */}
                      <td className="py-3 pl-2">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="h-9 w-9 rounded-xl object-cover border border-sky-100 shadow-sm"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-slate-300">
                            <Package className="h-4 w-4" />
                          </div>
                        )}
                      </td>
                      {/* Name */}
                      <td className="py-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 text-sm">{prod.name}</span>
                        {prod.discountPercent > 0 && (
                          <span className="ml-2 rounded-md bg-green-50 px-1.5 py-0.5 text-[9px] font-bold text-green-700 border border-green-100">
                            {prod.discountPercent}% OFF
                          </span>
                        )}
                      </td>
                      {/* Category */}
                      <td className="py-3">
                        <span className="rounded-md bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700 border border-sky-100">
                          {prod.category}
                        </span>
                      </td>
                      {/* Pack Type */}
                      <td className="py-3">
                        <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600 border border-slate-100">
                          {prod.packType}
                        </span>
                      </td>
                      {/* Stock */}
                      <td className={`py-3 text-center transition-colors ${stockMode === 'Pieces' ? 'bg-sky-50/60 font-black' : ''}`}>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`text-base font-black font-mono ${
                            prod.stockPieces <= prod.minStockPieces ? (prod.stockPieces === 0 ? 'text-red-600' : 'text-orange-600') : (stockMode === 'Pieces' ? 'text-sky-800' : 'text-slate-900')
                          }`}>
                            {prod.stockPieces ?? 0}
                          </span>
                          <span className="text-[8px] text-slate-400">pcs</span>
                          {prod.stockPieces <= prod.minStockPieces && (
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                              prod.stockPieces === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {prod.stockPieces === 0 ? 'OUT' : 'LOW'}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Boxes */}
                      <td className={`py-3 text-center text-xs transition-colors ${stockMode === 'Boxes' ? 'bg-sky-50/60 font-black text-sky-800 font-mono text-sm' : 'font-semibold text-slate-700'}`}>
                        {prod.stockBoxes ?? Math.floor((prod.stockPieces ?? 0) / (prod.piecesPerBox || 1))}
                      </td>
                      {/* Cartons */}
                      <td className={`py-3 text-center text-xs transition-colors ${stockMode === 'Cartons' ? 'bg-sky-50/60 font-black text-sky-800 font-mono text-sm' : 'font-semibold text-slate-700'}`}>
                        {prod.stockCartons ?? prod.stockCottons ?? Math.floor((prod.stockPieces ?? 0) / ((prod.piecesPerBox || 1) * (prod.boxesPerCarton || prod.boxesPerCotton || 1)))}
                      </td>
                      {/* Expiry */}
                      <td className="py-3 text-center hidden md:table-cell">
                        <ExpiryChip expiryDate={prod.expiryDate} />
                      </td>
                      {/* Piece Price */}
                      <td className="py-3 text-right font-mono font-bold text-slate-900 text-xs">
                        Rs. {Number(prod.piecePrice ?? 0).toFixed(2)}
                      </td>
                      {/* Box Price */}
                      <td className="py-3 text-right font-mono font-bold text-teal-600 text-xs">
                        Rs. {prod.boxPrice ?? (Number(prod.piecesPerBox || 1) * Number(prod.piecePrice || 0)).toFixed(2)}
                      </td>
                      {/* Carton Price */}
                      <td className="py-3 text-right font-mono font-bold text-purple-600 text-xs">
                        Rs. {prod.cartonPrice ?? prod.cottonPrice ?? (Number(prod.piecesPerBox || 1) * Number(prod.boxesPerCarton || prod.boxesPerCotton || 1) * Number(prod.piecePrice || 0)).toFixed(2)}
                      </td>
                      {/* GST */}
                      <td className="py-3 text-center hidden lg:table-cell">
                        <span className="text-[10px] font-bold text-slate-600">{prod.gstPercent ?? 5}%</span>
                      </td>
                      {/* HSN */}
                      <td className="py-3 text-center font-mono text-[10px] text-slate-500 hidden xl:table-cell">
                        {prod.hsnCode}
                      </td>
                      {/* Actions */}
                      <td className="py-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openViewModal(prod)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                            title="View Product Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(prod)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { setSelectedProduct(prod); setIsDeleteModalOpen(true); }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-sm text-slate-500">
                    No products found. Click "Add New SKU" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Add / Edit Product Modal ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="relative w-full sm:max-w-2xl lg:max-w-4xl rounded-t-3xl sm:rounded-2xl border border-sky-100 bg-white p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-sky-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedProduct ? 'Edit Product SKU' : 'Add New Product SKU'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* ─── Row 1: Product Name, Flavour, Pack Type ─── */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3">Product Information</p>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {/* Product Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">SKU / Product Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="e.g. Choco 24, Vanilla Jar"
                      className={`w-full rounded-xl border px-3.5 py-2 text-sm text-slate-800 focus:outline-none ${formErrors.name ? 'border-red-400 bg-red-50' : 'border-sky-200 bg-white focus:border-sky-500'}`}
                    />
                    {formErrors.name && <p className="text-[10px] text-red-500 mt-0.5">⚠ {formErrors.name}</p>}
                  </div>
                  {/* Flavour Field (Dropdown + Custom) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-600">Flavour *</label>
                      {!isCustomFlavour ? (
                        <button
                          type="button"
                          onClick={() => { setIsCustomFlavour(true); setNewFlavourInput(''); }}
                          className="text-[11px] font-bold text-sky-600 hover:text-sky-800 transition-colors"
                        >
                          + Custom
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsCustomFlavour(false)}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          ← Select List
                        </button>
                      )}
                    </div>
                    {!isCustomFlavour ? (
                      <select
                        value={formData.category}
                        onChange={(e) => {
                          if (e.target.value === '__add_new__') {
                            setIsCustomFlavour(true);
                            setNewFlavourInput('');
                          } else {
                            updateField('category', e.target.value);
                          }
                        }}
                        className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold text-slate-800 bg-white focus:outline-none ${formErrors.category ? 'border-red-400 bg-red-50' : 'border-sky-200 focus:border-sky-500'}`}
                      >
                        <option value="" disabled>Select Flavour</option>
                        {allFlavours.map((flv) => (
                          <option key={flv} value={flv}>{flv}</option>
                        ))}
                        <option value="__add_new__" className="text-sky-600 font-bold bg-sky-50">+ Add Custom Flavour...</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          autoFocus
                          value={newFlavourInput}
                          onChange={(e) => setNewFlavourInput(e.target.value)}
                          placeholder="e.g. Mango, Coffee"
                          className="w-full rounded-xl border border-sky-300 px-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveCustomFlavour();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleSaveCustomFlavour}
                          disabled={!newFlavourInput.trim()}
                          className="px-3 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 disabled:opacity-40 transition-colors shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    )}
                    {formErrors.category && <p className="text-[10px] text-red-500 mt-0.5">⚠ {formErrors.category}</p>}
                  </div>
                  {/* Pack Type Field (Dropdown + Custom) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-600">Pack Type *</label>
                      {!isCustomPackType ? (
                        <button
                          type="button"
                          onClick={() => { setIsCustomPackType(true); setNewPackTypeInput(''); }}
                          className="text-[11px] font-bold text-sky-600 hover:text-sky-800 transition-colors"
                        >
                          + Custom
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsCustomPackType(false)}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          ← Select List
                        </button>
                      )}
                    </div>
                    {!isCustomPackType ? (
                      <select
                        value={formData.packType}
                        onChange={(e) => {
                          if (e.target.value === '__add_new__') {
                            setIsCustomPackType(true);
                            setNewPackTypeInput('');
                          } else {
                            updateField('packType', e.target.value);
                          }
                        }}
                        className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold text-slate-800 bg-white focus:outline-none ${formErrors.packType ? 'border-red-400 bg-red-50' : 'border-sky-200 focus:border-sky-500'}`}
                      >
                        <option value="" disabled>Select Pack Type</option>
                        {allPackTypesList.map((pt) => (
                          <option key={pt} value={pt}>{pt}</option>
                        ))}
                        <option value="__add_new__" className="text-sky-600 font-bold bg-sky-50">+ Add Custom Pack Type...</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          autoFocus
                          value={newPackTypeInput}
                          onChange={(e) => setNewPackTypeInput(e.target.value)}
                          placeholder="e.g. 12-pack, Jumbo Jar"
                          className="w-full rounded-xl border border-sky-300 px-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveCustomPackType();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleSaveCustomPackType}
                          disabled={!newPackTypeInput.trim()}
                          className="px-3 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 disabled:opacity-40 transition-colors shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    )}
                    {formErrors.packType && <p className="text-[10px] text-red-500 mt-0.5">⚠ {formErrors.packType}</p>}
                  </div>
                </div>
              </div>

              {/* ─── Row 2: Piece Price, Pieces Per Box, Boxes Per Carton ─── */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3">Pricing & Box Configuration</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Piece Price (Rs.) *</label>
                    <input
                      type="number"
                      onWheel={(e) => e.target.blur()}
                      onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                      step="0.01" min="0"
                      value={formData.piecePrice}
                      onChange={(e) => updateField('piecePrice', e.target.value)}
                      placeholder="e.g. 4.00"
                      className={`w-full rounded-xl border px-3.5 py-2 text-sm font-mono font-bold text-slate-800 focus:outline-none ${formErrors.piecePrice ? 'border-red-400 bg-red-50' : 'border-sky-200 bg-white focus:border-sky-500'}`}
                    />
                    {formErrors.piecePrice && <p className="text-[10px] text-red-500 mt-0.5">⚠ {formErrors.piecePrice}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Pieces Per Box *</label>
                    <input
                      type="number" onWheel={(e) => e.target.blur()}
                      onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                      min="1" step="1"
                      value={formData.piecesPerBox}
                      onChange={(e) => updateField('piecesPerBox', e.target.value)}
                      placeholder="e.g. 24"
                      className={`w-full rounded-xl border px-3.5 py-2 text-sm font-mono font-bold text-slate-800 focus:outline-none ${formErrors.piecesPerBox ? 'border-red-400 bg-red-50' : 'border-sky-200 bg-white focus:border-sky-500'}`}
                    />
                    {formErrors.piecesPerBox && <p className="text-[10px] text-red-500 mt-0.5">⚠ {formErrors.piecesPerBox}</p>}
                    {formData.piecePrice > 0 && formData.piecesPerBox > 0 && (
                      <p className="text-[10px] text-teal-600 font-bold mt-1">
                        Box Price = Rs. {(Number(formData.piecePrice) * Number(formData.piecesPerBox)).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Boxes Per Carton *</label>
                    <input
                      type="number" onWheel={(e) => e.target.blur()}
                      onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                      min="1" step="1"
                      value={formData.boxesPerCarton}
                      onChange={(e) => updateField('boxesPerCarton', e.target.value)}
                      placeholder="e.g. 12"
                      className={`w-full rounded-xl border px-3.5 py-2 text-sm font-mono font-bold text-slate-800 focus:outline-none ${formErrors.boxesPerCarton ? 'border-red-400 bg-red-50' : 'border-sky-200 bg-white focus:border-sky-500'}`}
                    />
                    {formErrors.boxesPerCarton && <p className="text-[10px] text-red-500 mt-0.5">⚠ {formErrors.boxesPerCarton}</p>}
                    {formData.piecePrice > 0 && formData.piecesPerBox > 0 && formData.boxesPerCarton > 0 && (
                      <p className="text-[10px] text-purple-600 font-bold mt-1">
                        Carton Price = Rs. {(Number(formData.piecePrice) * Number(formData.piecesPerBox) * Number(formData.boxesPerCarton)).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── Available Stock (Cartons) ─── */}
              <div className="rounded-2xl border border-sky-150 bg-gradient-to-r from-sky-50/70 via-teal-50/40 to-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-sky-600" />
                    <span>Available Stock</span>
                  </p>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    Stock (Cartons)
                  </span>
                </div>
                {(() => {
                  const ctns = Number(stockCartonsInput) || 0;
                  const bpc = Number(formData.boxesPerCarton) || 1;
                  const ppb = Number(formData.piecesPerBox) || 1;
                  const price = Number(formData.piecePrice) || 0;
                  const totalPcs = ctns * bpc * ppb;
                  const totalVal = totalPcs * price;

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Stock (Cartons) *
                        </label>
                        <input
                          type="number"
                          onWheel={(e) => e.target.blur()}
                          onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                          min="0"
                          step="any"
                          value={stockCartonsInput}
                          onChange={(e) => onCartonsChange(e.target.value)}
                          placeholder="e.g. 10"
                          className="w-full rounded-xl border border-sky-300 bg-white px-3 py-2 text-sm font-mono font-black text-sky-950 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                      </div>
                      {/* Auto-Calculated Boxes Badge */}
                      <div className="bg-white/90 p-2.5 rounded-xl border border-sky-100 shadow-2xs">
                        <p className="text-[10px] uppercase font-bold text-sky-700">Auto-Calculated Boxes</p>
                        <p className="text-sm font-black font-mono text-sky-950 mt-0.5">
                          {(ctns * bpc).toLocaleString('en-IN')} <span className="text-xs font-bold text-slate-500">Boxes</span>
                        </p>
                      </div>
                      {/* Auto-Calculated Pieces Badge */}
                      <div className="bg-white/90 p-2.5 rounded-xl border border-teal-150 shadow-2xs">
                        <p className="text-[10px] uppercase font-bold text-teal-700">Total Available Pieces</p>
                        <p className="text-sm font-black font-mono text-teal-950 mt-0.5">
                          {totalPcs.toLocaleString('en-IN')} <span className="text-xs font-bold text-slate-500">Pieces</span>
                        </p>
                      </div>
                      {/* Total Stock Value Badge (Read-only dynamic display) */}
                      <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] uppercase font-black text-emerald-800">Total Stock Value</p>
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded">
                            Auto
                          </span>
                        </div>
                        <p className="text-sm font-black font-mono text-emerald-900 mt-0.5">
                          Rs. {totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        {totalPcs > 0 && price > 0 && (
                          <p className="text-[9px] font-semibold text-emerald-700 truncate mt-0.5">
                            {totalPcs.toLocaleString('en-IN')} pcs × Rs. {price.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* ─── Row 3: GST, HSN, Min Stock Alert (with unit), Discount ─── */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3">Tax, Alerts & Discount</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">GST % (default 5%)</label>
                    <input type="number" onWheel={(e) => e.target.blur()} onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()} step="0.5" min="0" max="28" value={formData.gstPercent} onChange={(e) => updateField('gstPercent', e.target.value)} className="w-full rounded-xl border border-sky-200 bg-white px-2.5 py-2 text-sm font-mono text-slate-800 focus:border-sky-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">HSN Code</label>
                    <input type="text" value={formData.hsnCode} onChange={(e) => updateField('hsnCode', e.target.value)} placeholder="18069010" className="w-full rounded-xl border border-sky-200 bg-white px-2.5 py-2 text-sm font-mono text-slate-800 focus:border-sky-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Min Stock Alert</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number" onWheel={(e) => e.target.blur()}
                        onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                        min="0" step="any"
                        value={minStockInputVal}
                        onChange={(e) => handleMinStockChange(e.target.value)}
                        className={`w-full rounded-xl border px-2.5 py-2 text-sm font-mono text-slate-800 focus:outline-none ${formErrors.minStockPieces ? 'border-red-400 bg-red-50' : 'border-sky-200 bg-white focus:border-sky-500'}`}
                      />
                      <select
                        value={minStockUnit}
                        onChange={(e) => handleMinStockUnitChange(e.target.value)}
                        className="rounded-xl border border-sky-200 bg-white px-1.5 py-2 text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none shrink-0"
                      >
                        <option value="cartons">Cartons</option>
                        <option value="boxes">Boxes</option>
                        <option value="pieces">Pieces</option>
                      </select>
                    </div>
                    {minStockInputVal !== '' && (
                      <p className="text-[10px] text-sky-700 font-bold mt-1">
                        {minStockUnit === 'cartons' && `= ${minStockInputVal} ${Number(minStockInputVal) === 1 ? 'Carton' : 'Cartons'}`}
                        {minStockUnit === 'boxes' && `= ${minStockInputVal} ${Number(minStockInputVal) === 1 ? 'Box' : 'Boxes'}`}
                        {minStockUnit === 'pieces' && `= ${minStockInputVal} Pieces`}
                      </p>
                    )}
                    {formErrors.minStockPieces && <p className="text-[10px] text-red-500 mt-0.5">⚠ {formErrors.minStockPieces}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Discount %</label>
                    <input
                      type="number" onWheel={(e) => e.target.blur()}
                      onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                      min="0" max="100" step="0.5"
                      value={formData.discountPercent}
                      onChange={(e) => updateField('discountPercent', e.target.value)}
                      className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm font-mono text-slate-800 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* ─── Row 5: Expiry Date, Manufacturing Date, Batch Number ─── */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3">Dates & Batch</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => updateField('expiryDate', e.target.value)}
                      className={`w-full rounded-xl border px-3.5 py-2 text-sm text-slate-800 focus:outline-none ${formErrors.expiryDate ? 'border-red-400 bg-red-50' : 'border-sky-200 bg-white focus:border-sky-500'}`}
                    />
                    {formErrors.expiryDate && <p className="text-[10px] text-red-500 mt-0.5">⚠ {formErrors.expiryDate}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Manufacturing Date</label>
                    <input
                      type="date"
                      value={formData.manufacturingDate}
                      onChange={(e) => updateField('manufacturingDate', e.target.value)}
                      className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Batch Number</label>
                    <input
                      type="text"
                      value={formData.batchNumber}
                      onChange={(e) => updateField('batchNumber', e.target.value)}
                      placeholder="e.g. BATCH001"
                      className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm font-mono text-slate-800 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* ─── Row 6: Supplier Name, Product Image ─── */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3">Supplier & Image</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Supplier Name</label>
                    <input
                      type="text"
                      value={formData.supplierName}
                      onChange={(e) => updateField('supplierName', e.target.value)}
                      placeholder="Supplier company name"
                      className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Product Image</label>
                    <div className="flex items-center gap-3">
                      {(formData.imageUrl || imageFile) && (
                        <img
                          src={imageFile ? URL.createObjectURL(imageFile) : formData.imageUrl}
                          alt="Preview"
                          className="h-10 w-10 rounded-lg object-cover border border-sky-200 shadow-sm"
                        />
                      )}
                      <div className="flex-1">
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files[0];
                            if (f) {
                              if (f.size > 5 * 1024 * 1024) {
                                toast.error('Image must be less than 5MB');
                                return;
                              }
                              setImageFile(f);
                              toast(`Image selected: ${f.name}`, { icon: '🖼️' });
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="flex items-center gap-2 rounded-xl border-2 border-dashed border-sky-200 bg-sky-50/50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100/60 transition-all"
                        >
                          <Image className="h-3.5 w-3.5" />
                          {imageFile ? `${imageFile.name.slice(0, 15)}...` : formData.imageUrl ? 'Change Image' : 'Upload Image'}
                        </button>
                        {formData.imageUrl && !imageFile && (
                          <button
                            type="button"
                            onClick={() => updateField('imageUrl', '')}
                            className="mt-1 text-[10px] text-rose-500 hover:underline"
                          >
                            Remove current image
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-sky-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || imageUploading}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2 text-sm font-bold text-white shadow-md shadow-sky-500/20 hover:brightness-105 disabled:opacity-50"
                >
                  {(saving || imageUploading) ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : null}
                  <span>{saving ? 'Saving...' : imageUploading ? 'Uploading Image...' : 'Save SKU'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border border-sky-100 bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Deactivate SKU?</h3>
            <p className="mt-2 text-xs text-slate-500">
              Remove <span className="font-bold text-slate-800">{selectedProduct?.name}</span>?
              Existing invoices will keep their historical record.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 sm:flex-none rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={saving} className="flex-1 sm:flex-none rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-500 shadow-md shadow-rose-500/20 disabled:opacity-50">
                {saving ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── View Product Details Modal ─── */}
      {isViewModalOpen && viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="relative w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl border border-sky-100 bg-white p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-sky-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                {viewingProduct.imageUrl ? (
                  <img
                    src={viewingProduct.imageUrl}
                    alt={viewingProduct.name}
                    className="h-14 w-14 rounded-xl object-cover border border-sky-100 shadow-sm"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
                    <Package className="h-7 w-7" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    {viewingProduct.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="rounded-full bg-sky-100 text-sky-800 px-2.5 py-0.5 text-[10px] font-bold">
                      Flavour: {viewingProduct.category}
                    </span>
                    <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-[10px] font-bold">
                      {viewingProduct.packType}
                    </span>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">
                      Active SKU
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* ─── Section 1: Stock Overview ─── */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  Inventory & Stock Status
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Stock Cartons</p>
                    <p className="text-xl font-black font-mono text-purple-900 mt-0.5">
                      {viewingProduct.stockCartons ?? Math.floor((viewingProduct.stockPieces || 0) / ((viewingProduct.piecesPerBox || 1) * (viewingProduct.boxesPerCarton || 12)))}
                    </p>
                    <p className="text-[9px] text-purple-500 mt-0.5">
                      {(viewingProduct.boxesPerCarton || 12)} boxes / ctn
                    </p>
                  </div>
                  <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Stock Boxes</p>
                    <p className="text-xl font-black font-mono text-sky-900 mt-0.5">
                      {viewingProduct.stockBoxes ?? Math.floor((viewingProduct.stockPieces || 0) / (viewingProduct.piecesPerBox || 24))}
                    </p>
                    <p className="text-[9px] text-sky-500 mt-0.5">
                      {(viewingProduct.piecesPerBox || 24)} pcs / box
                    </p>
                  </div>
                  <div className="bg-teal-50/70 border border-teal-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Total Pieces</p>
                    <p className="text-xl font-black font-mono text-teal-900 mt-0.5">
                      {(viewingProduct.stockPieces || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[9px] text-teal-600 font-semibold mt-0.5">
                      Base atomic stock
                    </p>
                  </div>
                  <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Stock Value</p>
                    <p className="text-xl font-black font-mono text-emerald-900 mt-0.5">
                      Rs. {((viewingProduct.stockPieces || 0) * (viewingProduct.piecePrice || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] text-emerald-600 mt-0.5">
                      Piece value total
                    </p>
                  </div>
                </div>

                {/* Stock Equivalence Banner */}
                <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between text-xs font-mono">
                  <span className="text-slate-600 font-sans font-bold text-[11px]">Breakdown:</span>
                  <span className="text-slate-800 font-semibold">
                    <strong className="text-purple-700">{Math.floor((viewingProduct.stockPieces || 0) / ((viewingProduct.piecesPerBox || 1) * (viewingProduct.boxesPerCarton || 12)))} Cartons</strong>
                    {' '}+{' '}
                    <strong className="text-sky-700">{Math.floor(((viewingProduct.stockPieces || 0) % ((viewingProduct.piecesPerBox || 1) * (viewingProduct.boxesPerCarton || 12))) / (viewingProduct.piecesPerBox || 1))} loose Boxes</strong>
                    {' '}+{' '}
                    <strong className="text-teal-700">{(viewingProduct.stockPieces || 0) % (viewingProduct.piecesPerBox || 1)} loose Pieces</strong>
                  </span>
                </div>
              </div>

              {/* ─── Section 2: Pricing Structure ─── */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  Pricing & Tax Structure
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Piece Price</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-1">
                      Rs. {Number(viewingProduct.piecePrice || 0).toFixed(2)}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Per single piece</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-teal-600 uppercase">Box Price</p>
                    <p className="text-base font-black font-mono text-teal-700 mt-1">
                      Rs. {viewingProduct.boxPrice ?? (Number(viewingProduct.piecesPerBox || 1) * Number(viewingProduct.piecePrice || 0)).toFixed(2)}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{viewingProduct.piecesPerBox || 1} pcs / box</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-purple-600 uppercase">Carton Price</p>
                    <p className="text-base font-black font-mono text-purple-700 mt-1">
                      Rs. {viewingProduct.cartonPrice ?? (Number(viewingProduct.piecesPerBox || 1) * Number(viewingProduct.boxesPerCarton || 1) * Number(viewingProduct.piecePrice || 0)).toFixed(2)}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{viewingProduct.boxesPerCarton || 1} boxes / ctn</p>
                  </div>
                </div>
              </div>

              {/* ─── Section 3: Configuration & Tax Details ─── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                  <p className="text-[9px] font-bold uppercase text-slate-400">GST Rate</p>
                  <p className="text-xs font-black text-slate-800 mt-0.5">{viewingProduct.gstPercent ?? 5}%</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                  <p className="text-[9px] font-bold uppercase text-slate-400">HSN Code</p>
                  <p className="text-xs font-black font-mono text-slate-800 mt-0.5">{viewingProduct.hsnCode || '18069010'}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                  <p className="text-[9px] font-bold uppercase text-slate-400">Min Stock Alert</p>
                  <p className="text-xs font-black text-slate-800 mt-0.5">{viewingProduct.minStockPieces || 0} pcs</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                  <p className="text-[9px] font-bold uppercase text-slate-400">Discount</p>
                  <p className="text-xs font-black text-slate-800 mt-0.5">{viewingProduct.discountPercent || 0}%</p>
                </div>
              </div>

              {/* ─── Section 4: Batch, Supplier & Dates ─── */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Batch Number:</span>
                  <span className="font-mono font-bold text-slate-800">{viewingProduct.batchNumber || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Supplier:</span>
                  <span className="font-semibold text-slate-800">{viewingProduct.supplierName || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Manufacturing Date:</span>
                  <span className="font-mono text-slate-700">
                    {viewingProduct.manufacturingDate ? new Date(viewingProduct.manufacturingDate).toLocaleDateString('en-IN') : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Expiry Date:</span>
                  <span className="flex items-center gap-1.5 font-mono text-slate-700">
                    {viewingProduct.expiryDate ? new Date(viewingProduct.expiryDate).toLocaleDateString('en-IN') : '—'}
                    <ExpiryChip expiryDate={viewingProduct.expiryDate} />
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  const prod = viewingProduct;
                  setIsViewModalOpen(false);
                  openEditModal(prod);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-sky-50 border border-sky-200 px-4 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Product</span>
              </button>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock & Carton/Box Converter Modal */}
      {isCalcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full sm:max-w-xl rounded-2xl border border-sky-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-sky-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-md shadow-sky-500/20">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Carton & Box Converter</h3>
                  <p className="text-xs text-slate-500">Manual testing & stock calculations</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCalcModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Packaging Configuration */}
            <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-600 mb-2">Packaging Specs for Calculation</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pieces Per Box</label>
                  <input
                    type="number"
                    min="1"
                    value={calcPiecesPerBox}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCalcPiecesPerBox(v);
                      if (calcCartons) handleCalcCartonsChange(calcCartons);
                      else if (calcBoxes) handleCalcBoxesChange(calcBoxes);
                      else if (calcPieces) handleCalcPiecesChange(calcPieces);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-mono font-bold text-slate-800 focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Boxes Per Carton</label>
                  <input
                    type="number"
                    min="1"
                    value={calcBoxesPerCarton}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCalcBoxesPerCarton(v);
                      if (calcCartons) handleCalcCartonsChange(calcCartons);
                      else if (calcBoxes) handleCalcBoxesChange(calcBoxes);
                      else if (calcPieces) handleCalcPiecesChange(calcPieces);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-mono font-bold text-slate-800 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
              <p className="text-[11px] text-sky-700 font-semibold mt-2">
                1 Carton = {(Number(calcPiecesPerBox) || 1) * (Number(calcBoxesPerCarton) || 1)} pieces | 1 Box = {Number(calcPiecesPerBox) || 1} pieces
              </p>
            </div>

            {/* 3-Card Interactive Converter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gradient-to-br from-purple-50/50 via-sky-50/40 to-teal-50/50 rounded-2xl border border-sky-100 shadow-2xs mb-4">
              {/* Cartons */}
              <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-purple-900">Cartons</label>
                  <span className="text-[9px] font-black text-purple-600 uppercase bg-purple-50 px-1.5 py-0.5 rounded">Big Box</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={calcCartons}
                  onChange={(e) => handleCalcCartonsChange(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full rounded-lg border border-purple-200 px-3 py-1.5 text-sm font-mono font-bold text-purple-950 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-200"
                />
                <p className="text-[10px] text-purple-600 font-bold mt-1">
                  = {(Number(calcCartons) || 0) * (Number(calcPiecesPerBox) || 1) * (Number(calcBoxesPerCarton) || 1)} pcs
                </p>
              </div>

              {/* Boxes */}
              <div className="bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-sky-900">Boxes</label>
                  <span className="text-[9px] font-black text-sky-600 uppercase bg-sky-50 px-1.5 py-0.5 rounded">Box</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={calcBoxes}
                  onChange={(e) => handleCalcBoxesChange(e.target.value)}
                  placeholder="e.g. 120"
                  className="w-full rounded-lg border border-sky-200 px-3 py-1.5 text-sm font-mono font-bold text-sky-950 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-200"
                />
                <p className="text-[10px] text-sky-600 font-bold mt-1">
                  = {(Number(calcBoxes) || 0) * (Number(calcPiecesPerBox) || 1)} pcs
                </p>
              </div>

              {/* Pieces */}
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50/70 p-3 rounded-xl border border-teal-200 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-teal-950">Total Pieces</label>
                  <span className="text-[9px] font-black text-teal-700 uppercase bg-teal-100/90 px-2 py-0.5 rounded-md border border-teal-200">
                    Auto
                  </span>
                </div>
                <div className="my-auto py-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black font-mono text-teal-900 tracking-tight">
                      {(Number(calcPieces) || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-bold text-teal-700">Pieces</span>
                  </div>
                </div>
                <p className="text-[10px] text-teal-700 font-semibold">
                  Auto-calculated
                </p>
              </div>
            </div>

            {/* Quick Presets & Reset */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">Presets:</span>
                {[1, 5, 10, 25, 50].map((ctn) => (
                  <button
                    key={ctn}
                    type="button"
                    onClick={() => handleCalcCartonsChange(String(ctn))}
                    className="px-2 py-0.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-md font-bold text-xs transition-colors"
                  >
                    {ctn} Ctn
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setCalcCartons(''); setCalcBoxes(''); setCalcPieces(''); }}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 underline"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Strong Custom Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-rose-200 overflow-hidden transform transition-all">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 p-6 text-white text-center relative">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner mb-3">
                <AlertTriangle className="h-8 w-8 text-white stroke-[2.5]" />
              </div>
              <h3 className="text-xl font-black tracking-tight">Confirm Bulk Delete</h3>
              <p className="text-xs text-rose-100 font-medium mt-1">
                This action requires your confirmation
              </p>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white rounded-lg p-1 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-center">
                <p className="text-sm font-bold text-rose-950">
                  Are you sure you want to delete <span className="text-rose-600 font-black text-base">{selectedProductIds.length}</span> selected {selectedProductIds.length === 1 ? 'product' : 'products'}?
                </p>
                <p className="text-xs text-rose-700 mt-1">
                  These items will be deactivated and removed from active product catalog and inventory lists.
                </p>
              </div>

              {/* Preview of selected products */}
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Selected Products ({selectedProductIds.length}):
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {selectedProductIds.map((id) => {
                    const prod = products.find((p) => p._id === id);
                    return (
                      <div key={id} className="flex items-center justify-between text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200/60 shadow-2xs">
                        <span className="font-bold text-slate-800 truncate mr-2">{prod?.name || id}</span>
                        <span className="text-[10px] font-mono font-semibold text-slate-500 shrink-0">
                          {prod?.category || 'General'} • {prod?.packType || ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-xs text-amber-900">
                <span className="text-base">ℹ️</span>
                <span>Past generated invoices containing these products will retain historical data and will not be affected.</span>
              </div>
            </div>

            {/* Actions: Strong Yes / No buttons */}
            <div className="grid grid-cols-2 gap-3 p-5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={bulkDeleting}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-slate-300 bg-white font-bold text-sm text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-all shadow-xs disabled:opacity-50"
              >
                No, Keep Them
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 font-black text-sm text-white shadow-md shadow-rose-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {bulkDeleting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 stroke-[2.5]" />
                    <span>Yes, Delete ({selectedProductIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Preview Modal */}
      {isBulkImportPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Upload className="h-5 w-5 text-violet-500" />
                  Bulk Import Excel
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Download our pre-filled sample Excel or blank template, fill in your data, and upload.
                </p>
              </div>
              <button onClick={() => setIsBulkImportPreviewOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Excel Download Banner right inside this Modal */}
              <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-teal-50/50 to-emerald-50/60 p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white shadow-xs">
                        <FileSpreadsheet className="h-4 w-4" />
                      </span>
                      <h4 className="text-sm font-black text-slate-900">
                        Download Pre-Filled Sample Excel Sheet
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Contains the 16 SKU examples (Choco, Vanilla, Strawberry, Coffee) with sky-blue highlighted headers & alternating colored rows matching the exact columns below.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 px-3 py-2 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors"
                      title="Download Empty Template with correct column headers"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-500" />
                      <span>Blank Template</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSample}
                      className="flex items-center gap-1.5 text-xs font-black text-white bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2 rounded-xl hover:from-teal-500 hover:to-emerald-500 shadow-md shadow-teal-600/20 transition-all"
                      title="Download Sample Sheet with 16 SKUs and styled rows"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Download Sample (16 SKUs)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 16 Columns Order-wise Guide matching Single Product Add Form */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <span>Column Order (Matches Single Product "Add SKU" Form Exactly)</span>
                      <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        15 Columns Total
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Columns 1 to 6 are required. Stock in Cartons and remaining columns are optional.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { num: 1, name: 'Product Name', req: true },
                    { num: 2, name: 'Flavour', req: true },
                    { num: 3, name: 'Pack Type', req: true },
                    { num: 4, name: 'Piece Price (Rs.)', req: true },
                    { num: 5, name: 'Pieces Per Box', req: true },
                    { num: 6, name: 'Boxes Per Carton', req: true },
                    { num: 7, name: 'Stock (Cartons)', req: false },
                    { num: 8, name: 'Min Stock (Pieces)', req: false },
                    { num: 9, name: 'GST %', req: false },
                    { num: 10, name: 'HSN Code', req: false },
                    { num: 11, name: 'Discount %', req: false },
                    { num: 12, name: 'Expiry Date', req: false, hint: 'DD-MM-YYYY' },
                    { num: 13, name: 'Manufacturing Date', req: false, hint: 'DD-MM-YYYY' },
                    { num: 14, name: 'Batch Number', req: false },
                    { num: 15, name: 'Supplier Name', req: false },
                  ].map((col) => (
                    <div
                      key={col.num}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs transition-colors ${
                        col.req
                          ? 'border-rose-200 bg-rose-50/70 text-rose-950 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 font-medium'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black ${
                          col.req ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {col.num}
                      </span>
                      <div className="min-w-0 flex-1 truncate">
                        <div className="truncate text-[11px] leading-tight">{col.name}</div>
                        {col.hint ? (
                          <span className="text-[9px] font-mono text-slate-400">{col.hint}</span>
                        ) : col.req ? (
                          <span className="text-[9px] uppercase tracking-wide text-rose-600 font-black">Required</span>
                        ) : (
                          <span className="text-[9px] text-slate-400">Optional</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload & Preview File Section */}
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    {bulkImportFile ? (
                      <>Selected File: <span className="text-violet-600 font-mono font-bold">{bulkImportFile.name}</span> ({bulkImportPreviewData.length} data rows)</>
                    ) : (
                      'No Excel file selected yet. Click "Select Excel File" to upload.'
                    )}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  className="text-xs font-bold flex items-center gap-1.5 text-violet-700 bg-violet-100 hover:bg-violet-200 px-4 py-2 rounded-xl transition-colors shadow-2xs"
                >
                  <Upload className="h-4 w-4" />
                  {bulkImportFile ? 'Change Excel File' : 'Select Excel File'}
                </button>
              </div>

              {bulkImportFile && (
                <div className="rounded-xl border border-slate-200 overflow-x-auto max-h-64 shadow-2xs">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 sticky top-0">
                      <tr>
                        {bulkImportHeaders.map((header, idx) => (
                          <th key={idx} className="px-4 py-2.5 font-black text-slate-800">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bulkImportPreviewData.map((row, rowIdx) => (
                        <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          {bulkImportHeaders.map((_, colIdx) => (
                            <td key={colIdx} className="px-4 py-2 text-slate-700 font-mono">{row[colIdx] || ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-4 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsBulkImportPreviewOpen(false)}
                className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBulkImport}
                disabled={importing || !bulkImportFile}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2 text-sm font-bold text-white hover:bg-violet-500 shadow-md shadow-violet-500/20 disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <span>Confirm & Import</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;
