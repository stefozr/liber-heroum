// levelup-null.jsx — Null level-up data (levels 2–10).
// Traditions: Chronokinetic / Cryokinetic / Metakinetic · Resource: Discipline · staminaPer 9.

(function () {
  const PERK_EII = [
    { id: 'exploration',  name: 'Exploration Perk',  body: 'A boon for the wilds and the road.' },
    { id: 'interpersonal',name: 'Interpersonal Perk',body: 'A boon for the table and the court.' },
    { id: 'intrigue',     name: 'Intrigue Perk',     body: 'A boon for the shadows and the con.' },
  ];
  const PERK_ANY = ['crafting','exploration','interpersonal','intrigue','lore','supernatural'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Perk', body: '' }));
  const SKILL_ANY = ['crafting','exploration','interpersonal','intrigue','lore'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Skill', body: '' }));
  const t = (t1, t2, t3) => [['\u2264 11', t1], ['12\u201316', t2], ['17+', t3]];
  const dis = (n, name, flavor, effect, extra) => ({ name, cost: n, resource: 'Discipline', flavor, type: (extra && extra.type) || 'Main action', keywords: (extra && extra.keywords) || ['Melee','Psionic','Strike','Weapon'], distance: (extra && extra.distance) || 'Melee 1', target: (extra && extra.target) || 'One creature', tiers: extra && extra.tiers, effect, powerRoll: extra && extra.powerRoll });

  const DIS_7 = () => [
    dis(7, 'Absorption Field', 'Your null field absorbs kinetic energy.', 'Until end of encounter, your Null Field grows by 1; enemies inside take a bane on ability rolls against creatures in the field.', { type:'Main action', keywords:['Psionic'], distance:'Self', target:'Self' }),
    dis(7, 'Molecular Rearrangement Field', 'Enemies\u2019 wounds open, allies\u2019 wounds close.', 'Null Field grows by 1; low-Intuition enemies entering take damage and allies inside heal.', { type:'Main action', keywords:['Psionic'], distance:'Self', target:'Self' }),
    dis(7, 'Stabilizing Field', 'You project order against interference.', 'Null Field grows by 1; you ignore difficult terrain and reduce potencies against you and allies in the field.', { type:'Main action', keywords:['Psionic'], distance:'Self', target:'Self' }),
    dis(7, 'Synapse Field', 'Allies\u2019 attacks disrupt enemy thoughts.', 'Null Field grows by 1; when an ally in the field damages an enemy, that enemy takes psychic damage equal to your Intuition.', { type:'Main action', keywords:['Psionic'], distance:'Self', target:'Self' }),
  ];
  const DIS_9 = () => [
    dis(9, 'Anticipating Strike', 'You strike, then lock them in a psionic grip.', 'A triggered strike that resolves before the triggering movement or main action, then grabs.', { type:'Triggered', tiers:t('5 + A; grabbed','8 + A; grabbed','11 + A; grabbed') }),
    dis(9, 'Iron Grip', 'You grab with supernatural force.', 'A grab the target can barely escape — escaping deals damage equal to twice your Agility.', { tiers:t('4 + A; grabbed','7 + A; grabbed','10 + A; grabbed') }),
    dis(9, 'Phase Leap', 'You leap beyond reality, leaving an afterimage.', 'Jump your speed without provoking; an afterimage remains and an adjacent enemy takes psychic damage.', { type:'Maneuver', keywords:['Psionic'], distance:'Self', target:'Self' }),
    dis(9, 'Synaptic Reset', 'You expand your nullifying power.', 'Each creature of your choice in your Null Field ends a save-ends or end-of-turn effect.', { type:'Maneuver', keywords:['Area','Psionic'], distance:'Self aura', target:'Allies in the area' }),
  ];
  const DIS_11 = () => [
    dis(11, 'Arcane Purge', 'A pressure-point strike that stops their sorcery.', 'Suppressed targets take psychic damage when they act or use supernatural abilities.', { tiers:t('11 + I psychic; suppressed (save)','16 + I psychic; suppressed (save)','21 + I psychic; suppressed (save)'), powerRoll:'Intuition' }),
    dis(11, 'Phase Hurl', 'You throw your foe out of phase.', 'The target and everything they collide with take psychic damage equal to the squares moved.', { tiers:t('push 5','push 7','push 9') }),
    dis(11, 'Scalar Assault', 'You grow a limb for one devastating attack.', 'Area psychic damage with a strong push.', { keywords:['Area','Psionic'], type:'Main action', distance:'3 burst', target:'Each enemy in the area', powerRoll:'Intuition', tiers:t('15 psychic; push 3','19 psychic; push 5','23 psychic; push 7') }),
    dis(11, 'Synaptic Anchor', 'You create a feedback loop in their mind.', 'Disrupt a strike and leave the target unable to focus on future attacks.', { type:'Triggered', keywords:['Psionic'], distance:'Ranged 10', target:'One creature' }),
  ];

  // Tradition features (auto, subclass-keyed)
  const TRAD_FEAT_2 = {
    chronokinetic: [{ name: 'Rapid Processing', text: 'As a maneuver you can read a whole book or process similar information, and you gain an extra respite activity.' }],
    cryokinetic: [{ name: 'Entropic Adaptability', text: 'You have cold immunity equal to twice your Intuition, ignore cold/ice difficult terrain, and climb at full speed.' }],
    metakinetic: [{ name: 'Inertial Sink', text: 'Add your Intuition to your effective size for lifting/forced-movement, reduce falls by 5 squares, and reduce forced-movement damage by your level.' }],
  };
  const TRAD_FEAT_5 = {
    chronokinetic: [{ name: 'Instant Action', text: 'If not surprised on your first turn, gain an edge on ability rolls and 2 surges. If surprised, spend 3 discipline to negate it and gain the benefit.' }],
    cryokinetic: [{ name: 'Chilling Readiness', text: 'At the start of any combat, you gain surges equal to your Victories.' }],
    metakinetic: [{ name: 'Inertial Fulcrum', text: 'When you reduce damage to yourself or forced movement on yourself, deal damage equal to your Intuition to one enemy in your Null Field.' }],
  };
  const TRAD_FEAT_8 = {
    chronokinetic: [{ name: 'Shared Momentum', text: 'When you Disengage, one ally in your Null Field can Disengage as a free triggered action using your distance.' }],
    cryokinetic: [{ name: 'Synaptic Triage', text: 'Free maneuver: spend 1d6 Stamina to remove one effect on you; each chosen creature in your Null Field gains this too.' }],
    metakinetic: [{ name: 'Inertial Dampener', text: 'You and chosen creatures/objects in your Null Field gain a stability bonus equal to your Intuition; would-be force-movers take psychic damage.' }],
  };
  const TRAD_ABILITY_2 = {
    chronokinetic: [
      dis(5, 'Blur', 'You release stored time to act twice.', 'Use a signature or heroic ability, gaining an edge on its power rolls.', { type:'Maneuver', keywords:['Psionic'], distance:'Self', target:'Self' }),
      dis(5, 'Force Redirected', 'Your strike moves your target in a surprising direction.', 'A strike with flexible forced movement.', { tiers:t('5 + A; slide 2','8 + A; slide 3','11 + A; slide 5') }),
    ],
    cryokinetic: [
      dis(5, 'Entropic Field', 'You drastically increase local entropy.', 'Area cold damage that slows.', { keywords:['Area','Psionic','Weapon'], type:'Main action', distance:'3 cube within 1', target:'Each enemy in the area', powerRoll:'Agility', tiers:t('5 cold','9 cold; A<AVERAGE slowed (save)','13 cold; A<STRONG slowed (save)') }),
      dis(5, 'Heat Sink', 'You absorb ambient heat, coating the ground in frost.', 'Create frost terrain and chill the air around you.', { type:'Maneuver', keywords:['Psionic'], distance:'Self', target:'Self' }),
    ],
    metakinetic: [
      dis(5, 'Gravitic Strike', 'Your fist pulls a distant enemy closer.', 'A reaching strike with vertical pull.', { tiers:t('8 + A psychic; vertical pull 3','12 + A psychic; vertical pull 5','16 + A psychic; vertical pull 7') }),
      dis(5, 'Kinetic Shield', 'A force barrier absorbs incoming kinetic energy.', 'Reduce incoming damage and bank it against your next strike.', { type:'Triggered', keywords:['Psionic'], distance:'Self', target:'Self' }),
    ],
  };
  const TRAD_ABILITY_6 = {
    chronokinetic: [
      dis(9, 'Interphase', 'You slip into a faster timestream.', 'Use up to three signature abilities, each gaining an edge.', { type:'Main action', keywords:['Psionic'], distance:'Self', target:'Self' }),
      dis(9, 'Phase Step', 'You move through and damage enemies.', 'Move through enemies, damaging those you pass.', { keywords:['Melee','Psionic','Weapon'], distance:'Self; see below', target:'Self', powerRoll:'Agility', tiers:t('6 damage','9 damage','13 damage') }),
    ],
    cryokinetic: [
      dis(9, 'Ice Pillars', 'Pillars of ice launch your foes skyward.', 'Vertical forced movement; pillars vanish after.', { keywords:['Psionic','Ranged'], type:'Main action', distance:'Ranged 10', target:'Special', powerRoll:'Intuition', tiers:t('vertical push 3','vertical push 5','vertical push 7') }),
      dis(9, 'Wall of Ice', 'You create a wall of ice.', 'Conjure a wall of ice on the battlefield.', { keywords:['Area','Psionic','Ranged'], type:'Main action', distance:'Special within 10', target:'Special' }),
    ],
    metakinetic: [
      dis(9, 'Gravitic Charge', 'Momentum that defies gravity.', 'Ignore stability; collide through creatures, damaging both and continuing.', { type:'Maneuver', keywords:['Psionic'], distance:'Self', target:'Self' }),
      dis(9, 'Iron Body', 'Your body becomes as hard as iron.', 'You harden, gaining heavy resistance for the encounter.', { type:'Maneuver', keywords:['Psionic'], distance:'Self', target:'Self' }),
    ],
  };
  const TRAD_ABILITY_9 = {
    chronokinetic: [
      dis(11, 'Arrestor Cycle', 'You trap a foe in a loop of time.', 'The target may lose their turn; if not, they take heavy psychic damage per action.', { keywords:['Psionic','Ranged'], type:'Main action', distance:'Ranged 10', target:'One creature' }),
      dis(11, 'Time Loop', 'You show shadows what true speed is.', 'You bend time around yourself for a burst of action.', { type:'Maneuver', keywords:['Psionic'], distance:'Self', target:'Self' }),
    ],
    cryokinetic: [
      dis(11, 'Absolute Zero', 'You become the coldest thing in the timescape.', 'Until end of encounter, become an avatar of cold with immunity to all damage equal to your cold immunity.', { type:'Maneuver', keywords:['Psionic'], distance:'Self', target:'Self' }),
      dis(11, 'Heat Drain', 'You drain all the heat from the target.', 'A strike that saps the target\u2019s warmth and vitality.', { keywords:['Melee','Psionic','Strike'], powerRoll:'Intuition', tiers:t('11 + I cold','16 + I cold','22 + I cold') }),
    ],
    metakinetic: [
      dis(11, 'Inertial Absorption', 'You absorb an attack to empower your body.', 'Take half the damage, negate its effects, and gain 3 surges.', { type:'Triggered', keywords:['Psionic'], distance:'Self', target:'Self' }),
      dis(11, 'Realitas', 'Your hyperreality disrupts their existence.', 'A strike that frays the target\u2019s connection to the manifold.', { powerRoll:'Intuition', tiers:t('11 + I psychic','16 + I psychic','21 + I psychic') }),
    ],
  };

  const nul = {
    2: {
      summary: 'Your tradition shapes your body, and your discipline finds new outlets.',
      staminaGain: 9,
      autoFeatures: ({ sub }) => TRAD_FEAT_2[sub] || [],
      choices: [
        { id: 'perk', label: 'Perk', help: 'Choose one exploration, interpersonal, or intrigue perk.', kind: 'perk', options: PERK_EII },
        { id: 'tradition-ability-2', label: '2nd-Level Tradition Ability', help: 'Your tradition grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => TRAD_ABILITY_2[sub] || [] },
      ],
    },
    3: {
      summary: 'Your psionic body answers faster than thought.',
      staminaGain: 9,
      autoFeatures: () => [
        { name: 'Psionic Leap', text: 'You long-jump and high-jump a distance equal to twice your Agility with no test.' },
        { name: 'Reorder', text: 'At the start of your turn, free triggered action: end one save-ends or end-of-turn effect on you, or on a creature in your Null Field.' },
      ],
      choices: [
        { id: 'discipline-7', label: '7-Discipline Ability', help: 'Choose one heroic ability that costs 7 discipline.', kind: 'ability', options: DIS_7 },
      ],
    },
    4: {
      summary: 'Your field strengthens, dissolving the supernatural around you.',
      staminaGain: 9,
      autoCharacteristicIncrease: { Agility: 3, Intuition: 3, max: true },
      autoFeatures: () => [
        { name: 'Characteristic Increase', text: 'Your Agility and Intuition scores each increase to 3.' },
        { name: 'Discipline Mastery Improvement', text: 'Your Discipline Mastery grants additional benefits when you have 8 or more discipline.' },
        { name: 'Enhanced Null Field', text: 'Your Null Field removes temporary supernatural terrain of your level or lower it overlaps, and suppresses permanent ones while overlapping.' },
        { name: 'Regenerative Field', text: 'The first time each round an enemy in your Null Field uses a main action, you gain 2 discipline instead of 1.' },
      ],
      choices: [
        { id: 'perk-4', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
        { id: 'skill-4', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
      ],
    },
    5: {
      summary: 'Your tradition reveals a deeper technique.',
      staminaGain: 9,
      autoFeatures: ({ sub }) => TRAD_FEAT_5[sub] || [],
      choices: [
        { id: 'discipline-9', label: '9-Discipline Ability', help: 'Choose one heroic ability that costs 9 discipline.', kind: 'ability', options: DIS_9 },
      ],
    },
    6: {
      summary: 'Your field learns to drink the elements themselves.',
      staminaGain: 9,
      autoFeatures: () => [
        { name: 'Elemental Absorption', text: 'When you use Inertial Shield, gain immunity to acid, cold, corruption, fire, lightning, poison, and sonic equal to your Intuition against the triggering damage.' },
        { name: 'Elemental Buffer', text: 'When you reduce elemental damage with immunity, gain 2 surges usable only on your next strike.' },
      ],
      choices: [
        { id: 'perk-6', label: 'Perk', help: 'Choose one exploration, interpersonal, or intrigue perk.', kind: 'perk', options: PERK_EII },
        { id: 'tradition-ability-6', label: '6th-Level Tradition Ability', help: 'Your tradition grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => TRAD_ABILITY_6[sub] || [] },
      ],
    },
    7: {
      summary: 'Discipline floods you, and your psionics bend to fine control.',
      staminaGain: 9,
      autoCharIncreaseAll: { delta: 1, max: 4 },
      autoFeatures: () => [
        { name: 'Characteristic Increase', text: 'Each characteristic score increases by 1, to a maximum of 4.' },
        { name: 'Discipline Mastery Improvement', text: 'Your Discipline Mastery grants additional benefits when you have 10 or more discipline.' },
        { name: 'Psi Boost', text: 'Spend extra discipline on Psionic main actions/maneuvers to enhance them: Dynamic, Expanded, Extended, Heightened, Magnified, Shared, or Sharpened Power.' },
        { name: 'Improved Body', text: 'When you gain discipline at the start of your turns in combat, you gain 3 instead of 2.' },
      ],
      choices: [
        { id: 'skill-7', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
      ],
    },
    8: {
      summary: 'Your tradition entrusts you with its highest discipline.',
      staminaGain: 9,
      autoFeatures: ({ sub }) => TRAD_FEAT_8[sub] || [],
      choices: [
        { id: 'perk-8', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
        { id: 'discipline-11', label: '11-Discipline Ability', help: 'Choose one heroic ability that costs 11 discipline.', kind: 'ability', options: DIS_11 },
      ],
    },
    9: {
      summary: 'You become the weapon — beyond hunger, age, and frailty.',
      staminaGain: 9,
      autoFeatures: () => [
        { name: 'I Am the Weapon', text: 'Your Stamina increases by 21; you can\u2019t be made bleeding even while dying, no longer age or need food, and can use Intuition to resist any potency.' },
      ],
      choices: [
        { id: 'tradition-ability-9', label: '9th-Level Tradition Ability', help: 'Your tradition grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => TRAD_ABILITY_9[sub] || [] },
      ],
    },
    10: {
      summary: 'Your body becomes perfected matter — beyond the chaos of the manifolds.',
      staminaGain: 9,
      autoCharacteristicIncrease: { Agility: 5, Intuition: 5, max: true },
      autoFeatures: () => [
        { name: 'Characteristic Increase', text: 'Your Agility and Intuition scores each increase to 5.' },
        { name: 'Discipline Mastery Improvement', text: 'Your Discipline Mastery grants additional benefits when you have 12 or more discipline.' },
        { name: 'Manifold Body', text: 'When you gain discipline at the start of your turns in combat, you gain 4 instead of 3.' },
        { name: 'Manifold Resonance', text: 'Each respite, shift yourself and creatures in your Null Field to a known location. Each ability grants 1 discipline usable only for a Psi Boost on it, and you and allies in your field ignore banes on power rolls.' },
        { name: 'Order', text: 'You gain the epic resource order equal to the XP you earn each respite, spendable as discipline. Spend 1 order at the start of combat to enlarge your Null Field for the encounter. Order remains until spent.' },
      ],
      choices: [
        { id: 'perk-10', label: 'Perk', help: 'Choose one exploration, interpersonal, or intrigue perk.', kind: 'perk', options: PERK_EII },
        { id: 'skill-10', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
      ],
    },
  };

  function install() {
    if (!window.LEVELUP_DATA) { setTimeout(install, 30); return; }
    window.LEVELUP_DATA['null'] = nul;
  }
  install();
})();
