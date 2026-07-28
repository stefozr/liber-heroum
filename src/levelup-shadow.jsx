// levelup-shadow.jsx — Shadow level-up data (levels 2–10).
// Colleges: Black Ash / Caustic Alchemy / Harlequin Mask · Resource: Insight · staminaPer 6.

const PERK_EII = [
  { id: 'exploration',  name: 'Exploration Perk',  body: 'A boon for the wilds and the road.' },
  { id: 'interpersonal',name: 'Interpersonal Perk',body: 'A boon for the table and the court.' },
  { id: 'intrigue',     name: 'Intrigue Perk',     body: 'A boon for the shadows and the con.' },
];
const PERK_ANY = ['crafting','exploration','interpersonal','intrigue','lore','supernatural'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Perk', body: '' }));
const SKILL_ANY = ['crafting','exploration','interpersonal','intrigue','lore'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Skill', body: '' }));
const t = (t1, t2, t3) => [['\u2264 11', t1], ['12\u201316', t2], ['17+', t3]];
const ins = (n, name, flavor, effect, extra) => ({ name, cost: n, resource: 'Insight', flavor, type: 'Main action', keywords: ['Melee','Strike','Weapon'], distance: 'Melee 1', target: 'One creature', effect, ...extra });

// ── Shared insight abilities ──
const INS_7 = () => [
  ins(7, 'Dancer', 'You enter a flow state that makes you nearly impossible to pin down.', 'Until the end of the encounter, whenever an enemy moves or is force moved adjacent to you or damages you, you can take the Disengage move action as a free triggered action.', { type:'Maneuver', keywords:['—'], distance:'Self', target:'Self' }),
  ins(7, 'Misdirecting Strike', '“Why are you looking at ME?!”', 'The target is taunted by a willing ally within 5 squares of you until the end of the target’s next turn.', { keywords:['Melee','Ranged','Strike','Weapon'], distance:'Melee 1 or ranged 5', powerRoll:'Agility', tiers:t('9 + A damage','13 + A damage','18 + A damage','') }),
  ins(7, 'Pinning Shot', 'One missile—placed well and placed hard.', '', { keywords:['Ranged','Strike','Weapon'], distance:'Ranged 5', powerRoll:'Agility', tiers:t('8 + A damage; A < WEAK, restrained (save ends)','12 + A damage; A < AVERAGE, restrained (save ends)','16 + A damage; A < STRONG, restrained (save ends)') }),
  ins(7, 'Staggering Blow', 'There\u2019s no recovering from this.', '', { keywords:['Melee','Ranged','Strike','Weapon'], distance:'Melee 1 or ranged 5', powerRoll:'Agility', tiers:t('7 + A damage; M < WEAK, slowed (save ends)','11 + A damage; A < AVERAGE, prone and can\'t stand (save ends)','16 + A damage; A < STRONG, slowed (save ends)') }),
];
const INS_9 = () => [
  ins(9, 'Blackout', 'You cause a plume of shadow to erupt from your eyes and create a cloud of darkness.', 'A black cloud fills the area until the end of your next turn, granting you and your allies concealment against enemies. While you are in the area, whenever an enemy ends their turn in the area, you can use a free triggered action to shift to a new location within the area and make a free strike against them.', { keywords:['Area','Magic'], type:'Maneuver', distance:'3 burst', target:'Special' }),
  ins(9, 'Into the Shadows', 'You sweep your foe off their feet and plunge them into absolute darkness.', 'You and the target are removed from the encounter map until the start of your next turn. You reappear in the spaces you left or the nearest unoccupied spaces. Make a power roll upon your return.', { target: 'One creature or object', keywords:['Magic','Melee','Strike','Weapon'], powerRoll:'Agility', tiers:t('8 + A corruption damage','13+ A corruption damage','17 + A corruption damage') }),
  ins(9, 'Shadowfall', 'You vanish. They fall. You reappear.', 'You disappear before making the power roll. After the power roll is resolved, you appear in the first unoccupied space at the far end of the line.', { keywords:['Area','Melee','Weapon'], distance:'10 × 1 line within 1', target:'Each enemy in the area', powerRoll:'Agility', tiers:t('10 + A damage','14 + A damage','20 + A damage') }),
  ins(9, 'You Talk Too Much', 'Silence is a virtue. A knife pinning their mouth shut is the next best thing.', 'The target can’t communicate with anyone until the end of the encounter.', { keywords:['Melee','Ranged','Strike','Weapon'], distance:'Melee 1 or ranged 5', powerRoll:'Agility', tiers:t('10+ A damage; P < WEAK, dazed (save ends)','15 + A damage; A < AVERAGE, dazed (save ends)','21 + A damage; A < STRONG, dazed (save ends)') }),
];
const INS_11 = () => [
  ins(11, 'Assassinate', 'A practiced attack will instantly kill an already weakened foe.', 'A target who is not a minion, leader, or solo creature and who is winded after taking this damage is reduced to 0 Stamina.', { target: 'One creature or object', powerRoll:'Agility', tiers:t('12 + A damage','18 + A damage','24 + A damage') }),
  ins(11, 'Shadowgrasp', 'The shadows around you give way, allowing the shadow creature within you to grasp at your foes.', '', { keywords:['Area','Magic'], type:'Main action', distance:'2 burst', target:'Each enemy in the area', powerRoll:'Agility', tiers:t('11 corruption damage; A < WEAK, restrained (save ends)','16 corruption damage; A < AVERAGE, restrained (save ends)','21 corruption damage; A < STRONG, restrained (save ends)') }),
  ins(11, 'Speed of Shadows', 'You make multiple strikes against a foe before they even notice they’re dead.', 'You can use a strike signature ability four times, use a strike signature ability that gains an edge three times, or use a strike signature ability that has a double edge twice. You can shift up to 2 squares between each use.', { keywords:['Magic'], type:'Main action', distance:'Self', target:'Self' }),
  ins(11, 'They Always Line Up', 'You fire a projectile so fast that it passes through a line of foes, hamstringing them.', '', { keywords:['Area','Ranged','Weapon'], type:'Main action', distance:'5 × 1 line within 5', target:'Each enemy in the area', powerRoll:'Agility', tiers:t('12 damage; M < WEAK, slowed (save ends)','18 damage; A < AVERAGE, slowed (save ends)','24 damage; A < STRONG, slowed (save ends)') }),
];

// ── College features (auto) ──
const COLLEGE_FEAT_2 = {
  'black-ash': [{ name: 'Burning Ash', text: 'The first time on a turn you use a shadow ability to teleport away from or into a space adjacent to an enemy, that enemy takes fire damage equal to your Agility.' }],
  'caustic-alchemy': [{ name: 'Trained Assassin', text: 'When you make a strike with no bane that incorporates 1+ surges, you gain 1 additional surge usable only on that strike.' }],
  'harlequin-mask': [{ name: 'Friend!', text: 'When an enemy uses an ability targeting multiple allies and you\u2019re in its distance, you can choose to be a target too. Your I\u2019m No Threat ability can also Disengage.' }],
};
const COLLEGE_FEAT_5 = {
  'black-ash': [{ name: 'Trail of Cinders', text: 'When you reduce a non-minion to 0 Stamina, use a free maneuver to use Black Ash Teleport. You can also bring one adjacent willing creature whenever you teleport.' }],
  'caustic-alchemy': [{ name: 'Volatile Reagents', text: 'When you take damage, each adjacent enemy takes fire/acid/poison damage (your choice) equal to your Agility. Your Defensive Roll now shifts up to 5 squares (including vertically).' }],
  'harlequin-mask': [{ name: 'Harlequin Gambit', text: 'When you reduce an adjacent non-minion to 0 Stamina, free maneuver: use I\u2019m No Threat then move your speed. Same-size victims can be disguised as without spending insight.' }],
};
const COLLEGE_FEAT_8 = {
  'black-ash': [{ name: 'Cinder Step', text: 'Whenever you willingly move, you can teleport; this counts as a shadow ability for Burning Ash and Trail of Cinders.' }],
  'caustic-alchemy': [{ name: 'Time Bomb', text: 'You gain area-damage immunity equal to your Agility, plus the once-per-round Time Bomb free maneuver — a growing cube dealing acid/fire/poison damage equal to your Agility.' }],
  'harlequin-mask': [{ name: 'Parkour', text: 'Your movement no longer provokes opportunity attacks, and you can use Harlequin Gambit as a free triggered action when Clever Trick drops a creature to 0.' }],
};
const COLLEGE_ABILITY_2 = {
  'black-ash': [
    ins(5, 'In a Puff of Ash', 'You enchant a strike with your teleportation magic.', '', { keywords:['Magic','Melee','Ranged','Strike','Weapon'], distance:'Melee 1 or ranged 5', powerRoll:'Agility', tiers:t('6 + A damage; you can teleport the target 1 square','10 + A damage; you can teleport the target up to 3 squares','14 + A damage; you can teleport the target up to 5 squares') }),
    ins(5, 'Too Slow', 'Your foe made a big mistake.', 'You ignore any effects associated with the damage that triggered your In All This Confusion ability. Before you teleport, you can make a free strike against a creature who damaged you to trigger In All This Confusion. After you teleport, you can spend a Recovery.', { type:'Triggered', keywords:['—'], distance:'Self', target:'Self' }),
  ],
  'caustic-alchemy': [
    ins(5, 'Sticky Bomb', 'Explosives are best when they’re attached to an enemy.', 'You attach a small bomb to a creature. If you are hidden from the creature, they don’t notice the bomb and you remain hidden. The creature otherwise notices the bomb and can disarm and re move it as a main action. If they don’t, at the end of your next turn, the bomb detonates. When the bomb detonates, you make a power roll targeting each enemy within 2 squares of it.', { keywords:['Ranged'], distance:'Ranged 10', powerRoll:'Agility', tiers:t('4 + A fire damage','7 + A fire damage','11 + A fire damage') }),
    ins(5, 'Stink Bomb', 'Putrid yellow gas explodes from a bomb you toss.', 'The gas remains in the area until the end of the encounter. Any creature who starts their turn in the area and has M < AVERAGE is weakened (save ends).', { keywords:['Area','Ranged'], distance:'3 cube within 10', target:'Each creature in the area', powerRoll:'Agility', tiers:t('2 poison damage','5 poison damage','7 poison damage') }),
  ],
  'harlequin-mask': [
    ins(5, 'Machinations of Sound', 'Illusory sounds make your foes reposition themselves as they cower or investigate the disturbance.', 'This forced movement ignores stability. Instead, the forced movement is reduced by a number equal to the target’s Intuition score.', { type:'Maneuver', keywords:['Area','Magic','Ranged'], distance:'3 cube within 10', target:'Each enemy in the area', powerRoll:'Agility', tiers:t('slide 4','slide 5','slide 7') }),
    ins(5, 'So Gullible', 'When your enemy strikes, you reveal you were in a different place all along.', 'You use your Clever Trick ability with no insight cost against the triggering creature and strike. You can teleport to an unoccupied space within 3 squares of that creature and can make a free strike against them. You can then spend a Recovery.', { type:'Free triggered action', keywords:['Magic'], distance:'Self', target:'Self' }),
  ],
};
const COLLEGE_ABILITY_6 = {
  'black-ash': [
    ins(9, 'Black Ash Eruption', 'Your attack produces a cloud of black ash that launches an enemy into the air.', 'A creature force moved by this ability must be moved straight upward.', { keywords:['Magic','Melee','Strike','Weapon'], powerRoll:'Agility', tiers:t('3 + A damage; vertical push 5','6 + A damage; vertical push 10','9 + A damage; vertical push 15') }),
    ins(9, 'Cinderstorm', 'You teleport your friends in a burst of ash and fire.', 'Each target can teleport up to 5 squares. For each target in addition to you who teleports away from or into a space adjacent to an enemy, that enemy takes fire damage equal to your Agility score. Additionally, a target who ends this movement in concealment or cover can use the Hide maneuver even if they are observed.', { type:'Maneuver', keywords:['Magic'], distance:'4 burst', target:'Self and each ally in the area' }),
  ],
  'caustic-alchemy': [
    ins(9, 'One Vial Makes You Better', 'A well-timed throw of a potion will keep your allies in the fight.', 'You ready, hand, or lob a potion to each target, who can immediately quaff the potion (no action required). If they don’t drink the potion right away, they must use the Use Consumable maneuver to consume it later. The potion loses its potency at the end of the encounter.\n\nA creature who drinks the potion can spend up to 2 Recoveries, and has acid immunity "Acid, fire immunity "Fire, or poison immunity "Poison (their choice) equal to your level until the end of the encounter.', { type:'Maneuver', keywords:['Ranged'], distance:'Ranged 10', target:'Three creatures' }),
    ins(9, 'One Vial Makes You Faster', 'Each ally who catches a potion you throw can take the battle to the next level.', 'You ready, hand, or lob a potion to each target, who can immediately quaff the potion (no action required). If they don’t drink the potion right away, they must use the Use Consumable maneuver to consume it later. The potion loses its potency at the end of the encounter.\n\nA creature who drinks the potion receives benefits based on your power roll.', { keywords:['Ranged'], distance:'Ranged 10', target:'Three creatures', powerRoll:'Agility', tiers:t('The creature’s speed is increased by 2 until the end of the encounter','The creature can fly until the end of the encounter.','The creature turns invisible until the end of their next turn.') }),
  ],
  'harlequin-mask': [
    ins(9, 'Look!', 'You distract your foes, allowing your allies to take advantage of that distraction.', 'Until the start of your next turn, any ability roll made against a target gains an edge.', { type:'Maneuver', keywords:['Area','Magic'], distance:'5 burst', target:'Each enemy in the area' }),
    ins(9, 'Puppet Strings', 'You prick little needles on the tips of your fingers into the nerves of your enemies and cause them to lose control.', 'You choose the new targets for the original target’s free strike or ability. Additionally, if you are hidden or disguised, using this ability doesn’t cause you to be revealed.', { keywords:['Magic','Melee','Strike','Weapon'], target:'Two enemies', powerRoll:'Agility', tiers:t('2 damage; if the target has R < WEAK, before the damage is resolved, they make a free strike.','5; R<AVERAGE forced action','7; R<STRONG shift + forced action') }),
  ],
};
const COLLEGE_ABILITY_9 = {
  'black-ash': [
    ins(11, 'Cacophony of Cinders', 'You tumble through the battle, stabbing foes and teleporting allies.', 'You shift up to twice your speed, making one power roll that targets each creature you come adjacent to during the shift.', { keywords:['Magic','Melee','Weapon'], distance:'Self', target:'Self', powerRoll:'Agility', tiers:t('An enemy takes 6 damage; an ally can teleport up to 3 squares.','An enemy takes 10 damage; an ally can teleport up to 5 squares','An enemy takes 14 damage; an ally can teleport up to 7 squares.') }),
    ins(11, 'Demon Door', 'You create a temporary portal to allow a massive demonic hand to reach through.', 'On a critical hit, the target is grabbed by the demon and pulled through the portal before it closes, never to be seen again.', { keywords:['Magic','Melee','Strike','Weapon'], distance:'Melee 3', powerRoll:'Agility', tiers:t('13 + A corruption damage; push 3','18 + A corruption damage; push 5','25 + A corruption damage; push 7') }),
  ],
  'caustic-alchemy': [
    ins(11, 'Chain Reaction', 'One explosion, an offense. Three explosions, an assault. Nine explosions, a celebration.', 'Each enemy within 3 squares of the target who is not currently targeted by this ability also becomes targeted by this ability. This effect continues until there are no more available targets. The ability deals acid, fire, or poison damage (your choice).', { keywords:['Ranged'], distance:'Ranged 10', target:'One creature or object', powerRoll:'Agility', tiers:t('7 acid and fire and poison damage','10 acid and fire and poison damage','15') }),
    ins(11, 'To the Stars', 'You attach your most potent explosive to your foe. Under less pressing circumstances, you’re sure you could launch them into orbit.', 'The ground beneath a 3-cube area around the target’s starting position is difficult terrain.', { keywords:['Melee','Ranged','Strike'], distance:'Melee 1 or ranged 10', target:'One creature or object', powerRoll:'Agility', tiers:t('4 + A fire damage; vertical push 8','7 + A fire damage; vertical push 10','11 + A fire damage; vertical push 15') }),
  ],
  'harlequin-mask': [
    ins(11, 'I Am You', 'Your mask reflects your foe’s face. Surely they won’t need it much longer.', 'Until the end of the encounter, you gain the target’s damage immunities and speed (if they are better than yours), and can use any types of movement they can use. You can also use the target’s signature ability, using their bonus for the power roll.', { type:'Maneuver', keywords:['Magic','Ranged'], distance:'Ranged 10', target:'Each creature' }),
    ins(11, 'It Was Me All Along', 'After everything you’ve been through together, you twist the blade and make the pain extra personal.', 'If you are disguised as a creature the target knew using your I’m No Threat ability, this ability deals extra damage equal to three times your Agility score.', { target: 'Each creature or object', powerRoll:'Agility', tiers:t('15 + A damage','21 + A damage','28 + A damage') }),
  ],
};

export const shadow = {
  2: {
    summary: 'Your college reveals its first secret, and your insight finds new outlets.',
    staminaGain: 6,
    autoFeatures: ({ sub }) => COLLEGE_FEAT_2[sub] || [],
    choices: [
      { id: 'perk', label: 'Perk', help: 'Choose one exploration, interpersonal, or intrigue perk.', kind: 'perk', options: PERK_EII },
      { id: 'college-ability-2', label: '2nd-Level College Ability', help: 'Your college grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => COLLEGE_ABILITY_2[sub] || [] },
    ],
  },
  3: {
    summary: 'A moment of focus leaves your foes firmly in your sights.',
    staminaGain: 6,
    autoFeatures: () => [
      { name: 'Careful Observation', text: 'Maneuver (Ranged 20): assess one creature. As long as you keep distance and line of effect and strike no one else first, you gain an edge and 1 surge on your next strike against them.' },
    ],
    choices: [
      { id: 'insight-7', label: '7-Insight Ability', help: 'Choose one heroic ability that costs 7 insight.', kind: 'ability', options: INS_7 },
    ],
  },
  4: {
    summary: 'Your reflexes sharpen, and the dark keeps your secrets.',
    staminaGain: 6,
    autoCharacteristicIncrease: { Agility: 3, max: true },
    autoFeatures: () => [
      { name: 'Characteristic Increase', text: 'Your Agility increases to 3, and one other characteristic increases by 1 (to a max of 3).' },
      { name: 'Keep It Down', text: 'While conversing with a creature you share a language with, you decide whether anyone else can perceive what you convey — even while yelling.' },
      { name: 'Night Watch', text: 'While hidden, enemies take a bane on tests to search for you or hidden creatures within 10 squares. Plus a triggered action: halve an ally\u2019s incoming damage from Ranged 5 while you stay hidden.' },
      { name: 'Surge of Insight', text: 'The first time each round you deal damage incorporating 1+ surges, you gain 2 insight instead of 1.' },
    ],
    choices: [
      { id: 'perk-4', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'skill-4', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
  5: {
    summary: 'Your college deepens its craft.',
    staminaGain: 6,
    autoFeatures: ({ sub }) => COLLEGE_FEAT_5[sub] || [],
    choices: [
      { id: 'insight-9', label: '9-Insight Ability', help: 'Choose one heroic ability that costs 9 insight.', kind: 'ability', options: INS_9 },
    ],
  },
  6: {
    summary: 'You learn to slip into your umbral form — a shadow creature dripping with ash.',
    staminaGain: 6,
    autoFeatures: () => [
      { name: 'Umbral Form', text: 'Maneuver: become a shadow creature until end of encounter, dying, or an hour\u2019s focus. You climb at full speed, ignore enemies\u2019 difficult terrain (dealing corruption when passing through), auto-hide with cover, gain 1 surge per turn and corruption immunity 5 + level — but enemies gain an edge against you and you take a bane on Presence tests.' },
    ],
    choices: [
      { id: 'perk-6', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'college-ability-6', label: '6th-Level College Ability', help: 'Your college grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => COLLEGE_ABILITY_6[sub] || [] },
    ],
  },
  7: {
    summary: 'Insight floods you, and your senses reach further than ever.',
    staminaGain: 6,
    autoCharIncreaseAll: { delta: 1, max: 4 },
    autoFeatures: () => [
      { name: 'Characteristic Increase', text: 'Each characteristic score increases by 1, to a maximum of 4.' },
      { name: 'Keen Insight', text: 'At the start of each of your turns in combat, you gain 1d3 + 1 insight instead of 1d3.' },
      { name: 'Careful Observation Improvement I', text: 'You can target two creatures simultaneously with your Careful Observation ability, observing both simultaneously. Making a strike against one target doesn’t end your observation of the other target.' },
      { name: 'Ventriloquist', text: 'You can throw your voice to seem to come from a creature or object within 10 squares; doing so while hidden doesn\u2019t reveal you.' },
    ],
    choices: [
      { id: 'skill-7', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
  8: {
    summary: 'Your college entrusts you with its highest technique.',
    staminaGain: 6,
    autoFeatures: ({ sub }) => COLLEGE_FEAT_8[sub] || [],
    choices: [
      { id: 'perk-8', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'insight-11', label: '11-Insight Ability', help: 'Choose one heroic ability that costs 11 insight.', kind: 'ability', options: INS_11 },
    ],
  },
  9: {
    summary: 'You split into a squad of living shadows.',
    staminaGain: 6,
    autoFeatures: () => [
      { name: 'Gloom Squad', text: 'At the start of your turns, forgo insight to create 1d6 clones in adjacent spaces. Each acts on your turn with your stats but 1 Stamina, sharing your conditions, lasting until your next turn. Clones have a move, a maneuver, and a free-strike main action only.' },
    ],
    choices: [
      { id: 'college-ability-9', label: '9th-Level College Ability', help: 'Your college grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => COLLEGE_ABILITY_9[sub] || [] },
    ],
  },
  10: {
    summary: 'You become subterfuge itself — a master of shadow without equal.',
    staminaGain: 6,
    autoCharacteristicIncrease: { Agility: 5, max: true },
    autoFeatures: () => [
      { name: 'Characteristic Increase', text: 'Your Agility increases to 5, and one other characteristic increases by 1 (to a max of 5).' },
      { name: 'Death Pool', text: 'The first time each round you deal damage incorporating 1+ surges, you gain 3 insight instead of 2.' },
      { name: 'Careful Observation Improvement II', text: 'You can target three creatures simultaneously with your Careful Observation ability.' },
      { name: 'Improved Umbral Form', text: 'You gain full control of your umbral form and can end it at will. It now grants concealment, enemies lose their edge against you, and you can teleport with willing allies to a known location (turning them invisible).' },
      { name: 'Subterfuge', text: 'You gain the epic resource subterfuge equal to the XP you earn each respite, spendable as insight. You can also spend it for an extra maneuver each, on your turn. Subterfuge remains until spent.' },
    ],
    choices: [
      { id: 'perk-10', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'skill-10', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
};
