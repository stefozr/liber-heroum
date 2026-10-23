// creator/steps/AncestryMain.jsx — ancestry, then its follow-ups: signature and
// trait option choices, a revenant's former life, and the purchased traits.
// Skill choices the ancestry grants are made on the Skills step (see the InfoBox).
import React from 'react';
import { DS_ANCESTRIES } from '../../data.jsx';
import { ancestryDef } from '../../app.jsx';
import { ancestryPoints, ancestrySpent, ancestrySignatures, resolvedAncestryTraits, orderTraitCards } from '../../wizard/helpers.js';
import * as mut from '../../wizard/mutations.js';
import { useCreator } from '../context.js';
import { ChoiceSection, ChoicesHead, pickStatus } from '../ChoiceSection.jsx';
import { OptionButton, OptionGrid, PosterCard } from '../OptionGrid.jsx';
import { InfoBox } from '../InfoBox.jsx';
import { StepIntro, plural, normOptions } from './common.jsx';

const PREV_LIFE = [['Previous Life: 1pt', 1], ['Previous Life: 2pt', 2]];

// One option choice (Wyrmplate immunity, Runic Carving, Prismatic Scales, …).
function OptionChoiceSection({ id, title, choice, options, picked, onToggle, kicker }) {
  const opts = normOptions(options);
  const count = choice.count || 1;
  return (
    <ChoiceSection id={id} title={title} status={pickStatus({ count, got: picked.length })}
      hint={count > 1 ? `Choose ${count}.` : null}>
      <OptionGrid>
        {opts.map(o => {
          const on = picked.includes(o.name);
          const full = !on && count > 1 && picked.length >= count;
          return (
            <OptionButton key={o.name} label={o.name} selected={on} dimmed={picked.length >= count} blocked={full}
              reason={full ? `Already picked ${count}` : null}
              detail={{ kind: 'option', label: kicker || choice.label, name: o.name, text: o.text, ability: o.ability }}
              onSelect={() => onToggle(o.name)} />
          );
        })}
      </OptionGrid>
    </ChoiceSection>
  );
}

