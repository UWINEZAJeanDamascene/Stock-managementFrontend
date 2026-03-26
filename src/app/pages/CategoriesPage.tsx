import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Pencil, 
  Trash2, 
  Folder, 
  FolderOpen,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Layout } from '@/app/layout/Layout';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerDescription,
  DrawerFooter,
  DrawerClose
} from '@/app/components/ui/drawer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { toast } from 'sonner';
import { categoriesApi } from '@/lib/api';
import { APP_ROUTES } from '@/config/routes';

// Type definitions
interface Category {
  _id: string;
  name: string;
  description?: string;
  parent?: string | null;
  children?: Category[];
  isActive?: boolean;
  defaultInventoryAccount?: string;
  defaultCogsAccount?: string;
  defaultRevenueAccount?: string;
}

interface CategoryFormData {
  name: string;
  description: string;
  parent: string;
}

export default function CategoriesPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    parent: ''
  });

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await categoriesApi.getAll();
      if (response.success) {
        setCategories(response.data as Category[] || []);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Toggle tree node expansion
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Open drawer for new category
  const handleAdd = (parentId?: string) => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      parent: parentId || ''
    });
    setDrawerOpen(true);
  };

  // Open drawer for editing
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      parent: category.parent || ''
    });
    setDrawerOpen(true);
  };

  // Submit form - create or update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error(t('pages.categories.categoryName') + ' is required');
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingCategory) {
        // Update existing category
        const response = await categoriesApi.update(editingCategory._id, {
          name: formData.name,
          description: formData.description,
          parent: formData.parent || null
        });
        
        if (response.success) {
          toast.success(t('pages.categories.categoryUpdated') || 'Category updated successfully');
          setDrawerOpen(false);
          fetchCategories();
        } else {
          toast.error(response.message || t('common.error'));
        }
      } else {
        // Create new category
        const response = await categoriesApi.create({
          name: formData.name,
          description: formData.description,
          parent: formData.parent || null
        });
        
        if (response.success) {
          toast.success(t('pages.categories.categoryCreated') || 'Category created successfully');
          setDrawerOpen(false);
          fetchCategories();
        } else {
          toast.error(response.message || t('common.error'));
        }
      }
    } catch (error: unknown) {
      console.error('Failed to save category:', error);
      const errorMessage = error instanceof Error ? error.message : t('common.error');
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Open delete confirmation
  const handleDeleteClick = (category: Category) => {
    setDeletingCategory(category);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;

    try {
      setDeleting(true);
      setDeleteError(null);
      
      const response = await categoriesApi.delete(deletingCategory._id);
      
      if (response.success) {
        toast.success(t('pages.categories.categoryDeleted') || 'Category deleted successfully');
        setDeleteDialogOpen(false);
        fetchCategories();
      } else {
        // Handle CATEGORY_IN_USE error
        if (response.message && response.message.includes('product')) {
          setDeleteError(response.message);
        } else {
          toast.error(response.message || t('common.error'));
        }
      }
    } catch (error: unknown) {
      console.error('Failed to delete category:', error);
      const errorMessage = error instanceof Error ? error.message : t('common.error');
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  // Render tree node recursively
  const renderTreeNode = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category._id);
    const paddingLeft = level * 24 + 12;

    return (
      <div key={category._id}>
        <div 
          className="flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded-md group"
          style={{ paddingLeft }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(category._id)}
                className="p-0.5 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}
            
            {isExpanded ? (
              <FolderOpen className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            ) : (
              <Folder className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            )}
            
            <span className="truncate font-medium">{category.name}</span>
            {category.description && (
              <span className="text-muted-foreground text-sm truncate hidden sm:inline">
                - {category.description}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleAdd(category._id)}
              title={t('pages.categories.addSubcategory')}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleEdit(category)}
              title={t('common.edit')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => handleDeleteClick(category)}
              title={t('common.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {category.children!.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Flatten tree for rendering (top level only)
  const renderCategories = () => {
    if (categories.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Folder className="h-12 w-12 mb-4 opacity-50" />
          <p>{t('pages.categories.noCategories')}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => handleAdd()}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('pages.categories.addCategory')}
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {categories.map(category => renderTreeNode(category))}
      </div>
    );
  };

  // Get available parent options (flattened)
  const getParentOptions = (): { value: string; label: string }[] => {
    const options: { value: string; label: string }[] = [];
    
    const flattenCategories = (cats: Category[], prefix: string = '') => {
      cats.forEach(cat => {
        // Don't allow selecting self or children as parent (to prevent cycles)
        if (editingCategory && (cat._id === editingCategory._id || isChildOf(cat, editingCategory._id))) {
          return;
        }
        options.push({ value: cat._id, label: prefix + cat.name });
        if (cat.children) {
          flattenCategories(cat.children, prefix + '  ');
        }
      });
    };
    
    flattenCategories(categories);
    return options;
  };

  // Check if a category is a child of another
  const isChildOf = (category: Category, parentId: string): boolean => {
    if (category.children) {
      for (const child of category.children) {
        if (child._id === parentId || isChildOf(child, parentId)) {
          return true;
        }
      }
    }
    return false;
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('pages.categories.title')}</h1>
          <p className="text-muted-foreground">{t('pages.categories.subtitle')}</p>
        </div>
        <Button onClick={() => handleAdd()}>
          <Plus className="h-4 w-4 mr-2" />
          {t('pages.categories.addCategory')}
        </Button>
      </div>

      {/* Categories Tree */}
      <Card>
        <CardHeader>
          <CardTitle>{t('common.categories')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            renderCategories()
          )}
        </CardContent>
      </Card>

      {/* Sidebar Drawer for Create/Edit */}
      <Drawer 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen}
        direction="right"
      >
        <DrawerContent className="max-w-md w-full">
          <DrawerHeader>
            <DrawerTitle>
              {editingCategory 
                ? t('pages.categories.editCategory') 
                : t('pages.categories.addCategory')}
            </DrawerTitle>
            <DrawerDescription>
              {editingCategory 
                ? t('pages.categories.editCategoryDesc') || 'Edit the category details below.'
                : t('pages.categories.addCategoryDesc') || 'Fill in the details below to create a new category.'}
            </DrawerDescription>
          </DrawerHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="px-4 py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('pages.categories.categoryName')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('pages.categories.categoryNamePlaceholder') || 'Enter category name'}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">{t('common.description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('pages.categories.descriptionPlaceholder') || 'Enter description (optional)'}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="parent">{t('pages.categories.parentCategory')}</Label>
                <select
                  id="parent"
                  value={formData.parent}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{t('pages.categories.noParent') || 'No parent (top level)'}</option>
                  {getParentOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <DrawerFooter>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCategory ? t('common.update') : t('common.create')}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">{t('common.cancel')}</Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pages.categories.deleteCategory')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError ? (
                <div className="flex items-center gap-2 text-destructive mt-2">
                  <AlertCircle className="h-4 w-4" />
                  {deleteError}
                </div>
              ) : (
                <>
                  {t('pages.categories.deleteConfirmMessage') || `Are you sure you want to delete "${deletingCategory?.name}"?`}
                  {t('pages.categories.deleteWarning') || ' This action cannot be undone.'}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </Layout>
  );
}