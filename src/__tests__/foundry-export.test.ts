// FoundryVTT export — pins the character → draw-steel (v1.1.x) hero-actor conversion.
// Parser tables first, then whole-document shape assertions for built characters.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { newCharacter, computeDerived } from '../app.jsx';
import { DS_CLASSES, DS_KITS, DS_COMPLICATIONS } from '../data.jsx';
import {
  characterToFoundryHero, officialOrGenerated, parseTiers, parseTierClause,
  parseDistance, parseTarget, skillId, langId, randomId, dsid,
} from '../foundry-export.js';
import { parseKitSig } from '../wizard/helpers.js';
import { buildValidCharacter, levelTo } from './helpers/factories';
import { collectLevelUpFeatures } from '../levelup.jsx';

// ───────── parsers ─────────

describe('parseDistance', () => {
  const cases: Array<[string, object]> = [
    ['Melee 1', { type: 'melee', primary: '1' }],
    ['Melee', { type: 'melee', primary: '1' }],
    ['Ranged 10', { type: 'ranged', primary: '10' }],
    ['Melee 1 or ranged 5', { type: 'meleeRanged', primary: '1', secondary: '5' }],
    ['melee 1 / ranged 10', { type: 'meleeRanged', primary: '1', secondary: '10' }],
    ['2 cube within 1', { type: 'cube', primary: '2', secondary: '1' }],
    ['3 burst', { type: 'burst', primary: '3' }],
    ['2 aura', { type: 'aura', primary: '2' }],
    ['5 x 1 line within 1', { type: 'line', primary: '5', secondary: '1', tertiary: '1' }],
    ['Self', { type: 'self' }],
    ['', { type: 'self' }],
    ['Special', { type: 'special' }],
  ];
  for (const [input, expected] of cases) {
    it(`parses "${input}"`, () => {
      expect(parseDistance(input)).toMatchObject(expected);
    });
  }
});

describe('parseTarget', () => {
  it('maps count words and target phrases', () => {
    expect(parseTarget('One creature or object')).toMatchObject({ type: 'creatureObject', value: 1 });
    expect(parseTarget('Two creatures')).toMatchObject({ type: 'creature', value: 2 });
    expect(parseTarget('Each enemy in the area')).toMatchObject({ type: 'enemy', value: null });
    expect(parseTarget('Self or one ally')).toMatchObject({ type: 'selfOrAlly', value: 1 });
    expect(parseTarget('One ally')).toMatchObject({ type: 'ally', value: 1 });
    expect(parseTarget('Self')).toMatchObject({ type: 'self' });
  });
  it('keeps the original text in custom', () => {
    expect(parseTarget('One creature or object').custom).toBe('One creature or object');
  });
});

describe('parseTierClause', () => {
  it('parses plain damage with characteristic and type', () => {
    const r = parseTierClause('5 + M holy damage');
    expect(r.damage).toEqual({ value: '5 + @chr', types: ['holy'] });
    expect(r.chars).toEqual(['might']);
    expect(r.rest).toBe('');
  });
  it('parses damage without characteristic', () => {
    expect(parseTierClause('2 holy; push 1')).toMatchObject({
      damage: { value: '2', types: ['holy'] }, rest: 'push 1',
    });
  });
  it('parses "M or A" alternatives', () => {
    const r = parseTierClause('3 + M or A damage; shift 1');
    expect(r.damage!.value).toBe('3 + @chr');
    expect(r.chars.sort()).toEqual(['agility', 'might']);
  });
  it('parses "characteristic" as all five', () => {
    expect(parseTierClause('5 + characteristic fire damage').chars).toHaveLength(5);
  });
  it('extracts potency and keeps the condition clause verbatim', () => {
    const r = parseTierClause('2 + M holy; P<WEAK, slowed (save)');
    expect(r.potency).toEqual({ characteristic: 'presence', value: '@potency.weak' });
    expect(r.rest).toBe('P<WEAK, slowed (save)');
  });
  it('leaves non-damage text unparsed', () => {
    const r = parseTierClause('The target is frightened');
    expect(r.damage).toBeNull();
    expect(r.rest).toBe('The target is frightened');
  });
});

describe('parseTiers (hybrid assembly)', () => {
  const tiers: Array<[string, string]> = [
    ['≤11', '2 + M holy; P<WEAK, slowed (save)'],
    ['12–16', '5 + M holy; P<AVERAGE, slowed (save)'],
    ['17+', '7 + M holy; P<STRONG, slowed (save)'],
  ];
  it('emits a damage effect plus an other effect for leftovers', () => {
    const { effects, characteristics } = parseTiers(tiers, 'Might');
    const list = Object.values(effects) as any[];
    const dmg = list.find(e => e.type === 'damage');
    const other = list.find(e => e.type === 'other');
    expect(dmg.damage.tier1).toEqual({
      value: '2 + @chr', types: ['holy'],
      potency: { characteristic: 'presence', value: '@potency.weak' },
      ignoredImmunities: [],
    });
    expect(dmg.damage.tier3.potency.value).toBe('@potency.strong');
    expect(other.other.tier2.display).toBe('P<AVERAGE, slowed (save)');
    expect(characteristics).toEqual(['might']);
  });
  it('falls back to verbatim other-effect when a tier does not parse as damage', () => {
    const weird: Array<[string, string]> = [
      ['≤11', 'Slide 2'], ['12–16', 'Slide 4'], ['17+', 'Slide 6; prone'],
    ];
    const { effects } = parseTiers(weird, 'Agility');
    const list = Object.values(effects) as any[];
    expect(list).toHaveLength(1);
    expect(list[0].type).toBe('other');
    expect(list[0].other.tier3.display).toBe('Slide 6; prone');
  });
});

