import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildSummonerIndex } from '../../scripts/extract-foundry-summoner.mjs';
import {
  characterToFoundryHero, dsid, loadOfficialIndex, mergeOfficialIndices, officialOrGenerated,
} from '../foundry-export.js';
import { computeDerived } from '../app.jsx';
import { DS_CLASSES } from '../data.jsx';
import { LEVELUP_DATA, collectLevelUpFeatures, makeContext } from '../levelup.jsx';
import { SUMMONER_PORTFOLIOS, SUMMONER_WARDS } from '../data/summoner-minions.js';
import { buildValidCharacter, levelTo } from './helpers/factories';

const core = JSON.parse(readFileSync('public/foundry-items.json', 'utf8'));
const moduleIndex = JSON.parse(readFileSync('public/foundry-summoner-items.json', 'utf8'));
const combined = mergeOfficialIndices(core, moduleIndex);
const cls: any = DS_CLASSES.find((c: any) => c.id === 'summoner');
const prefix = 'Compendium.draw-steel-summoner-class.';
const source = (item: any) => item?._stats?.compendiumSource;
const flags = (item: any) => item.flags?.['draw-steel']?.advancement || {};
const entries = (index: any) => Object.values<any>(index.items).flatMap(v => Array.isArray(v) ? v.map(e => e.doc) : [v]);
const moduleDocs = new Map(entries(moduleIndex).map(d => [source(d), d]));

describe('Summoner module extraction', () => {
  it('bundles the installed release with actual sources, full effects, and resolvable grants', () => {
    expect(moduleIndex.module).toBe('draw-steel-summoner-class');
    expect(moduleIndex.version).toBe('1.3.1');
    expect(moduleDocs.size).toBe(80);
    for (const [uuid, doc] of moduleDocs) {
      expect(uuid).toMatch(/^Compendium\.draw-steel-summoner-class\.summoner-(class|kits)\.Item\.[A-Za-z0-9]{16}$/);
      expect(JSON.stringify(doc)).not.toContain('Compendium.world.');
      for (const effect of doc.effects) expect(effect._id, doc.name).toMatch(/^[A-Za-z0-9]{16}$/);
      for (const adv of Object.values<any>(doc.system.advancements || {})) {
        for (const target of adv.pool || []) expect(moduleDocs.has(target.uuid), `${doc.name}/${adv.name}`).toBe(true);
      }
    }
    const ward: any = officialOrGenerated(combined, 'feature', 'Conjured Ward', null, ['summoner']);
    expect(ward.effects[0].system.changes[0]).toMatchObject({ key: 'system.stamina.bonuses.echelon', value: 3 });
  });

  it('hydrates separate LevelDB effects and only rewrites known world targets', () => {
    const id = 'AAAAAAAAAAAAAAAA', effectId = 'BBBBBBBBBBBBBBBB';
    const raw = {
      _id: id, name: 'Test Ward', type: 'feature', folder: 'folder',
      _stats: { lastModifiedBy: 'user' }, effects: [effectId],
      system: { _dsid: 'test-ward', description: { value: 'Compendium.world.classes.Item.CCCCCCCCCCCCCCCC' } },
    };
    const packs = new Map([['summoner-kits', new Map<string, any>([
      [`!items!${id}`, raw],
      [`!items.effects!${id}.${effectId}`, { _id: effectId, origin: `Compendium.world.complications-perks-kits.Item.${id}` }],
      ['!folders!folder', { _id: 'folder', name: 'Summoner', folder: null }],
    ])]]);
    const result = buildSummonerIndex({ id: 'draw-steel-summoner-class', version: 'test' }, packs);
    const doc = result.items['feature:test-ward'][0].doc;
    expect(doc.folder).toBeUndefined();
    expect(doc._stats).toEqual({ compendiumSource: `${prefix}summoner-kits.Item.${id}` });
    expect(doc.effects[0].origin).toBe(source(doc));
    expect(doc.system.description.value).toContain('Compendium.world.classes.Item.CCCCCCCCCCCCCCCC');
    expect(raw.effects).toEqual([effectId]);
    packs.get('summoner-kits')!.delete(`!items.effects!${id}.${effectId}`);
    expect(() => buildSummonerIndex({ id: 'draw-steel-summoner-class' }, packs)).toThrow('Missing effect');
  });
});

