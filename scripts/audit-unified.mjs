// Audit the app's game data against the Draw Steel unified data repo
// (Extra/data-unified-main — see scripts/unified-index.mjs).
//
//   node scripts/audit-unified.mjs [category ...]
//
// Categories: classes ancestries careers complications kits domains cultures skills
//             summoner beastheart
//
// Writes one Markdown report per category to reference/audit-unified/, plus SUMMARY.md
// and findings.json (machine-readable app/ref text pairs for the fix pass).
// Findings are tagged like audit-official.mjs:
//   MISSING      reference content the app doesn't have
//   EXTRA        app content with no reference counterpart
//   WRONG-VALUE  a mechanical field disagrees (number, keyword, condition, potency, ...)
//   TEXT-DRIFT   the mechanics agree but the wording differs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAppData } from './load-app-data.mjs';
import { loadUnified, deLink, stripMd, renderAbility, renderFeatureText, parseCost, norm } from './unified-index.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'reference', 'audit-unified');
const LEVELS = Array.from({ length: 9 }, (_, i) => i + 2);   // 2..10

// ───────────────────────── text comparison (lifted from audit-official.mjs) ─────────────────────────

const squash = (s) => String(s || '')
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .replace(/[–—−]/g, '-').replace(/×/g, 'x').replace(/\s+/g, ' ').trim();

const loose = (s) => squash(s).toLowerCase().replace(/[^a-z0-9+<]/g, '');

function similarity(a, b) {
  const words = (s) => new Set(squash(s).toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean));
  const A = words(a); const B = words(b);
  if (!A.size && !B.size) return 1;
  const union = new Set([...A, ...B]);
  let hits = 0;
  for (const w of A) if (B.has(w)) hits++;
  return hits / union.size;
}

const CHAR_CANON = {
  m: 'M', might: 'M', a: 'A', agility: 'A', r: 'R', reason: 'R',
  i: 'I', intuition: 'I', p: 'P', presence: 'P',
};
const canonChars = (s) => squash(s).toLowerCase().split(/\s*(?:or|,|\/)\s*/)
  .map(x => CHAR_CANON[x] || x).filter(Boolean).join(' or ');

// The mechanically load-bearing skeleton of a rules text: numbers, damage types,
// potencies, forced movement, conditions and resource words. Same skeleton but
// different wording is TEXT-DRIFT; a different skeleton is WRONG-VALUE.
const DAMAGE_TYPES = ['acid', 'cold', 'corruption', 'fire', 'holy', 'lightning', 'poison', 'psychic', 'sonic'];
const CONDITIONS = ['bleeding', 'dazed', 'frightened', 'grabbed', 'prone', 'restrained', 'slowed', 'taunted', 'weakened'];
function mechSignature(text) {
  const s = squash(stripMd(text)).toLowerCase();
  const nums = (s.match(/\d+/g) || []).sort().join(',');
  const types = DAMAGE_TYPES.filter(t => s.includes(t)).join(',');
  const potency = (s.match(/[mapri]\s*<\s*(?:weak|average|strong|\d)/g) || [])
    .map(x => x.replace(/\s+/g, '')).sort().join(',');
  const forced = [...new Set(s.match(/\b(push|pull|slide)\b/g) || [])].sort().join(',');
  const conds = CONDITIONS.filter(c => s.includes(c)).join(',');
  const words = ['edge', 'bane', 'surge', 'save ends', 'eot'].filter(w => s.includes(w)).join(',');
  return `${nums}|${types}|${potency}|${forced}|${conds}|${words}`;
}

const short = (s, n = 300) => {
  const x = squash(s);
  return x.length > n ? `${x.slice(0, n)}…` : x || '—';
};

const WORD_NUM = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};
const wordNum = (w) => WORD_NUM[String(w || '').toLowerCase()] ?? (Number.isFinite(Number(w)) ? Number(w) : null);

// ───────────────────────── app-side walkers (lifted from audit-official.mjs) ─────────────────────────

const isAbility = (n) => n && typeof n === 'object' && typeof n.name === 'string'
  && (n.tiers || n.keywords || n.powerRoll || n.distance || n.spend);

const appTierTexts = (tiers) => {
  if (!tiers) return [];
  if (Array.isArray(tiers)) return tiers.map(t => (Array.isArray(t) ? t[1] : t) || '');
  return [tiers.t1 || '', tiers.t2 || '', tiers.t3 || ''];
};

function abilitiesInClass(cls) {
  const out = [];
  const seen = new Set();
  const walk = (node, path) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${path}[${i}]`));
    if (isAbility(node) && !seen.has(node)) { seen.add(node); out.push({ ability: node, path }); }
    for (const [k, v] of Object.entries(node)) if (k !== 'ability' || !isAbility(node)) walk(v, `${path}.${k}`);
    if (node.ability && isAbility(node.ability) && !seen.has(node.ability)) {
      seen.add(node.ability);
      out.push({ ability: node.ability, path: `${path}.ability` });
    }
  };
  walk(cls, cls.id);
  return out;
}

const ALL_DOMAINS = ['Creation', 'Death', 'Fate', 'Knowledge', 'Life', 'Love',
  'Nature', 'Protection', 'Storm', 'Sun', 'Trickery', 'War'];

function contextsFor(cls, app) {
  const domainSets = cls.pickTwoDomains
    ? ALL_DOMAINS.map(d => [d, d === 'War' ? 'Life' : 'War'])
    : cls.pickOneDomain ? ALL_DOMAINS.map(d => [d])
    : [[]];
  const subs = (cls.subclasses || []).map(s => s.id);
  const make = (sub, domains) => {
    const c = app.newCharacter('audit', null);
    c.cclass.id = cls.id;
    c.cclass.subclass = sub;
    c.cclass.domains = domains;
    return { sub, domains, ctx: app.makeContext(c) };
  };
  const out = [];
  for (const sub of subs.length ? subs : [null]) {
    for (const domains of domainSets) out.push(make(sub, domains));
  }
  return out;
}

const resolve1 = (v, ctx) => (typeof v === 'function' ? v(ctx) : v) || [];

// ───────────────────────── comparators ─────────────────────────

/**
 * Compare two prose fields. `ref` should already be de-linked (renderers do this).
 * With alignment as the fix policy, any normalized difference is reported.
 */
function compareProse(add, at, field, appText, refText, { minSim = 0, extra = {} } = {}) {
  const refClean = deLink(refText || '');
  if (!appText && !refClean) return;
  if (!refClean) return;                                      // nothing to align to
  if (!String(appText || '').trim()) {
    add('MISSING', at, `${field}: app has no text\n    - official: ${short(refClean)}`,
      { field, app: '', ref: refClean, ...extra });
    return;
  }
  if (loose(stripMd(appText)) === loose(stripMd(refClean))) return;
  const score = similarity(stripMd(appText), stripMd(refClean));
  if (score < minSim) return;                                  // too unlike to be the same passage
  const tag = mechSignature(appText) === mechSignature(refClean) ? 'TEXT-DRIFT' : 'WRONG-VALUE';
  add(tag, at, `${field} ${(score * 100).toFixed(0)}% match\n    - app:      ${short(appText)}\n    - official: ${short(refClean)}`,
    { field, app: String(appText), ref: refClean, ...extra });
}

function compareValue(add, at, field, appVal, refVal) {
  const a = appVal == null ? '' : String(appVal);
  const r = refVal == null ? '' : String(refVal);
  if (loose(a) === loose(r)) return;
  add('WRONG-VALUE', at, `${field}: app \`${a || '—'}\` vs official \`${r || '—'}\``,
    { field, app: a, ref: r });
}

