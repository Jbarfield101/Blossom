import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { usePathsStore } from './usePaths';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('usePaths save_paths error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setters: [string, string][] = [
    ['setPythonPath', 'py'],
    ['setComfyPath', 'comfy'],
    ['setTtsModelPath', 'model'],
    ['setTtsConfigPath', 'config'],
    ['setTtsSpeaker', 'speaker'],
    ['setTtsLanguage', 'lang'],
  ];

  it.each(setters)('%s surfaces errors', async (setter, value) => {
    (invoke as any).mockRejectedValue(new Error('fail'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (usePathsStore.getState() as any)[setter](value);
    await Promise.resolve();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to save paths'),
      expect.any(Error)
    );
    spy.mockRestore();
  });
});
