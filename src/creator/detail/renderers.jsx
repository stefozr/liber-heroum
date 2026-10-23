// creator/detail/renderers.jsx — what the detail panel prints for each kind of
// target. A target is a plain object { kind, ...ids }; renderers re-read the game
// data (and the hero) on every render, so a pinned target never goes stale.
// Everything here reuses the classic wizard's primitives — the prose and cards a
// classic SelCard prints inline are what this panel shows on the side.
import React from 'react';
import { DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS, DS_SKILL_GROUPS, companionById } from '../../data.jsx';
import { renderRich, AbilityCard, FeatureTable } from '../../theme.jsx';
import { TraitProse, TraitAbilityCards, KitDetails, StatblockCard } from '../../theme/sheet.jsx';
import { ancestryDef, careerDef, collectSkillPicks, collectLanguagePicks } from '../../app.jsx';
import { ancestrySignatures, ancestryPoints, groupsOfSkill, PERKS, perkDef, PERK_CHOICES, normalizeAbilityTiers } from '../../wizard/helpers.js';
import { CREATOR_STEPS, creatorStepIntro } from '../steps.js';

const Title = ({ kicker, children }) => (
  <>
    {kicker && <div className="dp-kicker">{kicker}</div>}
    <h2 className="dp-title">{children}</h2>
  </>
);
const Text = ({ children }) => (children ? <div className="dp-text">{typeof children === 'string' ? renderRich(children) : children}</div> : null);
const Section = ({ title, children }) => (
  <div className="dp-section">
    {title && <div className="dp-section-title">{title}</div>}
    {children}
  </div>
);
const Feature = ({ name, text, table }) => (
  <div className="dp-feature">
    <div className="dp-feature-name">{name}</div>
    {text && <Text>{text}</Text>}
    {table && <FeatureTable table={table} />}
  </div>
);

// ── Step intros ──
function IntroDetail({ target }) {
  const step = CREATOR_STEPS.find(s => s.id === target.stepId) || CREATOR_STEPS[0];
  const intro = creatorStepIntro(step);
  return (
    <>
      <Title kicker={intro.eyebrow || 'Skills & Languages'}>{intro.title}</Title>
      <Text>{intro.deck}</Text>
      <div className="dp-empty" style={{ marginTop: 14 }}>Hover or focus an option to read it here; choosing one keeps it pinned.</div>
    </>
  );
}

// ── Ancestry ──
function AncestryDetail({ target, character }) {
  const a = DS_ANCESTRIES.find(x => x.id === target.id);
  if (!a) return null;
  const isMine = character.ancestry?.id === a.id;
  const pts = isMine ? ancestryPoints(character) : a.points;
  return (
    <>
      <Title kicker="Ancestry">{a.name}</Title>
      <Text>{a.desc}</Text>
      {(a.height || a.lifespan || a.size) && (
        <div className="dp-meta">
          {a.size && <span>Size <b>{a.size}</b></span>}
          {a.speed != null && <span>Speed <b>{a.speed}</b></span>}
          {a.height && <span>Height <b>{a.height}</b></span>}
          {a.weight && <span>Weight <b>{a.weight}</b></span>}
          {a.lifespan && <span>Lifespan <b>{a.lifespan}</b></span>}
        </div>
      )}
      {ancestrySignatures(a).map(sig => (
        <Section key={sig.name} title={`Signature trait · ${sig.name}`}>
          <TraitProse trait={sig} className="dp-text" />
          <TraitAbilityCards trait={sig} />
        </Section>
      ))}
      <Section title="Purchased traits">
        <Text>{`You have ${pts} ancestry point${pts === 1 ? '' : 's'} to spend on ${a.name.toLowerCase()} traits${a.quick?.length ? ` — the quick build takes ${a.quick.join(' and ')}` : ''}.`}</Text>
      </Section>
    </>
  );
}

