// levelup-conduit-hi.jsx — Conduit level-up data, levels 5–10 (extends existing 2–4).
// Domain-based caster · Resource: Piety · staminaPer 6.
// Each domain level offers a choice between your two chosen domains; the twelve-entry
// tables live in data/conduit-domains.js. 5th reuses the 4th-level features (one per
// domain, taken a level apart) and 8th reuses the 7th-level features for the same reason.
import {
  DOMAIN_4_FEATURES, DOMAIN_6_ABILITIES, DOMAIN_7_FEATURES, DOMAIN_9_ABILITIES,
} from './data/conduit-domains.js';

// A domain feature choice: one option per domain the character actually has.
const domainFeatures = (table) => ({ domains }) => (domains || []).map(d => {
  const f = table[d];
  return f ? { id: d, name: `${d}: ${f.name}`, body: f.text, ability: f.ability } : null;
}).filter(Boolean);

// A domain ability choice: the ability itself, badged with its domain.
const domainAbilities = (table) => ({ domains }) => (domains || []).map(d => {
  const a = table[d];
  return a ? { ...a, badge: d.toUpperCase() } : null;
}).filter(Boolean);

const PERK_CLS = [
  { id: 'crafting',     name: 'Crafting Perk',     body: 'A boon tied to making and mending.' },
  { id: 'lore',         name: 'Lore Perk',         body: 'A boon for the studious.' },
  { id: 'supernatural', name: 'Supernatural Perk', body: 'A boon at the edge of the natural world.' },
];
const PERK_ANY = ['crafting','exploration','interpersonal','intrigue','lore','supernatural'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Perk', body: '' }));
const SKILL_ANY = ['crafting','exploration','interpersonal','intrigue','lore'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Skill', body: '' }));
const tr = (t1, t2, t3) => [['\u2264 11', t1], ['12\u201316', t2], ['17+', t3]];
const pi = (n, name, flavor, effect, extra) => ({ name, cost: n, resource: 'Piety', flavor, type: 'Main action', keywords: ['Magic','Ranged'], distance: 'Ranged 10', target: 'One ally', effect, ...extra });

const PI_9 = () => [
  pi(9, 'Beacon of Grace', 'You ignite a foe with holy radiance, rewarding allies who attack them.', 'Until the end of the encounter, whenever you or any ally damages the target using an ability, that creature can spend a Recovery. If the target is reduced to 0 Stamina before the end of the encounter, you can use a free triggered action to move this effect to another creature within distance.', { keywords:['Magic','Ranged','Strike'], target:'One creature', powerRoll:'Intuition', tiers:tr('8 + I holy damage','13 + I holy damage','17 + I holy damage') }),
  pi(9, 'Penance', 'If you won’t kneel, the gods will make you.', '', { keywords:['Area','Magic','Ranged'], distance:'4 cube within 10', target:'Each enemy in the area', powerRoll:'Intuition', tiers:tr('4 corruption damage; I < WEAK, prone and can\'t stand (save ends)','7 corruption damage; I < AVERAGE, prone and can\'t stand (save ends)','11 corruption damage; I < STRONG, prone and can\'t stand (save ends)') }),
  pi(9, 'Sanctuary', 'You send yourself or an ally to a divine manifold to instantaneously regain health.', 'The target is removed from the encounter map until the start of their next turn and can spend any number of Recoveries. At the start of their turn, the target reappears in the space they left or the nearest unoccupied space of their choice.', { type: 'Maneuver', target:'Self or one ally' }),
  pi(9, 'Vessel of Retribution', 'You infuse yourself or an ally with the retributive energy of the gods, waiting to be unleashed.', 'The first time the target is dying or winded before the end of the encounter, each enemy within 5 squares of them takes 15 holy damage.', { type: 'Maneuver', target:'Self or one ally' }),
];
const PI_11 = () => [
  pi(11, 'Arise!', 'Your deity rewards you or an ally on the verge of defeat with a miracle burst of strength and resolve.', 'The target can spend any number of Recoveries, can end any effects on them that are ended by a saving throw or that end at the end of their turn, and can stand up if they are prone. Additionally, at the start of each of their turns until the end of the encounter or until they are dying, the target gains 3 surges.', { target:'Self or one ally' }),
  pi(11, 'Blessing of Steel', 'A protective aura defends your allies from harm.', 'Until the end of the encounter, any ability roll made against a target takes a bane and each target has damage immunity 5.', { type: 'Maneuver', keywords:['Area','Magic'], distance:'5 aura', target:'Self and each ally in the area' }),
  pi(11, 'Blessing of the Blade', 'The power of the gods is within you, friends. Allow me to unleash it.', 'At the end of each of your turns until the end of the encounter or until you are dying, each target gains 3 surges.', { type: 'Maneuver', keywords:['Area','Magic'], distance:'5 aura', target:'Self and each ally in the area' }),
  pi(11, 'Drag the Unworthy', 'You conjure an angel who moves a foe and heals your allies.', 'Each ally the target comes adjacent to during the forced movement can spend a Recovery.', { keywords:['Magic','Ranged','Strike'], target:'One creature or object', powerRoll:'Intuition', tiers:tr('9 + I holy damage; slide 3','13 + I holy damage; slide 4','18 + I holy damage; slide 6') }),
];

export const conduitHi = {
  5: {
    summary: 'Your domains bloom further, and heaven\u2019s power swells within you.',
    staminaGain: 6,
    choices: [
      { id: 'domain-feature-5', label: '5th-Level Domain Feature', help: 'Choose your other domain. You gain that domain\u2019s 4th-level feature.', kind: 'feature', options: domainFeatures(DOMAIN_4_FEATURES) },
      { id: 'piety-9', label: '9-Piety Ability', help: 'Choose one heroic ability that costs 9 piety.', kind: 'ability', options: PI_9 },
    ],
  },
  6: {
    summary: 'You become a burgeoning saint — your deity\u2019s chosen champion.',
    staminaGain: 6,
    autoFeatures: () => [
      { name: 'Burgeoning Saint', text: 'You are infused with the power your deity reserves for their most worthy instruments. You have the following benefits:\n\n- You gain an edge on Presence tests made to interact with other creatures.\n- Whenever you deal damage to an enemy, you can spend a Recovery.\n- You have corruption immunity 10 or holy immunity 10 (your choice).\n- Your clothing and equipment changes in a way that reflects your status as your deity\'s chosen champion, such as ordinary robes turning into gold vestments or a simple dagger becoming a wicked blade with intricate etching.' },
    ],
    choices: [
      { id: 'domain-ability-6', label: '6th-Level Domain Ability', help: 'Choose one of your domains. You gain that domain\u2019s 9-piety ability.', kind: 'ability', options: domainAbilities(DOMAIN_6_ABILITIES) },
      { id: 'perk-6', label: 'Perk', help: 'Choose one crafting, lore, or supernatural perk.', kind: 'perk', options: PERK_CLS },
    ],
  },
  7: {
    summary: 'Faith floods you, and your god\u2019s power sharpens your every gift.',
    staminaGain: 6,
    autoCharIncreaseAll: { delta: 1, max: 4 },
    autoFeatures: () => [
      { name: 'Characteristic Increase', text: 'Each of your characteristic scores increases by 1, to a maximum of 4.' },
      { name: 'Faithful\u2019s Reward', text: 'When you roll for piety at the start of your turn in combat, you gain 1d3 + 1 piety.' },
    ],
    choices: [
      { id: 'domain-feature-7', label: '7th-Level Domain Feature', help: 'Choose one of your domains. You gain that domain\u2019s 7th-level feature.', kind: 'feature', options: domainFeatures(DOMAIN_7_FEATURES) },
      { id: 'skill-7', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
  8: {
    summary: 'Your domains reveal their deepest mysteries.',
    staminaGain: 6,
    choices: [
      { id: 'domain-feature-8', label: '8th-Level Domain Feature', help: 'Choose your other domain. You gain that domain\u2019s 7th-level feature.', kind: 'feature', options: domainFeatures(DOMAIN_7_FEATURES) },
      { id: 'perk-8', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'piety-11', label: '11-Piety Ability', help: 'Choose one heroic ability that costs 11 piety.', kind: 'ability', options: PI_11 },
    ],
  },
  9: {
    summary: 'You are ordained — your faith made manifest as a sword of heaven.',
    staminaGain: 6,
    autoFeatures: () => [
      { name: 'Faith\u2019s Sword', text: 'Each time you finish a respite, you can choose a willing hero ally who finished the respite with you. That ally gains the benefits of your Burgeoning Saint feature until you finish another respite. Additionally, you can spend piety as a free maneuver to give the hero 1 of their Heroic Resource for every 2 piety spent.' },
      { name: 'Ordained', text: 'Your god elevates the power flowing through you. Your characteristic scores are treated as 1 higher for the purpose of resisting potencies. Additionally, while you have 5 or more Victories, you speak with the voice of your deity. You have a double edge on Presence tests made to influence other creatures.' },
    ],
    choices: [
      { id: 'domain-ability-9', label: '9th-Level Domain Ability', help: 'Choose one of your domains. You gain that domain\u2019s 11-piety ability.', kind: 'ability', options: domainAbilities(DOMAIN_9_ABILITIES) },],
  },
  10: {
    summary: 'You become an avatar of your god — divine power made flesh.',
    staminaGain: 6,
    autoCharacteristicIncrease: { Intuition: 5, max: true },
    autoFeatures: () => [
      { name: 'Characteristic Increase', text: 'Your Intuition score increases to 5. Additionally, you can increase one of your characteristic scores by 1, to a maximum of 5.' },
      { name: 'Avatar', text: 'You are now an avatar of your god! When you use your Prayer feature, you can be affected by up to three prayers at once, and you can change all those prayers and your ward as a respite activity. You can also use a maneuver to activate one of your domain effects (see Domain Piety and Effects) without needing to pray.\n\nAdditionally, whenever you take a respite, you can open a portal to rest in the presence of your deity and bring along any allies. When you do, you can ask your deity three questions, which the Director must answer honestly if your deity knows the answers (though they might answer cryptically or incompletely). When you finish your respite, you and your allies can appear at any location in the timescape where someone worships your deity.' },
      { name: 'Divine Power', text: 'You have an epic resource called divine power. Each time you finish a respite, you gain divine power equal to the XP you gain. You can spend divine power on your abilities as if it were piety.\n\nAdditionally, you can spend divine power as if it were piety to use any conduit abilities you don\'t have, as the gods answer your prayers with temporary and unique gifts. If you use a conduit ability you don\'t have that usually costs no piety, you must spend 1 divine power to use it.\n\nDivine power remains until you spend it.' },
      { name: 'Most Pious', text: 'When you roll for piety at the start of your turn in combat and you pray, you gain 1 additional piety.' },
    ],
    choices: [
      { id: 'perk-10', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'skill-10', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
};
