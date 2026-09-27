import Product from '../models/Product.js';
import cloudinary from '../config/cloudinary.js';
import xlsx from 'xlsx';

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

    // Low stock filter
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$stock', '$minStock'] };
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

    // Stock summary
    const lowStockCount = await Product.countDocuments({
      isActive: true,
      $expr: { $lte: ['$stock', '$minStock'] },
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

    // Total stock across all active products
    const stockAgg = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalStock: { $sum: '$stock' }, totalValue: { $sum: { $multiply: ['$stock', '$mrp'] } } } },
    ]);
    const totalStock = stockAgg[0]?.totalStock || 0;
    const totalStockValue = stockAgg[0]?.totalValue || 0;

    res.json({
      success: true,
      data: products,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum), limit: limitNum },
      meta: { categories, packTypes, lowStockCount, expiringCount, expiredCount, totalStock, totalStockValue },
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
      name, category, packType, unit, mrp,
      cgstPercent, sgstPercent, igstPercent, hsnCode,
      stock, minStock, expiryDate, batchNumber, manufacturingDate,
      imageUrl, supplierName, discountPercent,
    } = req.body;

    if (!name || !category || !packType || mrp === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, packType, and MRP are required',
      });
    }

    const product = await Product.create({
      name: name.trim(),
      category: category.trim(),
      packType: packType.trim(),
      unit: unit || 'Boxes',
      mrp: Number(mrp),
      cgstPercent: cgstPercent !== undefined ? Number(cgstPercent) : 2.5,
      sgstPercent: sgstPercent !== undefined ? Number(sgstPercent) : 2.5,
      igstPercent: igstPercent !== undefined ? Number(igstPercent) : 5.0,
      hsnCode: hsnCode || '18069010',
      stock: stock !== undefined ? Number(stock) : 0,
      minStock: minStock !== undefined ? Number(minStock) : 10,
      expiryDate: expiryDate || null,
      batchNumber: batchNumber || '',
      manufacturingDate: manufacturingDate || null,
      imageUrl: imageUrl || '',
      supplierName: supplierName || '',
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
      'name', 'category', 'packType', 'unit', 'mrp',
      'cgstPercent', 'sgstPercent', 'igstPercent', 'hsnCode',
      'stock', 'minStock', 'expiryDate', 'batchNumber', 'manufacturingDate',
      'imageUrl', 'supplierName', 'discountPercent', 'isActive',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    const updated = await product.save();
    res.json({ success: true, message: 'Product updated successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE STOCK ONLY ─────────────────────────────────────────────────────────
export const updateProductStock = async (req, res, next) => {
  try {
    const { stock, action } = req.body; // action: 'set' | 'add' | 'subtract'
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (action === 'add') {
      product.stock = Math.max(0, product.stock + Number(stock));
    } else if (action === 'subtract') {
      product.stock = Math.max(0, product.stock - Number(stock));
    } else {
      product.stock = Math.max(0, Number(stock));
    }

    await product.save();
    res.json({ success: true, message: 'Stock updated', data: { stock: product.stock } });
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

    // Optionally update product directly if productId passed
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

// ─── EXPORT PRODUCTS TO EXCEL ──────────────────────────────────────────────────
export const exportProductsExcel = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ category: 1, name: 1 });

    const rows = products.map((p, i) => ({
      'S.No': i + 1,
      'Product Name': p.name,
      'Category': p.category,
      'Pack Type': p.packType,
      'Unit': p.unit,
      'MRP (Rs.)': p.mrp,
      'CGST %': p.cgstPercent,
      'SGST %': p.sgstPercent,
      'IGST %': p.igstPercent,
      'HSN Code': p.hsnCode,
      'Stock (Boxes)': p.stock,
      'Min Stock': p.minStock,
      'Expiry Date': p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('en-IN') : '',
      'Batch Number': p.batchNumber,
      'Supplier': p.supplierName,
      'Discount %': p.discountPercent,
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 6 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 10 },
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
        const name = String(row['Product Name'] || row['name'] || '').trim();
        const category = String(row['Category'] || row['category'] || '').trim();
        const packType = String(row['Pack Type'] || row['packType'] || '').trim();
        const mrp = parseFloat(row['MRP (Rs.)'] || row['mrp'] || 0);

        if (!name || !category || !packType || !mrp) {
          results.errors.push(`Row skipped: missing required fields (name, category, packType, mrp) - "${name || 'unknown'}"`);
          continue;
        }

        const productData = {
          name,
          category,
          packType,
          unit: String(row['Unit'] || row['unit'] || 'Boxes').trim(),
          mrp,
          cgstPercent: parseFloat(row['CGST %'] || row['cgstPercent'] || 2.5),
          sgstPercent: parseFloat(row['SGST %'] || row['sgstPercent'] || 2.5),
          igstPercent: parseFloat(row['IGST %'] || row['igstPercent'] || 5.0),
          hsnCode: String(row['HSN Code'] || row['hsnCode'] || '18069010').trim(),
          stock: parseFloat(row['Stock (Boxes)'] || row['stock'] || 0),
          minStock: parseFloat(row['Min Stock'] || row['minStock'] || 10),
          batchNumber: String(row['Batch Number'] || row['batchNumber'] || '').trim(),
          supplierName: String(row['Supplier'] || row['supplierName'] || '').trim(),
          discountPercent: parseFloat(row['Discount %'] || row['discountPercent'] || 0),
          isActive: true,
        };

        // Handle expiry date
        const expiryRaw = row['Expiry Date'] || row['expiryDate'];
        if (expiryRaw) {
          const expiryDate = new Date(expiryRaw);
          if (!isNaN(expiryDate)) productData.expiryDate = expiryDate;
        }

        // Upsert: update if name+category+packType match, else create
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
        'Product Name': 'Choco 24',
        'Category': 'Choco',
        'Pack Type': '24-pack',
        'Unit': 'Boxes',
        'MRP (Rs.)': 480,
        'CGST %': 2.5,
        'SGST %': 2.5,
        'IGST %': 5,
        'HSN Code': '18069010',
        'Stock (Boxes)': 100,
        'Min Stock': 10,
        'Expiry Date': '31-12-2026',
        'Batch Number': 'BATCH001',
        'Supplier': 'Supplier Name',
        'Discount %': 0,
      },
    ];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(sampleRows);
    ws['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 10 },
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
