import express from 'express';
import multer from 'multer';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  uploadProductImage,
  exportProductsExcel,
  bulkImportProducts,
  downloadImportTemplate,
} from '../controllers/productController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

router.route('/')
  .get(getProducts)
  .post(protect, createProduct);

router.get('/export/excel', exportProductsExcel);
router.get('/import/template', downloadImportTemplate);
router.post('/import/excel', protect, upload.single('file'), bulkImportProducts);

router.route('/:id')
  .get(getProductById)
  .put(protect, updateProduct)
  .delete(protect, authorize('Admin'), deleteProduct);

router.patch('/:id/stock', protect, updateProductStock);
router.post('/:id/upload-image', protect, upload.single('image'), uploadProductImage);

export default router;
