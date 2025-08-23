export interface EncounterParticipant {
  id: string;
  name: string;
  initiative: number;
}

export class Encounter {
  participants: EncounterParticipant[];
  turnIndex: number;

  constructor(participants: EncounterParticipant[] = []) {
    this.participants = [...participants].sort(
      (a, b) => b.initiative - a.initiative
    );
    this.turnIndex = 0;
  }

  next() {
    if (this.participants.length === 0) return;
    this.turnIndex = (this.turnIndex + 1) % this.participants.length;
  }

  current(): EncounterParticipant | null {
    if (this.participants.length === 0) return null;
    return this.participants[this.turnIndex];
  }
}

export default Encounter;