const TYPE_EQUIV = [
  ['triggered', 'triggered action'],
  ['free triggered', 'free triggered action'],
  ['free maneuver', 'free maneuver'],
  ['move', 'move action'],
];
function typesAgree(a, b) {
  const x = loose(a); const y = loose(b);
  if (x === y) return true;
  return TYPE_EQUIV.some(g => g.map(loose).includes(x) && g.map(loose).includes(y));
}

/** Compare an app ability card against a rendered unified ability. */
function compareAbilityCard(add, at, appAb, ref, opts = {}) {
  const appKw = [...(appAb.keywords || [])].map(squash).filter(k => k !== '-').sort().join(', ');
  const refKw = [...(ref.keywords || [])].map(squash).sort().join(', ');
  if (loose(appKw) !== loose(refKw)) {
    add('WRONG-VALUE', at, `keywords: app \`${appKw || '—'}\` vs official \`${refKw || '—'}\``,
      { field: 'keywords', app: appKw, ref: refKw });
  }
  if (appAb.type && ref.type && !typesAgree(appAb.type, ref.type)) {
    add('WRONG-VALUE', at, `action type: app \`${appAb.type}\` vs official \`${ref.type}\``,
      { field: 'type', app: appAb.type, ref: ref.type });
  }
  if (ref.distance && loose(appAb.distance) !== loose(ref.distance)) {
    add('WRONG-VALUE', at, `distance: app \`${appAb.distance || '—'}\` vs official \`${ref.distance}\``,
      { field: 'distance', app: appAb.distance || '', ref: ref.distance });
  }
  if (ref.target && loose(appAb.target) !== loose(ref.target)) {
    add('WRONG-VALUE', at, `target: app \`${appAb.target || '—'}\` vs official \`${ref.target}\``,
      { field: 'target', app: appAb.target || '', ref: ref.target });
  }
  if (ref.cost != null && Number(appAb.cost ?? appAb.spendCost ?? NaN) !== ref.cost) {
    add('WRONG-VALUE', at, `cost: app \`${appAb.cost ?? '—'}\` vs official \`${ref.costText}\``,
      { field: 'cost', app: String(appAb.cost ?? ''), ref: String(ref.cost) });
  }
  if (ref.powerRoll && appAb.powerRoll && canonChars(appAb.powerRoll) !== canonChars(ref.powerRoll)) {
    add('WRONG-VALUE', at, `power roll: app \`+ ${appAb.powerRoll}\` vs official \`+ ${ref.powerRoll}\``,
      { field: 'powerRoll', app: appAb.powerRoll, ref: ref.powerRoll });
  }

  if (ref.tiers) {
    const appTiers = appTierTexts(appAb.tiers);
    if (!appTiers.some(Boolean)) {
      add('MISSING', at, `official has a power roll (${ref.tiers.join(' / ')}), the app has no tiers`,
        { field: 'tiers', app: '', ref: ref.tiers.join(' / ') });
    } else {
      for (let i = 0; i < 3; i++) {
        const a = appTiers[i] || '';
        const o = ref.tiers[i] || '';
        if (loose(a) === loose(o)) continue;
        const tag = mechSignature(a) === mechSignature(o) ? 'TEXT-DRIFT' : 'WRONG-VALUE';
        add(tag, at, `tier ${i + 1}: app \`${short(a, 200)}\` vs official \`${short(o, 200)}\``,
          { field: `tier${i + 1}`, app: a, ref: o });
      }
    }
  } else if (appTierTexts(appAb.tiers).some(Boolean)) {
    add('EXTRA', at, 'the app gives this ability a power roll; the reference has none',
      { field: 'tiers', app: appTierTexts(appAb.tiers).join(' / '), ref: '' });
  }

  compareProse(add, at, 'trigger', appAb.trigger, ref.trigger);
  compareProse(add, at, 'flavor', appAb.flavor, ref.flavor);
  // The app splits reference effect text across effect/spend/strained/riders; compare the
  // concatenation so a different split isn't a false positive. Label the spend rider the
  // way the reference prints it so "Spend N <resource>" words don't read as drift.
  // Mirror the AbilityCard renderer (src/theme/primitives.jsx): spend is labeled
  // "Spend {spendCost || 1} {resource}." on screen. Subclass riders (riderBySub) are
  // app-side packaging of separate reference features — not compared here.
  let spend = appAb.spend || '';
  if (spend && !/^\s*\**spend/i.test(spend)) {
    const n = appAb.spendCost ?? 1;
    const res = appAb.resource || opts.resource || '';
    spend = `**Spend ${n}${res ? ` ${res}` : ''}:** ${spend}`;
  }
  const appProse = [
    appAb.effect,
    appAb.special,
    appAb.strained ? `**Strained:** ${appAb.strained}` : '',
    spend,
    appAb.orderBenefit,
  ].filter(Boolean).join('\n\n');
  const refProse = [
    ref.effect,
    ref.strained ? `**Strained:** ${ref.strained}` : '',
    ref.spend,
  ].filter(Boolean).join('\n\n');
  // "You have the following ability." is a layout pointer to the card itself — it can
  // arrive either as the ability's own prose or as the sibling feature's writeup.
  const isPointer = (t) => /^you (gain|have) the following ability[.,]?/i.test(squash(stripMd(t)));
  if (isPointer(refProse)) return;
  if (opts.altProse) opts.altProse = opts.altProse.filter(t => !isPointer(t));
  // A name can exist both as a bare ability card and as a fuller feature writeup in the
  // reference — compare against whichever reads most like the app's text.
  const candidates = [refProse, ...(opts.altProse || [])].filter(Boolean);
  const best = candidates.sort((a, b) => similarity(appProse, b) - similarity(appProse, a))[0] || '';
  // Emit the split fields alongside the aggregate so the fix pass can swap each part's
  // literal individually (the aggregate never exists as one literal in the source).
  compareProse(add, at, 'effect', appProse, best, {
    extra: best === refProse ? {
      appParts: { effect: appAb.effect || '', strained: appAb.strained || '', spend: appAb.spend || '' },
      refParts: {
        effect: ref.effect || '', strained: ref.strained || '',
        spend: (ref.spendParts || []).map(p => p.text).join('\n\n'),
      },
    } : {},
  });
}

