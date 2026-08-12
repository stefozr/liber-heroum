// Review-step completeness regression. The review screen used to print bare names
// (traits, kit signature, feature choices) and skipped benefits.classAbilities and
// the domain ability entirely; these tests pin the full-text rendering.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import React from 'react';
import { ReviewStep } from '../wizard/steps/review.jsx';
import { buildValidCharacter } from './helpers/factories';
import { kitDef } from '../app.jsx';
import { parseKitSig } from '../wizard/helpers.js';
import { DS_CAREERS, DS_KITS } from '../data.jsx';
import { DOMAIN_1ST_FEATURES } from '../levelup.jsx';

afterEach(() => cleanup());

const noop = () => {};
const renderReview = (c: any) =>
  render(<ReviewStep character={c} update={noop} />).container.textContent!;

describe('ReviewStep renders complete feature data', () => {
  it('shows ability-shaped class features (Censor Judgment)', () => {
    const text = renderReview(buildValidCharacter({ cls: 'censor' }));
    expect(text).toContain('Judgment');
    expect(text).toContain('You utter a prayer that outlines your foe in holy energy.');
    expect(text).toContain('My Life for Yours');
  });

  it('shows the conduit domain ability with its tier table and the domain feature text', () => {
    const c = buildValidCharacter({ cls: 'conduit', domains: ['Knowledge', 'Life'] });
    const text = renderReview(c);
    expect(text).toContain('The Gods Command You Obey');
    // Object-form tiers ({t1,t2,t3}) must be normalized or AbilityCard drops the table.
    expect(text).toContain('4 + I holy');
    expect(text).toContain((DOMAIN_1ST_FEATURES as any)['Knowledge'].text);
  });

  it('shows ancestry signature text, chosen option rules, and trait costs/text (Dwarf)', () => {
    const c = buildValidCharacter({ ancestry: 'dwarf', traits: ['Grounded', 'Great Fortitude'] });
    const text = renderReview(c);
    // Signature trait in full, not just its name.
    expect(text).toContain('you carve a magic rune onto your skin');
    // The chosen rune's own rules text (factory defaults to the first option, Detection).
    expect(text).toContain('Your rune glows softly');
    // Purchased traits with cost tags and rules text.
    expect(text).toContain('Grounded');
    expect(text).toContain('1 PT');
    expect(text).toContain('+1 to stability.');
    expect(text).toContain("You can't be made weakened.");
  });

  it('shows the revenant borrowed trait with attribution and full text', () => {
    const c = buildValidCharacter({
      ancestry: 'revenant', formerLife: 'dwarf', traits: ['Previous Life: 1pt'],
    });
    const text = renderReview(c);
    expect(text).toContain('PREVIOUS LIFE — DWARF');
    expect(text).toContain('+1 to stability.'); // Grounded, borrowed in full
    expect(text).not.toContain('Take a 1-point trait');
  });

  it('shows kit description, stat bonuses, and signature power roll', () => {
    const c = buildValidCharacter({ cls: 'fury' });
    const kit: any = kitDef(c);
    const text = renderReview(c);
    expect(text).toContain(kit.desc);
    const sig = parseKitSig(kit.sig);
    expect(text).toContain(sig.name);
    if (sig.rows) expect(text).toContain(sig.rows[0][1]); // first tier's result text
  });

  it('parseKitSig keeps tiers/distance intact under the full-sentence effect texts', () => {
    // The clarity pass lengthened several effect clauses (amounts, durations,
    // conditions per the official wording) — the tier matcher and distance
    // split must not shift. Pain for Pain is the reported case.
    const mountain: any = DS_KITS.find((k: any) => k.id === 'mountain');
    const sig = parseKitSig(mountain.sig);
    expect(sig.name).toBe('Pain for Pain');
    expect(sig.distance).toBe('melee 1');
    expect(sig.rows![0]).toEqual(['≤ 11', '3 + M or A']);
    expect(sig.rows![2]).toEqual(['≥ 17', '13 + M or A']);
    expect(sig.effect).toContain('extra damage equal to your Might or Agility score');
    // Driving Pounce's effect contains its own N/N/N push clause — the FIRST
    // triple must stay the damage tier, the push must stay in the effect.
    const pounceKit: any = DS_KITS.find((k: any) => k.sig.startsWith('Driving Pounce'));
    const pounce = parseKitSig(pounceKit.sig);
    expect(pounce.rows![1][1]).toBe('5 + A');
    expect(pounce.effect).toContain('push 0/1/2');
    expect(pounce.effect).toContain('as many squares as you pushed');
    // Every kit still parses to a name and either rows or an effect.
    for (const k of DS_KITS as any[]) {
      const s = parseKitSig(k.sig);
      expect(s.name, k.id).toBeTruthy();
      expect(s.rows || s.effect, k.id).toBeTruthy();
    }
  });

  it('shows the inciting incident text, not just its name', () => {
    const c = buildValidCharacter({});
    const car: any = DS_CAREERS.find((x: any) => x.id === c.career.id);
    const inc = car.incidents.find((i: any) => i.name === c.career.incident);
    const text = renderReview(c);
    expect(text).toContain(inc.text);
  });

  it('does not duplicate the heroic resource as a feature row', () => {
    const text = renderReview(buildValidCharacter({ cls: 'fury' }));
    expect(text.match(/Heroic Resource/g) || []).toHaveLength(0);
  });
});
