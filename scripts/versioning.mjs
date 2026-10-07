// versioning.mjs — the one list of places the kit version lives, shared by
// check-version.mjs (drift + bump checks) and release.mjs (bumps).
//
// One version for the whole kit: skill, Claude Code plugin + marketplace,
// npm package, fleeet-emit CLI, docs copies. Semver rule: see CONTRIBUTING.md.

export const SKILL = "skills/fleeet-reporting/SKILL.md";
export const SKILL_COPY = "docs/public/skill.md"; // must be byte-identical
export const EMIT = "bin/fleeet-emit.mjs";
export const CHANGELOG = "CHANGELOG.md";
export const PLUGIN_NAME = "fleeet-reporting";

// Changes under these paths ship to users, so they need a version bump.
export const GUARDED = ["skills/", "schema/", "bin/", ".claude-plugin/plugin.json", ".claude-plugin/marketplace.json"];
export const isGuarded = (path) => GUARDED.some((g) => (g.endsWith("/") ? path.startsWith(g) : path === g));

export const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

export function compare(a, b) {
  const x = SEMVER.exec(a), y = SEMVER.exec(b);
  if (!x || !y) throw new Error(`not semver: ${!x ? a : b}`);
  for (let i = 1; i <= 3; i++) if (+x[i] !== +y[i]) return +x[i] < +y[i] ? -1 : 1;
  if (x[4] && !y[4]) return -1;
  if (!x[4] && y[4]) return 1;
  return (x[4] || "") < (y[4] || "") ? -1 : (x[4] || "") > (y[4] || "") ? 1 : 0;
}

export function bump(version, kind) {
  const m = SEMVER.exec(version);
  if (!m) throw new Error(`current version is not semver: ${version}`);
  const [maj, min, pat] = [+m[1], +m[2], +m[3]];
  if (kind === "major") return `${maj + 1}.0.0`;
  if (kind === "minor") return `${maj}.${min + 1}.0`;
  if (kind === "patch") return `${maj}.${min}.${pat + 1}`;
  throw new Error(`bump must be patch, minor or major (got ${kind || "nothing"})`);
}

const json = (text) => JSON.parse(text);
const frontmatter = (md) => /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(md);
// metadata.version, the Agent Skills spec's home for it. A top-level
// `version:` key makes claude.ai skill uploads fail ("Unexpected key(s)"),
// so it is reported as a problem below.
export const skillFrontmatterVersion = (md) => {
  const fm = frontmatter(md);
  const meta = fm && /^metadata:[ \t]*\r?\n((?:[ \t]+.*(?:\r?\n|$))*)/m.exec(fm[1]);
  const m = meta && /^[ \t]+version:[ \t]*["']?([^\s"']+)["']?[ \t]*$/m.exec(meta[1]);
  return m ? m[1] : undefined;
};
export const skillTopLevelKeys = (md) => {
  const fm = frontmatter(md);
  return fm ? [...fm[1].matchAll(/^([A-Za-z][\w-]*):/gm)].map((m) => m[1]) : [];
};
// What claude.ai uploads / the Skills API accept (anything else fails the upload).
export const SKILL_KEYS = ["name", "description", "license", "compatibility", "metadata", "allowed-tools"];
// The body opens with "Fleeet skill vX.Y.Z" (first non-empty line after the frontmatter).
export const skillBodyVersion = (md) => {
  const fm = frontmatter(md);
  const body = fm ? md.slice(fm[0].length) : md;
  const first = body.split(/\r?\n/).find((l) => l.trim());
  const m = first && /^Fleeet skill v(\S+?)[.,:;]?(?:\s|$)/.exec(first.trim());
  return m ? m[1] : undefined;
};
export const emitVersion = (src) => (/^const KIT_VERSION = "([^"]+)";/m.exec(src) || [])[1];
// Newest released entry: first "## [X.Y.Z]" heading (Unreleased is skipped).
export const changelogVersion = (md) => (/^## \[(\d+\.\d+\.\d+[^\]]*)\]/m.exec(md) || [])[1];

// Every copy: [label, file, (text) => version | undefined]. Optional files may be absent.
export const SOURCES = [
  ["package.json version", "package.json", (t) => json(t).version],
  ["package-lock.json version", "package-lock.json", (t) => json(t).version, { optional: true }],
  ["package-lock.json packages[\"\"].version", "package-lock.json", (t) => json(t).packages?.[""]?.version, { optional: true }],
  ["plugin.json version", ".claude-plugin/plugin.json", (t) => json(t).version],
  ["marketplace.json metadata.version", ".claude-plugin/marketplace.json", (t) => json(t).metadata?.version],
  [`marketplace.json plugins[${PLUGIN_NAME}].version`, ".claude-plugin/marketplace.json", (t) => json(t).plugins?.find((p) => p.name === PLUGIN_NAME)?.version],
  ["SKILL.md frontmatter metadata.version", SKILL, skillFrontmatterVersion],
  ["SKILL.md opening line (Fleeet skill vX.Y.Z)", SKILL, skillBodyVersion],
  ["fleeet-emit KIT_VERSION (sent as client.skill_version)", EMIT, emitVersion],
  ["docs/public/versions.json skill", "docs/public/versions.json", (t) => json(t).skill],
  ["docs/public/versions.json cli", "docs/public/versions.json", (t) => json(t).cli],
  ["CHANGELOG.md newest release", CHANGELOG, changelogVersion],
];

// read(path) → file text, or null if the file doesn't exist in that tree.
// → { version, problems: [string] }
export function checkConsistency(read) {
  const problems = [];
  const found = [];
  for (const [label, file, get, opts = {}] of SOURCES) {
    const text = read(file);
    if (text == null) { if (!opts.optional) problems.push(`${label}: ${file} is missing`); continue; }
    let v;
    try { v = get(text); } catch (e) { problems.push(`${label}: can't parse ${file} (${e.message})`); continue; }
    if (!v) { problems.push(`${label}: no version found in ${file}`); continue; }
    found.push([label, v]);
  }
  const version = read("package.json") != null ? (() => { try { return json(read("package.json")).version; } catch { return undefined; } })() : undefined;
  if (version && !SEMVER.test(version)) problems.push(`package.json version "${version}" is not semver (X.Y.Z)`);
  for (const [label, v] of found) if (v !== version) problems.push(`${label} is ${v}, package.json says ${version}`);
  const skill = read(SKILL), copy = read(SKILL_COPY);
  if (skill != null) {
    const extra = skillTopLevelKeys(skill).filter((k) => !SKILL_KEYS.includes(k));
    if (extra.length) problems.push(`${SKILL} frontmatter has ${extra.join(", ")}; claude.ai uploads accept only ${SKILL_KEYS.join(", ")} (version goes under metadata:)`);
  }
  if (skill != null && copy !== skill) problems.push(`${SKILL_COPY} differs from ${SKILL} (must be byte-identical; copy it)`);
  for (const f of ["schema/event-schema.json"]) {
    const t = read(f);
    if (t == null) problems.push(`${f} is missing`);
    else try { json(t); } catch (e) { problems.push(`${f}: invalid JSON (${e.message})`); }
  }
  return { version, problems };
}
