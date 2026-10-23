// creator/summary.js — the live hero summary the creator's left sidebar shows.
import { classDef, ancestryDef, kitDef, kit2Def, computeDerived } from '../app.jsx';
import { stepSummary } from '../wizard/Wizard.jsx';

const CHAR_KEYS = [['Might', 'M'], ['Agility', 'A'], ['Reason', 'R'], ['Intuition', 'I'], ['Presence', 'P']];

function heroSummary(c) {
  const cls = classDef(c);
  const anc = ancestryDef(c);
  const d = computeDerived(c);
  const sub = cls?.subclasses?.find(s => (s.id || s.name) === c.cclass?.subclass);
  const kits = [kitDef(c), kit2Def(c)].filter(Boolean).map(k => k.name);
  const staminaMax = d.staminaMax;
  const stamina = c.play?.stamina == null ? staminaMax : Math.min(c.play.stamina, staminaMax);
  return {
    name: c.identity?.name || c.name || '',
    // Portrait, else class art, else ancestry art (as the roster's hero cards).
    art: c.portrait || cls?.cardImg || cls?.img || anc?.img || null,
    subtitle: ['Level ' + (c.level || 1), anc?.name, sub && !cls?.pickTwoDomains ? sub.name : null, cls?.name].filter(Boolean).join(' '),
    chars: CHAR_KEYS.map(([key, abbr]) => ({ key, abbr, value: cls ? d.chars[key] || 0 : 0 })),
    stamina: { current: cls ? stamina : 0, max: cls ? staminaMax : 0 },
    recoveries: cls ? d.recoveries : null,
    speed: d.speed, stability: d.stability, size: d.size,
    kv: [
      ['Culture', stepSummary(c, 'culture')],
      ['Career', stepSummary(c, 'career')],
      ['Kit', kits.length ? kits.join(' + ') : (cls && !cls.kitRequired ? '—' : null)],
      ['Complication', stepSummary(c, 'complication')],
    ],
  };
}

export { heroSummary, CHAR_KEYS };
