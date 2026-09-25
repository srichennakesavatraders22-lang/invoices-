import express from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus,
  streamInvoicePDF,
} from '../controllers/invoiceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(getInvoices)
  .post(protect, createInvoice);

router.route('/:id')
  .get(getInvoiceById)
  .put(protect, updateInvoice)
  .delete(protect, authorize('Admin'), deleteInvoice);

router.get('/:id/pdf', streamInvoicePDF);
router.patch('/:id/status', protect, updateInvoiceStatus);

export default router;
