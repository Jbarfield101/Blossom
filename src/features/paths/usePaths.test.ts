import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { usePathsStore } from './usePaths';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('setPythonPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathsStore.setState({ error: null, pythonPath: '' });
  });

  it('saves the python path', () => {
    (invoke as any).mockResolvedValue(undefined);
    usePathsStore.getState().setPythonPath('py');
    expect(invoke).toHaveBeenCalledWith('save_paths', { python_path: 'py' });
    expect(usePathsStore.getState().pythonPath).toBe('py');
    expect(usePathsStore.getState().error).toBeNull();
  });

  it('surfaces save_paths errors', async () => {
    (invoke as any).mockRejectedValue(new Error('fail'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    usePathsStore.getState().setPythonPath('py');
    await Promise.resolve();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to save paths'),
      expect.any(Error)
    );
    expect(usePathsStore.getState().error).toContain('Failed to save paths');
    spy.mockRestore();
  });
});

