import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAudio } from './bark';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('tone', () => {
  return {
    getContext: () => ({ decodeAudioData: vi.fn().mockResolvedValue('decoded') }),
    ToneAudioBuffer: class {
      buffer: unknown;
      constructor(buffer: unknown) {
        this.buffer = buffer;
      }
    },
  };
});

describe('generateAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ToneAudioBuffer when invoke succeeds', async () => {
    (invoke as any).mockResolvedValue(new Uint8Array([1, 2, 3]));
    const tone = await import('tone');
    const result = await generateAudio('hello', 'speaker');
    expect(invoke).toHaveBeenCalledWith('bark_tts', { text: 'hello', speaker: 'speaker' });
    expect(result).toBeInstanceOf(tone.ToneAudioBuffer as any);
    expect((result as any).buffer).toBe('decoded');
  });

  it('throws when invoke fails', async () => {
    (invoke as any).mockRejectedValue(new Error('boom'));
    await expect(generateAudio('hello', 'speaker')).rejects.toThrow(
      'Bark TTS invocation failed: boom',
    );
  });
});
