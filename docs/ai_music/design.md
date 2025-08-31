# AI Music Workflow Design

This document outlines wireframes and user flows for the **Ai_music** section. The features here are not yet connected to any music generator.

## 1. Song Form

Fields for gathering metadata and an optional melody upload. All inputs have visible labels, helper text as needed, validation, and keyboard navigation support.

```
+-----------------------------------------------------------+
| Title*: [______________________________________________] |
| Genre*: [Select v]    Mood*: [Select v]                   |
| Tempo*: [____] bpm    Key*: [C, C#, D, ... v]            |
| Duration*: [____] sec Instrumentation*: [______________] |
| Description*: [________________________________________] |
| Melody (optional): [Upload audio] [Clear]                |
|                                                           |
| [Submit]                                                  |
+-----------------------------------------------------------+
```

- Required fields: title, genre, mood, tempo, key, duration, instrumentation, description.
- Melody upload accepts audio files for guidance but is optional.
- Validation: title 3–80 chars; tempo 50–220 BPM; duration 5–300 sec; melody .wav/.mp3/.flac up to 50 MB.
- Accessibility: labels paired with inputs, aria-* for errors, form regions announced.
- Responsive design: stack fields vertically on narrow screens.

## 2. Settings Panel

Allows users to set defaults for future generations.

```
+---------------- Settings ----------------+
| Default Model: [MusicGen small | medium] |
| Diffusion: [None | Latent (spec) | DDIM] |
| Sample Rate: [32000 | 44100 | 48000 Hz ] |
|                                         |
| [Save Settings]                          |
+-----------------------------------------+
```

- Provide descriptions for each option (e.g., small = faster, medium = higher fidelity).
- Persist settings to local storage until backend integration.

## 3. Project Dashboard

Lists previously generated songs.

```
+-------------------------------------------------------------+
| Title       | Created      | Actions                        |
|-------------|--------------|--------------------------------|
| My Song     | 2024-11-24   | Play | Download | Regen | Del |
| Another Jam | 2024-11-22   | Play | Download | Regen | Del |
+-------------------------------------------------------------+
```

- Supports search and sorting.
- Actions: Play (opens preview), Download (mix/stems), Regenerate (re-queues), Delete (with confirm).

## 4. Render Queue

Displays pending and in‑progress generations.

```
+---------------- Render Queue ----------------+
| My Song       [####------] 45%               |
| Another Jam   [########--] 80%               |
+---------------------------------------------+
```

- Status: Pending | In Progress | Completed | Failed; show ETA when available.
- Actions: Cancel (running), Retry (failed). Items move to the dashboard when complete.

## 5. Audio Preview

Page for listening to final mixes and stems.

```
+----------------- Audio Preview -----------------+
| [Play] [Stop]  00:00 / 03:20  [Loop] [Volume]   |
| Stems: [Drums] [Bass] [Melody] [Vocals] [Solo]  |
| Waveform scrubber  [=======================> ]   |
| Download: [Mix] [Selected stems]                |
+------------------------------------------------+
```

- Player supports loop, scrub, and volume control.
- Stems can be muted/soloed individually; accessible toggle buttons; keyboard shortcuts (Space play/pause, ←/→ seek, M mute).

## UX Principles

- **Clarity:** concise labels and tooltips for advanced options.
- **Accessibility:** semantic HTML, high-contrast colors, focus outlines.
- **Responsive design:** layouts adjust between desktop and mobile breakpoints.
- **Separation of concerns:** generation logic will be added later.

## Navigation & Flows

- Primary navigation: Song Form | Dashboard | Queue | Settings.
- Create → Queue → Dashboard → Preview flow, plus Regenerate → Queue → Preview.

## Error & Empty States

- Inline form errors with aria-live polite announcements.
- Queue failures show error details and Retry.
- Empty Dashboard/Queue views include CTAs to create a song or tweak settings.

## Success Criteria (Acceptance Checklist)

- Wireframes/prototype for Song Form, Settings Panel, Project Dashboard, Render Queue, Audio Preview.
- Documented flows covering creation, regeneration, and preview.
- Accessibility considerations (labels, keyboard, contrast) and responsive layouts.
- Settings persistence reflected as defaults in the Song Form.

## User Flow Summary

1. User opens *Ai_music* and completes the Song Form.
2. Submitting the form enqueues the job and navigates to the Render Queue.
3. When rendering finishes, the song appears in the Project Dashboard.
4. Selecting a song opens the Audio Preview for playback and downloads.

