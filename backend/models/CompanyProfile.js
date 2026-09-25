import mongoose from 'mongoose';

const companyProfileSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
      default: 'SRI CHENNA KESAVA TRADERS',
    },
    tagline: {
      type: String,
      default: 'Wholesale & Distribution – Confectionery / Chocolates & Snacks',
    },
    address: {
      type: String,
      required: true,
      default: 'Beside Apsara Theatre, Chinna Chauku, Andhra Pradesh – 516002',
    },
    mobile: {
      type: String,
      required: true,
      default: '+91 63613 97790',
    },
    email: {
      type: String,
      default: 'srichennakesavatraders22@gmail.com',
    },
    gstin: {
      type: String,
      default: '37XXXXX0000X1ZX',
    },
    logoUrl: {
      type: String,
      default: '',
    },
    stampUrl: {
      type: String,
      default: '',
    },
    bankDetails: {
      accountName: { type: String, default: 'SRI CHENNA KESAVA TRADERS' },
      accountNumber: { type: String, default: '123456789012' },
      ifsc: { type: String, default: 'SBIN0001234' },
      bankName: { type: String, default: 'State Bank of India' },
      branch: { type: String, default: 'Kadapa Main Branch' },
    },
    termsAndConditions: {
      type: [String],
      default: [
        'Goods once sold will not be taken back or exchanged.',
        'Interest @ 24% p.a. will be charged if payment is not made within the due date.',
        'All disputes are subject to Kadapa jurisdiction only.',
        'Please check the goods at the time of delivery.',
        'This is a computer generated invoice and does not require a physical signature to be valid.',
      ],
    },
    invoicePrefix: {
      type: String,
      default: 'SCKT/2026-27/',
    },
    defaultCgstPercent: {
      type: Number,
      default: 2.5,
    },
    defaultSgstPercent: {
      type: Number,
      default: 2.5,
    },
    defaultIgstPercent: {
      type: Number,
      default: 5.0,
    },
  },
  { timestamps: true }
);

const CompanyProfile = mongoose.model('CompanyProfile', companyProfileSchema);
export default CompanyProfile;