// ───────────────────────── categories ─────────────────────────

function auditClasses(app, U, add) {
  for (const cls of app.DS_CLASSES) {
    const at = (s) => `${cls.id} · ${s}`;
    const doc = U.find('class', cls.name);
    if (!doc) { add('MISSING', cls.id, 'no reference class document found', {}); continue; }

    compareValue(add, at('chassis'), 'starting stamina', cls.starting?.stamina1, doc.starting_stamina);
    compareValue(add, at('chassis'), 'stamina per level', cls.starting?.staminaPer, doc.stamina_per_level);
    compareValue(add, at('chassis'), 'recoveries', cls.starting?.recoveries, doc.recoveries);
    for (const p of ['weak', 'average', 'strong']) {
      compareValue(add, at('chassis'), `${p} potency`, cls.potency?.[p], deLink(doc[`${p}_potency`] || ''));
    }
    const appCore = Object.keys(cls.fixedChars || {}).map(c => c.toLowerCase()).sort().join(',');
    const refCore = (doc.primary_characteristics || []).map(c => c.toLowerCase()).sort().join(',');
    compareValue(add, at('chassis'), 'primary characteristics', appCore, refCore);

    // Compare one app ability against every same-name reference record: the card fields
    // against the ability file, the prose against whichever writeup reads closest.
    const compareClassAbility = (label, ability, level = null) => {
      const all = U.findFeatureAll(ability.name, { scope: [cls.id], level });
      if (!all.length) { add('EXTRA', label, `“${ability.name}” has no reference counterpart`, { field: 'name', app: ability.name, ref: '' }); return; }
      const abRec = all.find(r => r.kind === 'ability');
      if (abRec) {
        const altProse = all.filter(r => r !== abRec)
          .map(r => (r.kind === 'ability' ? renderAbility(r.doc).effect : renderFeatureText(r.doc)));
        compareAbilityCard(add, label, ability, renderAbility(abRec.doc), { altProse, resource: cls.resource });
      } else {
        compareProse(add, label, 'text',
          [ability.effect, ability.strained ? `**Strained:** ${ability.strained}` : '', ability.spend].filter(Boolean).join('\n\n'),
          renderFeatureText(all[0].doc));
      }
    };

    // Abilities anywhere on the class record (signatures, heroics, feature/subclass cards).
    for (const { ability, path } of abilitiesInClass(cls)) {
      compareClassAbility(`${at(path)} — ${ability.name}`, ability);
    }

    // Prose-only features on the class record and its subclasses.
    const proseFeatures = [
      ...(cls.features || []).map(f => ({ f, where: 'features' })),
      ...(cls.subclasses || []).flatMap(s => (s.features || []).map(f => ({ f, where: `subclass ${s.id}` }))),
    ];
    for (const { f, where } of proseFeatures) {
      if (!f?.name || !f.text) continue;
      const all = U.findFeatureAll(f.name, { scope: [cls.id] });
      if (!all.length) { add('EXTRA', at(`${where} — ${f.name}`), 'no reference counterpart', { field: 'name', app: f.name, ref: '' }); continue; }
      const texts = all.map(r => (r.kind === 'ability' ? renderAbility(r.doc).effect : renderFeatureText(r.doc))).filter(Boolean);
      const best = texts.sort((a, b) => similarity(f.text, b) - similarity(f.text, a))[0] || '';
      compareProse(add, at(`${where} — ${f.name}`), 'text', f.text, best);
    }

    // Level-up tables: abilities and feature prose per level.
    const table = app.LEVELUP_DATA[cls.id] || {};
    const seenLv = new Set();
    for (const { ctx } of contextsFor(cls, app)) {
      for (const level of LEVELS) {
        const data = table[level];
        if (!data) continue;
        const feats = resolve1(data.autoFeatures, ctx).filter(f => f?.name);
        const abilities = [
          ...resolve1(data.autoAbilities, ctx),
          ...app.levelChoicesFor(cls, level, ctx)
            .filter(ch => ch.kind === 'ability')
            .flatMap(ch => resolve1(ch.options, ctx)),
        ].filter(a => a?.name);
        for (const ability of abilities) {
          const key = `ab|${level}|${ability.name}`;
          if (seenLv.has(key)) continue;
          seenLv.add(key);
          compareClassAbility(at(`L${level} — ${ability.name}`), ability, level);
        }
        for (const f of feats) {
          if (!f.text) continue;
          const key = `ft|${level}|${f.name}`;
          if (seenLv.has(key)) continue;
          seenLv.add(key);
          const all = U.findFeatureAll(f.name, { scope: [cls.id], level });
          if (!all.length) { add('EXTRA', at(`L${level} — ${f.name}`), 'no reference counterpart', { field: 'name', app: f.name, ref: '' }); continue; }
          const texts = all.map(r => (r.kind === 'ability' ? renderAbility(r.doc).effect : renderFeatureText(r.doc))).filter(Boolean);
          const best = texts.sort((a, b) => similarity(f.text, b) - similarity(f.text, a))[0] || '';
          compareProse(add, at(`L${level} — ${f.name}`), 'text', f.text, best);
        }
      }
    }
  }
}

