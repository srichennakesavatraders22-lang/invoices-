import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
    },
    businessName: {
      type: String,
      required: [true, 'Business/Store name is required'],
      trim: true,
    },
    billingAddress: {
      type: String,
      required: [true, 'Billing address is required'],
      trim: true,
    },
    shippingAddress: {
      type: String,
      required: [true, 'Shipping address is required'],
      trim: true,
    },
    sameAsBilling: {
      type: Boolean,
      default: true,
    },
    gstin: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    isInterState: {
      type: Boolean,
      default: false, // Default is Intra-state (Andhra Pradesh) -> CGST + SGST
    },
    state: {
      type: String,
      default: 'Andhra Pradesh',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

customerSchema.index({ name: 'text', businessName: 'text', mobile: 'text', gstin: 'text' });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
