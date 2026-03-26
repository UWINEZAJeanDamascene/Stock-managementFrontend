import { useState, useEffect } from 'react';
import { Layout } from '../layout/Layout';
import { notificationsApi, Notification } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Bell, 
  Package, 
  FileText, 
  AlertTriangle, 
  Clock, 
  Check, 
  Trash2, 
  CheckCheck,
  RefreshCw,
  AlertCircle,
  AlertOctagon
} from 'lucide-react';
import { cn } from '../components/ui/utils';

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  out_of_stock: { icon: AlertOctagon, color: 'text-red-500', label: 'Out of Stock' },
  low_stock: { icon: AlertTriangle, color: 'text-amber-500', label: 'Low Stock' },
  stock_received: { icon: Package, color: 'text-green-500', label: 'Stock Received' },
  invoice_created: { icon: FileText, color: 'text-blue-500', label: 'Invoice Created' },
  payment_received: { icon: FileText, color: 'text-green-500', label: 'Payment Received' },
  payment_overdue: { icon: AlertTriangle, color: 'text-red-500', label: 'Payment Overdue' },
  invoice_sent: { icon: FileText, color: 'text-purple-500', label: 'Invoice Sent' },
  quotation_created: { icon: FileText, color: 'text-blue-500', label: 'Quotation Created' },
  quotation_approved: { icon: Check, color: 'text-green-500', label: 'Quotation Approved' },
  quotation_expired: { icon: Clock, color: 'text-amber-500', label: 'Quotation Expired' },
  user_created: { icon: Bell, color: 'text-blue-500', label: 'User Created' },
  company_approved: { icon: Check, color: 'text-green-500', label: 'Company Approved' },
  password_changed: { icon: Bell, color: 'text-green-500', label: 'Password Changed' },
  failed_login: { icon: AlertTriangle, color: 'text-red-500', label: 'Failed Login' },
  backup_success: { icon: Check, color: 'text-green-500', label: 'Backup Success' },
  backup_failed: { icon: AlertOctagon, color: 'text-red-500', label: 'Backup Failed' },
  invoice_generated: { icon: RefreshCw, color: 'text-blue-500', label: 'Invoice Generated' },
  recurring_paused: { icon: AlertTriangle, color: 'text-amber-500', label: 'Recurring Paused' },
  system: { icon: Bell, color: 'text-gray-500', label: 'System' },
  alert: { icon: AlertCircle, color: 'text-red-500', label: 'Alert' }
};

const severityColors: Record<string, string> = {
  info: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300',
  critical: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    critical: 0,
    warning: 0
  });

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationsApi.getAll({ 
        page: 1, 
        limit: 100,
        unreadOnly: filter === 'unread'
      });
      
      if (response.success) {
        setNotifications(response.data);
        
        // Calculate stats
        const unreadCount = response.data.filter((n: Notification) => !n.isRead).length;
        const criticalCount = response.data.filter((n: Notification) => n.severity === 'critical').length;
        const warningCount = response.data.filter((n: Notification) => n.severity === 'warning').length;
        
        setStats({
          total: response.pagination?.total || response.data.length,
          unread: unreadCount,
          critical: criticalCount,
          warning: warningCount
        });
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setStats(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1)
      }));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setStats(prev => ({ ...prev, unread: 0 }));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsApi.delete(id);
      const notification = notifications.find(n => n._id === id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (notification && !notification.isRead) {
        setStats(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1)
        }));
      }
      setStats(prev => ({ ...prev, total: prev.total - 1 }));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <Layout>
      <div className="p-3 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground">View and manage your system notifications</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchNotifications} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            {stats.unread > 0 && (
              <Button variant="outline" onClick={handleMarkAllAsRead}>
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <Bell className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Unread</CardDescription>
              <CardTitle className="text-3xl text-blue-500">{stats.unread}</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertCircle className="w-4 h-4 text-blue-500" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Critical</CardDescription>
              <CardTitle className="text-3xl text-red-500">{stats.critical}</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertOctagon className="w-4 h-4 text-red-500" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Warnings</CardDescription>
              <CardTitle className="text-3xl text-amber-500">{stats.warning}</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
          <TabsList>
            <TabsTrigger value="all">
              All Notifications
            </TabsTrigger>
            <TabsTrigger value="unread" className="relative">
              Unread
              {stats.unread > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {stats.unread}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notifications List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin" />
                <p className="mt-2">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto opacity-50" />
                <p className="mt-2">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => {
                  const config = typeConfig[notification.type] || { icon: Bell, color: 'text-gray-500', label: notification.type };
                  const Icon = config.icon;
                  
                  return (
                    <div
                      key={notification._id}
                      className={cn(
                        "flex items-start gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                        !notification.isRead && "bg-blue-50/50 dark:bg-blue-900/20"
                      )}
                    >
                      <div className={cn("p-2 rounded-full bg-slate-100 dark:bg-slate-700", config.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn("font-medium", !notification.isRead && "text-foreground")}>
                            {notification.title}
                          </p>
                          {notification.severity && (
                            <Badge className={severityColors[notification.severity]} variant="secondary">
                              {notification.severity}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(notification.createdAt)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {config.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleMarkAsRead(notification._id)}
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(notification._id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
