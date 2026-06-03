// levelup-tactician.jsx — Tactician level-up data (levels 2–10).
// Doctrines: Insurgent / Mastermind / Vanguard · Resource: Focus · staminaPer 9.

(function () {
  const PERK_EII = [
    { id: 'exploration',  name: 'Exploration Perk',  body: 'A boon for the wilds and the road.' },
    { id: 'interpersonal',name: 'Interpersonal Perk',body: 'A boon for the table and the court.' },
    { id: 'intrigue',     name: 'Intrigue Perk',     body: 'A boon for the shadows and the con.' },
  ];
  const PERK_ANY = ['crafting','exploration','interpersonal','intrigue','lore','supernatural'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Perk', body: '' }));
  const SKILL_ANY = ['crafting','exploration','interpersonal','intrigue','lore'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Skill', body: '' }));
  const t = (t1, t2, t3) => [['\u2264 11', t1], ['12\u201316', t2], ['17+', t3]];
  const foc = (n, name, flavor, effect, extra) => ({ name, cost: n, resource: 'Focus', flavor, type: (extra && extra.type) || 'Main action', keywords: (extra && extra.keywords) || ['Ranged'], distance: (extra && extra.distance) || 'Ranged 10', target: (extra && extra.target) || 'One ally', tiers: extra && extra.tiers, effect, powerRoll: extra && extra.powerRoll });

  const FOC_7 = () => [
    foc(7, 'Frontal Assault', 'Break their morale and force a retreat.', 'Until end of encounter, the first time each turn an ally damages a marked target, they push it 2 and shift 2; charging allies can use a melee strike ability instead of a free strike.', { type:'Maneuver', keywords:['\u2014'], distance:'Self', target:'Self' }),
    foc(7, 'Hit \u2019Em Hard!', 'Your allies see the advantage in your targets.', 'Until end of encounter, whenever you or an ally damages a marked target, that creature gains 2 surges to use immediately.', { type:'Maneuver', keywords:['\u2014'], distance:'Self', target:'Self' }),
    foc(7, 'Rout', 'The tide begins to turn.', 'Until end of encounter, when you or an ally damages a marked target with R<AVERAGE, it is frightened of the attacker (save ends).', { type:'Maneuver', keywords:['\u2014'], distance:'Self', target:'Self' }),
    foc(7, 'Stay Strong and Focus!', 'Keep faith and hold fast!', 'Until end of encounter, whenever you or an ally damages a marked target, the attacker can spend a Recovery.', { type:'Maneuver', keywords:['\u2014'], distance:'Self', target:'Self' }),
  ];
  const FOC_9 = () => [
    foc(9, 'Squad! Gear Check!', 'Your allies secure their defensive gear.', 'You and each ally adjacent to the target gain 10 temporary Stamina.', { type:'Main action', target:'Self and allies' }),
    foc(9, 'Squad! Remember Your Training!', 'You remind your allies how to use their gear.', 'Each target gains 1 surge and can use a signature ability with a double edge.', { target:'Allies' }),
    foc(9, 'Win This Day!', 'You inspire your allies to gather their strength.', 'Each target gains 2 surges, can spend a Recovery, remove conditions, and stand.', { target:'Allies' }),
    foc(9, 'You\u2019ve Still Got Something Left', 'Push an ally to act sooner.', 'The target uses a Strike heroic ability as a free triggered action with reduced cost, dealing extra damage equal to your Reason.', { target:'One ally' }),
    foc(9, 'Panic in Their Lines', 'You confuse your foes into turning on each other.', 'Enemies attack each other in the chaos you sow.', { type:'Main action', keywords:['Ranged'], target:'Enemies' }),
  ];
  const FOC_11 = () => [
    foc(11, 'Go Now and Speed Well', 'You direct an attack to strike true.', 'The target gains 2 surges and uses a signature/heroic ability free, with a double edge, ignoring immunity and +1 potency.', { target:'Self or one ally' }),
    foc(11, 'Finish Them!', 'You point out the killing blow.', 'Triggered when a non-leader/solo target becomes winded: it is killed, and the ally who winded it spends a Recovery.', { type:'Free triggered', target:'One creature' }),
    foc(11, 'Floodgates Open', 'Your squad strikes in unison.', 'Three allies each gain 1 surge and use a signature ability free with an edge and +1 potency.', { target:'Three allies' }),
    foc(11, 'I\u2019ll Open and You\u2019ll Close', 'You create an opening for an ally.', 'A strike; then an ally uses a heroic ability against the target free (paying no resource).', { keywords:['Melee','Ranged','Strike','Weapon'], type:'Main action', distance:'Melee 1 or ranged 5', target:'One creature', powerRoll:'Might', tiers:t('6 + M','10 + M','14 + M') }),
    foc(11, 'That One Is Mine!', 'You make an enemy irrelevant.', 'Mark the target; until end of encounter you can use a signature/heroic ability instead of a free strike against any marked target.', { keywords:['Melee','Ranged','Strike','Weapon'], type:'Main action', distance:'Melee 1 or ranged 5', target:'One creature', powerRoll:'Might', tiers:t('8 + M','13 + M','17 + M') }),
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
      foc(5, 'Fog of War', 'Enemies lash out in fear, heedless of who they hit.', 'Mark Benefit: spend 2 focus when striking a marked target to force it to free-strike a creature of your choice.', { type:'Main action' }),
      foc(5, 'Try Me Instead', 'Try picking on someone my size.', 'A taunting strike that frightens the foe.', { keywords:['Melee','Ranged','Strike','Weapon'], distance:'Melee 1 or ranged 5', target:'One creature', powerRoll:'Reason', tiers:t('R<WEAK frightened (save)','R<AVERAGE frightened (save)','4 + R; R<STRONG frightened (save)') }),
    ],
    mastermind: [
      foc(5, 'I\u2019ve Got Your Back', 'Your enemy will think twice about attacking your friend.', 'A ranged strike that taunts; an adjacent ally spends a Recovery.', { keywords:['Ranged','Strike','Weapon'], distance:'Ranged 5', target:'One creature', powerRoll:'Reason', tiers:t('5 + R; taunted (EoT)','9 + R; taunted (EoT)','12 + R; taunted (EoT)') }),
      foc(5, 'Targets of Opportunity', 'You point out easy targets.', 'Mark two creatures and gain two surges. Mark Benefit: spend 2 focus to add a target to a strike against a marked creature.', { type:'Maneuver', distance:'Ranged 5', target:'Two creatures' }),
    ],
    vanguard: [
      foc(5, 'No Dying on My Watch', 'You prioritize an ally over yourself.', 'Triggered: protect an ally and frighten the attacker.', { type:'Triggered', keywords:['Ranged'], target:'One ally' }),
      foc(5, 'Squad! On Me!', 'Together we are invincible!', 'You rally your squad to your position with a surge of resolve.', { type:'Main action', target:'Allies' }),
    ],
  };
  const DOCTRINE_ABILITY_6 = {
    insurgent: [
      foc(9, 'Coordinated Execution', 'You direct an ally to make a killing blow.', 'Triggered: a non-leader/solo target is reduced to 0 (minions: the whole squad dies).', { type:'Free triggered', target:'One creature' }),
      foc(9, 'Panic in Their Lines', 'Your foes turn on each other.', 'Enemies attack one another in confusion.', { type:'Main action', keywords:['Ranged'], target:'Enemies' }),
    ],
    mastermind: [
      foc(9, 'Battle Plan', 'The perfect plan to win the battle.', 'Mark Benefit: spend 2 focus so strikes vs marked creatures ignore immunity and deal extra damage.', { type:'Main action' }),
      foc(9, 'Hustle!', 'You form a new battle line.', 'Mark two enemies; each marked target shifts its speed, and you and the targets gain 2 surges.', { type:'Maneuver', target:'Two creatures' }),
    ],
    vanguard: [
      foc(9, 'Instant Retaliation', 'You parry with supernatural speed.', 'A triggered counter that can daze.', { type:'Triggered', keywords:['Melee','Strike','Weapon'], distance:'Melee 1', target:'One creature', powerRoll:'Might', tiers:t('parry','parry; slowed','A<STRONG dazed (save)') }),
      foc(9, 'To Me Squad!', 'You lead your allies in a charge.', 'You and allies surge forward together in a coordinated charge.', { type:'Main action', target:'Allies' }),
    ],
  };
  const DOCTRINE_ABILITY_9 = {
    insurgent: [
      foc(11, 'Squad! Hit and Run!', 'A secret pried from the shadow colleges.', 'You and two allies gain 2 surges, use a signature ability free with an edge, then shift 2 and hide.', { type:'Main action', target:'Self and two allies' }),
      foc(11, 'Their Lack of Focus Is Their Undoing', 'You trick enemies into attacking each other.', 'Three enemies use a signature ability (auto tier 3) against targets you choose, then you roll to daze them.', { type:'Main action', keywords:['Magic','Ranged','Weapon'], target:'Three enemies', powerRoll:'Might', tiers:t('R<WEAK dazed (save)','R<AVERAGE dazed (save)','R<STRONG dazed (save)') }),
    ],
    mastermind: [
      foc(11, 'Blot Out the Sun!', 'Fire four shots a minute in any weather.', 'You and each ally in a 3 burst make an edged ranged free strike vs marked enemies, ignoring banes.', { type:'Main action', keywords:['Area'], distance:'3 burst', target:'Self and allies' }),
      foc(11, 'Counterstrategy', 'A way to negate their strengths.', 'Gain 6 surges; until end of encounter, when the Director spends Malice, you or an ally gains 2 Heroic Resource.', { type:'Main action', keywords:['\u2014'], distance:'Self', target:'Self' }),
    ],
    vanguard: [
      foc(11, 'No Escape', 'Nothing will stop you from reaching your foe.', 'Mark the target; a charge that ignores difficult terrain and slides creatures from your path.', { keywords:['Charge','Melee','Strike','Weapon'], type:'Main action', distance:'Melee 1', target:'One creature', powerRoll:'Might', tiers:t('11 + M','16 + M','21 + M') }),
      foc(11, 'Blot Out the Sun!', 'Fire four shots a minute in any weather.', 'You and each ally in a 3 burst make an edged ranged free strike vs marked enemies, ignoring banes.', { type:'Main action', keywords:['Area'], distance:'3 burst', target:'Self and allies' }),
    ],
  };

  const tactician = {
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
        { name: 'Focus on Their Weaknesses', text: 'The first time each round you or an ally damages a marked target, you gain 2 focus instead of 1.' },
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

  function install() {
    if (!window.LEVELUP_DATA) { setTimeout(install, 30); return; }
    window.LEVELUP_DATA.tactician = tactician;
  }
  install();
})();
