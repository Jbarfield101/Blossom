export type PromptType = 'video' | 'image' | 'music' | 'dnd';

export function generatePrompt(text: string, type: PromptType): string {
  const cleaned = text.trim();
  if (!cleaned) return '';

  switch (type) {
    case 'video':
      return `Generate a short video about ${cleaned}.`;
    case 'image':
      return `Generate a detailed image of ${cleaned}.`;
    case 'music':
      return `Compose a short piece of music about ${cleaned}.`;
    case 'dnd':
      return `Create a DND campaign idea involving ${cleaned}.`;
    default:
      return '';
  }
}
