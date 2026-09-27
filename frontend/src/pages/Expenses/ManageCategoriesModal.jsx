import React, { useState } from 'react';
import { X, Plus, Trash2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { expensesAPI } from '../../api/apiClient';

export default function ManageCategoriesModal({ categories, onClose, onCategoryAdded, onCategoryDeleted }) {
  const [newCategory, setNewCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    
    setIsSubmitting(true);
    try {
      const res = await expensesAPI.createCategory({ name: newCategory.trim() });
      if (res.success) {
        toast.success('Category added');
        setNewCategory('');
        onCategoryAdded(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error adding category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await expensesAPI.deleteCategory(id);
      toast.success('Category deleted');
      onCategoryDeleted(id);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error deleting category');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-sky-100 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-sky-50 bg-gradient-to-r from-sky-50 to-white">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Tag className="h-5 w-5 text-purple-600 stroke-[3]" />
            Manage Categories
          </h3>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              required
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New Category Name..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm font-bold text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newCategory.trim()}
              className="flex items-center justify-center gap-1 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Add
                </>
              )}
            </button>
          </form>

          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase text-slate-500">Existing Categories</label>
            <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-1">
              {categories.map(cat => (
                <div key={cat._id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                    {cat.name}
                    {cat.isSystem && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-500 uppercase tracking-widest ml-2">System</span>
                    )}
                  </div>
                  {!cat.isSystem && (
                    <button
                      onClick={() => handleDelete(cat._id)}
                      disabled={deletingId === cat._id}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors disabled:opacity-50"
                      title="Delete Category"
                    >
                      {deletingId === cat._id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-xs text-slate-500 italic">No categories found.</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-6 py-2 text-xs font-bold bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-100 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
