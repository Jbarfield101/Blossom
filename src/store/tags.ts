import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useNPCs } from './npcs';
import { useInventory } from './inventory';

interface TagState {
  tags: string[];
  loadFromData: () => void;
  renameTag: (oldName: string, newName: string) => void;
  deleteTag: (name: string) => void;
  mergeTags: (source: string, target: string) => void;
}

export const useTags = create<TagState>()(
  persist(
    (set) => ({
      tags: [],
      loadFromData: () =>
        set(() => {
          const setTags = new Set<string>();
          for (const npc of useNPCs.getState().npcs) {
            for (const t of npc.tags || []) setTags.add(t);
          }
          for (const item of Object.values(useInventory.getState().items)) {
            for (const t of item.tags || []) setTags.add(t);
          }
          return { tags: Array.from(setTags).sort() };
        }),
      renameTag: (oldName, newName) =>
        set((state) => {
          const tags = state.tags.map((t) => (t === oldName ? newName : t));
          useNPCs.setState((npcState) => ({
            npcs: npcState.npcs.map((npc) => ({
              ...npc,
              tags: npc.tags?.map((t) => (t === oldName ? newName : t)),
            })),
          }));
          useInventory.setState((invState) => {
            const items = { ...invState.items };
            for (const item of Object.values(items)) {
              if (item.tags) {
                item.tags = item.tags.map((t) => (t === oldName ? newName : t));
              }
            }
            return { items };
          });
          return { tags: Array.from(new Set(tags)).sort() };
        }),
      deleteTag: (name) =>
        set((state) => {
          const tags = state.tags.filter((t) => t !== name);
          useNPCs.setState((npcState) => ({
            npcs: npcState.npcs.map((npc) => ({
              ...npc,
              tags: npc.tags?.filter((t) => t !== name),
            })),
          }));
          useInventory.setState((invState) => {
            const items = { ...invState.items };
            for (const item of Object.values(items)) {
              if (item.tags) {
                item.tags = item.tags.filter((t) => t !== name);
              }
            }
            return { items };
          });
          return { tags };
        }),
      mergeTags: (source, target) =>
        set((state) => {
          const tags = state.tags.filter((t) => t !== source);
          if (!tags.includes(target)) tags.push(target);
          useNPCs.setState((npcState) => ({
            npcs: npcState.npcs.map((npc) => {
              const newTags = (npc.tags || []).map((t) =>
                t === source ? target : t
              );
              return { ...npc, tags: Array.from(new Set(newTags)) };
            }),
          }));
          useInventory.setState((invState) => {
            const items = { ...invState.items };
            for (const item of Object.values(items)) {
              if (item.tags) {
                const newTags = item.tags.map((t) =>
                  t === source ? target : t
                );
                item.tags = Array.from(new Set(newTags));
              }
            }
            return { items };
          });
          return { tags: tags.sort() };
        }),
    }),
    { name: 'tags-store' }
  )
);

export type { TagState };