describe('id helpers', () => {
  it('skillId/langId camelCase like the Foundry config ids', () => {
    expect(skillId('Handle Animals')).toBe('handleAnimals');
    expect(skillId('Read Person')).toBe('readPerson');
    expect(skillId('Criminal Underworld')).toBe('criminalUnderworld');
    expect(langId('Caelian')).toBe('caelian');
    expect(langId('The First Language')).toBe('theFirstLanguage');
  });
  it('randomId is 16 alnum chars; dsid is kebab', () => {
    expect(randomId()).toMatch(/^[a-zA-Z0-9]{16}$/);
    expect(dsid('Halt Miscreant!')).toBe('halt-miscreant');
    expect(dsid("Let's Dance")).toBe('let-s-dance');
  });
});

// ───────── whole documents ─────────

function censor() {
  const c: any = newCharacter('u-test', null);
  c.name = 'Test';
  c.identity.name = 'Sariel';
  c.identity.height = `5'10"`;
  c.identity.weight = '180 lb';
  c.level = 1;
  c.ancestry.id = 'dwarf';
  c.ancestry.traits = ['Grounded', 'Spark Off Your Skin'];
  c.culture.environment = 'secluded';
  c.culture.organization = 'bureaucratic';
  c.culture.upbringing = 'martial';
  c.culture.skills = { environment: 'Read Person' };
  c.career.id = 'agent';
  c.career.skills = ['Sneak', 'Lie'];
  c.career.languages = ['Yllyric', 'The First Language'];
  c.career.perk = 'Forgettable Face';
  c.career.incident = 'Disavowed';
  c.cclass.id = 'censor';
  c.cclass.subclass = 'exorcist';
  c.cclass.characteristics = { Might: 2, Agility: 1, Reason: 0, Intuition: 0, Presence: 2 };
  c.cclass.signatures = ['Halt Miscreant!', 'Back Blasphemer!'];
  c.cclass.heroic3 = 'Driving Assault';
  c.kit.id = 'mountain';
  c.complication.id = 'amnesia';
  c.play = { ...c.play, stamina: 20, resource: 2, recoveriesUsed: 3, victories: 1, surges: 2, renownAdj: 1, wealthAdj: -1, xp: 5 };
  return c;
}

