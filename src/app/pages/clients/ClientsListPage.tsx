import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { clientsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  Plus, 
  Search,
  Eye,
  Pencil,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Trash2
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface Client {
  _id: string;
  name: string;
  code: string;
  type: 'individual' | 'company';
  contact: {
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  isActive: boolean;
  outstandingBalance?: number;
  outstandingInvoices?: number;
  totalOutstanding?: number;
  overdueAmount?: number;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
}

export default function ClientsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  
  // Filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[ClientsListPage] Fetching clients with params:', { search, page });
      
      // Use getWithStats to get outstanding balances
      const response = await clientsApi.getWithStats({ 
        search: search || undefined,
        page,
        limit: 20
      });
      console.log('[ClientsListPage] Clients response:', response);
      
      if (response.success) {
        const clientData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as unknown[]);
        setClients(clientData as Client[]);
        
        // Cast response to access pagination properties
        const responseWithPagination = response as unknown as { 
          pages?: string; 
          currentPage?: string; 
          total?: string 
        };
        if (responseWithPagination.pages) {
          setPagination({
            currentPage: parseInt(responseWithPagination.currentPage || '1'),
            totalPages: parseInt(responseWithPagination.pages) || 1,
            total: parseInt(responseWithPagination.total || '0'),
            limit: 20
          });
        }
      }
    } catch (error) {
      console.error('[ClientsListPage] Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleToggleStatus = async (clientId: string) => {
    try {
      await clientsApi.toggleStatus(clientId);
      fetchClients();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const handleStatement = (clientId: string) => {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || 'https://stock-tenancy-system.onrender.com/api';
    fetch(`${baseUrl}/clients/${clientId}/statement`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to download statement');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `client-statement-${clientId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(err => console.error('Statement download failed:', err));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await clientsApi.delete(deleteTarget.id);
      if (response.success) {
        setDeleteTarget(null);
        fetchClients();
      } else {
        alert(response.message || 'Failed to delete client');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to delete client');
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('clients.title', 'Clients')}</h1>
            <p className="text-muted-foreground dark:text-slate-400">{t('clients.description', 'Manage your clients')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/bulk-data')}>
              <FileText className="mr-2 h-4 w-4" />
              {t('clients.import', 'Import CSV')}
            </Button>
            <Button onClick={() => navigate('/clients/new')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('clients.addClient', 'Add Client')}
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-card dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-slate-400" />
              <Input 
                placeholder={t('clients.searchPlaceholder', 'Search by name or email...')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
              />
            </div>
            <Button type="submit" variant="secondary">
              {t('common.search', 'Search')}
            </Button>
          </form>
        </div>

        {/* Table */}
        <div className="bg-card dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground dark:text-slate-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="dark:bg-slate-700">
                  <TableHead className="dark:text-white">{t('clients.name', 'Name')}</TableHead>
                  <TableHead className="dark:text-white">{t('clients.email', 'Email')}</TableHead>
                  <TableHead className="dark:text-white">{t('clients.phone', 'Phone')}</TableHead>
                  <TableHead className="dark:text-white">{t('clients.outstandingBalance', 'Outstanding Balance')}</TableHead>
                  <TableHead className="dark:text-white">{t('clients.overdueAmount', 'Overdue Amount')}</TableHead>
                  <TableHead className="dark:text-white">{t('clients.status', 'Status')}</TableHead>
                  <TableHead className="text-right dark:text-white">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground dark:text-slate-400">
                      {t('clients.noClients', 'No clients found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <TableRow key={client._id} className="dark:hover:bg-slate-700/50">
                      <TableCell className="font-medium dark:text-slate-200">
                        <div>{client.name}</div>
                        <div className="text-xs text-muted-foreground dark:text-slate-400">{client.code}</div>
                      </TableCell>
                      <TableCell className="dark:text-slate-300">{client.contact?.email || '-'}</TableCell>
                      <TableCell className="dark:text-slate-300">{client.contact?.phone || '-'}</TableCell>
                      <TableCell className="font-medium dark:text-slate-200">
                        {formatCurrency(client.totalOutstanding || client.outstandingBalance)}
                      </TableCell>
                      <TableCell className="font-medium dark:text-slate-200">
                        {formatCurrency(client.overdueAmount || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.isActive ? 'default' : 'secondary'}>
                          {client.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/clients/${client._id}`)}
                            title={t('common.view', 'View')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/clients/${client._id}/edit`)}
                            title={t('common.edit', 'Edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleStatement(client._id)}
                            title={t('clients.statement', 'Statement')}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleToggleStatus(client._id)}
                            title={client.isActive ? t('common.deactivate', 'Deactivate') : t('common.activate', 'Activate')}
                          >
                            {client.isActive ? <UserX className="h-4 w-4 text-destructive" /> : <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setDeleteTarget({ id: client._id, name: client.name })}
                            title={t('common.delete', 'Delete')}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-2">
              <button
                className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${pagination.currentPage === 1 ? 'pointer-events-none opacity-50' : ''}`}
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={pagination.currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${pagination.currentPage === i + 1 ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${pagination.currentPage === pagination.totalPages ? 'pointer-events-none opacity-50' : ''}`}
                onClick={() => setPage(page + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">{t('common.confirmDelete', 'Confirm Delete')}</h3>
              <p className="text-muted-foreground dark:text-slate-400 mb-4">
                {t('clients.deleteConfirm', 'Are you sure you want to delete')} <strong className="text-slate-900 dark:text-white">{deleteTarget.name}</strong>? {t('common.cannotUndo', 'This action cannot be undone.')}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  {t('common.delete', 'Delete')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}