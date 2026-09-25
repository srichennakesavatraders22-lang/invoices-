import CompanyProfile from '../models/CompanyProfile.js';
import cloudinary from '../config/cloudinary.js';

// Helper to get or initialize default profile
const getOrCreateCompanyProfile = async () => {
  let profile = await CompanyProfile.findOne();
  if (!profile) {
    profile = await CompanyProfile.create({
      businessName: 'SRI CHENNA KESAVA TRADERS',
      tagline: 'Wholesale & Distribution – Confectionery / Chocolates & Snacks',
      address: 'Beside Apsara Theatre, Chinna Chauku, Andhra Pradesh – 516002',
      mobile: '+91 63613 97790',
      email: 'srichennakesavatraders22@gmail.com',
      gstin: '37XXXXX0000X1ZX',
      invoicePrefix: 'SCKT/2026-27/',
    });
  }
  return profile;
};

// @desc    Get company profile
// @route   GET /api/settings/company
// @access  Public or Protected
export const getCompanyProfile = async (req, res, next) => {
  try {
    const profile = await getOrCreateCompanyProfile();
    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update company profile
// @route   PUT /api/settings/company
// @access  Private (Admin)
export const updateCompanyProfile = async (req, res, next) => {
  try {
    let profile = await getOrCreateCompanyProfile();

    const allowedUpdates = [
      'businessName',
      'tagline',
      'address',
      'mobile',
      'email',
      'gstin',
      'logoUrl',
      'stampUrl',
      'bankDetails',
      'termsAndConditions',
      'invoicePrefix',
      'defaultCgstPercent',
      'defaultSgstPercent',
      'defaultIgstPercent',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        profile[field] = req.body[field];
      }
    });

    const updatedProfile = await profile.save();

    res.json({
      success: true,
      message: 'Company profile updated successfully',
      data: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload company logo or stamp to Cloudinary
// @route   POST /api/settings/company/upload-image
// @access  Private (Admin)
export const uploadCompanyImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    const { type } = req.body; // 'logo' or 'stamp'

    // Stream upload buffer to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'invoice_assets',
          transformation: [{ quality: 'auto' }],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const profile = await getOrCreateCompanyProfile();
    if (type === 'stamp') {
      profile.stampUrl = uploadResult.secure_url;
    } else {
      profile.logoUrl = uploadResult.secure_url;
    }
    await profile.save();

    res.json({
      success: true,
      message: `${type === 'stamp' ? 'Stamp' : 'Logo'} uploaded successfully`,
      data: {
        imageUrl: uploadResult.secure_url,
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};
