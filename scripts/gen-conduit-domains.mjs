// Emit the Conduit domain progression tables for levels 5-9 as app-shaped source.
//
//   node scripts/gen-conduit-domains.mjs > /tmp/tables.js
//
// The app models a conduit's two domains as a choice per level: pick which domain's
// feature or ability you take. The compendium stores one twelve-entry pool per level,
// ordered to match the domain list, so the maps below are a direct transcription.
import { loadOfficial, officialAbility, officialFeature } from './official-index.mjs';

const DOMAINS = ['Creation', 'Death', 'Fate', 'Knowledge', 'Life', 'Love',
  'Nature', 'Protection', 'Storm', 'Sun', 'Trickery', 'War'];

// The compendium's 7th-level pool is missing its Trickery entry; the book and the Heroes
// journal both print it as Trinity of Trickery.
const FALLBACK = { '7th-Level Domain Feature': { Trickery: 'Trinity of Trickery' } };

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
// The app spells power-roll characteristics out; the compendium abbreviates them.
const CHAR_FULL = { M: 'Might', A: 'Agility', R: 'Reason', I: 'Intuition', P: 'Presence' };
const fullChars = (s) => String(s).split(' or ').map(c => CHAR_FULL[c] || c).join(' or ');

function poolByDomain(O, cls, advName) {
  const adv = Object.values(cls.system.advancements).find(a => a.name === advName);
  if (!adv) throw new Error(`no advancement named ${advName}`);
  const out = {};
  (adv.pool || []).forEach((p, i) => {
    const doc = O.byId.get(String(p.uuid).split('.').pop());
    out[DOMAINS[i]] = doc || null;
  });
  for (const [domain, name] of Object.entries(FALLBACK[advName] || {})) {
    if (!out[domain]) out[domain] = O.find('ability', name) || O.find('feature', name);
  }
  return out;
}

const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));

function emitFeatures(name, byDomain, comment) {
  const width = Math.max(...DOMAINS.map(d => d.length)) + 2;
  const lines = [`// ${comment}`, `const ${name} = {`];
  for (const d of DOMAINS) {
    const doc = byDomain[d];
    if (!doc) { lines.push(`  ${pad(`${d}:`, width)} null,   // not in the compendium`); continue; }
    const f = doc.type === 'ability' ? officialAbility(doc) : officialFeature(doc);
    const text = doc.type === 'ability' ? (f.effect || f.flavor) : f.text;
    lines.push(`  ${pad(`${d}:`, width)} { name: ${q(f.name)}, text: ${q(text)} },`);
  }
  lines.push('};');
  return lines.join('\n');
}

function emitAbilities(name, byDomain, comment) {
  const lines = [`// ${comment}`, `const ${name} = {`];
  for (const d of DOMAINS) {
    const doc = byDomain[d];
    if (!doc) { lines.push(`  ${d}: null,`); continue; }
    const a = officialAbility(doc);
    const parts = [
      `name: ${q(a.name)}`,
      a.cost != null ? `cost: ${a.cost}, resource: 'Piety'` : null,
      `flavor: ${q(a.flavor)}`,
      `keywords: [${(a.keywords.length ? a.keywords : ['—']).map(q).join(',')}]`,
      `type: ${q(a.type)}`,
      `distance: ${q(a.distance)}`,
      `target: ${q(a.target)}`,
      a.powerRoll ? `powerRoll: ${q(fullChars(a.powerRoll))}` : null,
      a.tiers ? `tiers: tr(${a.tiers.map(q).join(', ')})` : null,
      a.effect ? `effect: ${q(a.effect)}` : null,
    ].filter(Boolean);
    lines.push(`  ${d}: { ${parts.join(', ')} },`);
  }
  lines.push('};');
  return lines.join('\n');
}

const O = loadOfficial();
const cls = O.find('class', 'Conduit');

console.log(emitFeatures('DOMAIN_5_FEATURES', poolByDomain(O, cls, '5th-Level Domain Feature'),
  'Conduit 5th-level domain features — the second of your two domains (the first came at 4th).'));
console.log();
console.log(emitAbilities('DOMAIN_6_ABILITIES', poolByDomain(O, cls, '6th-Level Domain Ability'),
  'Conduit 6th-level domain abilities — one 9-piety ability from one of your two domains.'));
console.log();
console.log(emitFeatures('DOMAIN_7_FEATURES', poolByDomain(O, cls, '7th-Level Domain Feature'),
  'Conduit 7th-level domain features. Reused at 8th level for the second domain.'));
console.log();
console.log(emitAbilities('DOMAIN_9_ABILITIES', poolByDomain(O, cls, '9th-Level Domain Ability'),
  'Conduit 9th-level domain abilities — one 11-piety ability from one of your two domains.'));
