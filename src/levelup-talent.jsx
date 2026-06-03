// levelup-talent.jsx — Talent level-up data (levels 2–10).
// Traditions: Chronopathy / Telekinesis / Telepathy · Resource: Clarity · staminaPer 6.

(function () {
  const PERK_ILS = [
    { id: 'interpersonal', name: 'Interpersonal Perk', body: 'A boon for the table and the court.' },
    { id: 'lore',          name: 'Lore Perk',          body: 'A boon for the studious.' },
    { id: 'supernatural',  name: 'Supernatural Perk',  body: 'A boon at the edge of the natural world.' },
  ];
  const PERK_ANY = ['crafting','exploration','interpersonal','intrigue','lore','supernatural'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Perk', body: '' }));
  const SKILL_ANY = ['crafting','exploration','interpersonal','intrigue','lore'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Skill', body: '' }));
  const tr = (t1, t2, t3) => [['\u2264 11', t1], ['12\u201316', t2], ['17+', t3]];
  const cl = (n, name, flavor, effect, extra) => ({ name, cost: n, resource: 'Clarity', flavor, type: (extra && extra.type) || 'Main action', keywords: (extra && extra.keywords) || ['Psionic','Ranged'], distance: (extra && extra.distance) || 'Ranged 10', target: (extra && extra.target) || 'One creature', tiers: extra && extra.tiers, effect, powerRoll: extra && extra.powerRoll });

  const CL_7 = () => [
    cl(7, 'Fling Through Time', 'You hurl the target through the annals of time.', 'A chronopathic strike forcing them to witness their whole existence at once.', { keywords:['Chronopathy','Psionic','Ranged','Strike'], powerRoll:'Presence', tiers:tr('9 + P psychic','13 + P psychic','17 + P psychic') }),
    cl(7, 'Force Orbs', 'Spheres of solid psionic energy float around you.', 'Conjure orbs you can hurl as strikes over several turns.', { keywords:['Psionic','Ranged','Strike','Telekinesis'], powerRoll:'Reason', tiers:tr('3 + R','5 + R','7 + R') }),
    cl(7, 'Reflector Field', 'A field reverses incoming attacks.', 'An aura that reflects abilities back at their source.', { keywords:['Area','Psionic','Telepathy'], type:'Maneuver', distance:'2 aura', target:'Self' }),
    cl(7, 'Soul Burn', 'You blast their soul from their body.', 'An animapathic strike that leaves a weakened husk.', { keywords:['Animapathy','Psionic','Ranged','Strike'], powerRoll:'Presence', tiers:tr('9 + P','13 + P','17 + P') }),
  ];
  const CL_9 = () => [
    cl(9, 'Exothermic Shield', 'You encase the target in psionic flame.', 'A ward that lets an ally burn bright without burning out.', { keywords:['Pyrokinesis','Psionic','Ranged'], target:'One ally' }),
    cl(9, 'Hypersonic', 'You move fast enough to watch the aftermath.', 'A charging area strike at impossible speed.', { keywords:['Area','Charge','Psionic','Telekinesis'], target:'Each enemy you pass', powerRoll:'Reason', tiers:tr('6 damage','9 damage','13 damage') }),
    cl(9, 'Mind Snare', 'A song they can\u2019t get out of their head.', 'You latch onto a foe\u2019s mind; leaving you costs them dearly.', { keywords:['Psionic','Ranged','Strike','Telepathy'], powerRoll:'Reason', tiers:tr('slowed (save)','slowed (save)','slowed (save)') }),
    cl(9, 'Soulbound', 'A thread links two foes.', 'A piercing bolt that lances two enemies and binds them.', { keywords:['Animapathy','Psionic','Ranged','Strike'], target:'Two creatures', powerRoll:'Reason', tiers:tr('5 + R psychic','8 + R psychic','11 + R psychic') }),
  ];
  const CL_11 = () => [
    cl(11, 'Doubt', 'You unravel the strings of their anima.', 'Let an ally exploit the target\u2019s shattered drive.', { keywords:['Animapathy','Psionic','Ranged','Strike'], powerRoll:'Presence', tiers:tr('11 + P psychic','16 + P psychic','22 + P psychic') }),
    cl(11, 'Mindwipe', 'You make them forget all their training.', 'A melee strike that erases the target\u2019s mastery.', { keywords:['Melee','Psionic','Strike','Telepathy'], distance:'Melee 1', powerRoll:'Reason', tiers:tr('11 + R psychic','16 + R psychic','21 + R psychic') }),
    cl(11, 'Rejuvenate', 'You return a body to an earlier state.', 'Reshape the flow of time to restore an ally.', { keywords:['Chronopathy','Psionic','Ranged'], target:'One ally' }),
    cl(11, 'Steel', 'Their skin becomes covered in tough metal.', 'A metamorphosis ward of dense protective steel.', { keywords:['Metamorphosis','Psionic','Ranged'], target:'One creature' }),
  ];

  const TRAD_FEAT_2 = {
    chronopathy: [{ name: 'Ease the Hours', text: 'You can increase the rounds in a montage test by 1 if it would end before the heroes reach the success limit.' }],
    telekinesis: [{ name: 'Ease Their Fall', text: 'When you or any creature lands from a fall within 2 squares of you, free triggered action: reduce the falling damage by 2 + your Reason.' }],
    telepathy: [{ name: 'Ease the Mind', text: 'You gain an edge on tests to stop combat and start a negotiation, and present NPCs with hostile/suspicious attitudes gain +1 patience (max 5).' }],
  };
  const TRAD_FEAT_5 = {
    chronopathy: [
      { name: 'Distortion Temporal', text: 'While not dying, a 3 aura is difficult terrain for enemies; allies entering or starting there gain +2 speed for the turn.' },
      { name: 'Speed of Thought', text: 'Once per round while not dying, spend 2 clarity to turn a triggered action into a free triggered action.' },
    ],
    telekinesis: [
      { name: 'Kinetic Amplifier', text: 'When you force move a creature, spend up to 2 surges; each adds a forced-movement bonus equal to your Reason.' },
      { name: 'Triangulate', text: 'When an ally uses a ranged ability and you\u2019re in its distance, spend 1 clarity (free triggered) to let them use it as if from your space.' },
    ],
    telepathy: [
      { name: 'Compulsion', text: 'On a successful interpersonal test with an NPC, ask them a question via Telepathic Speech that they must answer truthfully.' },
      { name: 'Remote Amplification', text: 'Your ranged psionic abilities gain +5 distance, and your Telepathic Speech reaches 1 mile.' },
    ],
  };
  const TRAD_FEAT_8 = {
    chronopathy: [
      { name: 'Doubling the Hours', text: 'While you have 5+ Victories, you can take an extra respite activity.' },
      { name: 'Stasis Shield', text: 'Triggered (3 clarity): when a target takes damage, teleport them adjacent to you, negating the damage if it moves them out of harm.' },
    ],
    telekinesis: [
      { name: 'Levitation Field', text: 'Maneuver: allies in a 3 burst can fly until your next turn and shift their speed (5 clarity: lasts 1 hour).' },
      { name: 'Low Gravity', text: 'You ignore difficult terrain and don\u2019t spend extra movement while prone.' },
    ],
    telepathy: [
      { name: 'Mindlink', text: 'On a respite, link creatures up to your Reason; when one linked creature spends Recoveries, each other can spend one too.' },
      { name: 'Universal Connection', text: 'Your Telepathic Speech reaches anywhere on the same world.' },
    ],
  };
  const TRAD_ABILITY_2 = {
    chronopathy: [
      cl(5, 'Applied Chronometrics', 'Time slows around you.', 'Several allies gain +5 speed, can\u2019t be dazed, and gain an extra maneuver.', { type:'Maneuver', target:'Special', powerRoll:'Presence', tiers:tr('two creatures','three creatures','four creatures') }),
      cl(5, 'Slow', 'Why is everyone else so quick?', 'Slow or halt up to three creatures (save ends).', { type:'Maneuver', target:'Three creatures', powerRoll:'Presence', tiers:tr('speed halved (save)','slowed (save)','slowed (save); P<STRONG speed 0') }),
    ],
    telekinesis: [
      cl(5, 'Gravitic Burst', 'Everyone get away from me!', 'A close burst with vertical push.', { keywords:['Area','Psionic','Telekinesis'], distance:'1 burst', target:'Each enemy in the area', powerRoll:'Reason', tiers:tr('3; vert push 2','6; vert push 4','9; vert push 6') }),
      cl(5, 'Levity and Gravity', 'Raise, then smother them against the ground.', 'A strike that knocks the target prone.', { keywords:['Psionic','Ranged','Strike','Telekinesis'], powerRoll:'Reason', tiers:tr('6 + R; M<WEAK prone','10 + R; M<AVERAGE prone','14 + R; M<STRONG prone & can\u2019t stand (save)') }),
    ],
    telepathy: [
      cl(5, 'Overwhelm', 'You turn their subconscious into noise.', 'A psychic strike that debilitates.', { keywords:['Psionic','Ranged','Strike','Telepathy'], powerRoll:'Reason', tiers:tr('6 + R psychic; I<WEAK slowed (save)','10 + R psychic; I<AVERAGE weakened (save)','14 + R psychic; I<STRONG dazed (save)') }),
      cl(5, 'Synaptic Override', 'You control an enemy\u2019s nervous system.', 'Seize a foe\u2019s body to move and attack with their own abilities.', { type:'Main action', keywords:['Psionic','Ranged','Telepathy'], target:'One enemy', powerRoll:'Reason', tiers:tr('free strike a foe','shift & signature','move & signature') }),
    ],
  };
  const TRAD_ABILITY_6 = {
    chronopathy: [
      cl(9, 'Fate', 'A glimpse of how it ends for them.', 'The target gains damage weakness 5 and falls prone when damaged.', { keywords:['Chronopathy','Psionic','Melee'], distance:'Melee 2', target:'One enemy' }),
      cl(9, 'Stasis Field', 'Keep everything as it was.', 'Freeze a 4 cube in time, restraining or halting enemies inside.', { keywords:['Area','Chronopathy','Psionic','Ranged'], distance:'4 cube within 10', target:'Each creature in the area', powerRoll:'Presence', tiers:tr('P<WEAK slowed','P<AVERAGE speed 0','P<STRONG restrained') }),
    ],
    telekinesis: [
      cl(9, 'Gravitic Well', 'You bend gravity to a fine point.', 'Pull enemies and objects toward a 4-cube\u2019s center.', { keywords:['Area','Psionic','Ranged','Telekinesis'], distance:'4 cube within 10', target:'Each enemy & object in area', powerRoll:'Reason', tiers:tr('6; vert pull 5','9; vert pull 7','13; vert pull 10') }),
      cl(9, 'Greater Kinetic Grip', 'You raise the target without breaking a sweat.', 'A long telekinetic slide that can go vertical and prone.', { keywords:['Psionic','Ranged','Strike','Telekinesis'], target:'One creature or object', powerRoll:'Reason', tiers:tr('slide 4 + R','slide 8 + R','slide 12 + R; prone') }),
    ],
    telepathy: [
      cl(9, 'Synaptic Conditioning', 'You just don\u2019t like them anymore.', 'A psychic strike that turns the target against its allies.', { keywords:['Psionic','Melee','Strike','Telepathy'], distance:'Melee 2', powerRoll:'Reason', tiers:tr('10 psychic; bane vs you (save)','14 psychic; double bane (save)','20 psychic; treats you as allies (save)') }),
      cl(9, 'Synaptic Dissipation', 'Were you ever really there?', 'Turn you and allies invisible to several enemies.', { type:'Maneuver', keywords:['Psionic','Ranged','Strike','Telepathy'], target:'Special', powerRoll:'Reason', tiers:tr('two creatures','three creatures','five creatures') }),
    ],
  };
  const TRAD_ABILITY_9 = {
    chronopathy: [
      cl(11, 'Acceleration Field', 'You stuff more moments into a critical point.', 'Three allies each use a main action as a free triggered action (losing their next).', { keywords:['Chronopathy','Psionic','Ranged'], distance:'Ranged 5', target:'Three allies' }),
      cl(11, 'Borrow From the Future', 'You lean on future heroism.', 'Allies in a 2 burst share 6 Heroic Resource among themselves.', { type:'Maneuver', keywords:['Area','Chronopathy','Psionic'], distance:'2 burst', target:'Each ally in the area' }),
    ],
    telekinesis: [
      cl(11, 'Fulcrum', 'You precisely manipulate everything around you.', 'Vertical-push each enemy and object in a burst.', { keywords:['Area','Psionic','Telekinesis'], distance:'Special', target:'Each enemy & object in area', powerRoll:'Reason', tiers:tr('2 burst','3 burst','4 burst') }),
      cl(11, 'Gravitic Nova', 'Psionic energy erupts and hurls foes back.', 'A burst dealing damage with a huge push.', { keywords:['Area','Psionic','Telekinesis'], distance:'3 burst', target:'Each enemy & object in area', powerRoll:'Reason', tiers:tr('6; push 7','9; push 10','13; push 15') }),
    ],
    telepathy: [
      cl(11, 'Resonant Mind Spike', 'A bolt empowered by every nearby mind.', 'A massive psychic strike ignoring cover and concealment.', { keywords:['Psionic','Ranged','Strike','Telepathy'], powerRoll:'Reason', tiers:tr('15 + R psychic','24 + R psychic','28 + R psychic') }),
      cl(11, 'Synaptic Terror', 'Fear that invigorates your allies.', 'You and allies in a 3 burst can\u2019t roll below tier 2; enemies are frightened.', { keywords:['Area','Psionic','Telepathy'], distance:'3 burst', target:'Each ally & enemy in area', powerRoll:'Reason', tiers:tr('R<WEAK frightened (save)','R<AVERAGE frightened (save)','R<STRONG frightened (save)') }),
    ],
  };

  const talent = {
    2: {
      summary: 'Your tradition deepens, and your mind reaches further.',
      staminaGain: 6,
      autoFeatures: ({ sub }) => TRAD_FEAT_2[sub] || [],
      choices: [
        { id: 'perk', label: 'Perk', help: 'Choose one interpersonal, lore, or supernatural perk.', kind: 'perk', options: PERK_ILS },
        { id: 'tradition-ability-2', label: '2nd-Level Tradition Ability', help: 'Your tradition grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => TRAD_ABILITY_2[sub] || [] },
      ],
    },
    3: {
      summary: 'Your psionic senses pierce cover and shadow alike.',
      staminaGain: 6,
      autoFeatures: () => [
        { name: 'Scan', text: 'Once per turn you can search for hidden creatures as a free maneuver. Once you have line of effect to a thinking creature within Mind Spike distance, you keep it until they leave that distance.' },
      ],
      choices: [
        { id: 'clarity-7', label: '7-Clarity Ability', help: 'Choose one heroic ability that costs 7 clarity.', kind: 'ability', options: CL_7 },
      ],
    },
    4: {
      summary: 'Your mind learns to leave your body, and the air bears you up.',
      staminaGain: 6,
      autoCharacteristicIncrease: { Reason: 3, Presence: 3, max: true },
      autoFeatures: () => [
        { name: 'Characteristic Increase', text: 'Your Reason and Presence scores each increase to 3.' },
        { name: 'Mind Projection', text: 'Maneuver: project your mind (size 1T, concealed, passes through matter) while your body lies unconscious. Damage to either hits your Stamina; any damage snaps your mind back.' },
        { name: 'Mind Recovery', text: 'When you spend a Recovery while strained, you can forgo the Stamina to gain 3 clarity. The first time each round a creature is force moved, you gain 2 clarity instead of 1.' },
        { name: 'Suspensor Field', text: 'You can fly (stability 0 while flying); if you already fly, +2 speed while flying.' },
      ],
      choices: [
        { id: 'perk-4', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
        { id: 'skill-4', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
      ],
    },
    5: {
      summary: 'Your tradition grants two new techniques.',
      staminaGain: 6,
      autoFeatures: ({ sub }) => TRAD_FEAT_5[sub] || [],
      choices: [
        { id: 'clarity-9', label: '9-Clarity Ability', help: 'Choose one heroic ability that costs 9 clarity.', kind: 'ability', options: CL_9 },
      ],
    },
    6: {
      summary: 'You learn to overcharge your psionics with raw clarity.',
      staminaGain: 6,
      autoFeatures: () => [
        { name: 'Psi Boost', text: 'Spend extra clarity on Psionic main actions/maneuvers to enhance them: Dynamic, Expanded, Extended, Heightened, Magnified, Shared, or Sharpened Power.' },
      ],
      choices: [
        { id: 'perk-6', label: 'Perk', help: 'Choose one interpersonal, lore, or supernatural perk.', kind: 'perk', options: PERK_ILS },
        { id: 'tradition-ability-6', label: '6th-Level Tradition Ability', help: 'Your tradition grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => TRAD_ABILITY_6[sub] || [] },
      ],
    },
    7: {
      summary: 'Clarity floods your mind, and your strain rebounds on your foes.',
      staminaGain: 6,
      autoCharIncreaseAll: { delta: 1, max: 4 },
      autoFeatures: () => [
        { name: 'Characteristic Increase', text: 'Each characteristic score increases by 1, to a maximum of 4.' },
        { name: 'Ancestral Memory', text: 'Each respite, swap skills up to your Reason for interpersonal/lore skills until your next respite.' },
        { name: 'Cascading Strain', text: 'When you take damage from a strained effect or negative clarity, one enemy within Mind Spike distance takes the same damage.' },
        { name: 'Lucid Mind', text: 'At the start of each of your turns in combat, you gain 1d3 + 1 clarity instead of 1d3.' },
      ],
      choices: [
        { id: 'skill-7', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
      ],
    },
    8: {
      summary: 'Your tradition reveals two of its deepest secrets.',
      staminaGain: 6,
      autoFeatures: ({ sub }) => TRAD_FEAT_8[sub] || [],
      choices: [
        { id: 'perk-8', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
        { id: 'clarity-11', label: '11-Clarity Ability', help: 'Choose one heroic ability that costs 11 clarity.', kind: 'ability', options: CL_11 },
      ],
    },
    9: {
      summary: 'Your mind becomes an impenetrable fortress.',
      staminaGain: 6,
      autoFeatures: () => [
        { name: 'Fortress of Perfect Thought', text: 'You breathe without air, have psychic immunity 10, can\u2019t have your thoughts read, treat Reason and Intuition as 2 higher to resist potency, and can\u2019t be taunted or frightened.' },
      ],
      choices: [
        { id: 'tradition-ability-9', label: '9th-Level Tradition Ability', help: 'Your tradition grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => TRAD_ABILITY_9[sub] || [] },
      ],
    },
    10: {
      summary: 'You become a psion — your mind unbound from sense and distance.',
      staminaGain: 6,
      autoCharacteristicIncrease: { Reason: 5, Presence: 5, max: true },
      autoFeatures: () => [
        { name: 'Characteristic Increase', text: 'Your Reason and Presence scores each increase to 5.' },
        { name: 'Clear Mind', text: 'The first time each round a creature is force moved, you gain 3 clarity instead of 2.' },
        { name: 'Omnisensory', text: '+10 distance on ranged abilities; you need no line of effect to a thinking creature you\u2019ve previously had line of effect to.' },
        { name: 'Psion', text: 'At the start of your turns in combat, gain 1d3 + 2 clarity. You can ignore negative-clarity damage and take any ability\u2019s strained effect at will.' },
        { name: 'Vision', text: 'You gain the epic resource vision equal to the XP you earn each respite, spendable as clarity. Spend vision to use one extra psionic ability per turn (paying its full cost in vision). Vision remains until spent.' },
      ],
      choices: [
        { id: 'perk-10', label: 'Perk', help: 'Choose one interpersonal, lore, or supernatural perk.', kind: 'perk', options: PERK_ILS },
        { id: 'skill-10', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
      ],
    },
  };

  function install() {
    if (!window.LEVELUP_DATA) { setTimeout(install, 30); return; }
    window.LEVELUP_DATA.talent = talent;
  }
  install();
})();