function auditAncestries(app, U, add) {
  for (const a of app.DS_ANCESTRIES) {
    const at = (s) => `${a.id} · ${s}`;
    const doc = U.find('ancestry', a.name);
    if (!doc) { add('MISSING', a.id, 'no reference ancestry found', {}); continue; }
    compareProse(add, at('desc'), 'desc', a.desc, doc.flavor);

    const refTraits = U.featuresUnder('trait', a.id).filter(r => r.slug !== `${a.id}-traits`);
    const matched = new Set();
    // Reference trait names carry prefixes the app drops: "Signature Trait: Silver
    // Tongue", "Previous Life: 1 Point" (app: "Previous Life: 1pt") — normalize both.
    const pts = (n) => norm(n).replace(/-points?\b/, 'pt');
    const tail = (n) => norm(String(n).split(':').pop());
    const head = (n) => norm(String(n).split(':')[0]);
    const matchTrait = (name) => {
      const rec = refTraits.find(r => norm(r.doc.name) === norm(name))
        || refTraits.find(r => tail(r.doc.name) === norm(name))
        || refTraits.find(r => pts(r.doc.name) === pts(name))
        || refTraits.find(r => head(r.doc.name) === norm(name));
      if (rec) matched.add(rec);
      return rec;
    };

    // Signature traits: one `signature` object, or a `signatures` array when the
    // ancestry has several. Match each against its "Signature Trait: X" file.
    const appSigs = a.signatures || (a.signature ? [a.signature] : []);
    const refSigs = refTraits.filter(r => /^signature trait/i.test(r.doc.name));
    refSigs.forEach(r => matched.add(r));
    const sigNames = (list) => list.map(x => norm(String(x).replace(/^Signature Trait:\s*/i, ''))).sort().join(', ');
    compareValue(add, at('signature'), 'signature trait names',
      sigNames(appSigs.map(s => s.name)), sigNames(refSigs.map(r => deLink(r.doc.name))));
    for (const sig of appSigs) {
      const rec = refSigs.find(r => tail(r.doc.name) === norm(sig.name));
      if (!rec) continue;
      let refText = renderFeatureText(rec.doc);
      // "You have the following ability." points at an ability file the app folds
      // into the signature text itself.
      if (/^you (gain|have) the following ability\.?$/i.test(squash(stripMd(refText)))) {
        const abRec = U.findFeature(sig.name, { scope: [a.id], kind: 'ability' });
        refText = abRec?.kind === 'ability' ? renderAbility(abRec.doc).effect : '';
      }
      if (refText) compareProse(add, at(`signature — ${sig.name}`), 'text', sig.text, refText);
    }
    for (const t of a.traits || []) {
      const rec = matchTrait(t.name);
      if (!rec) { add('EXTRA', at(`trait ${t.name}`), 'no reference counterpart', { field: 'name', app: t.name, ref: '' }); continue; }
      const refCost = parseCost(rec.doc.cost);
      if (refCost != null) compareValue(add, at(`trait ${t.name}`), 'cost', t.cost, refCost);
      compareProse(add, at(`trait ${t.name}`), 'text', t.text, renderFeatureText(rec.doc));
      for (const ab of t.abilities || []) {
        const abRec = U.findFeature(ab.name, { scope: [a.id], kind: 'ability' });
        if (!abRec) { add('EXTRA', at(`trait ${t.name} — ${ab.name}`), 'ability has no reference counterpart', { field: 'name', app: ab.name, ref: '' }); continue; }
        const refAb = renderAbility(abRec.doc);
        refAb.cost = null;      // trait files put the purchase cost ("1 Point") here, not a resource cost
        compareAbilityCard(add, at(`trait ${t.name} — ${ab.name}`), ab, refAb);
      }
    }
    for (const rec of refTraits) {
      if (matched.has(rec)) continue;
      // "Previous Life: 1 Point" / "Previous Life: 2 Points" are one app trait with an
      // option choice — if a sibling with the same prefix matched, this one is covered.
      if ([...matched].some(m => head(m.doc.name) === head(rec.doc.name))) continue;
      add('MISSING', at(`trait ${rec.doc.name}`), `reference trait absent from the app (${rec.doc.cost || 'signature?'})`,
        { field: 'name', app: '', ref: rec.doc.name });
    }
  }
}

function auditCareers(app, U, add) {
  for (const c of app.DS_CAREERS) {
    const at = (s) => `${c.id} · ${s}`;
    const doc = U.find('career', c.name);
    if (!doc) { add('MISSING', c.id, 'no reference career found', {}); continue; }
    compareProse(add, at('desc'), 'desc', c.desc, doc.flavor);
    compareValue(add, at('economics'), 'wealth', Number(c.wealth || 0), Number(doc.wealth || 0));
    compareValue(add, at('economics'), 'renown', Number(c.renown || 0), Number(doc.renown || 0));
    compareValue(add, at('economics'), 'project points', Number(c.projectPoints || 0), Number(doc.project_points || 0));
    const refLangs = wordNum((String(doc.language || '').match(/^(\w+)/) || [])[1]);
    if (refLangs != null) compareValue(add, at('economics'), 'languages', c.languages || 0, refLangs);

    const perkGroup = (deLink(doc.perk || '').match(/one\s+(\w+)\s+perk/i) || [])[1];
    if (perkGroup) compareValue(add, at('perk'), 'perk group', String(c.perk || '').toLowerCase(), perkGroup.toLowerCase());
    const quickPerk = ((doc.perk || '').match(/Quick Build:\*?\s*\[([^\]]+)\]/i) || [])[1];
    if (quickPerk && c.quickPerk) compareValue(add, at('perk'), 'quick perk', c.quickPerk, quickPerk);

    // Questions: the bullet list after "think about the following questions".
    const qBlock = (doc.content || '').split(/questions:\s*\n/i)[1] || '';
    const refQs = qBlock.split('\n').filter(l => l.startsWith('- ')).map(l => deLink(l.slice(2)).trim());
    const appQs = (c.questions || []).map(q => loose(q));
    for (const q of refQs) {
      if (!appQs.includes(loose(q))) {
        const near = (c.questions || []).find(aq => similarity(aq, q) > 0.5);
        if (near) compareProse(add, at('questions'), 'question', near, q);
        else add('MISSING', at('questions'), `question absent: ${short(q)}`, { field: 'question', app: '', ref: q });
      }
    }

    // Inciting incidents: markdown table rows `| n | **Name:** text |`.
    const rows = (doc.content || '').split('\n').filter(l => /^\|\s*\d+\s*\|/.test(l));
    const refIncidents = rows.map(r => {
      const m = r.match(/^\|\s*\d+\s*\|\s*\*\*(.+?):?\*\*:?\s*([\s\S]*?)\s*\|\s*$/);
      return m ? { name: deLink(m[1]).replace(/:$/, ''), text: deLink(m[2]) } : null;
    }).filter(Boolean);
    for (const ri of refIncidents) {
      const ai = (c.incidents || []).find(x => norm(x.name) === norm(ri.name));
      if (!ai) { add('MISSING', at('incidents'), `incident “${ri.name}” absent from the app`, { field: 'incident', app: '', ref: ri.name }); continue; }
      compareProse(add, at(`incident ${ri.name}`), 'text', ai.text, ri.text);
    }
    for (const ai of c.incidents || []) {
      if (refIncidents.length && !refIncidents.some(ri => norm(ri.name) === norm(ai.name))) {
        add('EXTRA', at('incidents'), `incident “${ai.name}” has no reference counterpart`, { field: 'incident', app: ai.name, ref: '' });
      }
    }
  }
}

