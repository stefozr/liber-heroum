// wizard/steps/pickers.jsx — follow-up pickers shared by the wizard steps and the
// level-up flow: the chip grids and card grids a chosen option unlocks (skills from a
// group, one of N options, one of YOUR skills, languages, a free-text prompt, ability
// cards, ancestry traits worth N points). Each is presentational: the caller owns the
// stored pick and passes `toggle`/`onChange`.
import React from 'react';
import { DS_SKILL_GROUPS, DS_LANGUAGES } from '../../data.jsx';
import { renderRich, Tag, SelCard, AbilityCard } from '../../theme.jsx';
import { skillsTakenExcept } from '../../app.jsx';
import { TraitProse, TraitAbilityCards } from '../../theme/sheet.jsx';

const LABEL = { fontFamily: 'var(--mono)', fontSize: '0.625rem', color: 'var(--ink-3)', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 8 };
const HINT = { fontFamily: 'var(--hand)', fontStyle: 'italic', color: 'var(--ink-3)', fontSize: '0.875rem' };
const NOTE = { fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--ink-2)', marginBottom: 8, lineHeight: 1.5 };
const counter = (picked, count) => (
  <>picked <b style={{ color: picked >= count ? 'var(--gold-2)' : 'var(--ink)' }}>{picked}</b> / {count}</>
);

