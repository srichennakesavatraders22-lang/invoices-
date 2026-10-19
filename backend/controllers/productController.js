import Product from '../models/Product.js';
import cloudinary from '../config/cloudinary.js';
import xlsx from 'xlsx';
import ExcelJS from 'exceljs';

// ─── GET ALL PRODUCTS ──────────────────────────────────────────────────────────
export const getProducts = async (req, res, next) => {
  try {
    const { search, category, packType, all, lowStock, expiringSoon, page = 1, limit = 20 } = req.query;

    const query = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { packType: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) query.category = category;
    if (packType) query.packType = packType;

    // Low stock filter (in pieces)
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$stockPieces', '$minStockPieces'] };
    }

    // Expiring soon filter (within 30 days)
    if (expiringSoon === 'true') {
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      query.expiryDate = { $ne: null, $lte: in30Days };
    }

    if (all === 'true') {
      const products = await Product.find(query).sort({ category: 1, name: 1 });
      return res.json({ success: true, count: products.length, data: products });
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query).sort({ category: 1, name: 1 }).skip(skip).limit(limitNum);

    const categories = await Product.distinct('category', { isActive: true });
    const packTypes = await Product.distinct('packType', { isActive: true });

    const lowStockCount = await Product.countDocuments({
      isActive: true,
      $expr: { $lte: ['$stockPieces', '$minStockPieces'] },
    });

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringCount = await Product.countDocuments({
      isActive: true,
      expiryDate: { $ne: null, $lte: in30Days },
    });
    const expiredCount = await Product.countDocuments({
      isActive: true,
      expiryDate: { $ne: null, $lt: now },
    });

    // Total stock aggregation (pieces, boxes, cartons, and total value)
    const stockAgg = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalPieces: { $sum: '$stockPieces' },
          totalBoxes: {
            $sum: {
              $floor: {
                $divide: [
                  '$stockPieces',
                  { $cond: [{ $gt: ['$piecesPerBox', 0] }, '$piecesPerBox', 1] }
                ]
              }
            }
          },
          totalCartons: {
            $sum: {
              $floor: {
                $divide: [
                  '$stockPieces',
                  {
                    $multiply: [
                      { $cond: [{ $gt: ['$piecesPerBox', 0] }, '$piecesPerBox', 1] },
                      { $cond: [{ $gt: ['$boxesPerCarton', 0] }, '$boxesPerCarton', 1] }
                    ]
                  }
                ]
              }
            }
          },
          totalValue: { $sum: { $multiply: ['$stockPieces', '$piecePrice'] } },
        },
      },
    ]);
    const totalStockPieces = stockAgg[0]?.totalPieces || 0;
    const totalStockBoxes = stockAgg[0]?.totalBoxes || 0;
    const totalStockCartons = stockAgg[0]?.totalCartons || 0;
    const totalStockValue = stockAgg[0]?.totalValue || 0;

    res.json({
      success: true,
      data: products,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum), limit: limitNum },
      meta: {
        categories,
        packTypes,
        lowStockCount,
        expiringCount,
        expiredCount,
        totalStockPieces,
        totalStockBoxes,
        totalStockCartons,
        totalStock: totalStockBoxes, // for backward-compatibility
        totalStockValue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET SINGLE PRODUCT ────────────────────────────────────────────────────────
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// ─── CREATE PRODUCT ────────────────────────────────────────────────────────────
export const createProduct = async (req, res, next) => {
  try {
    const {
      name, category, packType,
      piecePrice, piecesPerBox, boxesPerCarton, boxesPerCotton,
      stockPieces, minStockPieces,
      gstPercent, hsnCode,
      expiryDate, batchNumber, manufacturingDate,
      imageUrl, supplierName, discountPercent,
    } = req.body;

    if (!name || !category || !packType || piecePrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, packType, and piecePrice are required',
      });
    }

    const bpc = boxesPerCarton !== undefined ? Number(boxesPerCarton) : (boxesPerCotton !== undefined ? Number(boxesPerCotton) : 12);

    const product = await Product.create({
      name: name.trim(),
      category: category.trim(),
      packType: packType.trim(),
      piecePrice:      Number(piecePrice),
      piecesPerBox:    piecesPerBox    !== undefined ? Number(piecesPerBox)    : 24,
      boxesPerCarton:  bpc,
      boxesPerCotton:  bpc,
      stockPieces:     stockPieces     !== undefined ? Number(stockPieces)     : 0,
      minStockPieces:  minStockPieces  !== undefined ? Number(minStockPieces)  : 10,
      gstPercent:      gstPercent      !== undefined ? Number(gstPercent)      : 5,
      hsnCode:         hsnCode || '18069010',
      expiryDate:      expiryDate || null,
      batchNumber:     batchNumber || '',
      manufacturingDate: manufacturingDate || null,
      imageUrl:        imageUrl || '',
      supplierName:    supplierName || '',
      discountPercent: discountPercent !== undefined ? Number(discountPercent) : 0,
    });

    res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE PRODUCT ────────────────────────────────────────────────────────────
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const allowedFields = [
      'name', 'category', 'packType',
      'piecePrice', 'piecesPerBox', 'boxesPerCarton', 'boxesPerCotton',
      'stockPieces', 'minStockPieces',
      'gstPercent', 'hsnCode',
      'expiryDate', 'batchNumber', 'manufacturingDate',
      'imageUrl', 'supplierName', 'discountPercent', 'isActive',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    if (req.body.boxesPerCarton !== undefined) {
      product.boxesPerCotton = req.body.boxesPerCarton;
    } else if (req.body.boxesPerCotton !== undefined) {
      product.boxesPerCarton = req.body.boxesPerCotton;
    }

    const updated = await product.save();
    res.json({ success: true, message: 'Product updated successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE STOCK ONLY (in pieces) ────────────────────────────────────────────
export const updateProductStock = async (req, res, next) => {
  try {
    const { stockPieces, action } = req.body; // action: 'set' | 'add' | 'subtract'
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (action === 'add') {
      product.stockPieces = Math.max(0, product.stockPieces + Number(stockPieces));
    } else if (action === 'subtract') {
      product.stockPieces = Math.max(0, product.stockPieces - Number(stockPieces));
    } else {
      product.stockPieces = Math.max(0, Number(stockPieces));
    }

    await product.save();
    res.json({
      success: true,
      message: 'Stock updated',
      data: {
        stockPieces: product.stockPieces,
        stockBoxes: product.stockBoxes,
        stockCartons: product.stockCartons,
        stockCottons: product.stockCartons,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── UPLOAD PRODUCT IMAGE ──────────────────────────────────────────────────────
export const uploadProductImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'product_images', transformation: [{ quality: 'auto', width: 400, height: 400, crop: 'limit' }] },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const productId = req.body.productId || req.params.id;
    if (productId) {
      await Product.findByIdAndUpdate(productId, { imageUrl: uploadResult.secure_url });
    }

    res.json({
      success: true,
      message: 'Product image uploaded successfully',
      data: { imageUrl: uploadResult.secure_url },
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE (SOFT) ─────────────────────────────────────────────────────────────
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    product.isActive = false;
    await product.save();
    res.json({ success: true, message: 'Product removed successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── BULK DELETE (SOFT) ────────────────────────────────────────────────────────
export const bulkDeleteProducts = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No product IDs selected for deletion' });
    }
    const result = await Product.updateMany(
      { _id: { $in: ids } },
      { $set: { isActive: false } }
    );
    res.json({
      success: true,
      message: `Successfully deleted ${result.modifiedCount} product${result.modifiedCount === 1 ? '' : 's'}`,
      data: { deletedCount: result.modifiedCount },
    });
  } catch (error) {
    next(error);
  }
};

// ─── EXPORT PRODUCTS TO EXCEL ──────────────────────────────────────────────────
export const exportProductsExcel = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ category: 1, name: 1 });

    const rows = products.map((p, i) => ({
      'S.No':               i + 1,
      'Product Name':       p.name,
      'Flavour':            p.category,
      'Pack Type':          p.packType,
      'Piece Price (Rs.)':  p.piecePrice,
      'Pieces Per Box':     p.piecesPerBox,
      'Boxes Per Carton':   p.boxesPerCarton ?? p.boxesPerCotton ?? 12,
      'Box Price (Rs.)':    p.boxPrice,
      'Carton Price (Rs.)': p.cartonPrice,
      'GST %':              p.gstPercent,
      'HSN Code':           p.hsnCode,
      'Stock (Pieces)':     p.stockPieces,
      'Stock (Boxes)':      p.stockBoxes,
      'Stock (Cartons)':    p.stockCartons,
      'Min Stock (Pieces)': p.minStockPieces,
      'Expiry Date':        p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('en-IN') : '',
      'Batch Number':       p.batchNumber,
      'Supplier':           p.supplierName,
      'Discount %':         p.discountPercent,
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
      { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 },
      { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
      { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 10 },
    ];

    xlsx.utils.book_append_sheet(wb, ws, 'Products');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Products_Catalog.xlsx"');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// ─── BULK IMPORT PRODUCTS FROM EXCEL ──────────────────────────────────────────
export const bulkImportProducts = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel file' });
    }

    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Excel file is empty or invalid' });
    }

    const results = { created: 0, updated: 0, errors: [] };

    for (const row of rows) {
      try {
        const name      = String(row['Product Name'] || row['name'] || '').trim();
        const category  = String(row['Flavour'] || row['flavour'] || row['Category'] || row['category'] || '').trim();
        const packType  = String(row['Pack Type']     || row['packType'] || '').trim();
        const piecePrice = parseFloat(row['Piece Price (Rs.)'] || row['piecePrice'] || 4);

        if (!name || !category || !packType) {
          results.errors.push(`Row skipped: missing name/flavour/packType — "${name || 'unknown'}"`);
          continue;
        }

        const ppb = parseFloat(row['Pieces Per Box']    || row['piecesPerBox']   || 24);
        const bpc = parseFloat(row['Boxes Per Carton'] || row['Boxes Per Cotton'] || row['boxesPerCarton'] || row['boxesPerCotton'] || 12);

        // Calculate Stock Pieces automatically from Cartons & Boxes if provided
        const stockCartons = parseFloat(row['Stock (Cartons)'] || row['stockCartons'] || 0);
        const stockBoxes   = parseFloat(row['Stock (Boxes)']   || row['stockBoxes']   || 0);
        let stockPieces = 0;
        if (stockCartons > 0 || stockBoxes > 0) {
          stockPieces = (stockCartons * bpc * ppb) + (stockBoxes * ppb);
        } else {
          stockPieces = parseFloat(row['Stock (Pieces)'] || row['stockPieces'] || 0);
        }

        const parseCustomDate = (val) => {
          if (!val) return null;
          if (val instanceof Date && !isNaN(val)) return val;
          const str = String(val).trim();
          const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
          if (ddmmyyyy) {
            const d = new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`);
            if (!isNaN(d)) return d;
          }
          const parsed = new Date(str);
          return isNaN(parsed) ? null : parsed;
        };

        const productData = {
          name,
          category,
          packType,
          piecePrice,
          piecesPerBox:    ppb,
          boxesPerCarton:  bpc,
          stockPieces,
          minStockPieces:  parseFloat(row['Min Stock (Pieces)'] || row['minStockPieces'] || 10),
          gstPercent:      parseFloat(row['GST %']             || row['gstPercent']     || 5),
          hsnCode:         String(row['HSN Code']  || row['hsnCode']   || '18069010').trim(),
          discountPercent: parseFloat(row['Discount %'] || row['discountPercent'] || 0),
          batchNumber:     String(row['Batch Number'] || row['batchNumber'] || '').trim(),
          supplierName:    String(row['Supplier Name'] || row['Supplier'] || row['supplierName'] || '').trim(),
          isActive: true,
        };

        const expiryRaw = row['Expiry Date'] || row['expiryDate'];
        if (expiryRaw) {
          const expDate = parseCustomDate(expiryRaw);
          if (expDate) productData.expiryDate = expDate;
        }

        const mfgRaw = row['Manufacturing Date'] || row['manufacturingDate'];
        if (mfgRaw) {
          const mfgDate = parseCustomDate(mfgRaw);
          if (mfgDate) productData.manufacturingDate = mfgDate;
        }

        const existing = await Product.findOne({ name, category, packType });
        if (existing) {
          Object.assign(existing, productData);
          await existing.save();
          results.updated++;
        } else {
          await Product.create(productData);
          results.created++;
        }
      } catch (rowErr) {
        results.errors.push(`Error processing row: ${rowErr.message}`);
      }
    }

    res.json({
      success: true,
      message: `Import complete: ${results.created} created, ${results.updated} updated`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

// ─── DOWNLOAD IMPORT TEMPLATE ──────────────────────────────────────────────────
export const downloadImportTemplate = async (req, res, next) => {
  try {
    const sampleRows = [
      {
        'Product Name':       'Choco 24',
        'Flavour':            'Choco',
        'Pack Type':          '24-pack',
        'Piece Price (Rs.)':  4,
        'Pieces Per Box':     24,
        'Boxes Per Carton':   12,
        'Stock (Cartons)':    10,
        'Min Stock (Pieces)': 48,
        'GST %':              5,
        'HSN Code':           '18069010',
        'Discount %':         0,
        'Expiry Date':        '31-12-2026',
        'Manufacturing Date': '01-01-2026',
        'Batch Number':       'BATCH-CH24',
        'Supplier Name':      'Sri Chenna Kesava Traders',
      },
    ];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(sampleRows);
    ws['!cols'] = [
      { wch: 22 }, { wch: 15 }, { wch: 14 },
      { wch: 18 }, { wch: 16 }, { wch: 18 },
      { wch: 16 }, { wch: 18 },
      { wch: 10 }, { wch: 14 }, { wch: 13 },
      { wch: 15 }, { wch: 19 }, { wch: 16 }, { wch: 25 },
    ];
    xlsx.utils.book_append_sheet(wb, ws, 'Products Import Template');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Products_Import_Template.xlsx"');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// ─── DOWNLOAD SAMPLE FILLED PRODUCTS EXCEL (STYLED WITH EXCELJS) ───────────────
export const downloadSampleProducts = async (req, res, next) => {
  try {
    const sampleSKUs = [
      { name: 'Choco 24', flavour: 'Choco', packType: '24-pack', price: 4.00, ppb: 24, bpc: 12, cartons: 10, minStock: 48, gst: 5, hsn: '18069010', discount: 0, expiry: '31-12-2026', mfg: '01-01-2026', batch: 'BATCH-CH24', supplier: 'Sri Chenna Kesava Traders' },
      { name: 'Vanila 24', flavour: 'Vanila', packType: '24-pack', price: 4.00, ppb: 24, bpc: 12, cartons: 8, minStock: 48, gst: 5, hsn: '18069010', discount: 0, expiry: '31-12-2026', mfg: '01-01-2026', batch: 'BATCH-VN24', supplier: 'Sri Chenna Kesava Traders' },
      { name: 'Strawberry 24', flavour: 'Strawberry', packType: '24-pack', price: 4.00, ppb: 24, bpc: 12, cartons: 12, minStock: 48, gst: 5, hsn: '18069010', discount: 0, expiry: '31-12-2026', mfg: '01-01-2026', batch: 'BATCH-SB24', supplier: 'Sri Chenna Kesava Traders' },
      { name: 'Coffee 24', flavour: 'Coffee', packType: '24-pack', price: 4.50, ppb: 24, bpc: 12, cartons: 7, minStock: 48, gst: 5, hsn: '18069010', discount: 0, expiry: '31-12-2026', mfg: '01-01-2026', batch: 'BATCH-CF24', supplier: 'Sri Chenna Kesava Traders' },
      { name: 'Choco jar', flavour: 'Choco', packType: 'Jar', price: 3.00, ppb: 40, bpc: 10, cartons: 15, minStock: 40, gst: 5, hsn: '18069010', discount: 0, expiry: '30-11-2026', mfg: '01-02-2026', batch: 'BATCH-CHJR', supplier: 'Sri Chenna Kesava Traders' },
      { name: 'Vanila jar', flavour: 'Vanila', packType: 'Jar', price: 3.00, ppb: 40, bpc: 10, cartons: 14, minStock: 40, gst: 5, hsn: '18069010', discount: 0, expiry: '30-11-2026', mfg: '01-02-2026', batch: 'BATCH-VNJR', supplier: 'Sri Chenna Kesava Traders' },
      { name: 'Strawberry jar', flavour: 'Strawberry', packType: 'Jar', price: 3.00, ppb: 40, bpc: 10, cartons: 10, minStock: 40, gst: 5, hsn: '18069010', discount: 0, expiry: '30-11-2026', mfg: '01-02-2026', batch: 'BATCH-SBJR', supplier: 'Sri Chenna Kesava Traders' },
      { name: 'Coffee jar', flavour: 'Coffee', packType: 'Jar', price: 3.50, ppb: 40, bpc: 10, cartons: 12, minStock: 40, gst: 5, hsn: '18069010', discount: 0, expiry: '30-11-2026', mfg: '01-02-2026', batch: 'BATCH-CFJR', supplier: 'Sri Chenna Kesava Traders' },
      { name: 'Choco jumbo', flavour: 'Choco', packType: 'Jumbo', price: 6.00, ppb: 20, bpc: 10, cartons: 11, minStock: 20, gst: 5, hsn: '18069010', discount: 5, expiry: '31-10-2026', mfg: '01-01-2026', batch: 'BATCH-CHJM', supplier: 'Sri Chenna Kesava Traders' },
      { name: 'Vanila jumbo', flavour: 'Vanila', packType: 'Jumbo', price: 6.00, ppb: 20, bpc: 10, cartons: 9, minStock: 20, gst: 5, hsn: '18069010', discount: 5, expiry: '31-10-2026', mfg: '01-01-2026', batch: 'BATCH-VNJM', supplier: 'Sri Chenna Kesava Traders' },
      { name: 'Strawberry jumbo', flavour: 'Strawberry', packType: 'Jumbo', price: 6.00, ppb: 20, bpc: 10, cartons: 10, minStock: 20, gst: 5, hsn: '18069010', discount: 5, expiry: '31-10-2026', mfg: '01-01-2026', batch: 'BATCH-SBJM', supplier: 'Sri Chenna Kesava Traders' },
      { name: 'Coffee jumbo', flavour: 'Coffee', packType: 'Jumbo', price: 6.50, ppb: 20, bpc: 10, cartons: 8, minStock: 20, gst: 5, hsn: '18069010', discount: 5, expiry: '31-10-2026', mfg: '01-01-2026', batch: 'BATCH-CFJM', supplier: 'Sri Chenna Kesava Traders' },
      { name: 'Choco pilo', flavour: 'Choco', packType: 'Pilo', price: 2.50, ppb: 30, bpc: 12, cartons: 20, minStock: 30, gst: 5, hsn: '18069010', discount: 0, expiry: '31-12-2026', mfg: '01-01-2026', batch: 'BATCH-CHPL', supplier: 'Sri Chenna Kesava Traders' },
      { name: 'Vanila pilo', flavour: 'Vanila', packType: 'Pilo', price: 2.50, ppb: 30, bpc: 12, cartons: 18, minStock: 30, gst: 5, hsn: '18069010', discount: 0, expiry: '31-12-2026', mfg: '01-01-2026', batch: 'BATCH-VNPL', supplier: 'Sri Chenna Kesava Traders' },
      { name: 'Strawberry pilo', flavour: 'Strawberry', packType: 'Pilo', price: 2.50, ppb: 30, bpc: 12, cartons: 16, minStock: 30, gst: 5, hsn: '18069010', discount: 0, expiry: '31-12-2026', mfg: '01-01-2026', batch: 'BATCH-SBPL', supplier: 'Sri Chenna Kesava Traders' },
      { name: 'Coffee pilo', flavour: 'Coffee', packType: 'Pilo', price: 2.75, ppb: 30, bpc: 12, cartons: 14, minStock: 30, gst: 5, hsn: '18069010', discount: 0, expiry: '31-12-2026', mfg: '01-01-2026', batch: 'BATCH-CFPL', supplier: 'Sri Chenna Kesava Traders' },
    ];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sri Chenna Kesava Traders';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Sample Products', {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { header: 'Product Name', key: 'name', width: 22 },
      { header: 'Flavour', key: 'flavour', width: 16 },
      { header: 'Pack Type', key: 'packType', width: 14 },
      { header: 'Piece Price (Rs.)', key: 'price', width: 18 },
      { header: 'Pieces Per Box', key: 'ppb', width: 16 },
      { header: 'Boxes Per Carton', key: 'bpc', width: 18 },
      { header: 'Stock (Cartons)', key: 'cartons', width: 16 },
      { header: 'Min Stock (Pieces)', key: 'minStock', width: 18 },
      { header: 'GST %', key: 'gst', width: 10 },
      { header: 'HSN Code', key: 'hsn', width: 14 },
      { header: 'Discount %', key: 'discount', width: 13 },
      { header: 'Expiry Date', key: 'expiry', width: 15 },
      { header: 'Manufacturing Date', key: 'mfg', width: 20 },
      { header: 'Batch Number', key: 'batch', width: 16 },
      { header: 'Supplier Name', key: 'supplier', width: 26 },
    ];

    // Style Header Row (Sky Blue background, bold white text)
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0284C7' }, // Sky 600
      };
      cell.font = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0369A1' } },
        bottom: { style: 'medium', color: { argb: 'FF0369A1' } },
        left: { style: 'thin', color: { argb: 'FF0369A1' } },
        right: { style: 'thin', color: { argb: 'FF0369A1' } },
      };
    });

    // Add and Style Data Rows
    sampleSKUs.forEach((item, index) => {
      const row = worksheet.addRow({
        name: item.name,
        flavour: item.flavour,
        packType: item.packType,
        price: item.price,
        ppb: item.ppb,
        bpc: item.bpc,
        cartons: item.cartons,
        minStock: item.minStock,
        gst: item.gst,
        hsn: item.hsn,
        discount: item.discount,
        expiry: item.expiry,
        mfg: item.mfg,
        batch: item.batch,
        supplier: item.supplier,
      });

      row.height = 22;
      const isEven = index % 2 === 0;
      const rowBgColor = isEven ? 'FFF0F9FF' : 'FFFFFFFF'; // Light Sky vs Pure White

      row.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowBgColor },
        };
        cell.font = {
          name: 'Segoe UI',
          size: 10,
          color: { argb: 'FF1E293B' },
          bold: colNumber === 1,
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        // Alignments based on column type
        if (colNumber === 1 || colNumber === 15) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        } else if ([4, 5, 6, 7, 8].includes(colNumber)) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Sri_Chenna_Kesava_Products_Sample.xlsx"');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