function auditComplications(app, U, add) {
  for (const c of app.DS_COMPLICATIONS) {
    const at = `${c.d100}. ${c.name}`;
    const doc = U.find('complication', c.name);
    if (!doc) { add('MISSING', at, 'no reference complication found', { field: 'name', app: c.name, ref: '' }); continue; }
    const fromContent = (label) =>
      ((doc.content || '').match(new RegExp(`\\*\\*${label}[^:*]*:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\n\\*\\*|$)`)) || [])[1];
    const refBenefit = doc.benefit || fromContent('Benefit');
    const refDrawback = doc.drawback || fromContent('Drawback');
    // Some entries print one combined block (or fold the drawback into the benefit's
    // outcome list) — the app marks those `combined: true` and stores the block in
    // `benefit`. The Medium entry's block embeds an ability stat block the app carries
    // as a card instead — compare only up to it.
    const combined = !refBenefit && !refDrawback ? fromContent('Benefit and Drawback')
      : refBenefit && !refDrawback && c.drawback ? refBenefit : null;
    if (c.combined) {
      const block = String(combined || refBenefit || '').split(/\n#|\n>|\n\|/)[0];
      compareProse(add, at, 'benefit+drawback', c.benefit, block);
    } else if (combined) {
      compareProse(add, at, 'benefit+drawback', [c.benefit, c.drawback].filter(Boolean).join('\n\n'), combined);
    } else {
      compareProse(add, at, 'benefit', c.benefit, refBenefit);
      compareProse(add, at, 'drawback', c.drawback, refDrawback);
    }
  }
}

function auditKits(app, U, add) {
  const num = (v) => {
    const m = String(v ?? '').match(/[+-]?\d+/);
    return m ? Number(m[0]) : 0;
  };
  for (const k of app.DS_KITS) {
    const at = (s) => `${k.id} · ${s}`;
    const doc = U.find('kit', k.name);
    if (!doc) { add('MISSING', k.id, 'no reference kit found', {}); continue; }
    compareProse(add, at('desc'), 'desc', k.desc, doc.flavor);
    // Stormwight kit files carry no structured bonus/equipment fields (their bonuses live
    // in the fury class features) — only compare fields the reference actually has.
    const b = k.bonuses || {};
    const cmpBonus = (label, appVal, refVal, render = num) => {
      if (refVal == null || squash(deLink(String(refVal))) === '—') return;
      compareValue(add, at('bonuses'), label, appVal, render(refVal));
    };
    cmpBonus('stamina per echelon', b.sta_per ?? b.sta ?? 0, doc.stamina_bonus);
    cmpBonus('speed', b.spd ?? 0, doc.speed_bonus);
    cmpBonus('stability', b.stab ?? 0, doc.stability_bonus);
    cmpBonus('disengage', b.disengage ?? 0, doc.disengage_bonus);
    cmpBonus('ranged distance', b.rngDist ?? 0, doc.ranged_distance_bonus);
    cmpBonus('melee distance', b.mDist ?? 0, doc.melee_distance_bonus);
    cmpBonus('melee damage', b.melee || '', doc.melee_damage_bonus, v => deLink(v));
    cmpBonus('ranged damage', b.ranged || '', doc.ranged_damage_bonus, v => deLink(v));

    // Equipment: the app stores bare grades ('Light + Shield', 'None'); the reference a
    // sentence. Check every grade word appears in it.
    const equip = squash(deLink(doc.equipment_text || '')).toLowerCase();
    for (const [field, val] of [['armor', k.armor], ['weapon', k.weapon]]) {
      if (!val || !equip) continue;
      const words = squash(val).toLowerCase().split(/[+,/]| or | and /)
        .map(w => w.replace(/\b(armor|weapon)s?\b/g, '').trim())
        .map(w => (w === 'none' ? 'no' : w))
        .filter(Boolean);
      const missing = words.filter(w => !equip.includes(w));
      if (missing.length) {
        add('WRONG-VALUE', at('equipment'), `${field}: app \`${val}\` vs official \`${deLink(doc.equipment_text)}\``,
          { field, app: val, ref: deLink(doc.equipment_text) });
      }
    }

    // Signature ability: app stores it as prose (`sig`), sometimes with sigTiers.
    if (doc.signature_ability) {
      const ref = renderAbility(doc.signature_ability);
      const sigName = String(k.sig || '').split(/\s+[—–-]{1,2}\s+/)[0].trim();
      if (sigName && norm(sigName) !== norm(ref.name)) {
        add('WRONG-VALUE', at('signature'), `name: app \`${sigName}\` vs official \`${ref.name}\``,
          { field: 'sigName', app: sigName, ref: ref.name });
      }
      if (k.sigTiers && ref.tiers) {
        for (let i = 0; i < 3; i++) {
          const a = k.sigTiers[i] || '';
          const o = ref.tiers[i] || '';
          if (loose(a) === loose(o)) continue;
          const tag = mechSignature(a) === mechSignature(o) ? 'TEXT-DRIFT' : 'WRONG-VALUE';
          add(tag, at('signature'), `tier ${i + 1}: app \`${short(a, 200)}\` vs official \`${short(o, 200)}\``,
            { field: `sigTier${i + 1}`, app: a, ref: o });
        }
      } else if (ref.tiers) {
        // Only the prose summary exists — compare its mechanical skeleton to the tiers.
        const refAll = [ref.distance, ...ref.tiers, ref.effect].filter(Boolean).join('; ');
        const appBody = String(k.sig || '').slice(sigName.length);
        if (mechSignature(appBody) !== mechSignature(refAll)) {
          add('WRONG-VALUE', at('signature'), `sig summary skeleton differs\n    - app:      ${short(k.sig)}\n    - official: ${short(refAll)}`,
            { field: 'sig', app: k.sig || '', ref: refAll });
        }
      }
    }
  }
}

function auditDomains(app, U, add) {
  const tables = [
    ['DOMAIN_1ST_FEATURES', app.DOMAIN_1ST_FEATURES, 1, 'feature', 'conduit'],
    ['DOMAIN_2_ABILITIES', app.DOMAIN_2_ABILITIES, 2, 'ability', 'conduit'],
    ['DOMAIN_4_FEATURES', app.DOMAIN_4_FEATURES, 4, 'feature', 'conduit'],
    ['DOMAIN_6_ABILITIES', app.DOMAIN_6_ABILITIES, 6, 'ability', 'conduit'],
    ['DOMAIN_7_FEATURES', app.DOMAIN_7_FEATURES, 7, 'feature', 'conduit'],
    ['DOMAIN_9_ABILITIES', app.DOMAIN_9_ABILITIES, 9, 'ability', 'conduit'],
    // The censor's domain features are distinct book text (Presence/wrath-based).
    ['CENSOR_DOMAIN_1', app.CENSOR_DOMAIN_1, 1, 'feature', 'censor'],
    ['CENSOR_DOMAIN_4', app.CENSOR_DOMAIN_4, 4, 'feature', 'censor'],
    ['CENSOR_DOMAIN_7', app.CENSOR_DOMAIN_7, 7, 'feature', 'censor'],
  ];
  // The app appends its own "…skill group access." packaging sentence to 1st-level features.
  const stripSkillSuffix = (t) => String(t || '').replace(/(?:^|\s)[^.]*skill group access[^.]*\.\s*$/i, '').trim();
  for (const [label, table, level, kind, scope] of tables) {
    if (!table) { add('MISSING', label, 'table not exported by the app data', {}); continue; }
    for (const [domain, entries] of Object.entries(table)) {
      for (const entry of [].concat(entries || [])) {
        if (!entry?.name) continue;
        const at = `${domain} L${level} — ${entry.name}`;
        const rec = U.findFeature(entry.name, { scope: [scope], level, kind })
          || U.findFeature(entry.name, { scope: [scope] });
        if (!rec) { add('EXTRA', at, 'no reference counterpart', { field: 'name', app: entry.name, ref: '' }); continue; }
        if (kind === 'ability' || isAbility(entry)) {
          if (rec.kind === 'ability') compareAbilityCard(add, at, entry, renderAbility(rec.doc));
          else compareProse(add, at, 'text', [entry.effect, entry.spend].filter(Boolean).join('\n\n'), renderFeatureText(rec.doc));
        } else {
          // "You have the following ability." is a layout pointer — the app's entry
          // carries the ability card directly, no text needed. Likewise, a reference
          // feature whose whole text is the maneuver prose may live in the app entry's
          // ability card rather than in `text`.
          const refText = rec.kind === 'ability' ? renderAbility(rec.doc).effect : renderFeatureText(rec.doc);
          const pointerOnly = /^you (gain|have) the following ability\.?$/i.test(squash(refText));
          if (pointerOnly && entry.ability) {
            // nothing to compare — the app's `text` is its own packaging line
          } else if (!entry.text && entry.ability?.effect) {
            compareProse(add, at, 'text', entry.ability.effect, refText);
          } else {
            compareProse(add, at, 'text', stripSkillSuffix(entry.text), refText);
          }
          if (entry.ability) {
            const abRec = U.findFeature(entry.ability.name, { scope: [scope], kind: 'ability' });
            if (abRec?.kind === 'ability') compareAbilityCard(add, `${at} · ability`, entry.ability, renderAbility(abRec.doc));
          }
        }
      }
    }
  }
}

function auditCultures(app, U, add) {
  const groups = [['environments', app.DS_CULTURES?.environments], ['organizations', app.DS_CULTURES?.organizations],
    ['upbringings', app.DS_CULTURES?.upbringings]];
  for (const [group, list] of groups) {
    for (const opt of list || []) {
      const doc = U.find('culture', opt.name);
      if (!doc) { add('MISSING', `${group} · ${opt.id}`, 'no reference culture aspect found', {}); continue; }
      compareProse(add, `${group} · ${opt.id}`, 'desc', opt.desc, doc.flavor);
    }
  }
}

function auditSkills(app, U, add) {
  const refGroups = new Map();
  for (const [key, doc] of U.top) {
    if (!key.startsWith('skill:') || doc.type !== 'skill') continue;
    const group = doc._path.split('/')[1];
    if (!refGroups.has(group)) refGroups.set(group, new Set());
    refGroups.get(group).add(norm(doc.name));
  }
  for (const [group, names] of Object.entries(app.DS_SKILL_GROUPS || {})) {
    const ref = refGroups.get(norm(group));
    if (!ref) { add('EXTRA', `skills · ${group}`, 'group not in reference', {}); continue; }
    for (const n of names) {
      if (!ref.has(norm(n))) add('EXTRA', `skills · ${group}`, `“${n}” not a reference ${group} skill`, { field: 'skill', app: n, ref: '' });
    }
    for (const rn of ref) {
      if (!names.some(n => norm(n) === rn)) add('MISSING', `skills · ${group}`, `reference skill “${rn}” absent`, { field: 'skill', app: '', ref: rn });
    }
  }
}

/** Shared stat-block comparison for summoner minions and beastheart companions. */
function compareStats(add, at, appMon, ref) {
  // '—' / 'SPECIAL' placeholders mean the stat is defined in prose, and a bare
  // characteristic letter on the app side (stability 'R') encodes a stat that scales
  // with the summoner — neither is comparable to a parsed number.
  const cmp = (field, appVal, refVal) => {
    if (refVal == null || /^(—|-|special)$/i.test(squash(String(refVal)))) return;
    if (/^[MARIP]$/.test(String(appVal ?? ''))) return;
    compareValue(add, at, field, appVal, refVal);
  };
  cmp('size', appMon.size, ref.size);
  cmp('speed', appMon.speed, ref.speed);
  cmp('stability', appMon.stability, ref.stability);
  cmp('free strike', appMon.freeStrike, ref.free_strike);
  cmp('stamina', appMon.stamina, ref.stamina);
  const chars = { Might: 'might', Agility: 'agility', Reason: 'reason', Intuition: 'intuition', Presence: 'presence' };
  for (const [appKey, refKey] of Object.entries(chars)) {
    if (ref[refKey] == null) continue;
    compareValue(add, at, refKey, appMon.characteristics?.[appKey], ref[refKey]);
  }
  if (ref.keywords) {
    // The app packs elemental keywords ("Elemental (Air, Rot)"), the reference splits
    // them ("Elemental (Air)", "Elemental (Rot)") — compare the expanded sets.
    const expand = (list) => [].concat(list || []).join(', ')
      .split(/,\s*(?![^()]*\))/)
      .flatMap(k => {
        const m = k.match(/^Elemental\s*\(([^)]*)\)$/i);
        return m ? m[1].split(/,\s*/).map(e => `Elemental (${e.trim()})`) : [k.trim()];
      })
      .filter(Boolean).sort().join(', ');
    compareValue(add, at, 'keywords', expand(appMon.keywords), expand(ref.keywords));
  }
}

