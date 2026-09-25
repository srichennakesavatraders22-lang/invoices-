import Product from '../models/Product.js';

// @desc    Get all products with filters, search, and pagination
// @route   GET /api/products
// @access  Public / Protected
export const getProducts = async (req, res, next) => {
  try {
    const { search, category, packType, all, page = 1, limit = 20 } = req.query;

    const query = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { packType: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (packType) {
      query.packType = packType;
    }

    // If 'all' is requested (for invoice builder dropdowns), return all active products without pagination
    if (all === 'true') {
      const products = await Product.find(query).sort({ category: 1, name: 1 });
      return res.json({
        success: true,
        count: products.length,
        data: products,
      });
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ category: 1, name: 1 })
      .skip(skip)
      .limit(limitNum);

    // Get unique categories and pack types for filter UI
    const categories = await Product.distinct('category', { isActive: true });
    const packTypes = await Product.distinct('packType', { isActive: true });

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
      meta: {
        categories,
        packTypes,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public / Protected
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private
export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      category,
      packType,
      unit,
      mrp,
      cgstPercent,
      sgstPercent,
      igstPercent,
      hsnCode,
    } = req.body;

    if (!name || !category || !packType || mrp === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, packType, and MRP are required',
      });
    }

    const product = await Product.create({
      name,
      category,
      packType,
      unit: unit || 'Boxes',
      mrp: Number(mrp),
      cgstPercent: cgstPercent !== undefined ? Number(cgstPercent) : 2.5,
      sgstPercent: sgstPercent !== undefined ? Number(sgstPercent) : 2.5,
      igstPercent: igstPercent !== undefined ? Number(igstPercent) : 5.0,
      hsnCode: hsnCode || '18069010',
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const allowedFields = [
      'name',
      'category',
      'packType',
      'unit',
      'mrp',
      'cgstPercent',
      'sgstPercent',
      'igstPercent',
      'hsnCode',
      'isActive',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    const updated = await product.save();

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete (soft delete) product
// @route   DELETE /api/products/:id
// @access  Private
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    product.isActive = false;
    await product.save();

    res.json({
      success: true,
      message: 'Product removed successfully',
    });
  } catch (error) {
    next(error);
  }
};
