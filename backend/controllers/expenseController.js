import Expense from '../models/Expense.js';
import ExpenseCategory from '../models/ExpenseCategory.js';

// Get all expenses with pagination and filtering
export const getExpenses = async (req, res, next) => {
  try {
    const { category, startDate, endDate, search, page = 1, limit = 15 } = req.query;
    
    let query = {};
    if (category) query.category = category;
    
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const skip = (page - 1) * limit;

    const expenses = await Expense.find(query)
      .sort({ date: -1, time: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Expense.countDocuments(query);

    res.json({
      success: true,
      data: expenses,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create a new expense
export const createExpense = async (req, res, next) => {
  try {
    const expense = await Expense.create(req.body);
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

// Update an expense
export const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

// Delete an expense
export const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get today's total expenses
export const getTodayExpenses = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const expenses = await Expense.find({ date: today });
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    res.json({
      success: true,
      data: {
        totalAmount,
        expenses
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── CATEGORIES ────────────────────────────────────────────────────────────────

// Get all categories (seed defaults if empty)
export const getExpenseCategories = async (req, res, next) => {
  try {
    let categories = await ExpenseCategory.find().sort({ name: 1 });
    
    if (categories.length === 0) {
      const defaultCategories = [
        { name: 'Transport', isSystem: true },
        { name: 'Meals', isSystem: true },
        { name: 'Office Supplies', isSystem: true },
        { name: 'Maintenance', isSystem: true },
        { name: 'Salary', isSystem: true },
        { name: 'Utility', isSystem: true },
        { name: 'Other', isSystem: true },
      ];
      categories = await ExpenseCategory.insertMany(defaultCategories);
    }

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

// Create a new category
export const createExpenseCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });

    const exists = await ExpenseCategory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (exists) return res.status(400).json({ success: false, message: 'Category already exists' });

    const category = await ExpenseCategory.create({ name, isSystem: false });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// Delete a category
export const deleteExpenseCategory = async (req, res, next) => {
  try {
    const category = await ExpenseCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    
    if (category.isSystem) {
      return res.status(400).json({ success: false, message: 'Cannot delete system categories' });
    }

    await ExpenseCategory.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};
