import { describe, it, expect, beforeEach } from 'vitest';
import { useTags } from './tags';
import { useNPCs } from './npcs';
import { useInventory } from './inventory';

function reset() {
  useNPCs.setState({ npcs: [] });
  useInventory.setState({ items: {} });
  useTags.setState({ tags: [] });
}

describe('useTags', () => {
  beforeEach(() => {
    reset();
    useNPCs.setState({
      npcs: [
        { id: '1', name: 'a', tags: ['old'], species: '', role: '', alignment: 'Unaligned', playerCharacter: false, hooks: [], appearance: 'Unknown', statblock: {}, portrait: '', icon: '' },
      ],
    } as any);
    useInventory.setState({
      items: {
        i1: { id: 'i1', name: 'item', value: 0, description: '', tags: ['old'], npcIds: [] },
      },
    });
    useTags.getState().loadFromData();
  });

  it('renames tags across stores', () => {
    useTags.getState().renameTag('old', 'new');
    expect(useTags.getState().tags).toEqual(['new']);
    expect(useNPCs.getState().npcs[0].tags).toEqual(['new']);
    expect(useInventory.getState().items.i1.tags).toEqual(['new']);
  });

  it('deletes tags across stores', () => {
    useTags.getState().deleteTag('old');
    expect(useTags.getState().tags).toEqual([]);
    expect(useNPCs.getState().npcs[0].tags).toEqual([]);
    expect(useInventory.getState().items.i1.tags).toEqual([]);
  });

  it('merges tags across stores', () => {
    useNPCs.setState({ npcs: [{ ...useNPCs.getState().npcs[0], tags: ['old', 'keep'] }] });
    useInventory.setState({ items: { i1: { ...useInventory.getState().items.i1, tags: ['old', 'keep'] } } });
    useTags.getState().loadFromData();
    useTags.getState().mergeTags('old', 'keep');
    expect(useTags.getState().tags.sort()).toEqual(['keep']);
    expect(useNPCs.getState().npcs[0].tags).toEqual(['keep']);
    expect(useInventory.getState().items.i1.tags).toEqual(['keep']);
  });
});
