import React from 'react';
import { OrnDivider, GlyphRow, Button, H3, H4Meta, Modal, AbilityCard } from './theme.jsx';
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
        { name: 'Look On My Work and Despair', text: 'Whenever you use Judgment, you can spend 1 wrath; if the target has P < AVERAGE they are frightened of you (save ends). When a creature judged by you drops to 0 Stamina and you re-judge as a free triggered action, a new target with P < STRONG is frightened (save ends); if already frightened of you, they instead take holy damage equal to twice your Presence score.' },
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
        { name: 'Implement of Wrath', text: 'Each respite, choose one hero\u2019s weapon to become magic until your next respite: strikes deal extra holy damage equal to the wielder\u2019s highest characteristic; a struck creature with holy weakness and P < STRONG is frightened and weakened (save ends); minions struck die; and the wielder can\u2019t be made frightened.' },
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
        { name: 'Improved Implement of Wrath', text: 'Your Implement of Wrath also grants: the wielder and adjacent allies gain +2 to saving throws; at the end of the wielder\u2019s turns, each adjacent ally saves against each save-ends effect on them; and the wielder has corruption immunity 10.' },
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
        { name: 'Templar', text: 'Whenever you use Judgment, you can use a free triggered action to use a conduit domain effect associated with your domain (or a domain accessed via Virtue), using Presence for Intuition and your censor level for conduit level. You can also open a portal to rest in your deity\u2019s presence, ask three questions, and travel to any place your deity is worshipped.' },
        { name: 'Virtue', text: 'You gain an epic resource called virtue. Each respite you gain virtue equal to the XP you gain, and you can spend it on abilities as if it were wrath. Spend 3 virtue to access one of your deity\u2019s other domains until your next respite. Virtue remains until spent.' },
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
          name: 'Unstoppable Force', text: 'Whenever you use the Charge main action, you can use a strike signature or strike heroic ability instead of a free strike. You can also jump as part of your charge.',
        },
        sub === 'reaver' && {
          name: 'Inescapable Wrath', text: 'You gain a bonus to speed equal to your Agility score, and you ignore difficult terrain.',
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
            distance: 'Melee 1', target: 'One ally',
            effect: 'You vertically push the target up to 4 squares. This forced movement ignores the target\u2019s stability, and the target takes no damage from colliding with creatures or objects. At the end of this movement, the target can make a free strike that deals extra damage equal to your Might score.',
          }),
          ab('Wrecking Ball', {
            cost: 5, resource: 'Ferocity', flavor: 'It\u2019s easier to destroy than to create. Much easier, in fact!',
            keywords: ['Melee', 'Weapon'], type: 'Maneuver',
            distance: 'Self', target: 'Self',
            tiers: { t1: 'push 1', t2: 'push 2', t3: 'push 3' },
            effect: 'You move up to your speed in a straight line. During this movement, you can move through mundane structures, including walls, which are difficult terrain for you. You automatically destroy each square of structure you move through and leave behind a square of difficult terrain.\n\nAdditionally, you make one power roll that targets each enemy you move adjacent to during this movement.',
          }),
        ],
        reaver: [
          ab('Death ... Death!', {
            cost: 5, resource: 'Ferocity', flavor: 'Your unbridled rage strikes terror in their hearts.',
            keywords: ['Melee', 'Strike', 'Weapon'], type: 'Main action',
            distance: 'Melee 1', target: 'One creature',
            tiers: {
              t1: '3 + M damage; P < WEAK, dazed and frightened (save ends)',
              t2: '5 + M damage; M < AVERAGE, dazed and frightened (save ends)',
              t3: '8 + M damage; M < STRONG, dazed and frightened (save ends)',
            },
          }),
          ab('Phalanx-Breaker', {
            cost: 5, resource: 'Ferocity', flavor: 'Organizing your forces like feckless creatures of Law. Pitiful.',
            keywords: ['Melee', 'Weapon'], type: 'Main action',
            distance: 'Self', target: 'Self',
            tiers: { t1: '2 damage; A < WEAK, dazed (save ends)', t2: '4 damage; A < AVERAGE, dazed (save ends)', t3: '6 damage; A < STRONG, dazed (save ends)' },
            effect: 'You shift up to your speed and make one power roll that targets up to three enemies you move adjacent to during this shift.',
          }),
        ],
        stormwight: [
          ab('Apex Predator', {
            cost: 5, resource: 'Ferocity', flavor: 'I will hunt you down.',
            keywords: ['Melee', 'Strike', 'Weapon'], type: 'Main action',
            distance: 'Melee 1', target: 'One creature',
            tiers: { t1: '4 + M damage; I < WEAK, slowed (save ends)', t2: '6 + M damage; M < AVERAGE, slowed (save ends)', t3: '10 + M damage; M < STRONG, slowed (save ends)' },
            effect: 'The target can\u2019t be hidden from you for 24 hours. Until the end of the encounter, whenever the target willingly moves, you can use a free triggered action to move.',
          }),
          ab('Visceral Roar', {
            cost: 5, resource: 'Ferocity', flavor: 'The sound of the storm within you staggers your opponents.',
            keywords: ['Area', 'Magic'], type: 'Main action',
            distance: '2 burst', target: 'Each enemy in the area',
            tiers: { t1: '2 cold and corruption and fire and lightning damage; push 1; M < WEAK, dazed (save ends)', t2: '5 cold and corruption and fire and lightning damage; push 2; M < AVERAGE, dazed (save ends)', t3: '7 cold and corruption and fire and lightning damage; push 3; M < STRONG, dazed (save ends)' },
            effect: 'This ability deals your primordial damage type.',
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
          name: 'Immovable Object', text: 'You add your level to your effective size for interacting with creatures and objects (lifting, forced movement, etc.). You gain a bonus to stability equal to your Might score.',
        },
        sub === 'reaver' && {
          name: 'See Through Their Tricks', text: 'Double edge on tests to search for hidden creatures, discern hidden motives, or detect lies. Also double edge on tests made to gamble.',
        },
        sub === 'stormwight' && {
          name: 'Nature\u2019s Knight', text: 'You can speak with animals and elementals. You also automatically sense the presence of animals and elementals within 10 squares, even if hidden.',
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
              effect: 'You gain 20 Stamina.',
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
        { name: 'Primordial Attunement',   text: 'You automatically sense damage immunities, weaknesses, and elemental sources within 10 squares.' },
        { name: 'Primordial Strike',       text: 'As part of any strike, spend 1 ferocity to gain 1 surge for that strike. Its extra damage can be elemental (acid, cold, corruption, fire, lightning, poison, or sonic).' },
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
        { name: 'The Lists of Heaven', text: 'Whenever you allow another creature to spend a Recovery, you can also spend a Recovery.' },
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
            return f ? { id: d, name: `${d}: ${f.name}`, body: f.text } : null;
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
        { name: 'Minor Miracle', text: 'As a respite activity, perform a ritual to restore a willing dead creature to life. They must have at least half their remains and have died within 24 hours from a non-age effect. They return at full Stamina and half Recoveries; you regain only half your Recoveries.' },
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
              effect: 'The target gains ​20 Stamina and gains 3 surges.',
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
        { name: 'Blessed Domain',       text: 'Whenever you gain piety from a domain feature, you gain 1 additional piety.' },
        { name: 'Characteristic Increase', text: 'Your Intuition score increases to 3. Additionally, you can increase one of your characteristic scores by 1 (max 3).' },
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
            return f ? { id: d, name: `${d}: ${f.name}`, body: f.text } : null;
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
        sub === 'earth' && { name: 'Disciple of Earth', text: 'Your body is strengthened by your connection to permanence. You gain a +6 bonus to Stamina, plus an additional +3 bonus to Stamina whenever you gain a level past 2nd.' },
        sub === 'fire' && { name: 'Disciple of Fire', text: 'You have fire immunity equal to 5 + your level, and your fire damage ignores a target\u2019s fire immunity. At the start of a combat encounter, you gain surges equal to your Victories; surge damage you deal can be fire damage.' },
        sub === 'green' && { name: 'Disciple of the Green', text: 'As a maneuver, you can shapeshift into a creature from the Green Animal Forms table (by level), speaking and making Reason-based melee free strikes. Revert as a maneuver; you revert and lock when dying.' },
      ].filter(Boolean),
      autoAbilities: ({ sub }) => (sub === 'void' ? [
        ab('There Is No Space Between', { noBadge: true,
          flavor: 'Knowledge of the mystery reveals that two spaces are the same space.',
          keywords: ['Magic', 'Ranged', 'Void'], type: 'Maneuver', distance: 'Ranged 10', target: 'Special',
          effect: 'You open two size 1 portals in unoccupied spaces within distance, which last until you move beyond distance from any portal, end the effect as a maneuver, or are dying. Each portal must be placed at a height of no more than 1 square above the ground. When you or any ally touch a portal, that creature can choose to be instantly teleported to an unoccupied space of their choice adjacent to the other portal. If an enemy is force moved into a portal, their forced movement ends and they emerge from the other portal in an unoccupied space chosen by the creature who force moved them.\n\nAt the start of each of your turns while the portals are active, you can open a new portal connected to the others. If three or more por tals are present, you and your allies choose which portal to emerge from when entering a portal, and a creature who force moves an enemy into a portal chooses that enemy’s destination portal.',
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
            ab('O Flower Aid, O Earth Defend', { cost: 5, resource: 'Essence', flavor: 'Revitalizing plants and jagged stones grow, helping allies and hinder ing foes.',
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
              tiers: { t1: '5 + R fire damage; A < WEAK, restrained (save ends)', t2: '9 + R fire damage; R < AVERAGE, restrained (save ends)', t3: '12 + R fire damage; R < STRONG, restrained (save ends)' } }),
          ],
        },
      ],
    },
    3: {
      summary: 'Your mastery sharpens, and the element teaches you a deeper secret.',
      staminaGain: 6,
      autoFeatures: ({ sub }) => [
        sub === 'fire' && { name: 'A Conversation With Fire', text: 'Spend 1 uninterrupted minute before a fire to speak a creature\u2019s name; if willing, their image appears and you can converse as if together in person.' },
        sub === 'void' && { name: 'Distance Is Only Memory', text: 'Each respite, you can open a two-way portal to any place you have previously been. You and allies can pass through; it remains for 1 hour or until you dismiss it (main action).' },
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
        { name: 'Characteristic Increase', text: 'Your Reason score increases to 3. Additionally, you can increase one of your characteristic scores by 1 (max 3).' },
        { name: 'Font of Essence', text: 'The first time each combat round that you or a creature within 10 squares takes damage that isn\u2019t untyped or holy, you gain 2 essence instead of 1.' },
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
Object.assign(LEVELUP_DATA, { troubadour, shadow, null: nul, tactician, talent });

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
    return f ? { id: d, domain: d, name: `${d}: ${f.name}`, body: f.text } : null;
  }).filter(Boolean);
}

const CENSOR_ORDER_FEATURES_2 = {
  exorcist: [
    { name: 'Saint\u2019s Vigilance', text: 'A creature judged by you can\u2019t use the Hide maneuver, and you gain an edge when searching for hidden creatures. If you find a hidden creature, you can use Judgment against them as a free triggered action.' },
    { name: 'A Sense for Truth',     text: 'If a creature is of a lower level than you, you automatically know when they are lying (though not the truth behind it). You also gain an edge on tests to detect lies or hidden motives.' },
  ],
  oracle: [
    { name: 'It Was Foretold', text: 'At the start of an encounter, you can take one main action before any other creature and before your first turn. Whenever the Director calls for a montage test, you can make one free test before the montage begins, counting as an earned success or failure.' },
    { name: 'Judge of Character', text: 'Whenever you would make an Intuition test, you can make a Presence test instead.' },
  ],
  paragon: [
    { name: 'Lead by Example', text: 'While you are adjacent to a creature, your allies gain the benefits of flanking against that creature. Your allies also gain an edge on tests made to aid other creatures with their tests.' },
    { name: 'Stalwart Icon', text: 'You gain an edge on tests made to intimidate or persuade others.' },
  ],
};

const CENSOR_ORDER_ABILITIES_2 = {
  exorcist: [
    ab('It Is Justice You Fear', { cost: 5, resource: 'Wrath', flavor: 'I am but a vessel. Your own deeds weigh upon you.',
      keywords: ['Magic','Ranged','Strike'], type: 'Main action', distance: 'Ranged 10', target: 'One creature',
      powerRoll: 'Might', tiers: [['\u226411','8 + M holy damage; P < WEAK, frightened (save ends)'],['12\u201316','12 + M holy; P<AVERAGE, frightened (save)'],['17+','15 + M holy; P<STRONG, frightened (save)']],
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
  exorcist: { name: 'Evil Revealed', text: 'You automatically see through disguises and illusions of creatures your level or lower, and gain an edge against those of more powerful creatures. Whenever you see through a creature\u2019s disguise or illusion, you can use Judgment against them as a free triggered action.' },
  oracle:   { name: 'Prophecy', text: 'Each time you earn Victories, make that many 2d10 rolls and record them in order. Whenever you or a creature within 10 squares makes a power roll, you can use a free triggered action to replace the dice total with your first recorded roll. Unused rolls are discarded when you finish a respite.' },
  paragon:  { name: 'Stand Fast!', text: 'At the start of each of your turns, you can spend 1d6 Stamina to end one save-ends or end-of-turn effect on you. Any ally who starts their turn within 5 squares of you can also spend Stamina to gain this benefit.' },
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
      powerRoll: 'Presence', tiers: [['\u226411','slide 3; I < WEAK, dazed (save ends)'],['12\u201316','Slide 5; I<AVERAGE, dazed (save)'],['17+','Slide 7; I<STRONG, dazed (save)']] }),
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
      effect: 'The target is unaffected by the strike and you become the target instead, even if you aren’t a valid target for it. You take half the damage from the strike, and the target gains gains 3 surges.' }),
  ],
};

