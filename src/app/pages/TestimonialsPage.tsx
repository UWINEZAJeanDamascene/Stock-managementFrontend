import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../layout/Layout';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Star, 
  GripVertical,
  MessageSquare,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { testimonialsApi, Testimonial } from '@/lib/api';
import { toast } from 'sonner';

export default function TestimonialsPage() {
  const { t } = useTranslation();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    company: '',
    content: '',
    rating: 5,
    isActive: true,
    order: 0,
  });

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      const response = await testimonialsApi.getAll();
      setTestimonials(response.data || []);
    } catch (error) {
      console.error('Failed to fetch testimonials:', error);
      toast.error(t('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTestimonial) {
        await testimonialsApi.update(editingTestimonial._id, formData);
        toast.success(t('common.success'));
      } else {
        await testimonialsApi.create(formData);
        toast.success(t('common.success'));
      }
      setDialogOpen(false);
      resetForm();
      fetchTestimonials();
    } catch (error) {
      console.error('Failed to save testimonial:', error);
      toast.error(t('errors.saveFailed'));
    }
  };

  const handleEdit = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setFormData({
      name: testimonial.name,
      role: testimonial.role,
      company: testimonial.company,
      content: testimonial.content,
      rating: testimonial.rating,
      isActive: testimonial.isActive,
      order: testimonial.order,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try {
      await testimonialsApi.delete(id);
      toast.success(t('common.success'));
      fetchTestimonials();
    } catch (error) {
      console.error('Failed to delete testimonial:', error);
      toast.error(t('errors.deleteFailed'));
    }
  };

  const handleToggle = async (testimonial: Testimonial) => {
    try {
      await testimonialsApi.toggle(testimonial._id);
      toast.success(t('common.success'));
      fetchTestimonials();
    } catch (error) {
      console.error('Failed to toggle testimonial:', error);
      toast.error(t('errors.updateFailed'));
    }
  };

  const resetForm = () => {
    setEditingTestimonial(null);
    setFormData({
      name: '',
      role: '',
      company: '',
      content: '',
      rating: 5,
      isActive: true,
      order: 0,
    });
  };

  const openNewDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t('nav.testimonials') || 'Testimonials'}</h1>
            <p className="text-slate-500 dark:text-slate-400">
              {t('testimonials.description') || 'Manage customer testimonials for your landing page'}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog}>
                <Plus className="mr-2 h-4 w-4" />
                {t('common.add') || 'Add New'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white dark:bg-slate-800">
              <DialogHeader>
                <DialogTitle className="text-slate-800 dark:text-white">
                  {editingTestimonial 
                    ? (t('common.edit') || 'Edit Testimonial')
                    : (t('common.add') || 'Add Testimonial')}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">{t('testimonials.name') || 'Name'}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-slate-700 dark:text-slate-300">{t('testimonials.role') || 'Role'}</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g., Store Manager"
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-slate-700 dark:text-slate-300">{t('testimonials.company') || 'Company'}</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content" className="text-slate-700 dark:text-slate-300">{t('testimonials.content') || 'Testimonial Content'}</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={4}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rating" className="text-slate-700 dark:text-slate-300">{t('testimonials.rating') || 'Rating'}</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: star })}
                        className="p-1"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            star <= formData.rating 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order" className="text-slate-700 dark:text-slate-300">{t('testimonials.order') || 'Display Order'}</Label>
                  <Input
                    id="order"
                    type="number"
                    min="0"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingTestimonial ? (t('common.update') || 'Update') : (t('common.save') || 'Save')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
              <MessageSquare className="h-5 w-5" />
              {t('testimonials.manage') || 'Manage Testimonials'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">{t('common.loading') || 'Loading...'}</div>
            ) : testimonials.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                {t('testimonials.noTestimonials') || 'No testimonials yet. Add your first testimonial!'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 dark:border-slate-700">
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300">{t('testimonials.name') || 'Name'}</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300">{t('testimonials.company') || 'Company'}</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300">{t('testimonials.content') || 'Content'}</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300">{t('testimonials.rating') || 'Rating'}</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300">{t('testimonials.status') || 'Status'}</TableHead>
                    <TableHead className="text-right text-slate-700 dark:text-slate-300">{t('common.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testimonials.map((testimonial) => (
                    <TableRow key={testimonial._id} className="border-slate-200 dark:border-slate-700">
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-slate-400 dark:text-slate-500 cursor-grab" />
                      </TableCell>
                      <TableCell className="font-medium text-slate-800 dark:text-white">
                        <div>{testimonial.name}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{testimonial.role}</div>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-300">{testimonial.company}</TableCell>
                      <TableCell className="max-w-xs text-slate-600 dark:text-slate-300">
                        <div className="truncate">{testimonial.content}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < testimonial.rating 
                                  ? 'fill-yellow-400 text-yellow-400' 
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={testimonial.isActive ? 'default' : 'secondary'} className={testimonial.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}>
                          {testimonial.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggle(testimonial)}
                            title={testimonial.isActive ? 'Deactivate' : 'Activate'}
                            className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            {testimonial.isActive ? (
                              <ToggleRight className="h-4 w-4 text-green-500" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(testimonial)}
                            className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(testimonial._id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
