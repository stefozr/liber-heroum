// creator/steps/CultureMain.jsx — an archetypical culture, or the three aspects
// built by hand. (The Codex app also lists ancestry cultures; Liber Heroum's data
// has none.) Each aspect's skill and the native language are picked on the Skills step.
import React from 'react';
import { DS_CULTURES } from '../../data.jsx';
import * as mut from '../../wizard/mutations.js';
import { useCreator } from '../context.js';
import { ChoiceSection, pickStatus } from '../ChoiceSection.jsx';
import { OptionButton, OptionGrid } from '../OptionGrid.jsx';
import { InfoBox } from '../InfoBox.jsx';
import { StepIntro } from './common.jsx';

const ASPECTS = [
  { key: 'environment', name: 'Environment', items: DS_CULTURES.environments },
  { key: 'organization', name: 'Organization', items: DS_CULTURES.organizations },
  { key: 'upbringing', name: 'Upbringing', items: DS_CULTURES.upbringings },
];
const nameOf = (list, id) => list.find(x => x.id === id)?.name || id;

function CultureMain() {
  const { character: c, update } = useCreator();
  const cu = c.culture || {};
  const full = !!(cu.environment && cu.organization && cu.upbringing);
  return (
    <>
      <StepIntro stepId="culture" />
      <ChoiceSection variant="bare" id="cr-archetypes" title="Archetypical cultures"
        status={cu.archetype ? { kind: 'done', label: 'Done' } : { kind: 'optional', label: 'Optional' }}
        hint="One click fills all three aspects; you can still change any of them below.">
        <OptionGrid className="wide">
          {DS_CULTURES.archetypes.map(a => (
            <OptionButton key={a.name} label={a.name} selected={cu.archetype === a.name} dimmed={full}
              sub={`${nameOf(DS_CULTURES.environments, a.env)} · ${nameOf(DS_CULTURES.organizations, a.org)} · ${nameOf(DS_CULTURES.upbringings, a.upb)}`}
              detail={{ kind: 'archetype', name: a.name }}
              onSelect={() => update(x => (x.culture.archetype === a.name ? x : mut.applyCultureArchetype(x, a)))} />
          ))}
        </OptionGrid>
      </ChoiceSection>

      <h2 className="cr-choices-head">Or build your own culture from three aspects</h2>
      <InfoBox stepId="culture" />
      <div className="cr-stack" style={{ marginTop: 14 }}>
        {ASPECTS.map(({ key, name, items }) => {
          const sel = items.find(it => it.id === cu[key]);
          return (
            <ChoiceSection key={key} id={`cr-aspect-${key}`} title={name} status={pickStatus({ got: sel ? 1 : 0 })}
              detail={sel ? { kind: 'aspect', aspect: key, id: sel.id } : null}
              hint={sel ? `Skill: one from ${sel.skillLabel || (sel.skillGroups || []).join(' / ')} · Quick build: ${sel.quick}` : null}>
              <OptionGrid>
                {items.map(it => (
                  <OptionButton key={it.id} label={it.name} selected={cu[key] === it.id} dimmed={!!cu[key]}
                    detail={{ kind: 'aspect', aspect: key, id: it.id }}
                    // Re-picking the chosen aspect keeps its skill.
                    onSelect={() => update(x => (x.culture[key] === it.id ? x : mut.setCultureAspect(x, key, it.id, DS_CULTURES.archetypes)))} />
                ))}
              </OptionGrid>
            </ChoiceSection>
          );
        })}
      </div>
    </>
  );
}

export { CultureMain };
