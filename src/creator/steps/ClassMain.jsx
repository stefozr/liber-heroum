// creator/steps/ClassMain.jsx — class, then every decision it asks for, in the
// order classSections() lists them (whose ids double as anchors). Class and
// domain skill picks live on the Skills step; the InfoBox says what is granted.
import React from 'react';
import { DS_CLASSES, kitPoolFor, BEASTHEART_COMPANIONS, companionById, SUMMONER_PORTFOLIOS } from '../../data.jsx';
import { classDef } from '../../app.jsx';
import { charBudget, matchesCharArray, CHAR_MIN, CHAR_MAX } from '../../wizard/helpers.js';
import { classSections } from '../../wizard/Wizard.jsx';
import { PW_CONFIG } from '../../wizard/steps/class.jsx';
import * as mut from '../../wizard/mutations.js';
import { useCreator } from '../context.js';
import { ChoiceSection, ChoicesHead, pickStatus } from '../ChoiceSection.jsx';
import { OptionButton, OptionGrid, PosterCard } from '../OptionGrid.jsx';
import { InfoBox } from '../InfoBox.jsx';
import { StepIntro, plural } from './common.jsx';

const ALL_CHARS = ['Might', 'Agility', 'Reason', 'Intuition', 'Presence'];
const sign = (v) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0');
const MINION_TIERS = { sig: ['signature', 'Signature minions'], t3: ['t3', '3-essence minions'] };
const w = () => (typeof window !== 'undefined' ? window : {});

// Status from the class docket's matching entry, so the two never disagree.
function secStatus(sections, id, { count = 1, got, optional } = {}) {
  const s = sections.find(x => x.id === id);
  if (!s) return pickStatus({ count, got: got ?? 0, optional });
  if (s.done) return { kind: 'done', label: 'Done' };
  if (!s.required) return { kind: 'optional', label: 'Optional' };
  return pickStatus({ count, got: got ?? 0 });
}

// Characteristics: the classic point-buy. Fixed scores are locked; the rest spend
// the class budget, each from CHAR_MIN to CHAR_MAX. A lesser-sum official array
// (e.g. 2/−1/−1) is legal even though it leaves points over.
function CharacteristicsSection({ c, cls, sections, update }) {
  const fixed = cls.fixedChars || {};
  const chars = c.cclass.characteristics || {};
  const vals = cls.flexCharOrder.map(k => (typeof chars[k] === 'number' ? chars[k] : 0));
  const budget = charBudget(cls);
  const remaining = budget - vals.reduce((s, v) => s + v, 0);
  const official = remaining > 0 && matchesCharArray(cls, vals);
  const fixedLabel = Object.entries(fixed).map(([k, v]) => `${k} ${sign(v)}`).join(', ');
  return (
    <ChoiceSection id="class-sec-chars" title="Characteristics" status={secStatus(sections, 'class-sec-chars')}
      hint={`${fixedLabel ? `${fixedLabel} fixed. ` : ''}Spend ${plural(budget, 'point')} across the rest, each from ${sign(CHAR_MIN)} to ${sign(CHAR_MAX)} — drop a score to fund another.${
        official ? ' This spread matches an official array.' : remaining > 0 ? ` ${plural(remaining, 'point')} left.` : ''}`}
      actions={<button type="button" className="pb-reset" onClick={() => update(x => mut.resetCharacteristics(x))}>RESET</button>}>
      <div className="pb-grid">
        {ALL_CHARS.map(k => {
          const isFixed = k in fixed;
          const val = isFixed ? fixed[k] : (typeof chars[k] === 'number' ? chars[k] : 0);
          const canInc = !isFixed && val < CHAR_MAX && remaining > 0;
          const canDec = !isFixed && val > CHAR_MIN;
          return (
            <div key={k} className={`pb-stat ${isFixed ? 'fixed' : ''}`}>
              <div className="pb-key">{k}</div>
              <div className="pb-controls">
                {!isFixed && <button type="button" className="pb-btn" disabled={!canDec} onClick={() => update(x => mut.setCharacteristic(x, k, val - 1))} aria-label={`Lower ${k}`}>−</button>}
                <div className="pb-val" style={{ color: val > 0 ? 'var(--gold-2)' : val < 0 ? 'var(--rubric-2)' : 'var(--ink)' }}>{val >= 0 ? '+' + val : val}</div>
                {!isFixed && <button type="button" className="pb-btn" disabled={!canInc} onClick={() => update(x => mut.setCharacteristic(x, k, val + 1))} aria-label={`Raise ${k}`}>+</button>}
              </div>
              {isFixed && <div className="pb-lock">FIXED</div>}
            </div>
          );
        })}
      </div>
    </ChoiceSection>
  );
}