const CENSOR_ORDER_FEATURE_8 = {
  exorcist: { name: 'Demonologist', text: 'You treat your Renown as 2 higher when dealing with demons, devils, and other agents of chaos. If you complete a negotiation with one, you gain an edge on power rolls against them and can use Judgment against them as a free triggered action before an encounter begins.' },
  oracle:   { name: 'Their Past Revealed', text: 'While speaking with any creature, you can make a medium Presence test to see visions of their past. Success: a clear view of any subject you wish. Success with a consequence: two visions, one false and one true. Failure: lose 2d6 Stamina.' },
  paragon:  { name: 'Vow', text: 'Your words carry your deity\u2019s authority. If you convince a creature to take an oath, they can\u2019t break it for 7 days. If you take an oath, you can\u2019t break it for 7 days.' },
};

const CENSOR_ORDER_ABILITIES_9 = {
  exorcist: [
    ab('Banish', { cost: 11, resource: 'Wrath', flavor: 'You sever the target\u2019s tenuous connection to the world.',
      keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature',
      powerRoll: 'Might', tiers: [['\u226411','5 + M damage; P < WEAK, the target is banished (save ends)'],['12\u201316','8 + M; P<AVERAGE, banished (save)'],['17+','11 + M; P<STRONG, banished (save)']],
      effect: 'This ability gains an edge against demons, devils, undead, and creatures not native to your current world. If you know the target’s true name, this ability has a double edge. While , the target is sent to another manifold in the timescape and removed from the encounter map. A banished target can do nothing but make saving throws, and takes 10 holy damage each time they do so. If the target is reduced to 0 Stamina while banished, they are lost to the timescape.' }),
    ab('Terror Manifest', { cost: 11, resource: 'Wrath', flavor: '“I know what you fear.”.',
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
      powerRoll: 'Might', tiers: [['\u226411','13 + M holy'],['12\u201316','19 + M holy'],['17+','26 + M holy']],
      effect: 'Until the end of the encounter or until you are dying, the target has damage weakness 10.' }),
    ab('Edict of Unyielding Resolve', { cost: 11, resource: 'Wrath', flavor: 'You and your allies are clad in shimmering armor.',
      keywords: ['Area','Magic'], type: 'Maneuver', distance: '2 aura', target: 'Self and each ally in the area',
      effect: 'Until the end of the encounter or until you are dying, each target who starts their turn in the area gains 10 temporary Stamina.' }),
  ],
};

