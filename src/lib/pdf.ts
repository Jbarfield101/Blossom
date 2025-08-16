export async function exportPdf(markdown: string) {
  const pdf = (window as any).pdf;
  if (pdf && typeof pdf.generate === 'function') {
    await pdf.generate(markdown);
  } else {
    throw new Error('pdf.generate not available');
  }
}
