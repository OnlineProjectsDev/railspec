import { create } from "zustand";

interface BuilderNavState {
  backToJobHref: string | null;
  jobNumber: number | null;
  setBackToJob: (href: string, jobNumber: number) => void;
  clearBackToJob: () => void;
}

export const useBuilderNavStore = create<BuilderNavState>((set) => ({
  backToJobHref: null,
  jobNumber: null,
  setBackToJob: (href, jobNumber) => set({ backToJobHref: href, jobNumber }),
  clearBackToJob: () => set({ backToJobHref: null, jobNumber: null }),
}));
