import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import QuestLog from './QuestLog';
import { Quest } from '../dnd/quests';

describe('QuestLog', () => {
  it('displays active and completed quests', () => {
    const activeQuest = new Quest(
      'Find the Sword',
      [
        { description: 'Reach the cave', completed: true },
        { description: 'Retrieve the sword', completed: false },
      ],
      { experience: 100 }
    );

    const completedQuest = new Quest(
      'Visit the King',
      [{ description: 'Travel to the castle', completed: true }],
      { items: ['Crown'] },
      'completed'
    );

    render(<QuestLog quests={[activeQuest, completedQuest]} />);

    expect(screen.getByText('Active Quests')).toBeInTheDocument();
    expect(screen.getByText('Completed Quests')).toBeInTheDocument();
    expect(screen.getByText('Find the Sword')).toBeInTheDocument();
    expect(screen.getByText('Visit the King')).toBeInTheDocument();
  });
});
