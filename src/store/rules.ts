import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type { RuleData } from '../features/dnd/types';

interface RuleState {
  rules: RuleData[];
  loadRules: () => Promise<void>;
  addRule: (rule: Omit<RuleData, 'id'> & { id?: string }) => Promise<void>;
  removeRule: (id: string) => void;
}

export const useRules = create<RuleState>()(
  persist(
    (set) => ({
      rules: [],
      loadRules: async () => {
        const rules = await invoke<RuleData[]>('list_rules');
        set({ rules });
      },
      addRule: async (rule) => {
        const withId: RuleData = { id: rule.id ?? crypto.randomUUID(), ...rule } as RuleData;
        await invoke('save_rule', { rule: withId });
        set((state) => {
          const exists = state.rules.some((r) => r.id === withId.id);
          const rules = exists
            ? state.rules.map((r) => (r.id === withId.id ? withId : r))
            : [...state.rules, withId];
          return { rules };
        });
      },
      removeRule: (id) =>
        set((state) => ({ rules: state.rules.filter((r) => r.id !== id) })),
    }),
    { name: 'rule-store' }
  )
);

export type { RuleData as Rule };