function compareMonsterFeatures(add, at, appMon, refFeatures) {
  const matched = new Set();
  const all = [
    ...(appMon.abilities || []).map(x => ({ x, kind: 'ability' })),
    ...(appMon.traits || []).map(x => ({ x, kind: 'trait' })),
  ];
  for (const { x } of all) {
    const rf = refFeatures.find(f => norm(f.name) === norm(x.name));
    if (!rf) { add('EXTRA', `${at} — ${x.name}`, 'no reference counterpart', { field: 'name', app: x.name, ref: '' }); continue; }
    matched.add(rf);
    if (isAbility(x) && (rf.usage || rf.distance || (rf.effects || []).some(e => e.roll != null))) {
      compareAbilityCard(add, `${at} — ${x.name}`, x, renderAbility(rf));
    } else {
      compareProse(add, `${at} — ${x.name}`, 'text',
        [x.text, x.effect, x.spend].filter(Boolean).join('\n\n'), renderFeatureText(rf));
    }
  }
  for (const rf of refFeatures) {
    if (!matched.has(rf)) add('MISSING', `${at} — ${rf.name}`, 'reference feature absent from the app', { field: 'name', app: '', ref: rf.name });
  }
}

function auditSummoner(app, U, add) {
  const portfolios = app.SUMMONER_PORTFOLIOS || {};
  for (const [pid, p] of Object.entries(portfolios)) {
    const minions = [
      ...['signature', 't3', 't5', 't7'].flatMap(k => [].concat(p[k] || [])),
      ...[p.fixture, p.champion].filter(Boolean),
    ];
    for (const m of minions) {
      if (!m?.name) continue;
      const at = `${pid} · ${m.id || m.name}`;
      const rec = U.findMonster(m.name, { book: 'summoner' });
      if (!rec) { add('MISSING', at, 'no reference stat block found', { field: 'name', app: m.name, ref: '' }); continue; }
      compareStats(add, at, m, rec.doc);
      if (rec.doc.cost) {
        const cm = deLink(rec.doc.cost).match(/(\d+)\s*essence(?:\s+for\s+(\w+)\s+minions?)?/i);
        if (cm) {
          compareValue(add, at, 'essence cost', m.cost?.essence, Number(cm[1]));
          if (cm[2]) compareValue(add, at, 'minion count', m.cost?.count ?? 1, wordNum(cm[2]) ?? cm[2]);
        }
      }
      compareProse(add, at, 'flavor', m.flavor, rec.doc.flavor);
      // Champions and fixtures fold their level upgrades into `advancements` — the
      // reference lists champion upgrades as stat-block features and fixture upgrades
      // as feature/fixture/<element>/<fixture>/level-N files.
      const ELEMENT = { blight: 'demon', graves: 'undead', spring: 'fey', storms: 'elemental' };
      const fixtureUpgrades = m === p.fixture
        ? U.featuresUnder('fixture', ELEMENT[pid], norm(m.name)).map(r => r.doc)
        : [];
      const adv = Object.values(m.advancements || {});
      compareMonsterFeatures(add, at, {
        abilities: [...(m.abilities || []), ...adv.flatMap(a => a.abilities || [])],
        traits: [...(m.traits || []), ...adv.flatMap(a => a.traits || []), ...adv.filter(a => a.name && a.text)],
      }, [...(rec.doc.features || []), ...fixtureUpgrades]);
    }
  }
  for (const w of app.SUMMONER_WARDS || []) {
    const rec = U.findFeature(w.name, { scope: ['summoner'] });
    if (!rec) { add('EXTRA', `ward ${w.id}`, 'no reference counterpart', { field: 'name', app: w.name, ref: '' }); continue; }
    compareProse(add, `ward ${w.id}`, 'text', w.text, renderFeatureText(rec.doc));
  }
}

