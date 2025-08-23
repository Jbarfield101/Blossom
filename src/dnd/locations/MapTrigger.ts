import type { Quest } from '../quests';

export class MapTrigger {
  id: string;
  objectiveIndex: number;

  constructor(id: string, objectiveIndex: number) {
    this.id = id;
    this.objectiveIndex = objectiveIndex;
  }

  interact(quest: Quest) {
    quest.completeObjective(this.objectiveIndex);
  }
}