function TraitDetail({ target }) {
  const t = target.trait;
  if (!t) return null;
  return (
    <>
      <Title kicker={[target.kicker || 'Trait', t.cost != null ? `${t.cost} point${t.cost === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}>{t.name}</Title>
      {t.borrowedFrom && <div className="dp-empty">Borrowed from {t.borrowedFrom}.</div>}
      <TraitProse trait={t} className="dp-text" />
      <TraitAbilityCards trait={t} />
    </>
  );
}

// ── Culture ──
const ASPECT_LIST = { environment: 'environments', organization: 'organizations', upbringing: 'upbringings' };
function ArchetypeDetail({ target }) {
  const a = DS_CULTURES.archetypes.find(x => x.name === target.name);
  if (!a) return null;
  const find = (list, id) => DS_CULTURES[list].find(x => x.id === id);
  return (
    <>
      <Title kicker="Archetypical culture">{a.name}</Title>
      {a.desc && <Text>{a.desc}</Text>}
      {[['Environment', 'environments', a.env], ['Organization', 'organizations', a.org], ['Upbringing', 'upbringings', a.upb]].map(([label, list, id]) => {
        const it = find(list, id);
        return it ? (
          <Section key={label} title={`${label} · ${it.name}`}>
            <Text>{it.desc}</Text>
          </Section>
        ) : null;
      })}
    </>
  );
}
function AspectDetail({ target }) {
  const it = (DS_CULTURES[ASPECT_LIST[target.aspect]] || []).find(x => x.id === target.id);
  if (!it) return null;
  return (
    <>
      <Title kicker={target.aspect}>{it.name}</Title>
      <Text>{it.desc}</Text>
      <div className="dp-meta">
        <span>Skill <b>one from {it.skillLabel || (it.skillGroups || []).join(' / ')}</b></span>
        {it.quick && <span>Quick build <b>{it.quick}</b></span>}
      </div>
    </>
  );
}

// ── Career ──
function CareerDetail({ target }) {
  const car = DS_CAREERS.find(x => x.id === target.id);
  if (!car) return null;
  const rows = [
    ['Skills', car.skills], ['Quick build', car.quick],
    car.languages > 0 && ['Languages', `+${car.languages}`], car.renown > 0 && ['Renown', `+${car.renown}`],
    car.wealth > 0 && ['Wealth', `+${car.wealth}`], car.projectPoints && ['Project points', car.projectPoints], ['Perk', car.perk],
  ].filter(Boolean);
  return (
    <>
      <Title kicker="Career">{car.name}</Title>
      <Text>{car.desc}</Text>
      <Section title="Benefits">
        <dl className="dp-table">{rows.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>
      </Section>
      {car.questions?.length > 0 && (
        <Section title="Define your career">
          <ul className="dp-list">{car.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
        </Section>
      )}
    </>
  );
}
function IncidentDetail({ target }) {
  const car = DS_CAREERS.find(x => x.id === target.careerId);
  const inc = (car?.incidents || []).map(i => (typeof i === 'string' ? { name: i } : i)).find(i => i.name === target.name);
  if (!inc) return null;
  return (
    <>
      <Title kicker="Inciting incident">{inc.name}</Title>
      <Text>{inc.text || 'What turned you from a comfortable life to the path of a hero?'}</Text>
    </>
  );
}
function PerkDetail({ target }) {
  const p = perkDef(target.name);
  if (!p) return null;
  const group = Object.keys(PERKS).find(g => PERKS[g].some(x => x.name === p.name));
  const spec = PERK_CHOICES[p.name];
  return (
    <>
      <Title kicker={`${group} perk`}>{p.name}</Title>
      <TraitProse trait={p} className="dp-text" />
      <TraitAbilityCards trait={p} />
      {spec && <div className="dp-empty" style={{ marginTop: 12 }}>Its follow-up pick ({spec.ownSkill ? spec.ownSkill.label.toLowerCase() : 'two languages'}) is made on the Skills &amp; Languages step.</div>}
    </>
  );
}

// ── Class ──
function ClassDetail({ target, character }) {
  const cls = DS_CLASSES.find(x => x.id === target.id);
  if (!cls) return null;
  const sub = character.cclass?.id === cls.id ? character.cclass.subclass : null;
  return (
    <>
      <Title kicker={`${cls.role} · ${cls.resource}`}>{cls.name}</Title>
      {cls.quote && <div className="dp-quote">“{cls.quote}”</div>}
      <Text>{cls.longBlurb || cls.blurb}</Text>
      {cls.wip && <div className="dp-empty">Work in progress — some of this class is still being entered.</div>}
      {cls.features?.length > 0 && (
        <Section title="First-level features">
          {cls.features.map(f => {
            const rider = f.ability?.riderBySub?.[sub];
            const ability = rider ? { ...f.ability, orderBenefit: rider } : f.ability;
            return ability
              ? <AbilityCard key={f.name} ability={ability} kind="sig" />
              : <Feature key={f.name} name={f.name} text={f.text} table={f.table} />;
          })}
        </Section>
      )}
    </>
  );
}
function SubclassDetail({ target }) {
  const cls = DS_CLASSES.find(x => x.id === target.classId);
  const s = (cls?.subclasses || []).find(x => (x.id || x.name) === target.id);
  if (!s) return null;
  const feats = [...(s.acolyte ? [s.acolyte] : []), ...(s.features || [])];
  return (
    <>
      <Title kicker={[cls.subclassName || 'Subclass', s.tag].filter(Boolean).join(' · ')}>{s.name}</Title>
      <Text>{s.text}</Text>
      {(s.skill || s.skillGroup) && <div className="dp-meta"><span>Skill <b>{s.skill || `one ${s.skillGroup} skill`}</b></span></div>}
      {(feats.length > 0 || (s.abilities || []).length > 0) && (
        <Section title="Grants">
          {feats.map(f => <Feature key={f.name} name={f.name} text={f.text} table={f.table} />)}
          {(s.abilities || []).map(a => <AbilityCard key={a.name} ability={a} kind="sig" />)}
        </Section>
      )}
    </>
  );
}
function DomainDetail({ target }) {
  const w = typeof window !== 'undefined' ? window : {};
  const f = target.censor ? (w.CENSOR_DOMAIN_1 || w.DOMAIN_1ST_FEATURES || {})[target.name] : (w.DOMAIN_1ST_FEATURES || {})[target.name];
  const abilities = (w.DOMAIN_2_ABILITIES || {})[target.name] || [];
  return (
    <>
      <Title kicker="Domain">{target.name}</Title>
      {f && (
        <Section title={`First-level feature · ${f.name}`}>
          <Text>{f.text}</Text>
          {f.skillGroup && <div className="dp-meta"><span>Skill <b>one {f.skillGroup} skill</b></span></div>}
          {f.ability && <AbilityCard ability={f.ability} kind="sig" />}
        </Section>
      )}
      {!target.censor && abilities.length > 0 && (
        <Section title="Domain ability">
          {abilities.map(a => <AbilityCard key={a.name} ability={normalizeAbilityTiers(a, 'I')} kind="heroic" />)}
        </Section>
      )}
    </>
  );
}
function OptionDetail({ target }) {
  return (
    <>
      <Title kicker={target.label}>{target.name}</Title>
      <Text>{target.text}</Text>
      {target.ability && <AbilityCard ability={target.ability} kind={target.abilityKind || 'sig'} />}
    </>
  );
}
function AbilityDetail({ target }) {
  if (!target.ability) return null;
  return (
    <>
      {target.label && <div className="dp-kicker">{target.label}</div>}
      <AbilityCard ability={normalizeAbilityTiers(target.ability, target.roll || 'M')} kind={target.abilityKind || 'heroic'} />
    </>
  );
}
function KitDetail({ target }) {
  const k = DS_KITS.find(x => x.id === target.id);
  if (!k) return null;
  return (
    <>
      <Title kicker={`${k.weapon} weapon · ${k.armor} armor`}>{k.name}</Title>
      <KitDetails kit={k} />
      {(k.features || []).map(f => <Section key={f.name}><Feature name={f.name} text={f.text} table={f.table} /></Section>)}
    </>
  );
}
function CompanionDetail({ target, character }) {
  const b = companionById(target.id);
  if (!b) return null;
  return (
    <>
      <div className="dp-kicker">Companion</div>
      <StatblockCard block={b} level={character.level || 1} staminaNote="= yours" />
    </>
  );
}
function MinionDetail({ target, character }) {
  if (!target.block) return null;
  return (
    <>
      <div className="dp-kicker">{target.label || 'Minion'}</div>
      <StatblockCard block={target.block} level={character.level || 1} />
    </>
  );
}

// ── Complication ──
function ComplicationDetail({ target }) {
  if (target.none) {
    return (
      <>
        <Title kicker="Complication">No complication</Title>
        <Text>Complications are optional. Skip it and your hero carries no extra benefit or drawback — you can still choose one later with your Director.</Text>
      </>
    );
  }
  const c = DS_COMPLICATIONS.find(x => x.id === target.id);
  if (!c) return null;
  return (
    <>
      <Title kicker={c.d100 ? `Complication · d100 ${c.d100}` : 'Complication'}>{c.name}</Title>
      <Section title={c.combined ? 'Benefit and drawback' : 'Benefit'}><Text>{c.benefit}</Text></Section>
      {!c.combined && <Section title="Drawback"><Text>{c.drawback}</Text></Section>}
      {(c.abilities || []).length > 0 && <Section title="Grants">{c.abilities.map(a => <AbilityCard key={a.name} ability={a} kind="sig" />)}</Section>}
    </>
  );
}

// ── Skills & languages ──
function SkillDetail({ target, character }) {
  const held = collectSkillPicks(character).filter(p => p.name === target.name);
  const groups = groupsOfSkill(target.name);
  return (
    <>
      <Title kicker={groups.length ? `${groups.join(' · ')} skill` : 'Skill'}>{target.name}</Title>
      {target.reason && <Text>{target.reason}</Text>}
      {held.length > 0
        ? <div className="dp-meta"><span>Held from <b>{held.map(p => p.source).join(', ')}</b></span></div>
        : <div className="dp-empty">Not yet held by this hero.</div>}
      {groups.map(g => (
        <Section key={g} title={`The ${g} group`}>
          <div className="dp-text">{(DS_SKILL_GROUPS[g] || []).join(' · ')}</div>
        </Section>
      ))}
    </>
  );
}
function LanguageDetail({ target, character }) {
  const known = collectLanguagePicks(character).filter(p => p.name === target.name);
  return (
    <>
      <Title kicker="Language">{target.name}</Title>
      {target.reason && <Text>{target.reason}</Text>}
      {known.length > 0
        ? <div className="dp-meta"><span>Known from <b>{known.map(p => p.source).join(', ')}</b></span></div>
        : <div className="dp-empty">Not yet known by this hero.</div>}
    </>
  );
}

// ── Identity ──
// Not a second hero card (the left sidebar is one): material for the fields being
// filled in — a typical build for age, height and weight, and backstory prompts
// drawn from the choices already made.
function IdentityDetail({ character: c }) {
  const anc = ancestryDef(c);
  // A revenant looks like what they were: the former life sets height and weight.
  const former = anc?.id === 'revenant' ? DS_ANCESTRIES.find(a => a.id === c.ancestry?.formerLife) : null;
  const body = former || anc;
  const car = careerDef(c);
  const inc = car && c.career?.incident
    ? (car.incidents || []).map(i => (typeof i === 'string' ? { name: i } : i)).find(i => i.name === c.career.incident)
    : null;
  const comp = DS_COMPLICATIONS.find(x => x.id === c.complication?.id);
  const cu = c.culture || {};
  const aspect = (list, id) => DS_CULTURES[list].find(x => x.id === id)?.name;
  const culture = [aspect('environments', cu.environment), aspect('organizations', cu.organization), aspect('upbringings', cu.upbringing)].filter(Boolean);
  const build = body ? [
    body.height && ['Height', body.height], body.weight && ['Weight', body.weight],
    anc.lifespan && ['Life expectancy', anc.lifespan], body.size && ['Size', body.size],
  ].filter(Boolean) : [];
  const nothing = !build.length && !car && !comp && !culture.length;
  return (
    <>
      <Title kicker="Identity">Inspiration</Title>
      {nothing && <div className="dp-empty">Choose an ancestry, culture and career first — this panel gathers prompts from them for your hero’s look and story.</div>}
      {build.length > 0 && (
        <Section title={former ? `Typical ${anc.name.toLowerCase()} (once ${former.name.toLowerCase()})` : `Typical ${anc.name.toLowerCase()}`}>
          <dl className="dp-table">{build.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>
        </Section>
      )}
      {culture.length > 0 && (
        <Section title="Where you grew up">
          <Text>{`${culture.join(' · ')}${cu.language ? ` — you speak ${cu.language}.` : '.'}`}</Text>
        </Section>
      )}
      {car && (
        <Section title={`Before the call · ${car.name}`}>
          {inc && <div className="dp-feature"><div className="dp-feature-name">{inc.name}</div>{inc.text && <Text>{inc.text}</Text>}</div>}
          {(c.career?.taken || '').trim() && <Text>{`Taken from you: ${c.career.taken.trim()}`}</Text>}
          {car.questions?.length > 0 && <ul className="dp-list">{car.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>}
        </Section>
      )}
      {comp && (
        <Section title={`Your complication · ${comp.name}`}>
          <Text>{comp.combined ? comp.benefit : `${comp.benefit} ${comp.drawback}`}</Text>
        </Section>
      )}
    </>
  );
}

const DETAIL_RENDERERS = {
  intro: IntroDetail,
  ancestry: AncestryDetail,
  trait: TraitDetail,
  archetype: ArchetypeDetail,
  aspect: AspectDetail,
  career: CareerDetail,
  incident: IncidentDetail,
  perk: PerkDetail,
  class: ClassDetail,
  subclass: SubclassDetail,
  domain: DomainDetail,
  option: OptionDetail,
  ability: AbilityDetail,
  kit: KitDetail,
  companion: CompanionDetail,
  minion: MinionDetail,
  complication: ComplicationDetail,
  skill: SkillDetail,
  language: LanguageDetail,
  identity: IdentityDetail,
};

export { DETAIL_RENDERERS };