const CENSOR_WRATH_7 = [
  ab('Edict of Disruptive Isolation', { cost: 7, resource: 'Wrath', flavor: 'The evil within your foes detonates with holy fire that burns only the guilty.',
    keywords: ['Area','Magic'], type: 'Maneuver', distance: '2 aura', target: 'Each enemy in the area',
    effect: 'Until the end of the encounter or until you are dying, each target takes holy damage equal to your Presence score at the end of each of your turns. A target takes an extra 2d6 holy damage if they are judged by you or if they are adjacent to any enemy. 2d6+3*@P holy damage.' }),
  ab('Edict of Perfect Order', { cost: 7, resource: 'Wrath', flavor: 'Within the area of your divine presence, your enemies will regret using their fell abilities.',
    keywords: ['Area','Magic'], type: 'Maneuver', distance: '2 aura', target: 'Each enemy in the area',
    effect: 'Until the end of the encounter or until you are dying, whenever a target uses an ability that costs **Malice**, they take holy damage equal to three times your Presence score. A target judged by you takes an extra 2d6 holy damage. 2d6+3*@P holy damage.' }),
  ab('Edict of Purifying Pacifism', { cost: 7, resource: 'Wrath', flavor: 'You shed a righteous energy that punishes enemies who would harm you or your allies.',
    keywords: ['Area','Magic'], type: 'Maneuver', distance: '2 aura', target: 'Each enemy in the area',
    effect: 'Until the end of the encounter or until you are dying, whenever a target makes a strike, they take holy damage equal to twice your Presence score. A target judged by you takes an extra 2d6 holy damage. 2d6+2*@P holy damage.' }),
  ab('Edict of Stillness', { cost: 7, resource: 'Wrath', flavor: 'The holy aura you project makes it painful for evil-doers to leave your reach.',
    keywords: ['Area','Magic'], type: 'Maneuver', distance: '2 aura', target: 'Each enemy in the area',
    effect: 'Until the end of the encounter or until you are dying, when ever a target moves or is force moved out of the area, they take holy damage equal to twice your Presence score. A target judged by you who moves willingly takes an extra 2d6 holy damage. 2d6+2*@P holy damage.' }),
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
    powerRoll: 'Might', tiers: [['\u226411','10+ M damage'],['12\u201316','14 + M damage'],['17+','20 + M damage']],
    effect: 'Until the end of the encounter, whenever any ally deals damage to a target judged by you, that ally gains 1 surge.' }),
  ab('Shield of the Righteous', { effect: '10 temporary Stamina 15 temporary Stamina 20 temporary Stamina', cost: 9, resource: 'Wrath', flavor: 'You strike a foe and create a fleet of divine shields that protect your allies.',
    keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature',
    powerRoll: 'Might', tiers: [['\u226411','10 + M damage; you and each ally adjacent to you gain 10 temporary Stamina'],['12\u201316','14 + M damage; you and each ally adjacent to you gain 15 temporary Stamina'],['17+','20 + M damage; you and each ally adjacent to you gain 20 temporary Stamina']] }),
];

