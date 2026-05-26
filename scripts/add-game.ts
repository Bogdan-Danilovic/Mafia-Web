#!/usr/bin/env npx tsx
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ─── Types ───────────────────────────────────────────────────────────

interface GameConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  shortDescription: string;
  icon: string;
  accentColor: string;
  minPlayers: number;
  maxPlayers: number;
  avgDuration: string;
  tags: string[];
  gameType: {
    id: string;
    statuses: string[];
  };
  files: {
    types: string;
    firestore: string;
    utils?: string;
    prompts?: string;
    components: string;
    pages: {
      home: string;
      room: string;
    };
  };
  sharedDependencies?: {
    components?: string[];
    hooks?: string[];
    lib?: string[];
  };
  npmDependencies?: Record<string, string>;
}

interface RollbackState {
  createdFiles: string[];
  createdDirs: string[];
  modifiedFiles: Map<string, string>;
}

interface TypeRenameMap {
  from: string;
  to: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const ROOT = path.resolve(import.meta.dirname ?? process.cwd(), '..');
const TEMP_DIR = path.join(ROOT, 'temp');

const BASE_PLAYER_FIELDS = ['id', 'name', 'isConnected', 'isHost', 'joinedAt'];
const BASE_ROOM_FIELDS = ['code', 'status', 'hostId', 'createdAt'];

// ─── Utility ─────────────────────────────────────────────────────────

function log(msg: string): void {
  console.log(`\x1b[36m[add-game]\x1b[0m ${msg}`);
}
function logError(msg: string): void {
  console.error(`\x1b[31m[add-game] ERROR:\x1b[0m ${msg}`);
}
function logSuccess(msg: string): void {
  console.log(`\x1b[32m[add-game]\x1b[0m ${msg}`);
}
function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`\x1b[33m[add-game]\x1b[0m ${question} `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}
function run(cmd: string, cwd?: string): string {
  return execSync(cmd, { cwd: cwd ?? ROOT, encoding: 'utf-8', stdio: 'pipe' }).trim();
}
function ensureDir(dir: string, state: RollbackState): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    state.createdDirs.push(dir);
  }
}
function writeFileTracked(filePath: string, content: string, state: RollbackState): void {
  const dir = path.dirname(filePath);
  ensureDir(dir, state);
  if (fs.existsSync(filePath)) {
    if (!state.modifiedFiles.has(filePath)) {
      state.modifiedFiles.set(filePath, fs.readFileSync(filePath, 'utf-8'));
    }
  } else {
    state.createdFiles.push(filePath);
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}
function toPascalCase(str: string): string {
  return str.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

// ─── Validation ──────────────────────────────────────────────────────

function validateConfig(config: Record<string, unknown>): config is GameConfig {
  const errors: string[] = [];
  const requireString = (key: string, pattern?: RegExp) => {
    const val = config[key];
    if (typeof val !== 'string' || val.length === 0) errors.push(`'${key}' mora biti neprazan string`);
    else if (pattern && !pattern.test(val)) errors.push(`'${key}' ne odgovara paternu ${pattern}`);
  };
  const requireNumber = (key: string, min?: number) => {
    const val = config[key];
    if (typeof val !== 'number' || !Number.isInteger(val)) errors.push(`'${key}' mora biti ceo broj`);
    else if (min !== undefined && val < min) errors.push(`'${key}' mora biti >= ${min}`);
  };
  requireString('id', /^[a-z][a-z0-9-]*$/);
  requireString('name');
  requireString('version', /^\d+\.\d+\.\d+$/);
  requireString('description');
  requireString('shortDescription');
  requireString('icon');
  requireString('accentColor', /^#[0-9a-fA-F]{6}$/);
  requireNumber('minPlayers', 1);
  requireNumber('maxPlayers', 1);
  requireString('avgDuration');
  if (!Array.isArray(config.tags) || config.tags.length === 0) errors.push("'tags' mora biti neprazan niz stringova");
  const gt = config.gameType as Record<string, unknown> | undefined;
  if (!gt || typeof gt !== 'object') errors.push("'gameType' mora biti objekat");
  else {
    if (typeof gt.id !== 'string') errors.push("'gameType.id' mora biti string");
    if (!Array.isArray(gt.statuses) || !gt.statuses.includes('lobby')) errors.push("'gameType.statuses' mora sadržati 'lobby'");
  }
  const files = config.files as Record<string, unknown> | undefined;
  if (!files || typeof files !== 'object') errors.push("'files' mora biti objekat");
  else {
    if (typeof files.types !== 'string') errors.push("'files.types' mora biti string");
    if (typeof files.firestore !== 'string') errors.push("'files.firestore' mora biti string");
    if (typeof files.components !== 'string') errors.push("'files.components' mora biti string");
    const pages = files.pages as Record<string, unknown> | undefined;
    if (!pages || typeof pages.home !== 'string' || typeof pages.room !== 'string') errors.push("'files.pages' mora imati 'home' i 'room' stringove");
  }
  if (errors.length > 0) {
    logError('Validacija game.config.json nije prošla:');
    errors.forEach((e) => console.error(`  - ${e}`));
    return false;
  }
  return true;
}

// ─── Type Name Renames ───────────────────────────────────────────────

function detectTypeRenames(typesContent: string, prefix: string): TypeRenameMap[] {
  const renames: TypeRenameMap[] = [];
  const candidates: Array<{ pattern: RegExp; from: string; toSuffix: string }> = [
    { pattern: /export\s+interface\s+RoomSettings\b/, from: 'RoomSettings', toSuffix: 'Settings' },
    { pattern: /export\s+interface\s+Player\b/, from: 'Player', toSuffix: 'Player' },
    { pattern: /export\s+interface\s+Room\s*\{/, from: 'Room', toSuffix: 'Room' },
  ];
  for (const c of candidates) {
    if (c.pattern.test(typesContent)) {
      const to = `${prefix}${c.toSuffix}`;
      if (c.from !== to) renames.push({ from: c.from, to });
    }
  }
  return renames;
}

function applyTypeRenames(content: string, renames: TypeRenameMap[]): string {
  let result = content;
  for (const r of renames) {
    if (r.from === 'Room') {
      result = result.replace(new RegExp(`(?<!Base)\\b${r.from}\\b(?!Status|Settings)`, 'g'), r.to);
    } else if (r.from === 'Player') {
      result = result.replace(new RegExp(`(?<!Base)\\b${r.from}\\b`, 'g'), r.to);
    } else {
      result = result.replace(new RegExp(`\\b${r.from}\\b`, 'g'), r.to);
    }
  }
  return result;
}

// ─── Types File Transformation ───────────────────────────────────────

function adaptTypesFile(content: string, gameId: string, prefix: string): string {
  let result = content;

  // Remove 'use client' — types files don't need it
  result = result.replace(/^'use client';?\s*\n/, '');

  // Remove standalone RoomStatus definition (comes from core.ts)
  result = result.replace(
    /export\s+type\s+RoomStatus\s*=\s*[\s\S]*?;\s*\n\n?/,
    ''
  );

  // Remove base Player fields
  for (const field of BASE_PLAYER_FIELDS) {
    result = result.replace(new RegExp(`^\\s*${field}\\??:\\s*[^;]+;\\s*\\n`, 'gm'), '');
  }

  // Remove base Room fields
  for (const field of BASE_ROOM_FIELDS) {
    result = result.replace(new RegExp(`^\\s*${field}\\??:\\s*[^;]+;\\s*\\n`, 'gm'), '');
  }

  // Add extends BasePlayer
  result = result.replace(
    new RegExp(`(export\\s+interface\\s+${prefix}Player)\\s*\\{`),
    `$1 extends BasePlayer {`
  );

  // Add extends BaseRoom + gameType field
  result = result.replace(
    new RegExp(`(export\\s+interface\\s+${prefix}Room)\\s*\\{`),
    `$1 extends BaseRoom {\n  gameType: '${gameId}';`
  );

  // Add extends GameSettings
  result = result.replace(
    new RegExp(`(export\\s+interface\\s+${prefix}Settings)\\s*\\{`),
    `$1 extends GameSettings {`
  );

  // Add core import at the top
  const coreImport = `import { BasePlayer, BaseRoom, GameSettings } from './core';\n\nexport type { RoomStatus } from './core';\n\n`;
  result = coreImport + result;

  return result;
}

// ─── Import Adaptation ──────────────────────────────────────────────

function adaptImports(content: string, gameId: string): string {
  let result = content;
  result = result.replace(/from\s+['"]@\/lib\/types['"]/g, `from '@/lib/types/${gameId}'`);
  result = result.replace(/from\s+['"]@\/lib\/firestore['"]/g, `from '@/lib/firestore/${gameId}'`);
  result = result.replace(/from\s+['"]@\/components\/screens\/([^'"]+)['"]/g, `from '@/components/games/${gameId}/$1'`);
  result = result.replace(/from\s+['"]@\/components\/ui\/([^'"]+)['"]/g, `from '@/components/shared/$1'`);
  result = result.replace(/from\s+['"](\.\.?\/)+firebase['"]/g, `from '@/lib/firebase'`);
  result = result.replace(/from\s+['"](\.\.?\/)+types\/core['"]/g, `from '@/lib/types/core'`);
  result = result.replace(/from\s+['"](\.\.?\/)+types['"]/g, `from '@/lib/types/${gameId}'`);
  result = result.replace(/from\s+['"](\.\.?\/)+utils['"]/g, `from '@/lib/utils'`);
  result = result.replace(/from\s+['"](\.\.?\/)+prompts(?:\/index)?['"]/g, `from '@/lib/prompts/index'`);
  result = result.replace(/from\s+['"](\.\.?\/)+prompts\/([^'"]+)['"]/g, `from '@/lib/prompts/$2'`);
  result = result.replace(/from\s+['"](\.\.?\/)+firestore\/core['"]/g, `from '@/lib/firestore/core'`);
  result = result.replace(/from\s+['"](\.\.?\/)+firestore['"]/g, `from '@/lib/firestore/${gameId}'`);
  result = result.replace(/from\s+['"](\.\.?\/)+hooks\/usePlayer['"]/g, `from '@/hooks/usePlayer'`);
  result = result.replace(/from\s+['"](\.\.?\/)+hooks\/useRoom['"]/g, `from '@/hooks/useRoom'`);
  return result;
}

// ─── Room Page Adaptation ────────────────────────────────────────────

function findRoomTypeName(typesFilePath: string): string | null {
  if (!fs.existsSync(typesFilePath)) return null;
  const content = fs.readFileSync(typesFilePath, 'utf-8');
  const match = content.match(/export\s+interface\s+(\w+Room)\s/);
  return match ? match[1] : null;
}

function hasImportFor(content: string, typeName: string): boolean {
  return new RegExp(`import\\s+\\{[^}]*\\b${typeName}\\b[^}]*\\}\\s+from\\s+['"]`).test(content);
}

function adaptRoomPage(content: string, gameId: string, roomTypeName: string): string {
  let result = content;
  result = result.replace(/useRoom\s*\(\s*code\s*\)/g, `useRoom<${roomTypeName}>(code)`);
  if (!hasImportFor(result, roomTypeName)) {
    const typesImportPath = `@/lib/types/${gameId}`;
    const escapedPath = typesImportPath.replace(/\//g, '\\/');
    const existingImportRegex = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapedPath}['"]`);
    const existingMatch = result.match(existingImportRegex);
    if (existingMatch) {
      const currentImports = existingMatch[1].trim();
      result = result.replace(existingImportRegex, `import { ${currentImports}, ${roomTypeName} } from '${typesImportPath}'`);
    } else {
      const importLine = `import { ${roomTypeName} } from '${typesImportPath}';`;
      const useClientRegex = /^'use client';?\s*\n/m;
      if (useClientRegex.test(result)) {
        result = result.replace(useClientRegex, `$&${importLine}\n`);
      } else {
        result = `${importLine}\n${result}`;
      }
    }
  }
  return result;
}

// ─── Firestore File Transformation ───────────────────────────────────

function adaptFirestoreFile(content: string, gameId: string): string {
  let result = content;

  // Remove local roomRef function (it's in core.ts)
  result = result.replace(
    /function roomRef\([^)]*\)\s*\{[^}]*\}\s*\n\n?/,
    ''
  );

  // Remove local subscribeToRoom export (it's in core.ts)
  result = result.replace(
    /export\s+function\s+subscribeToRoom\s*\([\s\S]*?\n\}\s*\n\n?/,
    ''
  );

  // Remove doc and onSnapshot from firebase/firestore imports
  result = result.replace(/\s*doc,\s*\n/g, '\n');
  result = result.replace(/\s*onSnapshot,\s*\n/g, '\n');

  // Add import for roomRef from core after last import
  const coreImportLine = `import { roomRef, subscribeToRoom } from './core';\n`;
  const lastImportMatch = result.match(/^import .+from .+;\s*$/gm);
  if (lastImportMatch) {
    const lastImport = lastImportMatch[lastImportMatch.length - 1];
    const idx = result.lastIndexOf(lastImport);
    const insertPos = idx + lastImport.length;
    result = result.slice(0, insertPos) + '\n' + coreImportLine + result.slice(insertPos);
  }

  // Add gameType to newRoom return object (after hostId,) if not already present
  if (!/gameType:\s*['"]/.test(result.match(/function\s+newRoom[\s\S]*?return\s*\{[\s\S]*?\}/)?.[0] ?? '')) {
    result = result.replace(
      /(function\s+newRoom[\s\S]*?return\s*\{[\s\S]*?hostId,\s*\n)/,
      `$1    gameType: '${gameId}',\n`
    );
  }

  return result;
}

// ─── File Operations ─────────────────────────────────────────────────

let globalTypeRenames: TypeRenameMap[] = [];

function copyFileAdapted(src: string, dest: string, gameId: string, state: RollbackState): void {
  if (!fs.existsSync(src)) { logError(`Fajl ne postoji: ${src}`); return; }
  let content = fs.readFileSync(src, 'utf-8');
  if (src.endsWith('.ts') || src.endsWith('.tsx')) {
    content = adaptImports(content, gameId);
    if (globalTypeRenames.length > 0) content = applyTypeRenames(content, globalTypeRenames);
  }
  writeFileTracked(dest, content, state);
}

function copyDirAdapted(srcDir: string, destDir: string, gameId: string, state: RollbackState): void {
  if (!fs.existsSync(srcDir)) { logError(`Folder ne postoji: ${srcDir}`); return; }
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) copyDirAdapted(srcPath, destPath, gameId, state);
    else copyFileAdapted(srcPath, destPath, gameId, state);
  }
}

// ─── Copy Game Files ─────────────────────────────────────────────────

function copyTypes(config: GameConfig, tempGameDir: string, prefix: string, state: RollbackState): void {
  const src = path.join(tempGameDir, config.files.types);
  const dest = path.join(ROOT, 'lib', 'types', `${config.id}.ts`);
  log(`Kopiram tipove: ${config.files.types} → lib/types/${config.id}.ts`);

  if (!fs.existsSync(src)) { logError(`Fajl ne postoji: ${src}`); return; }
  let content = fs.readFileSync(src, 'utf-8');
  content = adaptImports(content, config.id);
  if (globalTypeRenames.length > 0) content = applyTypeRenames(content, globalTypeRenames);
  content = adaptTypesFile(content, config.id, prefix);
  writeFileTracked(dest, content, state);
}

function copyFirestore(config: GameConfig, tempGameDir: string, state: RollbackState): void {
  const src = path.join(tempGameDir, config.files.firestore);
  const dest = path.join(ROOT, 'lib', 'firestore', `${config.id}.ts`);
  log(`Kopiram firestore: ${config.files.firestore} → lib/firestore/${config.id}.ts`);

  if (!fs.existsSync(src)) { logError(`Fajl ne postoji: ${src}`); return; }
  let content = fs.readFileSync(src, 'utf-8');
  content = adaptImports(content, config.id);
  if (globalTypeRenames.length > 0) content = applyTypeRenames(content, globalTypeRenames);
  content = adaptFirestoreFile(content, config.id);
  writeFileTracked(dest, content, state);
}

function copyPrompts(config: GameConfig, tempGameDir: string, state: RollbackState): void {
  if (!config.files.prompts) return;
  const src = path.join(tempGameDir, config.files.prompts);
  if (!fs.existsSync(src)) return;
  const destDir = path.join(ROOT, 'lib', 'prompts');
  log(`Kopiram prompts: ${config.files.prompts} → lib/prompts/`);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.name === 'index.ts' && fs.existsSync(destPath)) {
      log(`Preskačem prompts/index.ts (već postoji)`);
      continue;
    }
    if (entry.isDirectory()) copyDirAdapted(srcPath, destPath, config.id, state);
    else copyFileAdapted(srcPath, destPath, config.id, state);
  }
}

function copyComponents(config: GameConfig, tempGameDir: string, state: RollbackState): void {
  const src = path.join(tempGameDir, config.files.components);
  const dest = path.join(ROOT, 'components', 'games', config.id);
  log(`Kopiram komponente: ${config.files.components} → components/games/${config.id}/`);
  copyDirAdapted(src, dest, config.id, state);
}

function copyPages(config: GameConfig, tempGameDir: string, state: RollbackState): void {
  const { home, room } = config.files.pages;
  const typesPath = path.join(ROOT, 'lib', 'types', `${config.id}.ts`);
  const roomTypeName = findRoomTypeName(typesPath) ?? `${toPascalCase(config.id)}Room`;
  log(`Detektovan Room tip: ${roomTypeName}`);

  const homeSrc = path.join(tempGameDir, home);
  const homeDest = path.join(ROOT, 'app', 'games', config.id, 'page.tsx');
  log(`Kopiram home: ${home} → app/games/${config.id}/page.tsx`);
  copyFileAdapted(homeSrc, homeDest, config.id, state);

  const roomSrc = path.join(tempGameDir, room);
  const roomDest = path.join(ROOT, 'app', 'games', config.id, 'room', '[code]', 'page.tsx');
  log(`Kopiram room: ${room} → app/games/${config.id}/room/[code]/page.tsx`);
  if (fs.existsSync(roomSrc)) {
    let content = fs.readFileSync(roomSrc, 'utf-8');
    content = adaptImports(content, config.id);
    if (globalTypeRenames.length > 0) content = applyTypeRenames(content, globalTypeRenames);
    content = adaptRoomPage(content, config.id, roomTypeName);
    writeFileTracked(roomDest, content, state);
  } else {
    logError(`Room page ne postoji: ${roomSrc}`);
  }
}

// ─── Registry Update ─────────────────────────────────────────────────

function updateRegistry(config: GameConfig, isUpdate: boolean, state: RollbackState): void {
  const registryPath = path.join(ROOT, 'lib', 'games', 'registry.ts');
  let content = fs.readFileSync(registryPath, 'utf-8');
  if (!state.modifiedFiles.has(registryPath)) state.modifiedFiles.set(registryPath, content);

  const newEntry = `  {
    id: '${config.id}',
    name: '${config.name}',
    description: '${config.description.replace(/'/g, "\\'")}',
    shortDescription: '${config.shortDescription.replace(/'/g, "\\'")}',
    icon: '${config.icon}',
    accentColor: '${config.accentColor}',
    minPlayers: ${config.minPlayers},
    maxPlayers: ${config.maxPlayers},
    avgDuration: '${config.avgDuration}',
    path: '/games/${config.id}',
    available: true,
    tags: [${config.tags.map((t) => `'${t}'`).join(', ')}],
  }`;

  if (isUpdate) {
    const entryRegex = new RegExp(`\\{[^}]*id:\\s*'${config.id}'[^}]*\\}`, 's');
    if (entryRegex.test(content)) { content = content.replace(entryRegex, newEntry.trim()); log(`Registry '${config.id}' ažuriran.`); }
  } else {
    content = content.replace(/^(\];)/m, `${newEntry},\n$1`);
    log(`Registry '${config.id}' dodat.`);
  }
  fs.writeFileSync(registryPath, content, 'utf-8');
}

function updateGameType(gameId: string, state: RollbackState): void {
  const corePath = path.join(ROOT, 'lib', 'types', 'core.ts');
  let content = fs.readFileSync(corePath, 'utf-8');
  if (!state.modifiedFiles.has(corePath)) state.modifiedFiles.set(corePath, content);

  const typeRegex = /export\s+type\s+GameType\s*=\s*([^;]+);/;
  const match = content.match(typeRegex);
  if (!match) { logError('Ne mogu pronaći GameType union u core.ts'); return; }
  if (match[1].includes(`'${gameId}'`)) { log(`GameType već sadrži '${gameId}'.`); return; }

  content = content.replace(typeRegex, `export type GameType = ${match[1].trim()} | '${gameId}';`);
  fs.writeFileSync(corePath, content, 'utf-8');
  log(`GameType ažuriran: dodato '${gameId}'.`);
}

// ─── Rollback ────────────────────────────────────────────────────────

function rollback(state: RollbackState): void {
  log('Pokrećem rollback...');
  for (const file of state.createdFiles) { if (fs.existsSync(file)) fs.unlinkSync(file); }
  for (const dir of state.createdDirs.reverse()) { try { fs.rmdirSync(dir); } catch { /* not empty */ } }
  for (const [file, original] of state.modifiedFiles) fs.writeFileSync(file, original, 'utf-8');
  logSuccess('Rollback završen.');
}

function cleanupTemp(): void {
  if (fs.existsSync(TEMP_DIR)) fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}

// ─── Main ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const repoUrl = process.argv[2];
  if (!repoUrl) {
    logError('Korišćenje: npx tsx scripts/add-game.ts <github-repo-url>');
    process.exit(1);
  }

  log(`Repo URL: ${repoUrl}`);
  cleanupTemp();
  log('Kloniram repo...');
  try { run(`git clone --depth 1 "${repoUrl}" "${TEMP_DIR}"`); }
  catch (err) { logError(`Kloniranje: ${err instanceof Error ? err.message : err}`); cleanupTemp(); process.exit(1); }

  const configPath = path.join(TEMP_DIR, 'game.config.json');
  if (!fs.existsSync(configPath)) { logError('game.config.json ne postoji.'); cleanupTemp(); process.exit(1); }

  let rawConfig: Record<string, unknown>;
  try { rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8')); }
  catch { logError('game.config.json nije validan JSON.'); cleanupTemp(); process.exit(1); }

  if (!validateConfig(rawConfig)) { cleanupTemp(); process.exit(1); }
  const config = rawConfig as unknown as GameConfig;
  logSuccess(`Config validan: ${config.name} (${config.id}) v${config.version}`);

  const prefix = toPascalCase(config.id);
  const srcTypesPath = path.join(TEMP_DIR, config.files.types);
  if (fs.existsSync(srcTypesPath)) {
    globalTypeRenames = detectTypeRenames(fs.readFileSync(srcTypesPath, 'utf-8'), prefix);
    if (globalTypeRenames.length > 0) {
      log('Preimenovanja tipova:');
      for (const r of globalTypeRenames) log(`  ${r.from} → ${r.to}`);
    }
  }

  const registryPath = path.join(ROOT, 'lib', 'games', 'registry.ts');
  const gameExists = fs.readFileSync(registryPath, 'utf-8').includes(`id: '${config.id}'`);
  let isUpdate = false;
  if (gameExists) {
    const answer = await ask(`Igra '${config.id}' već postoji. Ažuriraj? [y/N]`);
    if (answer !== 'y' && answer !== 'da') { cleanupTemp(); process.exit(0); }
    isUpdate = true;
    log('Režim: UPDATE.');
  } else {
    log('Režim: DODAVANJE.');
  }

  const state: RollbackState = { createdFiles: [], createdDirs: [], modifiedFiles: new Map() };

  try {
    copyTypes(config, TEMP_DIR, prefix, state);
    copyFirestore(config, TEMP_DIR, state);
    copyPrompts(config, TEMP_DIR, state);
    copyComponents(config, TEMP_DIR, state);
    copyPages(config, TEMP_DIR, state);
    updateRegistry(config, isUpdate, state);
    if (!isUpdate) updateGameType(config.id, state);
    logSuccess('Svi fajlovi kopirani i adaptirani.');

    cleanupTemp();

    log('Pokrećem npm run build...');
    try {
      run('npm run build', ROOT);
      logSuccess('Build USPEŠAN!');
    } catch (err) {
      logError('Build NIJE PROŠAO!');
      if (err instanceof Error) console.error(err.message.slice(0, 2000));
      rollback(state);
      process.exit(1);
    }

    const verb = isUpdate ? 'Update' : 'Add';
    try {
      run('git add -A', ROOT);
      run(`git commit -m "${verb} game: ${config.name} v${config.version}"`, ROOT);
      run('git push', ROOT);
      logSuccess(`Gotovo! ${config.name} je ${isUpdate ? 'ažuriran' : 'dodat'} u Game Hub.`);
    } catch (err) {
      logError(`Git: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  } catch (err) {
    logError(`Greška: ${err instanceof Error ? err.message : err}`);
    cleanupTemp();
    rollback(state);
    process.exit(1);
  }
}

main().catch((err) => { logError(`${err instanceof Error ? err.message : err}`); cleanupTemp(); process.exit(1); });
