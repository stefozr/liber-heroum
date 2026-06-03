// levelup-troubadour.jsx — Troubadour level-up data (levels 2–10).
// Extends window.LEVELUP_DATA after levelup.jsx has loaded.
// Class Acts: Auteur / Duelist / Virtuoso · Resource: Drama · staminaPer 6.

(function () {
  const PERK_ILS = [
    { id: 'interpersonal', name: 'Interpersonal Perk', body: 'A boon for the table and the court.' },
    { id: 'lore',          name: 'Lore Perk',          body: 'A boon for the studious.' },
    { id: 'supernatural',  name: 'Supernatural Perk',  body: 'A boon at the edge of the natural world.' },
  ];
  const PERK_ANY = [
    { id: 'crafting', name: 'Crafting Perk', body: '' },
    { id: 'exploration', name: 'Exploration Perk', body: '' },
    { id: 'interpersonal', name: 'Interpersonal Perk', body: '' },
    { id: 'intrigue', name: 'Intrigue Perk', body: '' },
    { id: 'lore', name: 'Lore Perk', body: '' },
    { id: 'supernatural', name: 'Supernatural Perk', body: '' },
  ];
  const SKILL_ANY = [
    { id: 'crafting', name: 'Crafting Skill', body: '' },
    { id: 'exploration', name: 'Exploration Skill', body: '' },
    { id: 'interpersonal', name: 'Interpersonal Skill', body: '' },
    { id: 'intrigue', name: 'Intrigue Skill', body: '' },
    { id: 'lore', name: 'Lore Skill', body: '' },
  ];
  const t = (t1, t2, t3) => [['\u2264 11', t1], ['12\u201316', t2], ['17+', t3]];

  // ── Subclass-keyed choice tables ──
  const INVOCATION_2 = [
    { name: 'Allow Me to Introduce Tonight\u2019s Players', body: 'When you take the first turn of a combat, use a main action to introduce the party: each ally shifts up to their speed, rolls against them have a double bane until the end of the round, and surprised enemies are no longer surprised.' },
    { name: 'Formal Introductions', body: 'As a respite activity, scribe a notice of your arrival to an enemy. When they receive it they become alarmed; the Director gains +1 Malice per round in their encounters, but the heroes start each such encounter with 2 extra hero tokens.' },
    { name: 'My Reputation Precedes Me', body: 'At the start of a social interaction with strangers, auto-bond one NPC (counts against your Scene Partner limit). While bonded, all heroes treat Renown as 2 higher when entering negotiation with them.' },
  ];
  const ACT_ABILITY_2 = {
    auteur: [
      { name: 'Guest Star', cost: 5, resource: 'Drama', flavor: 'We offered them a percentage of the gross. So they\u2019re working for free!', keywords: ['Magic','Ranged'], type: 'Main action', distance: 'Ranged 10', target: 'Special', effect: 'Summon a guest star you control with its own turn, your characteristics, and Stamina max equal to half yours. It has only free strikes, and retreats at 0 Stamina or end of encounter.' },
      { name: 'Twist at the End', cost: 5, resource: 'Drama', flavor: 'You didn\u2019t see that coming, did you?!', keywords: ['Magic','Ranged'], type: 'Main action', distance: 'Ranged 10', target: 'One dead enemy', effect: 'A non-leader, non-solo enemy returns to life with half Stamina as an ally under the Director\u2019s control. At the end of the encounter it turns to dust.' },
    ],
    duelist: [
      { name: 'Classic Chandelier Stunt', cost: 5, resource: 'Drama', flavor: 'Audiences love this bit.', keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'Self and one willing ally', effect: 'Each target shifts up to 5 squares (including vertically), ending adjacent to the other on solid ground, then makes a melee free strike dealing extra damage equal to twice their highest characteristic.' },
      { name: 'En Garde!', cost: 5, resource: 'Drama', flavor: 'Guard! Turn! Parry! Dodge! Spin! Thrust! Ha!', keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature', powerRoll: 'Agility', tiers: t('7 + A damage','11 + A damage','16 + A damage'), effect: 'The target can make a melee free strike against you; if they do, you make one back.' },
    ],
    virtuoso: [
      { name: 'Encore', cost: 5, resource: 'Drama', flavor: 'Again! Again!', keywords: ['Magic','Strike'], type: 'Main action', distance: 'Special', target: 'Special', effect: 'Use a Strike ability you observed this round that costs 5 or fewer Heroic Resource and no Malice. Use Presence for power rolls; damage becomes sonic.' },
      { name: 'Tough Crowd', cost: 5, resource: 'Drama', flavor: 'Your fans don\u2019t seem to like the opening act...', keywords: ['Area','Magic','Ranged'], type: 'Main action', distance: '3 cube within 10', target: 'Special', powerRoll: 'Presence', tiers: t('5 corruption; M<WEAK, pull 1','9 corruption; M<AVERAGE, pull 2','12 corruption; M<STRONG, pull 3'), effect: 'The area is haunted until end of encounter; allies move through it freely, and at the end of each of your turns you roll against each enemy inside.' },
    ],
  };
  const ACT_FEATURE_3 = {
    auteur: [{ name: 'Missed Cue', text: 'If not surprised at the start of an encounter, you can pull one non-leader, non-solo enemy out of the fight; they enter at the start of the 2nd round. Recharge after 3 Victories.' }],
    duelist: [{ name: 'Foil', text: 'At the start of an encounter choose a creature in line of effect. You and it each have a double edge on power rolls made against or competing with the other. If it drops to 0, pick a new foil next round.' }],
    virtuoso: [{ name: 'Second Album', text: 'Gain two new performances usable with Routines: "Fire Up the Night" (allies ignore concealment banes & search as a free maneuver) and "Never-Ending Hero" (allies gain an edge on power rolls & ignore bleeding).' }],
  };
  const ACT_FEATURE_5 = {
    auteur: [
      { name: 'Fix It in Post', body: 'Once per turn, free maneuver: change one condition (bleeding, frightened, prone, slowed, taunted) on a creature within your Dramatic Monologue distance into another of those, keeping its duration & origin.' },
      { name: 'Take Two!', body: 'New performance: allies starting their turn in the 5 aura can reroll the first tier-2 power roll they make that turn (must use the new roll).' },
    ],
    duelist: [
      { name: 'Verbal Duel', body: 'Once per turn while your Foil is adjacent, free maneuver: opposed Presence test; the winner makes a free strike that deals psychic damage instead of its usual type.' },
      { name: 'We Can\u2019t Be Upstaged!', body: 'New performance: allies starting their turn in the 5 aura gain a bonus to shift distance equal to your Presence until end of turn.' },
    ],
    virtuoso: [
      { name: 'Bolstering Banter', body: 'Once per turn, free maneuver: a target of your current performance can spend a Recovery to gain temporary Stamina equal to their recovery value.' },
      { name: 'Medley', body: 'You can maintain two performances at a time with your Routines feature.' },
    ],
  };
  const ACT_ABILITY_6 = {
    auteur: [
      { name: 'Here\u2019s How Your Story Ends', cost: 9, resource: 'Drama', flavor: 'You give away the ending of this battle.', keywords: ['Area','Magic'], type: 'Main action', distance: '5 burst', target: 'Each enemy in the area', powerRoll: 'Presence', tiers: t('2 psychic; P<WEAK, frightened (save)','5 psychic; P<AVERAGE, frightened (save)','7 damage; P<STRONG, frightened (save)') },
      { name: 'You\u2019re All My Understudies', cost: 9, resource: 'Drama', flavor: 'Just in case...', keywords: ['Area','Magic'], type: 'Maneuver', distance: '5 burst', target: 'Each ally in the area', effect: 'Until end of encounter, each target gains your equipped kit\u2019s speed, weapon distance, disengage, and stability bonuses in addition to their own.' },
    ],
    duelist: [
      { name: 'Blood on the Stage', cost: 9, resource: 'Drama', flavor: 'Either way, there\u2019s always blood.', keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature or object', powerRoll: 'Agility', tiers: t('12 + A; M<WEAK, bleeding (save)','18 + A; M<AVERAGE, bleeding (save)','24 + A; bleeding (EoT) or M<STRONG bleeding (save)') },
      { name: 'Fight Choreography', cost: 9, resource: 'Drama', flavor: 'A flashy show of derring-do.', keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature', effect: 'You and the target each make a melee free strike split among enemies within 3 squares of either of you, then you slide the target 5 squares (ignoring stability).' },
    ],
    virtuoso: [
      { name: 'Feedback', cost: 9, resource: 'Drama', flavor: 'Their hearts can\u2019t stand it anymore.', keywords: ['Area','Magic'], type: 'Main action', distance: 'Three 3 cubes within 1', target: 'Each enemy in the area', powerRoll: 'Presence', tiers: t('7 sonic; P<WEAK, prone','10 sonic; P<AVERAGE, prone','13 sonic; P<STRONG, prone'), effect: 'A prone target ignores this ability.' },
      { name: 'Legendary Drum Fill', cost: 9, resource: 'Drama', flavor: 'A drumroll that roars like thunder.', keywords: ['Area','Magic'], type: 'Maneuver', distance: '4 burst', target: 'Self and each ally in the area', effect: 'Each target gains 1 surge now, then 1 surge at the start of each round until end of encounter.' },
    ],
  };
  const ACT_FEATURE_8 = {
    auteur: [{ name: 'Deleted Scene', text: 'When a creature within your Dramatic Monologue distance makes a power roll, spend 1 drama as a free triggered action to use Dramatic Monologue against just that creature.' }],
    duelist: [{ name: 'Masterwork', text: 'Name one signature ability after yourself; you always have it (even from a swapped kit). When you use it you gain an edge and 1 surge usable only on it. If it\u2019s your last ability of an encounter, trigger Hear Ye, Hear Ye! afterward.' }],
    virtuoso: [{ name: 'Crowd Favorites', text: 'Gain two performances: "Moonlight Sonata" (dead allies in the aura can keep taking limited turns) and "Radical Fantasia" (allies ignore difficult terrain, +2 forced movement, and may use a triggered action as a free one once per round).' }],
  };
  const ACT_ABILITY_9 = {
    auteur: [
      { name: 'Epic', cost: 11, resource: 'Drama', flavor: 'The villain\u2019s waning power.', keywords: ['Magic','Melee','Ranged'], type: 'Maneuver', distance: 'Melee 1 or ranged 10', target: 'One creature', powerRoll: 'Presence', tiers: t('Bane on ability rolls (save)','Double bane on ability rolls (save)','Double bane on power rolls (save)'), effect: 'Choose an ally within distance; while the target is affected, that ally makes a free strike against it each time it uses an ability.' },
      { name: 'Rising Tension', cost: 11, resource: 'Drama', flavor: 'All hope in your protagonist.', keywords: ['Magic','Ranged'], type: 'Maneuver', distance: 'Ranged 10', target: 'One ally', effect: 'Target gains 3 Heroic Resource, a double edge on a power roll next turn, ends slowed/weakened, and may take their turn immediately after yours if they haven\u2019t yet.' },
    ],
    duelist: [
      { name: 'Expert Fencer', cost: 11, resource: 'Drama', flavor: 'If you can land the strike, the crowd goes wild.', keywords: ['Charge','Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 3', target: 'One creature or object', powerRoll: 'Agility', tiers: t('15 + A','21 + A','28 + A; M<STRONG, bleeding (save)'), effect: 'Can\u2019t beat tier 2 unless the target is at max distance. A natural 17+ tier 3 grants 3 surges immediately.' },
      { name: 'Renegotiated Contract', cost: 11, resource: 'Drama', flavor: 'You don\u2019t die until the sequel.', keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature', powerRoll: 'Presence', tiers: t('Both end one save-ends/EoT effect','Both end all save-ends/EoT effects','Move your effects onto the target & end the rest'), effect: 'First, pool both your current Stamina and split it evenly (neither exceeds their max).' },
    ],
    virtuoso: [
      { name: 'Jam Session', cost: 11, resource: 'Drama', flavor: 'New genres compel everyone to move.', keywords: ['Area','Magic'], type: 'Main action', distance: '5 burst', target: 'Each enemy in the area', powerRoll: 'Presence', tiers: t('8 sonic','11 sonic','15 sonic'), effect: 'Each creature in distance gains +5 speed until end of next turn and must use full movement on their turn.' },
      { name: 'Melt Their Faces', cost: 11, resource: 'Drama', flavor: 'Music rips through reality and blows them away.', keywords: ['Magic','Melee','Ranged','Strike'], type: 'Main action', distance: 'Melee 1 or ranged 10', target: 'One creature or object', powerRoll: 'Presence', tiers: t('12 + P sonic; push 5','16 + P sonic; push 10','22 + P sonic; push 15'), effect: 'Forced movement ignores stability.' },
    ],
  };

  const troubadour = {
    2: {
      summary: 'You learn to coax the muses — and bend a battle\u2019s drama to your will.',
      staminaGain: 6,
      autoFeatures: () => [
        { name: 'Appeal to the Muses', text: 'Before rolling for drama at the start of your turn, make your appeal (no action). On a 1: +1 drama, Director gains 1d3 Malice. On a 2: gain 1 Heroic Resource for you or an ally in your performance\u2019s distance, Director gains 1 Malice. On a 3: gain 2 Heroic Resource to share among yourself and allies in distance.' },
      ],
      choices: [
        { id: 'invocation', label: 'Invocation', help: 'Choose the manner that defines your presence on the battlefield.', kind: 'feature', options: INVOCATION_2 },
        { id: 'perk', label: 'Perk', help: 'Choose one interpersonal, lore, or supernatural perk.', kind: 'perk', options: PERK_ILS },
        { id: 'act-ability-2', label: '2nd-Level Class Act Ability', help: 'Your class act grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => ACT_ABILITY_2[sub] || [] },
      ],
    },
    3: {
      summary: 'Your art deepens; the stage bends further to your performance.',
      staminaGain: 6,
      autoFeatures: ({ sub }) => ACT_FEATURE_3[sub] || [],
      choices: [
        { id: 'drama-7', label: '7-Drama Ability', help: 'Choose one heroic ability that costs 7 drama.', kind: 'ability', options: () => (window.classDef ? [] : []) , },
      ],
    },
    4: {
      summary: 'You wring still more drama from the scene, and your body answers the role.',
      staminaGain: 6,
      autoCharacteristicIncrease: { Agility: 3, Presence: 3, max: true },
      autoFeatures: () => [
        { name: 'Characteristic Increase', text: 'Your Agility and Presence scores each increase to 3.' },
        { name: 'Melodrama', text: 'Choose two new events that grant you drama in battle (e.g. a natural 2 on a power roll; a hero winded by Malice; a hero falling 5+ squares; a hero dealing damage with 3 surges; a hero spending their last Recovery). Or boost one event you already have by +1 drama.' },
        { name: 'Zeitgeist', text: 'When you start or finish a respite, choose: Foreshadowing (two clues, one may be false), Hear Ye Hear Ye! (spread information with a Presence test), or Latest Goss (three rumors, one may be false).' },
      ],
      choices: [
        { id: 'perk-4', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
        { id: 'skill-4', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
      ],
    },
    5: {
      summary: 'Your class act reveals a deeper craft.',
      staminaGain: 6,
      choices: [
        { id: 'act-feature-5', label: '5th-Level Class Act Feature', help: 'Your class act grants your choice of one of two features.', kind: 'feature', options: ({ sub }) => ACT_FEATURE_5[sub] || [] },
      ],
    },
    6: {
      summary: 'The spotlight finds you, and the crowd lends you its power.',
      staminaGain: 6,
      autoFeatures: () => [
        { name: 'Spotlight', text: 'New performance: each ally who starts their turn in the 5 aura gains 1 Heroic Resource, which vanishes at the end of their turn if unspent.' },
      ],
      choices: [
        { id: 'perk-6', label: 'Perk', help: 'Choose one interpersonal, lore, or supernatural perk.', kind: 'perk', options: PERK_ILS },
        { id: 'act-ability-6', label: '6th-Level Class Act Ability', help: 'Your class act grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => ACT_ABILITY_6[sub] || [] },
      ],
    },
    7: {
      summary: 'You and your fellow players grow legendary; drama floods you turn after turn.',
      staminaGain: 6,
      autoCharIncreaseAll: { delta: 1, max: 4 },
      autoFeatures: () => [
        { name: 'Characteristic Increase', text: 'Each characteristic score increases by 1, to a maximum of 4.' },
        { name: 'Equal Billing', text: 'You can bond a willing hero with Scene Partner (losing an existing hero bond). You and bonded creatures gain +1 to saving throws, and on a successful save you all gain temporary Stamina equal to your level.' },
        { name: 'A Muse\u2019s Muse', text: 'At the start of each of your turns in combat, you gain 1d3 + 1 drama instead of 1d3.' },
      ],
      choices: [
        { id: 'skill-7', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
      ],
    },
    8: {
      summary: 'Your class act entrusts you with its highest craft.',
      staminaGain: 6,
      autoFeatures: ({ sub }) => ACT_FEATURE_8[sub] || [],
      choices: [
        { id: 'perk-8', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      ],
    },
    9: {
      summary: 'The roar of the crowd makes you unbreakable.',
      staminaGain: 6,
      autoFeatures: () => [
        { name: 'Roar of the Crowd', text: 'You can\u2019t be made frightened, and can stand from prone as a free maneuver. When you spend a Recovery you can forgo the Stamina to grant yourself and allies within 3 squares temporary Stamina equal to 10 + your active Scene Partner bonds + the higher of your Victories or the number of players.' },
      ],
      choices: [
        { id: 'act-ability-9', label: '9th-Level Class Act Ability', help: 'Your class act grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => ACT_ABILITY_9[sub] || [] },
      ],
    },
    10: {
      summary: 'You become the greatest of all time — applause itself answers your call.',
      staminaGain: 6,
      autoCharacteristicIncrease: { Agility: 5, Presence: 5, max: true },
      autoFeatures: () => [
        { name: 'Characteristic Increase', text: 'Your Agility and Presence scores each increase to 5.' },
        { name: 'Applause', text: 'You gain the epic resource applause equal to the XP you earn each respite, spendable as drama. You can also spend 1 applause to improve a failure or tier-1 outcome by one tier for yourself or a creature within 3 squares. Applause remains until spent.' },
        { name: 'Dramaturgy', text: 'Your Appeal to the Muses grants 1 extra drama/Heroic Resource. Your performances lose their distance and can affect any target in your line of effect on the encounter map.' },
        { name: 'Greatest of All Time', text: 'On a successful test, each NPC in your line of effect has Impression reduced by 4 (min 1) during negotiation, and each ally within 3 squares gains an edge on their next test, until your next respite.' },
      ],
      choices: [
        { id: 'perk-10', label: 'Perk', help: 'Choose one interpersonal, lore, or supernatural perk.', kind: 'perk', options: PERK_ILS },
        { id: 'skill-10', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
      ],
    },
  };

  // 7-drama abilities for level 3 (shared, not class-act gated).
  troubadour[3].choices[0].options = () => ([
    { name: 'Harsh Critic', cost: 7, resource: 'Drama', flavor: 'One bad review will ruin their day.', keywords: ['Magic','Melee','Ranged','Strike'], type: 'Main action', distance: 'Melee 1 or ranged 10', target: 'One creature or object', powerRoll: 'Presence', tiers: t('7 + P sonic','10 + P sonic','13 + P sonic'), effect: 'The first time the target uses an ability before your next turn, its non-damage tier outcomes are negated for all targets.' },
    { name: 'Hypnotic Overtones', cost: 7, resource: 'Drama', flavor: 'An entrancing note twists the senses.', keywords: ['Area','Magic'], type: 'Main action', distance: '2 burst', target: 'Each enemy in the area', powerRoll: 'Presence', tiers: t('Slide 1; I<WEAK, dazed (save)','Slide 1; I<AVERAGE, dazed (save)','Slide 2; I<STRONG, dazed (save)'), effect: 'Spend 2+ drama: the burst grows by 1 per 2 drama.' },
    { name: 'Quick Rewrite', cost: 7, resource: 'Drama', flavor: 'You write something unexpected into the scene.', keywords: ['Area','Magic','Ranged'], type: 'Main action', distance: '3 cube within 10', target: 'Each enemy in the area', powerRoll: 'Presence', tiers: t('4; P<WEAK, slowed (save)','5; P<AVERAGE, slowed (save)','6; P<STRONG, restrained (save)'), effect: 'The area is difficult terrain for enemies.' },
    { name: 'Upstage', cost: 7, resource: 'Drama', flavor: 'You leave the audience wanting more.', keywords: ['Melee','Strike','Weapon'], type: 'Maneuver', distance: 'Self; see below', target: 'Self', powerRoll: 'Agility or Presence', tiers: t('Taunted (EoT); A<WEAK, prone','Taunted (EoT); A<AVERAGE, prone','Taunted (EoT); A<STRONG, prone & can\u2019t stand'), effect: 'You shift up to your speed and make one power roll against each enemy you move adjacent to.' },
  ]);

  function install() {
    if (!window.LEVELUP_DATA) { setTimeout(install, 30); return; }
    window.LEVELUP_DATA.troubadour = troubadour;
  }
  install();
})();
