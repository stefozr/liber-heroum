// creator/steps/CareerMain.jsx — career, inciting incident, perk, and what was taken.
// The career's skills and languages (and a perk's follow-up picks) are chosen on
// the Skills step; the InfoBox says what this career grants.
import React from 'react';
import { DS_CAREERS } from '../../data.jsx';
import { Button } from '../../theme.jsx';
import { careerDef } from '../../app.jsx';
import { PERKS } from '../../wizard/helpers.js';
import * as mut from '../../wizard/mutations.js';
import { useCreator } from '../context.js';
import { ChoiceSection, ChoicesHead, pickStatus } from '../ChoiceSection.jsx';
import { OptionButton, OptionGrid } from '../OptionGrid.jsx';
import { InfoBox } from '../InfoBox.jsx';
import { StepIntro } from './common.jsx';

const incName = (inc) => (typeof inc === 'string' ? inc : inc.name);

function CareerMain() {
  const { character: c, update } = useCreator();
  const car = careerDef(c);
  const sel = c.career.id;
  return (
    <>
      <StepIntro stepId="career" />
      <ChoiceSection variant="bare" id="cr-career" title="Choose your career" status={pickStatus({ got: sel ? 1 : 0 })}
        detail={sel ? { kind: 'career', id: sel } : null}>
        <OptionGrid>
          {DS_CAREERS.map(ca => (
            <OptionButton key={ca.id} label={ca.name} selected={sel === ca.id} dimmed={!!sel}
              detail={{ kind: 'career', id: ca.id }}
              // Re-picking the chosen career keeps its picks (setCareer reseeds them).
              onSelect={() => update(x => (x.career.id === ca.id ? x : mut.setCareer(x, ca.id)))} />
          ))}
        </OptionGrid>
      </ChoiceSection>

      {car && (
        <>
          <InfoBox stepId="career" />
          <ChoicesHead />
          <div className="cr-stack">
            <ChoiceSection id="cr-incident" title="Inciting incident"
              status={c.career.incident ? { kind: 'done', label: 'Done' } : { kind: 'optional', label: 'Choose one' }}
              hint="What turned you from a comfortable life to the path of a hero?"
              actions={<Button kind="ghost" small onClick={() => {
                const pick = car.incidents[Math.floor(Math.random() * car.incidents.length)];
                update(x => mut.setCareerIncident(x, incName(pick)));
              }}>⚄ Roll 1d6</Button>}>
              <OptionGrid className="wide">
                {car.incidents.map(inc => {
                  const n = incName(inc);
                  return (
                    <OptionButton key={n} label={n} selected={c.career.incident === n} dimmed={!!c.career.incident}
                      detail={{ kind: 'incident', careerId: car.id, name: n }}
                      onSelect={() => update(x => mut.setCareerIncident(x, n))} />
                  );
                })}
              </OptionGrid>
            </ChoiceSection>

            <ChoiceSection id="cr-perk" title={`${car.perk} perk`} status={pickStatus({ got: c.career.perk ? 1 : 0 })}
              detail={c.career.perk ? { kind: 'perk', name: c.career.perk } : null}
              hint={car.quickPerk ? `Quick build: ${car.quickPerk}` : null}>
              <OptionGrid className="wide">
                {(PERKS[car.perk] || []).map(p => (
                  <OptionButton key={p.name} label={p.name} selected={c.career.perk === p.name} dimmed={!!c.career.perk}
                    badge={car.quickPerk === p.name ? 'Suggested' : null}
                    detail={{ kind: 'perk', name: p.name }}
                    onSelect={() => update(x => mut.setCareerPerk(x, p.name))} />
                ))}
              </OptionGrid>
            </ChoiceSection>

            <ChoiceSection id="cr-taken" title="What was taken from you?"
              status={(c.career.taken || '').trim() ? { kind: 'done', label: 'Done' } : { kind: 'optional', label: 'Optional' }}>
              <textarea
                className="input-area"
                aria-label="What was taken from you?"
                placeholder="An heirloom sword. A locket of royalty. Your mother. A future you'll never have. Your name. Hope itself…"
                value={c.career.taken || ''}
                onChange={(e) => { const v = e.target.value; update(x => mut.setCareerTaken(x, v)); }}
              />
            </ChoiceSection>
          </div>
        </>
      )}
    </>
  );
}

export { CareerMain };
