import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let mod: typeof import('./index');
let cwd: string;
let dir: string;

beforeEach(async () => {
  cwd = process.cwd();
  dir = mkdtempSync(join(tmpdir(), 'dbtest-'));
  process.chdir(dir);
  vi.resetModules();
  mod = await import('./index');
  mod.initDb();
});

afterEach(() => {
  process.chdir(cwd);
  rmSync(dir, { recursive: true, force: true });
});

it('creates items with tags and updates them', () => {
  mod.createTag('weapon');
  mod.createTag('magic');

  mod.createItem({ id: '1', name: 'Sword', tags: ['weapon'] });
  let item = mod.getItem('1');
  expect(item?.tags).toEqual(['weapon']);

  mod.updateItem({ id: '1', name: 'Sword', tags: ['weapon', 'magic'] });
  item = mod.getItem('1');
  expect(item?.tags?.sort()).toEqual(['magic', 'weapon']);

  const tags = mod.listTags().map((t) => t.name).sort();
  expect(tags).toEqual(['magic', 'weapon']);

  mod.deleteItem('1');
  expect(mod.getItem('1')).toBeNull();
});