const CENSOR_WRATH_11 = [
  ab('Excommunication', { cost: 11, resource: 'Wrath', flavor: 'You curse your foe to become a bane to their allies.',
    keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature',
    powerRoll: 'Might', tiers: [['\u226411','9 + M damage; I < WEAK, weakened (save ends)'],['12\u201316','13 + M; I<AVERAGE, weakened (save)'],['17+','18 + M; I<STRONG, weakened (save)']],
    effect: 'At the end of each of your turns, a target weakened this way deals holy damage equal to twice your Presence score to each enemy within 2 squares of them. Additionally, a target weakened this way can’t be targeted by their allies’ abilities.' }),
  ab('Hand of the Gods', { cost: 11, resource: 'Wrath', flavor: 'You use your foe as a tool against your enemies.',
    keywords: ['Ranged','Strike','Weapon'], type: 'Main action', distance: 'Ranged 10', target: 'One creature',
    powerRoll: 'Might', tiers: [['\u226411','10 + M damage'],['12\u201316','15 + M damage'],['17+','21 + M damage']],
    effect: 'Until the end of the encounter, while the target is judged by you, you can choose to make them the source of any of your abilities. Additionally, the target counts as an ally for the purpose of flanking.' }),
  ab('Pillar of Holy Fire', { cost: 11, resource: 'Wrath', flavor: 'Your enemy\u2019s guilt fuels a holy flame that burns your foes.',
    keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature',
    powerRoll: 'Might', tiers: [['\u226411','9 + M damage; I < WEAK, dazed (save ends)'],['12\u201316','13 + M; I<AVERAGE, dazed (save)'],['17+','18 + M; I<STRONG, dazed (save)']],
    effect: 'At the end of each of your turns, a target dazed this way deals holy damage equal to twice your Presence score to each enemy within 2 squares of them.' }),
  ab('Your Allies Turn on You!', { cost: 11, resource: 'Wrath', flavor: 'You turn your enemies\u2019 ire to the target.',
    keywords: ['Ranged','Strike','Weapon'], type: 'Main action', distance: 'Ranged 10', target: 'One creature',
    powerRoll: 'Presence', tiers: [['\u226411','5 + P damage; I < WEAK, slowed (save ends)'],['12\u201316','9 + P; I<AVERAGE, slowed (save)'],['17+','12 + P; I<STRONG, slowed (save)']],
    effect: 'While the target is slowed this way, each of their allies who starts their turn within 5 squares of them must use a free maneuver to make a free strike against the target. Additionally, while the target is slowed this way, each of their allies within 5 squares of them who can make a triggered free strike against a different creature must make the free strike against the target instead.' }),
];