describe('characterToFoundryHero', () => {
  const doc: any = characterToFoundryHero(censor());
  const items = doc.items as any[];
  const byType = (t: string) => items.filter(i => i.type === t);

  it('produces a hero actor with the derived characteristics', () => {
    expect(doc.type).toBe('hero');
    expect(doc.name).toBe('Sariel');
    const derived = computeDerived(censor());
    for (const [k, v] of Object.entries(derived.chars)) {
      expect(doc.system.characteristics[k.toLowerCase()].value).toBe(v);
    }
  });

  it('carries play state onto persisted counters', () => {
    expect(doc.system.stamina.value).toBe(20);
    expect(doc.system.hero.primary.value).toBe(2);
    expect(doc.system.hero.victories).toBe(1);
    expect(doc.system.hero.surges).toBe(2);
    expect(doc.system.recoveries.value).toBe(computeDerived(censor()).recoveries - 3);
    // Currencies: derived base (agent career grants 0/0, level 1) + Director deltas.
    expect(doc.system.hero.renown).toBe(1);   // 0 + renownAdj 1
    expect(doc.system.hero.wealth).toBe(0);   // 1 base + wealthAdj −1
    expect(doc.system.hero.xp).toBe(5);
  });

  it('embeds exactly one class item that reproduces the app stamina math', () => {
    const [cls] = byType('class');
    expect(byType('class')).toHaveLength(1);
    expect(cls.system).toMatchObject({
      _dsid: 'censor', level: 1, primary: 'Wrath',
      stamina: { starting: 21, level: 9 }, recoveries: 12,
      characteristics: { core: ['might', 'presence'] },
    });
  });

  it('exports base speed/stability (Foundry re-applies kit/trait/feature item effects)', () => {
    // Dwarf base: speed 5, stability 0. Mountain kit (+2 stab) and Grounded
    // (+1 stab) live on embedded items whose ActiveEffects Foundry re-applies.
    expect(doc.system.combat.stability).toBe(0);
    expect(doc.system.movement.value).toBe(5);
    const [kit] = byType('kit');
    expect(kit.system.bonuses).toMatchObject({ stability: 2, stamina: 9 });
    expect(kit.system.bonuses.melee.damage).toEqual({ tier1: 0, tier2: 0, tier3: 4 });
    expect(kit.system.equipment).toMatchObject({ armor: 'heavy', shield: false });
    expect(doc.system.hero.preferredKit).toBe(kit._id);
  });

  it('exports Halt Miscreant! with parsed damage tiers and a condition rider', () => {
    const halt = items.find(i => i.name === 'Halt Miscreant!');
    expect(halt.type).toBe('ability');
    expect(halt.system).toMatchObject({
      category: 'signature', type: 'main',
      distance: { type: 'melee', primary: '1' },
      target: { type: 'creatureObject', value: 1 },
    });
    expect(halt.system.power.roll).toMatchObject({ formula: '@chr', characteristics: ['might'] });
    const effs = Object.values(halt.system.power.effects) as any[];
    const dmg = effs.find(e => e.type === 'damage');
    expect(dmg.damage.tier1).toMatchObject({
      value: '2 + @chr', types: ['holy'],
      potency: { characteristic: 'presence', value: '@potency.weak' },
    });
    const other = effs.find(e => e.type === 'other');
    expect(other.other.tier1.display).toContain('slowed');
  });

  it('exports the heroic pick with its cost and the kit signature ability', () => {
    const heroic = items.find(i => i.name === 'Driving Assault');
    expect(heroic.system.category).toBe('heroic');
    expect(heroic.system.resource).toBe(3);
    const kitSig = items.find(i => i.name === 'Pain for Pain');
    expect(kitSig.system.category).toBe('signature');
    expect(kitSig.system.keywords).toEqual(['weapon']);
  });

  it('maps skills and languages to Foundry ids', () => {
    const skills = doc.system.skills.value;
    for (const s of ['intimidate', 'religion', 'readPerson', 'sneak', 'lie']) {
      expect(skills).toContain(s);
    }
    expect(new Set(skills).size).toBe(skills.length);
    expect(doc.system.biography.languages).toEqual(
      expect.arrayContaining(['caelian', 'yllyric', 'theFirstLanguage']));
  });

  it('parses height/weight and assembles the biography', () => {
    expect(doc.system.biography.height).toEqual({ value: 70, units: 'inches' });
    expect(doc.system.biography.weight).toEqual({ value: 180, units: 'lb' });
  });

  it('creates ancestry, traits, culture, career, complication, subclass, and perk items', () => {
    expect(byType('ancestry')).toHaveLength(1);
    expect(byType('ancestryTrait').map(i => i.name)).toEqual(
      expect.arrayContaining(['Grounded', 'Spark Off Your Skin']));
    expect(byType('culture')).toHaveLength(1);
    expect(byType('career')[0].name).toBe('Agent');
    expect(byType('complication')[0].name).toBe('Amnesia');
    expect(byType('subclass')[0].name).toBe('Exorcist');
    expect(byType('perk').map(i => i.name)).toContain('Forgettable Face');
  });

  it('gives every embedded item a valid _id and _dsid', () => {
    for (const i of items) {
      expect(i._id).toMatch(/^[a-zA-Z0-9]{16}$/);
      if (i.system._dsid !== undefined) expect(i.system._dsid).toMatch(/^[a-z0-9-]+$/);
    }
    expect(new Set(items.map(i => i._id)).size).toBe(items.length);
  });

  it('survives a JSON round-trip without undefined/NaN', () => {
    const round = JSON.parse(JSON.stringify(doc));
    expect(round).toEqual(doc);
    expect(JSON.stringify(doc)).not.toMatch(/\bNaN\b/);
  });

  it('exports a fresh, empty character without throwing', () => {
    const fresh: any = characterToFoundryHero(newCharacter('u-x', null));
    expect(fresh.type).toBe('hero');
    expect(fresh.name).toBe('Unnamed Hero');
    expect(fresh.items.filter((i: any) => i.type === 'class')).toHaveLength(0);
  });

  it('exports ancestry choice picks and granted abilities', () => {
    const c: any = newCharacter('u-dk', null);
    c.ancestry.id = 'dragon-knight';
    c.ancestry.traits = ['Prismatic Scales', 'Dragon Breath'];
    c.ancestry.sigOptions = { 'Wyrmplate': ['Cold'] };
    c.ancestry.traitOptions = { 'Prismatic Scales': ['Fire'] };
    const doc: any = characterToFoundryHero(c);
    const item = (name: string) => doc.items.find((i: any) => i.name === name);
    expect(item('Wyrmplate').system.description.value).toContain('Damage Immunity: Cold');
    expect(item('Prismatic Scales').system.description.value).toContain('Additional Immunity: Fire');
    expect(doc.items.some((i: any) => i.name === 'Dragon Breath' && i.type === 'ability')).toBe(true);
  });

  it('orc trait skill picks reach the exported skills list', () => {
    const c: any = newCharacter('u-orc', null);
    c.ancestry.id = 'orc';
    c.ancestry.traits = ['Passionate Artisan'];
    c.ancestry.traitSkills = { 'Passionate Artisan': ['Alchemy', 'Blacksmithing'] };
    const doc: any = characterToFoundryHero(c);
    expect(doc.system.skills.value).toEqual(expect.arrayContaining(['alchemy', 'blacksmithing']));
  });

  it('revenant exports the borrowed trait, both signatures, and the former-life size', () => {
    const c: any = newCharacter('u-rev', null);
    c.ancestry.id = 'revenant';
    c.ancestry.formerLife = 'hakaan';
    c.ancestry.traits = ['Previous Life: 2pt'];
    c.ancestry.prevLifeTraits = { '2pt': 'Great Fortitude' };
    const doc: any = characterToFoundryHero(c);
    const traitNames = doc.items.filter((i: any) => i.type === 'ancestryTrait').map((i: any) => i.name);
    expect(traitNames).toEqual(expect.arrayContaining(['Former Life', 'Tough But Withered', 'Great Fortitude']));
    expect(traitNames).not.toContain('Previous Life: 2pt');
    expect(doc.system.combat.size).toEqual({ value: 1, letter: 'L' });
  });
});

