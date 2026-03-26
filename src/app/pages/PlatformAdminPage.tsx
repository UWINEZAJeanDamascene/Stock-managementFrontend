import { useState, useEffect } from 'react';
import { companyService, Company } from '@/services';
import { Loader2, CheckCircle2, XCircle, X, Building2, Mail, Phone, Hash } from 'lucide-react';

interface PendingCompany extends Company {
  createdAt: string;
  updatedAt: string;
}

export default function PlatformAdminPage() {
  const [companies, setCompanies] = useState<PendingCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; companyId: string | null; companyName: string }>({
    isOpen: false,
    companyId: null,
    companyName: '',
  });
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadPendingCompanies();
  }, []);

  const loadPendingCompanies = async () => {
    try {
      setIsLoading(true);
      const response = await companyService.getPendingCompanies();
      setCompanies(response.data || []);
    } catch (err) {
      setError('Failed to load pending companies');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (companyId: string) => {
    try {
      setActionLoading(companyId);
      await companyService.approveCompany(companyId);
      setSuccessMessage('Company approved successfully!');
      setCompanies(companies.filter(c => c._id !== companyId));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to approve company');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (company: PendingCompany) => {
    setRejectModal({ isOpen: true, companyId: company._id, companyName: company.name });
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectModal.companyId) return;
    
    try {
      setActionLoading(rejectModal.companyId);
      await companyService.rejectCompany(rejectModal.companyId, rejectReason);
      setSuccessMessage('Company rejected!');
      setCompanies(companies.filter(c => c._id !== rejectModal.companyId));
      setRejectModal({ isOpen: false, companyId: null, companyName: '' });
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to reject company');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Platform Administration</h1>
          <p className="text-slate-400">Review and approve company registration requests</p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Pending Requests</p>
                <p className="text-2xl font-bold">{companies.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Companies List */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="p-6 border-b border-slate-700/50">
            <h2 className="text-xl font-semibold">Pending Company Registrations</h2>
          </div>

          {isLoading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : companies.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No pending company registrations</p>
              <p className="text-sm mt-2">New company registrations will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {companies.map((company) => (
                <div key={company._id} className="p-6 hover:bg-slate-700/20 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Company Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{company.name}</h3>
                          <p className="text-sm text-slate-400">Created: {formatDate(company.createdAt)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Mail className="w-4 h-4 text-slate-500" />
                          <span>{company.email}</span>
                        </div>
                        {company.phone && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <Phone className="w-4 h-4 text-slate-500" />
                            <span>{company.phone}</span>
                          </div>
                        )}
                        {company.tin && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <Hash className="w-4 h-4 text-slate-500" />
                            <span>TIN: {company.tin}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleApprove(company._id)}
                        disabled={actionLoading === company._id}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {actionLoading === company._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => openRejectModal(company)}
                        disabled={actionLoading === company._id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Reject Company</h3>
              <button
                onClick={() => setRejectModal({ isOpen: false, companyId: null, companyName: '' })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-300 mb-4">
              Are you sure you want to reject <span className="font-semibold text-white">{rejectModal.companyName}</span>?
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Rejection Reason (optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Enter reason for rejection..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal({ isOpen: false, companyId: null, companyName: '' })}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading !== null}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}