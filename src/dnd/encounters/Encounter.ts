export interface Participant {
  name: string;
  initiative: number;
}

export class Encounter {
  participants: Participant[];
  current: number;

  constructor(participants: Participant[] = [], current = 0, sorted = false) {
    this.participants = sorted
      ? [...participants]
      : [...participants].sort((a, b) => b.initiative - a.initiative);
    this.current = current;
  }

  advance(): Encounter {
    if (this.participants.length === 0) {
      return new Encounter([]);
    }
    const next = (this.current + 1) % this.participants.length;
    return new Encounter(this.participants, next, true);
  }
}
