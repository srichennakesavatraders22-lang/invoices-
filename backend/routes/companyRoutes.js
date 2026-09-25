import express from 'express';
import {
  getCompanyProfile,
  updateCompanyProfile,
  uploadCompanyImage,
} from '../controllers/companyController.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.get('/company', getCompanyProfile);
router.put('/company', protect, authorize('Admin'), updateCompanyProfile);
router.post(
  '/company/upload-image',
  protect,
  authorize('Admin'),
  upload.single('image'),
  uploadCompanyImage
);

export default router;
