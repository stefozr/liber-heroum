// levelup-fury-hi.jsx — Fury level-up data, levels 5–10 (extends existing 2–4 in levelup.jsx).
// Aspects: berserker / reaver / stormwight · Resource: Ferocity · staminaPer 9.

const PERK_CEI = [
  { id: 'crafting',    name: 'Crafting Perk',    body: 'A boon tied to making and mending.' },
  { id: 'exploration', name: 'Exploration Perk', body: 'A boon for the wilds and the road.' },
  { id: 'intrigue',    name: 'Intrigue Perk',    body: 'A boon for the shadows and the con.' },
];
const PERK_ANY = ['crafting','exploration','interpersonal','intrigue','lore','supernatural'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Perk', body: '' }));
const SKILL_ANY = ['crafting','exploration','interpersonal','intrigue','lore'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Skill', body: '' }));
const tr = (t1, t2, t3) => [['\u2264 11', t1], ['12\u201316', t2], ['17+', t3]];
const fe = (n, name, flavor, effect, extra) => ({ name, cost: n, resource: 'Ferocity', flavor, type: 'Main action', keywords: ['Melee','Strike','Weapon'], distance: 'Melee 1', target: 'One creature', effect, ...extra });

const FE_9 = () => [
  fe(9, 'Debilitating Strike', 'You need just one blow to sabotage your target.', 'While slowed this way, the target takes 1 damage for every square they move, including from forced movement.', { powerRoll:'Might', tiers:tr('10 + M damage; M < WEAK, slowed (save ends)','14 + M damage; M < AVERAGE, slowed (save ends)','20 + M damage; M < STRONG, slowed (save ends)') }),
  fe(9, 'My Turn!', 'You quickly strike back at a foe.', 'You can spend a Recovery.', { target: 'The triggering creature', type:'Free triggered action', trigger:'A creature causes you to be winded or dying, or damages you while you are winded or dying.', powerRoll:'Might', tiers:tr('6 + M damage','9 + M damage','13 + M damage') }),
  fe(9, 'Rebounding Storm', 'You knock around enemies like playthings.', 'When a target would end this forced movement by colliding with a creature or object, they take damage as usual, then are pushed the remaining distance away from the creature or object in the direction they came from. As long as forced movement remains, this effect continues if the target collides with another creature or object.', { target: 'Two creature or objects', powerRoll:'Might', tiers:tr('9 + M damage; push 3','14 + M damage; push 5','19 + M damage; push 7') }),
  fe(9, 'To Stone!', 'You channel the Primordial Chaos into blows that petrify your foe … literally.', 'While the target is slowed this way, any other effect that would make the target slowed instead makes them Restrained by this ability. Additionally, a creature who fails the saving throw while restrained this way is Petrified until they are given a supernatural cure or you choose to reverse the effect (no action required).', { keywords:['Magic','Melee','Strike','Weapon'], powerRoll:'Might', tiers:tr('9 + M damage; M < WEAK, slowed (save ends)','13 + M damage; M < AVERAGE, slowed (save ends)','18 + M damage; M < STRONG, restrained (save ends)') }),
];
const FE_11 = () => [
  fe(11, 'Elemental Ferocity', 'Your primordial energy makes for instant retribution.', 'You gain 10 temporary Stamina. Additionally, choose acid, cold, corruption, fire, lightning, poison, or sonic damage. Until the end of the encounter or until you are dying, whenever an enemy damages you, they take 10 acid/cold/corruption/fire/lightning/poison/sonic damage of the chosen type. If this damage reduces the enemy to 0 Stamina, you gain 10 temporary Stamina.', { keywords:['Magic'], type:'Maneuver', distance:'Self', target:'Self' }),
  fe(11, 'Overkill', 'You strike so no damage is wasted.', 'If the target is a minion or is winded but isn’t a leader or solo creature, they are reduced to 0 Stamina before this ability’s damage is dealt. If the target is killed by this damage, you can deal any damage over what was required to kill them to another creature within 5 squares of the target.', { keywords:['Magic','Melee','Strike','Weapon'], powerRoll:'Might', tiers:tr('6 + M damage','10 + M damage','14 + M damage') }),
  fe(11, 'Primordial Rage', 'Your ferocity manifests into primordial power.', 'Choose acid, cold, corruption, fire, lightning, poison, or sonic damage. Until the end of the encounter or until you are dying, you can choose one target of any ability you use, with that target taking an extra 15 acid/cold/corruption/fire/lightning/poison/sonic damage of the chosen type. Additionally, whenever you gain ferocity from taking damage, the source of the damage takes 5 acid/cold/corruption/fire/lightning/poison/sonic damage of the chosen type.', { keywords:['Magic'], type:'Maneuver', distance:'Self', target:'Self' }),
  fe(11, 'Relentless Death', 'You won\u2019t escape your fate.', 'You shift up to your speed. Each enemy you move adjacent to during this movement takes damage equal to twice your Might score. Then make one power roll that targets each enemy you move adjacent to during this shift. You gain 1 ferocity for each target who dies as a result of this ability (maximum 11 ferocity).', { target: 'Self', distance: 'Self', keywords:['Magic','Melee','Strike','Weapon'], powerRoll:'Might', tiers:tr('Any target whose Stamina is equal to or less than 8 dies.','Any target whose Stamina is equal to or less than 11 dies.','Any target whose Stamina is equal to or less than 17 dies.') }),
];

const ASPECT_FEAT_5 = {
  berserker: [{ name: 'Bounder', text: 'Your jump distance and height double, and you reduce fall height by your jump distance (never prone from falling, including onto a creature).' }],
  reaver: [{ name: 'Unfettered', text: 'At the start of your turn you can end any restrained condition on you, and you have a double edge on tests to escape confinement.' }],
  stormwight: [{ name: 'Stormborn', text: 'You and allies within 5 squares ignore inclement-weather penalties, and you gain Blessing of Fortunate Weather as a 1st-level conduit.' }],
};
const ASPECT_FEAT_8 = {
  berserker: [{ name: 'Strongest There Is', text: 'On Might tests roll three dice keep two. Knockback gains a forced-movement bonus equal to your Might.' }],
  reaver: [{ name: 'A Step Ahead', text: 'On Agility tests roll three dice keep two. Disengage gains a shift bonus equal to your Agility.' }],
  stormwight: [{ name: 'Menagerie', text: 'You can use all stormwight kits and swap kit on a respite with an extra activity; sense animals within 1 mile; roll three dice keep two on tracking tests.' }],
};
const ASPECT_ABILITY_6 = {
  berserker: [
    fe(9, 'Avalanche Impact', 'You leap and crash down, causing a shockwave that devastates foes.', 'You jump up to your maximum jump distance and make one power roll that targets each creature adjacent to the space where you land.', { keywords:['Magic'], type:'Maneuver', distance:'Self', target:'Self', powerRoll:'Might', tiers:tr('4 damage; push 1','7 damage; push 2','11 damage; push 3') }),
    fe(9, 'Force of Storms', 'You strike an enemy hard enough to be a projectile that knocks a crowd of creatures around.', 'When the target ends this forced movement, each creature within 2 squares of the target is pushed 3 squares.', { powerRoll:'Might', tiers:tr('7 + M damage; push 3','11 + M damage; push 5','16 + M damage; push 7') }),
  ],
  reaver: [
    fe(9, 'Death Strike', 'Once you taste your foe’s blood, you become more efficient and turn every killing blow into an opportunity.', 'You target a creature adjacent to you with the same strike, using the same power roll as the triggering strike.', { type:'Free triggered action', trigger:'You reduce a creature to 0 Stamina with a strike.', target:'Self' }),
    fe(9, 'Seek and Destroy', 'You break through the enemy lines to make an example.', 'You shift up to your speed.\n\nIf a target who is not a leader or solo creature is winded by this strike, they are reduced to 0 Stamina and you choose an enemy within 5 squares of you. If that enemy has P < AVERAGE, they are frightened (save ends).', { target: 'Self', distance: 'Self', powerRoll:'Might', tiers:tr('4 + M damage; P < WEAK, frightened (save ends)','6 + M; P<AVERAGE frightened (save)','10 + M; P<STRONG frightened (save)') }),
  ],
  stormwight: [
    fe(9, 'Pounce', 'You strike at the target like the ultimate predator you are.', 'You can shift up to 4 squares, bringing the target with you. While grabbed this way, the target takes damage equal to twice your Might score at the start of each of your turns.', { keywords:['Magic','Melee','Strike','Weapon'], powerRoll:'Might', tiers:tr('8 damage; M < WEAK, grabbed','13 damage; M < AVERAGE, grabbed','17 damage; M < STRONG, grabbed') }),
    fe(9, 'Riders on the Storm', 'You focus your connection to the Primordial Chaos into a seething storm.', 'Until the end of the encounter or until you are dying, each enemy target takes damage of your primordial damage type equal to twice your Might score at the end of each of your turns.\n\nAdditionally, you can fly while the aura is active. Each ally target who starts or ends their turn in the area can also fly until the start of their next turn or until the effect ends.\n\n**Special**: When you use this ability outside of combat without spending ferocity, you must spend 1 uninterrupted minute summoning a primordial storm that fills the area, and you take 1d6 damage before the ability takes effect. The storm lasts for 1 hour or until a combat encounter begins.', { keywords:['Area','Magic'], type:'Maneuver', distance:'3 aura', target:'Each creature in the area' }),
  ],
};
const ASPECT_ABILITY_9 = {
  berserker: [
    fe(11, 'Death Comes for You All!', 'You use your weapon to create a destructive shockwave.', 'If this forced movement causes a target to be hurled through an object, that target takes an extra 10 damage.', { keywords:['Area','Magic','Melee','Weapon'], type:'Main action', distance:'3 burst', target:'Each enemy in the area', powerRoll:'Might', tiers:tr('7 damage; push 3','10 damage; push 5','15 damage; push 7') }),
    fe(11, 'Primordial Vortex', 'You channel the power of the Primordial Chaos to pull foes to you.', 'If this forced movement causes a target to slam into you, you take no damage from the collision and the target takes the damage you would have taken.', { keywords:['Area','Magic','Melee','Weapon'], type:'Main action', distance:'3 burst', target:'Each enemy in the area', powerRoll:'Might', tiers:tr('3 damage; vertical pull 3','5 damage; vertical pull 5','8 damage; vertical pull 7') }),
  ],
  reaver: [
    fe(11, 'Primordial Bane', 'You attune the target to be weaker to a specific element.', 'Choose acid, cold, corruption, fire, lightning, poison, or sonic damage. The target loses any damage immunity to the chosen type and gains weakness 10 to the chosen type (save ends).', { keywords:['Magic','Melee','Strike','Weapon'], powerRoll:'Might', tiers:tr('11 + M damage','16 + M damage','21 + M damage') }),
    fe(11, 'Shower of Blood', 'You shock your foes with the brutality of your strike, resetting the balance of combat.', 'Each enemy within 5 squares of you is distracted until the end of the round. While a creature is distracted this way, they can’t take triggered actions or free triggered actions, ability rolls made against them gain an edge, and their characteristic scores are considered 1 lower for the purpose of resisting potencies.', { powerRoll:'Might', tiers:tr('12 + M damage','18 + M damage','24 + M damage') }),
  ],
  stormwight: [
    fe(11, 'Death Rattle', 'You unleash an otherworldly cry that rips through your enemies, killing the weakest of them.', '', { keywords:['Area','Magic'], type:'Main action', distance:'3 burst', target:'Each enemy in the area', powerRoll:'Might', tiers:tr('4 psychic damage; any target who is a minion is reduced to 0 Stamina','6 psychic damage; any target who is a minion is reduced to 0 Stamina, as does one winded target who is not a leader or solo creature','10 psychic damage; each target who is not a leader or solo creature is winded; any target who is a minion is reduced to 0 Stamina, as does one winded target who is not a leader or solo creature') }),
    fe(11, 'Deluge', 'You summon your primordial storm.', 'This ability deals your primordial damage type and ignores damage immunity.', { keywords:['Area','Magic','Ranged'], type:'Main action', distance:'5 cube within 10', target:'Each enemy in the area', powerRoll:'Might', tiers:tr('7 damage','10 damage','15 damage') }),
  ],
};

export const furyHi = {
  5: {
    summary: 'Your aspect roots deeper, and the chaos pours through harder.',
    staminaGain: 9,
    autoFeatures: ({ sub }) => ASPECT_FEAT_5[sub] || [],
    choices: [
      { id: 'ferocity-9', label: '9-Ferocity Ability', help: 'Choose one heroic ability that costs 9 ferocity.', kind: 'ability', options: FE_9 },
    ],
  },
  6: {
    summary: 'You become a marauder of the Primordial Chaos.',
    staminaGain: 9,
    autoFeatures: () => [
      { name: 'Marauder of the Primordial Chaos', text: 'You sense elemental creatures and sources within 1 mile, can speak with elementals (+1 Renown with them), and frighten weak-willed elementals who notice you in combat.' },
      { name: 'Primordial Portal', text: 'Main action: touch an elemental power source to open a portal to a safe island in Quintessence; maintain up to your Might in linked portals.' },
    ],
    choices: [
      { id: 'perk-6', label: 'Perk', help: 'Choose one crafting, exploration, or intrigue perk.', kind: 'perk', options: PERK_CEI },
      { id: 'aspect-ability-6', label: '6th-Level Aspect Ability', help: 'Your aspect grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => ASPECT_ABILITY_6[sub] || [] },
    ],
  },
  7: {
    summary: 'The element within you shows on your skin; ferocity floods you.',
    staminaGain: 9,
    autoCharIncreaseAll: { delta: 1, max: 4 },
    autoFeatures: () => [
      { name: 'Characteristic Increase', text: 'Each characteristic score increases by 1, to a maximum of 4.' },
      { name: 'Elemental Form', text: 'You exhibit ever-stronger signs of how the force of the Primordial Chaos flows within you. If you are a berserker or reaver, you have immunity to acid, cold, corruption, fire, lightning, poison, and sonic damage equal to your Might score. If you are a stormwight, you have immunity to the damage type of your Primordial Storm feature equal to twice your Might score.' },
      { name: 'Greater Ferocity', text: 'When you gain ferocity at the start of your turns, you gain 1d3 + 1 instead of 1d3.' },
      { name: 'Growing Ferocity Improvement II', text: 'Your Growing Ferocity feature provides additional benefits when you have 10 or more ferocity.' },
    ],
    choices: [
      { id: 'skill-7', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
  8: {
    summary: 'Your aspect reveals its deepest strength.',
    staminaGain: 9,
    autoFeatures: ({ sub }) => ASPECT_FEAT_8[sub] || [],
    choices: [
      { id: 'perk-8', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'ferocity-11', label: '11-Ferocity Ability', help: 'Choose one heroic ability that costs 11 ferocity.', kind: 'ability', options: FE_11 },
    ],
  },
  9: {
    summary: 'You become a harbinger of the Primordial Chaos.',
    staminaGain: 9,
    autoFeatures: () => [
      { name: 'Harbinger of the Primordial Chaos', text: 'As a respite activity you can create a temporary elemental power source (lasting 24 hours, or as long as a portal made from it is maintained).' },
    ],
    choices: [
      { id: 'aspect-ability-9', label: '9th-Level Aspect Ability', help: 'Your aspect grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => ASPECT_ABILITY_9[sub] || [] },
    ],
  },
  10: {
    summary: 'You become chaos incarnate — the storm given flesh.',
    staminaGain: 9,
    autoCharacteristicIncrease: { Might: 5, Agility: 5, max: true },
    autoFeatures: () => [
      { name: 'Characteristic Increase', text: 'Your Might and Agility scores each increase to 5.' },
      { name: 'Chaos Incarnate', text: 'If you are a berserker or reaver, you have immunity to acid, cold, corruption, fire, lightning, poison, and sonic damage equal to twice your Might score. If you are a stormwight, your damage immunity from your Primordial Storm feature increases to three times your Might score. When any elemental or any other creature whose abilities deal those damage types first becomes aware of you in combat, if they have P < STRONG, they are frightened of you (save ends). Additionally, when you use Primordial Strike, you can spend up to 3 ferocity, gaining 1 surge per ferocity spent to use for that strike.' },
      { name: 'Growing Ferocity Improvement III', text: 'Your Growing Ferocity feature provides additional benefits when you have 12 or more ferocity.' },
      { name: 'Primordial Ferocity', text: 'The first time you take damage each round, you gain 3 ferocity instead of 2.' },
      { name: 'Primordial Power', text: 'You gain the epic resource primordial power equal to the XP you earn each respite, spendable as ferocity. Spend it (free maneuver) to end one effect on you each, or 3 to open a portal to Quintessence. It remains until spent.' },
    ],
    choices: [
      { id: 'perk-10', label: 'Perk', help: 'Choose one crafting, exploration, or intrigue perk.', kind: 'perk', options: PERK_CEI },
      { id: 'skill-10', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
};