function auditBeastheart(app, U, add) {
  for (const c of app.BEASTHEART_COMPANIONS || []) {
    const at = `companion ${c.id}`;
    const rec = U.findMonster(c.name, { book: 'beastheart', section: 'statblock' });
    if (rec) {
      // The stat block is a markdown table of `**value**<br>Label` cells.
      const stats = {};
      for (const m of (rec.doc.content || '').matchAll(/\*\*([^*]+)\*\*<br>([A-Za-z ]+)/g)) {
        stats[squash(m[2]).toLowerCase()] = deLink(m[1]).trim();
      }
      const ref = {
        size: stats.size, speed: stats.speed, stability: stats.stability,
        free_strike: stats['free strike'],
        // stamina prints "= yours" — the app renders that as a UI note, not data
        might: stats.might, agility: stats.agility, reason: stats.reason,
        intuition: stats.intuition, presence: stats.presence,
      };
      // The table prints signed characteristics ('+2'); the app stores numbers.
      for (const k of ['might', 'agility', 'reason', 'intuition', 'presence']) {
        if (ref[k] != null) ref[k] = Number(String(ref[k]).replace('+', ''));
      }
      compareStats(add, at, c, ref);
    } else {
      add('MISSING', at, 'no reference stat block found', { field: 'name', app: c.name, ref: '' });
    }

    // Unified feature/companion/beastheart/<id>/ holds the level-1 kit (abilities,
    // traits) and, under level-3/6/10 dirs, the advancement features the app stores
    // in `advancements`.
    const recs = U.featuresUnder('companion', 'beastheart', c.id);
    const baseFeats = recs.filter(r => !r.level || r.level === 1).map(r => r.doc);
    const advRecs = recs.filter(r => r.level && r.level > 1);
    if (baseFeats.length) compareMonsterFeatures(add, at, { abilities: c.abilities, traits: c.traits }, baseFeats);

    for (const [level, a] of Object.entries(c.advancements || {})) {
      const rec = advRecs.find(r => norm(r.doc.name) === norm(a.name))
        || advRecs.find(r => r.level === Number(level));
      if (!rec) { add('EXTRA', `${at} · L${level} ${a.name}`, 'no reference advancement found', { field: 'name', app: a.name, ref: '' }); continue; }
      if (norm(rec.doc.name) !== norm(a.name)) compareValue(add, `${at} · L${level}`, 'advancement name', a.name, rec.doc.name);
      compareValue(add, `${at} · ${a.name}`, 'advancement level', level, rec.level);
      compareProse(add, `${at} · L${level} ${a.name}`, 'text', a.text, renderFeatureText(rec.doc));
    }
    for (const rec of advRecs) {
      const covered = Object.values(c.advancements || {}).some(a => norm(a.name) === norm(rec.doc.name));
      if (!covered) add('MISSING', `${at} · L${rec.level} ${rec.doc.name}`, 'reference advancement absent from the app', { field: 'name', app: '', ref: rec.doc.name });
    }
  }
}

