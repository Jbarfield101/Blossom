export type PromptType = 'video' | 'image';

export function generatePrompt(text: string, type: PromptType): string {
  const cleaned = text.trim();
  if (!cleaned) return '';
  return type === 'video'
    ? `Generate a short video about ${cleaned}.`
    : `Generate a detailed image of ${cleaned}.`;
}
