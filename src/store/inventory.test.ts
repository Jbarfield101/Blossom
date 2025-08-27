import { describe, it, expect, beforeEach } from 'vitest';
import { useInventory } from './inventory';
import type { Npc } from '../dnd/schemas/npc';

const baseNpc = {
  species: 'Human',
  role: 'Villager',
  alignment: 'Neutral',
  playerCharacter: false,
  hooks: ['hook'],
  tags: ['tag'],
  statblock: {},
};

describe('inventory scanning', () => {
  beforeEach(() => {
    useInventory.setState({ items: {} });
  });

  it('creates world items with npc references', () => {
    const npcs: Npc[] = [
      { ...baseNpc, id: '1', name: 'A', inventory: ['Sword'] } as Npc,
      { ...baseNpc, id: '2', name: 'B', inventory: ['Sword', 'Shield'] } as Npc,
    ];
    useInventory.getState().scanNPCs(npcs);
    const items = useInventory.getState().items;
    const sword = Object.values(items).find((i) => i.name === 'Sword');
    const shield = Object.values(items).find((i) => i.name === 'Shield');
    expect(sword?.npcIds.sort()).toEqual(['1', '2']);
    expect(shield?.npcIds).toEqual(['2']);
  });

  it('does not duplicate npc references on rescan', () => {
    const npcs: Npc[] = [
      { ...baseNpc, id: '1', name: 'A', inventory: ['Sword'] } as Npc,
    ];
    useInventory.getState().scanNPCs(npcs);
    useInventory.getState().scanNPCs(npcs);
    const sword = Object.values(useInventory.getState().items).find((i) => i.name === 'Sword');
    expect(sword?.npcIds).toEqual(['1']);
  });
});
