import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { companyApi } from '@/lib/api';

interface PendingCompany {
  _id: string;
  name: string;
  email: string;
  phone: string;
  tin: string;
  createdAt: string;
}

export default function PlatformAdminPage() {
  const [pendingCompanies, setPendingCompanies] = useState<PendingCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingCompanies();
  }, []);

  const fetchPendingCompanies = async () => {
    try {
      setLoading(true);
      const response = await companyApi.getPendingCompanies();
      if (response.success) {
        setPendingCompanies(response.data as PendingCompany[]);
      }
    } catch (err) {
      console.error('Failed to fetch pending companies:', err);
      setError('Failed to load pending companies');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (companyId: string) => {
    try {
      setError(null);
      setSuccess(null);
      await companyApi.approveCompany(companyId);
      setSuccess('Company approved successfully!');
      // Remove from list
      setPendingCompanies(pendingCompanies.filter(c => c._id !== companyId));
    } catch (err) {
      console.error('Failed to approve company:', err);
      setError('Failed to approve company');
    }
  };

  const handleReject = async (companyId: string) => {
    const reason = prompt('Please enter a reason for rejection:');
    if (reason === null) return; // User cancelled
    
    try {
      setError(null);
      setSuccess(null);
      await companyApi.rejectCompany(companyId, reason || 'No reason provided');
      setSuccess('Company rejected!');
      // Remove from list
      setPendingCompanies(pendingCompanies.filter(c => c._id !== companyId));
    } catch (err) {
      console.error('Failed to reject company:', err);
      setError('Failed to reject company');
    }
  };

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Platform Admin Dashboard</h1>
          <p className="text-sm md:text-base text-slate-500">Manage company registrations</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : pendingCompanies.length === 0 ? (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <p className="text-slate-500 text-center">No pending company registrations</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Company Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">TIN</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Registered</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pendingCompanies.map((company) => (
                    <tr key={company._id} className="hover:bg-slate-50">
                      <td className="px-4 py-4 font-medium text-slate-800">{company.name}</td>
                      <td className="px-4 py-4 text-slate-600">{company.email}</td>
                      <td className="px-4 py-4 text-slate-600">{company.phone || '-'}</td>
                      <td className="px-4 py-4 text-slate-600">{company.tin || '-'}</td>
                      <td className="px-4 py-4 text-slate-600">
                        {new Date(company.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleApprove(company._id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium mr-2"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(company._id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