// Chip grid for a "choose N skills from these groups" choice, with cross-slot dedupe.
function SkillChoicePicker({ character, slotKey, choice, picked, toggle }) {
  const { groups, count } = choice;
  const pool = Array.from(new Set(groups.flatMap(g => DS_SKILL_GROUPS[g] || [])));
  const groupLabel = groups.join(' / ');
  // Skills held in any other slot (other signatures/traits, culture, career, domain, level-ups).
  const takenElsewhere = skillsTakenExcept(character, slotKey);
  return (
    <div style={{marginTop:16}}>
      <div style={{fontFamily:'var(--mono)', fontSize: '0.625rem', color:'var(--ink-3)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:8}}>
        Choose {count} {groupLabel} skill{count > 1 ? 's' : ''} — picked <b style={{color: picked.length === count ? 'var(--gold-2)' : 'var(--ink)'}}>{picked.length}</b> / {count}
      </div>
      <div className="skill-chip-grid">
        {pool.map(s => {
          const on = picked.includes(s);
          const elsewhere = !on && takenElsewhere.has(s);
          const blocked = elsewhere || (!on && picked.length >= count);
          return (
            <button
              type="button"
              key={s}
              className={`skill-chip${on ? ' on' : ''}${blocked ? ' blocked' : ''}`}
              onClick={() => !blocked && toggle(s)}
              disabled={blocked}
              title={elsewhere ? `Already chosen — ${takenElsewhere.get(s)}` : ''}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// "Choose N of these options" — cards when options carry text, chips otherwise.
function OptionChoicePicker({ choice, options, picked, toggle }) {
  const { label, count } = choice;
  const norm = (options || []).map(o => typeof o === 'string' ? { name: o, text: null } : o);
  const detailed = norm.some(o => o.text);
  if (detailed) {
    return (
      <div style={{marginTop:16}}>
        <div style={{fontFamily:'var(--mono)', fontSize: '0.625rem', color:'var(--ink-3)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:10}}>
          {label} — {count === 1 ? 'choose one' : `choose ${count} (${picked.length}/${count})`}
        </div>
        <div className="grid-2">
          {norm.map(o => {
            const on = picked.includes(o.name);
            const blocked = !on && count > 1 && picked.length >= count;
            return (
              <SelCard
                key={o.name}
                selected={on}
                blocked={blocked}
                onClick={() => !blocked && toggle(o.name)}
              >
                <div style={{fontFamily:'var(--display)', fontSize: '0.875rem', letterSpacing:'0.12em', color:'var(--ink)'}}>{o.name}</div>
                {o.text && <div style={{fontFamily:'var(--serif)', fontSize: '0.8125rem', color:'var(--ink-2)', marginTop:8, lineHeight:1.5}}>{renderRich(o.text)}</div>}
              </SelCard>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div style={{marginTop:16}}>
      <div style={{fontFamily:'var(--mono)', fontSize: '0.625rem', color:'var(--ink-3)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:8}}>
        {label} — {count === 1 ? 'choose one' : `choose ${count}`}{count > 1 ? ` (${picked.length}/${count})` : ''}
      </div>
      <div className="skill-chip-grid">
        {norm.map(o => {
          const on = picked.includes(o.name);
          const blocked = !on && count > 1 && picked.length >= count;
          return (
            <button
              type="button"
              key={o.name}
              className={`skill-chip${on ? ' on' : ''}${blocked ? ' blocked' : ''}`}
              onClick={() => !blocked && toggle(o.name)}
              disabled={blocked}
            >
              {o.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}


// Chip grid over skills the hero already holds — for "choose one of your skills"
// (Rival, Area of Expertise). The pool comes from heldSkillsFor(); an empty pool
// means the earlier chapters haven't granted any qualifying skill yet.
function OwnSkillPicker({ label, note, pool, count, picked, toggle, groups }) {
  const scope = groups && groups.length ? `${groups.join(' / ')} ` : '';
  return (
    <div style={{ marginTop: 16 }}>
      <div style={LABEL}>{label} — choose {count} of your {scope}skills — {counter(picked.length, count)}</div>
      {note && <div style={NOTE}>{note}</div>}
      {pool.length === 0 ? (
        <div style={HINT}>No eligible skills yet — this pick draws on the {scope}skills you gain in earlier chapters.</div>
      ) : (
        <div className="skill-chip-grid">
          {pool.map(s => {
            const on = picked.includes(s);
            const blocked = !on && picked.length >= count;
            return (
              <button type="button" key={s} className={`skill-chip${on ? ' on' : ''}${blocked ? ' blocked' : ''}`}
                onClick={() => !blocked && toggle(s)} disabled={blocked}>
                {s}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Chip grid for "choose N languages". `taken` maps a language to who already knows it
// (languagesTakenExcept) so the same tongue can't be learned twice.
function LanguageChipPicker({ label = 'Language', count, pool = DS_LANGUAGES, picked, taken, toggle, verb = 'Choose' }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={LABEL}>{verb} {count} {label.toLowerCase()}{count > 1 ? 's' : ''} — {counter(picked.length, count)}</div>
      <div className="skill-chip-grid">
        {pool.map(L => {
          const on = picked.includes(L);
          const elsewhere = !on && taken && taken.has(L);
          const blocked = elsewhere || (!on && picked.length >= count);
          return (
            <button type="button" key={L} className={`skill-chip${on ? ' on' : ''}${blocked ? ' blocked' : ''}`}
              onClick={() => !blocked && toggle(L)} disabled={blocked}
              title={elsewhere ? `Already known — ${taken.get(L)}` : ''}>
              {L}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// A labelled free-text prompt ("Monster type", "Trinket"). Never required.
function TextChoiceField({ label, placeholder, value, onChange, id }) {
  return (
    <div style={{ marginTop: 16 }}>
      <label htmlFor={id} style={{ ...LABEL, display: 'block' }}>{label} <span style={{ color: 'var(--ink-3)', letterSpacing: 0, textTransform: 'none' }}>(optional)</span></label>
      <input id={id} type="text" className="input-text" value={value || ''} placeholder={placeholder || ''}
        onChange={(e) => onChange(e.target.value)} style={{ width: '100%', maxWidth: 420 }} />
    </div>
  );
}

// Selectable ability cards for "choose an ability" prompts. `picked` is the ability name.
function AbilityPickGrid({ label, note, options, picked, onPick, emptyHint }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={LABEL}>{label} — choose one — {counter(picked ? 1 : 0, 1)}</div>
      {note && <div style={NOTE}>{note}</div>}
      {options.length === 0 ? (
        <div style={HINT}>{emptyHint || 'No abilities to choose from yet.'}</div>
      ) : (
        <div className="grid-2" style={{ gap: 10 }}>
          {options.map(a => {
            const on = picked === a.name;
            return (
              <SelCard key={a.name} selected={on} onClick={() => onPick(on ? null : a.name)} style={{ padding: 10 }}>
                <AbilityCard ability={a} kind="heroic" />
              </SelCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Trait cards with cost tags, for "N ancestry points' worth of traits" (Dragon Dreams).
// A trait that would overspend the budget is blocked; `excluded` names are already
// owned by the hero and drop out of the pool.
function TraitPointPicker({ label, note, traits, points, picked, toggle, excluded = [] }) {
  const pool = traits.filter(t => !excluded.includes(t.name));
  const spent = pool.filter(t => picked.includes(t.name)).reduce((s, t) => s + (t.cost || 0), 0);
  return (
    <div style={{ marginTop: 16 }}>
      <div style={LABEL}>{label} — spent <b style={{ color: spent >= points ? 'var(--gold-2)' : 'var(--ink)' }}>{spent}</b> / {points} points</div>
      {note && <div style={NOTE}>{note}</div>}
      {pool.length === 0 ? <div style={HINT}>No traits left to choose.</div> : (
        <div className="grid-2 grid-drawers">
          {pool.map(t => {
            const on = picked.includes(t.name);
            const blocked = !on && spent + (t.cost || 0) > points;
            return (
              <SelCard key={t.name} selected={on} blocked={blocked} onClick={() => !blocked && toggle(t.name)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', paddingRight: 16 }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: '0.875rem', letterSpacing: '0.12em', color: 'var(--ink)' }}>{t.name}</div>
                  <Tag kind="gold">{t.cost} PT</Tag>
                </div>
                <TraitProse trait={t} style={{ fontFamily: 'var(--serif)', fontSize: '0.8125rem', color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.5 }} />
                <TraitAbilityCards trait={t} />
              </SelCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { SkillChoicePicker, OptionChoicePicker, OwnSkillPicker, LanguageChipPicker, TextChoiceField, AbilityPickGrid, TraitPointPicker };