describe('Summoner hero mappings', () => {
  for (const circle of cls.subclasses) {
    it(`${circle.name}: maps grants, choices, and effects at every level`, () => {
      for (let level = 1; level <= 10; level++) {
        const c: any = levelTo(buildValidCharacter({ cls: 'summoner', subclass: circle.id }), level);
        const hero: any = characterToFoundryHero(c, combined);
        const classItem = hero.items.find((i: any) => i.type === 'class');
        const subclass = hero.items.find((i: any) => i.type === 'subclass');
        expect(source(classItem)).toBe(`${prefix}summoner-class.Item.Y6rtfW6EfHszGqhG`);
        expect(subclass.name).toBe(circle.name);
        expect(flags(subclass).parentId).toBe(classItem._id);
        expect(new Set(hero.items.map((i: any) => i._id)).size).toBe(hero.items.length);
        expect(hero.items.some((i: any) => i.name === 'Chosen Minions')).toBe(true);
        for (const item of hero.items.filter((i: any) => source(i)?.startsWith(prefix))) {
          expect(item.effects.every((e: any) => typeof e === 'object'), item.name).toBe(true);
          const parentFlags = flags(item);
          if (parentFlags.parentId) {
            const parent = hero.items.find((i: any) => i._id === parentFlags.parentId);
            expect(parent, item.name).toBeTruthy();
            expect(flags(parent)[parentFlags.advancementId].selected, item.name).toContain(source(item));
          }
          for (const adv of Object.values<any>(item.system.advancements || {})) {
            if ((adv.requirements.level ?? 1) > level || adv.type !== 'itemGrant') continue;
            const selected = flags(item)[adv._id]?.selected || [];
            if (adv.chooseN != null) expect(selected.length, `${item.name}/${adv.name} L${level}`).toBe(adv.chooseN);
            else if (adv.pool.length) expect(selected, `${item.name}/${adv.name} L${level}`).toEqual(adv.pool.map((p: any) => p.uuid));
          }
        }
        const granted = hero.items.filter((i: any) => source(i)?.startsWith(prefix));
        for (const ability of ['Summoner Strike', 'Strike For Me', 'Call Forth', 'Minion Bridge', c.cclass.heroic5]) {
          expect(granted.some((i: any) => i.name === ability), ability).toBe(true);
        }
        for (const features of Object.values<any>(c.cclass.levelAbilities || {})) {
          for (const ability of features) expect(granted.some((i: any) => dsid(i.name) === dsid(ability.name)), ability.name).toBe(true);
        }
        if (level >= 8) {
          const champion = granted.find((i: any) => i.name === 'Portfolio Champion');
          expect(champion.system.description.value).toContain(SUMMONER_PORTFOLIOS[circle.id].champion.name);
        }
      }
    });
  }

  it('maps every formation, quick command, and heroic ability option', () => {
    for (const formation of cls.formations) for (const command of cls.quickCommands) {
      const hero: any = characterToFoundryHero(buildValidCharacter({ cls: 'summoner', formation: formation.name, quickCommand: command.name }), combined);
      expect(hero.items.find((i: any) => i.name === formation.name)?.type).toBe('feature');
      expect(hero.items.find((i: any) => i.name === command.name)?.type).toBe('ability');
      for (const name of [formation.name, command.name]) expect(source(hero.items.find((i: any) => i.name === name))).toMatch(/^Compendium\.draw-steel-summoner-class\./);
    }
    for (const ability of cls.heroic5) {
      const c: any = buildValidCharacter({ cls: 'summoner' });
      c.cclass.heroic5 = ability.name;
      expect(source((characterToFoundryHero(c, combined) as any).items.find((i: any) => dsid(i.name) === dsid(ability.name))), ability.name).toMatch(/^Compendium\.draw-steel-summoner-class\./);
    }
    for (const [level, data] of Object.entries<any>(LEVELUP_DATA.summoner)) {
      for (const choice of data.choices || []) {
        if (choice.kind !== 'ability') continue;
        const base = levelTo(buildValidCharacter({ cls: 'summoner' }), Math.max(1, +level - 1));
        const options = typeof choice.options === 'function' ? choice.options(makeContext(base)) : choice.options;
        for (const ability of options) {
          const c = levelTo(buildValidCharacter({ cls: 'summoner' }), +level, { [choice.id]: ability });
          const hero: any = characterToFoundryHero(c, combined);
          expect(source(hero.items.find((i: any) => dsid(i.name) === dsid(ability.name))), ability.name).toMatch(/^Compendium\.draw-steel-summoner-class\./);
        }
      }
    }
  });

  it('assigns all ward permutations to the level they were chosen', () => {
    for (const first of SUMMONER_WARDS) for (const second of SUMMONER_WARDS) for (const third of SUMMONER_WARDS) {
      if (new Set([first.id, second.id, third.id]).size !== 3) continue;
      const wards = [first, second, third];
      const c = levelTo(buildValidCharacter({ cls: 'summoner' }), 10,
        Object.fromEntries(wards.map((w, i) => [`ward-${[3, 6, 9][i]}`, { ...w, body: w.text }])));
      const hero: any = characterToFoundryHero(c, combined);
      for (const [i, ward] of wards.entries()) {
        const item = hero.items.find((d: any) => d.name === ward.name);
        const parent = hero.items.find((d: any) => d._id === flags(item).parentId);
        const advancement = parent.system.advancements[flags(item).advancementId];
        expect(advancement.requirements.level, ward.name).toBe([3, 6, 9][i]);
        expect(flags(parent)[advancement._id].selected).toEqual([source(item)]);
      }
    }
  });

  it('resolves reused Essence IDs by full UUID and keeps core class exports unchanged', () => {
    for (const classId of ['summoner', 'elementalist']) {
      const hero: any = characterToFoundryHero(buildValidCharacter({ cls: classId }), combined);
      const essence = hero.items.filter((i: any) => i.name === 'Essence');
      expect(essence).toHaveLength(1);
      expect(source(essence[0])).toBe(classId === 'summoner'
        ? `${prefix}summoner-class.Item.HHHvJgoi4xgD0Oiy`
        : 'Compendium.draw-steel.classes.Item.HHHvJgoi4xgD0Oiy');
      const expected = classId === 'summoner' ? entries(moduleIndex).find(d => d.name === 'Essence') : core.items['feature:essence'];
      expect(essence[0].system.description).toEqual(expected.system.description);
    }
    for (const classId of ['elementalist', 'fury', 'conduit']) {
      const c = levelTo(buildValidCharacter({ cls: classId }), 10);
      const exported = (idx: any) => (characterToFoundryHero(c, idx) as any).items.filter((i: any) => source(i)).map((i: any) => [source(i), i.system, i.effects, i.flags]);
      expect(exported(combined), classId).toEqual(exported(core));
    }
  });

  it('pulls automatic grants with the same ID from different packs without losing provenance', () => {
    const coreUuid = 'Compendium.draw-steel.classes.Item.HHHvJgoi4xgD0Oiy';
    const summonerUuid = `${prefix}summoner-class.Item.HHHvJgoi4xgD0Oiy`;
    const index = { ...combined, items: { ...combined.items } };
    const classDoc = structuredClone(core.items['class:fury']);
    classDoc.system.advancements = Object.fromEntries([coreUuid, summonerUuid].map((uuid, i) => {
      const id = `automaticGrant0${i}`;
      return [id, { _id: id, type: 'itemGrant', requirements: { level: 1 }, chooseN: null, pool: [{ uuid }] }];
    }));
    index.items['class:fury'] = classDoc;
    const hero: any = characterToFoundryHero(buildValidCharacter({ cls: 'fury' }), index);
    const essence = hero.items.filter((i: any) => i.name === 'Essence');
    expect(essence).toHaveLength(2);
    expect(essence.map(source)).toEqual([coreUuid, summonerUuid]);
    expect(new Set(essence.map((i: any) => i._id)).size).toBe(2);
    for (const item of essence) expect(item.system.description).toEqual(moduleDocs.get(source(item))?.system.description || core.items['feature:essence'].system.description);
    const parent = hero.items.find((i: any) => i.type === 'class');
    for (const item of essence) {
      expect(flags(item).parentId).toBe(parent._id);
      expect(flags(parent)[flags(item).advancementId].selected).toEqual([source(item)]);
    }
  });

  it('preserves each level improvement and applies characteristic increases once', () => {
    for (const level of [4, 7, 10]) {
      const c: any = levelTo(buildValidCharacter({ cls: 'summoner' }), level);
      const hero: any = characterToFoundryHero(c, combined);
      const classItem = hero.items.find((i: any) => i.type === 'class');
      const chars: any = Object.fromEntries(Object.entries<any>(hero.system.characteristics).map(([key, v]) => [key, v.value]));
      for (const adv of Object.values<any>(classItem.system.advancements).filter(a => a.type === 'characteristic' && a.requirements.level <= level).sort((a, b) => a.requirements.level - b.requirements.level)) {
        for (const key of flags(classItem)[adv._id].selected) chars[key] = Math.min(chars[key] + 1, adv.max);
      }
      const expected = Object.fromEntries(Object.entries(computeDerived(c).chars).map(([key, value]) => [key.toLowerCase(), value]));
      expect(chars).toEqual(expected);
      expect(hero.items.some((i: any) => i.name === 'Characteristic Increase')).toBe(false);
      const names = hero.items.map((i: any) => i.name);
      expect(names).toContain('Minion Improvement');
      if (level >= 7) expect(names).toContain('7th-Level Minion Improvement');
      if (level >= 10) expect(names).toEqual(expect.arrayContaining(['10th-Level Minion Improvement', 'Kit Improvement', '9th-Level Kit Improvement']));
    }
    const c = levelTo(buildValidCharacter({ cls: 'summoner' }), 10);
    const offline: any = characterToFoundryHero(c, null);
    expect(offline.items.some((i: any) => i.name === 'Characteristic Increase')).toBe(true);
    for (const f of collectLevelUpFeatures(c)) expect(offline.items.some((i: any) => i.name === f.name), f.name).toBe(true);
  });
});

describe('Summoner index loading', () => {
  it('loads the supplement only when requested and retries missing or invalid data', async () => {
    let supplement: any = null;
    const fetchMock = vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('foundry-summoner-items.json') ? supplement : core }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      expect(await loadOfficialIndex()).toBe(core);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(await loadOfficialIndex({ includeSummoner: true })).toBeNull();
      supplement = { items: {} };
      expect(await loadOfficialIndex({ includeSummoner: true })).toBeNull();
      supplement = moduleIndex;
      const index: any = await loadOfficialIndex({ includeSummoner: true });
      expect(index.modules['draw-steel-summoner-class']).toBe('1.3.1');
      expect(index.items['class:summoner']).toBeTruthy();
      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(await loadOfficialIndex()).toBe(core);
      expect(fetchMock).toHaveBeenCalledTimes(4);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
