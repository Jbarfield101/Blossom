# AI Music Workflow Design

This document outlines wireframes and user flows for the **Ai_music** section. The features here are not yet connected to any music generator.

## 1. Song Form

Fields for gathering metadata and an optional melody upload.

```
+-----------------------------------------------------------+
| Title: [_______________________________________________] |
| Genre: [Select v]    Mood: [Select v]                     |
| Tempo: [____] bpm    Key: [____]                          |
| Duration: [____]     Instrumentation: [________________] |
| Description: [_________________________________________] |
| Melody (optional): [Upload file]                         |
|                                                           |
| [Submit]                                                  |
+-----------------------------------------------------------+
```

- Required fields: title, genre, mood, tempo, key, duration, instrumentation, description.
- Melody upload accepts audio files for guidance but is optional.
- Accessibility: labels paired with inputs, keyboard navigation, ARIA attributes.
- Responsive design: stack fields vertically on narrow screens.

## 2. Settings Panel

Allows users to set defaults for future generations.

```
+---------------- Settings ----------------+
| Model: [MusicGen small v]                |
| Diffusion: [DDIM v]                      |
| Sample Rate: [44100 Hz v]                |
|                                         |
| [Save Settings]                          |
+-----------------------------------------+
```

- Provide descriptions for each option.
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
- Regenerate adds a job to the render queue but does not invoke a generator yet.

## 4. Render Queue

Displays pending and in‑progress generations.

```
+---------------- Render Queue ----------------+
| My Song       [####------] 45%               |
| Another Jam   [########--] 80%               |
+---------------------------------------------+
```

- Uses progress bars and status badges.
- Items move to the dashboard when complete.

## 5. Audio Preview

Page for listening to final mixes and stems.

```
+----------------- Audio Preview -----------------+
| [Play/Pause]  00:00 / 03:20                     |
| Stems: [Drums] [Bass] [Melody] [Vocals]         |
| Download: [Mix] [Stems]                         |
+------------------------------------------------+
```

- Player supports loop, scrub, and volume control.
- Stems can be muted/soloed individually.

## UX Principles

- **Clarity:** concise labels and tooltips for advanced options.
- **Accessibility:** semantic HTML, high-contrast colors, focus outlines.
- **Responsive design:** layouts adjust between desktop and mobile breakpoints.
- **Separation of concerns:** generation logic will be added later.

## User Flow Summary

1. User opens *Ai_music* and completes the Song Form.
2. Submitting the form enqueues the job and navigates to the Render Queue.
3. When rendering finishes, the song appears in the Project Dashboard.
4. Selecting a song opens the Audio Preview for playback and downloads.

