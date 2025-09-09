export type PromptType = 'video' | 'image' | 'seo';

export function generatePrompt(text: string, type: PromptType): string {
  const cleaned = text.trim();
  if (!cleaned) return '';

  switch (type) {
    case 'video':
      return `Generate a short video about ${cleaned}.`;
    case 'image':
      return `Generate a detailed image combining ${cleaned}.`;
    case 'seo':
      return `Create SEO optimized copy about ${cleaned}.`;
    default:
      return '';
  }
}
