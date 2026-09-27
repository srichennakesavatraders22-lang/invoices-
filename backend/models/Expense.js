import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      default: 'Other',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: String,
      required: true,
      default: () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    },
    time: {
      type: String,
      required: true,
      default: () => new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }),
    },
    description: {
      type: String,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque'],
      default: 'Cash',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Expense', expenseSchema);
