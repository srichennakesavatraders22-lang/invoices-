import mongoose from 'mongoose';

const expenseCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  isSystem: {
    type: Boolean,
    default: false, // System categories cannot be deleted
  }
}, { timestamps: true });

export default mongoose.model('ExpenseCategory', expenseCategorySchema);
