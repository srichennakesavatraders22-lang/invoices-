import express from 'express';
import { 
  getExpenses, 
  createExpense, 
  updateExpense,
  deleteExpense, 
  getTodayExpenses,
  getExpenseCategories,
  createExpenseCategory,
  deleteExpenseCategory
} from '../controllers/expenseController.js';

const router = express.Router();

router.get('/categories', getExpenseCategories);
router.post('/categories', createExpenseCategory);
router.delete('/categories/:id', deleteExpenseCategory);

router.get('/', getExpenses);
router.post('/', createExpense);
router.get('/today', getTodayExpenses);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;
