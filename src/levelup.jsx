import React from 'react';
import { OrnDivider, GlyphRow, renderRich, Button, H3, H4Meta, Modal, AbilityCard } from './theme.jsx';
import { MQ } from './theme/breakpoints.js';
import { classDef, collectSkillPicks, collectPerkPicks, computeDerived } from './app.jsx';
import {
  DOMAIN_1ST_FEATURES, DOMAIN_2_ABILITIES, DOMAIN_4_FEATURES,
} from './data/conduit-domains.js';
// Per-class level-up tables defined in their own modules. Imported (not window-
// installed) so registration is deterministic and survives HMR re-evaluation.
import { troubadour } from './levelup-troubadour.jsx';
import { shadow } from './levelup-shadow.jsx';
import { nul } from './levelup-null.jsx';
import { tactician } from './levelup-tactician.jsx';
import { talent } from './levelup-talent.jsx';
import { furyHi } from './levelup-fury-hi.jsx';
import { conduitHi } from './levelup-conduit-hi.jsx';
import { elementalistHi } from './levelup-elementalist-hi.jsx';
import { summoner } from './levelup-summoner.jsx';
import { beastheart } from './levelup-beastheart.jsx';
// levelup.jsx — Level-up data + flow for Fury and Conduit, levels 1–4.
// Exposes to window: LEVELUP_DATA, LevelUpFlow.

// ─────────────────────────────────────────────────────────────────────────────
// Ability factory — concise compared to the data.jsx version. Tiers are an array.
// ─────────────────────────────────────────────────────────────────────────────
const ab = (name, props) => ({ name, ...props });

// ─────────────────────────────────────────────────────────────────────────────
// LEVELUP_DATA[classId][level] = { summary, autoFeatures[], staminaGain, choices[] }
// Each choice descriptor:
//   { id, label, help, kind, options }
//     kind = 'ability' | 'feature' | 'perk' | 'skill' | 'characteristic'
//     options = array (or function of character → array) of:
//       - { id, name, body }                       (for feature/perk/skill)
//       - ability-shaped object                     (for ability)
// dependsOn (optional) restricts options based on character state.
// ─────────────────────────────────────────────────────────────────────────────

// Shared option lists (declared before LEVELUP_DATA — referenced eagerly within it).
const ALL_CENSOR_DOMAINS = ['Creation','Death','Fate','Knowledge','Life','Love','Nature','Protection','Storm','Sun','Trickery','War'];
const ANY_PERK_OPTIONS = [
  { id: 'crafting',     name: 'Crafting Perk',     body: '' },
  { id: 'exploration',  name: 'Exploration Perk',  body: '' },
  { id: 'interpersonal',name: 'Interpersonal Perk',body: '' },
  { id: 'intrigue',     name: 'Intrigue Perk',     body: '' },
  { id: 'lore',         name: 'Lore Perk',         body: '' },
  { id: 'supernatural', name: 'Supernatural Perk', body: '' },
];
const ANY_SKILL_OPTIONS = [
  { id: 'crafting',     name: 'Crafting Skill',     body: '' },
  { id: 'exploration',  name: 'Exploration Skill',  body: '' },
  { id: 'interpersonal',name: 'Interpersonal Skill',body: '' },
  { id: 'intrigue',     name: 'Intrigue Skill',     body: '' },
  { id: 'lore',         name: 'Lore Skill',         body: '' },
];