// 1st-level domain features — Censor wording (Presence-based; from censor.md), with the
// skill group each domain grants. Used by the wizard's Censor domain picker.
const CENSOR_DOMAIN_1 = {
  Creation:   { name: 'Hands of the Maker', skillGroup: 'crafting', text: 'Maneuver (Self): create a mundane object of size 1S or smaller. You can maintain a number of objects created this way equal to your Presence score, and destroy any of them with a thought (no action required).' },
  Death:      { name: 'Grave Speech', skillGroup: 'lore', text: 'Maneuver (Melee 1): speak with one creature who died within the last 24 hours and spoke a language you know, for 1 minute. They regard you as they would have in life. You can\u2019t use this on the same creature twice.' },
  Fate:       { name: 'Oracular Visions', skillGroup: 'lore', text: 'Each time you earn Victories, you gain an equal number of fate points. Whenever you or a creature within 10 squares makes a test, you can spend 1 fate point to grant that creature an edge. Unused fate points are lost when you finish a respite.' },
  Knowledge:  { name: 'Blessing of Comprehension', skillGroup: 'lore', text: 'You can interpret diagrams and charts in any language, and are considered fluent in all languages for the purpose of understanding the project source of any crafting or research project.' },
  Life:       { name: 'Revitalizing Ritual', skillGroup: 'exploration', text: 'Each time you finish a respite, choose yourself or one ally who shared it to gain a bonus to their recovery value equal to your level until you finish another respite.' },
  Love:       { name: 'Blessing of Compassion', skillGroup: 'interpersonal', text: 'You gain an edge on any test made to assist another creature. When you are present at the start of a negotiation, one NPC of your choice has their patience increased by 1 (max 5), and the first test made to influence them gains an edge.' },
  Nature:     { name: 'Faithful Friend', skillGroup: 'exploration', text: 'Main action (Self): conjure an incorporeal animal spirit you\u2019ve seen (speed 5, can fly). While within 10 squares of it you sense everything that animal would. Dismiss it any time; if it takes damage it is dismissed and you take 1d10 irreducible psychic damage.' },
  Protection: { name: 'Protective Circle', skillGroup: 'exploration', text: 'Spend 10 uninterrupted minutes to create a protective circle holding one size-1 creature (lasts 24 hours, until you make another, or until dismissed). Only creatures you designate can enter or exit, and a creature within can\u2019t be targeted by strikes.' },
  Storm:      { name: 'Blessing of Fortunate Weather', skillGroup: 'exploration', text: 'Each respite, set the weather within 100 squares — Clear (Search/Navigate), Foggy (Hide), Overcast (Endurance), or Precipitation (Track) — granting you and your allies an edge on the related tests until your next respite.' },
  Sun:        { name: 'Inner Light', skillGroup: 'lore', text: 'Each time you finish a respite, grant yourself or one ally who shared it a +1 bonus to saving throws until you finish another respite.' },
  Trickery:   { name: 'Inspired Deception', skillGroup: 'intrigue', text: 'Whenever you make a test using a skill you have from the intrigue skill group, you can use Presence on the test instead of another characteristic.' },
  War:        { name: 'Sanctified Weapon', skillGroup: 'exploration', text: 'As a respite activity, bless a weapon: any creature wielding it gains a +1 bonus to rolled damage with abilities that use the weapon, until you finish another respite.' },
};

