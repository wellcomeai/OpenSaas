import { create } from "zustand";

interface UiState {
  sidebarOpen: boolean;
  autoCollapsed: boolean;
  hideHeader: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setAutoCollapsed: (v: boolean) => void;
  setHideHeader: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  autoCollapsed: false,
  hideHeader: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setAutoCollapsed: (autoCollapsed) => set({ autoCollapsed }),
  setHideHeader: (hideHeader) => set({ hideHeader }),
}));
