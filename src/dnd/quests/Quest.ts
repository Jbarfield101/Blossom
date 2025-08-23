export interface QuestObjective {
  description: string;
  completed: boolean;
}

export interface QuestReward {
  experience?: number;
  items?: string[];
}

export type QuestStatus = 'active' | 'completed';

export class Quest {
  title: string;
  objectives: QuestObjective[];
  reward: QuestReward;
  status: QuestStatus;

  constructor(
    title: string,
    objectives: QuestObjective[],
    reward: QuestReward,
    status: QuestStatus = 'active'
  ) {
    this.title = title;
    this.objectives = objectives;
    this.reward = reward;
    this.status = status;
  }

  completeObjective(index: number) {
    if (index < 0 || index >= this.objectives.length) return;
    this.objectives[index].completed = true;
    if (this.objectives.every((o) => o.completed)) {
      this.status = 'completed';
    }
  }
}