const CENSOR_DOMAIN_4 = {
  Creation:   { name: 'Improved Hands of the Maker', text: 'When you use Hands of the Maker, you can create a mundane object that is size 2 or smaller.' },
  Death:      { name: 'Seance',          text: 'As a respite activity, speak the name of a non-undead dead creature. If their spirit is free and willing, they appear and converse with you as they would have in life.' },
  Fate:       { name: 'Oracular Warning', text: 'Each respite, share dreams of the future with allies who rested with you, granting each temporary Stamina equal to 10 + your level until they finish another respite.' },
  Knowledge:  { name: 'Saint\u2019s Epiphany', text: 'At the start of a respite, inspire yourself or another resting creature: if they make a project roll during the respite, they add 1d10 + your Presence to it.' },
  Life:       { name: 'Blessing of Life', text: 'Whenever an ally within distance of your My Life for Yours ability regains Stamina, they regain additional Stamina equal to your Presence score.' },
  Love:       { name: 'Invocation of the Heart', text: 'As a main action, forge a bond with one willing creature you touch: telepathically speak across any distance and assist any test they make regardless of proximity. One bond at a time.' },
  Nature:     { name: 'Wode Road',       text: 'As a main action, touch a living tree to add it to your transportation network (up to your Presence score of trees). Touch any tree in the network to teleport yourself and willing creatures within 10 squares to another tree on the same world.' },
  Protection: { name: 'Impervious Touch', text: 'As a maneuver, touch an object size \u2264 your Presence and give it immunity all to untyped damage. Maintain on a number of objects equal to your Presence, plus optionally one larger building or vehicle.' },
  Storm:      { name: 'Windwalk',        text: 'While you have 5 or more Victories, you can fly. If you can already fly, you gain a +2 bonus to speed while flying instead.' },
  Sun:        { name: 'Light of Revelation', text: 'As a maneuver, shine brightly through any darkness in a 5-square radius until dismissed. Hidden creatures are revealed and none can hide; you gain an edge to notice hidden objects, entrances, and illusions.' },
  Trickery:   { name: 'Blessing of Secrets', text: 'Maneuver: project a 3 aura. You and allies in it have a double edge on Hide and Sneak tests until you end it or a target harms a creature or object.' },
  War:        { name: 'Improved Sanctified Weapon', text: 'The weapon improved by your Sanctified Weapon feature grants a +3 bonus to rolled damage instead of +1.' },
};

