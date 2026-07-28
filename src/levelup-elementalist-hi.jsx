// levelup-elementalist-hi.jsx — Elementalist level-up data, levels 5–10 (extends existing 2–4).
// Specializations: earth / fire / green / void · Resource: Essence · staminaPer 6.

const PERK_ANY = ['crafting','exploration','interpersonal','intrigue','lore','supernatural'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Perk', body: '' }));
const SKILL_ANY = ['crafting','exploration','interpersonal','intrigue','lore'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Skill', body: '' }));
const tr = (t1, t2, t3) => [['\u2264 11', t1], ['12\u201316', t2], ['17+', t3]];
const es = (n, name, flavor, effect, extra) => ({ name, cost: n, resource: 'Essence', flavor, type: 'Main action', keywords: ['Magic','Ranged'], distance: 'Ranged 10', target: 'One creature', effect, ...extra });

// 10th level: the capstone feature of your elemental specialization.
const MASTER_BY_SPEC = {
  earth: { name: 'Master of Earth', text: 'As a respite activity, you can shape the mundane earth around you in a 1-mile radius. You can open sinkholes, form mountains, level mundane structures or whole settlements, create canyons, raise islands or sink them in the sea, and perform similar feats. You can\u2019t use this respite activity if another creature within 1 mile is already using it. Once you use this respite activity, you can\u2019t use it again for 10 days.' },
  fire:  { name: 'Master of Fire', text: 'The damage bonus of your Acolyte of Fire feature increases to +5 and applies to all your magic abilities. Additionally, your Return to Formlessness ability can be used on supernatural objects (but not on artifacts). When you melt a treasure, you gain breath equal to its echelon.' },
  green: { name: 'Master of Green', text: 'The number of Recoveries you have increases by 2, and each time you finish a respite, you can grant each ally who finished the respite with you 2 additional Recoveries. Your allies\u2019 additional Recoveries disappear when they finish their next respite. Additionally, as a respite activity, you can perform a ritual that causes a fruit tree to spring from the ground, grow, mature, and produce 1d6 of a treasure called Life Fruit. As a maneuver, a creature can consume a Life Fruit or feed it to an adjacent willing ally: they restore all their Stamina, can end all conditions or effects on themself, and can stand up if prone. If the creature desires, their aging pauses for 1d10 years.' },
  void:  { name: 'Master of Void', text: 'Whenever you willingly move, you can teleport. Additionally, your mind is connected to the mystery and helps you find the answers you seek. You no longer require project sources for research projects. Whenever you use a respite activity to make a project roll for a research project, you automatically complete the project.' },
};

const ES_9 = () => [
  es(9, 'Combustion Deferred', 'Your flames dance from kindling to kindling to kindling.', 'When the target ends their next turn, or if they drop to 0 Stamina before then, each enemy adjacent to them takes fire damage equal to twice your Reason score. Each affected enemy then gains this same effect.', { target: 'One creature or object', keywords:['Magic','Ranged','Strike','Fire'], powerRoll:'Reason', tiers:tr('8 + R fire damage; Combustion Deferred','13 + R fire damage; Combustion Deferred','17 + R damage; Combustion Deferred') }),
  es(9, 'Storm of Sands', 'Dirt and debris swirl into a dark, pulsing hurricane.', 'The area lasts until the start of your next turn. It is difficult terrain for enemies, and you and your allies have concealment while in the area.\n\n**Persistent 1**: The area remains until the start of your next turn, and you can move it up to 5 squares (no action required). As a maneuver, you can make the power roll again without spending essence.', { keywords:['Area','Magic','Ranged','Earth'], distance:'4 cube within 10', target:'Each enemy in the area', powerRoll:'Reason', tiers:tr('2 damage','5 damage','7 damage') }),
  es(9, 'Subverted Perception of Space', 'You rip an enemy\u2019s world in twain.', '**Persistent 1**: The target’s limited line of effect lasts until the start of your next turn.', { target: 'One creature or object', keywords:['Magic','Ranged','Strike','Void'], powerRoll:'Reason', tiers:tr('9 + R corruption damage; R < WEAK','10 + R corruption damage; the target has line of effect only to creatures and objects within 4 squares of them until the start of your next turn','15 + R corruption damage; the target has line of effect only to adjacent creatures and objects until the start of your next turn') }),
  es(9, 'Web of All That\u2019s Come Before', 'Threads you’ve been weaving through your adventures create a vibrant, pearlescent web.', 'The area is difficult terrain until the start of your next turn. Each enemy who ends their turn in the area is restrained (save ends).\n\n**Persistent 1**: The area remains until the start of your next turn.', { keywords:['Area','Magic','Ranged','Green'], distance:'4 cube within 10', target:'Each enemy in the area', powerRoll:'Reason', tiers:tr('2 corruption damage; A < WEAK, restrained (saved ends)','3 corruption damage; R < AVERAGE, restrained (saved ends)','5 corruption damage; R < STRONG, restrained (saved ends)') }),
];
const ES_9B = () => [
  es(9, 'Luminous Champion Aloft', 'They shine vibrantly, a beautiful diamond in the night sky.', 'The target has a +3 bonus to speed, they can fly, and their abilities ignore concealment. Additionally, whenever the target gains their Heroic Resource, they gain 1 additional Heroic Resource.\n\nThis effect lasts until the start of your next turn.\n\n**Persistent 1**: The effect lasts until the start of your next turn.', { type: 'Maneuver', keywords:['Magic','Ranged','Fire','Green','Void'], target:'Self or one ally' }),
  es(9, 'Magma Titan', 'Their body swells with lava, mud, and might, towering over their enemies.', 'Until the start of your next turn, the target has the following benefits :\n\n- Their size and stability increase by 2, with any size 1 target becoming size 3. Each creature who is within the target’s new space slides to the nearest unoccupied space, ignoring stability. If the target doesn’t have space to grow, they grow as much as they can and become restrained until the effect ends.\n- They have fire immunity 10.\n- Their strikes deal extra fire damage equal to twice your Reason score.\n- When the target force moves a creature or object, the forced movement distance gains a +2 bonus.\n- They can use their highest characteristic instead of Might for Might power rolls.\n\n**Persistent 2**: The effect lasts until the start of your next turn. Additionally, at the start of your turn, the target can spend 2 Recoveries.', { type: 'Maneuver', keywords:['Magic','Ranged','Earth','Fire','Green'], target:'Self or one ally' }),
  es(9, 'Meteor', 'You teleport the target into the air and let the ground and the elemental force of fire do the rest.', 'If the target is teleported to a space where they would fall, they immediately do so, treating the fall as if their Agility score were 0. The target takes fire damage from the fall, and each enemy within 3 squares of where they land takes the same amount of fire damage.\n\n4 fire damage or 6 fire damage or 8 fire damage or custom\n\nThe ground within 3 squares of where the target lands is difficult terrain.', { target: 'One creature or object', keywords:['Magic','Ranged','Earth','Fire','Void'], powerRoll:'Reason', tiers:tr('You teleport the target up to 4 squares.','You teleport the target up to 6 squares.','You teleport the target up to 8 squares.') }),
  es(9, 'The Wode Remembers and Returns', 'You create a terrarium that spans from canopy above to underbrush below.', 'The area becomes dark and verdant, with trees and plant life appearing in unoccupied spaces within it until the start of your next turn. The area is difficult terrain for enemies, and any ally who ends their turn in the area has cover.\n\n**Persistent 2**: The area remains until the start of your next turn. Additionally, at the start of your turn, each ally in the area can spend a Recovery.', { keywords:['Area','Magic','Earth','Green','Void'], distance:'4 burst', target:'Special' }),
];
const ES_11 = () => [
  es(11, 'Heart of the Wode', 'You call forth one of the Great Tree’s many splinters to provide for your every need.', 'A size 5 tree appears in an unoccupied space within distance. The tree has 100 Stamina and can’t be force moved. You and any ally can touch the tree to use the Catch Breath maneuver as a free maneuver. Additionally, when you start your turn with line of effect to the tree, you can end one effect on yourself that is ended by a saving throw or that ends at the end of your turn, or you can stand up if you are prone. Each ally within distance also gains this benefit.\n\nEach enemy who ends their turn within 3 squares of the tree is until the end of their next turn. A creature restrained this way can use a main action to end the effect early.', { keywords:['Magic','Ranged','Green'], target:'Special' }),
  es(11, 'Muse of Fire', 'The fire burns hot enough to sear the face of any god watching.', 'The Director’s Malice can become negative as a result of this ability.', { keywords:['Area','Magic','Ranged','Fire'], distance:'5 cube within 10', target:'Each enemy in the area', powerRoll:'Reason', tiers:tr('7 fire damage; the Director loses 2 Malice','10 fire damage; the Director loses 3 Malice','15 fire damage; the Director loses 4 Malice') }),
  es(11, 'Return to Oblivion', 'Return to Oblivion.', 'You create a size 1L vortex that lasts until the end of the encounter. At the start of each combat round while the vortex is unoccupied, the vortex vertical pulls 3 each enemy within 5 squares of it. Each enemy who enters the vortex or starts their turn there is knocked prone. At the end of the round, if a winded enemy who is not a leader or solo creature is in the vortex, they are instantly destroyed.', { keywords:['Area','Magic','Ranged','Void'], distance:'Ranged 10', target:'Special' }),
  es(11, 'World Torn Asunder', 'You stomp your foot and quake the whole world over.', 'You create a fissure in the ground adjacent to you that is a 10 × 2 line and 6 squares deep. Each creature in the area who is prone and size 2 or smaller falls in. Other creatures can enter the fissure or can shift to the nearest unoccupied space of their choice outside it.', { keywords:['Area','Magic','Earth'], distance:'5 burst', target:'Each enemy in the area', powerRoll:'Reason', tiers:tr('M < WEAK. prone','R < AVERAGE. prone','R < STRONG. prone') }),
];
const ES_11B = () => [
  es(11, 'Earth Rejects You', 'Everyone and everything gets blown away in an eruption of rocks and debris.', '**Persistent 2**: At the start of your turn, you can use a maneuver to use this ability again without spending essence.', { keywords:['Area','Magic','Ranged','Earth'], distance:'5 cube within 10', target:'Each enemy or object in the area', powerRoll:'Reason', tiers:tr('6 damage','9 damage','13 damage') }),
  es(11, 'The Green Defends Its Servants', 'A luminous green shield shows its true beauty the more it cracks.', 'You conjure an that protects the target until the end of your next turn. While the shield is active, the target can take the Defend main action as a maneuver on each of their turns. The target gains 30 temporary Stamina that lasts until depleted or until the effect ends. If this temporary Stamina disappears, the effect ends and the shield explodes, dealing 10 damage to each enemy within 5 squares of the target.\n\n**Persistent 2**: The effect lasts until the start of your next turn.', { type: 'Maneuver', keywords:['Magic','Ranged','Green'], target:'Self or one ally' }),
  es(11, 'Prism', 'You split your essence, allowing you to cast multiple effects at once.', 'You use up to three heroic abilities whose essence costs total 11 or less, spending no additional essence beyond the cost of this ability. You can shift up to 2 squares between your use of each ability.', { keywords:['Magic','Void'], type:'Main action', distance:'Self', target:'Self' }),
  es(11, 'Unquenchable Fire', 'You let fly a fiery missile braided with pure primal energy.', 'This damage ignores immunity.', { target: 'One enemy or object', keywords:['Magic','Ranged','Strike','Fire'], powerRoll:'Reason', tiers:tr('13 + R fire damage; I < WEAK, dazed (save ends)','18 + R fire damage; I < AVERAGE, dazed (save ends)','25 + R fire damage; I < STRONG, dazed (save ends)') }),
];

const SPEC_FEAT_5 = {
  earth: [{ name: 'The Mountain Does Not Move', text: 'Your stability increases by your level. When an ally in Hurl Element distance is force moved, you can give up stability (free triggered action) to boost theirs for the round.' }],
  fire: [{ name: 'Smoldering Step', text: 'Step into one fire and teleport to another within 10 squares. When you use a fire ability or take fire damage, adjacent enemies take fire equal to your Reason.' }],
  green: [{ name: 'Hide of Tenfold Shields', text: 'Entering an animal form in combat grants temporary Stamina equal to your level; an ally can pet you to transfer your temporary Stamina to them.' }],
  void: [{ name: 'Pierce the Veil of Substance', text: 'Thin mundane barriers no longer block your senses or line of effect; using a void ability lets you or an ally teleport up to your Reason.' }],
};
const SPEC_FEAT_8 = {
  earth: [{ name: 'Summon Source of Earth', text: 'You can conjure and command a lasting source of elemental earth to reshape the battlefield.' }],
  fire: [{ name: 'The Flame Primordial', text: 'Your inner fire becomes primordial, empowering and protecting you with the first flame.' }],
  green: [{ name: 'Chimeric Manifestation', text: 'Enter/exit animal form as a free maneuver, and combine two animal forms (levels totaling 12 or less), taking the best of both.' }],
  void: [{ name: 'Black Hole Star', text: 'At the end of each turn, vertical-pull a creature/object up to 5 (min 2). Your Mantle reduces enemies\u2019 and objects\u2019 stability by your level.' }],
};

export const elementalistHi = {
  5: {
    summary: 'Your specialization reveals a deeper working.',
    staminaGain: 6,
    autoFeatures: ({ sub }) => SPEC_FEAT_5[sub] || [],
    choices: [
      { id: 'essence-9', label: '9-Essence Ability', help: 'Choose one heroic ability that costs 9 essence.', kind: 'ability', options: ES_9 },
    ],
  },
  6: {
    summary: 'You learn to weave freeform wyrds from raw essence.',
    staminaGain: 6,
    autoFeatures: () => [
      { name: 'Wyrding', text: 'Spend 10 minutes to craft a freeform magic effect for a situation (a chosen utility working from the wyrding list).' },
    ],
    choices: [
      { id: 'perk-6', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'essence-9b', label: 'New 9-Essence Ability', help: 'Choose another 9-essence ability (or one you skipped at 5th).', kind: 'ability', options: ES_9B },
    ],
  },
  7: {
    summary: 'Essence floods you, and your mantle becomes second nature.',
    staminaGain: 6,
    autoCharIncreaseAll: { delta: 1, max: 4 },
    autoFeatures: () => [
      { name: 'Characteristic Increase', text: 'Each characteristic score increases by 1, to a maximum of 4.' },
      { name: 'Mantle of Quintessence', text: 'Your Mantle of Essence no longer requires essence and radiates a calming air (+1 patience to creatures in its aura during negotiation).' },
      { name: 'Surge of Essence', text: 'When you gain essence at the start of each of your turns during combat, you gain 3 essence instead of 2.' },
    ],
    choices: [
      { id: 'skill-7', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
  8: {
    summary: 'Your specialization reaches its fullest expression.',
    staminaGain: 6,
    autoFeatures: ({ sub }) => SPEC_FEAT_8[sub] || [],
    choices: [
      { id: 'perk-8', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'essence-11', label: '11-Essence Ability', help: 'Choose one heroic ability that costs 11 essence.', kind: 'ability', options: ES_11 },
    ],
  },
  9: {
    summary: 'You master the shaping of wyrds in the blink of an eye.',
    staminaGain: 6,
    autoFeatures: () => [
      { name: 'Grand Wyrding', text: 'You can use your Wyrding feature as a main action.' },
    ],
    choices: [
      { id: 'essence-11b', label: 'New 11-Essence Ability', help: 'Choose another 11-essence ability (or one you skipped at 8th).', kind: 'ability', options: ES_11B },
    ],
  },
  10: {
    summary: 'You become one with your element — essence made flesh.',
    staminaGain: 6,
    autoCharacteristicIncrease: { Reason: 5, max: true },
    autoFeatures: ({ sub }) => [
      { name: 'Characteristic Increase', text: 'Your Reason increases to 5, and one other characteristic increases by 1 (to a max of 5).' },
      { name: 'Breath', text: 'You gain the epic resource breath equal to the XP you earn each respite. Spend any number of breath (no action) to gain essence. Breath remains until spent.' },
      { name: 'Essential Being', text: 'When you gain essence at the start of your turns in combat, you gain 4 instead of 3.' },
      { name: 'One', text: 'You become the embodiment of your element; elemental motes flit around you and your magic reaches its purest form.' },
      ...(MASTER_BY_SPEC[sub] ? [MASTER_BY_SPEC[sub]] : []),
    ],
    choices: [
      { id: 'perk-10', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'skill-10', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
};
