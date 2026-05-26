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

// ─── Constants ───────────────────────────────────────────────────────

const ROOT = path.resolve(import.meta.dirname ?? process.cwd(), '..');
const TEMP_DIR = path.join(ROOT, 'temp');

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
  return str
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

// ─── Validation ──────────────────────────────────────────────────────

function validateConfig(config: Record<string, unknown>): config is GameConfig {
  const errors: string[] = [];

  const requireString = (key: string, pattern?: RegExp) => {
    const val = config[key];
    if (typeof val !== 'string' || val.length === 0) {
      errors.push(`'${key}' mora biti neprazan string`);
    } else if (pattern && !pattern.test(val)) {
      errors.push(`'${key}' ne odgovara paternu ${pattern}`);
    }
  };

  const requireNumber = (key: string, min?: number) => {
    const val = config[key];
    if (typeof val !== 'number' || !Number.isInteger(val)) {
      errors.push(`'${key}' mora biti ceo broj`);
    } else if (min !== undefined && val < min) {
      errors.push(`'${key}' mora biti >= ${min}`);
    }
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

  if (!Array.isArray(config.tags) || config.tags.length === 0) {
    errors.push("'tags' mora biti neprazan niz stringova");
  }

  const gt = config.gameType as Record<string, unknown> | undefined;
  if (!gt || typeof gt !== 'object') {
    errors.push("'gameType' mora biti objekat");
  } else {
    if (typeof gt.id !== 'string') errors.push("'gameType.id' mora biti string");
    if (!Array.isArray(gt.statuses) || !gt.statuses.includes('lobby')) {
      errors.push("'gameType.statuses' mora sadržati 'lobby'");
    }
  }

  const files = config.files as Record<string, unknown> | undefined;
  if (!files || typeof files !== 'object') {
    errors.push("'files' mora biti objekat");
  } else {
    if (typeof files.types !== 'string') errors.push("'files.types' mora biti string");
    if (typeof files.firestore !== 'string') errors.push("'files.firestore' mora biti string");
    if (typeof files.components !== 'string') errors.push("'files.components' mora biti string");
    const pages = files.pages as Record<string, unknown> | undefined;
    if (!pages || typeof pages.home !== 'string' || typeof pages.room !== 'string') {
      errors.push("'files.pages' mora imati 'home' i 'room' stringove");
    }
  }

  if (errors.length > 0) {
    logError('Validacija game.config.json nije prošla:');
    errors.forEach((e) => console.error(`  - ${e}`));
    return false;
  }
  return true;
}

// ─── Import Adaptation ──────────────────────────────────────────────

function adaptImports(content: string, gameId: string): string {
  let result = content;

  // === Absolute imports (@/) ===

  // @/lib/types → @/lib/types/{gameId}
  result = result.replace(
    /from\s+['"]@\/lib\/types['"]/g,
    `from '@/lib/types/${gameId}'`
  );

  // @/lib/firestore → @/lib/firestore/{gameId}
  result = result.replace(
    /from\s+['"]@\/lib\/firestore['"]/g,
    `from '@/lib/firestore/${gameId}'`
  );

  // @/components/screens/X → @/components/games/{gameId}/X
  result = result.replace(
    /from\s+['"]@\/components\/screens\/([^'"]+)['"]/g,
    `from '@/components/games/${gameId}/$1'`
  );

  // @/components/ui/X → @/components/shared/X
  result = result.replace(
    /from\s+['"]@\/components\/ui\/([^'"]+)['"]/g,
    `from '@/components/shared/$1'`
  );

  // === Relative imports (./ and ../) ===

  // ./firebase or ../firebase → @/lib/firebase
  result = result.replace(
    /from\s+['"](\.\.?\/)+firebase['"]/g,
    `from '@/lib/firebase'`
  );

  // ./types or ../types → @/lib/types/{gameId}
  result = result.replace(
    /from\s+['"](\.\.?\/)+types['"]/g,
    `from '@/lib/types/${gameId}'`
  );

  // ./types/core or ../types/core → @/lib/types/core
  result = result.replace(
    /from\s+['"](\.\.?\/)+types\/core['"]/g,
    `from '@/lib/types/core'`
  );

  // ./utils or ../utils → @/lib/utils
  result = result.replace(
    /from\s+['"](\.\.?\/)+utils['"]/g,
    `from '@/lib/utils'`
  );

  // ./prompts/index or ../prompts/index or ./prompts or ../prompts → @/lib/prompts/index
  result = result.replace(
    /from\s+['"](\.\.?\/)+prompts(?:\/index)?['"]/g,
    `from '@/lib/prompts/index'`
  );

  // ./firestore/core or ../firestore/core → @/lib/firestore/core
  result = result.replace(
    /from\s+['"](\.\.?\/)+firestore\/core['"]/g,
    `from '@/lib/firestore/core'`
  );

  // ./firestore or ../firestore → @/lib/firestore/{gameId}
  result = result.replace(
    /from\s+['"](\.\.?\/)+firestore['"]/g,
    `from '@/lib/firestore/${gameId}'`
  );

  // ../hooks/usePlayer or ./hooks/usePlayer → @/hooks/usePlayer
  result = result.replace(
    /from\s+['"](\.\.?\/)+hooks\/usePlayer['"]/g,
    `from '@/hooks/usePlayer'`
  );

  // ../hooks/useRoom or ./hooks/useRoom → @/hooks/useRoom
  result = result.replace(
    /from\s+['"](\.\.?\/)+hooks\/useRoom['"]/g,
    `from '@/hooks/useRoom'`
  );

  return result;
}

// ─── Room Page Adaptation ────────────────────────────────────────────

function findRoomTypeName(typesFilePath: string): string | null {
  if (!fs.existsSync(typesFilePath)) return null;
  const content = fs.readFileSync(typesFilePath, 'utf-8');
  const match = content.match(/export\s+interface\s+(\w+Room)\s+extends\s+BaseRoom/);
  if (match) return match[1];
  const match2 = content.match(/export\s+interface\s+(\w+Room)\s*\{/);
  return match2 ? match2[1] : null;
}

function adaptRoomPage(content: string, gameId: string, roomTypeName: string): string {
  let result = content;

  // useRoom(code) → useRoom<ImpostorRoom>(code)
  result = result.replace(
    /useRoom\s*\(\s*code\s*\)/g,
    `useRoom<${roomTypeName}>(code)`
  );

  // Add import for Room type if not already present
  if (!result.includes(`import`) || !result.includes(roomTypeName)) {
    const typesImportPath = `@/lib/types/${gameId}`;
    // Check if there's already an import from this path
    const existingImport = new RegExp(
      `import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${typesImportPath.replace(/\//g, '\\/')}['"]`
    );
    const existingMatch = result.match(existingImport);
    if (existingMatch) {
      // Add roomTypeName to existing import
      const imports = existingMatch[1];
      if (!imports.includes(roomTypeName)) {
        result = result.replace(
          existingImport,
          `import {${imports}, ${roomTypeName} } from '${typesImportPath}'`
        );
      }
    } else {
      // Add new import line after 'use client' or at the top
      const importLine = `import { ${roomTypeName} } from '${typesImportPath}';\n`;
      if (result.includes("'use client'")) {
        result = result.replace(
          /('use client';?\s*\n)/,
          `$1\n${importLine}`
        );
      } else {
        result = importLine + result;
      }
    }
  }

  return result;
}

// ─── File Operations ─────────────────────────────────────────────────

function copyFileAdapted(
  src: string,
  dest: string,
  gameId: string,
  state: RollbackState
): void {
  if (!fs.existsSync(src)) {
    logError(`Fajl ne postoji: ${src}`);
    return;
  }
  let content = fs.readFileSync(src, 'utf-8');
  if (src.endsWith('.ts') || src.endsWith('.tsx')) {
    content = adaptImports(content, gameId);
  }
  writeFileTracked(dest, content, state);
}

function copyDirAdapted(
  srcDir: string,
  destDir: string,
  gameId: string,
  state: RollbackState
): void {
  if (!fs.existsSync(srcDir)) {
    logError(`Folder ne postoji: ${srcDir}`);
    return;
  }
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirAdapted(srcPath, destPath, gameId, state);
    } else {
      copyFileAdapted(srcPath, destPath, gameId, state);
    }
  }
}

// ─── Copy Game Files ─────────────────────────────────────────────────

function copyTypes(config: GameConfig, tempGameDir: string, state: RollbackState): void {
  const src = path.join(tempGameDir, config.files.types);
  const dest = path.join(ROOT, 'lib', 'types', `${config.id}.ts`);
  log(`Kopiram tipove: ${config.files.types} → lib/types/${config.id}.ts`);
  copyFileAdapted(src, dest, config.id, state);
}

function copyFirestore(config: GameConfig, tempGameDir: string, state: RollbackState): void {
  const src = path.join(tempGameDir, config.files.firestore);
  const dest = path.join(ROOT, 'lib', 'firestore', `${config.id}.ts`);
  log(`Kopiram firestore: ${config.files.firestore} → lib/firestore/${config.id}.ts`);
  copyFileAdapted(src, dest, config.id, state);
}

function copyPrompts(config: GameConfig, tempGameDir: string, state: RollbackState): void {
  if (!config.files.prompts) return;
  const src = path.join(tempGameDir, config.files.prompts);
  if (!fs.existsSync(src)) return;
  const dest = path.join(ROOT, 'lib', 'prompts');
  log(`Kopiram prompts: ${config.files.prompts} → lib/prompts/`);
  copyDirAdapted(src, dest, config.id, state);
}

function copyComponents(config: GameConfig, tempGameDir: string, state: RollbackState): void {
  const src = path.join(tempGameDir, config.files.components);
  const dest = path.join(ROOT, 'components', 'games', config.id);
  log(`Kopiram komponente: ${config.files.components} → components/games/${config.id}/`);
  copyDirAdapted(src, dest, config.id, state);
}

function copyPages(config: GameConfig, tempGameDir: string, state: RollbackState): void {
  const { home, room } = config.files.pages;

  // Detect room type name from the types file
  const typesPath = path.join(ROOT, 'lib', 'types', `${config.id}.ts`);
  const roomTypeName = findRoomTypeName(typesPath) ?? `${toPascalCase(config.id)}Room`;
  log(`Detektovan Room tip: ${roomTypeName}`);

  // Copy home page
  const homeSrc = path.join(tempGameDir, home);
  const homeDest = path.join(ROOT, 'app', 'games', config.id, 'page.tsx');
  log(`Kopiram home stranicu: ${home} → app/games/${config.id}/page.tsx`);
  copyFileAdapted(homeSrc, homeDest, config.id, state);

  // Copy room page with extra adaptation
  const roomSrc = path.join(tempGameDir, room);
  const roomDest = path.join(ROOT, 'app', 'games', config.id, 'room', '[code]', 'page.tsx');
  log(`Kopiram room stranicu: ${room} → app/games/${config.id}/room/[code]/page.tsx`);

  if (fs.existsSync(roomSrc)) {
    let content = fs.readFileSync(roomSrc, 'utf-8');
    content = adaptImports(content, config.id);
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

  if (!state.modifiedFiles.has(registryPath)) {
    state.modifiedFiles.set(registryPath, content);
  }

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
    const entryRegex = new RegExp(
      `\\{[^}]*id:\\s*'${config.id}'[^}]*\\}`,
      's'
    );
    if (entryRegex.test(content)) {
      content = content.replace(entryRegex, newEntry.trim());
      log(`Registry entry za '${config.id}' ažuriran.`);
    }
  } else {
    content = content.replace(
      /^(\];)/m,
      `${newEntry},\n$1`
    );
    log(`Registry entry za '${config.id}' dodat.`);
  }

  fs.writeFileSync(registryPath, content, 'utf-8');
}

// ─── GameType Update ─────────────────────────────────────────────────

function updateGameType(gameId: string, state: RollbackState): void {
  const corePath = path.join(ROOT, 'lib', 'types', 'core.ts');
  let content = fs.readFileSync(corePath, 'utf-8');

  if (!state.modifiedFiles.has(corePath)) {
    state.modifiedFiles.set(corePath, content);
  }

  const typeRegex = /export\s+type\s+GameType\s*=\s*([^;]+);/;
  const match = content.match(typeRegex);
  if (!match) {
    logError('Ne mogu pronaći GameType union u core.ts');
    return;
  }

  const currentUnion = match[1];
  if (currentUnion.includes(`'${gameId}'`)) {
    log(`GameType već sadrži '${gameId}'.`);
    return;
  }

  const newUnion = `${currentUnion.trim()} | '${gameId}'`;
  content = content.replace(typeRegex, `export type GameType = ${newUnion};`);
  fs.writeFileSync(corePath, content, 'utf-8');
  log(`GameType ažuriran: dodato '${gameId}'.`);
}

// ─── Rollback ────────────────────────────────────────────────────────

function rollback(state: RollbackState): void {
  log('Pokrećem rollback...');

  for (const file of state.createdFiles) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }

  for (const dir of state.createdDirs.reverse()) {
    try {
      fs.rmdirSync(dir);
    } catch {
      // folder nije prazan — ostavljamo ga
    }
  }

  for (const [file, original] of state.modifiedFiles) {
    fs.writeFileSync(file, original, 'utf-8');
  }

  logSuccess('Rollback završen — sve vraćeno na prethodno stanje.');
}

// ─── Cleanup ─────────────────────────────────────────────────────────

function cleanupTemp(): void {
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

// ─── Main ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const repoUrl = process.argv[2];
  if (!repoUrl) {
    logError('Korišćenje: npx tsx scripts/add-game.ts <github-repo-url>');
    logError('Primer: npx tsx scripts/add-game.ts https://github.com/Bogdan-Danilovic/Impostor-Web');
    process.exit(1);
  }

  log(`Repo URL: ${repoUrl}`);

  // 1. Clone
  cleanupTemp();
  log('Kloniram repo...');
  try {
    run(`git clone --depth 1 "${repoUrl}" "${TEMP_DIR}"`);
  } catch (err) {
    logError(`Kloniranje nije uspelo: ${err instanceof Error ? err.message : err}`);
    cleanupTemp();
    process.exit(1);
  }

  // 2. Read config
  const configPath = path.join(TEMP_DIR, 'game.config.json');
  if (!fs.existsSync(configPath)) {
    logError('game.config.json ne postoji u repou. Pogledaj GAME_STANDARD.md za format.');
    cleanupTemp();
    process.exit(1);
  }

  let rawConfig: Record<string, unknown>;
  try {
    rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    logError('game.config.json nije validan JSON.');
    cleanupTemp();
    process.exit(1);
  }

  // 3. Validate
  if (!validateConfig(rawConfig)) {
    cleanupTemp();
    process.exit(1);
  }

  const config = rawConfig as unknown as GameConfig;
  logSuccess(`Config validan: ${config.name} (${config.id}) v${config.version}`);

  // 4. Check if game already exists
  const registryPath = path.join(ROOT, 'lib', 'games', 'registry.ts');
  const registryContent = fs.readFileSync(registryPath, 'utf-8');
  const gameExists = registryContent.includes(`id: '${config.id}'`);

  let isUpdate = false;
  if (gameExists) {
    const answer = await ask(`Igra '${config.id}' već postoji u registry-ju. Ažuriraj? [y/N]`);
    if (answer !== 'y' && answer !== 'da') {
      log('Odustajanje.');
      cleanupTemp();
      process.exit(0);
    }
    isUpdate = true;
    log('Režim: UPDATE postojeće igre.');
  } else {
    log('Režim: DODAVANJE nove igre.');
  }

  // 5. Start copying with rollback tracking
  const state: RollbackState = {
    createdFiles: [],
    createdDirs: [],
    modifiedFiles: new Map(),
  };

  try {
    // Copy types (must be first — room page reads this to detect type name)
    copyTypes(config, TEMP_DIR, state);

    // Copy firestore
    copyFirestore(config, TEMP_DIR, state);

    // Copy prompts
    copyPrompts(config, TEMP_DIR, state);

    // Copy components
    copyComponents(config, TEMP_DIR, state);

    // Copy pages (reads types file to detect Room type name)
    copyPages(config, TEMP_DIR, state);

    // Update registry
    updateRegistry(config, isUpdate, state);

    // Update GameType union (only for new games)
    if (!isUpdate) {
      updateGameType(config.id, state);
    }

    logSuccess('Svi fajlovi kopirani i importi adaptirani.');

    // 6. Cleanup temp
    cleanupTemp();
    log('temp/ obrisan.');

    // 7. Build check
    log('Pokrećem npm run build...');
    try {
      run('npm run build', ROOT);
      logSuccess('Build USPEŠAN!');
    } catch (err) {
      logError('Build NIJE PROŠAO!');
      if (err instanceof Error) {
        console.error(err.message.slice(0, 2000));
      }
      rollback(state);
      process.exit(1);
    }

    // 8. Git commit + push
    log('Kreiram git commit...');
    const verb = isUpdate ? 'Update' : 'Add';
    try {
      run('git add -A', ROOT);
      run(
        `git commit -m "${verb} game: ${config.name} v${config.version}"`,
        ROOT
      );
      log('Git push...');
      run('git push', ROOT);
      logSuccess(`Gotovo! ${config.name} je ${isUpdate ? 'ažuriran' : 'dodat'} u Game Hub.`);
    } catch (err) {
      logError(`Git operacija nije uspela: ${err instanceof Error ? err.message : err}`);
      logError('Fajlovi su kopirani ali commit/push nije prošao. Proveri ručno.');
      process.exit(1);
    }
  } catch (err) {
    logError(`Greška tokom kopiranja: ${err instanceof Error ? err.message : err}`);
    cleanupTemp();
    rollback(state);
    process.exit(1);
  }
}

main().catch((err) => {
  logError(`Neočekivana greška: ${err instanceof Error ? err.message : err}`);
  cleanupTemp();
  process.exit(1);
});