function ClassMain() {
  const { character: c, update } = useCreator();
  const cls = classDef(c);
  const sel = c.cclass.id;
  const cc = c.cclass;
  const sections = cls ? classSections(c).filter(s => s.id !== 'class-sec-skills' && s.id !== 'class-sec-domain-skill') : [];

  return (
    <>
      <StepIntro stepId="class" />
      <ChoiceSection variant="bare" id="cr-class" title="Choose your class" status={pickStatus({ got: sel ? 1 : 0 })}
        detail={sel ? { kind: 'class', id: sel } : null}>
        <div className="grid-3 cr-posters">
          {DS_CLASSES.map(k => (
            <PosterCard key={k.id} art={k.cardImg} name={k.name} glyph={k.glyph} desc={k.blurb} wip={k.wip}
              meta={<>{k.role}{!k.deep && ' · BASICS ONLY'}</>} resource={k.resource}
              selected={sel === k.id} dimmed={!!sel}
              detail={{ kind: 'class', id: k.id }}
              onSelect={() => update(x => mut.setClass(x, k.id))} />
          ))}
        </div>
      </ChoiceSection>

      {cls && <ClassChoices c={c} cls={cls} cc={cc} sections={sections} update={update} />}
    </>
  );
}

function ClassChoices({ c, cls, cc, sections, update }) {
  const doms = cc.domains || [];
  const comp = cc.companion && companionById(cc.companion);
  const portfolio = cls.minionPicks ? SUMMONER_PORTFOLIOS[cc.subclass] : null;
  const pool = kitPoolFor(cls, cc.subclass);
  const inPool = (name) => name && pool.some(k => k.name === name);
  const sug = [cls.quickKit, cls.kit2Required ? cls.quickKit2 : null].filter(inPool);
  const sigsNeed = cls.sigCount ?? 1;
  const sigs = cc.signatures || [];
  const df = cc.domainFeature;

  return (
    <>
      <InfoBox stepId="class" />
      <ChoicesHead />
      <div className="cr-stack">
        {cls.subclasses && (
          <ChoiceSection id="class-sec-subclass" title={cls.subclassName || 'Subclass'} status={secStatus(sections, 'class-sec-subclass')}
            detail={cc.subclass ? { kind: 'subclass', classId: cls.id, id: cc.subclass } : null}>
            <OptionGrid className="wide">
              {cls.subclasses.map(s => {
                const id = s.id || s.name;
                return (
                  <OptionButton key={id} label={s.name} sub={s.tag || null} selected={cc.subclass === id} dimmed={!!cc.subclass}
                    detail={{ kind: 'subclass', classId: cls.id, id }}
                    onSelect={() => update(x => (x.cclass.subclass === id ? x : mut.setSubclass(x, id)))} />
                );
              })}
            </OptionGrid>
          </ChoiceSection>
        )}

        {cls.pickTwoDomains && (
          <>
            <ChoiceSection id="class-sec-domains" title={cls.subclassName || 'Domains'}
              status={secStatus(sections, 'class-sec-domains', { count: 2, got: doms.length })}
              hint="Choose two domains. Picking a third replaces the earlier of the two.">
              <OptionGrid>
                {cls.domains.map(d => (
                  <OptionButton key={d} label={d} selected={doms.includes(d)} dimmed={doms.length >= 2}
                    detail={{ kind: 'domain', name: d }}
                    onSelect={() => update(x => mut.toggleDomain(x, d))} />
                ))}
              </OptionGrid>
            </ChoiceSection>
            {doms.length === 2 && (
              <ChoiceSection id="class-sec-domain-feature" title="Domain feature" status={secStatus(sections, 'class-sec-domain-feature')}
                hint="You gain the 1st-level feature of one of your two domains; the other follows at 2nd level.">
                <OptionGrid className="wide">
                  {doms.map(d => {
                    const f = w().DOMAIN_1ST_FEATURES?.[d];
                    if (!f) return null;
                    return (
                      <OptionButton key={d} label={f.name} sub={d} selected={df?.domain === d} dimmed={!!df}
                        detail={{ kind: 'option', label: `${d} domain feature`, name: f.name, text: f.text, ability: f.ability }}
                        onSelect={() => update(x => mut.setDomainFeature(x, d))} />
                    );
                  })}
                </OptionGrid>
              </ChoiceSection>
            )}
            {doms.length === 2 && (
              <ChoiceSection id="class-sec-domain-ability" title="Domain ability" status={secStatus(sections, 'class-sec-domain-ability')}
                hint={`Each domain grants a ${cls.resource}-fueled ability. Choose one tied to your domains.`}>
                <OptionGrid className="wide">
                  {doms.flatMap(d => (w().DOMAIN_2_ABILITIES?.[d] || []).map(a => (
                    <OptionButton key={d + a.name} label={a.name} sub={d}
                      selected={cc.domainAbility?.domain === d && cc.domainAbility?.name === a.name} dimmed={!!cc.domainAbility}
                      detail={{ kind: 'ability', ability: a, roll: 'I', label: `${d} domain ability` }}
                      onSelect={() => update(x => mut.setDomainAbility(x, d))} />
                  )))}
                </OptionGrid>
              </ChoiceSection>
            )}
          </>
        )}

        {cls.companionRequired && (
          <ChoiceSection id="class-sec-companion" title="Companion" status={secStatus(sections, 'class-sec-companion')}
            detail={cc.companion ? { kind: 'companion', id: cc.companion } : null}>
            <OptionGrid>
              {BEASTHEART_COMPANIONS.map(b => (
                <OptionButton key={b.id} label={b.name} selected={cc.companion === b.id} dimmed={!!cc.companion}
                  detail={{ kind: 'companion', id: b.id }}
                  onSelect={() => update(x => mut.setCompanion(x, b.id))} />
              ))}
            </OptionGrid>
          </ChoiceSection>
        )}
        {comp?.optionChoice && (
          <ChoiceSection id="class-sec-companion-option" title={comp.optionChoice.label} status={secStatus(sections, 'class-sec-companion-option')}>
            <OptionGrid>
              {comp.optionChoice.options.map(o => {
                const on = (cc.companionOptions || {})[comp.optionChoice.id] === o;
                return (
                  <OptionButton key={o} label={o} selected={on} dimmed={!!(cc.companionOptions || {})[comp.optionChoice.id]}
                    detail={{ kind: 'companion', id: comp.id }}
                    onSelect={() => update(x => mut.setCompanionOption(x, comp.optionChoice.id, o))} />
                );
              })}
            </OptionGrid>
          </ChoiceSection>
        )}

        {cls.minionPicks && Object.entries(cls.minionPicks).map(([tier, need]) => {
          const [listKey, label] = MINION_TIERS[tier] || [tier, tier];
          const got = (cc.minions || {})[tier] || [];
          return (
            <ChoiceSection key={tier} id={`class-sec-minions-${tier}`} title={portfolio ? `${portfolio.label} — ${label}` : label}
              status={secStatus(sections, `class-sec-minions-${tier}`, { count: need, got: got.length })}
              hint={portfolio ? null : `Choose your ${(cls.subclassName || 'circle').toLowerCase()} first — it decides the portfolio of minions you can summon.`}>
              {portfolio && (
                <OptionGrid className="wide">
                  {(portfolio[listKey] || []).map(m => {
                    const on = got.includes(m.id);
                    const full = !on && got.length >= need;
                    return (
                      <OptionButton key={m.id} label={m.name} selected={on} dimmed={got.length >= need} reason={full ? `Already picked ${need} — drop one first` : null}
                        detail={{ kind: 'minion', block: m, label }}
                        onSelect={() => update(x => mut.toggleMinion(x, tier, m.id, need))} />
                    );
                  })}
                </OptionGrid>
              )}
            </ChoiceSection>
          );
        })}

        {cls.pickOneDomain && (
          <ChoiceSection id="class-sec-domain" title="Deity & domain" status={secStatus(sections, 'class-sec-domain')}
            detail={doms[0] ? { kind: 'domain', name: doms[0], censor: true } : null}
            hint={df ? `${df.name}: granted by ${df.domain}.` : 'Pick one domain from your deity’s portfolio. It grants a 1st-level feature and a skill.'}>
            <OptionGrid>
              {cls.domains.map(d => (
                <OptionButton key={d} label={d} selected={doms[0] === d} dimmed={!!doms[0]}
                  detail={{ kind: 'domain', name: d, censor: true }}
                  onSelect={() => update(x => mut.pickCensorDomain(x, d))} />
              ))}
            </OptionGrid>
          </ChoiceSection>
        )}

        {cls.flexCharOrder && <CharacteristicsSection c={c} cls={cls} sections={sections} update={update} />}

        {(cls.features || []).flatMap(f => (PW_CONFIG[f.choose] || []).filter(([, poolKey]) => (cls[poolKey] || []).length).map(([label, poolKey, stateKey]) => (
          <ChoiceSection key={stateKey} id={`class-sec-${stateKey}`} title={label} status={secStatus(sections, `class-sec-${stateKey}`)}
            hint={`From ${f.name}.`}>
            <OptionGrid className="wide">
              {cls[poolKey].map(o => (
                <OptionButton key={o.name} label={o.name} selected={cc[stateKey] === o.name} dimmed={!!cc[stateKey]}
                  detail={{ kind: 'option', label, name: o.name, text: o.text, ability: o.ability }}
                  onSelect={() => update(x => mut.setClassChoice(x, stateKey, o.name))} />
              ))}
            </OptionGrid>
          </ChoiceSection>
        )))}

        {sigsNeed > 0 ? (
          <ChoiceSection id="class-sec-signatures" title={sigsNeed === 1 ? 'Signature ability' : 'Signature abilities'}
            status={secStatus(sections, 'class-sec-signatures', { count: sigsNeed, got: sigs.length })}>
            <OptionGrid className="wide">
              {cls.signatures.map(a => {
                const on = sigs.includes(a.name);
                return (
                  <OptionButton key={a.name} label={a.name} selected={on} dimmed={sigs.length >= sigsNeed}
                    detail={{ kind: 'ability', ability: a, abilityKind: 'sig', label: 'Signature ability' }}
                    onSelect={() => update(x => mut.toggleSignature(x, a.name))} />
                );
              })}
            </OptionGrid>
          </ChoiceSection>
        ) : cls.signatureNote ? (
          <ChoiceSection id="class-sec-signatures" title="Signature abilities" status={{ kind: 'granted', label: 'From your kits' }} hint={cls.signatureNote} />
        ) : null}

        {[['heroic3', cls.heroic3, mut.setHeroic3], ['heroic5', cls.heroic5, mut.setHeroic5]].filter(([, list]) => cls.deep && list?.length).map(([k, list, set]) => (
          <ChoiceSection key={k} id={`class-sec-${k}`} title={`${k === 'heroic3' ? 3 : 5}-${cls.resource} heroic ability`} status={secStatus(sections, `class-sec-${k}`)}>
            <OptionGrid className="wide">
              {list.map(a => (
                <OptionButton key={a.name} label={a.name} selected={cc[k] === a.name} dimmed={!!cc[k]}
                  detail={{ kind: 'ability', ability: a, abilityKind: 'heroic', label: `${k === 'heroic3' ? 3 : 5}-${cls.resource} ability` }}
                  onSelect={() => update(x => set(x, a.name))} />
              ))}
            </OptionGrid>
          </ChoiceSection>
        ))}

        {cls.kitRequired && (
          <ChoiceSection id="class-sec-kit" title={cls.kit2Required ? 'Choose two kits' : 'Kit'}
            detail={c.kit?.id ? { kind: 'kit', id: c.kit.id } : null}
            status={cls.kit2Required
              ? pickStatus({ count: 2, got: [c.kit?.id, c.kit2?.id].filter(id => id && pool.some(k => k.id === id)).length })
              : secStatus(sections, 'class-sec-kit')}
            hint={[
              cls.kit2Required ? 'Field Arsenal equips two kits at once — picking a third drops the earlier one.' : null,
              sug.length ? `Suggested: ${sug.join(' + ')}` : null,
            ].filter(Boolean).join(' ') || null}>
            <div id="class-sec-kit2" />
            <OptionGrid className="wide">
              {pool.map(k => {
                const order = k.id === c.kit?.id ? 1 : k.id === c.kit2?.id ? 2 : 0;
                const on = cls.kit2Required ? order > 0 : c.kit?.id === k.id;
                const full = cls.kit2Required ? !!(c.kit?.id && c.kit2?.id) : !!c.kit?.id;
                return (
                  <OptionButton key={k.id} label={k.name} sub={k.pool === 'stormwight' ? 'Stormwight' : `${k.armor} armor`}
                    selected={on} dimmed={full}
                    badge={cls.kit2Required && order ? (order === 1 ? '1st kit' : '2nd kit') : sug.includes(k.name) ? 'Suggested' : null}
                    detail={{ kind: 'kit', id: k.id }}
                    onSelect={() => update(x => (cls.kit2Required ? mut.pickDualKit(x, k.id) : mut.setKit(x, k.id)))} />
                );
              })}
            </OptionGrid>
          </ChoiceSection>
        )}
      </div>
    </>
  );
}

export { ClassMain };
