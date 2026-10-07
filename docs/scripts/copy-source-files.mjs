#!/usr/bin/env node
// Copy source files from the kit into the docs build at build time
import { readFileSync, writeFileSync, existsSync, cpSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..');
const publicDir = join(__dirname, '../public');

// Ensure public directory exists
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

// Copy SKILL.md
const skillPath = join(rootDir, 'skills/fleeet-reporting/SKILL.md');
if (existsSync(skillPath)) {
  cpSync(skillPath, join(publicDir, 'skill.md'));
  console.log('✓ Copied SKILL.md → /skill.md');
}

// Read version from SKILL.md frontmatter (if present)
let skillVersion = null;
if (existsSync(skillPath)) {
  const skillContent = readFileSync(skillPath, 'utf-8');
  const match = skillContent.match(/^---\s*\n.*?version:\s*['"]?([^\s'"]+)['"]?\s*\n.*?^---/ms);
  if (match) {
    skillVersion = match[1];
  }
}

// Read package.json version (if exists)
let packageVersion = null;
const packagePath = join(rootDir, 'package.json');
if (existsSync(packagePath)) {
  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  packageVersion = pkg.version || null;
}

// Generate versions.json with only real values (null when not found)
const versions = {
  skill: skillVersion,
  cli: packageVersion,
  mcp: null,
  schema: null,
  updated: new Date().toISOString(),
};

writeFileSync(join(publicDir, 'versions.json'), JSON.stringify(versions, null, 2));
console.log(`✓ Generated versions.json (skill: ${skillVersion || 'null'}, cli: ${packageVersion || 'null'})`);

console.log('Build preparation complete.');
