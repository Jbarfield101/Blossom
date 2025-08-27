import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SongForm from './SongForm';
import { PRESET_TEMPLATES } from "./songTemplates";
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('@tauri-apps/plugin-opener', () => ({ open: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  convertFileSrc: (p: string) => `tauri://${encodeURI(p)}`,
}));
vi.mock('@tauri-apps/api/path', () => ({
  resolveResource: (p: string) => Promise.resolve(p),
}));
const setPreviewSfzInstrument = vi.fn();
vi.mock('../features/lofi/SongForm', () => ({
  useLofi: () => ({
    isPlaying: false,
    play: vi.fn(),
    stop: vi.fn(),
    setBpm: vi.fn(),
    setKey: vi.fn(),
    setSeed: vi.fn(),
    setSfzInstrument: setPreviewSfzInstrument,
  }),
}));
const enqueueTask = vi.fn(() => Promise.resolve(1));
vi.mock('../store/tasks', () => ({
  useTasks: (selector: any) =>
    selector({ tasks: {}, fetchStatus: vi.fn(), enqueueTask }),
}));

function openSection(id: string) {
  const summary = screen.getByTestId(id).querySelector('summary') as HTMLElement;
  fireEvent.click(summary);
}

function openDetails(title: string) {
  fireEvent.click(screen.getByText(title));
}

function openTemplateOptions() {
  openDetails('Structure');
  const input = screen.getByLabelText(/song templates/i);
  fireEvent.mouseDown(input);
  return input;
}

function selectTemplate(name: string) {
  const input = openTemplateOptions();
  const option = screen
    .getAllByRole('option', { name })
    .find((el) => el.tagName === 'LI');
  if (option) fireEvent.click(option);
  return input;
}

