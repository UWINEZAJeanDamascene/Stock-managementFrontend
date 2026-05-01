import { useCallback, useMemo } from 'react';
import { useAuthStore, Company } from '@/store/authStore';
import { useCompanyStore } from '@/store/companyStore';

/**
 * Hook for company-related state and actions
 * Provides easy access to active company and company switching
 */
export function useCompany() {
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId);
  const activeRole = useAuthStore((state) => state.activeRole);
  const companies = useAuthStore((state) => state.companies);
  const setActiveCompany = useAuthStore((state) => state.setActiveCompany);
  const companyProfile = useCompanyStore((state) => state.company);
  
  // For backward compatibility - derive activeCompany from ID (would need API call to get full company details)
  // For now we just return the ID as "activeCompany"
  const activeCompany = activeCompanyId ? { id: activeCompanyId } as Company : null;

  /**
   * Switch to a different company
   */
  const switchCompany = useCallback((companyId: string) => {
    // Find the company in the memberships list
    const company = companies.find(c => c.companyId === companyId);
    if (company) {
      setActiveCompany(companyId, company.role);
    }
  }, [companies, setActiveCompany]);

  /**
   * Get company by ID from the companies list
   */
  const getCompanyById = useCallback((companyId: string) => {
    return companies.find(c => c.companyId === companyId);
  }, [companies]);

  /**
   * Check if the active company is approved (for our store, active = approved)
   */
  const isCompanyApproved = useMemo(() => {
    return activeRole !== null;
  }, [activeRole]);

  /**
   * Check if the active company is pending approval
   */
  const isCompanyPending = useMemo(() => {
    return false; // No pending state in new store
  }, []);

  /**
   * Check if the active company is rejected (no longer applicable with our store)
   */
  const isCompanyRejected = useMemo(() => {
    return false; // No rejected state in new store
  }, []);

  /**
   * Get company settings (empty object as we don't store settings in new store)
   */
  const companySettings = useMemo(() => {
    return {};
  }, []);

  /**
   * Get company currency from profile settings
   */
  const currency = useMemo(() => {
    return companyProfile?.base_currency || 'FRW';
  }, [companyProfile]);

  // Add setCompanies for backward compatibility (no-op since we use memberships)
  const setCompanies = useCallback(() => {
    // No-op - companies are set through login
  }, []);

  return {
    // State
    activeCompany,
    activeCompanyId,
    companies,
    
    // Actions
    setActiveCompany,
    switchCompany,
    setCompanies,
    
    // Helpers
    getCompanyById,
    isCompanyApproved,
    isCompanyPending,
    isCompanyRejected,
    companySettings,
    currency,
  };
}

export default useCompany;