// ───────── official compendium substitution ─────────

describe('officialOrGenerated (fake index)', () => {
  const officialAbility = {
    _id: 'OFFICIALIDXXXXXX', _key: '!items!OFFICIALIDXXXXXX', folder: 'someFolder',
    name: 'Halt Miscreant!', type: 'ability', img: 'icons/official.webp',
    system: { _dsid: 'halt-miscreant', power: { effects: {} } }, effects: [], flags: {},
  };
  const officialClass = {
    _id: 'CLSOFFICIALXXXXX', name: 'Censor', type: 'class', img: 'icons/censor.webp',
    system: { _dsid: 'censor', level: 0, primary: 'Wrath' }, effects: [], flags: {},
  };
  const fakeIndex = {
    items: {
      'ability:halt-miscreant': officialAbility,
      'class:censor': officialClass,
      'ability:judgement': { ...officialAbility, name: 'Judgement', system: { _dsid: 'judgement' } },
      'culture:travelling-entertainers': { name: 'Travelling entertainers', type: 'culture', system: {} },
      'feature:growing-ferocity': [
        { scope: ['classes', 'fury', 'features', 'berserker'], doc: { name: 'Growing Ferocity', type: 'feature', system: { _dsid: 'berserker-version' } } },
        { scope: ['classes', 'fury', 'features', 'reaver'], doc: { name: 'Growing Ferocity', type: 'feature', system: { _dsid: 'reaver-version' } } },
      ],
    },
  };
  const generated = { _id: 'genGENgenGENgen1', name: 'X', type: 'ability', system: {} };

  it('substitutes the official doc with a fresh _id and no pack-only fields', () => {
    const out: any = officialOrGenerated(fakeIndex, 'ability', 'Halt Miscreant!', generated);
    expect(out.img).toBe('icons/official.webp');
    expect(out.system._dsid).toBe('halt-miscreant');
    expect(out._id).toMatch(/^[a-zA-Z0-9]{16}$/);
    expect(out._id).not.toBe('OFFICIALIDXXXXXX');
    expect(out._key).toBeUndefined();
    expect(out.folder).toBeUndefined();
    expect(officialAbility._key).toBe('!items!OFFICIALIDXXXXXX'); // source not mutated
  });

  it('sets the character level on class items', () => {
    const out: any = officialOrGenerated(fakeIndex, 'class', 'Censor', generated, [], 4);
    expect(out.system.level).toBe(4);
    expect(officialClass.system.level).toBe(0); // deep copy, source untouched
  });

  it('bridges UK/US spelling (Judgment → Judgement)', () => {
    const out: any = officialOrGenerated(fakeIndex, 'ability', 'Judgment', generated);
    expect(out.system._dsid).toBe('judgement');
  });

  it('remaps ALIASES (Traveling → Travelling entertainers)', () => {
    const out: any = officialOrGenerated(fakeIndex, 'culture', 'Traveling entertainers', generated);
    expect(out.name).toBe('Travelling entertainers');
  });

  it('disambiguates collisions by context scope', () => {
    const berserker: any = officialOrGenerated(fakeIndex, 'feature', 'Growing Ferocity', generated, ['fury', 'berserker']);
    expect(berserker.system._dsid).toBe('berserker-version');
    const reaver: any = officialOrGenerated(fakeIndex, 'feature', 'Growing Ferocity', generated, ['fury', 'reaver']);
    expect(reaver.system._dsid).toBe('reaver-version');
  });

  it('falls back to the generated item on a miss or without an index', () => {
    expect(officialOrGenerated(fakeIndex, 'ability', 'Totally Homebrew', generated)).toBe(generated);
    expect(officialOrGenerated(null, 'ability', 'Halt Miscreant!', generated)).toBe(generated);
  });

  it('tries candidate names in order', () => {
    const idx = {
      items: {
        'feature:prayer-of-steel': { name: 'Prayer of Steel', type: 'feature', system: { _dsid: 'prayer-of-steel' } },
        'feature:steel-ward': { name: 'Steel Ward', type: 'feature', system: { _dsid: 'steel-ward' } },
      },
    };
    const prayer: any = officialOrGenerated(idx, 'feature', ['Prayer of Steel', 'Steel'], generated);
    expect(prayer.system._dsid).toBe('prayer-of-steel');
    const ward: any = officialOrGenerated(idx, 'feature', ['Steel Ward'], generated);
    expect(ward.system._dsid).toBe('steel-ward');
    expect(officialOrGenerated(idx, 'feature', ['Nope', 'Also Nope'], generated)).toBe(generated);
  });

  it('applies system-field overrides on top of the official clone', () => {
    const out: any = officialOrGenerated(fakeIndex, 'ability', 'Halt Miscreant!', generated, [], 1,
      { distance: { type: 'ranged', primary: '5' }, keywords: ['magic', 'ranged'] });
    expect(out.system.distance).toEqual({ type: 'ranged', primary: '5' });
    expect(out.system.keywords).toEqual(['magic', 'ranged']);
    expect(out.system._dsid).toBe('halt-miscreant'); // still the official doc
    expect((officialAbility.system as any).distance).toBeUndefined(); // source not mutated
  });

  it('appendDescription appends to the official description instead of replacing it', () => {
    const idx = { items: { 'complication:haunted': {
      name: 'Haunted', type: 'complication',
      system: { description: { value: '<p>Official benefit.</p>' } },
    } } };
    const out: any = officialOrGenerated(idx, 'complication', 'Haunted', generated, [], 1,
      { appendDescription: '<p>My custom note.</p>' });
    expect(out.system.description.value).toBe('<p>Official benefit.</p><p>My custom note.</p>');
  });

  it('overrides are ignored on a lookup miss — generated returned as-is', () => {
    const out = officialOrGenerated(fakeIndex, 'ability', 'Totally Homebrew', generated, [], 1,
      { distance: { type: 'ranged', primary: '5' } });
    expect(out).toBe(generated);
  });
});

