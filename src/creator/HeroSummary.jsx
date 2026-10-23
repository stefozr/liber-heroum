// creator/HeroSummary.jsx — the left sidebar: a live card of the hero being built
// (art, M/A/R/I/P, name, "Level 1 Devil Tactician", stamina) over the key picks.
import React from 'react';
import { heroSummary } from './summary.js';

const sign = (v) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '+0');

function HeroSummary({ character }) {
  const h = heroSummary(character);
  const pct = h.stamina.max ? Math.round((h.stamina.current / h.stamina.max) * 100) : 0;
  return (
    <aside className="cr-left" aria-label="Your hero">
      <div className="hs-card">
        {h.art ? <img src={h.art} alt="" /> : <div className="hs-mark" aria-hidden="true">✠</div>}
        <div className="hs-scrim">
          <div className="hs-chips" aria-label="Characteristics">
            {h.chars.map(ch => (
              <div key={ch.key} className={`hs-chip${ch.value > 0 ? ' pos' : ch.value < 0 ? ' neg' : ''}`} title={ch.key}>
                {ch.abbr}<b>{sign(ch.value)}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* The chips sit on the art at full width; the strip tiers show this copy instead. */}
      <div className="hs-chips hs-chips-strip" aria-hidden="true">
        {h.chars.map(ch => (
          <div key={ch.key} className={`hs-chip${ch.value > 0 ? ' pos' : ch.value < 0 ? ' neg' : ''}`}>{ch.abbr}<b>{sign(ch.value)}</b></div>
        ))}
      </div>
      <div className="hs-id">
        <div className={`hs-name${h.name ? '' : ' empty'}`}>{h.name || 'Unnamed hero'}</div>
        <div className="hs-level">{h.subtitle}</div>
      </div>
      <div className="hs-vitals">
        <div className="hs-stamina-row"><span>Stamina</span><b>{h.stamina.max ? `${h.stamina.current}/${h.stamina.max}` : '—'}</b></div>
        <div className="hs-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
        <div className="hs-stats">
          <span>Speed <b>{h.speed}</b></span>
          <span>Stab. <b>{h.stability}</b></span>
          <span>Size <b>{h.size}</b></span>
        </div>
      </div>
      <KeyValueList rows={h.kv} />
    </aside>
  );
}

function KeyValueList({ rows }) {
  return (
    <dl className="cr-kv">
      {rows.map(([k, v]) => (
        <div key={k} className="cr-kv-row">
          <dt>{k}</dt>
          <dd className={v ? '' : 'unset'}>{v || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export { HeroSummary, KeyValueList };
