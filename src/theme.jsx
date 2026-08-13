// theme.jsx â€” barrel re-exporting styles + UI primitives (see src/theme/).
// Kept at this path and still publishing to window (rules.jsx reads window.AbilityCard).
import { RELIQUARY_CSS, ThemeStyles } from './theme/styles.js';
import { OrnDivider, GlyphRow, Crest, renderGlyph, renderRich, Pill, SavePill, Tag, Button, IconButton, TopBar, H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap, StatTile, SelCard, Modal, PowerRoll, FeatureTable, AbilityCard } from './theme/primitives.jsx';

Object.assign(window, {
  RELIQUARY_CSS, ThemeStyles, OrnDivider, GlyphRow, Crest, renderGlyph, renderRich, Pill, SavePill, Tag, Button, IconButton, TopBar, H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap, StatTile, SelCard, Modal, PowerRoll, FeatureTable, AbilityCard,
});

export {
  RELIQUARY_CSS, ThemeStyles, OrnDivider, GlyphRow, Crest, renderGlyph, renderRich, Pill, SavePill, Tag, Button, IconButton, TopBar, H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap, StatTile, SelCard, Modal, PowerRoll, FeatureTable, AbilityCard,
};
