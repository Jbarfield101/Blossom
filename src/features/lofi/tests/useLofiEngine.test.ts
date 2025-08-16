import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

let useLofi: any;
let tone: any;

describe('useLofi engine', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.doMock('tone', () => {
      const start = vi.fn().mockResolvedValue(undefined);
      const Transport = {
        bpm: { value: 80, rampTo: vi.fn() },
        start: vi.fn(),
        stop: vi.fn(),
      };
      const mkSynth = () =>
        ({ toDestination: () => ({ connect: () => ({}) }), connect: () => ({}), triggerAttackRelease: vi.fn() });
      const MonoSynth = vi.fn().mockImplementation(() => mkSynth());
      const NoiseSynth = vi.fn().mockImplementation(() => mkSynth());
      const MembraneSynth = vi.fn().mockImplementation(() => mkSynth());
      const PolySynth = vi.fn().mockImplementation(() => mkSynth());
      const Reverb = vi.fn().mockImplementation(() => ({ toDestination: () => ({ connect: () => ({}) }) }));
      const Volume = vi.fn().mockImplementation(() => ({ connect: vi.fn() }));
      const Filter = vi.fn().mockImplementation(() => ({ connect: vi.fn() }));
      const Loop = vi
        .fn()
        .mockImplementation(() => ({ start: vi.fn(), stop: vi.fn() }));
      const Frequency = (n: any) => ({
        transpose: () => ({ toNote: () => n }),
        toMidi: () => (typeof n === 'number' ? n : 60),
        toNote: () => (typeof n === 'number' ? 'C4' : n),
      });
      const Synth = vi.fn();
      return {
        start,
        Transport,
        MonoSynth,
        NoiseSynth,
        MembraneSynth,
        PolySynth,
        Reverb,
        Volume,
        Filter,
        Loop,
        Frequency,
        Synth,
      };
    });
    ({ useLofi } = await import('../useLofiEngine'));
    tone = await import('tone');
  });

  it('plays and stops', async () => {
    await useLofi.getState().play();
    const loopInstance = (tone.Loop as Mock).mock.results[0].value;
    expect(tone.start).toHaveBeenCalled();
    expect(tone.Transport.start).toHaveBeenCalled();
    expect(loopInstance.start).toHaveBeenCalled();
    expect(useLofi.getState().isPlaying).toBe(true);
    useLofi.getState().stop();
    expect(tone.Transport.stop).toHaveBeenCalled();
    expect(loopInstance.stop).toHaveBeenCalled();
    expect(useLofi.getState().isPlaying).toBe(false);
  });

  it('handles seed changes', async () => {
    useLofi.getState().setSeed(123);
    expect(useLofi.getState().seed).toBe(123);
    useLofi.setState({ seed: 42 });
    await useLofi.getState().play();
    expect(useLofi.getState().seed).toBe(42);
  });

  it('handles key changes', () => {
    useLofi.getState().setKey('D');
    expect(useLofi.getState().key).toBe('D');
  });
});