const LEVELUP_DATA = {
  // ═══════════════════════════════════════════════════════════════════════════
  // CENSOR — Exorcist / Oracle / Paragon · Wrath · levels 2–10
  // ═══════════════════════════════════════════════════════════════════════════
  censor: {
    2: {
      summary: 'Your order tempers your wrath into discipline; the will of your god sharpens within you.',
      staminaGain: 9,
      autoFeatures: ({ sub }) => CENSOR_ORDER_FEATURES_2[sub] || [],
      choices: [
        {
          id: 'perk',
          label: 'Perk',
          help: 'Choose one interpersonal, lore, or supernatural perk.',
          kind: 'perk',
          options: [
            { id: 'interpersonal', name: 'Interpersonal Perk', body: 'A boon for the table and the court — patience, presence, persuasion.' },
            { id: 'lore',          name: 'Lore Perk',          body: 'A boon for the studious — texts, languages, secrets.' },
            { id: 'supernatural',  name: 'Supernatural Perk',  body: 'A boon at the edge of the natural world.' },
          ],
        },
        {
          id: 'order-ability-2',
          label: '2nd-Level Order Ability',
          help: 'Your censor order grants your choice of one of two heroic abilities.',
          kind: 'ability',
          options: ({ sub }) => CENSOR_ORDER_ABILITIES_2[sub] || [],
        },
      ],
    },
    3: {
      summary: 'Your judgment grows in divine power, and the dread of it settles on the guilty.',
      staminaGain: 9,
      autoFeatures: () => [
        { name: 'Look On My Work and Despair', text: 'Your judgment has grown in divine power, instilling fear in those you condemn. Whenever you use your Judgment ability, you can spend 1 wrath, and if the target has P < AVERAGE, they are frightened of you (save ends). Additionally, whenever a creature judged by you is reduced to 0 Stamina and you use Judgment as a free triggered action, if the new target has P < STRONG, they are frightened of you (save ends). If the target is already frightened of you, they instead take holy damage equal to twice your Presence score.' },
      ],
      choices: [
        {
          id: 'wrath-7',
          label: '7-Wrath Ability',
          help: 'Choose one heroic ability that costs 7 wrath to use.',
          kind: 'ability',
          options: () => CENSOR_WRATH_7,
        },
      ],
    },
    4: {
      summary: 'The gods harden your body and your wrath answers faster to the blood you spill.',
      staminaGain: 9,
      autoFeatures: () => [
        { name: 'Characteristic Increase', text: 'Your Might and Presence scores each increase to 3.' },
        { name: 'Wrath Beyond Wrath',      text: 'The first time each combat round that you deal damage to a creature judged by you, you gain 2 wrath instead of 1.' },
      ],
      autoCharacteristicIncrease: { Might: 3, Presence: 3, max: true },
      choices: [
        {
          id: 'perk-4',
          label: 'Perk',
          help: 'Choose any perk.',
          kind: 'perk',
          options: ANY_PERK_OPTIONS,
        },
        {
          id: 'skill-4',
          label: 'Skill',
          help: 'Choose any skill from any skill group.',
          kind: 'skill-group',
          options: ANY_SKILL_OPTIONS,
        },
        {
          id: 'domain-feature-4',
          label: '4th-Level Domain Feature',
          help: 'You gain the 4th-level feature of your domain.',
          kind: 'feature',
          options: (ctx) => censorDomainFeatureOptions(ctx, CENSOR_DOMAIN_4),
        },
      ],
    },
    5: {
      summary: 'Your order reveals a deeper rite, and your wrath swells to a terrible peak.',
      staminaGain: 9,
      autoFeatures: ({ sub }) => CENSOR_ORDER_FEATURE_5[sub] ? [CENSOR_ORDER_FEATURE_5[sub]] : [],
      choices: [
        {
          id: 'wrath-9',
          label: '9-Wrath Ability',
          help: 'Choose one heroic ability that costs 9 wrath to use.',
          kind: 'ability',
          options: () => CENSOR_WRATH_9,
        },
      ],
    },
    6: {
      summary: 'You consecrate a weapon as an instrument of divine wrath that scours the wicked.',
      staminaGain: 9,
      autoFeatures: () => [
        { name: 'Implement of Wrath', text: 'Each time you finish a respite, you can choose one hero\'s weapon, including your own, to channel supernatural power as an implement of your god\'s wrath. The weapon becomes magic and gains the following benefits until your next respite:\n\n- Strikes with the weapon deal extra holy damage equal to the wielder\'s highest characteristic score.\n- Any creature struck by the weapon who has holy weakness and has P < STRONG is frightened and weakened (save ends).\n- Any minion targeted by a strike using the weapon dies. That minion\'s Stamina maximum is removed from the minion Stamina pool before any damage is applied to the rest of the squad.\n- The weapon\'s wielder can\'t be made frightened.' },
      ],
      choices: [
        {
          id: 'perk-6',
          label: 'Perk',
          help: 'Choose one interpersonal, lore, or supernatural perk.',
          kind: 'perk',
          options: [
            { id: 'interpersonal', name: 'Interpersonal Perk', body: 'A boon for the table and the court.' },
            { id: 'lore',          name: 'Lore Perk',          body: 'A boon for the studious.' },
            { id: 'supernatural',  name: 'Supernatural Perk',  body: 'A boon at the edge of the natural world.' },
          ],
        },
        {
          id: 'order-ability-6',
          label: '6th-Level Order Ability',
          help: 'Your censor order grants your choice of one of two heroic abilities.',
          kind: 'ability',
          options: ({ sub }) => CENSOR_ORDER_ABILITIES_6[sub] || [],
        },
      ],
    },
    7: {
      summary: 'Every part of you grows in divine strength, and wrath floods you turn after turn.',
      staminaGain: 9,
      autoFeatures: () => [
        { name: 'Characteristic Increase', text: 'Each of your characteristic scores increases by 1, to a maximum of 4.' },
        { name: 'Focused Wrath',           text: 'When you gain wrath at the start of each of your turns during combat, you gain 3 wrath instead of 2.' },
      ],
      autoCharIncreaseAll: { delta: 1, max: 4 },
      choices: [
        {
          id: 'domain-feature-7',
          label: '7th-Level Domain Feature',
          help: 'You gain the 7th-level feature of your domain.',
          kind: 'feature',
          options: (ctx) => censorDomainFeatureOptions(ctx, CENSOR_DOMAIN_7),
        },
        {
          id: 'skill-7',
          label: 'Skill',
          help: 'Choose any skill from any skill group.',
          kind: 'skill-group',
          options: ANY_SKILL_OPTIONS,
        },
      ],
    },
    8: {
      summary: 'Your order entrusts you with its highest secret, and your wrath reaches its zenith.',
      staminaGain: 9,
      autoFeatures: ({ sub }) => CENSOR_ORDER_FEATURE_8[sub] ? [CENSOR_ORDER_FEATURE_8[sub]] : [],
      choices: [
        {
          id: 'perk-8',
          label: 'Perk',
          help: 'Choose any perk.',
          kind: 'perk',
          options: ANY_PERK_OPTIONS,
        },
        {
          id: 'wrath-11',
          label: '11-Wrath Ability',
          help: 'Choose one heroic ability that costs 11 wrath to use.',
          kind: 'ability',
          options: () => CENSOR_WRATH_11,
        },
      ],
    },
    9: {
      summary: 'Your implement of wrath becomes a bulwark of grace for those who fight beside you.',
      staminaGain: 9,
      autoFeatures: () => [
        { name: 'Improved Implement of Wrath', text: 'The weapon you target with your Implement of Wrath feature gains the following additional benefits:\n\n- The weapon\'s wielder and each ally adjacent to them gain a +2 bonus to saving throws.\n- At the end of each of the weapon wielder\'s turns, each ally adjacent to the wielder makes a saving throw against each effect on them that is ended by a saving throw.\n- The weapon\'s wielder has corruption immunity 10.' },
      ],
      choices: [
        {
          id: 'order-ability-9',
          label: '9th-Level Order Ability',
          help: 'Your censor order grants your choice of one of two heroic abilities.',
          kind: 'ability',
          options: ({ sub }) => CENSOR_ORDER_ABILITIES_9[sub] || [],
        },
      ],
    },
    10: {
      summary: 'You become your god\u2019s justice made manifest \u2014 a templar drawing on virtue itself.',
      staminaGain: 9,
      autoFeatures: () => [
        { name: 'Characteristic Increase', text: 'Your Might and Presence scores each increase to 5.' },
        { name: 'Templar', text: 'You are the ultimate representation of your god\'s justice in the timescape. Whenever you use your Judgment ability, you can use a free triggered action to use a conduit domain effect (see Domain Piety and Effects in the Conduit section) associated with your chosen domain, or a domain you access with virtue (see below). If the effect calls for the use of your Intuition score, you use your Presence score instead. If the effect uses your conduit level, use your censor level instead.\n\nAdditionally, whenever you take a respite, you can open a portal to rest in the presence of your deity and bring along any allies. When you do, you can ask your deity three questions, which the Director must answer honestly if your deity knows the answers (though they might answer cryptically or incompletely). When you finish your respite, you and your allies can appear at any location in the timescape where someone worships your deity.\n\nWhile you rest in their presence, your god might also give you priority targets to enact justice upon. You and your allies each have a double edge on power rolls made against such targets. If you attempt to open a portal to your deity again before you have defeated your priority targets, you suffer your god\'s wrath, as determined by the Director.' },
        { name: 'Virtue', text: 'You have an epic resource called virtue. Each time you finish a respite, you gain virtue equal to the XP you gain. You can spend virtue on your abilities as if it were wrath.\n\nAdditionally, you can spend 3 virtue to access one of your deity\'s domains that you usually don\'t have access to. When you do, you can use that domain\'s features until you finish another respite.\n\nVirtue remains until you spend it.' },
        { name: 'Wrath of the Gods', text: 'When you gain wrath at the start of each of your turns during combat, you gain 4 wrath instead of 3.' },
      ],
      autoCharacteristicIncrease: { Might: 5, Presence: 5, max: true },
      choices: [
        {
          id: 'perk-10',
          label: 'Perk',
          help: 'Choose one crafting, lore, or supernatural perk.',
          kind: 'perk',
          options: [
            { id: 'crafting',     name: 'Crafting Perk',     body: 'A boon tied to making and mending.' },
            { id: 'lore',         name: 'Lore Perk',         body: 'A boon for the studious.' },
            { id: 'supernatural', name: 'Supernatural Perk', body: 'A boon at the edge of the natural world.' },
          ],
        },
        {
          id: 'skill-10',
          label: 'Skill',
          help: 'Choose any skill from any skill group.',
          kind: 'skill-group',
          options: ANY_SKILL_OPTIONS,
        },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FURY — Berserker / Reaver / Stormwight
  // ═══════════════════════════════════════════════════════════════════════════
  fury: {
    2: {
      summary: 'Your aspect grows; your fury crystallises into new forms.',
      staminaGain: 9,
      autoFeatures: ({ sub }) => [
        sub === 'berserker' && {
          name: 'Unstoppable Force', text: 'Whenever you use the Charge main action, you can use a strike signature ability or a strike heroic ability instead of a free strike. Additionally, you can jump as part of your charge.',
        },
        sub === 'reaver' && {
          name: 'Inescapable Wrath', text: 'You have a bonus to speed equal to your Agility score, and you ignore difficult terrain.',
        },
        sub === 'stormwight' && {
          name: 'Tooth and Claw', text: 'At the end of each of your turns, each enemy adjacent to you takes damage equal to your Might score.',
        },
      ].filter(Boolean),
      autoAbilities: ({ sub }) => ({
        berserker: [
          ab('Special Delivery', {
            cost: 5, resource: 'Ferocity', flavor: 'You ready?',
            keywords: ['Melee', 'Weapon'], type: 'Maneuver',
            distance: 'Melee 1', target: 'One willing ally',
            effect: 'You vertically push the target up to 4 squares. This forced movement ignores the target\u2019s stability, and the target takes no damage from colliding with creatures or objects. At the end of this movement, the target can make a free strike that deals extra damage equal to your Might score.',
          }),
          ab('Wrecking Ball', {
            cost: 5, resource: 'Ferocity', flavor: 'It\u2019s easier to destroy than to create. Much easier, in fact!',
            keywords: ['Melee', 'Weapon'], type: 'Maneuver',
            distance: 'Self; see below', target: 'Self',
            tiers: { t1: 'push 1', t2: 'push 2', t3: 'push 3' },
            effect: 'You move up to your speed in a straight line. During this movement, you can move through mundane structures, including walls, which are difficult terrain for you. You automatically destroy each square of structure you move through and leave behind a square of difficult terrain.',
          }),
        ],
        reaver: [
          ab('Death ... Death!', {
            cost: 5, resource: 'Ferocity', flavor: 'Your unbridled rage strikes terror in their hearts.',
            keywords: ['Melee', 'Strike', 'Weapon'], type: 'Main action',
            distance: 'Melee 1', target: 'One creature',
            tiers: {
              t1: '3 + M damage; P < WEAK, dazed and frightened (save ends)',
              t2: '5 + M damage; P < AVERAGE, dazed and frightened (save ends)',
              t3: '8 + M damage; P < STRONG, dazed and frightened (save ends)',
            },
          }),
          ab('Phalanx-Breaker', {
            cost: 5, resource: 'Ferocity', flavor: 'Organizing your forces like feckless creatures of Law. Pitiful.',
            keywords: ['Melee', 'Weapon'], type: 'Main action',
            distance: 'Self; see below', target: 'Self',
            tiers: { t1: '2 damage; A < WEAK, dazed (save ends)', t2: '4 damage; A < AVERAGE, dazed (save ends)', t3: '6 damage; A < STRONG, dazed (save ends)' },
            effect: 'You shift up to your speed and make one power roll that targets up to three enemies you move adjacent to during this shift.',
          }),
        ],
        stormwight: [
          ab('Apex Predator', {
            cost: 5, resource: 'Ferocity', flavor: 'I will hunt you down.',
            keywords: ['Melee', 'Strike', 'Weapon'], type: 'Main action',
            distance: 'Melee 1', target: 'One creature',
            tiers: { t1: '4 + M damage; I < WEAK, slowed (save ends)', t2: '6 + M damage; I < AVERAGE, slowed (save ends)', t3: '10 + M damage; I < STRONG, slowed (save ends)' },
            effect: 'The target can\u2019t be hidden from you for 24 hours. Until the end of the encounter, whenever the target willingly moves, you can use a free triggered action to move.',
          }),
          ab('Visceral Roar', {
            cost: 5, resource: 'Ferocity', flavor: 'The sound of the storm within you staggers your opponents.',
            keywords: ['Area', 'Magic'], type: 'Main action',
            distance: '2 burst', target: 'Each enemy in the area',
            tiers: { t1: '2 damage; push 1; M < WEAK, dazed (save ends)', t2: '5 damage; push 2; M < AVERAGE, dazed (save ends)', t3: '7 damage; push 3; M < STRONG, dazed (save ends)' },
            effect: 'This ability deals your primordial damage type (see Stormwight Kits).',
          }),
        ],
      }[sub] || []),
      choices: [
        {
          id: 'perk',
          label: 'Perk',
          help: 'Choose one crafting, exploration, or intrigue perk group.',
          kind: 'perk',
          options: [
            { id: 'crafting',    name: 'Crafting Perk',    body: 'A boon tied to making and mending — favored tools, signature recipes, swift repair.' },
            { id: 'exploration', name: 'Exploration Perk', body: 'A boon for the road — pathfinding, weather sense, endurance, mounts.' },
            { id: 'intrigue',    name: 'Intrigue Perk',    body: 'A boon for the shadows — false identities, contacts, soft footfall.' },
          ],
        },
      ],
    },
    3: {
      summary: 'Your aspect roots deeper into your soul; the chaos pours through.',
      staminaGain: 9,
      autoFeatures: ({ sub }) => [
        sub === 'berserker' && {
          name: 'Immovable Object', text: 'You add your level to your effective size for the purpose of interacting with creatures and objects, including determining whether you can lift an object, are affected by forced movement, and so forth. This has no effect on whether you can be grabbed.\n\nAdditionally, you have a bonus to stability equal to your Might score.',
        },
        sub === 'reaver' && {
          name: 'See Through Their Tricks', text: 'You have a double edge on tests made to search for hidden creatures, discern hidden motives, or detect lies. You also have a double edge on tests made to gamble!',
        },
        sub === 'stormwight' && {
          name: 'Nature\u2019s Knight', text: 'You can speak with animals and elementals. Additionally, you automatically sense the presence of animals and elementals within 10 squares of you, even if they are hidden.\n\nWhen you are in a negotiation with an animal or elemental, you treat your Renown as 1 higher than usual. This stacks with the increase to your effective Renown in a negotiation with an animal of your type while in animal form (see Stormwight Kits).',
        },
      ].filter(Boolean),
      choices: [
        {
          id: 'ferocity-7',
          label: '7-Ferocity Ability',
          help: 'Choose one heroic ability that costs 7 ferocity to use.',
          kind: 'ability',
          options: () => [
            ab('Demon Unleashed', {
              cost: 7, resource: 'Ferocity', flavor: 'Foes tremble at the sight of you.',
              keywords: ['Magic'], type: 'Maneuver',
              distance: 'Self', target: 'Self',
              effect: 'Until the end of the encounter or until you are dying, each enemy who starts their turn adjacent to you and has P < STRONG is frightened until the end of their turn.',
            }),
            ab('Face the Storm!', {
              cost: 7, resource: 'Ferocity', flavor: 'Shocked in the face of your naked brutality, your enemy\u2019s instincts take over.',
              keywords: ['Magic'], type: 'Maneuver',
              distance: 'Self', target: 'Self',
              effect: 'Until the end of the encounter or until you are dying, each creature you make a melee strike against who has P < AVERAGE is taunted until the end of their next turn. Additionally, when you use an ability that deals rolled damage against any enemy taunted by you, the ability deals extra damage equal to twice your Might score and increases its potency by 1.',
            }),
            ab('Steelbreaker', {
              cost: 7, resource: 'Ferocity', flavor: 'See how useless their weapons are!',
              keywords: ['Magic'], type: 'Maneuver',
              distance: 'Self', target: 'Self',
              effect: 'You gain 20 temporary Stamina.',
            }),
            ab('You Are Already Dead', {
              cost: 7, resource: 'Ferocity', flavor: 'Slash. Walk away.',
              keywords: ['Melee', 'Strike', 'Weapon'], type: 'Main action',
              distance: 'Melee 1', target: 'One creature',
              effect: 'If the target is not a leader or solo creature, they are reduced to 0 Stamina at the end of their next turn. If the target is a leader or solo creature, you gain 3 surges and can make a melee free strike against them.',
            }),
          ],
        },
      ],
    },
    4: {
      summary: 'The Primordial Chaos answers your blood. Your strikes shake the earth.',
      staminaGain: 9,
      autoFeatures: () => [
        { name: 'Characteristic Increase', text: 'Your Might and Agility scores each increase to 3.' },
        { name: 'Damaging Ferocity',       text: 'The first time you take damage each combat round, you gain 2 ferocity instead of 1.' },
        { name: 'Growing Ferocity Improvement I', text: 'Your Growing Ferocity feature provides additional benefits when you have 8 or more ferocity.' },
        { name: 'Primordial Attunement',   text: 'As your ferocity manifests elemental forces created by the Primordial Chaos, you are aware of how elemental power interacts with those around you. You automatically sense whether any creature within 10 squares has damage immunity or damage weakness to acid, cold, corruption, fire, lightning, poison, or sonic damage, learning whether they have immunity or weakness, the value of that immunity or weakness, and the specific damage type. Additionally, you automatically sense any source of one of those damage types within 10 squares, such as a fire or a source of elemental power.' },
        { name: 'Primordial Strike',       text: 'You can manifest your ferocity directly as an elemental force created by the Primordial Chaos. As part of any strike, you can spend 1 ferocity to gain 1 surge that must be used for that strike. The extra damage dealt by the surge can be acid, cold, corruption, fire, lightning, poison, or sonic (your choice).' },
      ],
      // Apply characteristic increase automatically on apply.
      autoCharacteristicIncrease: { Might: 3, Agility: 3, max: true },
      choices: [
        {
          id: 'perk-4',
          label: 'Perk',
          help: 'Choose any perk.',
          kind: 'perk',
          options: [
            { id: 'crafting',     name: 'Crafting Perk',     body: '' },
            { id: 'exploration',  name: 'Exploration Perk',  body: '' },
            { id: 'interpersonal',name: 'Interpersonal Perk',body: '' },
            { id: 'intrigue',     name: 'Intrigue Perk',     body: '' },
            { id: 'lore',         name: 'Lore Perk',         body: '' },
            { id: 'supernatural', name: 'Supernatural Perk', body: '' },
          ],
        },
        {
          id: 'skill-4',
          label: 'Skill Increase',
          help: 'Choose any skill from any skill group.',
          kind: 'skill-group',
          options: [
            { id: 'crafting',     name: 'Crafting Skill',     body: 'Alchemy, Architecture, Blacksmithing, Carpentry, Cooking, Fletching, Forgery, Jewelry, Mechanics, or Tailoring.' },
            { id: 'exploration',  name: 'Exploration Skill',  body: 'Climb, Drive, Endurance, Gymnastics, Heal, Jump, Lift, Navigate, Ride, Swim, Track, or Handle Animals.' },
            { id: 'interpersonal',name: 'Interpersonal Skill',body: 'Brag, Empathize, Flirt, Gamble, Handle Animals, Interrogate, Intimidate, Lead, Lie, Music, Perform, Persuade, or Read Person.' },
            { id: 'intrigue',     name: 'Intrigue Skill',     body: 'Alertness, Concealment, Criminal Underworld, Disguise, Eavesdrop, Escape Artistry, Hide, Pick Lock, Pick Pocket, Sneak, or Track.' },
            { id: 'lore',         name: 'Lore Skill',         body: 'Culture, History, Magic, Monsters, Nature, Psionics, Religion, Rumors, Society, Strategy, Timescape, or Society.' },
          ],
        },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONDUIT — Domain-based caster
  // ═══════════════════════════════════════════════════════════════════════════
  conduit: {
    2: {
      summary: 'Your god\u2019s attention sharpens. The lists of heaven begin to open.',
      staminaGain: 6,
      autoFeatures: () => [
        { name: 'The Lists of Heaven', text: 'Your deity is aware of your growing influence, making it easier to draw their attention and power when you heal your allies. Whenever you allow another creature to spend a Recovery, you can also spend a Recovery.' },
      ],
      choices: [
        {
          id: 'perk-2',
          label: 'Perk',
          help: 'Choose one crafting, lore, or supernatural perk.',
          kind: 'perk',
          options: [
            { id: 'crafting',     name: 'Crafting Perk',     body: 'A boon tied to making and mending.' },
            { id: 'lore',         name: 'Lore Perk',         body: 'A boon for the studious — texts, languages, secrets.' },
            { id: 'supernatural', name: 'Supernatural Perk', body: 'A boon at the edge of the natural world.' },
          ],
        },
        {
          id: 'domain-feature-2',
          label: '2nd-Level Domain Feature',
          help: 'At 1st level you took the feature for one of your two domains. Now you gain the 1st-level feature of your other domain (and pick its skill).',
          kind: 'feature',
          options: ({ domains }) => domains.map(d => {
            const f = DOMAIN_1ST_FEATURES[d];
            return f ? { id: d, name: `${d}: ${f.name}`, body: f.text, ability: f.ability } : null;
          }).filter(Boolean),
          condition: ({ domains }) => domains && domains.length >= 2,
        },
        {
          id: 'domain-ability-2',
          label: '2nd-Level Domain Ability',
          help: 'Choose one of your domains. You gain a heroic ability from that domain.',
          kind: 'ability',
          options: ({ domains }) => domains.flatMap(d => DOMAIN_2_ABILITIES[d] || []),
        },
      ],
    },
    3: {
      summary: 'Your faith touches the boundary between life and death.',
      staminaGain: 6,
      autoFeatures: () => [
        { name: 'Minor Miracle', text: 'As a respite activity, you can perform a religious ritual and beseech the gods to restore a dead creature to life. You must have at least half the creature\'s remains, and they must have died within the last 24 hours from an effect that isn\'t age related. The creature\'s soul must be willing to return to life for the ritual to work. If they are not willing, you instinctively understand that as you start the respite activity and can cease it immediately.\n\nA creature with a willing soul returns to life at the end of the respite with full Stamina and half their Recoveries. You regain only half your Recoveries at the end of the respite.' },
      ],
      choices: [
        {
          id: 'piety-7',
          label: '7-Piety Ability',
          help: 'Choose one heroic ability that costs 7 piety to use.',
          kind: 'ability',
          options: () => [
            ab('Fear of the Gods', {
              cost: 7, resource: 'Piety', flavor: 'Your divine magic makes a creature appear as what your enemies fear most.',
              keywords: ['Area', 'Magic', 'Ranged'], type: 'Main action',
              distance: '5 cube within 10', target: 'Each enemy in the area',
              tiers: { t1: '6 psychic damage; I < WEAK, frightened (save ends)', t2: '9 psychic damage; I < AVERAGE, frightened (save ends)', t3: '13 psychic damage; I < STRONG, frightened (save ends)' },
              effect: 'Each target is frightened of you or a creature you choose within distance.',
            }),
            ab('Saint\u2019s Raiment', {
              cost: 7, resource: 'Piety', flavor: 'An ally becomes the wearer of an empowered golden cloak.',
              keywords: ['Magic', 'Ranged'], type: 'Maneuver',
              distance: 'Ranged 10', target: 'One ally',
              effect: 'The target gains 20 temporary Stamina and 3 surges.',
            }),
            ab('Soul Siphon', {
              cost: 7, resource: 'Piety', flavor: 'A beam of energy connects a foe to a friend, draining life from one to heal the other.',
              keywords: ['Magic', 'Ranged', 'Strike'], type: 'Main action',
              distance: 'Ranged 10', target: 'One enemy',
              tiers: { t1: '7 + I corruption damage', t2: '10 + I corruption damage', t3: '15 + I corruption damage' },
              effect: 'One ally within distance can spend any number of Recoveries.',
            }),
            ab('Words of Wrath and Grace', {
              cost: 7, resource: 'Piety', flavor: 'Your saint grants your enemies a vision of pain and fills your allies with healing energy.',
              keywords: ['Area', 'Magic'], type: 'Main action',
              distance: '5 burst', target: 'Each enemy in the area',
              tiers: { t1: '2 holy damage', t2: '5 holy damage', t3: '7 holy damage' },
              effect: 'Each ally in the area can spend a Recovery.',
            }),
          ],
        },
      ],
    },
    4: {
      summary: 'Your patron\u2019s blessing settles into your bones. The domains bloom.',
      staminaGain: 6,
      autoFeatures: () => [
        { name: 'Blessed Domain',       text: 'Whenever you gain piety from a domain effect, you gain 1 additional piety.' },
        { name: 'Characteristic Increase', text: 'Your Intuition score increases to 3. Additionally, you can increase one of your characteristic scores by 1, to a maximum of 3.' },
      ],
      autoCharacteristicIncrease: { Intuition: 3, max: true },
      choices: [
        {
          id: 'char-bonus-4',
          label: 'Characteristic Increase',
          help: 'Increase one of your characteristic scores by 1 (max 3).',
          kind: 'char-bonus',
          options: () => ['Might', 'Agility', 'Reason', 'Intuition', 'Presence'].map(c => ({ id: c, name: c, body: `+1 to ${c} (capped at 3)` })),
        },
        {
          id: 'perk-4',
          label: 'Perk',
          help: 'Choose any perk.',
          kind: 'perk',
          options: [
            { id: 'crafting',     name: 'Crafting Perk',     body: '' },
            { id: 'exploration',  name: 'Exploration Perk',  body: '' },
            { id: 'interpersonal',name: 'Interpersonal Perk',body: '' },
            { id: 'intrigue',     name: 'Intrigue Perk',     body: '' },
            { id: 'lore',         name: 'Lore Perk',         body: '' },
            { id: 'supernatural', name: 'Supernatural Perk', body: '' },
          ],
        },
        {
          id: 'skill-4',
          label: 'Skill Increase',
          help: 'Choose any skill from any skill group.',
          kind: 'skill-group',
          options: [
            { id: 'crafting',     name: 'Crafting Skill',     body: '' },
            { id: 'exploration',  name: 'Exploration Skill',  body: '' },
            { id: 'interpersonal',name: 'Interpersonal Skill',body: '' },
            { id: 'intrigue',     name: 'Intrigue Skill',     body: '' },
            { id: 'lore',         name: 'Lore Skill',         body: '' },
          ],
        },
        {
          id: 'domain-feature-4',
          label: '4th-Level Domain Feature',
          help: 'Choose one of your domains. You gain that domain\u2019s 4th-level feature.',
          kind: 'feature',
          options: ({ domains }) => domains.map(d => {
            const f = DOMAIN_4_FEATURES[d];
            return f ? { id: d, name: `${d}: ${f.name}`, body: f.text, ability: f.ability } : null;
          }).filter(Boolean),
        },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ELEMENTALIST — Earth / Fire / Green / Void
  // ═══════════════════════════════════════════════════════════════════════════
  elementalist: {
    2: {
      summary: 'The element settles deeper into you, and a new working answers your call.',
      staminaGain: 6,
      autoFeatures: ({ sub }) => [
        sub === 'earth' && { name: 'Disciple of Earth', text: 'Your body is strengthened by your mind\'s connection to the element of permanence. You have a +6 bonus to Stamina, and you gain an additional +3 bonus to Stamina whenever you gain a level past 2nd.' },
        sub === 'fire' && { name: 'Disciple of Fire', text: 'Your connection to fire allows you to protect yourself from it, even as you rip away the protections of others. You have fire immunity equal to 5 plus your level. Additionally, fire damage you deal ignores a target\'s fire immunity.\n\nAt the start of a combat encounter, you gain a number of surges equal to your Victories. Whenever you spend a surge to deal extra damage, you can make that damage fire damage.' },
        sub === 'green' && { name: 'Disciple of the Green',
          text: 'You can use a maneuver to shapeshift into a type of creature on the Green Animal Forms table. While in animal form, you can speak, and you use your Reason score to make melee free strikes. Your statistics stay the same except as noted on the table.\n\nEach form has a prerequisite level that you must attain before you can adopt it. Some animal forms grant you temporary Stamina. You lose this temporary Stamina when you revert back to your true form.\n\nYou choose a specific animal and appearance while in animal form. When you take on an animal form, your equipment either melds into your new form or falls undamaged to the ground (your choice). When you return to your true form, any melded gear reappears on your person.\n\nYou can revert back to your true form as a maneuver. You can’t enter an animal form unless you are in your true form. When you are dying, you revert to your true form and can’t turn back into an animal until you are no longer dying.',
          table: { head: ['Animal Form', 'Traits'], rows: [
            ['Canine (2nd)', '5 temporary Stamina; speed 7; size 1M; melee damage +1/+1/+1. You gain an edge on tests that involve smell.', 2],
            ['Fish (2nd)', 'Speed 5 (swim only); size 1T. You can breathe in water but can’t breathe outside of it.', 2],
            ['Rodent (2nd)', 'Speed 5 (climb); size 1T. You gain an edge on tests that involve smell.', 2],
            ['Bird (3rd)', 'Speed 5 (fly); size 1T.', 3],
            ['Great cat (3rd)', '5 temporary Stamina; speed 6 (climb); size 2; melee damage +1/+1/+1. As a maneuver, you can jump up to 3 squares in any direction. If you land on an enemy of your size or smaller, that enemy is knocked prone, and you can make a melee free strike against them (no action required).', 3],
            ['Giant frog (4th)', '5 temporary Stamina; speed 5 (swim); size 2. Your melee free strike has a distance of melee 3. When you take the Advance move action, you can high jump or long jump up to half your speed. This jump can allow you to move more squares than your speed.', 4],
            ['Horse (4th)', '5 temporary Stamina; speed 8; size 2; stability +1. You can use the Charge main action as a maneuver. You can’t use two Charge main actions on the same turn.', 4],
            ['Mohler (4th)', 'Speed 7 (burrow); size 1S; stability +1. Your melee distance gains a +1 bonus.', 4],
            ['Bear (5th)', '10 temporary Stamina; speed 5 (climb); size 2; stability +1; melee damage +2/+2/+2. Your melee distance gains a +1 bonus.', 5],
            ['Giant bird (5th)', 'Speed 7 (fly); size 2; melee damage +1/+1/+1. After making a melee free strike, you can shift up to 3 squares as a free triggered action.', 5],
            ['Giant salamander (6th)', '5 temporary Stamina; speed 5; size 1L; stability +3; melee damage +2/+2/+2. Your melee free strike deals fire damage. Additionally, you have fire immunity 3.', 6],
            ['Giant spider (6th)', 'Speed 5 (climb); size 2; melee damage +0/+1/+2. You have a double edge on melee free strikes against creatures you are hidden from.', 6],
            ['Giant snake (7th)', '5 temporary Stamina; speed 5; size 3; melee damage +0/+1/+2. Whenever you obtain a tier 2 or tier 3 outcome on a melee free strike, you can automatically grab the target. While grabbed this way, the target takes 2 damage at the start of each of their turns.', 7],
            ['Kangaroo (7th)', 'Speed 7; size 1L; stability +1; melee damage +0/+0/+4. When you score a critical hit with a melee free strike, the target is dazed (save ends). When you take the Advance move action, you can high jump or long jump up to half your speed. This jump can allow you to move more squares than your speed.', 7],
            ['Spiny armadillo (7th)', '10 temporary Stamina; speed 5; size 1M; stability +2. Whenever you take damage from an adjacent creature’s melee ability, that creature takes 3 damage.', 7],
            ['Ostrich (8th)', 'Speed 10; size 2; melee damage +1/+1/+1. Your movement does not provoke opportunity attacks.', 8],
            ['Shark (8th)', 'Speed 8 (swim only); size 2; melee damage +2/+2/+2. You can breathe in water but can’t breathe outside of it. Additionally, you gain an edge on strikes against targets who are bleeding or winded.', 8],
            ['Giant octopus (9th)', '5 temporary Stamina; speed 5 (swim); size 3; stability +2. You can breathe in water. Additionally, you can target two creatures or objects with your melee free strike. Whenever you obtain a tier 2 or tier 3 outcome on a melee free strike, you can automatically grab the target. You can have up to eight creatures grabbed.', 9],
            ['Rhinoceros (9th)', '10 temporary Stamina; speed 8; size 2; stability +5; melee damage +2/+2/+2. Whenever you make a melee free strike as part of the Charge action, that strike gains an edge.', 9],
            ['King terror lizard (10th)', '20 temporary Stamina; speed 5; size 4; stability +3; melee damage +2/+2/+2. Your melee free strike is a 1 burst with the Area and Strike keywords.', 10],
          ] } },
      ].filter(Boolean),
      autoAbilities: ({ sub }) => (sub === 'void' ? [
        ab('There Is No Space Between', { noBadge: true,
          flavor: 'Knowledge of the mystery reveals that two spaces are the same space.',
          keywords: ['Magic', 'Ranged', 'Void'], type: 'Maneuver', distance: 'Ranged 10', target: 'Special',
          effect: 'You open two size 1 portals in unoccupied spaces within distance, which last until you move beyond distance from any portal, end the effect as a maneuver, or are dying. Each portal must be placed at a height of no more than 1 square above the ground. When you or any ally touch a portal, that creature can choose to be instantly teleported to an unoccupied space of their choice adjacent to the other portal. If an enemy is force moved into a portal, their forced movement ends and they emerge from the other portal in an unoccupied space chosen by the creature who force moved them.',
        }),
      ] : []),
      choices: [
        {
          id: 'perk-2',
          label: 'Perk',
          help: 'Choose one crafting, lore, or supernatural perk.',
          kind: 'perk',
          options: [
            { id: 'crafting',     name: 'Crafting Perk',     body: 'A boon tied to making and mending.' },
            { id: 'lore',         name: 'Lore Perk',         body: 'A boon for the studious — texts, languages, secrets.' },
            { id: 'supernatural', name: 'Supernatural Perk', body: 'A boon at the edge of the natural world.' },
          ],
        },
        {
          id: 'essence-5b',
          label: 'New 5-Essence Ability',
          help: 'Choose one heroic ability that costs 5 essence to use.',
          kind: 'ability',
          options: () => [
            ab('O Flower Aid, O Earth Defend', { cost: 5, resource: 'Essence', flavor: 'Revitalizing plants and jagged stones grow, helping allies and hindering foes.',
              keywords: ['Area', 'Magic', 'Ranged', 'Earth', 'Green'], type: 'Maneuver', distance: '3 cube within 10', target: 'Special',
              effect: 'Until the start of your next turn, the area gains the following effects:\n\n- Once as a free maneuver at the start of your turn, you allow yourself and each ally in the area to spend any number of Recoveries.\n- The area is difficult terrain for enemies.\n- Each enemy who enters the area for the first time in a combat round or starts their turn there takes damage equal to your Reason score.\n\n**Persistent 1:** The area remains until the start of your next turn. As a maneuver, you can move the area up to 5 squares. This ability ends if the area is ever not within your line of effect.' }),
            ab('Subvert the Green Within', { effect: 'The target uses their signature ability against a creature of your choice. This signature ability can target the creature even if it usually wouldn’t. You then make a power roll against the target of this ability.', cost: 5, resource: 'Essence', flavor: 'Fungal spores sprout inside your enemy\u2019s brain, allowing you to control their actions.',
              keywords: ['Magic', 'Ranged', 'Strike', 'Green', 'Void'], type: 'Main action', distance: 'Ranged 10', target: 'One creature',
              tiers: { t1: '5 + R poison damage', t2: '9 + R poison damage', t3: '12 + R poison damage' } }),
            ab('Translated Through Flame', { effect: 'The target is teleported to another space within distance. Make a power roll that affects each enemy adjacent to the target’s new space.', cost: 5, resource: 'Essence', flavor: 'Your ally disappears, then reappears in a burst of fire.',
              keywords: ['Fire', 'Magic', 'Ranged', 'Void'], type: 'Main action', distance: 'Ranged 10', target: 'Self or one ally',
              tiers: { t1: '3 fire damage', t2: '5 fire damage', t3: '8 fire damage' } }),
            ab('Volcano\u2019s Embrace', { cost: 5, resource: 'Essence', flavor: 'Wrap them up in fire and melting stone.',
              keywords: ['Magic', 'Ranged', 'Strike', 'Earth', 'Fire'], type: 'Main action', distance: 'Ranged 10', target: 'One creature',
              tiers: { t1: '5 + R fire damage; A < WEAK, restrained (save ends)', t2: '9 + R fire damage; A < AVERAGE, restrained (save ends)', t3: '12 + R fire damage; A < STRONG, restrained (save ends)' } }),
          ],
        },
      ],
    },
    3: {
      summary: 'Your mastery sharpens, and the element teaches you a deeper secret.',
      staminaGain: 6,
      autoFeatures: ({ sub }) => [
        sub === 'fire' && { name: 'A Conversation With Fire', text: 'When you spend 1 uninterrupted minute in front of a fire, you can speak the name of another creature. If that creature is willing to speak to you, their image appears in the fire, and they can see you before them in a shimmering ball of light. The two of you can speak to each other through these images as if you were together in person. As a maneuver, you or the creature can end the conversation.' },
        sub === 'void' && { name: 'Distance Is Only Memory', text: 'Each time you finish a respite, you can open a two-way portal that leads to any place you have previously been. You and your allies can pass through the portal, which remains open for 1 hour or until you dismiss it as a main action.' },
      ].filter(Boolean),
      autoAbilities: ({ sub }) => ({
        earth: [
          ab('Earth Accepts Me', { noBadge: true, flavor: 'You can slip into the stone.',
            keywords: ['Magic', 'Earth'], type: 'Main action', distance: 'Self', target: 'Self',
            effect: 'You step into a mundane dirt, metal, or stone object (including a wall) that is as large as you or larger. You can remain inside the object for as long as you like. While inside the object, you can observe events and speak to creatures outside it, but you don’t have line of effect to anything outside the object and vice versa. You can travel through the object freely until you exit it. If the object you meld with is destroyed, you take 10 damage and exit the object.' }),
        ],
        green: [
          ab('Remember Growth and Sun and Rain', { noBadge: true, flavor: 'You stir any wood\u2019s memory and learn what it has seen.',
            keywords: ['Magic', 'Melee', 'Green'], type: 'Main action', distance: 'Melee 1', target: 'One mundane wooden object',
            effect: 'You see and hear any events that have occurred within 10 squares of the object within the last 12 hours, perceiving those events from the object’s location as if you were there.' }),
        ],
      }[sub] || []),
      choices: [
        {
          id: 'essence-7',
          label: '7-Essence Ability',
          help: 'Choose one heroic ability that costs 7 essence to use.',
          kind: 'ability',
          options: () => [
            ab('Erase', { cost: 7, resource: 'Essence', flavor: 'With a flick of the wrist, you phase creatures out of existence.',
              keywords: ['Magic', 'Ranged', 'Strike', 'Void'], type: 'Main action', distance: 'Ranged 10', target: 'Special',
              tiers: { t1: 'One creature', t2: 'Two creatures', t3: 'Three creatures' },
              effect: '**Special:** The number of creatures you target with this ability is determined by your power roll.\n\nEach target begins to fade from existence (save ends). On their first turn while fading from existence, a target takes a bane on power rolls. At the end of their first turn, they have a double bane on power rolls. At the end of their second turn, they fade from existence for 1 hour, after which they reappear in their original space or the nearest unoccupied space.' }),
            ab('Maw of Earth', { cost: 7, resource: 'Essence', flavor: 'You open up the ground, spewing out shrapnel of stone and debris.',
              keywords: ['Area', 'Magic', 'Ranged', 'Earth'], type: 'Main action', distance: '3 cube within 10', target: 'Each enemy in the area',
              tiers: { t1: '5 damage', t2: '9 damage', t3: '12 damage' }, effect: 'The ground in or directly beneath the area drops 3 squares.' }),
            ab('Swarm of Spirits', { cost: 7, resource: 'Essence', flavor: 'Guardian animal spirits surround you to harry your foes and bolster your allies.',
              keywords: ['Area', 'Magic', 'Green'], type: 'Main action', distance: '3 aura', target: 'Each enemy in the area',
              tiers: { t1: '3 damage', t2: '6 damage', t3: '9 damage' }, effect: 'Until the end of your next turn, each ally in the area has each of their characteristic scores treated as 1 higher for the purpose of resisting potencies, and has a +1 bonus to saving throws.\n\n**Persistent 1**: You make the power roll again to target each enemy in the area without spending essence, and the effect lasts until the start of your next turn.' }),
            ab('Wall of Fire', { cost: 7, resource: 'Essence', flavor: 'A blazing, beautifully organized inferno erupts at your command.',
              keywords: ['Area', 'Magic', 'Ranged', 'Fire'], type: 'Maneuver', distance: '10 wall within 10', target: 'Special',
              effect: 'The wall lasts until the start of your next turn, and can be placed in occupied squares. Creatures can enter and pass through the wall. Each enemy who enters the area for the first time in a combat round or starts their turn there takes fire damage equal to your Reason score for each square of the area they start their turn in or enter.\n\n**Persistent 1:** The wall lasts until the start of your next turn, and you can add a number of squares to the wall equal to your Reason score.' }),
          ],
        },
      ],
    },
    4: {
      summary: 'You become a font of essence; the element radiates from you like a mantle.',
      staminaGain: 6,
      autoFeatures: ({ sub }) => [
        { name: 'Characteristic Increase', text: 'Your Reason score increases to 3. Additionally, you can increase one of your characteristic scores by 1, to a maximum of 3.' },
        { name: 'Font of Essence', text: 'The first time each combat round that you or a creature within 10 squares takes damage that isn\'t untyped or holy damage, you gain 2 essence instead of 1.' },
        { name: 'Mantle of Essence', text: 'While you have 3+ essence and aren\u2019t dying, you exude an aura (distance = Reason) with an effect based on your specialization: Burning Grounds, Flowering Bed, Quaking Earth, or Veiling Bed.' },
        ...(MANTLE_BY_SPEC[sub] ? [MANTLE_BY_SPEC[sub]] : []),
      ],
      autoCharacteristicIncrease: { Reason: 3, max: true },
      choices: [
        {
          id: 'char-bonus-4',
          label: 'Characteristic Increase',
          help: 'Increase one of your characteristic scores by 1 (max 3).',
          kind: 'char-bonus',
          options: () => ['Might', 'Agility', 'Reason', 'Intuition', 'Presence'].map(c => ({ id: c, name: c, body: `+1 to ${c} (capped at 3)` })),
        },
        {
          id: 'perk-4',
          label: 'Perk',
          help: 'Choose any perk.',
          kind: 'perk',
          options: [
            { id: 'crafting',     name: 'Crafting Perk',     body: '' },
            { id: 'exploration',  name: 'Exploration Perk',  body: '' },
            { id: 'interpersonal',name: 'Interpersonal Perk',body: '' },
            { id: 'intrigue',     name: 'Intrigue Perk',     body: '' },
            { id: 'lore',         name: 'Lore Perk',         body: '' },
            { id: 'supernatural', name: 'Supernatural Perk', body: '' },
          ],
        },
        {
          id: 'skill-4',
          label: 'Skill Increase',
          help: 'Choose any skill from any skill group.',
          kind: 'skill-group',
          options: [
            { id: 'crafting',     name: 'Crafting Skill',     body: '' },
            { id: 'exploration',  name: 'Exploration Skill',  body: '' },
            { id: 'interpersonal',name: 'Interpersonal Skill',body: '' },
            { id: 'intrigue',     name: 'Intrigue Skill',     body: '' },
            { id: 'lore',         name: 'Lore Skill',         body: '' },
          ],
        },
      ],
    },
  },
};

// Merge in the tables defined in their own modules: levels 5–10 for the classes
// above, and the five classes maintained entirely outside this file.
Object.assign(LEVELUP_DATA.fury, furyHi);
Object.assign(LEVELUP_DATA.conduit, conduitHi);
Object.assign(LEVELUP_DATA.elementalist, elementalistHi);
Object.assign(LEVELUP_DATA, { troubadour, shadow, null: nul, tactician, talent, summoner, beastheart });

// ─────────────────────────────────────────────────────────────────────────────
// The Mantle of Essence aura carries a second feature determined by your specialization.
const MANTLE_BY_SPEC = {
  earth: { name: 'Quaking Earth', text: 'At the end of each of your turns, you can push each enemy in the area up to a number of squares equal to your Reason score.' },
  fire:  { name: 'Burning Grounds', text: 'At the end of each of your turns, each enemy in the area takes fire damage equal to your Reason score.' },
  green: { name: 'Flowering Bed', text: 'At the end of each of your turns, each ally in the area gains temporary Stamina equal to your Reason score.' },
  void:  { name: 'Veiling Bed', text: 'The area provides concealment for you and your allies.' },
};

// Conduit domain tables live in data/conduit-domains.js — shared with levelup-conduit-hi.jsx.

// ─────────────────────────────────────────────────────────────────────────────
// CENSOR — supporting data (order features/abilities, wrath abilities, domains)
// ─────────────────────────────────────────────────────────────────────────────
// The censor's single domain is established at level 1; in this builder it is recorded
// the first time a domain feature is chosen (stored on the pick as `domain`). We surface
// only that domain's feature at later levels — or all twelve until one has been chosen.
function censorChosenDomain(ctx) {
  const lc = ctx.character?.levelChoices || {};
  for (const lvl of [4, 7]) {
    const d = lc[lvl]?.picks?.[`domain-feature-${lvl}`]?.domain;
    if (d) return d;
  }
  if (ctx.domains && ctx.domains.length) return ctx.domains[0];
  return null;
}
function censorDomainFeatureOptions(ctx, featuresMap) {
  const chosen = censorChosenDomain(ctx);
  const domains = chosen ? [chosen] : ALL_CENSOR_DOMAINS;
  return domains.map(d => {
    const f = featuresMap[d];
    return f ? { id: d, domain: d, name: `${d}: ${f.name}`, body: f.text, ability: f.ability } : null;
  }).filter(Boolean);
}

const CENSOR_ORDER_FEATURES_2 = {
  exorcist: [
    { name: 'Saint\u2019s Vigilance', text: 'You have honed your ability to detect sin and can use it to find those who hide from justice. Any creature judged by you can\'t use the Hide maneuver. Additionally, you gain an edge when searching for hidden creatures. If you find a hidden creature, you can use your Judgment ability against them as a free triggered action.' },
    { name: 'A Sense for Truth',     text: 'You are trained in secret techniques from your order that allow you to discern the truth with supernatural precision. If a creature is of a lower level than you, you automatically know when they are lying, though you don\'t necessarily know the actual truth behind their lie. Additionally, you gain an edge on tests made to detect lies or hidden motives.' },
  ],
  oracle: [
    { name: 'It Was Foretold', text: 'Your order has trained you to understand fragments of the visions granted to you by your deity, giving you a momentary advantage in challenging situations. At the start of an encounter, you can take one main action before any other creature and before your first turn. Additionally, whenever the Director calls for a montage test, you can make one free test before the montage begins, which counts as an earned success or failure as usual.' },
    { name: 'Judge of Character', text: 'Your focus on your fragmentary visions grants divine insight into the world and its creatures beyond your usual senses. Whenever you would make an Intuition test, you can make a Presence test instead.' },
  ],
  paragon: [
    { name: 'Lead by Example', text: 'Your devotion to your deity allows you to take command of the battlefield, letting your allies benefit from your wisdom. While you are adjacent to a creature, your allies gain the benefits of flanking against that creature. Additionally, your allies gain an edge on tests made to aid other creatures with their tests.' },
    { name: 'Stalwart Icon', text: 'You exhibit a small spark of your deity\'s power, causing creatures to trust or fear you, depending on what you need. You gain an edge on tests made to intimidate or persuade others.' },
  ],
};

const CENSOR_ORDER_ABILITIES_2 = {
  exorcist: [
    ab('It Is Justice You Fear', { cost: 5, resource: 'Wrath', flavor: 'I am but a vessel. Your own deeds weigh upon you.',
      keywords: ['Magic','Ranged','Strike'], type: 'Main action', distance: 'Ranged 10', target: 'One creature',
      powerRoll: 'Might', tiers: [['\u226411','8 + M holy damage; P < WEAK, frightened (save ends)'],['12\u201316','12 + M holy damage; P < AVERAGE, frightened (save ends)'],['17+','15 + M holy damage; P < STRONG, frightened (save ends)']],
      effect: 'If the target is already frightened of you or another creature and this ability would frighten them again, they instead take psychic damage equal to twice your Presence score.' }),
    ab('Revelator', { cost: 5, resource: 'Wrath', flavor: 'You channel holy energy to harm unbelievers and reveal those hidden from your judgment.',
      keywords: ['Area','Magic'], type: 'Maneuver', distance: '3 burst', target: 'Each enemy in the area',
      effect: 'Each target takes holy damage equal to twice your Presence score. Additionally, each hidden target is automatically revealed and can’t become hidden again until the start of your next turn. You can then use your Judgment ability against one target as a free triggered action.' }),
  ],
  oracle: [
    ab('Prescient Grace', { cost: 5, resource: 'Wrath', flavor: 'Gifted by a prescient vision, you warn an ally of an impending attack.',
      keywords: ['Magic','Ranged'], type: 'Triggered', distance: 'Ranged 10', target: 'Self or one ally',
      trigger: 'An enemy within 10 squares starts their turn.',
      effect: 'You can spend a Recovery to allow the target to regain Stamina equal to your recovery value. The target can then take their turn immediately before the triggering enemy.' }),
    ab('With My Blessing', { cost: 5, resource: 'Wrath', flavor: 'A word in prayer, and the gods show the way.',
      keywords: ['Magic','Ranged'], type: 'Main action', distance: 'Ranged 10', target: 'Self or one ally',
      effect: 'The target can use a free triggered action to use a strike signature ability or a strike heroic ability, and has a double edge on that ability. If a heroic ability is chosen, reduce its Heroic Resource cost by 3 (to a minimum cost of 0).' }),
  ],
  paragon: [
    ab('Blessing of the Faithful', { cost: 5, resource: 'Wrath', flavor: 'The gods reward your faith.',
      keywords: ['Area','Magic'], type: 'Maneuver', distance: '3 aura', target: 'Self and each ally in the area',
      effect: 'Until the end of the encounter or until you are dying, each target gains 1 surge at the end of each of your turns.' }),
    ab('Sentenced', { cost: 5, resource: 'Wrath', flavor: 'The shock of your condemnation freezes your enemy in their boots.',
      keywords: ['Magic','Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature',
      powerRoll: 'Presence', tiers: [['\u226411','5 + P damage; P < WEAK, restrained (save ends)'],['12\u201316','9 + P damage; P < AVERAGE, restrained (save ends)'],['17+','12 + P damage; P < STRONG, restrained (save ends)']],
      effect: 'While the target is restrained this way, your abilities that impose forced movement can still move them.' }),
  ],
};

const CENSOR_ORDER_FEATURE_5 = {
  exorcist: { name: 'Evil Revealed', text: 'Your order has taught you methods to discern the disguises of both mortals and monsters. You automatically see through disguises and illusions created by creatures of your level or lower, and you gain an edge on tests made to see through the disguises and illusions of more powerful creatures. Whenever you see through a creature\'s disguise or illusion, you can use your Judgment ability against them as a free triggered action.' },
  oracle:   { name: 'Prophecy', text: 'You can better sift through the constant fragmentary visions from your deity and act to make them manifest. Each time you earn 1 or more Victories, you can make a number of 2d10 rolls equal to the number of Victories you earned. Record each roll in order. Then whenever you or a creature within 10 squares makes a power roll, you can use a free triggered action to replace the total on the dice with your first recorded roll.\n\nYou discard each roll as it is used, and each time you earn Victories, you add new rolls to the bottom of the list. Any unused rolls are discarded when you finish a respite.' },
  paragon:  { name: 'Stand Fast!', text: 'Your divine spark grows in power, allowing you and your allies to focus and endure. At the start of each of your turns, you can spend 1d6 Stamina to end one effect on you that is ended by a saving throw or that ends at the end of your turn. Any ally who starts their turn within 5 squares of you can also spend Stamina to gain this benefit.' },
};

const CENSOR_ORDER_ABILITIES_6 = {
  exorcist: [
    ab('Begone!', { cost: 9, resource: 'Wrath', flavor: 'You terrify your enemies into retreating, creating chaos in their ranks.',
      keywords: ['Area','Magic'], type: 'Main action', distance: '3 burst', target: 'Each enemy in the area',
      powerRoll: 'Presence', tiers: [['\u226411','4 psychic damage; slide 3'],['12\u201316','6 psychic damage; slide 5'],['17+','8 psychic damage; slide 7']] }),
    ab('Pain of Your Own Making', { cost: 9, resource: 'Wrath', flavor: 'You reverse the effects from an evildoer.',
      keywords: ['Magic','Ranged'], type: 'Free triggered action', distance: 'Ranged 10', target: 'Self or one ally',
      trigger: 'The target gains a condition or effect that is ended by a saving throw or that ends at the end of their turn.',
      effect: 'The effect ends on the target and is applied to the creature who imposed the effect on them. That creature also takes damage equal to three times your Presence score.' }),
  ],
  oracle: [
    ab('Burden of Evil', { cost: 9, resource: 'Wrath', flavor: 'You reveal a vision of your enemies’ fate that causes them to scramble as it staggers them.',
      keywords: ['Magic','Ranged','Strike'], type: 'Maneuver', distance: 'Ranged 10', target: 'Three enemies',
      powerRoll: 'Presence', tiers: [['\u226411','slide 3; I < WEAK, dazed (save ends)'],['12\u201316','Slide 5; I < AVERAGE, dazed (save ends)'],['17+','Slide 7; I < STRONG, dazed (save ends)']] }),
    ab('Edict of Peace', { cost: 9, resource: 'Wrath', flavor: 'You anticipate your foes\u2019 moves and deny them.',
      keywords: ['Area','Magic'], type: 'Maneuver', distance: '3 aura', target: 'Each enemy in the area',
      effect: 'Until the end of the encounter or until you are dying, whenever any target takes a triggered action or a free triggered action, that action is negated and the target takes holy damage equal to your Presence score.' }),
  ],
  paragon: [
    ab('Congregation', { cost: 9, resource: 'Wrath', flavor: 'You focus your allies\u2019 wrath on a chosen foe.',
      keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature',
      powerRoll: 'Might', tiers: [['\u226411','8 + M damage; as a free triggered action, one ally within 10 squares of the target can use a strike signature ability against the target'],['12\u201316','12 + M damage; as a free triggered action, one ally within 10 squares of the target can use a strike signature ability that gains an edge against the target'],['17+','16 + M damage; as a free triggered action, two allies within 10 squares of the target can each use a strike signature ability that gains an edge against the target']],
      effect: 'Each ally can shift up to 2 squares and gains 2 surges before making the strike.' }),
    ab('Intercede', { cost: 9, resource: 'Wrath', flavor: 'You take your ally\u2019s place.',
      keywords: ['Magic','Ranged'], type: 'Free triggered action', distance: 'Ranged 10', target: 'One ally',
      trigger: 'A creature makes a strike against the target.',
      effect: 'The target is unaffected by the strike and you become the target instead, even if you aren’t a valid target for it. You take half the damage from the strike, and the target gains 3 surges.' }),
  ],
};

const CENSOR_ORDER_FEATURE_8 = {
  exorcist: { name: 'Demonologist', text: 'The most esoteric secrets of your order teach you that to defeat your enemy, you must understand them. You treat your Renown as 2 higher than usual when dealing with demons, devils, and other agents of chaos. If you successfully complete a negotiation with one of these creatures, you gain an edge on power rolls made against them and can use your Judgment ability against them as a free triggered action before an encounter begins.' },
  oracle:   { name: 'Their Past Revealed', text: 'Your constant fragmentary visions become clearer, and can be honed to understand the past of creatures you interact with. While speaking with any creature, you can make a medium Presence test to see visions from their past. On a success, you see a clear view of any subject related to the creature\'s past that you wish to understand. On a success with a consequence, you see two visions, one false and one true. On a failure, you lose 2d6 Stamina.' },
  paragon:  { name: 'Vow', text: 'Your words take on the power of your deity, with all the authority that entails. If you convince a creature to take an oath, they can\'t break it for 7 days. If you take an oath, you can\'t break it for 7 days.' },
};

const CENSOR_ORDER_ABILITIES_9 = {
  exorcist: [
    ab('Banish', { cost: 11, resource: 'Wrath', flavor: 'You sever the target\u2019s tenuous connection to the world.',
      keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature',
      powerRoll: 'Might', tiers: [['\u226411','5 + M damage; P < WEAK, the target is banished (save ends)'],['12\u201316','8 + M damage; P < AVERAGE, the target is banished (save ends)'],['17+','11 + M damage; P < STRONG, the target is banished (save ends)']],
      effect: 'This ability gains an edge against demons, devils, undead, and creatures not native to your current world. If you know the target’s true name, this ability has a double edge. While banished, the target is sent to another manifold in the timescape and removed from the encounter map. A banished target can do nothing but make saving throws, and takes 10 holy damage each time they do so. If the target is reduced to 0 Stamina while banished, they are lost to the timescape.' }),
    ab('Terror Manifest', { cost: 11, resource: 'Wrath', flavor: 'I know what you fear.',
      keywords: ['Magic','Ranged','Strike'], type: 'Main action', distance: 'Ranged 10', target: 'One creature',
      powerRoll: 'Presence', tiers: [['\u226411','7 + P psychic damage; P < WEAK, frightened (save ends)'],['12\u201316','10 + P psychic damage; P < AVERAGE, frightened (save ends)'],['17+','13 + P psychic damage; P < STRONG, frightened (save ends)']],
      effect: 'While frightened this way, if a target who is a leader or solo creature is winded, they take an extra 25 psychic damage. If a target frightened this way is not a leader or solo creature and is winded, they are reduced to 0 Stamina.' }),
  ],
  oracle: [
    ab('Blessing and a Curse', { cost: 11, resource: 'Wrath', flavor: 'The gods bless and damn in equal measure.',
      keywords: ['Magic','Ranged'], type: 'Triggered', distance: 'Ranged 10', target: 'One creature',
      trigger: 'The target makes a power roll.',
      effect: 'The target obtains a tier 1 or tier 3 outcome on their power roll (your choice). You can then choose another target within distance, who obtains the opposite outcome on their next power roll.' }),
    ab('Fulfill Your Destiny', { cost: 11, resource: 'Wrath', flavor: 'You have looked at various futures, and only this one works.',
      keywords: ['Magic','Ranged'], type: 'Triggered', distance: 'Ranged 10', target: 'One ally',
      trigger: 'You or another hero ends their turn.',
      effect: 'The target takes their turn after the triggering hero, and immediately removes all conditions and negative effects on themself.\n\nDuring their turn, the target has a double edge on power rolls.' }),
  ],
  paragon: [
    ab('Apostate', { cost: 11, resource: 'Wrath', flavor: 'You channel holy energy to seal an enemy\u2019s fate.',
      keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature',
      powerRoll: 'Might', tiers: [['\u226411','13 + M holy damage'],['12\u201316','19 + M holy damage'],['17+','26 + M holy damage']],
      effect: 'Until the end of the encounter or until you are dying, the target has damage weakness 10.' }),
    ab('Edict of Unyielding Resolve', { cost: 11, resource: 'Wrath', flavor: 'You and your allies are clad in shimmering armor.',
      keywords: ['Area','Magic'], type: 'Maneuver', distance: '2 aura', target: 'Self and each ally in the area',
      effect: 'Until the end of the encounter or until you are dying, each target who starts their turn in the area gains 10 temporary Stamina.' }),
  ],
};

const CENSOR_WRATH_7 = [
  ab('Edict of Disruptive Isolation', { cost: 7, resource: 'Wrath', flavor: 'The evil within your foes detonates with holy fire that burns only the guilty.',
    keywords: ['Area','Magic'], type: 'Maneuver', distance: '2 aura', target: 'Each enemy in the area',
    effect: 'Until the end of the encounter or until you are dying, each target takes holy damage equal to your Presence score at the end of each of your turns. A target takes an extra 2d6 holy damage if they are judged by you or if they are adjacent to any enemy.' }),
  ab('Edict of Perfect Order', { cost: 7, resource: 'Wrath', flavor: 'Within the area of your divine presence, your enemies will regret using their fell abilities.',
    keywords: ['Area','Magic'], type: 'Maneuver', distance: '2 aura', target: 'Each enemy in the area',
    effect: 'Until the end of the encounter or until you are dying, whenever a target uses an ability that costs Malice (see *Draw Steel: Monsters*), they take holy damage equal to three times your Presence score. A target judged by you takes an extra 2d6 holy damage.' }),
  ab('Edict of Purifying Pacifism', { cost: 7, resource: 'Wrath', flavor: 'You shed a righteous energy that punishes enemies who would harm you or your allies.',
    keywords: ['Area','Magic'], type: 'Maneuver', distance: '2 aura', target: 'Each enemy in the area',
    effect: 'Until the end of the encounter or until you are dying, whenever a target makes a strike, they take holy damage equal to twice your Presence score. A target judged by you takes an extra 2d6 holy damage.' }),
  ab('Edict of Stillness', { cost: 7, resource: 'Wrath', flavor: 'The holy aura you project makes it painful for evil-doers to leave your reach.',
    keywords: ['Area','Magic'], type: 'Maneuver', distance: '2 aura', target: 'Each enemy in the area',
    effect: 'Until the end of the encounter or until you are dying, whenever a target moves or is force moved out of the area, they take holy damage equal to twice your Presence score. A target judged by you who moves willingly takes an extra 2d6 holy damage.' }),
];

const CENSOR_WRATH_9 = [
  ab('Gods Grant Thee Strength', { cost: 9, resource: 'Wrath', flavor: 'You channel divine force for movement that cannot be stopped.',
    keywords: ['Ranged'], type: 'Main action', distance: 'Ranged 10', target: 'Self or one ally',
    effect: 'The target ends any condition or effect on them that is ended by a saving throw or that ends at the end of their turn, or a prone target can stand up. The target then gains 2 surges, can shift up to their speed while ignoring difficult terrain, and can use a strike signature ability as a free triggered action.' }),
  ab('Orison of Victory', { cost: 9, resource: 'Wrath', flavor: 'You channel your god\u2019s will to overcome hardship and inflict pain.',
    keywords: ['Area'], type: 'Maneuver', distance: '1 burst', target: 'Self and each ally in the area',
    powerRoll: 'Presence', tiers: [['\u226411','Each target gains 1 surge'],['12\u201316','Each target gains 2 surges'],['17+','Each target gains 3 surges']],
    effect: 'A target can end one effect on them that is ended by a saving throw or that ends at the end of their turn, or a prone target can stand up.' }),
  ab('Righteous Judgment', { cost: 9, resource: 'Wrath', flavor: 'You amplify the power of your judgment.',
    keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature',
    powerRoll: 'Might', tiers: [['\u226411','10 + M damage'],['12\u201316','14 + M damage'],['17+','20 + M damage']],
    effect: 'Until the end of the encounter, whenever any ally deals damage to a target judged by you, that ally gains 1 surge.' }),
  ab('Shield of the Righteous', { cost: 9, resource: 'Wrath', flavor: 'You strike a foe and create a fleet of divine shields that protect your allies.',
    keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature',
    powerRoll: 'Might', tiers: [['\u226411','10 + M damage; you and each ally adjacent to you gain 10 temporary Stamina'],['12\u201316','14 + M damage; you and each ally adjacent to you gain 15 temporary Stamina'],['17+','20 + M damage; you and each ally adjacent to you gain 20 temporary Stamina']] }),
];

const CENSOR_WRATH_11 = [
  ab('Excommunication', { cost: 11, resource: 'Wrath', flavor: 'You curse your foe to become a bane to their allies.',
    keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature',
    powerRoll: 'Might', tiers: [['\u226411','9 + M damage; I < WEAK, weakened (save ends)'],['12\u201316','13 + M damage; I < AVERAGE, weakened (save ends)'],['17+','18 + M damage; I < STRONG, weakened (save ends)']],
    effect: 'At the end of each of your turns, a target weakened this way deals holy damage equal to twice your Presence score to each enemy within 2 squares of them. Additionally, a target weakened this way can’t be targeted by their allies’ abilities.' }),
  ab('Hand of the Gods', { cost: 11, resource: 'Wrath', flavor: 'You use your foe as a tool against your enemies.',
    keywords: ['Ranged','Strike','Weapon'], type: 'Main action', distance: 'Ranged 10', target: 'One creature',
    powerRoll: 'Might', tiers: [['\u226411','10 + M damage'],['12\u201316','15 + M damage'],['17+','21 + M damage']],
    effect: 'Until the end of the encounter, while the target is judged by you, you can choose to make them the source of any of your abilities. Additionally, the target counts as an ally for the purpose of flanking.' }),
  ab('Pillar of Holy Fire', { cost: 11, resource: 'Wrath', flavor: 'Your enemy\u2019s guilt fuels a holy flame that burns your foes.',
    keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature',
    powerRoll: 'Might', tiers: [['\u226411','9 + M damage; I < WEAK, dazed (save ends)'],['12\u201316','13 + M damage; I < AVERAGE, dazed (save ends)'],['17+','18 + M damage; I < STRONG, dazed (save ends)']],
    effect: 'At the end of each of your turns, a target dazed this way deals holy damage equal to twice your Presence score to each enemy within 2 squares of them.' }),
  ab('Your Allies Turn on You!', { cost: 11, resource: 'Wrath', flavor: 'You turn your enemies\u2019 ire to the target.',
    keywords: ['Ranged','Strike','Weapon'], type: 'Main action', distance: 'Ranged 10', target: 'One creature',
    powerRoll: 'Presence', tiers: [['\u226411','5 + P damage; I < WEAK, slowed (save ends)'],['12\u201316','9 + P damage; I < AVERAGE, slowed (save ends)'],['17+','12 + P damage; I < STRONG, slowed (save ends)']],
    effect: 'While the target is slowed this way, each of their allies who starts their turn within 5 squares of them must use a free maneuver to make a free strike against the target. Additionally, while the target is slowed this way, each of their allies within 5 squares of them who can make a triggered free strike against a different creature must make the free strike against the target instead.' }),
];

// 1st-level domain features — Censor wording (Presence-based; from censor.md), with the
// skill group each domain grants. Used by the wizard's Censor domain picker.
const CENSOR_DOMAIN_1 = {
  Creation:   { name: 'Hands of the Maker', skillGroup: 'crafting', text: 'You have the following ability.' },
  Death:      { name: 'Grave Speech', skillGroup: 'lore', text: 'You have the following ability.' },
  Fate:       { name: 'Oracular Visions', skillGroup: 'lore', text: 'Your deity rewards you with hazy visions of things to come. Each time you earn 1 or more Victories, you earn an equal number of fate points. Whenever you or a creature within 10 squares makes a test, you can spend 1 fate point to tap into a vision of the outcome, granting that creature an edge on the test. You lose any remaining fate points when you finish a respite.' },
  Knowledge:  { name: 'Blessing of Comprehension', skillGroup: 'lore', text: 'You can interpret diagrams and charts even if you don\'t understand the language associated with them. You are considered fluent in all languages for the purpose of understanding the project source for any crafting or research project (see Chapter 12: Downtime Projects).' },
  Life:       { name: 'Revitalizing Ritual', skillGroup: 'exploration', text: 'Each time you finish a respite, you can choose yourself or one ally who is also finishing a respite to gain the benefit of a divine ritual. The chosen character gains a bonus to their recovery value equal to your level that lasts until you finish another respite.' },
  Love:       { name: 'Blessing of Compassion', skillGroup: 'interpersonal', text: 'You exude a magic presence that can soothe those willing to socially engage with you. You gain an edge on any test made to assist another creature with a test.\n\nAdditionally, when you are present at the start of a negotiation, one NPC of your choice has their patience increased by 1 (to a maximum of 5), and the first test made to influence them gains an edge.' },
  Nature:     { name: 'Faithful Friend', skillGroup: 'exploration', text: 'Main action (Self): conjure an incorporeal animal spirit you’ve seen (speed 5, can fly). While within 10 squares of it you sense everything that animal would. Dismiss it any time; if it takes damage it is dismissed and you take 1d10 irreducible psychic damage.' },
  Protection: { name: 'Protective Circle', skillGroup: 'exploration', text: 'You can spend 10 uninterrupted minutes to create a protective circle on the ground large enough to hold one size 1 creature. The circle lasts for 24 hours, until you create another, or until you dismiss it (no action required). Only creatures you designate at the time of drawing the circle can enter and exit the area. While in the protective circle, a creature can\'t be targeted by strikes.' },
  Storm:      { name: 'Blessing of Fortunate Weather', skillGroup: 'exploration', text: 'Each time you finish a respite, you can decide the weather conditions within 100 squares. Until you finish another respite, the weather conditions you establish follow you through any mundane outdoor locations. Choose one of the following types of weather, each of which grants a benefit to you and your allies:\n\n**Clear:** You and your allies gain an edge on tests that use the Search or Navigate skills.\n\n**Foggy:** You and your allies gain an edge on tests that use the Hide skill.\n\n**Overcast:** You and your allies gain an edge on tests that use the Endurance skill.\n\n**Precipitation:** When the ground is muddy or snowy, you and your allies gain an edge on tests that use the Track skill.\n\nIf you are in the same area as a creature using this or a similar feature who has chosen a different weather effect, the features negate each other where their areas overlap.' },
  Sun:        { name: 'Inner Light', skillGroup: 'lore', text: 'Each time you finish a respite, you can choose yourself or one ally who is also finishing a respite to gain the benefit of a divine ritual. You place a ray of morning light into the chosen character\'s soul, granting them a +1 bonus to saving throws that lasts until you finish another respite.' },
  Trickery:   { name: 'Inspired Deception', skillGroup: 'intrigue', text: 'The gods favor your thievery with magic. Whenever you make a test that uses a skill you have from the intrigue skill group, you can use Presence on the test instead of another characteristic.' },
  War:        { name: 'Sanctified Weapon', skillGroup: 'exploration', text: 'As a respite activity, you can bless a weapon. Any creature who wields the weapon gains a +1 bonus to rolled damage with abilities that use the weapon. This benefit lasts until you finish another respite.' },
};

const CENSOR_DOMAIN_4 = {
  Creation:   { name: 'Improved Hands of the Maker', text: 'When you use your Hands of the Maker ability, you can create a mundane object that is size 2 or smaller.' },
  Death:      { name: 'Seance',          text: 'You can commune with a network of spirits. As a respite activity, you speak the name of a creature who died and isn\'t undead. If the creature\'s spirit is free and willing to speak with you, they appear and you can have a conversation with them. During this time, the creature responds to you as they would have in life. If the creature isn\'t free or willing to appear, you can speak another name or choose another respite activity.' },
  Fate:       { name: 'Oracular Warning', text: 'Each time you finish a respite, you can share the vague dreams of the future granted to you by the gods with allies who finished the respite with you. These premonitions help you and your allies stay alive, granting each of you temporary Stamina equal to 10 + your level that lasts until you finish another respite.' },
  Knowledge:  { name: 'Saint\u2019s Epiphany', text: 'At the start of a respite, you can inspire yourself or another creature taking the same respite with divine knowledge. If the target makes a project roll during this respite, they can add 1d10 plus your Presence score to the roll.' },
  Life:       { name: 'Blessing of Life', text: 'Your divine presence causes those you deem worthy to recover quickly from a fight. Whenever an ally within distance of your My Life for Yours ability regains Stamina, they regain additional Stamina equal to your Presence score.' },
  Love:       { name: 'Invocation of the Heart', text: 'As a main action, you forge a bond of love and friendship with one willing creature you touch. While this bond is active, you can telepathically speak with the creature over any distance, including across different worlds. Additionally, while this bond is active, you can attempt to assist the creature with any test they make regardless of their proximity to you. You can maintain only one bond at a time, and you can end a bond at any time (no action required).' },
  Nature:     { name: 'Wode Road',       text: 'As a main action, you touch a living tree and make it part of a divine transportation network. You can maintain a number of trees in your network equal to your Presence score. Whenever you touch any tree in your network, you can use a main action to teleport yourself and any willing creatures within 10 squares of you to a tree in your network on the same world. If a tree in your network dies, it is no longer part of the network. You can remove a tree from your network no matter your distance from it, including across different worlds (no action required).' },
  Protection: { name: 'Impervious Touch', text: 'As a maneuver, you can touch an object with a size equal to your Presence score or smaller and place a protective spell on it. The object has immunity all to untyped damage. You can maintain this spell on a number of objects equal to your Presence score, and you can end the spell on any object at any time (no action required).\n\nAdditionally, you can place this spell on a building or vehicle (or a similar structure with the Director\'s approval) that is of a size larger than your Presence score. You can place the spell on only one such target at a time, and you can maintain the spell on a larger target and a number of objects equal to your Presence score simultaneously.' },
  Storm:      { name: 'Windwalk',        text: 'While you have 5 or more Victories, you can fly. If you can already fly, you have a +2 bonus to speed while flying instead.' },
  Sun:        { name: 'Light of Revelation',
    ability: { name: 'Light of Revelation', noBadge: true,
      flavor: 'Your inner light burns through every shadow.',
      keywords: ['Magic'], type: 'Maneuver', distance: 'Self', target: 'Self',
      effect: 'As a maneuver, you make your body shine brightly, illuminating your space and each square within 5 squares until you dismiss the light (no action required). This light shines through any darkness. Hidden creatures in the area are automatically revealed, and creatures in the light, including you, can\'t hide. While this feature is active, you gain an edge on tests made to notice hidden objects and entrances and to detect supernatural illusions.' } },
  Trickery:   { name: 'Blessing of Secrets',
    ability: { name: 'Blessing of Secrets', noBadge: true,
      flavor: 'You project an illusory aura that makes you and allies harder to notice.',
      keywords: ['Magic'], type: 'Maneuver', distance: '3 aura', target: 'Self and each ally in the area',
      effect: 'Each creature in the area has a double edge on tests made to hide or sneak. The aura lasts until you end it (no action required) or until a target harms or deals damage to a creature or object.' } },
  War:        { name: 'Improved Sanctified Weapon', text: 'The weapon improved by your Sanctified Weapon feature grants a +3 bonus to rolled damage instead of +1.' },
};

const CENSOR_DOMAIN_7 = {
  Creation:   { name: 'Divine Quartermaster', text: 'Each time you finish a respite, you can choose a treasure with a project goal equal to 50 times your level or less. You gain a divine version of this treasure that lasts until you finish another respite or it is consumed.' },
  Death:      { name: 'Word of Death Deferred', text: 'You can stop death from taking your allies. When an ally within distance of your My Life for Yours ability dies and you are not dying, you can use a free triggered action to instead have that ally fall unconscious until they regain Stamina.\n\nAdditionally, your abilities deal an extra 5 damage to winded creatures.' },
  Fate:       { name: 'Word of Fate Denied', text: 'When an ally within 10 squares takes damage that would leave them dying, you can use a free triggered action to make yourself or another willing creature within 10 squares of you the target of the triggering damage instead. The creature you choose takes the damage and suffers any effects associated with it, and that damage can\'t be reduced in any way.' },
  Knowledge:  { name: 'Gods\u2019 Library', text: 'You can gain access to information you need through prayer, so that you no longer require research materials for crafting and research projects (see Chapter 12: Downtime Projects). Additionally, you add your level to project rolls you make for crafting and research projects. You also have any skills in the lore skill group you don\'t already have, and you gain a number of skills from any other skill groups equal to the number of skills you had in the lore skill group before you gained this feature.' },
  Life:       { name: 'Font of Grace', text: 'Each time you use your My Life for Yours ability, you gain 1 wrath that can be spent only on that ability during the same turn. If you don\'t use this wrath, it is lost. Additionally, the target of My Life for Yours gains 10 temporary Stamina.' },
  Love:       { name: 'Covenant of the Heart', text: 'You can maintain bonds with up to three willing creatures using your Invocation of the Heart feature. Additionally, you have the following ability.',
    ability: { name: 'Guided to Your Side', noBadge: true,
      flavor: 'You concentrate on a friend and teleport to them.',
      keywords: ['Magic', 'Ranged'], type: 'Main action', distance: 'Ranged 10', target: 'Self and each ally',
      effect: 'Each target is teleported to unoccupied spaces within 5 squares of a willing creature who you are bonded to with your Invocation of the Heart feature. You don\'t need line of effect to the bonded creature but you must be on the same world.' } },
  Nature:     { name: 'Nature\u2019s Bounty', text: 'When you finish a respite, you can prepare a magic meal using local flora for any companions who rested with you. Choose two of the following benefits for creatures who consume the meal:\n\n- Each creature gains immunity to acid, cold, corruption, fire, lightning, poison, or sonic damage equal to your level. You can choose this benefit twice, choosing a different damage immunity each time.\n- Each creature gains 20 temporary Stamina.\n- Each creature gains a +1 bonus to speed.\n- Each creature gains a +1 bonus to saving throws.\n- Each creature gains an edge on tests made to influence other creatures.\n\nEach benefit lasts until the creature who gains it finishes another respite.' },
  Protection: { name: 'Blessing of Iron', text: 'The gods send divine favor to you and your allies. While you are not dying, enemies take a bane on strikes against you or any ally within 3 squares of you.' },
  Storm:      { name: 'Ride the Lightning', text: 'Lightning and thunder infuse your body. Whenever you use an ability to deal rolled damage to another creature, the ability deals extra lightning damage equal to your Presence score. Additionally, if you use an ability that force moves a creature, the forced movement distance gains a bonus equal to your Presence score. While you are under the effect of your Windwalk feature, lightning enhances your locomotion to grant you a bonus to speed equal to your Might score. If Windwalk already grants you a bonus to speed, this bonus adds to that.' },
  Sun:        { name: 'Light of the Burning Sun', text: 'Sun infuses your body. Whenever you use an ability to deal rolled damage to another creature, that ability deals an extra 5 fire damage, or an extra 15 fire damage if the creature is undead. Additionally, you have fire immunity equal to your level, which is added to any other fire immunity you have.' },
  Trickery:   { name: 'Trinity of Trickery',
    ability: { name: 'Trinity of Trickery', cost: 9, resource: 'Wrath',
      flavor: 'Hey! I\u2019m over here. No, here, numbskull.',
      keywords: ['Magic', 'Ranged'], type: 'Maneuver', distance: 'Ranged 10', target: 'Self or one ally',
      effect: 'You create two illusory duplicates of the target, which appear anywhere within distance. These duplicates last until the end of the encounter. On each of their turns, the target can move each duplicate up to their speed. If the target is targeted by an ability, they can use a free triggered action to switch places with a duplicate within their line of effect, making the duplicate the target of the ability instead. When either duplicate takes damage, it is destroyed.' } },
  War:        { name: 'Your Triumphs Are Remembered', text: 'The gods allow you and your companions to bask in the glory of past successes. Whenever you finish a respite, you and any other heroes who rested with you regain 1 Victory after your Victories are converted to XP. This Victory isn\'t converted into XP at the end of a subsequent respite.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// LevelUpFlow — multi-step modal wizard
// ─────────────────────────────────────────────────────────────────────────────
function LevelUpFlow({ open, onClose, character, update, editLevel = null }) {
  const cls = classDef(character);
  const isEditing = editLevel != null;
  // The level whose choices we're working with: the existing level when editing, otherwise the next one up.
  const nextLevel = isEditing ? editLevel : character.level + 1;
  const data = (cls && LEVELUP_DATA[cls.id]) ? LEVELUP_DATA[cls.id][nextLevel] : null;
  const ctx = makeContext(character);

  const choices = (data?.choices || []).filter(c => !c.condition || c.condition(ctx));
  const steps = ['intro', ...choices.map(c => c.id), 'review'];
  const [stepIdx, setStepIdx] = React.useState(0);
  const [picks, setPicks] = React.useState({});

  // Reset on open — when editing, pre-fill with the previously-saved picks for this level.
  React.useEffect(() => {
    if (open) {
      setStepIdx(0);
      const saved = isEditing ? (character.levelChoices?.[editLevel]?.picks || {}) : {};
      setPicks({ ...saved });
    }
  }, [open, nextLevel, cls?.id, editLevel]);

  if (!open) return null;

  // ── No data for class/level → friendly fallback
  if (!data) {
    return (
      <Modal open={open} onClose={onClose} title={cls && nextLevel > 4 ? 'Beyond the Threshold' : 'Not Yet Mapped'} width={620}
        footer={<Button kind="primary" onClick={onClose}>CLOSE</Button>}>
        <div style={{textAlign:'center'}}>
          <GlyphRow>✠ · ❦ · ✠</GlyphRow>
          <div style={{fontFamily:'var(--hand)', fontStyle:'italic', fontSize: '1.0625rem', color:'var(--ink-2)', marginTop:14, lineHeight:1.55, maxWidth:480, margin:'14px auto 0'}}>
            {nextLevel > 10
              ? 'You stand at the height of mortal power. There are no more rungs to climb \u2014 only legends to write.'
              : nextLevel > 4
                ? 'The level-up flows for levels 5 and beyond are not yet charted in this Liber. Use the editor or your Director\u2019s sheet for now.'
                : 'A full level-up flow for this class is not yet implemented. Try a Fury or a Conduit, or use the editor to mark progression by hand.'}
          </div>
        </div>
      </Modal>
    );
  }

  const stepId = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;
  const isFirst = stepIdx === 0;

  // Validate current step
  const currentChoice = choices.find(c => c.id === stepId);
  // Tiered picks (perks, skill groups) require both a category AND a specific item.
  // Multi-picks (count > 1) require exactly `count` selections.
  const currentPick = currentChoice && picks[currentChoice.id];
  const canAdvance = !currentChoice ||
    ((currentChoice.kind === 'perk' || currentChoice.kind === 'skill-group')
      ? !!(currentPick && currentPick.chosen)
      : (currentChoice.count > 1)
        ? Array.isArray(currentPick) && currentPick.length === currentChoice.count
        : !!currentPick);

  const next = () => {
    if (!canAdvance) return;
    if (isLast) apply();
    else setStepIdx(i => i + 1);
  };
  const back = () => { if (!isFirst) setStepIdx(i => i - 1); };

  const setPick = (id, value) => setPicks(p => ({ ...p, [id]: value }));

  const apply = () => {
    update(c => applyLevelUp(c, nextLevel, picks, { isEditing }));
    onClose();
  };

  // Skills/perks already held \u2014 so the same one can't be chosen twice. Excludes the level
  // being worked on (its picks live in `picks` state), and folds in this session's sibling
  // picks (other choices at this level) so two choices can't land on the same item.
  const lvlPrefix = 'lvl:' + nextLevel + ':';
  const takenSkills = new Map(), takenPerks = new Map();
  for (const p of collectSkillPicks(character)) if (!p.key.startsWith(lvlPrefix)) takenSkills.set(p.name, p.source);
  for (const p of collectPerkPicks(character)) if (!p.key.startsWith(lvlPrefix)) takenPerks.set(p.name, p.source);
  for (const ch of choices) {
    if (!currentChoice || ch.id === currentChoice.id) continue;
    const p = picks[ch.id];
    if (!p || !p.chosen) continue;
    if (ch.kind === 'skill-group') takenSkills.set(p.chosen, 'this level-up');
    else if (ch.kind === 'perk') takenPerks.set(p.chosen, 'this level-up');
  }
  const currentTaken = currentChoice && currentChoice.kind === 'skill-group' ? takenSkills
    : currentChoice && currentChoice.kind === 'perk' ? takenPerks : null;

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? `Edit Level ${nextLevel} \u2014 ${cls.name}` : `Level ${nextLevel} \u2014 ${cls.name}`} width={960}
      footer={(
        <>
          <Button kind="ghost" onClick={isFirst ? onClose : back}>{isFirst ? (isEditing ? 'CANCEL' : 'NOT YET') : '\u25C2 BACK'}</Button>
          <div style={{flex:1, textAlign:'center', fontFamily:'var(--mono)', fontSize: '0.625rem', color: canAdvance ? 'var(--ink-3)' : 'var(--gold-2)', letterSpacing:'0.22em', textTransform:'uppercase'}}>
            Step {stepIdx + 1} of {steps.length}{!canAdvance ? ' — choose an option to continue' : ''}
          </div>
          <Button kind="primary" disabled={!canAdvance} onClick={next}>
            {isLast ? (isEditing ? 'SAVE \u2713' : 'ASCEND \u25B2') : 'CONTINUE \u25B8'}
          </Button>
        </>
      )}>
      {stepId === 'intro' && <LvlIntro data={data} cls={cls} character={character} nextLevel={nextLevel} isEditing={isEditing} />}
      {currentChoice && <ChoiceStep choice={currentChoice} pick={picks[currentChoice.id]} onPick={(v) => setPick(currentChoice.id, v)} ctx={ctx} taken={currentTaken} />}
      {stepId === 'review' && <LvlReview data={data} picks={picks} choices={choices} cls={cls} nextLevel={nextLevel} character={character} isEditing={isEditing} />}
    </Modal>
  );
}

function makeContext(character) {
  const cls = classDef(character);
  return {
    sub: character.cclass?.subclass || null,
    aspect: character.cclass?.subclass || null,
    domains: character.cclass?.domains || [],
    companion: character.cclass?.companion || null,
    character,
    cls,
  };
}

// All class features gained through level-ups, oldest level first: auto-granted
// features plus 'feature'-kind choice picks (domain features, invocations, ...).
// Shared by the play sheet and the Foundry export so the two can't drift.
// Returns [{ level: number, name: string, text: string }].
function collectLevelUpFeatures(character) {
  const cls = classDef(character);
  const data = cls && LEVELUP_DATA[cls.id];
  if (!data) return [];
  const ctx = makeContext(character);
  const out = [];
  const levels = Object.keys(character.levelChoices || {})
    .map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
  for (const lvl of levels) {
    const dataForLvl = data[lvl];
    if (!dataForLvl) continue;
    const stored = character.levelChoices[lvl];
    const auto = typeof dataForLvl.autoFeatures === 'function'
      ? dataForLvl.autoFeatures(ctx) : (dataForLvl.autoFeatures || []);
    for (const f of auto) if (f && f.name) out.push({ level: lvl, name: f.name, text: f.text || '', table: f.table });
    for (const ch of (dataForLvl.choices || [])) {
      if (ch.kind !== 'feature') continue;
      const p = stored && stored.picks && stored.picks[ch.id];
      if (!p) continue;
      // Multi-picks (count > 1) collapse into one feature named after the choice,
      // listing every selected option (e.g. Melodrama's two drama events).
      if (Array.isArray(p)) {
        const rows = p.filter(o => !(o.ability && !(o.body || o.text)));
        if (rows.length) out.push({ level: lvl, name: ch.label || ch.id, text: rows.map(o => `${o.name} — ${o.body || o.text || ''}`).join('\n') });
        continue;
      }
      // A pick that is purely an embedded ability lives on the combat sheet, not here;
      // one that pairs passive text with an ability keeps only the text.
      if (p.ability && !(p.body || p.text)) continue;
      out.push({ level: lvl, name: p.name || p.id, text: p.body || p.text || '' });
    }
  }
  return out;
}

// The choices the level-up flow presents for a class at a level, with condition-gated
// entries filtered by the character context (exactly what the UI shows).
function levelChoicesFor(cls, level, ctx) {
  const data = (cls && LEVELUP_DATA[cls.id]) ? LEVELUP_DATA[cls.id][level] : null;
  return (data?.choices || []).filter(c => !c.condition || c.condition(ctx));
}

// Pure level-up reducer shared by the LevelUpFlow UI and tests: returns the next
// character with `picks` applied at `nextLevel`.
function applyLevelUp(character, nextLevel, picks, { isEditing = false } = {}) {
  const cls = classDef(character);
  const data = (cls && LEVELUP_DATA[cls.id]) ? LEVELUP_DATA[cls.id][nextLevel] : null;
  if (!data) return character;
  const ctx = makeContext(character);
  const choices = levelChoicesFor(cls, nextLevel, ctx);

  const next = isEditing ? { ...character } : { ...character, level: nextLevel };
  // Characteristic increases are NOT baked into cclass.characteristics (the level-1
  // point-buy). They're derived from level + levelChoices by levelCharBonuses() so the
  // wizard's point-buy validator always sees a valid level-1 spread. The char-bonus pick
  // is persisted below in levelChoices and read back when computing totals.

  // Picked abilities → add to character's signatures / heroic lists.
  // All level-up ability picks live in cclass.levelAbilities[level].
  const levelAbilities = { ...(next.cclass.levelAbilities || {}) };
  const learnedAtThisLevel = [];
  // Auto-granted abilities (no selection): all options received.
  const autoAbilities = typeof data.autoAbilities === 'function' ? data.autoAbilities(ctx) : (data.autoAbilities || []);
  for (const a of autoAbilities) learnedAtThisLevel.push(a);
  for (const ch of choices) {
    const v = picks[ch.id];
    if (!v) continue;
    if (ch.kind === 'ability') {
      learnedAtThisLevel.push(v);
    } else if (ch.kind === 'feature') {
      // Feature options may carry an embedded ability (e.g. a domain feature that
      // grants a maneuver) — the payload lands on the combat sheet as a card.
      for (const p of Array.isArray(v) ? v : [v]) {
        if (p && p.ability) learnedAtThisLevel.push(p.ability);
      }
    }
  }
  // Replace (not append) this level's abilities so edits don't duplicate.
  if (learnedAtThisLevel.length) levelAbilities[nextLevel] = learnedAtThisLevel;
  else delete levelAbilities[nextLevel];
  next.cclass = { ...next.cclass, levelAbilities };

  // Store all level-up picks for transparency on the sheet
  const levelChoices = { ...(next.levelChoices || {}) };
  levelChoices[nextLevel] = { picks: { ...picks }, appliedAt: Date.now() };
  next.levelChoices = levelChoices;

  // When leveling up fresh, reset current stamina so it heals to the new max.
  // When editing, leave current vitals untouched.
  if (!isEditing) next.play = { ...next.play, stamina: null };
  return next;
}

// Pure rollback reducer: undo the fromLevel progression and everything above it,
// returning the character at fromLevel - 1. Only levelChoices and levelAbilities
// are stored per level — every other grant (stamina, perks, skills, characteristic
// increases) is re-derived from level + levelChoices, so nothing else needs
// unwinding. Keys may be strings after a JSON round-trip, hence Number(k).
function deleteLevelProgression(character, fromLevel) {
  const keep = (obj) => Object.fromEntries(
    Object.entries(obj || {}).filter(([k]) => Number(k) < fromLevel)
  );
  return {
    ...character,
    level: Math.max(1, fromLevel - 1),
    levelChoices: keep(character.levelChoices),
    cclass: { ...character.cclass, levelAbilities: keep(character.cclass?.levelAbilities) },
    // Max stamina drops with the level; null is the "heal to full" sentinel.
    play: { ...character.play, stamina: null },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step contents
// ─────────────────────────────────────────────────────────────────────────────
function LvlIntro({ data, cls, character, nextLevel, isEditing }) {
  const ctx = makeContext(character);
  const autoFeatures = typeof data.autoFeatures === 'function' ? data.autoFeatures(ctx) : (data.autoFeatures || []);
  const autoAbilities = typeof data.autoAbilities === 'function' ? data.autoAbilities(ctx) : (data.autoAbilities || []);
  // Full derived max at the new level, so kit/trait/feature bonuses are included.
  const newStamina = computeDerived({ ...character, level: nextLevel }).staminaMax;

  return (
    <div className="stack-16">
      <div style={{textAlign:'center'}}>
        <div style={{fontFamily:'var(--hand)', fontStyle:'italic', fontSize: '1.125rem', color:'var(--gold-2)', lineHeight:1.55, maxWidth: 520, margin:'0 auto'}}>
          “{data.summary}”
        </div>
      </div>
      <OrnDivider glyph={isEditing ? `Revising Lv ${nextLevel}` : `Lv ${character.level}  \u2192  Lv ${nextLevel}`} size="small" />

      <div className="grid-2" style={{gap:14}}>
        <div className="orn-frame" style={{padding:'14px 18px'}}>
          <H4Meta>Mechanical Gains</H4Meta>
          <div style={{fontFamily:'var(--serif)', fontSize: '0.875rem', color:'var(--ink-2)', lineHeight:1.5}}>
            <div><b style={{color:'var(--gold-2)'}}>+{data.staminaGain}</b> maximum Stamina (→ {newStamina})</div>
            {data.autoCharacteristicIncrease && Object.entries(data.autoCharacteristicIncrease).filter(([k]) => k !== 'max').map(([k, v]) => (
              <div key={k}>{k} score raised to <b style={{color:'var(--gold-2)'}}>{v}</b></div>
            ))}
            {data.autoCharIncreaseAll && <div>All characteristics <b style={{color:'var(--gold-2)'}}>+{data.autoCharIncreaseAll.delta}</b> (max {data.autoCharIncreaseAll.max})</div>}
          </div>
        </div>

        <div className="orn-frame" style={{padding:'14px 18px'}}>
          <H4Meta>New Features</H4Meta>
          {autoFeatures.length === 0 ? (
            <div style={{fontFamily:'var(--hand)', fontStyle:'italic', color:'var(--ink-3)', fontSize: '0.8125rem'}}>No automatic features at this level.</div>
          ) : (
            <div className="stack-8">
              {autoFeatures.map(f => (
                <div key={f.name}>
                  <div style={{fontFamily:'var(--display-2)', fontSize: '0.8125rem', fontWeight:700, letterSpacing:'0.14em', color:'var(--ink)', textTransform:'uppercase'}}>{f.name}</div>
                  <div style={{fontFamily:'var(--serif)', fontSize: '0.8125rem', color:'var(--ink-2)', lineHeight:1.5, marginTop:3}}>{renderRich(f.text)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {autoAbilities.length > 0 && (
        <div>
          <H4Meta>Abilities Granted</H4Meta>
          <div style={{fontFamily:'var(--serif)', fontStyle:'italic', fontSize: 'var(--fs-7)', color:'var(--ink-2)', lineHeight:1.55, marginTop:4, marginBottom:10}}>
            {autoAbilities.length === 1
              ? 'You receive the following ability automatically.'
              : 'You receive all of the following abilities automatically.'}
          </div>
          <div className="grid-2" style={{gap:10}}>
            {autoAbilities.map(a => (
              <AbilityCard key={a.name} ability={normalizeCardTiers(a)} kind="heroic" />
            ))}
          </div>
        </div>
      )}

      <div style={{textAlign:'center', fontFamily:'var(--mono)', fontSize: '0.625rem', color:'var(--ink-3)', letterSpacing:'0.22em', textTransform:'uppercase'}}>
        {isEditing ? 'Press Continue to revise your choices for this level.' : 'Press Continue to choose what else this level brings.'}
      </div>
    </div>
  );
}

function ChoiceStep({ choice, pick, onPick, ctx, taken }) {
  const opts = typeof choice.options === 'function' ? choice.options(ctx) : choice.options;
  const isPerk = choice.kind === 'perk';
  const isSkill = choice.kind === 'skill-group';
  // Multi-picks (count > 1): the pick is an array of options, toggled in and out,
  // capped at `count` (a click past capacity is ignored, like the wizard's pickers).
  const isMulti = choice.count > 1;
  const multiPicked = isMulti ? (Array.isArray(pick) ? pick : []) : null;
  // Both perks and skill groups use a two-tier flow: pick a group, then a specific item.
  const isTiered = isPerk || isSkill;
  // For tiered picks: pick shape is { ...categoryOption, chosen: 'ItemName' }
  const currentCategory = pick ? (pick.id || pick.name) : null;
  // Derive specific items from the picked category.
  let tierItems = [];
  if (isPerk && pick) {
    tierItems = (window.PERKS && window.PERKS[deriveGroupName(pick)]) || [];
  } else if (isSkill && pick) {
    // DS_SKILL_GROUPS is keyed by lowercase group id (matches the option id).
    const key = pick.id || deriveGroupName(pick)?.toLowerCase();
    tierItems = ((window.DS_SKILL_GROUPS && window.DS_SKILL_GROUPS[key]) || []).map(s => ({ name: s, text: '' }));
  }
  const tierNoun = isSkill ? 'Skills' : 'Perks';
  const tierPrompt = isSkill ? 'Choose one specific skill from this group.' : 'Choose one specific perk from this group.';
  return (
    <div className="stack-16">
      <div>
        <H3>{choice.label}</H3>
        {choice.help && (
          <div style={{fontFamily:'var(--serif)', fontStyle:'italic', fontSize: '0.875rem', color:'var(--ink-2)', lineHeight:1.55, marginTop:4}}>{choice.help}</div>
        )}
        {isMulti && (
          <div style={{fontFamily:'var(--mono)', fontSize: '0.625rem', color: multiPicked.length === choice.count ? 'var(--ink-3)' : 'var(--gold-2)', letterSpacing:'0.22em', textTransform:'uppercase', marginTop:6}}>
            {multiPicked.length} / {choice.count} chosen
          </div>
        )}
      </div>

      <div className="stack-12">
        {opts.length === 0 && (
          <div style={{fontFamily:'var(--hand)', fontStyle:'italic', color:'var(--ink-3)', fontSize: '0.875rem', textAlign:'center', padding:'20px 0'}}>
            (No options available for your current build.)
          </div>
        )}
        {opts.map(opt => {
          const matches = (p) => !!p && (
            (opt.name != null && p.name === opt.name) ||
            (opt.id != null && p.id === opt.id) ||
            p === opt
          );
          const selected = isMulti ? multiPicked.some(matches) : matches(pick);
          return (
            <OptionCard
              key={opt.name || opt.id}
              opt={opt}
              kind={choice.kind}
              selected={selected}
              onClick={() => {
                if (isMulti) {
                  if (selected) onPick(multiPicked.filter(p => !matches(p)));
                  else if (multiPicked.length < choice.count) onPick([...multiPicked, opt]);
                } else if (isTiered) {
                  // Switching category resets the specific pick; clicking the same category clears it.
                  if (currentCategory === (opt.id || opt.name)) onPick(null);
                  else onPick({ ...opt, chosen: null });
                } else {
                  onPick(opt);
                }
              }}
            />
          );
        })}
      </div>

      {isTiered && pick && tierItems.length > 0 && (
        <div className="stack-12">
          <OrnDivider glyph={`${deriveGroupName(pick)} ${tierNoun}`} size="small" />
          <div style={{fontFamily:'var(--serif)', fontStyle:'italic', fontSize: 'var(--fs-7)', color:'var(--ink-2)', lineHeight:1.55, marginTop:-4, textAlign:'center'}}>
            {tierPrompt}
          </div>
          <div className={isSkill ? 'skill-pick-grid' : 'grid-2'} style={isSkill ? undefined : {gap:10}}>
            {tierItems.map(p => {
              const selected = pick.chosen === p.name;
              const blocked = !selected && taken && taken.has(p.name);
              return (
                <button
                  type="button"
                  key={p.name}
                  disabled={blocked || undefined}
                  aria-pressed={selected}
                  className={`card-btn lvl-opt simple ${isSkill ? 'compact' : ''} ${selected ? 'selected' : ''} ${blocked ? 'blocked' : ''}`}
                  onClick={() => !blocked && onPick({ ...pick, chosen: p.name, chosenText: p.text })}
                  title={blocked ? `Already chosen — ${taken.get(p.name)}` : ''}
                >
                  <div className="lvl-opt-name">{p.name}</div>
                  {blocked ? <div className="lvl-opt-body">Already chosen — {taken.get(p.name)}</div>
                    : p.text ? <div className="lvl-opt-body">{renderRich(p.text)}</div> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Strip " Perk"/" Skill" suffix, fall back to PERKS key match on id (capitalised).
function deriveGroupName(opt) {
  if (!opt) return null;
  if (opt.name && /(Perk|Skill)$/i.test(opt.name)) return opt.name.replace(/\s*(Perk|Skill)$/i, '').trim();
  if (opt.id) return opt.id.charAt(0).toUpperCase() + opt.id.slice(1);
  return null;
}

// AbilityCard needs tiers in [[label, text], \u2026] form plus a powerRoll header.
function normalizeCardTiers(a) {
  if (!a.tiers || Array.isArray(a.tiers)) return a;
  return {
    ...a,
    tiers: [
      ['\u2264 11', a.tiers.t1],
      ['12\u201316', a.tiers.t2],
      ['\u2265 17', a.tiers.t3],
    ],
    powerRoll: a.powerRoll || (a.resource === 'Piety' ? 'I' : 'M'),
  };
}

function OptionCard({ opt, kind, selected, onClick }) {
  // For abilities, normalize tiers shape and render an AbilityCard.
  if (kind === 'ability') {
    return (
      <button type="button" aria-pressed={!!selected} className={`card-btn lvl-opt ${selected ? 'selected' : ''}`} onClick={onClick}>
        <AbilityCard ability={normalizeCardTiers(opt)} kind="heroic" />
      </button>
    );
  }
  // A feature option carrying only an embedded ability IS that ability \u2014 show the card.
  if (opt.ability && !opt.body) {
    return (
      <button type="button" aria-pressed={!!selected} className={`card-btn lvl-opt ${selected ? 'selected' : ''}`} onClick={onClick}>
        <AbilityCard ability={normalizeCardTiers(opt.ability)} kind="heroic" />
      </button>
    );
  }
  return (
    <button type="button" aria-pressed={!!selected} className={`card-btn lvl-opt simple ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="lvl-opt-name">{opt.name}</div>
      {opt.body && <div className="lvl-opt-body">{renderRich(opt.body)}</div>}
      {opt.ability && <div style={{marginTop: 10}}><AbilityCard ability={normalizeCardTiers(opt.ability)} kind="heroic" /></div>}
    </button>
  );
}

function LvlReview({ data, picks, choices, cls, nextLevel, character, isEditing }) {
  const ctx = makeContext(character);
  const autoFeatures = typeof data.autoFeatures === 'function' ? data.autoFeatures(ctx) : (data.autoFeatures || []);
  const autoAbilities = typeof data.autoAbilities === 'function' ? data.autoAbilities(ctx) : (data.autoAbilities || []);
  const newStamina = computeDerived({ ...character, level: nextLevel }).staminaMax;
  const charInc = data.autoCharacteristicIncrease
    ? Object.entries(data.autoCharacteristicIncrease).filter(([k]) => k !== 'max')
    : [];
  const pickedAbilities = choices
    .filter(ch => ch.kind === 'ability' && picks[ch.id])
    .map(ch => picks[ch.id]);
  const otherPicks = choices.filter(ch => ch.kind !== 'ability' && picks[ch.id]);

  return (
    <div className="stack-16">
      <div style={{textAlign:'center'}}>
        <H3>{isEditing ? 'Confirm Your Revisions' : 'Confirm the Ascension'}</H3>
        <div style={{fontFamily:'var(--hand)', fontStyle:'italic', color:'var(--ink-2)', fontSize: '0.875rem', marginTop:6}}>
          {isEditing
            ? `Your updated choices for Lv ${nextLevel}, to be re-recorded in the Liber.`
            : `Everything gained as you step into Lv ${nextLevel}, recorded in the Liber.`}
        </div>
      </div>

      {/* Mechanical gains */}
      <div className="orn-frame" style={{padding:'14px 18px'}}>
        <H4Meta>Mechanical Gains</H4Meta>
        <div style={{fontFamily:'var(--serif)', fontSize: '0.875rem', color:'var(--ink-2)', lineHeight:1.6}}>
          <div><b style={{color:'var(--gold-2)'}}>+{data.staminaGain}</b> maximum Stamina (→ {newStamina})</div>
          {charInc.map(([k, v]) => (
            <div key={k}>{k} score raised to <b style={{color:'var(--gold-2)'}}>{v}</b></div>
          ))}
          {data.autoCharIncreaseAll && <div>All characteristics <b style={{color:'var(--gold-2)'}}>+{data.autoCharIncreaseAll.delta}</b> (max {data.autoCharIncreaseAll.max})</div>}
          {otherPicks.filter(ch => ch.kind === 'char-bonus').map(ch => {
            const p = picks[ch.id];
            return <div key={ch.id}>+1 to <b style={{color:'var(--gold-2)'}}>{p.name || p.id || p}</b></div>;
          })}
        </div>
      </div>

      {/* New features (automatic) */}
      {autoFeatures.length > 0 && (
        <div className="orn-frame" style={{padding:'14px 18px'}}>
          <H4Meta>New Features</H4Meta>
          <div className="stack-8">
            {autoFeatures.map(f => (
              <div key={f.name}>
                <div style={{fontFamily:'var(--display-2)', fontSize: '0.8125rem', fontWeight:700, letterSpacing:'0.14em', color:'var(--ink)', textTransform:'uppercase'}}>{f.name}</div>
                <div style={{fontFamily:'var(--serif)', fontSize: '0.8125rem', color:'var(--ink-2)', lineHeight:1.5, marginTop:3}}>{renderRich(f.text)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other chosen benefits (perks, skills, features) */}
      {otherPicks.filter(ch => ch.kind !== 'char-bonus').length > 0 && (
        <div className="stack-12">
          {otherPicks.filter(ch => ch.kind !== 'char-bonus').map(ch => {
            const pick = picks[ch.id];
            if (Array.isArray(pick)) {
              // Multi-pick (count > 1): every selected option inside the choice's frame.
              return (
                <div key={ch.id} className="orn-frame" style={{padding:'12px 16px'}}>
                  <div style={{fontFamily:'var(--mono)', fontSize: '0.5625rem', color:'var(--gold-2)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:4}}>{ch.label}</div>
                  <div className="stack-8">
                    {pick.map(o => (
                      <div key={o.name || o.id}>
                        <div style={{fontFamily:'var(--display-2)', fontSize: '0.875rem', fontWeight:700, letterSpacing:'0.14em', color:'var(--ink)'}}>{o.name}</div>
                        {o.body && <div style={{fontFamily:'var(--serif)', fontSize: '0.8125rem', color:'var(--ink-2)', marginTop:4, lineHeight:1.5}}>{renderRich(o.body)}</div>}
                        {o.ability && <div style={{marginTop:8}}><AbilityCard ability={normalizeCardTiers(o.ability)} kind="heroic" /></div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div key={ch.id} className="orn-frame" style={{padding:'12px 16px'}}>
                <div style={{fontFamily:'var(--mono)', fontSize: '0.5625rem', color:'var(--gold-2)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:4}}>{ch.label}</div>
                <div style={{fontFamily:'var(--display-2)', fontSize: '0.875rem', fontWeight:700, letterSpacing:'0.14em', color:'var(--ink)'}}>
                  {pick.chosen
                    ? <>{pick.chosen} <span style={{fontFamily:'var(--mono)', fontSize: '0.625rem', color:'var(--ink-3)', letterSpacing:'0.18em', marginLeft:6}}>({pick.name || pick})</span></>
                    : (pick.name || pick)}
                </div>
                {pick.chosen && pick.chosenText && <div style={{fontFamily:'var(--serif)', fontSize: '0.8125rem', color:'var(--ink-2)', marginTop:4, lineHeight:1.5}}>{renderRich(pick.chosenText)}</div>}
                {!pick.chosen && pick.body && <div style={{fontFamily:'var(--serif)', fontSize: '0.8125rem', color:'var(--ink-2)', marginTop:4, lineHeight:1.5}}>{renderRich(pick.body)}</div>}
                {pick.ability && <div style={{marginTop:8}}><AbilityCard ability={normalizeCardTiers(pick.ability)} kind="heroic" /></div>}
                {pick.effect && <div style={{fontFamily:'var(--serif)', fontSize: 'var(--fs-6)', color:'var(--ink-3)', marginTop:4, lineHeight:1.5, fontStyle:'italic'}}>{renderRich(pick.effect)}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Abilities gained — both auto-granted and picked */}
      {(autoAbilities.length > 0 || pickedAbilities.length > 0) && (
        <div>
          <H4Meta>Abilities Gained</H4Meta>
          <div className="grid-2" style={{gap:10, marginTop:8}}>
            {[...autoAbilities, ...pickedAbilities].map(a => (
              <AbilityCard key={a.name} ability={normalizeCardTiers(a)} kind="heroic" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const LEVELUP_CSS = `
.lvl-opt {
  cursor: pointer; position: relative;
  transition: transform .12s, filter .12s;
  border: 1px solid transparent; padding: 4px;
}
.lvl-opt.simple {
  padding: 14px 18px;
  border: 1px solid var(--line-2);
  background: linear-gradient(180deg, rgba(20,20,26, calc(0.55 * var(--surface-alpha, 1))), rgba(14,14,18, calc(0.62 * var(--surface-alpha, 1))));
}
.lvl-opt:hover { border-color: var(--gold-deep); }
.lvl-opt.blocked {
  opacity: 0.4; cursor: not-allowed;
}
.lvl-opt.blocked:hover { border-color: var(--line-2); }
.lvl-opt.blocked .lvl-opt-name { text-decoration: line-through; }
.lvl-opt.selected {
  border-color: var(--gold);
  box-shadow: 0 0 20px var(--gold-glow), inset 0 0 0 1px rgba(176,138,72,0.25);
}
.lvl-opt.selected::after {
  content: '\u2720'; position: absolute; top: 6px; right: 10px;
  font-family: var(--display); font-size: var(--fs-7); color: var(--gold);
}
/* Compact skill chips are small + center-aligned; the corner diamond would sit over the
   label, so drop it (the gold border + glow already mark selection). */
.lvl-opt.simple.compact.selected::after { display: none; }
.lvl-opt-name {
  font-family: var(--display-2); font-size: var(--fs-7); font-weight: 700;
  letter-spacing: 0.16em; color: var(--ink); text-transform: uppercase;
}
/* Perk cards (non-compact): keep a right gutter so a long/wrapping name never runs under
   the selection diamond. */
.lvl-opt.simple:not(.compact) .lvl-opt-name { padding-right: 20px; }
.lvl-opt-body {
  font-family: var(--serif); font-size: var(--fs-6); color: var(--ink-2);
  line-height: 1.55; margin-top: 6px;
}
.skill-pick-grid {
  /* Skill names vary in length, so a bare 1fr would floor each track at the
     longest name in that column and the three would come out unequal. */
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;
}
.lvl-opt.simple.compact { padding: 10px 12px; text-align: center; }
.lvl-opt.simple.compact .lvl-opt-name { font-size: var(--fs-5); letter-spacing: 0.1em; }
${MQ.phone} { .skill-pick-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`;
function LevelUpStyles() { return <style>{LEVELUP_CSS}</style>; }

Object.assign(window, { LEVELUP_DATA, LevelUpFlow, LevelUpStyles, makeContext, DOMAIN_1ST_FEATURES, DOMAIN_2_ABILITIES, DOMAIN_4_FEATURES, CENSOR_DOMAIN_1 });
export { LEVELUP_DATA, LevelUpFlow, LevelUpStyles, makeContext, collectLevelUpFeatures, levelChoicesFor, applyLevelUp, deleteLevelProgression, deriveGroupName, DOMAIN_1ST_FEATURES, DOMAIN_2_ABILITIES, DOMAIN_4_FEATURES, CENSOR_DOMAIN_1, CENSOR_DOMAIN_4, CENSOR_DOMAIN_7 };
