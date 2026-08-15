// Theme primitives render regression. Renders every exported UI primitive once
// with valid props and asserts it mounts without throwing. Establishes a green
// baseline against the current theme.jsx, then must stay green after the split.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import React from 'react';
import {
  OrnDivider, GlyphRow, Crest, Pill, Tag, Button, IconButton,
  H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap,
  StatTile, SelCard, Modal, PowerRoll, AbilityCard, ThemeStyles,
} from '../theme.jsx';

afterEach(() => cleanup());

const ability = {
  name: 'Test Strike', type: 'Main action', resource: 'Essence', cost: 3,
  keywords: ['Magic', 'Ranged'], distance: 'Ranged 10', target: 'One creature',
  effect: 'It works.', tiers: [['≤ 11', '1'], ['12–16', '2'], ['17+', '3']],
};

const cases: Array<[string, React.ReactElement]> = [
  ['ThemeStyles', <ThemeStyles />],
  ['OrnDivider', <OrnDivider />],
  ['GlyphRow', <GlyphRow>✦ · ❦ · ✦</GlyphRow>],
  ['Crest', <Crest glyph="✠" />],
  ['Pill', <Pill kind="live">Live</Pill>],
  ['Tag', <Tag kind="gold">SIG</Tag>],
  ['Button', <Button kind="primary" onClick={() => {}}>Go</Button>],
  ['IconButton', <IconButton title="x">✦</IconButton>],
  ['H1', <H1>One</H1>],
  ['H2', <H2>Two</H2>],
  ['H3', <H3>Three</H3>],
  ['H4Meta', <H4Meta>Meta</H4Meta>],
  ['Eyebrow', <Eyebrow>Eyebrow</Eyebrow>],
  ['Deck', <Deck>A deck of italic prose.</Deck>],
  ['DropCap', <DropCap letter="A">fter the war.</DropCap>],
  ['StatTile', <StatTile label="Stamina" value={24} sub="/24" gold />],
  ['SelCard', <SelCard selected onClick={() => {}}>Pick me</SelCard>],
  ['Modal', <Modal open title="A Title" footer={<Button>OK</Button>}>Body</Modal>],
  ['PowerRoll', <PowerRoll rows={ability.tiers} />],
  ['AbilityCard', <AbilityCard ability={ability} kind="signature" />],
];

describe('theme primitives render', () => {
  for (const [name, el] of cases) {
    it(`${name} renders without throwing`, () => {
      const { container } = render(el);
      expect(container).toBeTruthy();
    });
  }
});

describe('rules prose inside an ability card', () => {
  // The design constraint: a leading paragraph is emitted unwrapped so it keeps
  // running on from its "Effect." label. Wrapping it would push every one-line
  // effect in the app onto its own line.
  it('leaves a single-paragraph effect inline after its label', () => {
    const { container } = render(<AbilityCard ability={ability} kind="signature" />);
    const eff = container.querySelector('.ac-effect')!;
    expect(eff.textContent).toBe('Effect. It works.');
    expect(eff.querySelector('.rt-p')).toBeNull();
  });

  it('breaks a multi-block effect into paragraphs and a bulleted list', () => {
    const rich = { ...ability, effect: 'Lead in.\n\nThen:\n\n- **One:** first\n- second' };
    const { container } = render(<AbilityCard ability={rich} kind="signature" />);
    const eff = container.querySelector('.ac-effect')!;
    // Lead paragraph inline, second paragraph wrapped, list separate.
    expect(eff.querySelectorAll('.rt-p')).toHaveLength(1);
    expect(eff.querySelectorAll('.rt-li')).toHaveLength(2);
    expect(eff.querySelector('.rt-li b')!.textContent).toBe('One:');
    expect(eff.textContent).toContain('Effect. Lead in.');
  });

  it('bolds a characteristic marker in tier text instead of leaking asterisks', () => {
    const rows: Array<[string, string]> = [['≤ 11', '8 + **A** psychic damage'], ['12–16', '2'], ['17+', '3']];
    const { container } = render(<PowerRoll rows={rows} />);
    const first = container.querySelector('.ac-roll .e')!;
    expect(first.textContent).toBe('8 + A psychic damage');
    expect(first.querySelector('b')!.textContent).toBe('A');
  });
});

describe('SelCard dimmed state', () => {
  it('adds the dimmed class but stays clickable', () => {
    const { container } = render(<SelCard dimmed onClick={() => {}}>Faded</SelCard>);
    const btn = container.querySelector('button')!;
    expect(btn.className).toContain('dimmed');
    expect(btn.disabled).toBe(false);
  });

  it('blocked disables, dimmed does not', () => {
    const { container } = render(<SelCard blocked onClick={() => {}}>Stuck</SelCard>);
    const btn = container.querySelector('button')!;
    expect(btn.disabled).toBe(true);
  });
});