// ───────────────────────── report ─────────────────────────

const TAGS = ['MISSING', 'WRONG-VALUE', 'EXTRA', 'TEXT-DRIFT'];

function renderReport(cat, findings) {
  const lines = [`# Unified audit — ${cat}`, ''];
  const counts = TAGS.map(t => `${t} ${findings.filter(f => f.tag === t).length}`).join(' · ');
  lines.push(counts, '');
  for (const tag of TAGS) {
    const group = findings.filter(f => f.tag === tag);
    if (!group.length) continue;
    lines.push(`## ${tag} (${group.length})`, '');
    let lastAt = null;
    for (const f of group) {
      if (f.at !== lastAt) { lines.push(`### ${f.at}`, ''); lastAt = f.at; }
      lines.push(`- ${f.message}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

const CATEGORIES = {
  classes: auditClasses,
  ancestries: auditAncestries,
  careers: auditCareers,
  complications: auditComplications,
  kits: auditKits,
  domains: auditDomains,
  cultures: auditCultures,
  skills: auditSkills,
  summoner: auditSummoner,
  beastheart: auditBeastheart,
};

async function main() {
  const only = process.argv.slice(2);
  const U = loadUnified();
  const app = await loadAppData();
  mkdirSync(OUT_DIR, { recursive: true });

  // Intentional divergences (app-side packaging, structural modeling choices) —
  // matched by category + `at` prefix (+ optional field), demoted out of the reports.
  let acknowledged = [];
  try {
    acknowledged = JSON.parse(readFileSync(join(ROOT, 'scripts', 'audit-unified-acknowledged.json'), 'utf8')).entries;
  } catch { /* no whitelist yet */ }
  const isAcknowledged = (cat, f) => acknowledged.some(a =>
    a.cat === cat && f.at.startsWith(a.at) && (!a.field || a.field === f.field));

  const summary = [];
  const allFindings = [];
  for (const [cat, fn] of Object.entries(CATEGORIES)) {
    if (only.length && !only.includes(cat)) continue;
    const findings = [];
    const add = (tag, at, message, extra = {}) => findings.push({ tag, at, message, ...extra });
    fn(app, U, add);

    const unique = [];
    const seen = new Set();
    let acked = 0;
    for (const f of findings) {
      const k = `${f.tag}|${f.at}|${f.message}`;
      if (seen.has(k)) continue;
      seen.add(k);
      if (isAcknowledged(cat, f)) { acked++; continue; }
      unique.push(f);
    }
    if (acked) console.log(`${cat}: ${acked} acknowledged finding(s) suppressed`);
    writeFileSync(join(OUT_DIR, `${cat}.md`), renderReport(cat, unique));
    const counts = Object.fromEntries(TAGS.map(t => [t, unique.filter(f => f.tag === t).length]));
    summary.push({ cat, total: unique.length, ...counts });
    allFindings.push(...unique.map(f => ({ cat, ...f })));
    console.log(`${cat.padEnd(14)} ${String(unique.length).padStart(4)} findings  ` +
      TAGS.map(t => `${t} ${counts[t]}`).join('  '));
  }

  const head = ['category', 'total', ...TAGS];
  writeFileSync(join(OUT_DIR, 'SUMMARY.md'), [
    '# Unified audit summary', '',
    `Reference: Extra/data-unified-main (en/unified/json)`, '',
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...summary.map(s => `| ${[s.cat, s.total, ...TAGS.map(t => s[t])].join(' | ')} |`),
    `| **all** | ${summary.reduce((n, s) => n + s.total, 0)} | ${TAGS.map(t => summary.reduce((n, s) => n + s[t], 0)).join(' | ')} |`,
    '',
  ].join('\n'));
  writeFileSync(join(OUT_DIR, 'findings.json'), `${JSON.stringify(allFindings, null, 1)}\n`);
  console.log(`\nReports → ${OUT_DIR}`);
}

// The bundled app modules can leave handles open (supabase client, timers), which would
// keep the process alive after main() returns — exit explicitly.
main().then(() => process.exit(0), (err) => { console.error(err); process.exit(1); });