const CENSOR_DOMAIN_7 = {
  Creation:   { name: 'Divine Quartermaster', text: 'Each respite, choose a treasure with a project goal \u2264 50 times your level. You gain a divine version of it until your next respite or until it is consumed.' },
  Death:      { name: 'Word of Death Deferred', text: 'When an ally within distance of My Life for Yours dies and you are not dying, you can use a free triggered action to instead have them fall unconscious until they regain Stamina. Your abilities also deal an extra 5 damage to winded creatures.' },
  Fate:       { name: 'Word of Fate Denied', text: 'When an ally within 10 squares takes damage that would leave them dying, you can use a free triggered action to make yourself or another willing creature within 10 squares the target instead. That damage can\u2019t be reduced.' },
  Knowledge:  { name: 'Gods\u2019 Library', text: 'You no longer need research materials for crafting and research projects and add your level to those project rolls. You gain all lore skills you lack, plus that many skills from other groups.' },
  Life:       { name: 'Font of Grace', text: 'Each time you use My Life for Yours, you gain 1 wrath usable only on that ability that turn, and the target gains 10 temporary Stamina.' },
  Love:       { name: 'Covenant of the Heart', text: 'You can maintain Invocation of the Heart bonds with up to three creatures, and gain Guided to Your Side: a main action that teleports you and bonded allies to within 5 squares of a creature you are bonded to.' },
  Nature:     { name: 'Nature\u2019s Bounty', text: 'When you finish a respite, prepare a magic meal for companions who rested with you: choose two benefits (damage immunity equal to level, 20 temp Stamina, +1 speed, +1 saves, or an edge to influence) lasting until they finish another respite.' },
  Protection: { name: 'Blessing of Iron', text: 'While you are not dying, enemies take a bane on strikes against you or any ally within 3 squares of you.' },
  Storm:      { name: 'Ride the Lightning', text: 'Your rolled-damage abilities deal extra lightning damage equal to your Presence. Forced movement you cause gains a bonus equal to your Presence. While using Windwalk, you gain a bonus to flying speed equal to your Might.' },
  Sun:        { name: 'Light of the Burning Sun', text: 'Your rolled-damage abilities deal an extra 5 fire damage (15 vs. undead). You have fire immunity equal to your level, added to any other fire immunity.' },
  Trickery:   { name: 'Trinity of Trickery', text: 'You gain the Trinity of Trickery ability (9 Wrath): create two illusory duplicates of a target that move on the target\u2019s turn; the target can swap places with one as a free triggered action when targeted, destroying the duplicate it switches with when it takes damage.' },
  War:        { name: 'Your Triumphs Are Remembered', text: 'Whenever you finish a respite, you and any heroes who rested with you regain 1 Victory after Victories are converted to XP. This Victory isn\u2019t converted at a later respite.' },
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
  const currentPick = currentChoice && picks[currentChoice.id];
  const canAdvance = !currentChoice ||
    ((currentChoice.kind === 'perk' || currentChoice.kind === 'skill-group')
      ? !!(currentPick && currentPick.chosen)
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
          <div style={{flex:1, textAlign:'center', fontFamily:'var(--mono)', fontSize: '0.625rem', color:'var(--ink-3)', letterSpacing:'0.22em', textTransform:'uppercase'}}>
            Step {stepIdx + 1} of {steps.length}
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
    for (const f of auto) if (f && f.name) out.push({ level: lvl, name: f.name, text: f.text || '' });
    for (const ch of (dataForLvl.choices || [])) {
      if (ch.kind !== 'feature') continue;
      const p = stored && stored.picks && stored.picks[ch.id];
      if (!p) continue;
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
            <div>· <b style={{color:'var(--gold-2)'}}>+{data.staminaGain}</b> maximum Stamina (→ {newStamina})</div>
            {data.autoCharacteristicIncrease && Object.entries(data.autoCharacteristicIncrease).filter(([k]) => k !== 'max').map(([k, v]) => (
              <div key={k}>· {k} score raised to <b style={{color:'var(--gold-2)'}}>{v}</b></div>
            ))}
            {data.autoCharIncreaseAll && <div>· All characteristics <b style={{color:'var(--gold-2)'}}>+{data.autoCharIncreaseAll.delta}</b> (max {data.autoCharIncreaseAll.max})</div>}
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
                  <div style={{fontFamily:'var(--serif)', fontSize: '0.8125rem', color:'var(--ink-2)', lineHeight:1.5, marginTop:3}}>{f.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {autoAbilities.length > 0 && (
        <div>
          <H4Meta>Abilities Granted</H4Meta>
          <div style={{fontFamily:'var(--serif)', fontStyle:'italic', fontSize: '0.84375rem', color:'var(--ink-2)', lineHeight:1.55, marginTop:4, marginBottom:10}}>
            You receive both of the following abilities automatically.
          </div>
          <div className="grid-2" style={{gap:10}}>
            {autoAbilities.map(a => (
              <AbilityCard key={a.name} ability={a} kind="heroic" />
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
      </div>

      <div className="stack-12">
        {opts.length === 0 && (
          <div style={{fontFamily:'var(--hand)', fontStyle:'italic', color:'var(--ink-3)', fontSize: '0.875rem', textAlign:'center', padding:'20px 0'}}>
            (No options available for your current build.)
          </div>
        )}
        {opts.map(opt => {
          const selected = !!pick && (
            (opt.name != null && pick.name === opt.name) ||
            (opt.id != null && pick.id === opt.id) ||
            pick === opt
          );
          return (
            <OptionCard
              key={opt.name || opt.id}
              opt={opt}
              kind={choice.kind}
              selected={selected}
              onClick={() => {
                if (isTiered) {
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
          <div style={{fontFamily:'var(--serif)', fontStyle:'italic', fontSize: '0.84375rem', color:'var(--ink-2)', lineHeight:1.55, marginTop:-4, textAlign:'center'}}>
            {tierPrompt}
          </div>
          <div className={isSkill ? 'skill-pick-grid' : 'grid-2'} style={isSkill ? undefined : {gap:10}}>
            {tierItems.map(p => {
              const selected = pick.chosen === p.name;
              const blocked = !selected && taken && taken.has(p.name);
              return (
                <div
                  key={p.name}
                  className={`lvl-opt simple ${isSkill ? 'compact' : ''} ${selected ? 'selected' : ''} ${blocked ? 'blocked' : ''}`}
                  onClick={() => !blocked && onPick({ ...pick, chosen: p.name, chosenText: p.text })}
                  title={blocked ? `Already chosen — ${taken.get(p.name)}` : ''}
                >
                  <div className="lvl-opt-name">{p.name}</div>
                  {blocked ? <div className="lvl-opt-body">Already chosen — {taken.get(p.name)}</div>
                    : p.text ? <div className="lvl-opt-body">{p.text}</div> : null}
                </div>
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

function OptionCard({ opt, kind, selected, onClick }) {
  // For abilities, normalize tiers shape and render an AbilityCard.
  if (kind === 'ability') {
    const normalized = opt.tiers && !Array.isArray(opt.tiers)
      ? {
          ...opt,
          tiers: [
            ['\u2264 11', opt.tiers.t1],
            ['12\u201316', opt.tiers.t2],
            ['\u2265 17', opt.tiers.t3],
          ],
          powerRoll: opt.powerRoll || (opt.resource === 'Piety' ? 'I' : 'M'),
        }
      : opt;
    return (
      <div className={`lvl-opt ${selected ? 'selected' : ''}`} onClick={onClick}>
        <AbilityCard ability={normalized} kind="heroic" />
      </div>
    );
  }
  return (
    <div className={`lvl-opt simple ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="lvl-opt-name">{opt.name}</div>
      {opt.body && <div className="lvl-opt-body">{opt.body}</div>}
    </div>
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
          <div>· <b style={{color:'var(--gold-2)'}}>+{data.staminaGain}</b> maximum Stamina (→ {newStamina})</div>
          {charInc.map(([k, v]) => (
            <div key={k}>· {k} score raised to <b style={{color:'var(--gold-2)'}}>{v}</b></div>
          ))}
          {data.autoCharIncreaseAll && <div>· All characteristics <b style={{color:'var(--gold-2)'}}>+{data.autoCharIncreaseAll.delta}</b> (max {data.autoCharIncreaseAll.max})</div>}
          {otherPicks.filter(ch => ch.kind === 'char-bonus').map(ch => {
            const p = picks[ch.id];
            return <div key={ch.id}>· +1 to <b style={{color:'var(--gold-2)'}}>{p.name || p.id || p}</b></div>;
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
                <div style={{fontFamily:'var(--serif)', fontSize: '0.8125rem', color:'var(--ink-2)', lineHeight:1.5, marginTop:3}}>{f.text}</div>
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
            return (
              <div key={ch.id} className="orn-frame" style={{padding:'12px 16px'}}>
                <div style={{fontFamily:'var(--mono)', fontSize: '0.5625rem', color:'var(--gold-2)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:4}}>{ch.label}</div>
                <div style={{fontFamily:'var(--display-2)', fontSize: '0.875rem', fontWeight:700, letterSpacing:'0.14em', color:'var(--ink)'}}>
                  {pick.chosen
                    ? <>{pick.chosen} <span style={{fontFamily:'var(--mono)', fontSize: '0.625rem', color:'var(--ink-3)', letterSpacing:'0.18em', marginLeft:6}}>({pick.name || pick})</span></>
                    : (pick.name || pick)}
                </div>
                {pick.chosen && pick.chosenText && <div style={{fontFamily:'var(--serif)', fontSize: '0.8125rem', color:'var(--ink-2)', marginTop:4, lineHeight:1.5}}>{pick.chosenText}</div>}
                {!pick.chosen && pick.body && <div style={{fontFamily:'var(--serif)', fontSize: '0.8125rem', color:'var(--ink-2)', marginTop:4, lineHeight:1.5}}>{pick.body}</div>}
                {pick.effect && <div style={{fontFamily:'var(--serif)', fontSize: '0.78125rem', color:'var(--ink-3)', marginTop:4, lineHeight:1.5, fontStyle:'italic'}}>{pick.effect}</div>}
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
              <AbilityCard key={a.name} ability={a} kind="heroic" />
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
  font-family: var(--display); font-size: 0.875rem; color: var(--gold);
}
/* Compact skill chips are small + center-aligned; the corner diamond would sit over the
   label, so drop it (the gold border + glow already mark selection). */
.lvl-opt.simple.compact.selected::after { display: none; }
.lvl-opt-name {
  font-family: var(--display-2); font-size: 0.875rem; font-weight: 700;
  letter-spacing: 0.16em; color: var(--ink); text-transform: uppercase;
}
/* Perk cards (non-compact): keep a right gutter so a long/wrapping name never runs under
   the selection diamond. */
.lvl-opt.simple:not(.compact) .lvl-opt-name { padding-right: 20px; }
.lvl-opt-body {
  font-family: var(--serif); font-size: 0.8125rem; color: var(--ink-2);
  line-height: 1.55; margin-top: 6px;
}
.skill-pick-grid {
  /* Skill names vary in length, so a bare 1fr would floor each track at the
     longest name in that column and the three would come out unequal. */
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;
}
.lvl-opt.simple.compact { padding: 10px 12px; text-align: center; }
.lvl-opt.simple.compact .lvl-opt-name { font-size: 0.75rem; letter-spacing: 0.1em; }
@media (max-width: 560px) { .skill-pick-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`;
function LevelUpStyles() { return <style>{LEVELUP_CSS}</style>; }

Object.assign(window, { LEVELUP_DATA, LevelUpFlow, LevelUpStyles, makeContext, DOMAIN_1ST_FEATURES, DOMAIN_2_ABILITIES, DOMAIN_4_FEATURES, CENSOR_DOMAIN_1 });
export { LEVELUP_DATA, LevelUpFlow, LevelUpStyles, makeContext, collectLevelUpFeatures, levelChoicesFor, applyLevelUp, deriveGroupName, DOMAIN_1ST_FEATURES, DOMAIN_2_ABILITIES, DOMAIN_4_FEATURES, CENSOR_DOMAIN_1 };
