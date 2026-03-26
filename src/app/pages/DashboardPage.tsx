import { Layout } from '../layout/Layout';
import { 
  Package, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export default function DashboardPage() {
  // Mock data for dashboard
  const stats = [
    { 
      title: 'Total Products', 
      value: '1,234', 
      change: '+12%', 
      trend: 'up',
      icon: Package 
    },
    { 
      title: 'Active Users', 
      value: '89', 
      change: '+5%', 
      trend: 'up',
      icon: Users 
    },
    { 
      title: 'Pending Orders', 
      value: '23', 
      change: '-8%', 
      trend: 'down',
      icon: ShoppingCart 
    },
    { 
      title: 'Revenue', 
      value: '$45,678', 
      change: '+18%', 
      trend: 'up',
      icon: DollarSign 
    },
  ];

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Welcome back! Here's what's happening with your inventory.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const isUp = stat.trend === 'up';
            return (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {isUp ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    {stat.change}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-500 dark:text-slate-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-900 dark:text-white">Add Product</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Add new inventory item</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-900 dark:text-white">Manage Users</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">View and edit users</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-900 dark:text-white">View Reports</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Analytics and insights</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}