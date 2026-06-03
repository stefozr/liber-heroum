// levelup-conduit-hi.jsx — Conduit level-up data, levels 5–10 (extends existing 2–4).
// Domain-based caster · Resource: Piety · staminaPer 6.
// Domain-specific features/abilities are summarized as notes (your two chosen domains
// determine the exact options — see the Conduit domain tables).

(function () {
  const PERK_CLS = [
    { id: 'crafting',     name: 'Crafting Perk',     body: 'A boon tied to making and mending.' },
    { id: 'lore',         name: 'Lore Perk',         body: 'A boon for the studious.' },
    { id: 'supernatural', name: 'Supernatural Perk', body: 'A boon at the edge of the natural world.' },
  ];
  const PERK_ANY = ['crafting','exploration','interpersonal','intrigue','lore','supernatural'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Perk', body: '' }));
  const SKILL_ANY = ['crafting','exploration','interpersonal','intrigue','lore'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Skill', body: '' }));
  const tr = (t1, t2, t3) => [['\u2264 11', t1], ['12\u201316', t2], ['17+', t3]];
  const pi = (n, name, flavor, effect, extra) => ({ name, cost: n, resource: 'Piety', flavor, type: (extra && extra.type) || 'Main action', keywords: (extra && extra.keywords) || ['Magic','Ranged'], distance: (extra && extra.distance) || 'Ranged 10', target: (extra && extra.target) || 'One ally', tiers: extra && extra.tiers, effect, powerRoll: extra && extra.powerRoll });

  const PI_9 = () => [
    pi(9, 'Beacon of Grace', 'You ignite a foe with holy radiance.', 'Until end of encounter, allies who damage the target can spend a Recovery.', { keywords:['Magic','Ranged','Strike'], target:'One enemy', powerRoll:'Intuition', tiers:tr('7 + I holy','11 + I holy','16 + I holy') }),
    pi(9, 'Penance', 'If you won\u2019t kneel, the gods will make you.', 'A radiant area that knocks foes prone.', { keywords:['Area','Magic','Ranged'], distance:'5 cube within 10', target:'Each enemy in area', powerRoll:'Intuition', tiers:tr('5 corruption; I<WEAK prone','8 corruption; I<AVERAGE prone','11 corruption; I<STRONG prone & can\u2019t stand (save)') }),
    pi(9, 'Sanctuary', 'You send an ally to a divine manifold to heal.', 'The target leaves the map until their next turn and spends any number of Recoveries.', { target:'Self or one ally' }),
    pi(9, 'Vessel of Retribution', 'Retributive energy waits to be unleashed.', 'You infuse an ally with stored divine retribution.', { target:'Self or one ally' }),
  ];
  const PI_11 = () => [
    pi(11, 'Arise!', 'A miracle of strength and resolve.', 'A near-defeated target spends any Recoveries, ends effects, stands, and fights on.', { target:'Self or one ally' }),
    pi(11, 'Blessing of Steel', 'A protective aura defends your allies.', 'Until end of encounter, rolls against targets take a bane and they gain damage immunity 5.', { keywords:['Area','Magic'], distance:'Self aura', target:'Allies' }),
    pi(11, 'Blessing of the Blade', 'The power of the gods is within you, friends.', 'At the end of each of your turns until end of encounter, each target gains 3 surges.', { keywords:['Area','Magic'], distance:'Self aura', target:'Allies' }),
    pi(11, 'Drag the Unworthy', 'You conjure an angel to move a foe and heal allies.', 'A divine strike that repositions an enemy and mends your friends.', { keywords:['Magic','Ranged','Strike'], target:'One enemy', powerRoll:'Intuition', tiers:tr('7 + I holy','11 + I holy','16 + I holy') }),
  ];

  const hi = {
    5: {
      summary: 'Your domains bloom further, and heaven\u2019s power swells within you.',
      staminaGain: 6,
      autoFeatures: () => [
        { name: '5th-Level Domain Feature', text: 'You gain the 5th-level feature of one of your two domains (see your domain\u2019s entry).' },
      ],
      choices: [
        { id: 'piety-9', label: '9-Piety Ability', help: 'Choose one heroic ability that costs 9 piety.', kind: 'ability', options: PI_9 },
      ],
    },
    6: {
      summary: 'You become a burgeoning saint — your deity\u2019s chosen champion.',
      staminaGain: 6,
      autoFeatures: () => [
        { name: 'Burgeoning Saint', text: 'You gain an edge on Presence tests; when you damage an enemy you can spend a Recovery; you have corruption or holy immunity 10; and your gear transforms to reflect your divine status.' },
        { name: '6th-Level Domain Ability', text: 'You gain a 9-piety heroic ability from one of your two domains (see your domain\u2019s entry).' },
      ],
      choices: [
        { id: 'perk-6', label: 'Perk', help: 'Choose one crafting, lore, or supernatural perk.', kind: 'perk', options: PERK_CLS },
      ],
    },
    7: {
      summary: 'Faith floods you, and your god\u2019s power sharpens your every gift.',
      staminaGain: 6,
      autoCharIncreaseAll: { delta: 1, max: 4 },
      autoFeatures: () => [
        { name: 'Characteristic Increase', text: 'Each characteristic score increases by 1, to a maximum of 4.' },
        { name: 'Faithful\u2019s Reward', text: 'When you roll for piety at the start of your turn in combat, you gain 1d3 + 1 piety.' },
        { name: '7th-Level Domain Feature', text: 'You gain the 7th-level feature of one of your two domains (see your domain\u2019s entry).' },
      ],
      choices: [
        { id: 'skill-7', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
      ],
    },
    8: {
      summary: 'Your domains reveal their deepest mysteries.',
      staminaGain: 6,
      autoFeatures: () => [
        { name: '8th-Level Domain Feature', text: 'You gain the 8th-level feature of one of your two domains (see your domain\u2019s entry).' },
      ],
      choices: [
        { id: 'perk-8', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
        { id: 'piety-11', label: '11-Piety Ability', help: 'Choose one heroic ability that costs 11 piety.', kind: 'ability', options: PI_11 },
      ],
    },
    9: {
      summary: 'You are ordained — your faith made manifest as a sword of heaven.',
      staminaGain: 6,
      autoFeatures: () => [
        { name: 'Faith\u2019s Sword', text: 'Each respite, grant a willing hero ally the benefits of your Burgeoning Saint feature until your next respite.' },
        { name: 'Ordained', text: 'Your characteristics are treated as 1 higher to resist potencies, and while you have 5+ Victories you speak with divine authority.' },
        { name: '9th-Level Domain Ability', text: 'You gain an 11-piety heroic ability from one of your two domains (see your domain\u2019s entry).' },
      ],
      choices: [],
    },
    10: {
      summary: 'You become an avatar of your god — divine power made flesh.',
      staminaGain: 6,
      autoCharacteristicIncrease: { Intuition: 5, max: true },
      autoFeatures: () => [
        { name: 'Characteristic Increase', text: 'Your Intuition increases to 5, and one other characteristic increases by 1 (to a max of 5).' },
        { name: 'Avatar', text: 'You can be affected by up to three prayers at once (changeable on a respite) and gain further divine authority.' },
        { name: 'Divine Power', text: 'You gain the epic resource divine power equal to the XP you earn each respite, spendable as piety — even to use conduit abilities you don\u2019t have. It remains until spent.' },
        { name: 'Most Pious', text: 'When you roll for piety at the start of your turn and pray, you gain 1 additional piety.' },
      ],
      choices: [
        { id: 'perk-10', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
        { id: 'skill-10', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
      ],
    },
  };

  function install() {
    if (!window.LEVELUP_DATA || !window.LEVELUP_DATA.conduit) { setTimeout(install, 30); return; }
    Object.assign(window.LEVELUP_DATA.conduit, hi);
  }
  install();
})();
