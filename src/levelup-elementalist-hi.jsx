// levelup-elementalist-hi.jsx — Elementalist level-up data, levels 5–10 (extends existing 2–4).
// Specializations: earth / fire / green / void · Resource: Essence · staminaPer 6.

(function () {
  const PERK_ANY = ['crafting','exploration','interpersonal','intrigue','lore','supernatural'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Perk', body: '' }));
  const SKILL_ANY = ['crafting','exploration','interpersonal','intrigue','lore'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Skill', body: '' }));
  const tr = (t1, t2, t3) => [['\u2264 11', t1], ['12\u201316', t2], ['17+', t3]];
  const es = (n, name, flavor, effect, extra) => ({ name, cost: n, resource: 'Essence', flavor, type: (extra && extra.type) || 'Main action', keywords: (extra && extra.keywords) || ['Magic','Ranged'], distance: (extra && extra.distance) || 'Ranged 10', target: (extra && extra.target) || 'One creature', tiers: extra && extra.tiers, effect, powerRoll: extra && extra.powerRoll });

  const ES_9 = () => [
    es(9, 'Combustion Deferred', 'Your flames dance from kindling to kindling.', 'When the target ends its next turn (or drops to 0), adjacent enemies take fire equal to twice your Reason.', { keywords:['Fire','Magic','Ranged','Strike'], powerRoll:'Reason', tiers:tr('5 + R fire','9 + R fire','12 + R fire') }),
    es(9, 'Storm of Sands', 'A dark, pulsing hurricane of debris.', 'A movable persistent area that batters enemies.', { keywords:['Area','Earth','Magic','Ranged'], distance:'3 cube within 10', target:'Each enemy in area', powerRoll:'Reason', tiers:tr('5','8','11') }),
    es(9, 'Subverted Perception of Space', 'You rip an enemy\u2019s world in twain.', 'A void strike that limits the target\u2019s line of effect.', { keywords:['Magic','Ranged','Strike','Void'], powerRoll:'Reason', tiers:tr('5 + R; limited sight','9 + R; limited sight','12 + R; limited sight') }),
    es(9, 'Web of All That\u2019s Come Before', 'A vibrant, pearlescent web.', 'A green web area that snares and slows your foes.', { keywords:['Area','Green','Magic','Ranged'], distance:'3 cube within 10', target:'Each enemy in area', powerRoll:'Reason', tiers:tr('restrained-ish','restrained','restrained') }),
  ];
  const ES_9B = () => [
    es(9, 'Luminous Champion Aloft', 'A beautiful diamond in the night sky.', 'You uplift an ally with radiant, flying power.', { keywords:['Fire','Green','Magic','Ranged','Void'], target:'One ally' }),
    es(9, 'Magma Titan', 'Their body swells with lava, mud, and might.', 'An ally grows into a towering elemental titan.', { keywords:['Earth','Fire','Green','Magic','Ranged'], target:'One ally' }),
    es(9, 'Meteor', 'You teleport the target up and let gravity finish it.', 'Teleport a foe skyward for a fiery fall.', { keywords:['Earth','Fire','Magic','Ranged','Void'], powerRoll:'Reason', tiers:tr('fall + 5 fire','fall + 8 fire','fall + 11 fire') }),
    es(9, 'The Wode Remembers and Returns', 'A terrarium from canopy to underbrush.', 'You conjure a layered living battlefield of the Green.', { keywords:['Area','Earth','Green','Magic','Void'], distance:'Special', target:'Special' }),
  ];
  const ES_11 = () => [
    es(11, 'Heart of the Wode', 'A splinter of the Great Tree provides your every need.', 'A tree that restrains enemies and sustains allies.', { keywords:['Green','Magic','Ranged'], target:'Special' }),
    es(11, 'Muse of Fire', 'Hot enough to sear the face of any god.', 'A blaze so fierce it can drive Malice negative.', { keywords:['Area','Fire','Magic','Ranged'], distance:'Special', target:'Each enemy in area', powerRoll:'Reason', tiers:tr('heavy fire','heavy fire','heavy fire') }),
    es(11, 'Return to Oblivion', 'A tear in reality that could consume everything.', 'A size-1L vortex that vertical-pulls enemies each round.', { keywords:['Area','Magic','Ranged','Void'], distance:'Special', target:'Special' }),
    es(11, 'World Torn Asunder', 'You quake the whole world over.', 'A massive earthquake that levels the battlefield.', { keywords:['Area','Earth','Magic'], distance:'Special', target:'Each enemy in area', powerRoll:'Reason', tiers:tr('heavy; prone','heavy; prone','heavy; prone') }),
  ];
  const ES_11B = () => [
    es(11, 'Earth Rejects You', 'An eruption of rocks and debris.', 'A persistent eruption that blows everything away.', { keywords:['Area','Earth','Magic','Ranged'], distance:'Special', target:'Each enemy in area', powerRoll:'Reason', tiers:tr('heavy; push','heavy; push','heavy; push') }),
    es(11, 'The Green Defends Its Servants', 'A shield more beautiful the more it cracks.', 'A luminous green ward for you and your allies.', { keywords:['Green','Magic','Ranged'], target:'Allies' }),
    es(11, 'Prism', 'You split your essence to cast at once.', 'Use up to three heroic abilities totaling 11 essence or less.', { keywords:['Magic','Void'], type:'Main action', distance:'Self', target:'Self' }),
    es(11, 'Unquenchable Fire', 'A fiery missile braided with primal energy.', 'An unstoppable bolt of primal flame.', { keywords:['Fire','Magic','Ranged','Strike'], powerRoll:'Reason', tiers:tr('heavy fire','heavy fire','heavy fire') }),
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

  const hi = {
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
        { name: 'Surging Essence', text: 'When you gain essence at the start of your turns in combat, you gain 3 instead of 2.' },
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
      autoFeatures: () => [
        { name: 'Characteristic Increase', text: 'Your Reason increases to 5, and one other characteristic increases by 1 (to a max of 5).' },
        { name: 'Breath', text: 'You gain the epic resource breath equal to the XP you earn each respite. Spend any number of breath (no action) to gain essence. Breath remains until spent.' },
        { name: 'Essential Being', text: 'When you gain essence at the start of your turns in combat, you gain 4 instead of 3.' },
        { name: 'One', text: 'You become the embodiment of your element; elemental motes flit around you and your magic reaches its purest form.' },
      ],
      choices: [
        { id: 'perk-10', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
        { id: 'skill-10', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
      ],
    },
  };

  function install() {
    if (!window.LEVELUP_DATA || !window.LEVELUP_DATA.elementalist) { setTimeout(install, 30); return; }
    Object.assign(window.LEVELUP_DATA.elementalist, hi);
  }
  install();
})();
