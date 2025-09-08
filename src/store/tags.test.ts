import { describe, it, expect, beforeEach } from 'vitest';
import { useTags } from './tags';

describe('useTags', () => {
  beforeEach(() => {
    useTags.setState({ tags: ['old', 'keep'] });
  });

  it('renames tags', () => {
    useTags.getState().renameTag('old', 'new');
    expect(useTags.getState().tags.sort()).toEqual(['keep', 'new']);
  });

  it('deletes tags', () => {
    useTags.getState().deleteTag('old');
    expect(useTags.getState().tags).toEqual(['keep']);
  });

  it('merges tags', () => {
    useTags.getState().mergeTags('old', 'keep');
    expect(useTags.getState().tags).toEqual(['keep']);
  });
});

