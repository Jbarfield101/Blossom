import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function exportNpcPdf(npc: unknown, outPath: string) {
  const templateSrc = await readFile(
    join('dnd', 'templates', 'npc.hbs'),
    'utf8'
  );
  const css = await readFile(join('dnd', 'templates', 'npc.css'), 'utf8');
  const template = Handlebars.compile(templateSrc);
  const html = `<style>${css}</style>` + template(npc);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({ path: outPath, format: 'A4', printBackground: true });
  await browser.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [npcFile, outFile = 'npc.pdf'] = process.argv.slice(2);
  const data = JSON.parse(await readFile(npcFile, 'utf8'));
  await exportNpcPdf(data, outFile);
}