// ───────── whole-document presence — MISSING-item detection ─────────
// The matrix test below only catches WRONG items; these pin that expected items
// actually appear at all (a silently-dropped item passes the unmatched check).
describe('whole-document presence (no index)', () => {
  it('a conduit with the grounded complication exports every expected item', () => {
    const c: any = buildValidCharacter({ cls: 'conduit', complication: 'grounded' });
    const doc: any = characterToFoundryHero(c);
    const names = doc.items.map((i: any) => i.name);
    expect(names).toContain(c.cclass.domainAbility.name);
    expect(names).toContain(`${c.cclass.domainFeature.domain}: ${c.cclass.domainFeature.name}`);
    for (const s of c.cclass.signatures) expect(names, `signature ${s}`).toContain(s);
    expect(names).toContain(c.career.perk);
    expect(names).toContain('Motivate Earth'); // complication grant
  });

  it('a censor leveled to 7 exports its level-up features and abilities', () => {
    const c: any = levelTo(buildValidCharacter({ cls: 'censor' }), 7);
    const doc: any = characterToFoundryHero(c);
    const names = doc.items.map((i: any) => i.name);
    const feats = collectLevelUpFeatures(c);
    expect(feats.length).toBeGreaterThan(0);
    for (const f of feats) expect(names, `level ${f.level} feature ${f.name}`).toContain(f.name);
    const la = c.cclass.levelAbilities || {};
    for (const lvl of Object.keys(la)) {
      for (const a of la[lvl]) expect(names, `level ${lvl} ability ${a.name}`).toContain(a.name);
    }
    expect(doc.items.find((i: any) => i.type === 'class').system.level).toBe(7);
  });

  it('{t1,t2,t3}-form abilities get the power-roll characteristic fallback (M / I for Piety)', () => {
    // Mirrors normalizeAbilityTiers(a, resource === 'Piety' ? 'I' : 'M') in the Play view.
    const c: any = buildValidCharacter({ cls: 'censor' });
    c.cclass.levelAbilities = {
      2: [
        { name: 'Homebrew Smite', type: 'Main action', distance: 'Melee 1', target: 'One creature',
          tiers: { t1: '2 damage', t2: '4 damage', t3: '6 damage' } },
        { name: 'Homebrew Blessing', type: 'Maneuver', distance: 'Ranged 5', target: 'One ally', resource: 'Piety',
          tiers: { t1: 'Slide 1', t2: 'Slide 2', t3: 'Slide 3' } },
      ],
    };
    const doc: any = characterToFoundryHero(c);
    const smite = doc.items.find((i: any) => i.name === 'Homebrew Smite');
    expect(smite.system.power.roll.characteristics).toEqual(['might']);
    const blessing = doc.items.find((i: any) => i.name === 'Homebrew Blessing');
    expect(blessing.system.power.roll.characteristics).toEqual(['intuition']);
  });
});