function AncestryMain() {
  const { character: c, update } = useCreator();
  const anc = ancestryDef(c);
  const sel = c.ancestry.id;
  const budget = anc ? ancestryPoints(c) : 0;
  const remaining = budget - ancestrySpent(c);
  const owned = c.ancestry.traits || [];
  const affordable = anc && remaining > 0 && anc.traits.some(t => !owned.includes(t.name) && t.cost <= remaining);
  const formerAnc = DS_ANCESTRIES.find(a => a.id === c.ancestry.formerLife) || null;
  const sigOptions = c.ancestry.sigOptions || {};
  const choiceTraits = resolvedAncestryTraits(c).filter(t => !t.placeholder && t.optionChoice);

  return (
    <>
      <StepIntro stepId="ancestry" />
      <ChoiceSection variant="bare" id="cr-ancestry" title="Choose your ancestry" status={pickStatus({ got: sel ? 1 : 0 })}
        hint={!anc ? 'Each ancestry grants points to spend on its traits — those appear below once you choose.' : null}
        detail={sel ? { kind: 'ancestry', id: sel } : null}>
        <div className="grid-3 cr-posters">
          {DS_ANCESTRIES.map(a => (
            <PosterCard key={a.id} art={a.img} name={a.name} glyph={a.glyph} desc={a.desc}
              selected={sel === a.id} dimmed={!!sel}
              detail={{ kind: 'ancestry', id: a.id }}
              onSelect={() => update(x => mut.setAncestry(x, a.id))} />
          ))}
        </div>
      </ChoiceSection>

      {anc && (
        <>
          <InfoBox stepId="ancestry" />
          <ChoicesHead />
          <div className="cr-stack">
            {ancestrySignatures(anc).filter(sig => sig.optionChoice).map(sig => (
              <OptionChoiceSection key={sig.name} id={`cr-sig-${sig.name}`} title={`Signature trait: ${sig.name}`}
                kicker={sig.optionChoice.label} choice={sig.optionChoice} options={sig.optionChoice.options}
                picked={sigOptions[sig.name] || []}
                onToggle={(o) => update(x => mut.toggleSigOption(x, sig.name, sig.optionChoice.count, o))} />
            ))}

            {anc.id === 'revenant' && (
              <ChoiceSection id="cr-former-life" title="Former life" status={pickStatus({ got: formerAnc ? 1 : 0 })}
                hint="The ancestry you were before you died. It sets your size; your speed is always 5. Its traits are yours only through a Previous Life trait.">
                <OptionGrid>
                  {DS_ANCESTRIES.filter(a => a.id !== 'revenant').map(a => (
                    <OptionButton key={a.id} label={a.name} selected={formerAnc?.id === a.id} dimmed={!!formerAnc}
                      detail={{ kind: 'ancestry', id: a.id }}
                      onSelect={() => update(x => (x.ancestry.formerLife === a.id ? x : mut.setFormerLife(x, a.id)))} />
                  ))}
                </OptionGrid>
              </ChoiceSection>
            )}

            <ChoiceSection id="cr-traits" title={`Purchased ${anc.name} traits`}
              status={affordable ? { kind: 'points', label: `${plural(remaining, 'point')} to spend` } : { kind: 'done', label: 'Done' }}
              hint={anc.quick?.length ? `Quick build: ${anc.quick.join(' + ')}` : null}>
              <OptionGrid className="wide">
                {orderTraitCards(anc.traits).map(t => {
                  const on = owned.includes(t.name);
                  const over = !on && t.cost > remaining;
                  return (
                    <OptionButton key={t.name} label={t.name} cost={t.cost} selected={on} blocked={over}
                      reason={over ? `Costs ${plural(t.cost, 'point')} — ${plural(Math.max(0, remaining), 'point')} left` : null}
                      badge={(anc.quick || []).includes(t.name) ? 'Suggested' : null}
                      detail={{ kind: 'trait', trait: t, kicker: `${anc.name} trait` }}
                      onSelect={() => update(x => mut.toggleAncestryTrait(x, t.name))} />
                  );
                })}
              </OptionGrid>
            </ChoiceSection>

            {anc.id === 'revenant' && PREV_LIFE.filter(([name]) => owned.includes(name)).map(([name, cost]) => {
              const key = `${cost}pt`;
              const chosen = (c.ancestry.prevLifeTraits || {})[key] || null;
              const pool = formerAnc ? formerAnc.traits.filter(t => t.cost === cost) : [];
              return (
                <ChoiceSection key={name} id={`cr-prev-life-${cost}`} title={`Previous Life (${cost} pt)`}
                  status={pool.length ? pickStatus({ got: chosen ? 1 : 0 }) : { kind: 'optional', label: 'Nothing to borrow' }}
                  hint={!formerAnc ? `Choose your former life above to borrow a ${cost}-point trait from it.`
                    : !pool.length ? `${formerAnc.name} has no ${cost}-point traits to borrow.`
                    : `Borrow a ${cost}-point trait from ${formerAnc.name}.`}>
                  {pool.length > 0 && (
                    <OptionGrid className="wide">
                      {pool.map(t => (
                        <OptionButton key={t.name} label={t.name} cost={t.cost} selected={chosen === t.name} dimmed={!!chosen}
                          detail={{ kind: 'trait', trait: { ...t, borrowedFrom: formerAnc.name }, kicker: 'Previous life' }}
                          onSelect={() => update(x => mut.setPrevLifeTrait(x, cost, t.name))} />
                      ))}
                    </OptionGrid>
                  )}
                </ChoiceSection>
              );
            })}

            {choiceTraits.map(t => (
              <OptionChoiceSection key={t.name} id={`cr-trait-${t.name}`} title={`${t.name}: ${t.optionChoice.label || 'choose'}`}
                kicker={t.optionChoice.label} choice={t.optionChoice}
                options={t.optionChoice.options || (t.abilities || []).map(a => ({ name: a.name, ability: a }))}
                picked={(c.ancestry.traitOptions || {})[t.name] || []}
                onToggle={(o) => update(x => mut.toggleTraitOption(x, t.name, t.optionChoice.count, o))} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

export { AncestryMain, OptionChoiceSection };
