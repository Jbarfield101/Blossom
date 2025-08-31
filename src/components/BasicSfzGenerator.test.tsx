import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import BasicSfzGenerator from './BasicSfzGenerator';
import { readDir } from '@tauri-apps/plugin-fs';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { resolveResource } from '@tauri-apps/api/path';

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('@tauri-apps/api/path', () => ({ resolveResource: vi.fn() }));
const enqueueTask = vi.fn();
vi.mock('../store/tasks', () => ({ useTasks: () => ({ enqueueTask }) }));

describe('BasicSfzGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (window as any).__TAURI__ = {};
    vi.mocked(resolveResource).mockResolvedValue('/sfz_sounds');
    vi.mocked(readDir).mockResolvedValue([
      { name: 'piano.sfz', path: '/sfz_sounds/piano.sfz' },
      { name: 'guitar.sfz', path: '/sfz_sounds/guitar.sfz' },
      { name: 'readme.txt', path: '/sfz_sounds/readme.txt' },
    ] as any);
  });

  it('lists sfz files in dropdown', async () => {
    render(<BasicSfzGenerator />);
    const select = (
      await screen.findAllByLabelText('Instrument', {
        selector: 'div[role="combobox"]',
      })
    )[0];
    fireEvent.mouseDown(select);
    const options = await screen.findAllByRole('option');
    const labels = options.map((o) => o.textContent?.trim());
    expect(labels).toContain('piano.sfz');
    expect(labels).toContain('guitar.sfz');
    expect(labels).not.toContain('readme.txt');
  });

  it('persists output folder via localStorage', async () => {
    vi.mocked(openDialog).mockResolvedValue('/tmp/output');
    const { unmount } = render(<BasicSfzGenerator />);
    fireEvent.click((await screen.findAllByText('Browse'))[0]);
    await waitFor(() =>
      expect(screen.getAllByDisplayValue('/tmp/output')[0]).toBeInTheDocument()
    );
    expect(localStorage.getItem('basicSfzOutDir')).toBe('/tmp/output');
    unmount();
    render(<BasicSfzGenerator />);
    expect(
      await screen.findByDisplayValue('/tmp/output')
    ).toBeInTheDocument();
  });

  it('enqueues task on generate with selected values', async () => {
    vi.mocked(openDialog).mockResolvedValue('/tmp/output');
    render(<BasicSfzGenerator />);

    const instSelect = (
      await screen.findAllByLabelText('Instrument', {
        selector: 'div[role="combobox"]',
      })
    )[0];
    fireEvent.mouseDown(instSelect);
    const guitar = await screen.findByRole('option', { name: 'guitar.sfz' });
    fireEvent.click(guitar);

    const tempo = screen.getAllByLabelText('Tempo')[0];
    fireEvent.change(tempo, { target: { value: '150' } });

    const keySelect = screen.getAllByLabelText('Key')[0];
    fireEvent.mouseDown(keySelect);
    const keyOption = await screen.findByRole('option', { name: 'D#/Eb' });
    fireEvent.click(keyOption);

    fireEvent.click(screen.getAllByText('Browse')[0]);
    await waitFor(() =>
      expect(screen.getAllByDisplayValue('/tmp/output')[0]).toBeInTheDocument()
    );

    fireEvent.click(screen.getAllByText('Generate')[0]);

    await waitFor(() => {
      expect(enqueueTask).toHaveBeenCalledWith('Music Generation', {
        id: 'GenerateBasicSfz',
        spec: {
          title: 'Basic',
          outDir: '/tmp/output',
          bpm: 150,
          key: 'D#',
          sfzInstrument: '/sfz_sounds/guitar.sfz',
        },
      });
    });
  });
});