describe('SongForm', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    enqueueTask.mockResolvedValue(1);
    setPreviewSfzInstrument.mockClear();
    Object.defineProperty(global.HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(global.HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders default form', () => {
    const rand = vi
      .spyOn(Math, 'random')
      .mockReturnValue(0.000012345);
    try {
      const { asFragment } = render(<SongForm />);
      expect(screen.getByText('Song Builder')).toBeInTheDocument();
      expect(asFragment()).toMatchSnapshot();
    } finally {
      rand.mockRestore();
    }
  });

  it('shows validation errors when required fields are missing', async () => {
    render(<SongForm />);
    const btn = screen.getByText(/render songs/i) as HTMLButtonElement;
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    await screen.findByText(/choose an output folder/i);
    expect(enqueueTask).not.toHaveBeenCalled();
  });

  it('adds a job and enqueues task', async () => {
    (openDialog as any).mockResolvedValue('/tmp/out');
    (invoke as any).mockResolvedValue('');

    render(<SongForm />);
    fireEvent.click(screen.getByText(/choose folder/i));
    await screen.findByText('/tmp/out');

    fireEvent.change(
      screen.getByPlaceholderText(/song title base/i),
      { target: { value: 'Test Song' } }
    );

    fireEvent.click(screen.getByText(/render songs/i));

    await waitFor(() => expect(enqueueTask).toHaveBeenCalled());
    const [, args] = enqueueTask.mock.calls[0];
    const spec = args.spec;
    expect(args.id).toBe('GenerateShort');
    expect(spec.structure[0]).toHaveProperty('chords');
    expect(spec.chord_span_beats).toBe(4);
    expect(spec).toMatchObject({
      ambience: ['rain'],
      ambience_level: 0.5,
      lead_instrument: 'synth lead',
      hq_stereo: true,
      hq_reverb: true,
      hq_sidechain: true,
      hq_chorus: true,
      limiter_drive: 1.02,
    });
  });

  it('generates a title with ollama', async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === 'start_ollama') return Promise.resolve();
      if (cmd === 'general_chat')
        return Promise.resolve(
          'Morning Chill\nEvening Jazz\nMidnight Coffee\nSunset Vibes\nRainy Day'
        );
      return Promise.resolve('');
    });

    const rand = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      render(<SongForm />);

      fireEvent.click(screen.getByText(/generate title/i));

      await waitFor(() => {
        const calls = (invoke as any).mock.calls.map(([c]: any) => c);
        expect(calls).toContain('start_ollama');
        expect(calls).toContain('general_chat');
      });

      await waitFor(() =>
        expect(
          (screen.getByPlaceholderText(/song title base/i) as HTMLInputElement).value
        ).toBe('Morning Chill')
      );
    } finally {
      rand.mockRestore();
    }
  });

  it('remembers last used template', () => {
    render(<SongForm />);
    selectTemplate('Study Session');
    expect(
      (screen.getByLabelText(/song templates/i) as HTMLInputElement).value
    ).toBe('Study Session');
    cleanup();
    render(<SongForm />);
    openDetails('Structure');
    expect(
      (screen.getByLabelText(/song templates/i) as HTMLInputElement).value
    ).toBe('Study Session');
  });

  it('offers a no drums option', () => {
    render(<SongForm />);
    openSection('rhythm-section');
    const label = screen.getByText('Drum Pattern');
    const select = label.parentElement!.querySelector('select') as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toContain('no_drums');
  });

  it('offers a bossa_nova option', () => {
    render(<SongForm />);
    openSection('rhythm-section');
    const label = screen.getByText('Drum Pattern');
    const select = label.parentElement!.querySelector('select') as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toContain('bossa_nova');
  });

  it('shows fantasy mood option', () => {
    render(<SongForm />);
    openSection('vibe-section');
    expect(screen.getByText('fantasy')).toBeInTheDocument();
  });

  it('shows dreamy mood option', () => {
    render(<SongForm />);
    openSection('vibe-section');
    expect(screen.getByRole('checkbox', { name: 'dreamy' })).toBeInTheDocument();
  });

  it('shows Arcane Clash template option', () => {
    render(<SongForm />);
    const input = openTemplateOptions();
    expect(
      screen.getAllByRole('option', { name: 'Arcane Clash' })[0]
    ).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
  });

  it('shows Bossa Nova template option', () => {
    render(<SongForm />);
    const input = openTemplateOptions();
    expect(
      screen.getAllByRole('option', { name: 'Bossa Nova' })[0]
    ).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
  });

  it("shows King's Last Stand template option", () => {
    render(<SongForm />);
    const input = openTemplateOptions();
    expect(
      screen.getAllByRole('option', { name: "King's Last Stand" })[0]
    ).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
  });

  it('shows Ocean Breeze template option', () => {
    render(<SongForm />);
    const input = openTemplateOptions();
    expect(
      screen.getAllByRole('option', { name: 'Ocean Breeze' })[0]
    ).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
  });

  it('shows City Lights template option', () => {
    render(<SongForm />);
    const input = openTemplateOptions();
    expect(
      screen.getAllByRole('option', { name: 'City Lights' })[0]
    ).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
  });

  it('applies Bossa Nova template', () => {
    render(<SongForm />);
    selectTemplate('Bossa Nova');
    openSection('rhythm-section');
    const label = screen.getByText('Drum Pattern');
    const drumSelect = label.parentElement!.querySelector('select') as HTMLSelectElement;
    expect(drumSelect.value).toBe('bossa_nova');
    openDetails('Core');
    const bpmSlider = screen.getAllByRole('slider')[0] as HTMLInputElement;
    expect(bpmSlider.value).toBe('120');
  });

  it('shows ambience options', () => {
    render(<SongForm />);
    openSection('vibe-section');
    ['street', 'vinyl', 'forest', 'fireplace', 'ocean'].forEach((name) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it('allows selecting an sfz instrument file', async () => {
    (openDialog as any).mockResolvedValue('/tmp/piano.sfz');
    render(<SongForm />);
    openSection('sfz-section');
    expect(screen.getByText(/none selected/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/choose sfz/i));
    await screen.findByText('piano.sfz');
    expect(openDialog).toHaveBeenCalled();
    expect(setPreviewSfzInstrument).toHaveBeenCalledWith(
      'tauri:///tmp/piano.sfz'
    );
  });

  it('loads acoustic grand piano and clears instruments', async () => {
    render(<SongForm />);
    openSection('sfz-section');
    fireEvent.click(screen.getByText(/acoustic grand piano/i));
    await screen.findByText('UprightPianoKW-20220221.sfz');
    openSection('vibe-section');
    ['rhodes', 'nylon guitar', 'upright bass'].forEach((name) => {
      expect(screen.getByRole('checkbox', { name })).not.toBeChecked();
    });
    expect(screen.getByRole('radio', { name: 'synth' })).not.toBeChecked();
    expect(setPreviewSfzInstrument).toHaveBeenCalledWith(
      'tauri://sfz_sounds/UprightPianoKW-20220221.sfz'
    );
  });

  it('keeps preset templates when loading custom templates', () => {
    localStorage.setItem(
      'songTemplates',
      JSON.stringify({ Foo: PRESET_TEMPLATES['Classic Lofi'] })
    );
    render(<SongForm />);
    const input = openTemplateOptions();
    expect(
      screen.getAllByRole('option', { name: 'Bossa Nova' })[0]
    ).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
  });

  it('passes selected instruments in spec', async () => {
    (openDialog as any).mockResolvedValue('/tmp/out');
    (invoke as any).mockResolvedValue('');

    render(<SongForm />);

    fireEvent.click(screen.getByText(/choose folder/i));
    await screen.findByText('/tmp/out');

    fireEvent.change(
      screen.getByPlaceholderText(/song title base/i),
      { target: { value: 'Test Song' } }
    );

    ['rhodes', 'nylon guitar', 'upright bass'].forEach((name) =>
      fireEvent.click(screen.getByText(name))
    );
    ['harp', 'lute', 'pan flute'].forEach((name) =>
      fireEvent.click(screen.getByText(name))
    );

    fireEvent.click(screen.getByText(/render songs/i));

    await waitFor(() => expect(enqueueTask).toHaveBeenCalled());
    const [, args] = enqueueTask.mock.calls[0];
    expect(args.id).toBe('GenerateShort');
    expect(args.spec.instruments).toEqual(['harp', 'lute', 'pan flute']);
  });

  it('uses raw sfz path in render spec', async () => {
    (openDialog as any)
      .mockResolvedValueOnce('/tmp/out')
      .mockResolvedValueOnce('/tmp/piano file.sfz');
    (invoke as any).mockResolvedValue('');

    render(<SongForm />);

    fireEvent.click(screen.getByText(/choose folder/i));
    await screen.findByText('/tmp/out');

    openSection('sfz-section');
    fireEvent.click(screen.getByText(/choose sfz/i));
    await screen.findByText('piano file.sfz');

    fireEvent.change(screen.getByPlaceholderText(/song title base/i), {
      target: { value: 'Test Song' },
    });

    fireEvent.click(screen.getByText(/render songs/i));

    await waitFor(() => expect(enqueueTask).toHaveBeenCalled());
    const [, args] = enqueueTask.mock.calls[0];
    expect(args.id).toBe('GenerateShort');
    expect(args.spec.sfzInstrument).toBe('/tmp/piano file.sfz');
    expect(setPreviewSfzInstrument).toHaveBeenCalledWith(
      'tauri:///tmp/piano%20file.sfz'
    );
  });

  it('updates lead instrument when adding a lead-capable instrument', () => {
    render(<SongForm />);
    openSection('vibe-section');

    expect(screen.getByRole('radio', { name: 'synth' })).toBeChecked();

    fireEvent.click(screen.getByRole('checkbox', { name: 'flute' }));

    expect(screen.getByRole('radio', { name: 'flute' })).toBeChecked();
  });

  it('passes lead instrument in spec', async () => {
    (openDialog as any).mockResolvedValue('/tmp/out');
    (invoke as any).mockResolvedValue('');

    render(<SongForm />);

    fireEvent.click(screen.getByText(/choose folder/i));
    await screen.findByText('/tmp/out');

    fireEvent.change(
      screen.getByPlaceholderText(/song title base/i),
      { target: { value: 'Test Song' } }
    );

    fireEvent.click(screen.getByRole('radio', { name: 'flute' }));

    fireEvent.click(screen.getByText(/render songs/i));

    await waitFor(() => expect(enqueueTask).toHaveBeenCalled());
    const [, args] = enqueueTask.mock.calls[0];
    expect(args.id).toBe('GenerateShort');
    expect(args.spec.lead_instrument).toBe('flute');
  });

  it('exports an odd-bar through-composed preset', () => {
    expect(PRESET_TEMPLATES['Odd Odyssey'].structure.map((s) => s.bars)).toEqual([
      4,
      7,
      5,
      7,
      5,
      7,
      5,
      4,
    ]);
  });

  it('calls generate_album when album mode enabled', async () => {
    (openDialog as any).mockResolvedValue('/tmp/out');
    (invoke as any).mockResolvedValue({});

    render(<SongForm />);

    fireEvent.click(screen.getByText(/choose folder/i));
    await screen.findByText('/tmp/out');

    fireEvent.change(
      screen.getByPlaceholderText(/song title base/i),
      { target: { value: 'Test Song' } }
    );

    fireEvent.click(screen.getByLabelText(/album mode/i));
    const tcInput = screen.getByDisplayValue('6') as HTMLInputElement;
    fireEvent.change(tcInput, { target: { value: '3' } });
    fireEvent.change(screen.getByPlaceholderText(/album name/i), {
      target: { value: 'My Album' },
    });
    fireEvent.change(screen.getByPlaceholderText('Track 1 name'), {
      target: { value: 'T1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Track 2 name'), {
      target: { value: 'T2' },
    });
    fireEvent.change(screen.getByPlaceholderText('Track 3 name'), {
      target: { value: 'T3' },
    });
    fireEvent.click(screen.getByText(/create album/i));

    await waitFor(() => {
      expect(enqueueTask).toHaveBeenCalled();
      const args = enqueueTask.mock.calls[0][1];
      expect(args.id).toBe('GenerateAlbum');
      expect(args.meta.album_name).toBe('My Album');
      expect(args.meta.track_names).toEqual(['T1', 'T2', 'T3']);
      expect(args.meta.specs).toHaveLength(3);
      expect(args.meta.specs[0]).toMatchObject({
        title: 'Test Song 1',
        album: 'My Album',
      });
    });
  });

  it('generates album and track titles with specs and image prompt', async () => {
    let gcCount = 0;
    let gcArgs: any;
    (invoke as any).mockImplementation((cmd: string, args: any) => {
      if (cmd === 'start_ollama') return Promise.resolve();
      if (cmd === 'general_chat') {
        gcCount++;
        if (gcCount === 1) {
          gcArgs = args;
          return Promise.resolve(
            JSON.stringify({ album: 'Cool Album', tracks: ['T1', 'T2', 'T3'] })
          );
        }
        return Promise.resolve('a cozy night cityscape with neon lights');
      }
      return Promise.resolve('');
    });

    render(<SongForm />);
    fireEvent.click(screen.getByLabelText(/album mode/i));
    const tcInput = screen.getByDisplayValue('6') as HTMLInputElement;
    fireEvent.change(tcInput, { target: { value: '3' } });
    fireEvent.click(screen.getByText(/generate album titles/i));

    await screen.findByDisplayValue('Cool Album');
    expect((screen.getByPlaceholderText('Track 1 name') as HTMLInputElement).value).toBe('T1');
    expect((screen.getByPlaceholderText('Track 2 name') as HTMLInputElement).value).toBe('T2');
    expect((screen.getByPlaceholderText('Track 3 name') as HTMLInputElement).value).toBe('T3');
    expect(gcArgs.messages[1].content).toContain('"mood":["calm","cozy","nostalgic"]');
    expect(gcArgs.messages[1].content).toContain('"instruments":["rhodes","nylon guitar","upright bass"]');

    await screen.findByText(/album art prompt/i);
    expect(
      screen.getByText('a cozy night cityscape with neon lights')
    ).toBeInTheDocument();
    const img = screen.getByAltText('Album art preview') as HTMLImageElement;
    expect(img.src).toContain(
      'a%20cozy%20night%20cityscape%20with%20neon%20lights'
    );
  });
});

