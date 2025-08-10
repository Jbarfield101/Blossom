import React from 'react';
import { useLofi } from './useLofiEngine';

export default function LofiPage() {
  const { isPlaying, bpm, play, stop, setBpm } = useLofi();

  return (
    <div style={{
      height: '100%',
      display: 'grid',
      placeItems: 'center',
      background: 'linear-gradient(180deg,#f5f5f7,#efefef)'
    }}>
      <div style={{
        width: 520,
        padding: 24,
        borderRadius: 16,
        boxShadow: '0 10px 30px rgba(0,0,0,.08)',
        background: 'white'
      }}>
        <h2 style={{ margin: 0, fontWeight: 700 }}>Lo‑Fi Player</h2>
        <p style={{ marginTop: 6, color: '#666' }}>
          Press play, then adjust BPM.
        </p>

        <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
          {!isPlaying ? (
            <button onClick={play}>▶ Play</button>
          ) : (
            <button onClick={stop}>⏹ Stop</button>
          )}
        </div>

        <div style={{ marginTop: 18 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#444' }}>
            BPM: <b>{bpm}</b>
          </label>
          <input
            type="range"
            min={60}
            max={120}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </div>
  );
}
