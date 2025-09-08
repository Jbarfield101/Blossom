import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
        set((state) => ({ tags: [...state.tags].sort() })),
      renameTag: (oldName, newName) =>
        set((state) => ({
          tags: state.tags.map((t) => (t === oldName ? newName : t)),
        })),
      deleteTag: (name) =>
        set((state) => ({ tags: state.tags.filter((t) => t !== name) })),
      mergeTags: (source, target) =>
        set((state) => {
          const tags = state.tags.filter((t) => t !== source);
          if (!tags.includes(target)) tags.push(target);
          return { tags: tags.sort() };
        }),
    }),
    { name: 'tags-store' }
  )
);

export type { TagState };

