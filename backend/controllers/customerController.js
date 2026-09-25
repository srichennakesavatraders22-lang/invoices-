import Customer from '../models/Customer.js';

// @desc    Get all customers with search and pagination
// @route   GET /api/customers
// @access  Public / Protected
export const getCustomers = async (req, res, next) => {
  try {
    const { search, all, page = 1, limit = 20 } = req.query;

    const query = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } },
      ];
    }

    if (all === 'true') {
      const customers = await Customer.find(query).sort({ businessName: 1, name: 1 });
      return res.json({
        success: true,
        count: customers.length,
        data: customers,
      });
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ businessName: 1, name: 1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: customers,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer by ID
// @route   GET /api/customers/:id
// @access  Public / Protected
export const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer || !customer.isActive) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Private
export const createCustomer = async (req, res, next) => {
  try {
    const {
      name,
      businessName,
      billingAddress,
      shippingAddress,
      sameAsBilling,
      gstin,
      mobile,
      email,
      isInterState,
      state,
    } = req.body;

    if (!name || !businessName || !billingAddress || !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Name, business name, billing address, and mobile number are required',
      });
    }

    const effectiveShipping = sameAsBilling ? billingAddress : (shippingAddress || billingAddress);

    const customer = await Customer.create({
      name,
      businessName,
      billingAddress,
      shippingAddress: effectiveShipping,
      sameAsBilling: Boolean(sameAsBilling),
      gstin: gstin ? gstin.trim().toUpperCase() : '',
      mobile: mobile.trim(),
      email: email ? email.trim() : '',
      isInterState: Boolean(isInterState),
      state: state || 'Andhra Pradesh',
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
export const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const allowedFields = [
      'name',
      'businessName',
      'billingAddress',
      'shippingAddress',
      'sameAsBilling',
      'gstin',
      'mobile',
      'email',
      'isInterState',
      'state',
      'isActive',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        customer[field] = req.body[field];
      }
    });

    if (customer.sameAsBilling) {
      customer.shippingAddress = customer.billingAddress;
    }

    const updated = await customer.save();

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer (soft delete)
// @route   DELETE /api/customers/:id
// @access  Private
export const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    customer.isActive = false;
    await customer.save();

    res.json({
      success: true,
      message: 'Customer removed successfully',
    });
  } catch (error) {
    next(error);
  }
};
