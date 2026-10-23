// creator/steps/SkillsMain.jsx — every skill and language pick in one place, one
// framed section per source (skill-slots.js), grouped by the step that grants it.
// A skill held by one source is blocked in every other, with the holder named;
// a duplicated grant becomes a "choose another instead" section.
import React from 'react';
import { Button } from '../../theme.jsx';
import { CREATOR_STEPS } from '../steps.js';
import { skillSlots, languageSlots } from '../skill-slots.js';
import { useCreator } from '../context.js';
import { ChoiceSection } from '../ChoiceSection.jsx';
import { OptionButton, OptionGrid } from '../OptionGrid.jsx';
import { StepIntro, plural } from './common.jsx';

const SOURCE_STEPS = ['ancestry', 'culture', 'career', 'class', 'complication'];
// A full group isn't a conflict: its other options read as dimmed, not struck out.
const isCapacity = (reason) => !!reason && reason.startsWith('Already picked');
const stepName = (id) => CREATOR_STEPS.find(s => s.id === id)?.name || id;

function slotStatus(slot) {
  if (slot.kind === 'grant') return { kind: 'granted', label: 'Granted' };
  if (slot.pending && slot.done) return { kind: 'optional', label: 'Later' };
  if (slot.pending) return { kind: 'blocked', label: 'Waiting' };
  if (slot.done) return { kind: 'done', label: 'Done' };
  const need = (slot.groups || []).reduce((s, g) => s + g.count, 0) || 1;
  const left = Math.max(1, need - slot.picked.length);
  if (slot.kind === 'swap') return { kind: 'choose', label: 'Choose one' };
  return { kind: 'choose', label: `Choose ${left}` };
}

function SlotSection({ slot, lang }) {
  const { update, goToStep } = useCreator();
  const kind = lang ? 'language' : 'skill';
  const title = slot.kind === 'swap'
    ? `Choose another ${slot.groupNames.join(' or ')} skill instead of ${slot.collision.skill}`
    : slot.source;
  const hint = slot.kind === 'swap'
    ? `${slot.collision.skill} is already granted by ${slot.collision.source}. ${slot.source} grants it too, so you take another skill from the same group.`
    : [slot.note, slot.quickLabel && slot.quickBuild ? `Quick build: ${slot.quickLabel}` : null].filter(Boolean).join(' · ') || null;
  return (
    <ChoiceSection id={`cr-slot-${slot.id}`} title={title} status={slotStatus(slot)} hint={hint} issues={slot.issues || []}
      actions={slot.quickBuild ? <Button kind="ghost" small onClick={() => update(x => slot.quickBuild(x))}>Quick build</Button> : null}>
      {slot.pending && (
        <div className="cr-pending">
          {slot.pending}{' '}
          <button type="button" className="cr-link" onClick={() => goToStep(slot.step)}>Go to {stepName(slot.step)} ▸</button>
        </div>
      )}
      {slot.kind === 'grant' && (
        <OptionGrid>
          {slot.granted.map(n => <OptionButton key={n} label={n} granted reason={`Granted by ${slot.source}`} info={false} />)}
        </OptionGrid>
      )}
      {slot.kind === 'swap' && (
        <OptionGrid>
          {slot.pool.map(n => {
            const reason = slot.blockedReason(n);
            const on = slot.isOn(n);
            return (
              <OptionButton key={n} label={n} selected={on} dimmed={!!slot.chosen} blocked={!!reason} reason={reason}
                detail={{ kind, name: n, reason }} onSelect={() => update(x => slot.toggle(x, n))} />
            );
          })}
        </OptionGrid>
      )}
      {slot.kind !== 'grant' && slot.kind !== 'swap' && !slot.pending && slot.groups.map(g => {
        const full = g.picked.length >= g.count;
        return (
          <div key={g.idx}>
            <div className="cr-group-label">{g.label} — <b>{g.picked.length} / {g.count}</b></div>
            <OptionGrid>
              {g.pool.map(n => {
                const isGranted = slot.granted.includes(n);
                const on = slot.isOn(n, g.idx);
                const reason = isGranted ? `Granted by ${slot.source}` : slot.blockedReason(n, g.idx);
                const capacity = isCapacity(reason);
                // A single pick swaps on click; a full multi-pick asks you to drop one first.
                const onSelect = !capacity ? () => update(x => slot.toggle(x, n, g.idx))
                  : g.count === 1 && g.picked[0] ? () => update(x => slot.toggle(slot.toggle(x, g.picked[0], g.idx), n, g.idx))
                  : () => {};
                return (
                  <OptionButton key={n} label={n} selected={on} granted={isGranted}
                    dimmed={full} blocked={!isGranted && !!reason && !capacity} reason={reason}
                    warn={on && slot.dupNames?.has(n)}
                    detail={{ kind, name: n, reason: capacity ? null : reason }}
                    onSelect={onSelect} />
                );
              })}
            </OptionGrid>
          </div>
        );
      })}
    </ChoiceSection>
  );
}

function SkillsMain() {
  const { character: c } = useCreator();
  const skills = skillSlots(c);
  const langs = languageSlots(c);
  const owed = [...skills, ...langs].filter(s => !s.done).length;
  return (
    <>
      <StepIntro stepId="skills" />
      <div className="cr-sec-hint">
        {owed ? `${plural(owed, 'source')} still to choose from.` : 'Every skill and language is chosen.'}
        {' '}New sources appear here as you pick an ancestry, culture, career, class and complication.
      </div>
      {SOURCE_STEPS.map(stepId => {
        const list = skills.filter(s => s.step === stepId);
        if (!list.length) return null;
        return (
          <section key={stepId} aria-label={`Skills from ${stepName(stepId)}`}>
            <h2 className="cr-subhead">{stepName(stepId)}</h2>
            <div className="cr-stack">{list.map(s => <SlotSection key={s.id} slot={s} />)}</div>
          </section>
        );
      })}
      <section aria-label="Languages">
        <h2 className="cr-choices-head">Languages</h2>
        <div className="cr-stack">{langs.map(s => <SlotSection key={s.id} slot={s} lang />)}</div>
      </section>
    </>
  );
}

export { SkillsMain };
