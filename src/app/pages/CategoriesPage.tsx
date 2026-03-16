import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { categoriesApi } from '@/lib/api';
import { Tags, Plus, Search, Edit, Trash2, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface Category {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function CategoriesPage() {
  const { hasPermission } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoriesApi.getAll();
      if (response.success) {
        setCategories(response.data as Category[]);
      }
    } catch (err) {
      console.error('Failed:', err);
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.areYouSure'))) return;
    try {
      await categoriesApi.delete(id);
      fetchCategories();
    } catch (err) {
      console.error('Failed:', err);
      setError('Failed to delete');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const categoryData = {
      name: formData.get('name'),
      description: formData.get('description'),
      isActive: formData.get('isActive') === 'on',
    };
    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory._id, categoryData);
      } else {
        await categoriesApi.create(categoryData);
      }
      setShowModal(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (err) {
      console.error('Failed:', err);
      setError('Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

const canEditCategories = hasPermission('categories:create') || hasPermission('categories:update') || hasPermission('categories:delete');

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">{t('categories.title')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">{t('categories.subtitle')}</p>
          </div>
          {hasPermission('categories:create') && (
            <button onClick={() => { setEditingCategory(null); setShowModal(true); }} className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg w-full sm:w-auto">
              <Plus className="h-4 w-4" /> {t('categories.addCategory')}
            </button>
          )}
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">{error}</div>}

        <div className="relative mb-4 md:mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder={t('products.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full max-w-sm pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white text-sm" />
        </div>

        {loading ? (
          <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-8 md:py-12 text-slate-500 dark:text-slate-400">{t('categories.noCategories')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filteredCategories.map((category) => (
              <div key={category._id} className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-indigo-100 dark:bg-indigo-900"><Tags className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /></div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white">{category.name}</h3>
                      <span className={`text-xs ${category.isActive ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                        {category.isActive ? t('common.active') : t('common.inactive')}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingCategory(category); setShowModal(true); }} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(category._id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                {category.description && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{category.description}</p>}
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{editingCategory ? t('categories.editCategory') : t('categories.addCategory')}</h2>
                <button onClick={() => { setShowModal(false); setEditingCategory(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Close"><X className="h-5 w-5 text-slate-600 dark:text-slate-300" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">{t('categories.categoryName')} *</label>
                  <input type="text" name="name" defaultValue={editingCategory?.name} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">{t('common.description')}</label>
                  <textarea name="description" defaultValue={editingCategory?.description} rows={3} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="isActive" id="isActive" defaultChecked={editingCategory?.isActive !== false} className="w-4 h-4 rounded border-slate-300 dark:border-slate-600" />
                  <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('common.active')}</label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setShowModal(false); setEditingCategory(null); }} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">{t('common.cancel')}</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    {submitting ? t('common.saving') : (editingCategory ? t('common.update') : t('common.create'))}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
