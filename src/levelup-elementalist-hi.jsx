// levelup-elementalist-hi.jsx — Elementalist level-up data, levels 5–10 (extends existing 2–4).
// Specializations: earth / fire / green / void · Resource: Essence · staminaPer 6.

const PERK_ANY = ['crafting','exploration','interpersonal','intrigue','lore','supernatural'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Perk', body: '' }));
const SKILL_ANY = ['crafting','exploration','interpersonal','intrigue','lore'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Skill', body: '' }));
const tr = (t1, t2, t3) => [['\u2264 11', t1], ['12\u201316', t2], ['17+', t3]];
const es = (n, name, flavor, effect, extra) => ({ name, cost: n, resource: 'Essence', flavor, type: 'Main action', keywords: ['Magic','Ranged'], distance: 'Ranged 10', target: 'One creature', effect, ...extra });

// 10th level: the capstone feature of your elemental specialization.
const MASTER_BY_SPEC = {
  earth: { name: 'Master of Earth', text: 'You have damage immunity 5.\n\nAdditionally, as a respite activity, you can shape the mundane earth around you in a 1-mile radius. You can open sinkholes, form mountains, level mundane structures or whole settlements, create canyons, raise islands or sink them in the sea, and perform similar feats. You can\'t use this respite activity if another creature within 1 mile is already using it. Once you use this respite activity, you can\'t use it again for 10 days.' },
  fire:  { name: 'Master of Fire', text: 'The damage bonus of your Acolyte of Fire feature increases to +5 and applies to all your magic abilities.\n\nAdditionally, your Return to Formlessness ability can be used on supernatural objects (but not on artifacts). When you melt a treasure (see Chapter 13: Rewards), you gain breath equal to its echelon.' },
  green: { name: 'Master of Green', text: 'The number of Recoveries you have increases by 2, and each time you finish a respite, you can grant each ally who finished the respite with you 2 additional Recoveries. Your allies\' additional Recoveries disappear when they finish their next respite.\n\nAdditionally, as a respite activity, you can perform a ritual that causes a fruit tree to spring from the ground, grow, mature, and produce 1d6 of a treasure called Life Fruit. You can use a respite activity to cause an existing tree to produce another 1d6 Life Fruit, but it does not grow these magic consumables on its own.\n\nAs a maneuver, a creature can consume a Life Fruit or feed it to an adjacent willing ally. When a creature eats a Life Fruit, they restore all their Stamina, they can end all conditions or effects on themself, and they can stand up if prone. Additionally, if the creature desires, their aging pauses for 1d10 years. If the creature eats additional Life Fruit and chooses to pause their aging, the effects don\'t stack. Instead, the creature gains the benefit from the Life Fruit that pauses their aging for the longest time.' },
  void:  { name: 'Master of Void', text: 'Whenever you willingly move, you can teleport. Additionally, your mind is connected to the mystery and helps you find the answers you seek. You no longer require project sources for research projects. Whenever you use a respite activity to make a project roll for a research project, you automatically complete the project.' },
};

const ES_9 = () => [
  es(9, 'Combustion Deferred', 'Your flames dance from kindling to kindling to kindling.', 'When the target ends their next turn, or if they drop to 0 Stamina before then, each enemy adjacent to them takes fire damage equal to twice your Reason score. Each affected enemy then gains this same effect.', { target: 'One creature or object', keywords:['Magic','Ranged','Strike','Fire'], powerRoll:'Reason', tiers:tr('8 + R fire damage','13 + R fire damage','17 + R fire damage') }),
  es(9, 'Storm of Sands', 'Dirt and debris swirl into a dark, pulsing hurricane.', 'The area lasts until the start of your next turn. It is difficult terrain for enemies, and you and your allies have concealment while in the area.\n\n**Persistent 1**: The area remains until the start of your next turn, and you can move it up to 5 squares (no action required). As a maneuver, you can make the power roll again without spending essence.', { keywords:['Area','Magic','Ranged','Earth'], distance:'4 cube within 10', target:'Each enemy in the area', powerRoll:'Reason', tiers:tr('2 damage','5 damage','7 damage') }),
  es(9, 'Subverted Perception of Space', 'You rip an enemy\u2019s world in twain.', '**Persistent 1**: The target’s limited line of effect lasts until the start of your next turn.', { target: 'One creature or object', keywords:['Magic','Ranged','Strike','Void'], powerRoll:'Reason', tiers:tr('9 + R corruption damage','10 + R corruption damage; the target has line of effect only to creatures and objects within 4 squares of them until the start of your next turn','15 + R corruption damage; the target has line of effect only to adjacent creatures and objects until the start of your next turn') }),
  es(9, 'Web of All That\u2019s Come Before', 'Threads you’ve been weaving through your adventures create a vibrant, pearlescent web.', 'The area is difficult terrain until the start of your next turn. Each enemy who ends their turn in the area is restrained (save ends).\n\n**Persistent 1**: The area remains until the start of your next turn.', { keywords:['Area','Magic','Ranged','Green'], distance:'4 cube within 10', target:'Each enemy in the area', powerRoll:'Reason', tiers:tr('2 corruption damage; A < WEAK, restrained (save ends)','3 corruption damage; A < AVERAGE, restrained (save ends)','5 corruption damage; A < STRONG, restrained (save ends)') }),
];
const ES_9B = () => [
  es(9, 'Luminous Champion Aloft', 'They shine vibrantly, a beautiful diamond in the night sky.', 'The target has a +3 bonus to speed, they can fly, and their abilities ignore concealment. Additionally, whenever the target gains their Heroic Resource, they gain 1 additional Heroic Resource.\n\nThis effect lasts until the start of your next turn.\n\n**Persistent 1**: The effect lasts until the start of your next turn.', { type: 'Maneuver', keywords:['Magic','Ranged','Fire','Green','Void'], target:'Self or one ally' }),
  es(9, 'Magma Titan', 'Their body swells with lava, mud, and might, towering over their enemies.', 'Until the start of your next turn, the target has the following benefits:\n\n**Persistent 2:** The effect lasts until the start of your next turn. Additionally, at the start of your turn, the target can spend 2 Recoveries.', { type: 'Maneuver', keywords:['Magic','Ranged','Earth','Fire','Green'], target:'Self or one ally' }),
  es(9, 'Meteor', 'You teleport the target into the air and let the ground and the elemental force of fire do the rest.', 'If the target is teleported to a space where they would fall, they immediately do so, treating the fall as if their Agility score were 0. The target takes fire damage from the fall, and each enemy within 3 squares of where they land takes the same amount of fire damage.\n\nThe ground within 3 squares of where the target lands is difficult terrain.', { target: 'One creature or object', keywords:['Magic','Ranged','Earth','Fire','Void'], powerRoll:'Reason', tiers:tr('You teleport the target up to 4 squares.','You teleport the target up to 6 squares.','You teleport the target up to 8 squares.') }),
  es(9, 'The Wode Remembers and Returns', 'You create a terrarium that spans from canopy above to underbrush below.', 'The area becomes dark and verdant, with trees and plant life appearing in unoccupied spaces within it until the start of your next turn. The area is difficult terrain for enemies, and any ally who ends their turn in the area has cover.\n\n**Persistent 2**: The area remains until the start of your next turn. Additionally, at the start of your turn, each ally in the area can spend a Recovery.', { keywords:['Area','Magic','Earth','Green','Void'], distance:'4 burst', target:'Special' }),
];
const ES_11 = () => [
  es(11, 'Heart of the Wode', 'You call forth one of the Great Tree’s many splinters to provide for your every need.', 'A size 5 tree appears in an unoccupied space within distance. The tree has 100 Stamina and can\'t be force moved. You and any ally can touch the tree to use the Catch Breath maneuver as a free maneuver. Additionally, when you start your turn with line of effect to the tree, you can end one effect on yourself that is ended by a saving throw or that ends at the end of your turn, or you can stand up if you are prone. Each ally within distance also gains this benefit.', { keywords:['Magic','Ranged','Green'], target:'Special' }),
  es(11, 'Muse of Fire', 'The fire burns hot enough to sear the face of any god watching.', 'The Director’s Malice can become negative as a result of this ability.', { keywords:['Area','Magic','Ranged','Fire'], distance:'5 cube within 10', target:'Each enemy in the area', powerRoll:'Reason', tiers:tr('7 fire damage; the Director loses 2 Malice (see *Draw Steel: Monsters*)','10 fire damage; the Director loses 3 Malice','15 fire damage; the Director loses 4 Malice') }),
  es(11, 'Return to Oblivion', 'You create a tear in reality that could consume everything.', 'You create a size 1L vortex that lasts until the end of the encounter. At the start of each combat round while the vortex is unoccupied, the vortex vertical pulls 3 each enemy within 5 squares of it. Each enemy who enters the vortex or starts their turn there is knocked prone. At the end of the round, if a winded enemy who is not a leader or solo creature is in the vortex, they are instantly destroyed.', { keywords:['Area','Magic','Ranged','Void'], distance:'Ranged 10', target:'Special' }),
  es(11, 'World Torn Asunder', 'You stomp your foot and quake the whole world over.', 'You create a fissure in the ground adjacent to you that is a 10 x 2 line and 6 squares deep. Each creature in the area who is prone and size 2 or smaller falls in. Other creatures can enter the fissure or can shift to the nearest unoccupied space of their choice outside it.', { keywords:['Area','Magic','Earth'], distance:'5 burst', target:'Each enemy in the area', powerRoll:'Reason', tiers:tr('M < WEAK, prone','M < AVERAGE, prone','M < STRONG, prone') }),
];
const ES_11B = () => [
  es(11, 'Earth Rejects You', 'Everyone and everything gets blown away in an eruption of rocks and debris.', '**Persistent 2**: At the start of your turn, you can use a maneuver to use this ability again without spending essence.', { keywords:['Area','Magic','Ranged','Earth'], distance:'5 cube within 10', target:'Each enemy and object in the area', powerRoll:'Reason', tiers:tr('6 damage','9 damage','13 damage') }),
  es(11, 'The Green Defends Its Servants', 'A luminous green shield shows its true beauty the more it cracks.', 'You conjure an elemental shield that protects the target until the end of your next turn. While the shield is active, the target can take the Defend main action as a maneuver on each of their turns. The target gains 30 temporary Stamina that lasts until depleted or until the effect ends. If this temporary Stamina disappears, the effect ends and the shield explodes, dealing 10 damage to each enemy within 5 squares of the target.\n\n**Persistent 2**: The effect lasts until the start of your next turn.', { type: 'Maneuver', keywords:['Magic','Ranged','Green'], target:'Self or one ally' }),
  es(11, 'Prism', 'You split your essence, allowing you to cast multiple effects at once.', 'You use up to three heroic abilities whose essence costs total 11 or less, spending no additional essence beyond the cost of this ability. You can shift up to 2 squares between your use of each ability.', { keywords:['Magic','Void'], type:'Main action', distance:'Self', target:'Self' }),
  es(11, 'Unquenchable Fire', 'You let fly a fiery missile braided with pure primal energy.', 'This damage ignores immunity.', { target: 'One enemy or object', keywords:['Magic','Ranged','Strike','Fire'], powerRoll:'Reason', tiers:tr('13 + R fire damage; I < WEAK, dazed (save ends)','18 + R fire damage; I < AVERAGE, dazed (save ends)','25 + R fire damage; I < STRONG, dazed (save ends)') }),
];

const SPEC_FEAT_5 = {
  earth: [{ name: 'The Mountain Does Not Move', text: 'You stand firm and magnetize your allies to stay grounded. Your stability increases by your level.\n\nAdditionally, whenever an ally within distance of your Hurl Element ability is force moved, you can use a free triggered action to decrease your stability down to a minimum of 0, then increase the ally\'s stability by an amount equal to the stability you lost. This change lasts until the end of the round.' }],
  fire: [{ name: 'Smoldering Step', text: 'You can use 1 square of movement to walk into an area of fire your size or larger and teleport to any other area of fire your size or larger within 10 squares of the first area.\n\nAdditionally, whenever you use a fire ability or are targeted by an ability that deals fire damage, each enemy adjacent to you takes fire damage equal to your Reason score.' }],
  green: [{ name: 'Hide of Tenfold Shields', text: 'Your animal forms become hardier. You gain temporary Stamina equal to your level when you enter an animal form in combat, which is added to any temporary Stamina provided by the animal form.\n\nAdditionally, an adjacent ally can use a maneuver to pet you. If they do so, you can lose temporary Stamina down to a minimum of 0. The ally gains temporary Stamina equal to the amount you lost.' }],
  void: [{ name: 'Pierce the Veil of Substance', text: 'Solidity is merely a suggestion to you. Mundane barriers that are 1 square thick or less do not block your senses or line of effect. You can only sense or have line of effect past one such barrier at a time.\n\nAdditionally, whenever you use a void ability, you or one ally within distance of the ability can teleport a number of squares equal to your Reason score.' }],
};
const SPEC_ABILITY_AUTO_8 = {
  earth: [
    { name: 'Summon Source of Earth', noBadge: true,
      flavor: 'The ground rumbles as an elemental bursts forth, ready to serve.',
      keywords: ['Earth', 'Magic', 'Ranged'], type: 'Main action', distance: 'Ranged 10', target: 'Special',
      effect: 'A **source of earth** emerges from an unoccupied space within distance. The source takes their turn immediately after you, moving up to their speed and either taking a main action or a maneuver. The source is dismissed at the start of your next turn.\n\n**Persistent 2:** The source takes another turn. They are dismissed at the start of your next turn.' },
  ],
};
const SPEC_FEAT_8 = {
  earth: [],
  fire: [{ name: 'The Flame Primordial', text: 'You produce a fire that entrances the fates, distracting them from aiding your foes. Whenever you deal fire damage to a creature or object, they take an extra 1d6 fire damage. If you deal fire damage to a mundane object, you can use a free triggered action to target it with your Return to Formlessness ability instead.\n\nAdditionally, any enemy who starts their turn adjacent to you has fire weakness equal to your Reason score until the start of their next turn. This increases to twice your Reason score if the enemy is made of or is wearing mostly metal.' }],
  green: [{ name: 'Chimeric Manifestation', text: 'Nature isn\'t static and unchanging, and neither are you. You can enter or exit your animal form as a free maneuver the first time you use your Disciple of the Green feature on your turn.\n\nAdditionally, whenever you use your Disciple of the Green feature, you can select an additional animal form and gain the positive benefits from both forms. You can choose the size of either animal, and if both animal forms grant you the same benefit, you can choose whichever you prefer. You gain the highest speed between the two animal forms and have all types of movement from both forms.\n\nYou can only combine animal forms whose levels add up to 12 or less. For example, you can combine a shark (8th level) with a horse (4th level), but you can\'t combine a shark with a bear (5th level).' }],
  void: [{ name: 'Black Hole Star', text: 'You warp gravity around your heavenly body and can pull even the sturdiest titans toward your core. At the end of each of your turns, you target one creature or object within distance of your Hurl Element ability and vertical pull that target up to 5 squares. If their stability reduces this forced movement, they are pulled a minimum of 2 squares. This forced movement ignores stability for your allies.\n\nAdditionally, your Mantle of Essence improves. While in the area of the aura, enemies and objects have their stability reduced by an amount equal to your level.' }],
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
      { name: 'Wyrding', text: 'You can spend 10 uninterrupted minutes to create a freeform magic spell for a variety of situations. Choose one of the following magical effects:\n\n- You create a mundane object of a size equal to your Reason score or smaller.\n- You construct a place of shelter suitable for twenty creatures that lasts for 24 hours and can’t be detected by enemies.\n- You restore all Stamina to a mundane object of a size equal to your Reason score or smaller.\n- Choose a cube with a size up to your Reason score within 5 squares. You can fill that area with difficult terrain or natural phenomena such as fire, water, or plant life, or can clear the area of those things.\n- You can preserve a corpse or up to 5 pounds of food for a week, or can cause a corpse or that amount of food to instantly rot.\n- You create a seal on a surface that can’t be seen or felt by anyone but you. When a creature comes adjacent to the surface, you can see and hear through the seal for as long as the creature remains adjacent to it. When you create the seal, you can decide to limit the number of creatures who activate it by choosing a creature keyword (such as Undead) or a specific name (such as Ajax the Invincible) or organization (such as the Black Iron Pact). If you do, the seal alerts you only when creatures with the keyword, name, or organizational affiliation you provide pass by it. If you create a second seal, the first one disappears. You can dispel a seal at any time (no action required).' },
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
      { name: 'Characteristic Increase', text: 'Each of your characteristic scores increases by 1, to a maximum of 4.' },
      { name: 'Mantle of Quintessence', text: 'Your Mantle of Essence feature no longer requires essence.\n\nAdditionally, your Mantle of Essence now radiates magic that creates a calming air. Creatures in the area of the mantle\'s aura have their starting patience increased by 1 (to a maximum of 5) during any negotiation. While in the area, you and any ally gain an edge on tests that use the Handle Animals skill. If you have 5 or more Victories, the bonus to patience increases to 2 and tests that use the Handle Animals skill have a double edge.' },
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
    autoAbilities: ({ sub }) => SPEC_ABILITY_AUTO_8[sub] || [],
    choices: [
      { id: 'perk-8', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'essence-11', label: '11-Essence Ability', help: 'Choose one heroic ability that costs 11 essence.', kind: 'ability', options: ES_11 },
    ],
  },
  9: {
    summary: 'You master the shaping of wyrds in the blink of an eye.',
    staminaGain: 6,
    autoFeatures: () => [
      { name: 'Grand Wyrding', text: 'You have mastered the magic of shaping a wyrd, and can use your Wyrding feature as a main action.\n\nAdditionally, when you have 5 or more Victories, choose one of the following damage types: acid, cold, corruption, fire, lightning, poison, or sonic. You have immunity all to that type.' },
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
      { name: 'Characteristic Increase', text: 'Your Reason score increases to 5. Additionally, you can increase one of your characteristic scores by 1, to a maximum of 5.' },
      { name: 'Breath', text: 'You have an epic resource called breath. Each time you finish a respite, you gain breath equal to the XP you gain. You can spend any number of breath to gain essence (no action required). When you do, 1 breath becomes 3 essence.\n\nBreath remains until you convert it to essence.' },
      { name: 'Essential Being', text: 'When you gain essence at the start of each of your turns during combat, you gain 4 essence instead of 3.' },
      { name: 'One', text: 'You become the embodiment of the element of your chosen specialization. Whenever you use magic, elemental motes flit around you and your skin changes to reflect your element, taking on an earthen or stony appearance for earth, appearing like flickering flame for fire, gaining a leaf pattern for green, and becoming a starry expanse for void.\n\nAdditionally, you gain your specialization’s Master feature, shown below.' },
      ...(MASTER_BY_SPEC[sub] ? [MASTER_BY_SPEC[sub]] : []),
    ],
    choices: [
      { id: 'perk-10', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'skill-10', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
};
