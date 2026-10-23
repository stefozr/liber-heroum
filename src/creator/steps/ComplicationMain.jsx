// creator/steps/ComplicationMain.jsx — optional: "No complication" or one of the
// list (or a d100 roll), then the follow-ups its prose asks for. Its skill and
// language grants (and a language it makes you forget) are picked on the Skills step.
import React from 'react';
import { DS_COMPLICATIONS, DS_ANCESTRIES } from '../../data.jsx';
import { Button } from '../../theme.jsx';
import { complicationDef, heroicAbilityPools } from '../../app.jsx';
import { scrollWizardTo } from '../../wizard/helpers.js';
import { TextChoiceField } from '../../wizard/steps/pickers.jsx';
import * as mut from '../../wizard/mutations.js';
import { useCreator } from '../context.js';
import { ChoiceSection, ChoicesHead, pickStatus } from '../ChoiceSection.jsx';
import { OptionButton, OptionGrid } from '../OptionGrid.jsx';
import { InfoBox } from '../InfoBox.jsx';
import { slotsForStep } from '../skill-slots.js';
import { OptionChoiceSection } from './AncestryMain.jsx';
import { StepIntro, plural } from './common.jsx';

function ComplicationMain() {
  const { character: c, update } = useCreator();
  const comp = complicationDef(c);
  const sel = c.complication?.id || null;
  const roll = () => {
    const r = Math.floor(Math.random() * 100) + 1;
    const pick = DS_COMPLICATIONS.find(x => x.d100 === r) || DS_COMPLICATIONS[r % DS_COMPLICATIONS.length];
    update(x => mut.setComplication(x, pick.id));
    scrollWizardTo('comp-' + pick.id, '.cr-main');
  };
  const pools = comp?.abilityChoices?.length ? heroicAbilityPools(c) : null;
  const followUps = comp && ((comp.optionChoices || []).length || (comp.abilityChoices || []).length || comp.traitChoice || (comp.textChoices || []).length);
  const traitAnc = comp?.traitChoice ? DS_ANCESTRIES.find(a => a.id === comp.traitChoice.ancestry) : null;

  return (
    <>
      <StepIntro stepId="complication" />
      <ChoiceSection variant="bare" id="cr-complication" title="Choose a complication"
        status={sel ? { kind: 'done', label: 'Done' } : { kind: 'optional', label: 'Optional' }}
        hint="Roll the dice and let fate decide, or browse and choose the thread you’ll carry."
        actions={<Button kind="ghost" small onClick={roll}>⚄ Roll d100</Button>}
        detail={sel ? { kind: 'complication', id: sel } : null}>
        <OptionGrid className="wide">
          <OptionButton label="No complication" selected={!sel} dimmed={!!sel}
            detail={{ kind: 'complication', none: true }}
            onSelect={() => update(x => (x.complication?.id ? mut.skipComplication(x) : x))} />
          {DS_COMPLICATIONS.map(k => (
            <OptionButton key={k.id} id={'comp-' + k.id} label={k.name} selected={sel === k.id} dimmed={!!sel}
              detail={{ kind: 'complication', id: k.id }}
              onSelect={() => update(x => mut.setComplication(x, k.id))} />
          ))}
        </OptionGrid>
      </ChoiceSection>

      {comp && (
        <>
          {slotsForStep(c, 'complication').length > 0 && <InfoBox stepId="complication" />}
          {followUps ? <ChoicesHead /> : null}
          <div className="cr-stack">
            {(comp.optionChoices || []).map((ch, i) => (
              <OptionChoiceSection key={'opt' + i} id={`cr-comp-opt-${i}`} title={ch.label} kicker={ch.label} choice={ch}
                options={ch.options} picked={(c.complication.options || {})[i] || []}
                onToggle={(o) => update(x => mut.toggleComplicationIn(x, 'options', i, ch.count, o))} />
            ))}

            {(comp.abilityChoices || []).map(ch => {
              const pool = ch.pool === 'known-heroic' ? pools.known : pools.future;
              const picked = (c.complication.abilityPicks || {})[ch.id] || null;
              const hint = !c.cclass?.id ? 'Choose a class first — this pick draws on its heroic abilities.'
                : !pool.length ? (ch.pool === 'known-heroic' ? 'Pick your class abilities first — this choice is one of them.' : 'No higher-level abilities are listed for this class yet.')
                : ch.note || null;
              return (
                <ChoiceSection key={ch.id} id={`cr-comp-ability-${ch.id}`} title={ch.label}
                  status={pool.length ? pickStatus({ got: picked && pool.some(a => a.name === picked) ? 1 : 0 }) : { kind: 'optional', label: 'Later' }}
                  hint={hint}>
                  {pool.length > 0 && (
                    <OptionGrid className="wide">
                      {pool.map(a => (
                        <OptionButton key={a.name} label={a.name} selected={picked === a.name} dimmed={!!picked}
                          detail={{ kind: 'ability', ability: a, label: ch.label }}
                          onSelect={() => update(x => mut.setComplicationAbility(x, ch.id, picked === a.name ? null : a.name))} />
                      ))}
                    </OptionGrid>
                  )}
                </ChoiceSection>
              );
            })}

            {comp.traitChoice && (() => {
              const owned = c.ancestry?.id === comp.traitChoice.ancestry ? (c.ancestry.traits || []) : [];
              const pool = (traitAnc?.traits || []).filter(t => !owned.includes(t.name));
              const picked = c.complication.traits || [];
              const spent = pool.filter(t => picked.includes(t.name)).reduce((s, t) => s + (t.cost || 0), 0);
              const left = comp.traitChoice.points - spent;
              const affordable = pool.some(t => !picked.includes(t.name) && (t.cost || 0) <= left);
              return (
                <ChoiceSection id="cr-comp-traits" title={comp.traitChoice.label}
                  status={left > 0 && affordable ? { kind: 'points', label: `${plural(left, 'point')} to spend` } : { kind: 'done', label: 'Done' }}
                  hint={comp.traitChoice.note || null}>
                  <OptionGrid className="wide">
                    {pool.map(t => {
                      const on = picked.includes(t.name);
                      const over = !on && (t.cost || 0) > left;
                      return (
                        <OptionButton key={t.name} label={t.name} cost={t.cost} selected={on} blocked={over}
                          reason={over ? `Costs ${plural(t.cost, 'point')} — ${plural(Math.max(0, left), 'point')} left` : null}
                          detail={{ kind: 'trait', trait: t, kicker: `${traitAnc?.name || ''} trait` }}
                          onSelect={() => update(x => mut.toggleComplicationTrait(x, t.name))} />
                      );
                    })}
                  </OptionGrid>
                </ChoiceSection>
              );
            })()}

            {(comp.textChoices || []).map((ch, i) => {
              const v = (c.complication.texts || {})[i] || '';
              return (
                <ChoiceSection key={'txt' + i} id={`cr-comp-text-${i}`} title={ch.label}
                  status={v.trim() ? { kind: 'done', label: 'Done' } : { kind: 'optional', label: 'Optional' }}>
                  <TextChoiceField id={`comp-text-${i}`} label={ch.label} placeholder={ch.placeholder} value={v}
                    onChange={(val) => update(x => mut.setComplicationText(x, i, val))} />
                </ChoiceSection>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

export { ComplicationMain };
