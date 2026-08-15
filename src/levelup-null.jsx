// levelup-null.jsx — Null level-up data (levels 2–10).
// Traditions: Chronokinetic / Cryokinetic / Metakinetic · Resource: Discipline · staminaPer 9.

const PERK_EII = [
  { id: 'exploration',  name: 'Exploration Perk',  body: 'A boon for the wilds and the road.' },
  { id: 'interpersonal',name: 'Interpersonal Perk',body: 'A boon for the table and the court.' },
  { id: 'intrigue',     name: 'Intrigue Perk',     body: 'A boon for the shadows and the con.' },
];
const PERK_ANY = ['crafting','exploration','interpersonal','intrigue','lore','supernatural'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Perk', body: '' }));
const SKILL_ANY = ['crafting','exploration','interpersonal','intrigue','lore'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Skill', body: '' }));
const t = (t1, t2, t3) => [['\u2264 11', t1], ['12\u201316', t2], ['17+', t3]];
// The level-1 mastery feature is named per tradition (see src/data/classes.js); the
// official "Discipline Mastery Improvement" features refer to it by that name.
const MASTERY_NAME = { chronokinetic: 'Chronokinetic Mastery', cryokinetic: 'Cryokinetic Mastery', metakinetic: 'Metakinetic Mastery' };
const masteryImprovement = (numeral, threshold) => ({ sub }) => ({
  name: `Discipline Mastery Improvement ${numeral}`,
  text: `Your ${MASTERY_NAME[sub] || 'tradition\u2019s Mastery'} feature provides additional benefits when you have ${threshold} or more discipline.`,
});
const dis = (n, name, flavor, effect, extra) => ({ name, cost: n, resource: 'Discipline', flavor, type: 'Main action', keywords: ['Melee','Psionic','Strike','Weapon'], distance: 'Melee 1', target: 'One creature', effect, ...extra });

const DIS_7 = () => [
  dis(7, 'Absorption Field', 'Your null field absorbs kinetic energy.', 'Until the end of the encounter, the size of your Null Field ability increases by 1. While the area of that ability is enlarged this way, each enemy in the area takes a bane on ability rolls.', { type:'Maneuver', keywords:['Psionic'], distance:'Self', target:'Self' }),
  dis(7, 'Molecular Rearrangement Field', 'Your enemies’ wounds open, your allies’ wounds close.', 'Until the end of the encounter, the size of your Null Field ability increases by 1. While the area of that ability is enlarged this way, each enemy who has I < AVERAGE and enters the area for the first time in a combat round or starts their turn there is bleeding (save ends). Each ally who enters the area for the first time in a combat round or starts their turn there gains temporary stamina equal to your Intuition score.', { type:'Maneuver', keywords:['Psionic'], distance:'Self', target:'Self' }),
  dis(7, 'Stabilizing Field', 'You project order, making it harder for your enemies to interfere with you and your allies.', 'Until the end of the encounter, the size of your Null Field ability increases by 1. While the area of that ability is enlarged this way, you ignore difficult terrain and reduce the potency of enemy effects targeting you by 1 for you. You can also use a free triggered action at the start of each of your turns to end one effect on you that is ended by a saving throw or that ends at the end of your turn. Each ally in the area also gains these benefits.', { type:'Maneuver', keywords:['Psionic'], distance:'Self', target:'Self' }),
  dis(7, 'Synapse Field', 'Attacks made by allies in your null field disrupt your enemies’ thoughts, causing psychic pain.', 'Until the end of the encounter, the size of your Null Field ability increases by 1. While the area of that ability is enlarged this way, whenever an enemy in the area takes rolled damage, they take extra psychic damage equal to twice your Intuition score.', { type:'Maneuver', keywords:['Psionic'], distance:'Self', target:'Self' }),
];
const DIS_9 = () => [
  dis(9, 'Anticipating Strike', 'You suddenly strike an enemy, then grab them in a psionically enhanced grip.', 'This strike resolves before the triggering movement or main action.', { type:'Free triggered action', trigger:'The target moves or uses a main action.', tiers:t('7 + A damage; I < WEAK, restrained (save ends)','10 + A damage; I < AVERAGE, restrained (save ends)','13 + A damage; I < STRONG, restrained (save ends)') }),
  dis(9, 'Iron Grip', 'You grab the target with supernatural force.', 'While grabbed this way, the target takes a bane on the Escape Grab maneuver. Each time they use that maneuver, they take damage equal to twice your Agility score.', { tiers:t('10 + A damage; A < WEAK, grabbed','14 + A damage; A < AVERAGE, grabbed','18 + A damage; A < STRONG, grabbed') }),
  dis(9, 'Phase Leap', 'You leap beyond reality, leaving an afterimage of yourself.', 'You jump up to your speed without provoking opportunity attacks. Until the end of your next turn, a static afterimage of you remains in the space you left, and any enemy adjacent to your afterimage takes a bane on ability rolls. You can use your abilities from your own space or from the space of your afterimage as if you were still there. Additionally, if your Null Field ability is active, your afterimage also projects the aura from that ability, which you control as if you were in the afterimage’s space.', { type:'Move action', keywords:['Psionic'], distance:'Self', target:'Self' }),
  dis(9, 'Synaptic Reset', 'You expand your nullifying power to mitigate harmful effects.', 'Each target can end any conditions or effects on themself, and gains 5 temporary Stamina for each condition or effect removed.', { type:'Maneuver', keywords:['Area','Psionic'], distance:'3 burst', target:'Self and each ally in the area' }),
];
const DIS_11 = () => [
  dis(11, 'Arcane Purge', 'You focus your null field into a pressure point strike that prevents your foe from channeling sorcery.', 'While suppressed, a target takes psychic damage equal to twice your Intuition score at the start of their turns, whenever they use a supernatural ability, or whenever they use an ability that costs Malice.', { tiers:t('13 + A damage; M < WEAK, the target is suppressed (save ends)','19 + A damage; M < AVERAGE, the target is suppressed (save ends)','24 + A damage; M < STRONG, the target is suppressed (save ends)'), powerRoll:'Agility' }),
  dis(11, 'Phase Hurl', 'You throw your foe out of phase with this manifold, causing them to harm other enemies as they return.', 'The target and each creature or object they collide with from this forced movement takes psychic damage equal to the total number of squares the target was force moved. While the target is dazed this way, they see glimpses of creatures from other parts of the timescape.', { tiers:t('9 + A damage; push 5; I < WEAK, dazed (save ends)','13 + A damage; push 7; I < AVERAGE, dazed (save ends)','18 + A damage; push 10; I < STRONG, dazed (save ends)') }),
  dis(11, 'Scalar Assault', 'You warp reality to grow a limb for just a moment and make a single devastating attack.', '', { keywords:['Area','Psionic'], type:'Main action', distance:'3 cube within 1', target:'Each enemy in the area', powerRoll:'Agility', tiers:t('12 psychic damage; push 3','17 psychic damage; push 5','23 psychic damage; push 7') }),
  dis(11, 'Synaptic Anchor', 'You disrupt an enemy’s strike and create a feedback loop in their mind, preventing them from focusing on future attacks.', 'The target takes half the damage, and if the triggering creature has I < AVERAGE, they are dazed (save ends). While the triggering creature is dazed this way, they take psychic damage equal to your Intuition score whenever they use a main action.', { type:'Free triggered action', trigger:'The target takes damage from another creature’s ability while in the area of your Null Field ability.', keywords:['Psionic'], distance:'Self; see below', target:'Self or one creature' }),
];

// Tradition features (auto, subclass-keyed)
const TRAD_FEAT_2 = {
  chronokinetic: [{ name: 'Rapid Processing', text: 'As a maneuver, you can read an entire book or process a similar amount of information. Additionally, during any respite, you can take an additional respite activity.' }],
  cryokinetic: [{ name: 'Entropic Adaptability', text: 'You have cold immunity equal to twice your Intuition score. Additionally, you ignore difficult terrain related to cold and ice, and you can automatically climb at full speed while moving.' }],
  metakinetic: [{ name: 'Inertial Sink', text: 'You add your Intuition score to your effective size for the purpose of interacting with creatures and objects, such as for determining whether you can lift an object, whether you are affected by forced movement, and so forth. This has no effect on whether you can be grabbed.\n\nAdditionally, when you fall, you reduce the effective height of the fall by 5 squares in addition to any other reductions. Whenever you take damage from being force moved, you reduce that damage by an amount equal to your level.' }],
};
const TRAD_FEAT_5 = {
  chronokinetic: [{ name: 'Instant Action', text: 'If you\'re not surprised at the start of your first turn in combat, you gain an edge on ability rolls and gain 2 surges. If you are surprised, you can spend 3 discipline to no longer be surprised and gain the benefits of this feature.' }],
  cryokinetic: [{ name: 'Chilling Readiness', text: 'You steel yourself for imminent danger by tapping into your body\'s cold energy. At the start of any combat, you gain a number of surges equal to your Victories.' }],
  metakinetic: [{ name: 'Inertial Fulcrum', text: 'Whenever you use an ability to reduce damage dealt to you or to reduce the distance of forced movement imposed upon you, you can deal damage to one enemy in the area of your Null Field ability equal to your Intuition score.' }],
};
const TRAD_FEAT_8 = {
  chronokinetic: [{ name: 'Shared Momentum', text: 'When you take the Disengage move action, one ally in the area of your Null Field ability can also take the Disengage move action as a free triggered action, using your distance for that move action.' }],
  cryokinetic: [{ name: 'Synaptic Triage', text: 'As a free maneuver, you can spend 1d6 Stamina to remove one effect on you. Each creature of your choice in the area of your Null Field ability also gains this benefit.' }],
  metakinetic: [{ name: 'Inertial Dampener', text: 'You and each creature or object of your choice in the area of your Null Field ability gain a bonus to stability equal to your Intuition score. A creature who attempts to force move a target with this bonus takes psychic damage equal to your Intuition score.' }],
};
const TRAD_ABILITY_2 = {
  chronokinetic: [
    dis(5, 'Blur', 'You release stored time, allowing you to act twice.', 'You can use a signature or heroic ability. You gain an edge on that ability’s power rolls.', { type:'Maneuver', keywords:['Psionic'], distance:'Self', target:'Self' }),
    dis(5, 'Force Redirected', 'The force of your strike moves your target in a surprising direction.', '', { distance: 'Melee 3', tiers:t('8 + A damage; slide 1','12 + A damage; slide 3','16 + A damage; slide 5') }),
  ],
  cryokinetic: [
    dis(5, 'Entropic Field', 'You drastically increase the local entropy.', '', { keywords:['Area','Psionic','Weapon'], type:'Main action', distance:'3 cube within 1', target:'Each enemy in the area', powerRoll:'Agility', tiers:t('6 cold damage; A < WEAK, slowed (save ends)','9 cold damage; A < AVERAGE, slowed (save ends)','13 cold damage; A < STRONG, slowed (save ends)') }),
    dis(5, 'Heat Sink', 'You absorb ambient heat, coating the ground in frost and precipitating snow from the air.', 'Until the start of your next turn, the size of your Null Field ability increases by 1, and you and any ally benefit from concealment while in the area. At the end of this turn, each enemy in the area takes cold damage equal to your Intuition score.', { type:'Maneuver', keywords:['Psionic'], distance:'Self', target:'Self' }),
  ],
  metakinetic: [
    dis(5, 'Gravitic Strike', 'Your fist emanates gravitic force that pulls a distant enemy closer.', '', { distance: 'Melee 3', tiers:t('8 + A psychic damage; vertical pull 3','12 + A psychic damage; vertical pull 5','16 + A psychic damage; vertical pull 7') }),
    dis(5, 'Kinetic Shield', 'You manifest a force barrier that absorbs incoming kinetic energy.', 'While you have temporary Stamina from this ability, you can’t be made bleeding even while dying.', { tiers: [['≤11','You gain 10 temporary Stamina'],['12–16','You gain 15 temporary Stamina'],['17+','You gain 20 temporary Stamina']], type:'Maneuver', keywords:['Psionic'], distance:'Self', target:'Self' }),
  ],
};
const TRAD_ABILITY_6 = {
  chronokinetic: [
    dis(9, 'Interphase', 'You slip into a faster timestream to act more quickly.', 'You can use up to three signature abilities, each of which gains an edge.', { type:'Main action', keywords:['Psionic'], distance:'Self', target:'Self' }),
    dis(9, 'Phase Step', 'You weaken your connection to this manifold, allowing you to move through and damage enemies.', 'You can shift up to your speed, and squares occupied by enemies or objects are not difficult terrain for this shift. You make one power roll that targets each enemy you moved through during this shift.', { keywords:['Melee','Psionic','Weapon'], distance:'Self; see below', target:'Self', powerRoll:'Agility', tiers:t('6 damage; M < WEAK, dazed','8 damage; M < AVERAGE, dazed','12 damage; M < STRONG, dazed') }),
  ],
  cryokinetic: [
    dis(9, 'Ice Pillars', 'Pillars of ice erupt from the ground and launch your foes into the air.', 'The pillars vanish as soon as the effects of the forced movement are resolved.', { keywords:['Psionic','Ranged'], type:'Main action', distance:'Ranged 10', target:'Three creatures or objects', powerRoll:'Intuition', tiers:t('vertical slide 6','vertical slide 8','vertical slide 10') }),
    dis(9, 'Wall of Ice', 'You create a wall of ice.', 'You can place this wall in occupied squares, sliding each creature in the area into the nearest unoccupied space of your choice. The wall remains until the end of the encounter or until you are dying. The wall’s squares are treated as stone squares for the purpose of damage, and you and allies can move freely through the wall. Each enemy who enters a square adjacent to the wall and has M < AVERAGE is slowed (save ends). Each enemy who is force moved into the wall and has M < AVERAGE is restrained (save ends).', { keywords:['Area','Psionic','Ranged'], type:'Main action', distance:'10 wall within 10', target:'Special' }),
  ],
  metakinetic: [
    dis(9, 'Gravitic Charge', 'You channel your discipline into momentum that defies gravity.', 'This movement ignores stability. If you slide into another creature, you resolve damage to both of you as if your force movement had ended, but you keep moving through that creature’s space.', { tiers: [['≤11','vertical slide 5'],['12–16','vertical slide 7'],['17+','vertical slide 9']], type:'Maneuver', keywords:['Psionic'], distance:'Self', target:'Self' }),
    dis(9, 'Iron Body', 'You focus until your body becomes as hard as iron.', 'You gain 20 temporary Stamina. Additionally, until the end of the encounter, your stability gains a bonus equal to your Intuition score.', { type:'Maneuver', keywords:['Psionic'], distance:'Self', target:'Self' }),
  ],
};
const TRAD_ABILITY_9 = {
  chronokinetic: [
    dis(11, 'Arrestor Cycle', 'You trap your foe in a looping cycle of time, where they relive the last few seconds over and over again.', 'If the target loses their turn, the round continues as if they had acted. A target who doesn’t lose their turn takes psychic damage equal to twice your Intuition score for each main action they take until the end of their next turn.', { tiers: [['≤11','I < WEAK, the target loses their turn'],['12–16','I < AVERAGE, the target loses their turn'],['17+','I < STRONG, the target loses their turn']], keywords:['Psionic','Ranged'], type:'Free triggered action', trigger:'The triggering creature starts their turn.', distance:'Ranged 10', target:'One creature' }),
    dis(11, 'Time Loop', 'You show shadows what true speed is.', 'You take a bonus turn immediately after the triggering creature. This ability can be used only once per combat round.', { type:'Free triggered action', trigger:'Another creature on the encounter map ends their turn.', keywords:['Psionic'], distance:'Self', target:'Self' }),
  ],
  cryokinetic: [
    dis(11, 'Absolute Zero', 'You become the coldest thing in the timescape.', 'Until the end of the encounter or until you are dead, you become an avatar of uttermost cold. You gain immunity to all damage equal to the cold damage immunity granted by your Entropic Adaptability trait, you ignore the negative effects of dying, and you have a +2 bonus to potencies.', { tiers: [['≤11','You gain 20 temporary Stamina'],['12–16','You gain 30 temporary Stamina'],['17+','You gain 40 temporary Stamina']], type:'Maneuver', keywords:['Psionic'], distance:'Self', target:'Self' }),
    dis(11, 'Heat Drain', 'You drain all the heat from the target.', 'While restrained this way, the target takes cold damage equal to your Intuition score at the start of each of your turns. Additionally, whenever the target damages another creature while restrained this way, any potency associated with the damage is reduced by 2.', { type: 'Maneuver', keywords:['Melee','Psionic','Strike'], powerRoll:'Intuition', tiers:t('8 + I cold damage; M < WEAK, restrained (save ends)','11 + I cold damage; M < AVERAGE, restrained (save ends)','15 + I cold damage; M < STRONG, restrained (save ends)') }),
  ],
  metakinetic: [
    dis(11, 'Inertial Absorption', 'You absorb an attack to empower your body.', 'You take half the damage, negate any effects associated with the damage for you, and gain 3 surges.', { type:'Free triggered action', trigger:'Another creature damages you using an ability.', keywords:['Psionic'], distance:'Self', target:'Self' }),
    dis(11, 'Realitas', 'Your essential hyperreality disrupts your enemy’s connection to existence.', 'While dazed this way, the target takes psychic damage equal to twice your Intuition score at the start of each of your turns. If this ability causes a creature who is not a leader or solo creature to become winded, they are instead reduced to 0 Stamina. Any creature reduced to 0 Stamina by this ability is forgotten by all creatures of your level or lower in the timescape who are not present in the encounter. Loved ones of the forgotten creature retain a faint sense of melancholy. This effect can be reversed only at the Director’s discretion.', { powerRoll:'Agility', tiers:t('7 + A psychic damage; I < WEAK, dazed','10 + A psychic damage; I < AVERAGE, dazed','13 + A psychic damage; I < STRONG, dazed') }),
  ],
};

export const nul = {
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
      { name: 'Psionic Leap', text: 'You can long jump and high jump a distance equal to twice your Agility score without needing to make a test.' },
      { name: 'Reorder', text: 'At the start of each of your turns, you can use a free triggered action to end one effect on you that is ended by a saving throw or that ends at the end of your turn. Alternatively, you can grant this benefit to one creature in the area of your Null Field ability.' },
    ],
    choices: [
      { id: 'discipline-7', label: '7-Discipline Ability', help: 'Choose one heroic ability that costs 7 discipline.', kind: 'ability', options: DIS_7 },
    ],
  },
  4: {
    summary: 'Your field strengthens, dissolving the supernatural around you.',
    staminaGain: 9,
    autoCharacteristicIncrease: { Agility: 3, Intuition: 3, max: true },
    autoFeatures: (ctx) => [
      { name: 'Characteristic Increase', text: 'Your Agility and Intuition scores each increase to 3.' },
      masteryImprovement('I', 8)(ctx),
      { name: 'Enhanced Null Field', text: 'While using your Null Field ability, you disrupt magic and psionic power suffusing the area around you. During combat, any temporary supernatural terrain effects of your level or lower are removed when your aura partially or fully overlaps with their location. Permanent supernatural terrain effects of your level or lower are temporarily negated while your aura overlaps with their location, but return when the aura no longer overlaps with them.' },
      { name: 'Regenerative Field', text: 'The first time each combat round that an enemy in the area of your Null Field ability uses a main action, you gain 2 discipline instead of 1.' },
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
      { name: 'Elemental Absorption', text: 'Whenever you use your Inertial Shield triggered action, you gain immunity to acid, cold, corruption, fire, lightning, poison, and sonic damage equal to your Intuition score against the triggering damage.' },
      { name: 'Elemental Buffer', text: 'Whenever you reduce acid, cold, corruption, fire, lightning, poison, or sonic damage with damage immunity, you gain 2 surges that can be used only to increase the damage of your next strike.' },
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
    autoFeatures: (ctx) => [
      { name: 'Characteristic Increase', text: 'Each of your characteristic scores increases by 1, to a maximum of 4.' },
      masteryImprovement('II', 10)(ctx),
      { name: 'Psi Boost',
        text: 'Whenever you use an ability that is a main action or a maneuver with the Psionic keyword, you can spend additional discipline to apply a psi boost to it and enhance its effects. A psi boost\'s effects only last until the end of the turn which the ability is first used. You can apply multiple psi boosts to an ability, but only one instance of each specific boost. You can use the following psi boosts.',
        table: { head: ['Psi Boost', 'Effect'], rows: [
          ['Dynamic Power (1 Discipline)', 'If the ability force moves a target, the forced movement distance gains a bonus equal to your Intuition score.'],
          ['Expanded Power (3 Discipline)', 'If the ability targets an area, you increase the size of the area by 1. If the area is a line, you increase the size of one dimension, not both.'],
          ['Extended Power (1 Discipline)', 'If the ability is ranged, the distance gains a bonus equal to your Intuition score. If the ability is melee, the distance gains a +2 bonus.'],
          ['Heightened Power (1 Discipline)', 'If the ability deals rolled damage, it deals extra damage equal to your Intuition score.'],
          ['Magnified Power (5 Discipline)', 'If the ability has a potency, you increase that potency by an amount equal to your Intuition score.'],
          ['Shared Power (5 Discipline)', 'If the ability targets individual creatures or objects, you target one additional creature or object within distance.'],
          ['Sharpened Power (1 Discipline)', 'If the ability has any power roll, that roll gains an edge.'],
        ] } },
      { name: 'Improved Body', text: 'When you gain discipline at the start of each of your turns during combat, you gain 3 discipline instead of 2.' },
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
      { name: 'I Am the Weapon', text: 'Your Stamina increases by 21 and you can\'t be made bleeding even while dying. You no longer age or have need of food. Additionally, you can use Intuition instead of another characteristic when resisting potencies.' },
    ],
    choices: [
      { id: 'tradition-ability-9', label: '9th-Level Tradition Ability', help: 'Your tradition grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => TRAD_ABILITY_9[sub] || [] },
    ],
  },
  10: {
    summary: 'Your body becomes perfected matter — beyond the chaos of the manifolds.',
    staminaGain: 9,
    autoCharacteristicIncrease: { Agility: 5, Intuition: 5, max: true },
    autoFeatures: (ctx) => [
      { name: 'Characteristic Increase', text: 'Your Agility and Intuition scores each increase to 5.' },
      masteryImprovement('III', 12)(ctx),
      { name: 'Manifold Body', text: 'When you gain discipline at the start of each of your turns during combat, you gain 4 discipline instead of 3.' },
      { name: 'Manifold Resonance', text: 'Your body becomes perfected matter, beyond the whims and chaos of the timescape and the restrictions of the manifolds. Each time you finish a respite, you can shift yourself and any creatures in the area of your Null Field ability to any location in the timescape known to you, known to any other creature in the area, or where any supernatural treasure in the area has been before.\n\nWhenever you use an ability, you gain 1 discipline that can be used only to apply a benefit from your Psi Boost feature to that ability. Additionally, you and allies in the area of your Null Field ability ignore banes and double banes on your power rolls.' },
      { name: 'Order', text: 'You have an epic resource called order. Each time you finish a respite, you gain order equal to the XP you gain. You can spend order on your abilities as if it were discipline.\n\nAt the start of a combat encounter, you can spend 1 order to increase the size of your Null Field by 1 until the end of the encounter.\n\nOrder remains until you spend it.' },
    ],
    choices: [
      { id: 'perk-10', label: 'Perk', help: 'Choose one exploration, interpersonal, or intrigue perk.', kind: 'perk', options: PERK_EII },
      { id: 'skill-10', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
};
