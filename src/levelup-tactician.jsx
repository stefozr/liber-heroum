// levelup-tactician.jsx — Tactician level-up data (levels 2–10).
// Doctrines: Insurgent / Mastermind / Vanguard · Resource: Focus · staminaPer 9.

const PERK_EII = [
  { id: 'exploration',  name: 'Exploration Perk',  body: 'A boon for the wilds and the road.' },
  { id: 'interpersonal',name: 'Interpersonal Perk',body: 'A boon for the table and the court.' },
  { id: 'intrigue',     name: 'Intrigue Perk',     body: 'A boon for the shadows and the con.' },
];
const PERK_ANY = ['crafting','exploration','interpersonal','intrigue','lore','supernatural'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Perk', body: '' }));
const SKILL_ANY = ['crafting','exploration','interpersonal','intrigue','lore'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Skill', body: '' }));
const t = (t1, t2, t3) => [['\u2264 11', t1], ['12\u201316', t2], ['17+', t3]];
const foc = (n, name, flavor, effect, extra) => ({ name, cost: n, resource: 'Focus', flavor, type: 'Main action', keywords: ['Ranged'], distance: 'Ranged 10', target: 'One ally', effect, ...extra });

const FOC_7 = () => [
  foc(7, 'Frontal Assault', 'The purpose of a charge is to break their morale and force a retreat.', 'Until the end of the encounter or you are dying, whenever you or any ally deals damage a target marked by you, the damage dealer can push the target up to 2 squares, then shift up to 2 squares. Additionally, any ally using the Charge action to attack a target marked by you can use a signature or heroic ability in place of a melee free strike.', { type:'Maneuver', keywords:['\u2014'], distance:'Self', target:'Self' }),
  foc(7, 'Hit \u2019Em Hard!', 'Your allies see the advantages in attacking the targets you select.', 'Until the end of the encounter or until you are dying, whenever you or any ally deals damage to a target marked by you, that creature gains 2 surges, which they can use immediately.', { type:'Maneuver', keywords:['\u2014'], distance:'Self', target:'Self' }),
  foc(7, 'Rout', 'The tide begins to turn.', 'Until the end of the encounter or until you are dying, whenever you or any ally deals damage to a target marked by you who has R < [Average], the target is frightened (save ends) of the creature who dealt the damage.', { type:'Maneuver', keywords:['\u2014'], distance:'Self', target:'Self' }),
  foc(7, 'Stay Strong and Focus!', 'We can do this! Keep faith and hold fast!', 'Until the end of the encounter or until you are dying, whenever you or any ally deals damage to a target marked by you, the creature who dealt the damage can spend a Recovery.', { type:'Maneuver', keywords:['\u2014'], distance:'Self', target:'Self' }),
];
const FOC_9 = () => [
  foc(9, 'Squad! Gear Check!', 'You distract a foe while your allies secure their defensive gear.', 'You and each ally adjacent to the target gain 10 temporary Stamina.', { tiers: [['≤11','9 + M damage'],['12–16','13 + M damage'],['17+','18 + M damage']], keywords: ['Melee','Strike','Weapon'], distance: 'Melee 1', type:'Main action', target:'One enemy' }),
  foc(9, 'Squad! Remember Your Training!', 'You remind your allies how to best use their gear.', 'Each target gains 1 surge and can use a signature ability that has a double edge.', { target:'Self and one ally' }),
  foc(9, 'Win This Day!', 'You inspire your allies to recover and gather their strength.', 'Each target gains 2 surges. Additionally, they can spend a Recovery, remove any conditions or effects on them, and stand up if they are prone.', { keywords: ['Area'], distance: '3 burst', target:'Self and each ally in the area' }),
  foc(9, 'You\u2019ve Still Got Something Left', 'You push an ally to use a heroic ability sooner than they otherwise would.', 'The target uses a heroic ability with the Strike keyword as a free triggered action, and deals extra damage with that ability equal to your Reason score. The ability has its Heroic Resource cost reduced by 1 + your Reason score (minimum cost 0).', { target:'One ally' }),
];
const FOC_11 = () => [
  foc(11, 'Go Now and Speed Well', 'You direct an attack to strike true.', 'The target gains 2 surges and can use a signature or heroic ability as a free triggered action. The ability has a double edge on the power roll, ignores damage immunity, and increases the potency of any potency effects by 1.', { target:'Self or one ally' }),
  foc(11, 'Finish Them!', 'You point out an opening to your ally so they can land a killing blow.', 'The target is killed. Additionally, the creature who caused the target to be winded can spend a Recovery.', { type:'Free triggered action', trigger:'The target is not a leader or solo creature, and becomes winded.', target:'One creature' }),
  foc(11, 'Floodgates Open', 'You direct your squad to strike in unison and with devastating effect.', 'Each target gains 1 surge and can use a signature ability as a free triggered action. That ability gains an edge on the power roll and increases the potency of any potency effects by 1.', { target:'Three allies' }),
  foc(11, 'I\u2019ll Open and You\u2019ll Close', 'You create an opening for an ally.', 'One ally within 10 squares of you can use a heroic ability against the target as a free triggered action without spending any of their Heroic Resource, as long as they have enough Heroic Resource to pay for the ability. If the target is reduced to 0 Stamina before the chosen ally has used their ability, the ally can pick a different target.', { keywords:['Melee','Ranged','Strike','Weapon'], type:'Main action', distance:'Melee 1 or ranged 5', target:'One creature', powerRoll:'Might', tiers:t('6 + M damage','10 + M damage','14 + M damage') }),
];

const DOCTRINE_FEAT_2 = {
  insurgent: [{ name: 'Infiltration Tactics', text: 'Whenever you or an ally within 10 squares becomes hidden, that creature gains 1 surge.' }],
  mastermind: [{ name: 'Goaded', text: 'When a creature marked by you uses a strike targeting you or an ally within 10 squares, you goad it into acting early — gaining a tactical mark benefit.' }],
  vanguard: [{ name: 'Melee Superiority', text: 'When you make an opportunity attack, the target\u2019s speed is reduced. Mark Benefit: when a marked creature tries to move within your melee free-strike distance, spend 2 focus to free-strike it first.' }],
};
const DOCTRINE_FEAT_5 = {
  insurgent: [
    { name: 'Distracted', text: 'When you or an ally tries to hide, marked creatures don\u2019t count as observing them.' },
    { name: 'Leave No Trace', text: 'You and allies within 10 squares move at full speed while sneaking; enemies within 10 take a bane to search for any of you while hidden.' },
  ],
  mastermind: [
    { name: 'Anticipation', text: 'You can target two creatures with your Mark ability.' },
    { name: 'I Predicted That', text: 'You and any ally within 10 squares gain an edge on Reason tests.' },
  ],
  vanguard: [
    { name: 'Shake It Off', text: 'Free maneuver: spend 1d6 Stamina to ignore a test consequence or end a save-ends/end-of-turn effect on you; an adjacent ally gains this too.' },
    { name: 'Tactical Offensive', text: 'When you Charge a marked creature, you can use a Melee Strike signature or heroic ability instead of a melee free strike.' },
  ],
};
const DOCTRINE_FEAT_7 = {
  insurgent: [{ name: 'Asymmetric Warfare', text: 'During a montage test or negotiation, gain one automatic success on an intrigue-skill test.' }],
  mastermind: [{ name: 'Grand Strategy', text: 'During a montage test or negotiation, gain one automatic success on a lore-skill test.' }],
  vanguard: [{ name: 'Shock and Awe', text: 'During a montage test or negotiation, gain one automatic success on an interpersonal-skill test, and you can rally helpers for an extra crafting project roll on a respite.' }],
};
const DOCTRINE_FEAT_8 = {
  insurgent: [{ name: 'Bait and Ambush', text: 'Mark Benefit: spend 2 focus when striking a marked creature to let the striker shift up to your Reason and Hide once during the shift.' }],
  mastermind: [{ name: 'Pincer Movement', text: 'Mark Benefit: spend 2 focus when striking a marked creature to shift the striker up to your Reason first; if you didn\u2019t strike, an ally may shift too.' }],
  vanguard: [{ name: 'See Your Enemies Driven Before You', text: 'Mark Benefit: spend 2 focus on a melee strike vs a marked creature to push it up to your Reason, then the striker shifts up to your Reason ending adjacent.' }],
};
const DOCTRINE_ABILITY_2 = {
  insurgent: [
    foc(5, 'Fog of War', 'Your unorthodox strategy causes enemies to lash out in fear, heedless of who they might be attacking.', 'Each target is marked by you, and must immediately make a free strike against a creature of your choice within 5 squares of them.\n\n**Mark Benefit:** Until the end of the encounter, whenever you or any ally makes a strike against a creature marked by you, you can spend 2 focus to force that target to make a free strike against a creature of your choice within 5 squares of them.', { target: 'Two creatures', type:'Maneuver' }),
    foc(5, 'Try Me Instead', 'Try picking on someone my size.', 'You shift up to your speed directly toward an ally, ending adjacent to them, then swapping locations with that ally as long as you can fit into each other’s spaces. The ally can spend a Recovery, and you can make the following weapon strike with a distance of melee 1 against a creature.', { keywords:['Melee','Strike','Weapon'], distance:'Self', target:'Self', powerRoll:'Reason', tiers:t('2+R damage; R < WEAK, frightened (save ends)','3+R damage; R < AVERAGE, frightened (save ends)','4+R damage; R < STRONG, frightened (save ends)') }),
  ],
  mastermind: [
    foc(5, 'I\u2019ve Got Your Back', 'Your enemy will think twice about attacking your friend.', 'One ally adjacent to the target can spend a Recovery.', { keywords:['Ranged','Strike','Weapon'], distance:'Ranged 5', target:'One creature', powerRoll:'Reason', tiers:t('5+R damage; taunted (EoT)','9+R damage; taunted (EoT)','12+R damage; taunted (EoT)') }),
    foc(5, 'Targets of Opportunity', 'You point out easy targets to your friends, allowing them to include more enemies in their attacks.', 'Each target is marked by you, and you gain 2 surges.\n\n**Mark Benefit:** Until the end of the encounter, whenever you or any ally makes a strike against a creature marked by you, you can spend 2 focus to add one additional target to the strike.', { type:'Maneuver', distance:'Ranged 5', target:'Two creatures' }),
  ],
  vanguard: [
    foc(5, 'No Dying on My Watch', 'You prioritize saving an ally over your own safety.', 'You move up to your speed toward the triggering ally, ending this movement adjacent to them or in the nearest square if you can’t reach an adjacent square. The triggering ally can spend a Recovery and gains 5 temporary Stamina for each enemy you came adjacent to during the move. You then make a power roll against the target.', { tiers: [['≤11','R < WEAK, the target is frightened of the triggering ally (save ends)'],['12–16','R < AVERAGE, the target is frightened of the triggering ally (save ends)'],['17+','R < STRONG, the target is frightened of the triggering ally (save ends)']], distance: 'Ranged 5', type:'Triggered', keywords:['Ranged','Strike','Weapon'], target:'One enemy' }),
    foc(5, 'Squad! On Me!', 'Together we are invincible!', 'Until the start of your next turn, each target has a bonus to stability equal to your Might score . Additionally, each target gains 2 surges.', { keywords: ['Area'], distance: '1 burst', type:'Maneuver', target:'Self and each ally in the area' }),
  ],
};
const DOCTRINE_ABILITY_6 = {
  insurgent: [
    foc(9, 'Coordinated Execution', 'You direct your ally to make a killing blow.', 'If the target of the triggering ability is not a leader or solo creature, they are reduced to 0 Stamina. If the target of the triggering ability is a minion, the entire squad is killed. If the target of the triggering ability is a leader or solo creature, the triggering ability’s power roll automatically obtains a tier 3 outcome.', { type:'Free triggered action', trigger:'The target uses an ability to deal rolled damage to a creature while hidden.', target:'One ally' }),
    foc(9, 'Panic in Their Lines', 'You confuse your foes, causing them to turn on each other.', 'If a target is force moved into another creature, they must make a free strike against that creature.', { tiers: [['≤11','6 + M damage; slide 1'],['12–16','9 + M damage; slide 3'],['17+','13 + M damage; slide 5']], distance: 'Melee 1 or ranged 5', type:'Main action', keywords:['Melee','Ranged','Strike','Weapon'], target:'Two creatures', powerRoll:'Might' }),
  ],
  mastermind: [
    foc(9, 'Battle Plan', 'With new understanding of your foes, you create the perfect plan to win the battle.', 'Each target is marked by you. Immediately and until the end of the encounter, the Director tells you if any creatures marked by you have damage immunity or weakness and the value of that immunity or weakness. Additionally, you and each ally within 3 squares of you gain 2 surges.\n\n**Mark Benefit**: Until the end of the encounter, whenever you or any ally makes a strike against a creature marked by you, you can spend 2 focus to make the strike ignore damage immunity and deal extra damage equal to three times your Reason score.', { target: 'Three creatures', type:'Maneuver' }),
    foc(9, 'Hustle!', 'You and your allies coordinate to form a new battle line.', 'You mark two enemies within 10 squares of you. Each target can shift up to their speed. You and each target gain 2 surges.', { keywords: ['Area'], distance: '2 burst', type:'Maneuver', target:'Self and each ally in the area' }),
  ],
  vanguard: [
    foc(9, 'Instant Retaliation', 'You parry with almost supernatural speed.', 'The target takes half the damage. You then make a power roll against the triggering creature.', { type:'Free triggered action', trigger:'A creature deals damage to the target.', keywords:['Melee','Weapon'], distance:'Melee 1', target:'One ally', powerRoll:'Might', tiers:t('A < WEAK, dazed (save ends)','M < AVERAGE, dazed (save ends)','A<STRONG dazed (save)') }),
    foc(9, 'To Me Squad!', 'You lead your allies in a charge.', 'If the target is hit with two or more strikes as part of this ability and they have R < STRONG , they are dazed (save ends). If the target is reduced to 0 Stamina before one or both allies has made their strike, the ally or allies can pick a different target.', { tiers: [['≤11','6 + M damage; one ally within 10 squares can use the Charge main action as a free triggered action, and can use a melee strike signature ability instead of a free strike for the charge'],['12–16','9 + M damage; one ally within 10 squares can use the Charge main action as a free triggered action, and can use a melee strike signature ability that gains an edge instead of a free strike for the charge'],['17+','13 + M damage; two allies within 10 squares can use the Charge main action as a free triggered action, and can each use a melee strike signature ability that gains an edge instead of a free strike for the charge']], keywords: ['Charge','Melee','Strike','Weapon'], distance: 'Melee 1', type:'Main action', target:'One creature' }),
  ],
};
const DOCTRINE_ABILITY_9 = {
  insurgent: [
    foc(11, 'Squad! Hit and Run!', 'I had to pry this secret from the shadow colleges.', 'Each target gains 2 surges, and can use a free triggered action to use a signature ability that gains an edge. After resolving their ability, each target can shift up to 2 squares and become hidden even if they have no cover or concealment, or if they are observed.', { type:'Main action', target:'Self and one ally' }),
    foc(11, 'Their Lack of Focus Is Their Undoing', 'You trick your enemies into attacking each other and leave them confused by the aftermath.', 'Each target uses a signature ability against one or more targets of your choosing, with each ability automatically obtaining a tier 3 outcome on the power roll. After resolving the targets’ abilities, you make a power roll against each original target.', { type:'Main action', keywords:['Magic','Ranged','Weapon'], target:'Three enemies', powerRoll:'Might', tiers:t('R < WEAK, dazed (save ends)','R<AVERAGE dazed (save)','R<STRONG dazed (save)') }),
  ],
  mastermind: [
    foc(11, 'Blot Out the Sun!', 'What makes a good soldier? The ability to fire four shots a minute in any weather.', 'Each target can make a ranged free strike that gains an edge against any enemy marked by you within distance of their ranged free strike. A target ignores banes and double banes when making this strike.', { type:'Main action', keywords:['Area'], distance:'3 burst', target:'Self and each ally in the area' }),
    foc(11, 'Counterstrategy', 'I’ve identified a way to negate their strengths.', 'You gain 6 surges. Until the end of the encounter or until you are dying, whenever the Director spends Malice, choose yourself or one ally within 10 squares. The chosen character gains 2 of their Heroic Resource.', { type:'Main action', keywords:['\u2014'], distance:'Self', target:'Self' }),
  ],
  vanguard: [
    foc(11, 'No Escape', 'Nothing will stop you from reaching your foe.', 'If you use this ability as part of the Charge main action, enemies’ spaces don’t count as difficult terrain for your movement.\n\nAdditionally, if you move through any creature’s space, you can slide that creature 1 square out of the path of your charge.', { keywords:['Charge','Melee','Strike','Weapon'], type:'Main action', distance:'Melee 1', target:'One creature', powerRoll:'Might', tiers:t('11 + M damage','16 + M damage','21 + M damage') }),
    foc(11, 'That One Is Mine!', 'You focus on making an enemy irrelevant.', 'The target is marked by you.\n\nUntil the end of the encounter or until you are dying, you can use a signature or heroic ability instead of a free strike against any target marked by you.', { keywords:['Melee','Ranged','Strike','Weapon'], type:'Main action', distance:'Melee 1 or ranged 5', target:'One creature', powerRoll:'Might', tiers:t('8 + M damage','13 + M damage','17 + M damage') }),
  ],
};

export const tactician = {
  2: {
    summary: 'Your doctrine sharpens, and your squad answers your command.',
    staminaGain: 9,
    autoFeatures: ({ sub }) => DOCTRINE_FEAT_2[sub] || [],
    choices: [
      { id: 'perk', label: 'Perk', help: 'Choose one exploration, interpersonal, or intrigue perk.', kind: 'perk', options: PERK_EII },
      { id: 'doctrine-ability-2', label: '2nd-Level Doctrine Ability', help: 'Your doctrine grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => DOCTRINE_ABILITY_2[sub] || [] },
    ],
  },
  3: {
    summary: 'You read the field before the first blow lands.',
    staminaGain: 9,
    autoFeatures: () => [
      { name: 'Out of Position', text: 'At the start of an encounter, free triggered action: use Mark on an enemy in line of effect (even if surprised), then slide it up to 3 squares (ignoring stability, never into harm).' },
    ],
    choices: [
      { id: 'focus-7', label: '7-Focus Ability', help: 'Choose one heroic ability that costs 7 focus.', kind: 'ability', options: FOC_7 },
    ],
  },
  4: {
    summary: 'Your eye for weakness feeds your focus, and your arsenal grows lethal.',
    staminaGain: 9,
    autoCharacteristicIncrease: { Might: 3, Reason: 3, max: true },
    autoFeatures: () => [
      { name: 'Characteristic Increase', text: 'Your Might and Reason scores each increase to 3.' },
      { name: 'Focus on Their Weakness', text: 'The first time each round you or an ally damages a marked target, you gain 2 focus instead of 1.' },
      { name: 'Improved Field Arsenal', text: 'When you use a kit signature ability or free strike with a kit weapon, you gain an edge.' },
    ],
    choices: [
      { id: 'perk-4', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'skill-4', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
  5: {
    summary: 'Your doctrine grants two new techniques.',
    staminaGain: 9,
    autoFeatures: ({ sub }) => DOCTRINE_FEAT_5[sub] || [],
    choices: [
      { id: 'focus-9', label: '9-Focus Ability', help: 'Choose one heroic ability that costs 9 focus.', kind: 'ability', options: FOC_9 },
    ],
  },
  6: {
    summary: 'You become a master of arms.',
    staminaGain: 9,
    autoFeatures: () => [
      { name: 'Master of Arms', text: 'When you use a kit signature ability or free strike with a kit weapon, you can negate a bane or reduce a double bane to a bane.' },
    ],
    choices: [
      { id: 'perk-6', label: 'Perk', help: 'Choose one exploration, interpersonal, or intrigue perk.', kind: 'perk', options: PERK_EII },
      { id: 'doctrine-ability-6', label: '6th-Level Doctrine Ability', help: 'Your doctrine grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => DOCTRINE_ABILITY_6[sub] || [] },
    ],
  },
  7: {
    summary: 'Focus floods you, and you seize the initiative every time.',
    staminaGain: 9,
    autoCharIncreaseAll: { delta: 1, max: 4 },
    autoFeatures: ({ sub }) => [
      { name: 'Characteristic Increase', text: 'Each characteristic score increases by 1, to a maximum of 4.' },
      { name: 'Heightened Focus', text: 'When you gain focus at the start of your turns in combat, you gain 3 instead of 2.' },
      { name: 'Seize the Initiative', text: 'If you\u2019re not surprised when combat begins, your side goes first (rolling as usual if an enemy also forces first turn).' },
    ].concat(DOCTRINE_FEAT_7[sub] || []),
    choices: [
      { id: 'skill-7', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
  8: {
    summary: 'Your doctrine entrusts you with its highest manoeuvre.',
    staminaGain: 9,
    autoFeatures: ({ sub }) => DOCTRINE_FEAT_8[sub] || [],
    choices: [
      { id: 'perk-8', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'focus-11', label: '11-Focus Ability', help: 'Choose one heroic ability that costs 11 focus.', kind: 'ability', options: FOC_11 },
    ],
  },
  9: {
    summary: 'You become a grandmaster of arms.',
    staminaGain: 9,
    autoFeatures: () => [
      { name: 'Grandmaster of Arms', text: 'When you use a kit signature ability or free strike with a kit weapon, you automatically obtain a tier 3 outcome (still rolling for a critical hit).' },
    ],
    choices: [
      { id: 'doctrine-ability-9', label: '9th-Level Doctrine Ability', help: 'Your doctrine grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => DOCTRINE_ABILITY_9[sub] || [] },
    ],
  },
  10: {
    summary: 'You become a warmaster — every battle bends to your command.',
    staminaGain: 9,
    autoCharacteristicIncrease: { Might: 5, Reason: 5, max: true },
    autoFeatures: () => [
      { name: 'Characteristic Increase', text: 'Your Might and Reason scores each increase to 5.' },
      { name: 'Command', text: 'You gain the epic resource command equal to the XP you earn each respite, spendable as focus. Spend 1 command to raise an ally\u2019s damage roll vs a marked target by a tier, or lower a marked enemy\u2019s roll by a tier. Command remains until spent.' },
      { name: 'True Focus', text: 'When you gain focus at the start of your turns in combat, you gain 4 instead of 3.' },
      { name: 'Warmaster', text: 'When you or an ally makes an ability roll against a marked target, roll three dice and keep the best two. Allies\u2019 heroic abilities targeting marked creatures cost 2 less Heroic Resource (min 1).' },
    ],
    choices: [
      { id: 'perk-10', label: 'Perk', help: 'Choose one exploration, interpersonal, or intrigue perk.', kind: 'perk', options: PERK_EII },
      { id: 'skill-10', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
};
