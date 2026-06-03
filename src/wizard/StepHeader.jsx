// wizard/StepHeader.jsx — the per-step title/deck header (shared by all steps).
import React from 'react';
import { OrnDivider, GlyphRow, Crest, renderGlyph, Pill, Tag, Button, IconButton, H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap, StatTile, SelCard, Modal, PowerRoll, AbilityCard } from '../theme.jsx';

function StepHeader({ step }) {
  const title = step.title || '';
  const first = title.charAt(0);
  const rest = title.slice(1);
  return (
    <div className="wiz-header">
      <h1 className="h1-display">
        <DropCap letter={first}>
          <em>{rest}</em>
        </DropCap>
      </h1>
      <Deck>{step.deck}</Deck>
    </div>
  );
}

// ───────── Validation per step ─────────

export { StepHeader };
