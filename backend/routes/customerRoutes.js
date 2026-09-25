import express from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customerController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(getCustomers)
  .post(protect, createCustomer);

router.route('/:id')
  .get(getCustomerById)
  .put(protect, updateCustomer)
  .delete(protect, authorize('Admin'), deleteCustomer);

export default router;
