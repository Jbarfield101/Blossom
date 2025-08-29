import { describe, it, expect, beforeEach } from 'vitest';
import { useUsers, defaultWidgets } from './useUsers';

beforeEach(() => {
  useUsers.setState({ users: {}, currentUserId: null });
  // ensure persisted state does not leak between tests
  useUsers.persist.clearStorage();
});

describe('useUsers widgets', () => {
  it('initializes widgets to false', () => {
    useUsers.getState().addUser('Alice');
    const id = useUsers.getState().currentUserId!;
    const user = useUsers.getState().users[id];
    expect(user.widgets).toEqual(defaultWidgets);
  });

  it('toggleWidget flips the flag', () => {
    useUsers.getState().addUser('Bob');
    const id = useUsers.getState().currentUserId!;
    expect(useUsers.getState().users[id].widgets.tasks).toBe(false);
    useUsers.getState().toggleWidget('tasks');
    expect(useUsers.getState().users[id].widgets.tasks).toBe(true);
  });
});
