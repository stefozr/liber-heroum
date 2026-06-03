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
