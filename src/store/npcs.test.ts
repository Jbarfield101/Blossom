import { describe, it, expect, beforeEach } from 'vitest';
import { useNPCs, type Npc } from './npcs';
import { useInventory } from './inventory';

const baseNpc = {
  species: 'Human',
  role: 'Villager',
  alignment: 'Neutral',
  playerCharacter: false,
  hooks: ['hook'],
  tags: ['tag'],
  statblock: {},
};

describe('addNPC deduplication', () => {
  beforeEach(() => {
    useNPCs.setState({ npcs: [] });
    useInventory.setState({ items: {} });
  });

  it('replaces existing npc by id and rescans inventory', () => {
    const original: Npc = {
      ...baseNpc,
      id: '1',
      name: 'A',
      inventory: ['Sword'],
    } as Npc;
    useNPCs.getState().addNPC(original);

    const updated: Npc = { ...original, name: 'A2', inventory: ['Shield'] };
    useNPCs.getState().addNPC(updated);

    const npcs = useNPCs.getState().npcs;
    expect(npcs).toHaveLength(1);
    expect(npcs[0].name).toBe('A2');

    const items = useInventory.getState().items;
    const sword = Object.values(items).find((i) => i.name === 'Sword');
    const shield = Object.values(items).find((i) => i.name === 'Shield');
    expect(sword?.npcIds).toEqual([]);
    expect(shield?.npcIds).toEqual(['1']);
  });
});
