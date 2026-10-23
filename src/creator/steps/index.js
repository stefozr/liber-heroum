// creator/steps/index.js — each creator step's main-column component, and the
// detail the right panel shows for a step before anything is hovered or picked.
import React from 'react';
import { IdentityStep } from '../../wizard/steps/identity.jsx';
import { useCreator } from '../context.js';
import { AncestryMain } from './AncestryMain.jsx';
import { CultureMain } from './CultureMain.jsx';
import { CareerMain } from './CareerMain.jsx';
import { ClassMain } from './ClassMain.jsx';
import { SkillsMain } from './SkillsMain.jsx';
import { ComplicationMain } from './ComplicationMain.jsx';
import { StepIntro } from './common.jsx';

const h = React.createElement;

// Identity reuses the classic wizard's step unchanged.
function IdentityMain() {
  const { character, update } = useCreator();
  return h(React.Fragment, null, h(StepIntro, { stepId: 'identity' }), h(IdentityStep, { character, update }));
}

const STEP_MAINS = {
  ancestry: AncestryMain,
  culture: CultureMain,
  career: CareerMain,
  class: ClassMain,
  skills: SkillsMain,
  complication: ComplicationMain,
  identity: IdentityMain,
};

// The step's headline pick (the chosen class on the class step, …) or null.
function headlineDetail(c, stepId) {
  switch (stepId) {
    case 'ancestry': return c.ancestry?.id ? { kind: 'ancestry', id: c.ancestry.id } : null;
    case 'culture': return c.culture?.archetype ? { kind: 'archetype', name: c.culture.archetype } : null;
    case 'career': return c.career?.id ? { kind: 'career', id: c.career.id } : null;
    case 'class': return c.cclass?.id ? { kind: 'class', id: c.cclass.id } : null;
    case 'complication': return c.complication?.id ? { kind: 'complication', id: c.complication.id } : null;
    case 'identity': return { kind: 'identity' };
    default: return null;
  }
}

export { STEP_MAINS, headlineDetail };
