import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Npc } from '../dnd/schemas/npc';
import type { Item } from '../dnd/schemas/item';

export interface WorldItem extends Item {
  npcIds: string[];
}

interface InventoryState {
  items: Record<string, WorldItem>;
  scanNPCs: (npcs: Npc[]) => void;
}

export const useInventory = create<InventoryState>()(
  persist(
    (set) => ({
      items: {},
      scanNPCs: (npcs) =>
        set((state) => {
          const items = { ...state.items };
          const nameToId: Record<string, string> = {};
          // reset npc references
          for (const [id, item] of Object.entries(items)) {
            nameToId[item.name] = id;
            item.npcIds = [];
          }
          for (const npc of npcs) {
            for (const name of npc.inventory || []) {
              let itemId = nameToId[name];
              if (!itemId) {
                itemId = crypto.randomUUID();
                nameToId[name] = itemId;
                items[itemId] = {
                  id: itemId,
                  name,
                  value: 0,
                  description: '',
                  tags: [],
                  npcIds: [],
                };
              }
              const entry = items[itemId];
              if (!entry.npcIds.includes(npc.id)) {
                entry.npcIds.push(npc.id);
              }
            }
          }
          return { items };
        }),
    }),
    { name: 'inventory-store' }
  )
);

export type { InventoryState };
