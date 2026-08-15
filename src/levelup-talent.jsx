// levelup-talent.jsx — Talent level-up data (levels 2–10).
// Traditions: Chronopathy / Telekinesis / Telepathy · Resource: Clarity · staminaPer 6.

const PERK_ILS = [
  { id: 'interpersonal', name: 'Interpersonal Perk', body: 'A boon for the table and the court.' },
  { id: 'lore',          name: 'Lore Perk',          body: 'A boon for the studious.' },
  { id: 'supernatural',  name: 'Supernatural Perk',  body: 'A boon at the edge of the natural world.' },
];
const PERK_ANY = ['crafting','exploration','interpersonal','intrigue','lore','supernatural'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Perk', body: '' }));
const SKILL_ANY = ['crafting','exploration','interpersonal','intrigue','lore'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Skill', body: '' }));
const tr = (t1, t2, t3) => [['\u2264 11', t1], ['12\u201316', t2], ['17+', t3]];
const cl = (n, name, flavor, effect, extra) => ({ name, cost: n, resource: 'Clarity', flavor, type: 'Main action', keywords: ['Psionic','Ranged'], distance: 'Ranged 10', target: 'One creature', effect, ...extra });

const CL_7 = () => [
  cl(7, 'Fling Through Time', 'You hurl the target through the annals of time, forcing them to witness every moment of their existence all at once.', 'A target who is flung through time is removed from the encounter map until the end of their next turn, reappearing in their original space or the nearest unoccupied space.', { strained: 'You take 2d6 damage and permanently grow visibly older (the equivalent of 10 years for a human). If you obtain a tier 3 outcome on the power roll, you gain 2 clarity.', target: 'One creature or object', keywords:['Psionic','Ranged','Strike','Chronopathy'], powerRoll:'Presence', tiers:tr('3 + P corruption damage; P < WEAK, weakened (save ends)','5 + P corruption damage; the target is flung through time and if P < AVERAGE, they are weakened (save ends)','8 + P corruption damage; the target is flung through time, and if P < STRONG, they are weakened (save ends)') }),
  cl(7, 'Force Orbs', 'Spheres of solid psionic energy float around you.', 'You create three size 1T orbs that orbit your body. Each orb gives you a cumulative damage immunity 1. Each time you take damage, you lose 1 orb.\n\nOnce on each of your turns, you can use a free maneuver to fire an orb at a creature or object within 5 squares as a ranged strike, losing the orb after the strike.', { strained: 'You create five orbs, and you are weakened while you have any orbs active.', target: 'Self', distance: 'Self; see below', keywords:['Psionic','Ranged','Strike','Telekinesis'], powerRoll:'Reason', tiers:tr('2 damage','3 damage','5 damage') }),
  cl(7, 'Reflector Field', 'A protective field reverses the momentum of incoming attacks.', 'The aura lasts until the start of your next turn. Whenever an enemy targets an ally in the area with a ranged ability, the ability is negated on the ally and reflected back at the enemy. The ability deals half the damage to the enemy that it would have dealt to the ally and loses any additional effects.', { strained: 'The size of the aura increases by 1. Whenever your aura reflects an ability, you take 2d6 damage and forget a memory, as determined by you and the Director.', keywords:['Area','Psionic','Telepathy'], type:'Main action', distance:'3 aura', target:'Special' }),
  cl(7, 'Soul Burn', 'You blast their soul out of their body, leaving it to helplessly float back to a weakened husk.', 'The target takes a bane on Presence tests until the end of the encounter.', { strained: 'The potency of this ability increases by 1. You take 2d6 damage and gain 3 surges that you can use immediately.', keywords:['Psionic','Ranged','Strike','Animapathy'], powerRoll:'Presence', tiers:tr('6 + P damage; P < WEAK, dazed (save ends)','10 + P damage; P < AVERAGE, dazed (save ends)','14 + P damage; P < STRONG, dazed (save ends)') }),
];
const CL_9 = () => [
  cl(9, 'Exothermic Shield', 'You encase the target in psionic flame and allow them to flicker without fear of burning out.', 'Until the start of your next turn, the target has cold immunity 10 and fire immunity 10, and their strikes deal extra fire damage equal to twice your Reason score. Additionally, whenever an enemy uses a melee ability against the target while they are under this effect, the enemy takes 5 fire damage.', { strained: 'The target gains 2 surges. You are weakened and slowed (save ends).', type: 'Maneuver', keywords:['Psionic','Ranged','Pyrokinesis'], target:'Self or one ally' }),
  cl(9, 'Hypersonic', 'You move fast enough to turn around and watch your foes feel the aftermath.', 'You teleport to a square on the opposite side of the area before making the power roll.', { strained: 'If you obtain a tier 2 outcome or better, you are slowed until the end of your turn and each target is slowed until the end of their turn.', distance: '5 × 2 line within 1', keywords:['Area','Charge','Psionic','Telekinesis'], target:'Each enemy in the area', powerRoll:'Reason', tiers:tr('12 sonic damage','18 sonic damage','24 sonic damage') }),
  cl(9, 'Mind Snare', 'You latch onto your prey’s brain and don’t let go, like a song they can’t get out of their head.', 'While slowed this way, the target takes 3 psychic damage for each square they willingly leave.', { strained: 'While slowed this way, the target instead takes 5 psychic damage for each square they willingly leave. You have a double bane on ability rolls made against the target while they are slowed this way.', keywords:['Psionic','Ranged','Strike','Telepathy'], powerRoll:'Reason', tiers:tr('10 + R psychic damage; R < WEAK, slowed (save ends)','14 + R psychic damage; R < AVERAGE, slowed (save ends)','20 + R psychic damage; R < STRONG, slowed (save ends)') }),
  cl(9, 'Soulbound', 'You fire a piercing bolt of psychic energy that lances through two foes and leaves a faint intangible thread between them.', 'If any target becomes stitched to the other, both targets are stitched together. While stitched together, a target takes a bane on power rolls while not adjacent to a creature they’re stitched to.\n\nWhenever a stitched target takes damage that wasn’t dealt by or also taken by another stitched target, each other stitched target takes half the damage the initial target took.', { strained: 'You target yourself and three enemies instead.', keywords:['Psionic','Ranged','Strike','Animapathy'], target:'Two enemies', powerRoll:'Presence', tiers:tr('8 damage; A < WEAK, the target is stitched to the other target (save ends)','13 damage; A < AVERAGE, the target is stitched to the other target (save ends)','17 damage; A < STRONG, the target is stitched to the other target (save ends)') }),
];
const CL_11 = () => [
  cl(11, 'Doubt', 'You tug at the strings of the foe’s anima and unravel them, allowing someone else to take advantage of their drive.', 'This ability gains an edge against a target with a soul (see *Draw Steel: Monsters*). After you make the power roll, you or one ally within distance have a double edge on the next power roll you make before the end of the encounter.', { strained: 'You feel dispirited until you finish a respite. If you obtain a tier 3 outcome on the power roll, you and the target each have damage weakness 5 (save ends).', target: 'One creature or object', keywords:['Psionic','Ranged','Strike','Animapathy'], powerRoll:'Presence', tiers:tr('10 + P damage; P < WEAK, weakened (save ends)','14 + P damage; P < AVERAGE, weakened (save ends)','20 + P damage; P < STRONG, weakened and slowed (save ends)') }),
  cl(11, 'Mindwipe', 'You attempt to make them forget all their training.', 'The target can’t communicate with anyone until the end of the encounter.', { strained: 'You take 3d6 damage.', keywords:['Melee','Psionic','Strike','Telepathy'], distance:'Melee 2', powerRoll:'Reason', tiers:tr('12 + R damage; R < WEAK, the target takes a bane on their next power roll','17 + R damage; R < AVERAGE, the target takes a bane on power rolls (save ends)','23 + R damage; R < STRONG, the target has a double bane on power rolls (save ends)') }),
  cl(11, 'Rejuvenate', 'You reshape the flow of time in the target’s body to return it to an earlier state.', 'Choose two of the following effects:\n\n- The target can spend any number of Recoveries.\n- The target gains 1 of their Heroic Resource, and can end any effects on them that are ended by a saving throw or that end at the end of their turn.\n- The target gains 2 surges, and gains a +3 bonus to speed until the end of the encounter.', { strained: 'You and the target both permanently grow visibly younger (the equivalent of 20 human years, to the minimum of an 18-year-old). Additionally, you are weakened and slowed (save ends).', type: 'Maneuver', keywords:['Psionic','Ranged','Chronopathy'], target:'Self or one ally' }),
  cl(11, 'Steel', 'The target’s skin becomes covered in tough metal.', 'The target has damage immunity 5 and can’t be made slowed or weakened until the start of your next turn. Whenever the target force moves a creature or object while under this effect, the forced movement distance gains a +5 bonus.', { strained: 'You can’t use maneuvers (save ends).', type: 'Maneuver', keywords:['Psionic','Ranged','Metamorphosis'], target:'Self or one ally' }),
];

const TRAD_FEAT_2 = {
  chronopathy: [{ name: 'Ease the Hours', text: 'You can increase the number of rounds in a montage test by 1 if the test would end before the heroes hit the success limit.' }],
  telekinesis: [{ name: 'Ease Their Fall', text: 'Whenever you land after a fall, or if any falling creature lands within 2 squares of you, you can use a free triggered action to reduce the falling damage by an amount equal to 2 + your Reason score.' }],
  telepathy: [{ name: 'Ease the Mind', text: 'You gain an edge on tests made to stop combat and start a negotiation. Additionally, if you are present during a negotiation, any NPC who has a hostile or suspicious starting attitude has their patience increased by 1 (to a maximum of 5).' }],
};
const TRAD_FEAT_5 = {
  chronopathy: [
    { name: 'Distortion Temporal', text: 'While you are not dying, time behaves irregularly around you in a 3 aura. That area is difficult terrain for enemies. Additionally, when an ally enters the area for the first time in a combat round or starts their turn there, they gain a +2 bonus to speed until the end of the turn.' },
    { name: 'Speed of Thought', text: 'Once per combat round while you are not dying, you can spend 2 clarity when you use a triggered action to turn it into a free triggered action.' },
  ],
  telekinesis: [
    { name: 'Kinetic Amplifier', text: 'Whenever you force move a creature, you can spend up to 2 surges. For each surge spent, the forced movement distance gains a bonus equal to your Reason score.' },
    { name: 'Triangulate', text: 'Whenever an ally uses a ranged ability while you are within the ability\'s distance, you can spend 1 clarity as a free triggered action to allow them to use the ability as if they were in your space.' },
  ],
  telepathy: [
    { name: 'Compulsion', text: 'Whenever you obtain a success on a test using a skill from the interpersonal skill group while interacting with an NPC, you can ask them a question using your Telepathic Speech feature. The NPC must answer the question truthfully to the best of their ability.' },
    { name: 'Remote Amplification', text: 'The distance of your ranged psionic abilities increases by 5. Additionally, the range of your Telepathic Speech feature increases to 1 mile.' },
  ],
};
const TRAD_FEAT_8 = {
  chronopathy: [
    { name: 'Doubling the Hours', text: 'While you have 5 or more Victories, you can undertake an additional respite activity during a respite.' },
  ],
  telekinesis: [
    { name: 'Low Gravity', text: 'Your mind can carry your body through tough times. You ignore difficult terrain and don\'t need to spend additional movement while prone.' },
  ],
  telepathy: [
    { name: 'Mindlink', text: 'During a respite, you can choose a number of creatures up to your Reason score who you have communicated with using your Telepathic Speech feature, creating a telepathic link among all of you. Whenever a linked creature spends one or more Recoveries, each other linked creature can spend a Recovery.' },
    { name: 'Universal Connection', text: 'The range of your Telepathic Speech feature increases to anywhere on the same world.' },
  ],
};
const TRAD_ABILITY_AUTO_8 = {
  chronopathy: [
    { name: 'Stasis Shield', cost: 3, resource: 'Clarity',
      flavor: 'You freeze time just long enough to bring the victim to safety!',
      keywords: ['Psionic', 'Ranged'], type: 'Triggered', distance: 'Ranged 10', target: 'Self, or one creature or object',
      trigger: 'The target takes damage.',
      effect: 'The target is teleported to an unoccupied space adjacent to you, taking no damage and suffering no additional effects if this movement would get them out of harm\'s way.',
      strained: 'You can\u2019t target yourself, and you take the damage and any additional effects instead of the target.' },
  ],
  telekinesis: [
    { name: 'Levitation Field', noBadge: true,
      flavor: 'You manipulate the air around your allies so they can move as freely through the sky as you can.',
      keywords: ['Area', 'Psionic'], type: 'Maneuver', distance: '3 burst', target: 'Each ally in the area',
      effect: 'Each target can fly until the start of your next turn, and can immediately shift up to their speed. You can also shift up to your speed. While flying, a target\'s stability is reduced to 0 and can\'t be increased.',
      spendCost: 5, spend: 'The effects last for 1 hour instead.' },
  ],
};
const TRAD_ABILITY_2 = {
  chronopathy: [
    cl(5, 'Applied Chronometrics', 'Time slows down around you. Your heartbeat is the only gauge of the extra moments you’ve gained.', 'Until the start of your next turn, each target gains a +5 bonus to speed, they can’t be made dazed, and they can use an additional maneuver on their turn. If a target is already dazed, that condition ends for them.', { strained: 'Your speed is halved until the end of the encounter.', keywords: ['Psionic','Ranged','Chronopathy'], type:'Maneuver', target:'Special', powerRoll:'Presence', tiers:tr('You target two creatures, one of which can be you.','You target three creatures, one of which can be you.','You target four creatures, one of which can be you.') }),
    cl(5, 'Slow', 'Perhaps they wonder why everyone else is moving so quickly?', 'A target can’t use triggered actions while their speed is reduced this way.', { strained: 'The potency of this ability increases by 1 and you take 1d6 damage. At the start of each combat round while any target is affected by this ability, you take 1d6 damage. You can end the effect on all affected targets at any time (no action required).', keywords: ['Psionic','Ranged','Chronopathy'], type:'Maneuver', target:'Three creatures or objects', powerRoll:'Presence', tiers:tr('The target’s speed is halved (save ends), or if P < WEAK, the target is slowed (save ends).','The target is slowed (save ends), or if P < AVERAGE, the target’s speed is 0 (save ends).','The target is slowed (save ends), or if P < STRONG, the target\'s speed is 0 (save ends).') }),
  ],
  telekinesis: [
    cl(5, 'Gravitic Burst', 'Everyone get away from me!', null, { strained: 'The size of the burst increases by 1, and you are weakened until the end of your turn.', keywords:['Area','Psionic','Telekinesis'], distance:'1 burst', target:'Each enemy in the area', powerRoll:'Reason', tiers:tr('3 damage; vertical push 2','6 damage; vertical push 4','9 damage; vertical push 6') }),
    cl(5, 'Levity and Gravity', 'You raise the target slightly into the air, then smother them against the ground.', null, { strained: 'You take half the damage the target takes.', target: 'One creature or object', keywords:['Psionic','Ranged','Strike','Telekinesis'], powerRoll:'Reason', tiers:tr('6 + R damage; M < WEAK, prone','10 + R damage; M < AVERAGE, prone','14 + R damage; M < STRONG, prone and can\'t stand (save ends)') }),
  ],
  telepathy: [
    cl(5, 'Overwhelm', 'You overload their senses, turning all their subconscious thoughts into conscious ones.', null, { strained: 'You start crying, and you can’t use triggered actions or make free strikes until the end of the target’s next turn.', keywords:['Psionic','Ranged','Strike','Telepathy'], powerRoll:'Reason', tiers:tr('6 + R psychic damage; I < WEAK, slowed (save ends)','10 + R psychic damage; I < AVERAGE, weakened (save ends)','14 + R psychic damage; I < STRONG, dazed (save ends)') }),
    cl(5, 'Synaptic Override', 'You control an enemy’s nervous system. How pleasant for them.', 'You control the target’s movement. The target can’t be moved in a way that would harm them (such as over a cliff), leave them dying, or result in them suffering a condition or other negative effect. However, you can move them to provoke opportunity attacks.', { strained: 'You take 1d6 damage and are weakened until the end of your turn.', type:'Main action', keywords:['Psionic','Ranged','Telepathy'], target:'One enemy', powerRoll:'Reason', tiers:tr('The target makes a free strike against one enemy of your choice.','The target shifts up to their speed and uses their signature ability against any enemies of your choice.','The target moves up to their speed and uses their signature ability against any enemies of your choice.') }),
  ],
};
const TRAD_ABILITY_6 = {
  chronopathy: [
    cl(9, 'Fate', 'Your foe gets a glimpse of how it will end for them.', 'The target has damage weakness 5 until the end of your next turn. Whenever the target takes damage while they have this weakness, they are knocked prone.', { strained: 'This ability gains the Strike keyword as the vision hurts the target’s psyche. You make a power roll, then are weakened (save ends).', tiers: [['≤11','8 + P psychic damage'],['12–16','13 + P psychic damage'],['17+','17 + P psychic damage']], keywords:['Melee','Psionic','Chronopathy'], distance:'Melee 2', target:'One enemy' }),
    cl(9, 'Stasis Field', 'Keep everything as it was. Ignore everything that will be.', 'The area is frozen in time until the start of your next turn. Each object in the area is restrained and can\'t fall until the effect ends. Until the effect ends, creatures in the area who are reduced to 0 Stamina or would die stay alive, and objects in the area that are reduced to 0 Stamina remain undestroyed.', { strained: 'Any creature or object force moved in the area takes 2 corruption damage for each square of the area they enter. Creatures and objects restrained in the area can be force moved. You are restrained until the effect ends.', keywords:['Area','Psionic','Ranged','Chronopathy'], distance:'4 cube within 10', target:'Each creature and object in the area', powerRoll:'Presence', tiers:tr('P < WEAK, the target is slowed until the effect ends','P < AVERAGE, the target’s speed is 0 until the effect ends','P < STRONG, the target is restrained until the effect ends') }),
  ],
  telekinesis: [
    cl(9, 'Gravitic Well', 'You bend gravity into a fine point and pull your foes toward it.', 'Targets closest to the center of the area are pulled first.', { strained: 'The size of the area increases by 2. You also target yourself and each ally within distance.', keywords:['Area','Psionic','Ranged','Telekinesis'], distance:'4 cube within 10', target:'Each creature and object in the area', powerRoll:'Reason', tiers:tr('6 damage; vertical pull 5 toward the center of the area','9 damage; vertical pull 7 toward the center of the area','13 damage; vertical pull 10 toward the center of the area') }),
    cl(9, 'Greater Kinetic Grip', 'You raise the target into the air without breaking a sweat.', '', { strained: 'The forced movement ignores stability. You take 2d6 damage and are weakened (save ends).', keywords:['Psionic','Ranged','Strike','Telekinesis'], target:'One creature or object', powerRoll:'Reason', tiers:tr('Slide 4 + R; M < WEAK, the forced movement is vertical','Slide 8 + R; M < AVERAGE, the forced movement is vertical','Slide 12 + R; prone; M < STRONG, the forced movement is vertical') }),
  ],
  telepathy: [
    cl(9, 'Synaptic Conditioning', 'It’s a subtle mindset shift. It’s not that they’re your enemy—you just don’t like them!', '', { strained: 'While the target is under this effect, you no longer consider your enemies to be your enemies when using your abilities and features.', keywords:['Melee','Psionic','Strike','Telepathy'], distance:'Melee 2', powerRoll:'Reason', tiers:tr('10 psychic damage; the target takes a bane on ability rolls made to harm you or your allies (save ends)','14 psychic damage; the target has a double bane on ability rolls made to harm you or your allies (save ends)','20 psychic damage; the target considers you and your allies to be their allies when using abilities and features (save ends)') }),
    cl(9, 'Synaptic Dissipation', 'You manipulate your enemies’ minds and make them wonder if you were ever really there in the first place.', 'You target a number of creatures with this ability determined by the outcome of your power roll. You and your allies are invisible to each target until the start of your next turn.', { strained: 'The effect ends early if you take damage from an enemy’s ability.', type:'Maneuver', keywords:['Psionic','Ranged','Strike','Telepathy'], target:'Special', powerRoll:'Reason', tiers:tr('Two creatures','Three creatures','Five creatures') }),
  ],
};
const TRAD_ABILITY_9 = {
  chronopathy: [
    cl(11, 'Acceleration Field', 'You forcibly stuff more moments into a critical point in time, knowing full well you might need to steal some of your own.', 'Each target can use any main action available to them as a free triggered action, but they lose their main action on their next turn.', { strained: 'Make a power roll that targets you and each enemy within distance.', tiers: [['≤11','4 corruption damage; slowed (save ends)'],['12–16','6 corruption damage; slowed (save ends)'],['17+','10 corruption damage; slowed (save ends)']], keywords:['Psionic','Ranged','Chronopathy'], distance:'Ranged 5', target:'Three allies' }),
    cl(11, 'Borrow From the Future', 'You lean on future heroism to assist you in the now.', 'The targets share 6 of their Heroic Resource among themselves, as you determine. A target can’t gain more than 3 of their Heroic Resource this way. After using this ability, you can’t gain any clarity until the end of the next combat round.', { type:'Maneuver', keywords:['Area','Psionic','Chronopathy'], distance:'2 burst', target:'Each ally in the area' }),
  ],
  telekinesis: [
    cl(11, 'Fulcrum', 'You precisely manipulate the creatures around you.', 'Make a power roll to determine the area of this ability. Each target is vertical pushed 6 squares. You can target only objects of size 1L or smaller.', { strained: 'You can choose to reduce the size of the burst by 2 (to a minimum of 1 burst) to give the forced movement distance a +2 bonus. You take half the total damage all targets take from forced movement.', keywords:['Area','Psionic','Telekinesis'], distance:'Special', target:'Each enemy and object in the area', powerRoll:'Reason', tiers:tr('2 burst','3 burst','4 burst') }),
    cl(11, 'Gravitic Nova', 'Unbridled psionic energy erupts from your body and flashes outward, hurling your foes back.', 'On a critical hit, the size of the area increases by 3, and this ability deals an extra 10 damage.', { strained: 'You are weakened (save ends). If you scored a critical hit with this ability, you die.', keywords:['Area','Psionic','Telekinesis'], distance:'3 burst', target:'Each enemy and object in the area', powerRoll:'Reason', tiers:tr('6 damage; push 7','9 damage; push 10','13 damage; push 15') }),
  ],
  telepathy: [
    cl(11, 'Resonant Mind Spike', 'You fire a telepathic bolt empowered by every consciousness within reach directly into your foe’s mind.', 'This ability ignores cover and concealment.', { strained: 'The ability roll scores a critical hit on a natural 17 or higher. You take half the damage the target takes, and you can’t reduce this damage in any way.', keywords:['Psionic','Ranged','Strike','Telepathy'], powerRoll:'Reason', tiers:tr('15 + R psychic damage','24 + R psychic damage','28 + R psychic damage') }),
    cl(11, 'Synaptic Terror', 'You project a terrifying image into the brains of your foes, and their fear psionically invigorates your allies.', 'You and each target ally can\'t obtain lower than a tier 2 outcome on power rolls until the start of your next turn. Each target enemy is affected by the ability\'s power roll.', { strained: 'You can\'t use this ability if doing so would cause you to have negative clarity.', keywords:['Area','Psionic','Telepathy'], distance:'3 burst', target:'Each ally and enemy in the area', powerRoll:'Reason', tiers:tr('R < WEAK, frightened (save ends)','R < AVERAGE, frightened (save ends)','R < STRONG, frightened (save ends)') }),
  ],
};

export const talent = {
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
      { name: 'Scan', text: 'You can extend your psionic senses beyond their usual range. Once on each of your turns, you can search for hidden creatures as a free maneuver (see Hide and Sneak in Chapter 9: Tests). Additionally, once you establish line of effect to a thinking creature within distance of your Mind Spike ability, you always have line of effect to that creature until they move beyond that distance.' },
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
      { name: 'Mind Recovery', text: 'Whenever you spend a Recovery to regain Stamina while strained, you can forgo the Stamina and gain 3 clarity instead.\n\nAdditionally, the first time each combat round that a creature is force moved, you gain 2 clarity instead of 1.' },
      { name: 'Suspensor Field', text: 'You can fly. While flying, your stability is reduced to 0 and can\'t be increased. If you can already fly, you have a +2 bonus to speed while flying instead.\n\nIf you are strained while flying and are force moved, the forced movement distance gains a +2 bonus.' },
    ],
    autoAbilities: () => [
      { name: 'Mind Projection', noBadge: true,
        flavor: 'Your consciousness slips free and drifts where your body cannot.',
        keywords: ['Psionic'], type: 'Maneuver', distance: 'Self', target: 'Self',
        effect: 'As a maneuver, you project your mind outside your body. While you are in this state, your body remains unconscious and prone, and your mind is a separate entity with size 1T. Your mind automatically has concealment, and can freely move through solid matter. If you end your turn inside solid matter, you are forced out into the space where you entered it.\n\nAny abilities or features you use originate from your mind. Both your mind and your body can take damage while separated, with any such damage applied to your Stamina. Your mind is instantly forced back into your body if you take any damage, and you can immediately return to your body as a free maneuver.' },
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
      { name: 'Psi Boost',
        text: 'Whenever you use an ability that is a main action or a maneuver with the Psionic keyword, you can spend additional discipline to apply a psi boost to it and enhance its effects. A psi boost\'s effects only last until the end of the turn which the ability is first used. You can apply multiple psi boosts to an ability, but only one instance of each specific boost. You can use the following psi boosts.',
        table: { head: ['Psi Boost', 'Effect'], rows: [
          ['Dynamic Power (1 Clarity)', 'If the ability force moves a target, the forced movement distance gains a bonus equal to your Reason score.'],
          ['Expanded Power (3 Clarity)', 'If the ability targets an area, you increase the size of the area by 1. If the area is a line, you increase the size of one dimension, not both.'],
          ['Extended Power (1 Clarity)', 'If the ability is ranged, the distance gains a bonus equal to your Reason score. If the ability is melee, the distance gains a +2 bonus.'],
          ['Heightened Power (1 Clarity)', 'If the ability deals rolled damage, it deals extra damage equal to your Reason score.'],
          ['Magnified Power (5 Clarity)', 'If the ability has a potency, you increase that potency by an amount equal to your Reason score.'],
          ['Shared Power (5 Clarity)', 'If the ability targets individual creatures or objects, you target one additional creature or object within distance.'],
          ['Sharpened Power (1 Clarity)', 'If the ability has any power roll, that roll gains an edge.'],
        ] } },
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
      { name: 'Characteristic Increase', text: 'Each of your characteristic scores increases by 1, to a maximum of 4.' },
      { name: 'Ancestral Memory', text: 'Each time you finish a respite, you can choose a number of skills you have up to your Reason score and replace them with an equal number of skills from the interpersonal and lore skill groups. These replacements last until the end of your next respite.' },
      { name: 'Cascading Strain', text: 'Whenever you take damage from a strained effect or from having negative clarity, you can choose one enemy within distance of your Mind Spike ability to take the same damage.' },
      { name: 'Lucid Mind', text: 'At the start of each of your turns during combat, you gain 1d3 + 1 clarity instead of 1d3.' },
    ],
    choices: [
      { id: 'skill-7', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
  8: {
    summary: 'Your tradition reveals two of its deepest secrets.',
    staminaGain: 6,
    autoFeatures: ({ sub }) => TRAD_FEAT_8[sub] || [],
    autoAbilities: ({ sub }) => TRAD_ABILITY_AUTO_8[sub] || [],
    choices: [
      { id: 'perk-8', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'clarity-11', label: '11-Clarity Ability', help: 'Choose one heroic ability that costs 11 clarity.', kind: 'ability', options: CL_11 },
    ],
  },
  9: {
    summary: 'Your mind becomes an impenetrable fortress.',
    staminaGain: 6,
    autoFeatures: () => [
      { name: 'Fortress of Perfect Thought', text: 'Your mind is an impenetrable palace that shields you from danger. You gain the following effects:\n\n- You can breathe even when there is no breathable air.\n- You have psychic immunity 10.\n- Creatures can\'t read your thoughts unless you allow them to.\n- Your Reason and Intuition are treated as 2 higher for the purpose of resisting the potency of abilities.\n- You can\'t be made taunted or frightened.' },
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
      { name: 'Clear Mind', text: 'The first time each combat round that a creature is force moved, you gain 3 clarity instead of 2.' },
      { name: 'Omnisensory', text: 'You have a +10 bonus to the distance of your ranged abilities. Additionally, you don\'t need line of effect to a target of a ranged ability if the target is a creature capable of thought who you have previously had line of effect to.' },
      { name: 'Psion', text: 'At the start of each of your turns during combat, you gain 1d3 + 2 clarity instead of 1d3 + 1.\n\nAdditionally, you can choose to not take damage from having negative clarity. You can also choose to take on any ability\'s strained effect even if you\'re not strained.' },
      { name: 'Vision', text: 'You have an epic resource called vision. Each time you finish a respite, you gain vision equal to the XP you gain. You can spend vision on your abilities as if it were clarity.\n\nAdditionally, you can spend vision to use one additional psionic ability on your turn, provided you pay the entire cost of the ability in vision. If you choose to use a psionic ability that usually costs no clarity, you must spend 1 vision to use it.\n\nVision remains until you spend it.' },
    ],
    choices: [
      { id: 'perk-10', label: 'Perk', help: 'Choose one interpersonal, lore, or supernatural perk.', kind: 'perk', options: PERK_ILS },
      { id: 'skill-10', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
};
