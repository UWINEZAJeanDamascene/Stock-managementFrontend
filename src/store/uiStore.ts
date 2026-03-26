import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // UI State
  sidebarOpen: boolean;
  activeModal: string | null;
  globalLoading: boolean;
  
  // Actions
  openModal: (modal: string) => void;
  closeModal: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setGlobalLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      activeModal: null,
      globalLoading: false,
      
      openModal: (modal) => set({ activeModal: modal }),
      closeModal: () => set({ activeModal: null }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setGlobalLoading: (loading) => set({ globalLoading: loading }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

// Selectors
export const selectSidebarOpen = (state: UIState) => state.sidebarOpen;
export const selectActiveModal = (state: UIState) => state.activeModal;
export const selectGlobalLoading = (state: UIState) => state.globalLoading;
