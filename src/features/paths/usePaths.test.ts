import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { usePathsStore } from './usePaths';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('usePaths save_paths error handling', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      usePathsStore.setState({ error: null });
    });

    it('setPythonPath surfaces errors', async () => {
      (invoke as any).mockRejectedValue(new Error('fail'));
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      usePathsStore.getState().setPythonPath('py');
      await Promise.resolve();
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save paths'),
        expect.any(Error)
      );
      expect(usePathsStore.getState().error).toContain('Failed to save paths');
      usePathsStore.setState({ error: null });
      spy.mockRestore();
    });
});
