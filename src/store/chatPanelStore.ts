import { create } from 'zustand';

interface ChatPanelState {
  open: boolean;
  width: number;
  expanded: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setWidth: (width: number) => void;
  setExpanded: (expanded: boolean) => void;
}

const DEFAULT_WIDTH = 380;
const EXPANDED_WIDTH = 520;
const MIN_WIDTH = 280;
const MAX_WIDTH = 640;

export const useChatPanelStore = create<ChatPanelState>((set) => ({
  open: false,
  width: DEFAULT_WIDTH,
  expanded: false,

  toggle: () => set((state) => {
    const nextOpen = !state.open;
    return {
      open: nextOpen,
      width: state.expanded ? EXPANDED_WIDTH : DEFAULT_WIDTH,
    };
  }),

  setOpen: (open) => set((state) => ({
    open,
    width: state.expanded ? EXPANDED_WIDTH : DEFAULT_WIDTH,
  })),

  setWidth: (width) => set({
    width: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width)),
  }),

  setExpanded: (expanded) => set((state) => ({
    expanded,
    width: expanded ? EXPANDED_WIDTH : DEFAULT_WIDTH,
  })),
}));
