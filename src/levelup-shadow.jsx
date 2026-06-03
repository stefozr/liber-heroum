// levelup-shadow.jsx — Shadow level-up data (levels 2–10).
// Colleges: Black Ash / Caustic Alchemy / Harlequin Mask · Resource: Insight · staminaPer 6.

(function () {
  const PERK_EII = [
    { id: 'exploration',  name: 'Exploration Perk',  body: 'A boon for the wilds and the road.' },
    { id: 'interpersonal',name: 'Interpersonal Perk',body: 'A boon for the table and the court.' },
    { id: 'intrigue',     name: 'Intrigue Perk',     body: 'A boon for the shadows and the con.' },
  ];
  const PERK_ANY = ['crafting','exploration','interpersonal','intrigue','lore','supernatural'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Perk', body: '' }));
  const SKILL_ANY = ['crafting','exploration','interpersonal','intrigue','lore'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Skill', body: '' }));
  const t = (t1, t2, t3) => [['\u2264 11', t1], ['12\u201316', t2], ['17+', t3]];
  const ins = (n, name, flavor, effect, extra) => ({ name, cost: n, resource: 'Insight', flavor, type: (extra && extra.type) || 'Main action', keywords: (extra && extra.keywords) || ['Melee','Strike','Weapon'], distance: (extra && extra.distance) || 'Melee 1', target: (extra && extra.target) || 'One creature', tiers: extra && extra.tiers, effect, powerRoll: extra && extra.powerRoll });

  // ── Shared insight abilities ──
  const INS_7 = () => [
    ins(7, 'Dancer', 'A flow state that makes you nearly impossible to pin down.', 'Until end of encounter, when an enemy moves/force-moves adjacent to you or damages you, take Disengage as a free triggered action.', { type:'Maneuver', keywords:['Magic'], distance:'Self', target:'Self' }),
    ins(7, 'Misdirecting Strike', '"Why are you looking at ME?!"', 'The target is taunted by a willing ally within 5 squares of you until the end of its next turn.', { keywords:['Melee','Ranged','Strike','Weapon'], distance:'Melee 1 or ranged 10', powerRoll:'Agility', tiers:t('9 + A','13 + A','16 + A; taunted as effect','') }),
    ins(7, 'Pinning Shot', 'One missile — placed well and placed hard.', 'A ranged strike that can restrain.', { keywords:['Ranged','Strike','Weapon'], distance:'Ranged 10', powerRoll:'Agility', tiers:t('9 + A','13 + A; A<AVERAGE restrained (save)','16 + A; A<STRONG restrained (save)') }),
    ins(7, 'Staggering Blow', 'There\u2019s no recovering from this.', 'A heavy strike that leaves the target reeling.', { keywords:['Melee','Ranged','Strike','Weapon'], distance:'Melee 1 or ranged 10', powerRoll:'Agility', tiers:t('11 + A','15 + A','19 + A; slowed (save)') }),
  ];
  const INS_9 = () => [
    ins(9, 'Blackout', 'A cloud of darkness erupts from your eyes.', 'A black cloud fills the area until end of your next turn, giving you and allies concealment; enemies ending their turn inside take corruption damage equal to your Agility.', { keywords:['Area','Magic'], type:'Main action', distance:'3 burst', target:'Special' }),
    ins(9, 'Into the Shadows', 'You plunge your foe into absolute darkness.', 'A magic strike dealing heavy corruption damage.', { keywords:['Magic','Melee','Strike','Weapon'], powerRoll:'Agility', tiers:t('9 + A corruption','13 + A corruption','17 + A corruption') }),
    ins(9, 'Shadowfall', 'You vanish. They fall. You reappear.', 'You disappear, roll against each creature in a line, then reappear at the far end.', { keywords:['Area','Melee','Weapon'], distance:'Self; see below', target:'Special', powerRoll:'Agility', tiers:t('5 damage','8 damage','11 damage') }),
    ins(9, 'You Talk Too Much', 'A knife pinning their mouth shut.', 'A strike that silences a chatty foe.', { keywords:['Melee','Ranged','Strike','Weapon'], distance:'Melee 1 or ranged 10', powerRoll:'Agility', tiers:t('9 + A; silenced (save)','13 + A; silenced (save)','16 + A; silenced (save)') }),
  ];
  const INS_11 = () => [
    ins(11, 'Assassinate', 'A practiced attack instantly kills a weakened foe.', 'A non-minion/leader/solo target who is winded after this damage is reduced to 0 Stamina.', { powerRoll:'Agility', tiers:t('11 + A','16 + A','22 + A') }),
    ins(11, 'Shadowgrasp', 'The shadow creature within you grasps at your foes.', 'Area corruption damage that can restrain.', { keywords:['Area','Magic'], type:'Main action', distance:'3 burst', target:'Each enemy in the area', powerRoll:'Agility', tiers:t('11 corruption','16 corruption','21 corruption; A<STRONG restrained (save)') }),
    ins(11, 'Speed of Shadows', 'Multiple strikes before they notice they\u2019re dead.', 'Use a strike signature ability four times (or fewer times for an edge/double edge), shifting between.', { keywords:['Magic'], type:'Main action', distance:'Self', target:'Self' }),
    ins(11, 'They Always Line Up', 'A projectile passing through a line of foes.', 'A ranged line strike that hamstrings enemies.', { keywords:['Area','Ranged','Weapon'], type:'Main action', distance:'Self; see below', target:'Special', powerRoll:'Agility', tiers:t('7 damage; slowed (save)','11 damage; slowed (save)','15 damage; slowed (save)') }),
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
      ins(5, 'In a Puff of Ash', 'You enchant a strike with teleportation magic.', 'On a hit you can teleport the target (further on higher tiers).', { keywords:['Magic','Melee','Ranged','Strike','Weapon'], distance:'Melee 1 or ranged 5', powerRoll:'Agility', tiers:t('6 + A; teleport target 1','10 + A; teleport up to 3','14 + A; teleport up to 5') }),
      ins(5, 'Too Slow', 'Your foe made a big mistake.', 'Triggered on your In All This Confusion: ignore the damage\u2019s effects, free-strike a damager, then spend a Recovery.', { type:'Free triggered', keywords:['Magic'], distance:'Self', target:'Self' }),
    ],
    'caustic-alchemy': [
      ins(5, 'Sticky Bomb', 'Explosives are best attached to an enemy.', 'Attach a bomb that detonates at the end of your next turn, hitting enemies within 2 squares.', { keywords:['Ranged'], distance:'Ranged 10', powerRoll:'Agility', tiers:t('4 + A fire','7 + A fire','11 + A fire') }),
      ins(5, 'Stink Bomb', 'Putrid yellow gas explodes.', 'Lingering gas; creatures starting inside with M<AVERAGE are weakened (save).', { keywords:['Area','Ranged'], distance:'3 cube within 10', target:'Each creature in the area', powerRoll:'Agility', tiers:t('2 poison','5 poison','7 poison') }),
    ],
    'harlequin-mask': [
      ins(5, 'Machinations of Sound', 'Illusory sounds make foes reposition.', 'Slide each enemy (reduced by their Intuition); ignores stability.', { type:'Maneuver', keywords:['Area','Magic','Ranged'], distance:'3 cube within 10', target:'Each enemy in the area', powerRoll:'Agility', tiers:t('Slide 4','Slide 5','Slide 7') }),
      ins(5, 'So Gullible', 'You were in a different place all along.', 'Triggered when struck: use Clever Trick free, teleport up to 3 near them, free-strike, then spend a Recovery.', { type:'Free triggered', keywords:['Magic'], distance:'Self', target:'Self' }),
    ],
  };
  const COLLEGE_ABILITY_6 = {
    'black-ash': [
      ins(9, 'Black Ash Eruption', 'A cloud of ash launches an enemy skyward.', 'Vertical push that grows with the tier.', { keywords:['Magic','Melee','Strike','Weapon'], powerRoll:'Agility', tiers:t('3 + A; vertical push 5','6 + A; vertical push 10','9 + A; vertical push 15') }),
      ins(9, 'Cinderstorm', 'You teleport your friends in a burst of ash and fire.', 'Allies teleport up to 5; those moving by enemies deal fire damage equal to your Agility.', { type:'Maneuver', keywords:['Magic'], distance:'4 burst', target:'Self and each ally in the area' }),
    ],
    'caustic-alchemy': [
      ins(9, 'One Vial Makes You Better', 'A well-timed potion keeps allies in the fight.', 'Three allies can quaff a potion: spend up to 2 Recoveries and gain acid/fire/poison immunity equal to your level.', { type:'Maneuver', keywords:['Ranged'], distance:'Ranged 10', target:'Three creatures' }),
      ins(9, 'One Vial Makes You Faster', 'Take the battle to the next level.', 'Three allies quaff a potion for +2 speed, flight, or invisibility based on your roll.', { keywords:['Ranged'], distance:'Ranged 10', target:'Three creatures', powerRoll:'Agility', tiers:t('+2 speed','can fly','invisible until end of next turn') }),
    ],
    'harlequin-mask': [
      ins(9, 'Look!', 'You distract your foes for your allies.', 'Until the start of your next turn, ability rolls against each enemy in the burst gain an edge.', { type:'Maneuver', keywords:['Area','Magic'], distance:'5 burst', target:'Each enemy in the area' }),
      ins(9, 'Puppet Strings', 'You make foes lose control.', 'Two enemies; low-Reason targets make a free strike or use an action of your choice before damage.', { keywords:['Magic','Melee','Strike','Weapon'], target:'Two enemies', powerRoll:'Agility', tiers:t('2; R<WEAK free strike','5; R<AVERAGE forced action','7; R<STRONG shift + forced action') }),
    ],
  };
  const COLLEGE_ABILITY_9 = {
    'black-ash': [
      ins(11, 'Cacophony of Cinders', 'Stabbing foes and teleporting allies.', 'Shift up to twice your speed, rolling against each creature you pass; enemies take damage, allies teleport.', { keywords:['Magic','Melee','Weapon'], distance:'Self; see below', target:'Self', powerRoll:'Agility', tiers:t('6 dmg / ally tp 3','10 dmg / ally tp 5','14 dmg / ally tp 7') }),
      ins(11, 'Demon Door', 'A demonic hand reaches through.', 'Heavy corruption + push; on a crit the target is dragged through the portal forever.', { keywords:['Magic','Melee','Strike','Weapon'], distance:'Melee 3', powerRoll:'Agility', tiers:t('13 + A corruption; push 3','18 + A corruption; push 5','25 + A corruption; push 7') }),
    ],
    'caustic-alchemy': [
      ins(11, 'Chain Reaction', 'Nine explosions, a celebration.', 'The blast spreads to every enemy within 3 squares of a target until none remain.', { keywords:['Ranged'], distance:'Ranged 10', target:'One creature or object', powerRoll:'Agility', tiers:t('7','10','15') }),
      ins(11, 'To the Stars', 'Launch them into orbit.', 'Big vertical push; leaves difficult terrain at the start point.', { keywords:['Melee','Ranged','Strike'], distance:'Melee 1 or ranged 10', target:'One creature or object', powerRoll:'Agility', tiers:t('4 + A fire; vert push 8','7 + A fire; vert push 10','11 + A fire; vert push 15') }),
    ],
    'harlequin-mask': [
      ins(11, 'I Am You', 'Your mask reflects your foe\u2019s face.', 'Until end of encounter, borrow the target\u2019s immunities, speed, movement types, and signature ability.', { type:'Maneuver', keywords:['Magic','Ranged'], distance:'Ranged 10', target:'One creature' }),
      ins(11, 'It Was Me All Along', 'You twist the blade and make it personal.', 'If disguised as someone the target knew, deal extra damage equal to three times your Agility.', { powerRoll:'Agility', tiers:t('15 + A','21 + A','28 + A') }),
    ],
  };

  const shadow = {
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
        { name: 'Careful Observation Improvement', text: 'You can observe two creatures at once; striking one doesn\u2019t end your observation of the other.' },
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
        { name: 'Careful Observation Improvement', text: 'You can observe three creatures at once.' },
        { name: 'Improved Umbral Form', text: 'You gain full control of your umbral form and can end it at will. It now grants concealment, enemies lose their edge against you, and you can teleport with willing allies to a known location (turning them invisible).' },
        { name: 'Subterfuge', text: 'You gain the epic resource subterfuge equal to the XP you earn each respite, spendable as insight. You can also spend it for an extra maneuver each, on your turn. Subterfuge remains until spent.' },
      ],
      choices: [
        { id: 'perk-10', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
        { id: 'skill-10', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
      ],
    },
  };

  function install() {
    if (!window.LEVELUP_DATA) { setTimeout(install, 30); return; }
    window.LEVELUP_DATA.shadow = shadow;
  }
  install();
})();
