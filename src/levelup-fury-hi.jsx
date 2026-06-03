// levelup-fury-hi.jsx — Fury level-up data, levels 5–10 (extends existing 2–4 in levelup.jsx).
// Aspects: berserker / reaver / stormwight · Resource: Ferocity · staminaPer 9.

(function () {
  const PERK_CEI = [
    { id: 'crafting',    name: 'Crafting Perk',    body: 'A boon tied to making and mending.' },
    { id: 'exploration', name: 'Exploration Perk', body: 'A boon for the wilds and the road.' },
    { id: 'intrigue',    name: 'Intrigue Perk',    body: 'A boon for the shadows and the con.' },
  ];
  const PERK_ANY = ['crafting','exploration','interpersonal','intrigue','lore','supernatural'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Perk', body: '' }));
  const SKILL_ANY = ['crafting','exploration','interpersonal','intrigue','lore'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Skill', body: '' }));
  const tr = (t1, t2, t3) => [['\u2264 11', t1], ['12\u201316', t2], ['17+', t3]];
  const fe = (n, name, flavor, effect, extra) => ({ name, cost: n, resource: 'Ferocity', flavor, type: (extra && extra.type) || 'Main action', keywords: (extra && extra.keywords) || ['Melee','Strike','Weapon'], distance: (extra && extra.distance) || 'Melee 1', target: (extra && extra.target) || 'One creature', tiers: extra && extra.tiers, effect, powerRoll: extra && extra.powerRoll });

  const FE_9 = () => [
    fe(9, 'Debilitating Strike', 'One blow to sabotage your target.', 'A slowed target takes 1 damage per square it moves.', { powerRoll:'Might', tiers:tr('5 + M; slowed (save)','8 + M; slowed (save)','11 + M; slowed (save)') }),
    fe(9, 'My Turn!', 'You quickly strike back at a foe.', 'A counter-strike that lets you spend a Recovery.', { type:'Free triggered', powerRoll:'Might', tiers:tr('5 + M','8 + M','11 + M') }),
    fe(9, 'Rebounding Storm', 'You knock enemies around like playthings.', 'Forced movement that bounces targets through obstacles.', { powerRoll:'Might', tiers:tr('5 + M; push 3','8 + M; push 5','11 + M; push 7') }),
    fe(9, 'To Stone!', 'Blows that petrify your foe.', 'A magic strike that can turn the target to stone.', { keywords:['Magic','Melee','Strike','Weapon'], powerRoll:'Might', tiers:tr('M<WEAK slowed (save)','M<AVERAGE restrained (save)','M<STRONG petrified (save)') }),
  ];
  const FE_11 = () => [
    fe(11, 'Elemental Ferocity', 'Instant retribution.', 'Gain 10 temporary Stamina and retaliate with elemental damage all encounter.', { keywords:['Magic'], type:'Maneuver', distance:'Self', target:'Self' }),
    fe(11, 'Overkill', 'You strike so no damage is wasted.', 'Minions/winded non-leaders are reduced to 0 first; a kill rolls over.', { keywords:['Magic','Melee','Strike','Weapon'], powerRoll:'Might', tiers:tr('11 + M','16 + M','22 + M') }),
    fe(11, 'Primordial Rage', 'Ferocity manifests into primordial power.', 'Choose a damage type; convert ability damage to it all encounter.', { keywords:['Magic'], type:'Maneuver', distance:'Self', target:'Self' }),
    fe(11, 'Relentless Death', 'You won\u2019t escape your fate.', 'A relentless magic strike that hounds the target.', { keywords:['Magic','Melee','Strike','Weapon'], powerRoll:'Might', tiers:tr('11 + M','16 + M','22 + M') }),
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
      fe(9, 'Avalanche Impact', 'You crash down in a shockwave.', 'Jump your max distance and roll against each creature where you land.', { keywords:['Magic'], type:'Maneuver', distance:'Self', target:'Self', powerRoll:'Might', tiers:tr('4; push 1','7; push 2','11; push 3') }),
      fe(9, 'Force of Storms', 'You turn a foe into a projectile.', 'A heavy push; the target shoves nearby creatures on impact.', { powerRoll:'Might', tiers:tr('7 + M; push 3','11 + M; push 5','16 + M; push 7') }),
    ],
    reaver: [
      fe(9, 'Death Strike', 'Every killing blow is an opportunity.', 'Triggered on a kill: repeat the strike against an adjacent creature.', { type:'Free triggered', target:'Self' }),
      fe(9, 'Seek and Destroy', 'You break the line to make an example.', 'Shift your speed; winded non-leaders drop and a nearby foe is frightened.', { powerRoll:'Might', tiers:tr('4 + M; P<WEAK frightened (save)','6 + M; P<AVERAGE frightened (save)','10 + M; P<STRONG frightened (save)') }),
    ],
    stormwight: [
      fe(9, 'Pounce', 'You strike like the ultimate predator.', 'Grab and drag the target, dealing twice your Might each turn.', { keywords:['Magic','Melee','Strike','Weapon'], powerRoll:'Might', tiers:tr('8; M<WEAK grabbed','13; M<AVERAGE grabbed','17; M<STRONG grabbed') }),
      fe(9, 'Riders on the Storm', 'A seething storm of primordial power.', 'A 3 aura that damages enemies and lets you and allies fly until end of encounter.', { keywords:['Area','Magic'], type:'Maneuver', distance:'3 aura', target:'Each creature in the area' }),
    ],
  };
  const ASPECT_ABILITY_9 = {
    berserker: [
      fe(11, 'Death Comes for You All!', 'A destructive shockwave.', 'Hurled targets slammed through objects take +10 damage.', { keywords:['Area','Magic','Melee','Weapon'], type:'Main action', distance:'3 burst', target:'Each enemy in the area', powerRoll:'Might', tiers:tr('7; push 3','10; push 5','15; push 7') }),
      fe(11, 'Primordial Vortex', 'You pull foes to you.', 'Vertical pull; a target slammed into you deals its damage to itself.', { keywords:['Area','Magic','Melee','Weapon'], type:'Main action', distance:'3 burst', target:'Each enemy in the area', powerRoll:'Might', tiers:tr('3; vert pull 3','5; vert pull 5','8; vert pull 7') }),
    ],
    reaver: [
      fe(11, 'Primordial Bane', 'You attune a foe to an element.', 'The target loses immunity and gains weakness 10 to a chosen type (save).', { keywords:['Magic','Melee','Strike','Weapon'], powerRoll:'Might', tiers:tr('11 + M','16 + M','21 + M') }),
      fe(11, 'Shower of Blood', 'You reset the balance of combat.', 'A brutal strike that distracts every enemy within 5 squares.', { powerRoll:'Might', tiers:tr('12 + M','18 + M','24 + M') }),
    ],
    stormwight: [
      fe(11, 'Death Rattle', 'An otherworldly cry.', 'Psychic burst that kills minions and the weakest foes.', { keywords:['Area','Magic'], type:'Main action', distance:'3 burst', target:'Each enemy in the area', powerRoll:'Might', tiers:tr('4 psychic; minions die','6 psychic; minions & a winded foe die','10 psychic; non-leaders winded') }),
      fe(11, 'Deluge', 'You summon your primordial storm.', 'Area damage of your primordial type that ignores immunity.', { keywords:['Area','Magic','Ranged'], type:'Main action', distance:'5 cube within 10', target:'Each enemy in the area', powerRoll:'Might', tiers:tr('7','10','15') }),
    ],
  };

  const hi = {
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
        { name: 'Elemental Form', text: 'Berserkers/reavers gain immunity to all elemental damage equal to Might; stormwights gain immunity to their storm\u2019s type equal to twice Might.' },
        { name: 'Greater Ferocity', text: 'When you gain ferocity at the start of your turns, you gain 1d3 + 1 instead of 1d3.' },
        { name: 'Growing Ferocity Improvement', text: 'Your Growing Ferocity grants additional benefits at 10 or more ferocity.' },
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
        { name: 'Chaos Incarnate', text: 'Your elemental immunity doubles (stormwights: triples). Elemental foes with P<STRONG who notice you are frightened. Primordial Strike can spend up to 3 ferocity for surges.' },
        { name: 'Growing Ferocity Improvement', text: 'Your Growing Ferocity grants additional benefits at 12 or more ferocity.' },
        { name: 'Primordial Ferocity', text: 'The first time you take damage each round, you gain 3 ferocity instead of 2.' },
        { name: 'Primordial Power', text: 'You gain the epic resource primordial power equal to the XP you earn each respite, spendable as ferocity. Spend it (free maneuver) to end one effect on you each, or 3 to open a portal to Quintessence. It remains until spent.' },
      ],
      choices: [
        { id: 'perk-10', label: 'Perk', help: 'Choose one crafting, exploration, or intrigue perk.', kind: 'perk', options: PERK_CEI },
        { id: 'skill-10', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
      ],
    },
  };

  function install() {
    if (!window.LEVELUP_DATA || !window.LEVELUP_DATA.fury) { setTimeout(install, 30); return; }
    Object.assign(window.LEVELUP_DATA.fury, hi);
  }
  install();
})();
