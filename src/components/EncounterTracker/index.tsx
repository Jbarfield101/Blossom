import { useState } from 'react';
import { useEncounterStore } from '../../store/encounter';
import type { EncounterParticipant } from '../../dnd/encounters/Encounter';

export default function EncounterTracker() {
  const { encounter, startEncounter, nextTurn, endEncounter } =
    useEncounterStore();
  const [name, setName] = useState('');
  const [initiative, setInitiative] = useState<number>(0);
  const [pending, setPending] = useState<EncounterParticipant[]>([]);

  const addParticipant = () => {
    if (!name) return;
    setPending([
      ...pending,
      { id: crypto.randomUUID(), name, initiative },
    ]);
    setName('');
    setInitiative(0);
  };

  if (!encounter) {
    return (
      <div>
        <h3>Prepare Encounter</h3>
        <ul>
          {pending.map((p) => (
            <li key={p.id}>
              {p.name} ({p.initiative})
            </li>
          ))}
        </ul>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="number"
          value={initiative}
          onChange={(e) => setInitiative(Number(e.target.value))}
        />
        <button onClick={addParticipant}>Add</button>
        <button onClick={() => startEncounter(pending)}>Start Encounter</button>
      </div>
    );
  }

  return (
    <div>
      <h3>Encounter</h3>
      <ul>
        {encounter.participants.map((p, idx) => (
          <li
            key={p.id}
            style={{ fontWeight: idx === encounter.turnIndex ? 'bold' : 'normal' }}
          >
            {p.name} ({p.initiative})
          </li>
        ))}
      </ul>
      <button onClick={nextTurn}>Next Turn</button>
      <button onClick={endEncounter}>End Encounter</button>
    </div>
  );
}