const INDEX_PATH = 'public/foundry-items.json';
describe.skipIf(!existsSync(INDEX_PATH))('official index integration (public/foundry-items.json)', () => {
  const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));

  it('contains the expected known keys', () => {
    for (const k of ['ability:halt-miscreant', 'class:censor', 'kit:cloak-and-dagger',
      'culture:travelling-entertainers', 'career:agent', 'complication:amnesia']) {
      expect(index.items[k], k).toBeTruthy();
    }
  });

  it('exports a Censor with official documents embedded', () => {
    const doc: any = characterToFoundryHero(censor(), index);
    const halt = doc.items.find((i: any) => i.name === 'Halt Miscreant!');
    expect(halt.img).toMatch(/^(icons|systems|assets)\//);
    const effects = Object.values(halt.system.power.effects) as any[];
    expect(effects.some(e => e.type === 'applied' || e.type === 'other')).toBe(true); // official slowed rider
    const cls = doc.items.find((i: any) => i.type === 'class');
    expect(cls.system.level).toBe(1);
    expect(cls.system.advancements && Object.keys(cls.system.advancements).length).toBeTruthy();
    const kit = doc.items.find((i: any) => i.type === 'kit');
    expect(kit.name).toBe('Mountain');
    for (const i of doc.items) {
      expect(i._id).toMatch(/^[a-zA-Z0-9]{16}$/);
      expect(i._key).toBeUndefined();
    }
    // Round-trips cleanly.
    expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
  });

  it('exports chosen Conduit prayer/ward/triggered action as official items', () => {
    const c: any = newCharacter('u-test', null);
    c.cclass.id = 'conduit';
    c.cclass.prayer = 'Steel';
    // 'Sanctuary' collides with an official ABILITY of the same name — the ward
    // lookup must reach the 'Sanctuary Ward' feature instead.
    c.cclass.ward = 'Sanctuary';
    c.cclass.triggeredAction = 'Word of Guidance';
    const doc: any = characterToFoundryHero(c, index);
    const dsids = doc.items.map((i: any) => i.system._dsid);
    expect(dsids).toEqual(expect.arrayContaining(['prayer-of-steel', 'sanctuary-ward', 'word-of-guidance']));
    expect(doc.items.find((i: any) => i.system._dsid === 'sanctuary-ward').type).toBe('feature');
    const word = doc.items.find((i: any) => i.system._dsid === 'word-of-guidance');
    expect(word.type).toBe('ability'); // official doc keeps its own type
    expect(doc.items.map((i: any) => i.name)).not.toContain('Prayer / Ward');
    expect(doc.items.map((i: any) => i.name)).not.toContain('Triggered Action');
  });

  it('exports chosen Elementalist enchantment/ward as official items', () => {
    const c: any = newCharacter('u-test', null);
    c.cclass.id = 'elementalist';
    c.cclass.enchantment = 'Enchantment of Battle';
    c.cclass.ward = 'Ward of Excellent Protection';
    const doc: any = characterToFoundryHero(c, index);
    const dsids = doc.items.map((i: any) => i.system._dsid);
    expect(dsids).toEqual(expect.arrayContaining(['enchantment-of-battle', 'ward-of-excellent-protection']));
    expect(doc.items.map((i: any) => i.name)).not.toContain('Enchantment / Ward');
  });

  it('exports chosen Talent augmentation/ward as official items', () => {
    const c: any = newCharacter('u-test', null);
    c.cclass.id = 'talent';
    c.cclass.enchantment = 'Force Augmentation'; // augmentation lives in the enchantment field
    c.cclass.ward = 'Steel Ward';
    const doc: any = characterToFoundryHero(c, index);
    const dsids = doc.items.map((i: any) => i.system._dsid);
    expect(dsids).toEqual(expect.arrayContaining(['force-augmentation', 'steel-ward']));
    expect(doc.items.map((i: any) => i.name)).not.toContain('Augmentation / Ward');
  });

  it('exports Fury features matched officially, without the subclass composite', () => {
    const c: any = newCharacter('u-test', null);
    c.cclass.id = 'fury';
    c.cclass.subclass = 'berserker';
    c.kit.id = 'panther';
    const doc: any = characterToFoundryHero(c, index);
    // "Mighty Leap" must resolve to the official feature (official icon proves substitution).
    const leap = doc.items.find((i: any) => i.system._dsid === 'mighty-leap');
    expect(leap).toBeTruthy();
    expect(leap.img).toMatch(/^(icons|systems|assets)\//);
    // The synthetic "Primordial Aspect — Berserker" composite must not be exported;
    // the official subclass document covers it.
    expect(doc.items.map((i: any) => i.name)).not.toContain('Primordial Aspect — Berserker');
    expect(doc.items.find((i: any) => i.type === 'subclass').name).toBe('Berserker');
  });

  it('drops the subclass composite for every class with subclasses', () => {
    for (const cls of DS_CLASSES.filter((x: any) => x.subclasses)) {
      const c: any = newCharacter('u-test', null);
      c.cclass.id = cls.id;
      const sub = cls.subclasses[0];
      c.cclass.subclass = sub.id || sub.name;
      const doc: any = characterToFoundryHero(c, index);
      const composite = `${cls.subclassName || 'Subclass'} — ${sub.name}`;
      expect(doc.items.map((i: any) => i.name), cls.id).not.toContain(composite);
    }
  });

  it('matches domain features despite the "Domain:" name prefix', () => {
    const c: any = newCharacter('u-test', null);
    c.cclass.id = 'conduit';
    c.cclass.domains = ['Creation', 'War'];
    c.cclass.domainFeature = { domain: 'Creation', name: 'Hands of the Maker', text: 'stub' };
    const doc: any = characterToFoundryHero(c, index);
    const df = doc.items.find((i: any) => i.system._dsid === 'hands-of-the-maker');
    expect(df).toBeTruthy();
    expect(df.img).toMatch(/^(icons|systems|assets)\//);
  });

  it('keeps the composite prompt when nothing is chosen', () => {
    const c: any = newCharacter('u-test', null);
    c.cclass.id = 'elementalist';
    const doc: any = characterToFoundryHero(c, index);
    expect(doc.items.map((i: any) => i.name)).toContain('Enchantment / Ward');
  });

  // ── Layer F: blanket completeness — every class × subclass canonical build ──
  // Items that are deliberately app-side composites and have no official counterpart.
  // Anything else without an official icon is an unmatched feature — the bug class the
  // Fury regression below caught for one class; this pins it for all of them.
  const INTENTIONALLY_GENERATED = new Set([
    'culture :: Culture',                  // aspect-combo cultures (only archetypes are official)
    'feature :: Domain',                   // chosen-domain summary (censor)
    'feature :: Domains',                  // chosen-domain summary (conduit)
    'feature :: Discipline Mastery',       // null: summary of the mastery table inside official Discipline
  ]);
  it('every class × subclass build exports with zero unexpected unmatched items', () => {
    for (const cls of DS_CLASSES as any[]) {
      const subs = (cls.subclasses || [null]).map((s: any) => s && (s.id || s.name));
      for (const sub of subs) {
        const c = buildValidCharacter({ cls: cls.id, subclass: sub });
        const doc: any = characterToFoundryHero(c, index);
        const unmatched = doc.items
          .filter((i: any) => !/^(icons|systems|assets)\//.test(i.img || ''))
          .map((i: any) => `${i.type} :: ${i.name}`)
          .filter((k: string) => !INTENTIONALLY_GENERATED.has(k));
        expect(unmatched, `${cls.id}/${sub} unmatched items`).toEqual([]);
        // Presence: expected picks must actually appear (a dropped item passes the
        // unmatched check above, so absence has to be pinned separately).
        const names = doc.items.map((i: any) => i.name);
        if (c.cclass.domainAbility) expect(names, `${cls.id}/${sub} domain ability`).toContain(c.cclass.domainAbility.name);
        if (c.cclass.heroic3) expect(names, `${cls.id}/${sub} heroic3`).toContain(c.cclass.heroic3);
        for (const s of c.cclass.signatures) expect(names, `${cls.id}/${sub} signature ${s}`).toContain(s);
        // Chosen class skills reach the actor's skill list.
        for (const s of c.cclass.skills) {
          const id = skillId(s);
          if (id) expect(doc.system.skills.value, `${cls.id}/${sub} class skill ${s}`).toContain(id);
        }
      }
    }
  });

  it('a duplicate-grant swap exports the replacement skill, not a wasted duplicate', () => {
    const c = buildValidCharacter({ cls: 'shadow', subclass: 'caustic-alchemy', career: 'agent' });
    const replacement = c.cclass.skillSwaps.Sneak;
    expect(replacement).toBeTruthy();
    const doc: any = characterToFoundryHero(c, index);
    expect(doc.system.skills.value).toContain(skillId(replacement));
    expect(doc.system.skills.value).toContain(skillId('Sneak')); // career still grants it once
  });

  it('a complication fixed-grant collision exports the replacement skill', () => {
    const c: any = buildValidCharacter({ cls: 'fury', career: 'agent', complication: 'silent-sentinel' });
    const replacement = c.complication.skillSwaps.Sneak; // factory resolved it
    expect(replacement).toBeTruthy();
    const doc: any = characterToFoundryHero(c, index);
    expect(doc.system.skills.value).toContain(skillId('Sneak')); // career's copy, once
    expect(doc.system.skills.value).toContain(skillId(replacement));
    expect(doc.system.skills.value.filter((id: string) => id === skillId('Sneak'))).toHaveLength(1);
  });

  it("grounded's ranged rider survives official substitution of Motivate Earth", () => {
    const c: any = buildValidCharacter({ cls: 'elementalist', subclass: 'earth', complication: 'grounded' });
    const doc: any = characterToFoundryHero(c, index);
    const me = doc.items.filter((i: any) => i.name === 'Motivate Earth');
    expect(me).toHaveLength(1);
    expect(me[0].img).toMatch(/^(icons|systems|assets)\//); // official doc substituted...
    expect(me[0].system.distance).toMatchObject({ type: 'ranged', primary: '5' }); // ...with the rider kept
    expect(me[0].system.keywords).toContain('ranged');
    expect(me[0].system.keywords).not.toContain('melee');
  });

  it('custom complication text survives official substitution', () => {
    const c: any = buildValidCharacter({ complication: 'amnesia' });
    c.complication.custom = 'Haunted by the gap in my memory';
    const doc: any = characterToFoundryHero(c, index);
    const comp = doc.items.find((i: any) => i.type === 'complication');
    expect(comp.img).toMatch(/^(icons|systems|assets)\//);
    expect(comp.system.description.value).toContain('Haunted by the gap in my memory');
  });

  it('a conduit leveled to 5 exports Minor Miracle from the official compendium', () => {
    const c: any = levelTo(buildValidCharacter({ cls: 'conduit' }), 5);
    const doc: any = characterToFoundryHero(c, index);
    const mm = doc.items.find((i: any) => i.system._dsid === 'minor-miracle');
    expect(mm).toBeTruthy();
    expect(mm.img).toMatch(/^(icons|systems|assets)\//);
    // Every level-up feature is present, under its own or its official (bare) name.
    const names = doc.items.map((i: any) => i.name);
    for (const f of collectLevelUpFeatures(c)) {
      const bare = f.name.replace(/^[A-Za-z]+:\s+/, '');
      expect(names.includes(f.name) || names.includes(bare), `level ${f.level} feature ${f.name}`).toBe(true);
    }
  });

  it('an archetype culture substitutes the official culture document', () => {
    const c = buildValidCharacter({ environment: 'urban', organization: 'bureaucratic', upbringing: 'noble' });
    c.culture.archetype = 'Noble house';
    const doc: any = characterToFoundryHero(c, index);
    const culture = doc.items.find((i: any) => i.type === 'culture');
    expect(culture.name).toBe('Noble house');
    expect(culture.img).toMatch(/^(icons|systems|assets)\//);
  });

  it('exports the Null’s chosen Psionic Augmentation from the null-scoped official doc', () => {
    const c: any = newCharacter('u-test', null);
    c.cclass.id = 'null';
    c.cclass.enchantment = 'Force Augmentation';
    const doc: any = characterToFoundryHero(c, index);
    const aug = doc.items.find((i: any) => i.system._dsid === 'force-augmentation');
    expect(aug).toBeTruthy();
    expect(aug.type).toBe('feature');
    // The index holds Null and Talent variants — the Null character must get the
    // null-scoped one (disambiguated via ctx).
    const entry = index.items['feature:force-augmentation'];
    expect(Array.isArray(entry)).toBe(true);
    const nullScoped = entry.find((e: any) => e.scope.includes('null'));
    expect(aug.system).toEqual(nullScoped.doc.system);
    expect(doc.items.map((i: any) => i.name)).not.toContain('Psionic Augmentation');
  });

  // The blanket class×subclass test above only sees the character's chosen kit —
  // sweep every kit's signature so a data-name drift (the old 'Shock and Awe'
  // vs official "Raider's Awe") can't slip back in as a custom ability.
  it('every kit signature resolves to an official ability', () => {
    const generated = { name: 'gen', type: 'ability', system: {} };
    for (const k of DS_KITS as any[]) {
      const sigName = parseKitSig(k.sig).name;
      expect(sigName, `kit ${k.id} has a parseable signature name`).toBeTruthy();
      const out = officialOrGenerated(index, 'ability', sigName, generated);
      expect(out, `kit ${k.id} signature "${sigName}" must match an official ability`).not.toBe(generated);
    }
  });

  it('every complication resolves to an official complication doc', () => {
    const generated = { name: 'gen', type: 'complication', system: {} };
    for (const comp of DS_COMPLICATIONS as any[]) {
      const out = officialOrGenerated(index, 'complication', comp.name, generated);
      expect(out, `complication "${comp.name}" must match an official doc`).not.toBe(generated);
    }
  });

  it("exports the Raider kit signature as the official Raider's Awe", () => {
    const c: any = buildValidCharacter({ cls: 'fury', kit: 'raider' });
    const doc: any = characterToFoundryHero(c, index);
    const awe = doc.items.find((i: any) => i.system._dsid === 'raiders-awe');
    expect(awe).toBeTruthy();
    expect(awe.type).toBe('ability');
    expect(awe.img).toMatch(/^(icons|systems|assets)\//);
  });

  it('a stormwight fury exports its kit-specific Growing Ferocity, not the berserker one', () => {
    const entry = index.items['feature:growing-ferocity'];
    for (const kitId of ['boren', 'corven', 'raden', 'vuken']) {
      const expected = entry.find((e: any) => e.scope.includes(kitId)).doc;
      const c: any = buildValidCharacter({ cls: 'fury', subclass: 'stormwight', kit: kitId });
      const doc: any = characterToFoundryHero(c, index);
      const names = doc.items.map((i: any) => i.name);
      expect(names, `${kitId} stormwight`).toContain(expected.name); // e.g. 'Boren Growing Ferocity'
      expect(names, `${kitId} stormwight must not get the berserker/reaver doc`).not.toContain('Growing Ferocity');
    }
  });

  it('berserker and reaver furies still get their own Growing Ferocity doc', () => {
    const entry = index.items['feature:growing-ferocity'];
    for (const subclass of ['berserker', 'reaver']) {
      const expected = entry.find((e: any) => e.scope.includes(subclass)).doc;
      const c: any = buildValidCharacter({ cls: 'fury', subclass });
      const doc: any = characterToFoundryHero(c, index);
      const gf = doc.items.find((i: any) => i.name === 'Growing Ferocity');
      expect(gf, `${subclass} Growing Ferocity`).toBeTruthy();
      expect(gf.system.description.value, subclass).toBe(expected.system.description.value);
    }
  });

  it('a revenant borrowing orc Grounded exports the orc version of the trait', () => {
    // 'Grounded' collides across dwarf and orc with different official contents; a
    // borrowed trait must disambiguate by its source ancestry, not the revenant.
    const c: any = buildValidCharacter({
      ancestry: 'revenant', formerLife: 'orc',
      traits: ['Previous Life: 1pt'], prevLifeTraits: { '1pt': 'Grounded' },
    });
    const doc: any = characterToFoundryHero(c, index);
    const grounded = doc.items.find((i: any) => i.type === 'ancestryTrait' && i.name === 'Grounded');
    expect(grounded).toBeTruthy();
    const orcDoc = index.items['ancestryTrait:grounded'].find((e: any) => e.scope.includes('orc')).doc;
    expect(grounded.system.description.value).toBe(orcDoc.system.description.value);
  });
});
