import { create } from 'zustand';

export interface Company {
  _id: string;
  id?: string;
  name: string;
  legal_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  registration_number?: string;
  tax_identification_number?: string;
  industry?: string;
  logo_url?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

interface CompanyState {
  company: Company | null;
  setCompany: (company: Company | null) => void;
  updateCompany: (updates: Partial<Company>) => void;
}

export const useCompanyStore = create<CompanyState>()(
  (set) => ({
    company: null,
    setCompany: (company) => set({ company }),
    updateCompany: (updates) =>
      set((state) => ({
        company: state.company ? { ...state.company, ...updates } : null,
      })),
  })
);