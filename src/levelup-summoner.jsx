// levelup-summoner.jsx — Summoner level-up data (levels 2–10).
// Circles: Blight (Demons) / Graves (Undead) / Spring (Fey) / Storms (Elementals)
// · Resource: Essence · staminaPer 6.
import { SUMMONER_PORTFOLIOS, SUMMONER_WARDS } from './data/summoner-minions.js';

const PERK_ILS = [
  { id: 'intrigue',     name: 'Intrigue Perk',     body: 'A boon for the shadows and the con.' },
  { id: 'lore',         name: 'Lore Perk',         body: 'A boon for study and memory.' },
  { id: 'supernatural', name: 'Supernatural Perk', body: 'A boon for the arcane and uncanny.' },
];
const PERK_NLS = [
  { id: 'interpersonal',name: 'Interpersonal Perk',body: 'A boon for the parley and the court.' },
  { id: 'lore',         name: 'Lore Perk',         body: 'A boon for study and memory.' },
  { id: 'supernatural', name: 'Supernatural Perk', body: 'A boon for the arcane and uncanny.' },
];
const PERK_IIS = [
  { id: 'intrigue',     name: 'Intrigue Perk',     body: 'A boon for the shadows and the con.' },
  { id: 'interpersonal',name: 'Interpersonal Perk',body: 'A boon for the parley and the court.' },
  { id: 'supernatural', name: 'Supernatural Perk', body: 'A boon for the arcane and uncanny.' },
];
const PERK_ANY = ['crafting','exploration','interpersonal','intrigue','lore','supernatural'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Perk', body: '' }));
const SKILL_ANY = ['crafting','exploration','interpersonal','intrigue','lore'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Skill', body: '' }));
const t = (t1, t2, t3) => [['≤ 11', t1], ['12–16', t2], ['17+', t3]];
const ess = (n, name, flavor, props) => ({ name, cost: n, resource: 'Essence', flavor, ...props });

// ── Portfolio minion picks (L2: 5-essence, L5: 7-essence). Play mode reads these
// picks by the exact ids 'portfolio-minion-2' / 'portfolio-minion-5'.
const minionOptions = (tier) => ({ sub }) => {
  const pf = SUMMONER_PORTFOLIOS[sub];
  const list = pf ? pf[tier] : Object.values(SUMMONER_PORTFOLIOS).flatMap(p => p[tier]);
  return list.map(m => ({
    id: m.id, name: m.name,
    body: `${m.cost ? m.cost.essence + ' essence · ' + m.cost.count + (m.cost.count > 1 ? ' minions' : ' minion') + ' · ' : ''}${m.role}`,
  }));
};

// ── Ward picks (L3/L6/L9). Later picks filter out the wards already chosen; with
// no character in ctx (bare { sub }) the full four-ward list is offered.
const wardOptions = (level) => (ctx) => {
  const prior = [];
  for (const l of [3, 6]) {
    if (l >= level) break;
    const pick = ctx?.character?.levelChoices?.[l]?.picks?.['ward-' + l];
    const id = pick && (pick.id || pick);
    if (id) prior.push(id);
  }
  const list = SUMMONER_WARDS.filter(w => !prior.includes(w.id));
  return (list.length ? list : SUMMONER_WARDS).map(w => ({ id: w.id, name: w.name, body: w.text }));
};

// ── Summoner's Dominion (L2, auto): the circle's fixture, digested. The full stat
// block lives in data/summoner-minions.js; play mode renders it from there.
const DOMINION_RULES = 'Once per encounter, you can use a maneuver to summon a fixture from your minions’ native manifold or origin into an unoccupied space on the ground within your Summoner’s Range. You can spend 1 essence to relocate the fixture as a free maneuver on your turn. The fixture stays until the end of the encounter, until its Stamina is reduced to 0, or until you become dying. Your fixture gains additional features at 5th and 9th level.';
const dominionFeature = ({ sub }) => {
  const fx = SUMMONER_PORTFOLIOS[sub]?.fixture;
  if (!fx) return { name: 'Summoner’s Dominion', text: DOMINION_RULES };
  const digest = `${fx.flavor} ${fx.role.replace('Fixture · ', '')} — Stamina ${fx.stamina}, Size ${fx.size}. Traits: ${(fx.traits || []).map(tr => tr.name).join(', ')}.`;
  return { name: `Summoner’s Dominion — ${fx.name}`, text: `${DOMINION_RULES} ${digest}` };
};

// ── Portfolio Champion (L8, auto): the circle's champion, digested.
const CHAMPION_RULES = 'Your circle now allows you to add a champion to your portfolio. Champions follow the same rules as your other minions, with these exceptions: you can only summon and command one instance of your champion; they form their own squad that doesn’t count toward your maximum number of squads; they can regain Stamina and gain temporary Stamina, and use your Recoveries to regain Stamina; they can take the Heal and Defend actions and use the normal rules for maneuvers; you have an edge whenever you use an ability with the Champion keyword from your champion’s space; and your champion refuses to be referred to as a minion. After summoning a champion, you can’t summon them again until you earn a Victory. Your champion gains additional features at 10th level, including a special Champion Action ability that costs eidos to use and can be activated once per encounter at the end of any other creature’s turn.';
const championFeature = ({ sub }) => {
  const ch = SUMMONER_PORTFOLIOS[sub]?.champion;
  if (!ch) return { name: 'Portfolio Champion', text: CHAMPION_RULES };
  const digest = `${(ch.flavor || '').split('\n')[0]} Traits: ${(ch.traits || []).map(tr => tr.name).join(', ')}.`;
  return { name: `Portfolio Champion — ${ch.name}`, text: `${CHAMPION_RULES} ${digest}` };
};

// ── 7-Essence abilities (L3 pick) ─────────────────────────────────────────────
const ESS_7 = () => [
  ess(7, 'Blitz Tactics', 'Rush ’em! CRUSH ’EM!', {
    keywords: ['Magic'], type: 'Free maneuver', distance: 'Self', target: 'Special',
    effect: 'Until the end of the encounter or you are dying, each minion under your control during the encounter is the target of the following effect. The first time on a turn that the target moves through an enemy’s space, the enemy can choose to shift 1 square or be M < WEAK (or M < AVERAGE if the target is larger than the enemy) knocked prone. The potency increases by 1 for each subsequent target that moves through the enemy’s space during the same move action.',
  }),
  ess(7, 'Cavalry Call', 'A lone squad appears to disrupt the enemy’s plans and peels off their forces, one by one.', {
    keywords: ['Magic'], type: 'Main action', distance: 'Summoner’s Range', target: 'Special',
    effect: 'You summon a temporary squad containing 6 of your signature minions regardless of your minion maximum within distance. Whenever one of these minions deals damage to an enemy, the enemy is R < AVERAGE compelled to move 5 squares toward the source of the damage (provoking opportunity attacks). The potency increases by 1 for enemies targeted by two or more of these minions.',
  }),
  ess(7, 'Essence Funnel', 'You rapidly summon and sacrifice minions in order to power a devastating blast of magic.', {
    keywords: ['Area','Magic'], type: 'Main action', distance: '10 × 1 line within 1', target: 'Each enemy and object in the area',
    powerRoll: 'Reason', tiers: t('5 damage; push 2','9 damage; push 4','12 damage; push 6'),
    effect: 'Special: You can choose to kill any number of your minions within your Summoner’s Range as a part of this ability, provided they haven’t used a main action or maneuver during the turn. Each target takes an additional 1 damage, plus 1 damage for each minion killed this way. These minions activate no effects upon death, and you gain no essence from their deaths.',
  }),
  ess(7, 'Lead By Example', 'Your minions watch as your implement crackles with power, ready to slam unbelievable force into your foe.', {
    keywords: ['Magic','Melee','Ranged','Strike'], type: 'Main action', distance: 'Melee 1 or Summoner’s Range', target: 'One enemy or object',
    powerRoll: 'Reason', tiers: t('8 + R damage; R < WEAK, dazed (save ends)','12 + R damage; R < AVERAGE, dazed (save ends)','16 + R damage; R < STRONG, dazed (save ends)'),
  }),
];

// ── 9-Essence abilities (L6 pick): brief displays of your future champion ─────
const ESS_9 = () => [
  ess(9, 'A Champion’s Cry', 'Your champion unleashes a bellow that shakes you to your core.', {
    keywords: ['Area','Champion','Magic'], type: 'Main action', distance: '3 burst', target: 'Each enemy in the area',
    powerRoll: 'Reason', tiers: t('2 psychic or sonic damage; I < WEAK, frightened of you (save ends)','5 psychic or sonic damage; I < AVERAGE, frightened of you and all allies (EoT)','7 psychic or sonic damage; I < STRONG, frightened of you and all allies (save ends)'),
    effect: 'You can use this ability as if in the space of one of your minions within your Summoner’s Range.',
  }),
  ess(9, 'Army’s Idol', 'Your champion’s appearance has an enchanting impact on you and your allies.', {
    keywords: ['Area','Champion','Magic'], type: 'Maneuver', distance: '4 burst', target: 'Self and each ally in the area',
    effect: 'You can use this ability as if in the space of one of your minions within your Summoner\'s Range.',
  }),
  ess(9, 'The Champion Slams the Earth', 'Your champion lays their fury upon those unfortunate enough to be in their wake.', {
    keywords: ['Area','Champion','Magic','Weapon'], type: 'Main action', distance: '4 cube within 1', target: 'Each enemy and object in the area',
    powerRoll: 'Reason', tiers: t('5 damage; M < WEAK, prone and can’t stand (save ends)','8 damage; M < AVERAGE, prone and can’t stand (save ends)','11 damage; M < STRONG, prone and can’t stand (save ends)'),
    effect: 'You can use this ability as if in the space of one of your minions within your Summoner’s Range. Special: You can change the damage type to be a type that your champion deals on their stat block (see Portfolio Champion).',
  }),
  ess(9, 'Their Pall Shrouds All', 'Your champion fills the area with a thick haze hiding friend from foe.', {
    keywords: ['Area','Champion','Magic'], type: 'Maneuver', distance: '4 burst', target: 'Each enemy in the area',
    effect: 'You can use this ability as if in the space of one of your minions within your Summoner\'s Range.',
  }),
];

// ── 11-Essence abilities (L9 pick) ────────────────────────────────────────────
const ESS_11 = () => [
  ess(11, '10,000 Minions', 'The battle is now a war. Your entire army storms the field.', {
    keywords: ['Magic'], type: 'Main action', distance: 'Special', target: 'Special',
    effect: 'Until the end of the encounter or you are dying, each square on the ground is considered teeming with minions. An enemy that ends their turn in an affected square takes 5 damage. This damage can\'t be reduced.',
  }),
  ess(11, 'Bodyguard Tactics', 'You surround your allies with a nigh-endless supply of summons that stand in the way of all impacts.', {
    keywords: ['Area','Magic'], type: 'Main action', distance: '5 burst', target: 'Self and each non-minion ally in the area',
    effect: 'Until the end of the encounter or you are dying, each target has damage immunity 5 and can use a free triggered action once per turn whenever they are force moved to reduce the distance by half.',
  }),
  ess(11, 'I Abjure Thee', 'Cast those not affixed to this manifold into the void of a minion’s existence.', {
    keywords: ['Area','Magic'], type: 'Main action', distance: '3 burst', target: 'Special',
    effect: 'Each enemy minion in the area is permanently removed from the encounter map. Up to three non-leader or non-solo enemies in the area are removed from the encounter for 1 round.',
  }),
  ess(11, 'The Champion’s Wrath', 'Your champion appears and goes into a rampage, clearing the way for your minions to march forth.', {
    keywords: ['Area','Champion','Magic','Weapon'], type: 'Main action', distance: '4 burst', target: 'Each enemy in the area',
    powerRoll: 'Reason', tiers: t('6 damage; push 4; M < WEAK, push is vertical','10 damage; push 5; M < AVERAGE, push is vertical','14 damage; push 6; M < STRONG, push is vertical'),
    effect: 'You can use this ability as if in the space of one of your minions within your Summoner\'s Range.',
  }),
];

// ── Circle features (auto, subclass-keyed) ────────────────────────────────────
const CIRCLE_FEAT_5 = {
  blight: [
    { name: 'Shaping', text: 'You can spend 1 uninterrupted minute to perform a ritual that causes one of your minions to fold their shape and disguise themself to look like a duplicate of you, including speaking basic Caelian, allowing them to (potentially) freely move through civilization while completing their tasks. You can have a number of minions disguised at the same time equal to your Reason score.' },
    { name: 'Soul Flense', text: 'As a maneuver, you can command one or more of your demon minions to each deal damage equal to their free strike value to an adjacent ally. This damage can’t be reduced. The ally then ends a condition affecting them and confers it to the demon that attacked them. Additionally, whenever one of your demon minions Death Snaps, their target is P < WEAK, affected by a condition the minion was suffering from. The potency increases by 1 on each subsequent Death Snap the target takes damage from in the same turn (maximum +2).' },
  ],
  graves: [
    { name: 'Channel', text: 'You can spend 1 uninterrupted minute to perform a ritual and use your body as a host for a willing spirit of a creature who died in the area. While hosting the spirit, you have access to their memories of the 24 hours leading up to their death and any skills they knew in life. You can also magically change your appearance to look like them while they were alive. You can attempt to stop channeling the spirit at any time. If the spirit is hostile to you or you’ve hosted them for at least 1 hour, you must make a medium Presence test. On success, the spirit leaves your body. On failure, you become fully possessed by a haunt; you have no access to your skills and you can’t get above a tier 2 result on power rolls until you exorcise the haunt either by completing the Find a Cure downtime project in Draw Steel: Heroes or taking a respite with an exorcist. After you stop channeling their spirit, you can’t use this feature to channel the same creature again.' },
    { name: 'Dread March', text: 'You and your undead minions don’t spend additional speed to move through difficult terrain. If one or more of your undead minions would die while using their move action, they can choose to not die until the end of your turn.' },
  ],
  spring: [
    { name: 'Flash Powder', text: 'Each ally that gains temporary Stamina from your Pixie Dust feature also gains one of the following effects until the end of their next turn (or for 10 minutes if used outside of combat). Flight: their speed gains the Fly keyword. Vanish: they become invisible. Water Weird: as a free maneuver once per turn, they can teleport to a body of water within 5 squares of them. Panacea: they can end one condition affecting them or stand up.' },
    { name: 'Pixie Lift', text: 'Your speed gains the Fly and Hover keywords. You lose the Hover keyword from this feature while you are dazed, dying, or you fly more than 1 square above the surface of the ground. If your speed previously had the Fly keyword, you can now fly while sneaking an additional number of squares equal to your Reason.' },
  ],
  storms: [
    { name: 'Nature Watch', text: 'You can spend 1 uninterrupted minute each day to perform a ritual and summon a special elemental mote called a beacon to patrol the area. This mote telepathically communicates any hostile creatures, hazards, or traps within 20 squares of them to you no matter how far away you are. You know the number of nearby hazards and which direction they’re in relative to where the beacon is, but not their exact position. You can have a number of beacons active equal to your level.' },
    { name: 'Split', text: 'Once during your turn, you can use a free maneuver to deal damage to one of your elemental minions equal to half their maximum Stamina in order to create one additional copy of that minion in an adjacent unoccupied space and add them to their squad, even if you’re at your minion maximum. You can’t use this feature if it would kill one or more of the minions in the squad.' },
  ],
};
const CIRCLE_FEAT_8 = {
  blight: [
    { name: 'Abyssal Evolution', text: 'At the start of each of your turns, you can transform up to two of your demon minions within your Summoner\'s Range. A demon can transform into a different demon minion within your Summoner\'s Range, maintaining their current Stamina. Starting from round 2, a demon can transform any demon minion you can call forth for half the essence cost, as if you summoned the new minion into the demon\'s space.\n\nThe minions must be reassigned to a new squad if their new name differs from the other squad members.' },
  ],
  graves: [
    { name: 'Kill the Pain', text: 'You aren’t affected by excess damage after all minions in a squad are dead. Additionally, you and each of your undead minions ignore damage rolled as a d3 or a d6 and damage from environmental effects while you are not winded.' },
  ],
  spring: [
    { name: 'Celestial Grace', text: 'Your number of Recoveries further increases by 2. Additionally, the area affected by your Pixie Dust feature and any of your fey minions’ traits that affect adjacent creatures and/or the area within 1 or more squares of them increase that distance by 1 square.' },
  ],
  storms: [
    { name: 'Control the Elements', text: 'Whenever you use Call Forth, you can spend essence to change the size of one elemental minion you summon as shown on the Control the Elements table.',
      table: { head: ['Essence Cost', 'Size Change'], rows: [
        ['1', 'The minion becomes size 2.'],
        ['3', 'The minion becomes size 3.'],
        ['5', 'The minion becomes size 4.'],
      ] } },
  ],
};
const SOURCE_MANIFOLD = {
  blight: 'the Abyssal Waste',
  graves: 'the Necropolitan Ruins (located within the Abyssal Waste)',
  spring: 'Arcadia',
  storms: 'Quintessence',
};
const returnToSource = ({ sub }) => ({
  name: 'Return to the Source',
  text: `You can translate yourself and your allies into the space that your minions come from, as if summoning in reverse. When you take a respite, you teleport to your circle’s source manifold or point of origin — ${SOURCE_MANIFOLD[sub] || 'the Abyssal Waste (Blight), the Necropolitan Ruins (Graves), Arcadia (Spring), or Quintessence (Storms)'}. You can bring along any allies to gather resources or research details about that location’s denizens. You are seen as a native resident of the location, but your allies might be seen as intruders. At the end of the respite, you and everyone you brought with you immediately teleports back into the same location from which you made the portal.`,
});

export const summoner = {
  2: {
    summary: 'Your circle grants a fixture of its dominion, and your portfolio grows.',
    staminaGain: 6,
    autoFeatures: (ctx) => [dominionFeature(ctx)],
    choices: [
      { id: 'perk', label: 'Perk', help: 'Choose one intrigue, lore, or supernatural perk.', kind: 'perk', options: PERK_ILS },
      { id: 'portfolio-minion-2', label: 'New Portfolio Minion', help: 'Your circle allows you to select a new 5-essence minion to add to your portfolio.', kind: 'feature', options: minionOptions('t5') },
    ],
  },
  3: {
    summary: 'You conjure a kit — an implement and a ward — and learn a mightier command.',
    staminaGain: 6,
    autoFeatures: () => [
      { name: 'Summoner’s Kit', text: 'You conjure a kit for yourself. This kit includes an implement, such as a rod or a baton, which grants you the following benefits:\n\n- The damage of your Summoner Strike ability increases to twice your Reason score.\n- The potency of your Summoner Strike ability increases to R < AVERAGE.\n- The distance of your Summoner Strike ability is now equal to your Summoner\'s Range.\n\nYour kit also comes with wards like magic armor and transient minion forces. Choose one of the following wards.' },
    ],
    choices: [
      { id: 'ward-3', label: 'Summoner’s Kit Ward', help: 'Choose one ward from your Summoner’s Kit.', kind: 'feature', options: wardOptions(3) },
      { id: 'essence-7', label: '7-Essence Ability', help: 'Choose one heroic ability that costs 7 essence.', kind: 'ability', options: ESS_7 },
    ],
  },
  4: {
    summary: 'Your reason sharpens, your army swells, and dead minions feed your power.',
    staminaGain: 6,
    autoCharacteristicIncrease: { Reason: 3, max: true },
    autoFeatures: () => [
      { name: 'Characteristic Increase', text: 'Your Reason score becomes 3. Additionally, you can increase one of your characteristic scores by 1, to a maximum score of 3.' },
      { name: 'Minion Improvement', text: 'Your maximum number of minions increases by 4. You can increase each of your minions’ Stamina as shown on the 4th-Level Minion Stamina Increase table. Additionally, each minion that receives a Stamina boost can treat their characteristics as one higher for the purposes of resisting potencies (to a maximum value of 3). These benefits are not reflected in the stat blocks of new minions you acquire.',
        table: { head: ['Minion', 'Stamina Increase'], rows: [
          ['Signature Minion', 'Stamina +1'],
          ['3-Essence Minion', 'Stamina +3'],
          ['5-Essence Minion', 'Stamina +2'],
        ] } },
      { name: 'Essence Salvage', text: 'The first time each combat round that any minion unwillingly dies within your Summoner’s Range, you gain 2 essence instead of 1.' },
      { name: 'Minion Chain', text: 'Whenever you use Minion Bridge as a maneuver, each of your minions within your Summoner’s Range can shift up to their speed before the maneuver takes effect, as long as each minion that shifts ends their movement adjacent to another one of your minions. Additionally, your minions can chain themselves together to function as a ladder or a swinging rope. When your minions move as a part of using Minion Bridge, each minion can use this movement to shift into a position directly beneath another one of your minions, hoisting them and each other minion they have hoisted, until they form a chain. The chain can then choose to fall across an unoccupied space and/or the topmost minion grabs an object to keep the chain steady. The chain lasts until the start of your next turn or until the chain is no longer steady. The chain can also end when a minion in the chain is destroyed or when you command your minions to let go as a free maneuver. All size 1 minions count as one square when determining the chain’s length.' },
    ],
    choices: [
      { id: 'char-bonus-4', label: 'Characteristic Increase', help: 'Increase one of your characteristic scores by 1 (max 3).', kind: 'char-bonus',
        options: () => ['Might', 'Agility', 'Reason', 'Intuition', 'Presence'].map(c => ({ id: c, name: c, body: `+1 to ${c} (capped at 3)` })) },
      { id: 'perk-4', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'skill-4', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
  5: {
    summary: 'Your circle teaches deeper rites, and your portfolio gains elite minions.',
    staminaGain: 6,
    autoFeatures: ({ sub }) => CIRCLE_FEAT_5[sub] || Object.values(CIRCLE_FEAT_5).flat(),
    choices: [
      { id: 'portfolio-minion-5', label: 'New Portfolio Minion', help: 'Your circle allows you to select a new 7-essence minion to add to your portfolio.', kind: 'feature', options: minionOptions('t7') },
    ],
  },
  6: {
    summary: 'Your followers swell, your kit doubles its wards, and the source manifold opens to you.',
    staminaGain: 6,
    autoFeatures: (ctx) => [
      { name: 'Minion Machinations', text: 'Your maximum number of followers increases by 2. You can summon and recruit an artisan follower and a sage follower that share a keyword with a minion you can summon. These followers can be creatures from your portfolio or preexisting denizens of your circle’s source manifold. See Follower Types under Attract Followers in Draw Steel: Heroes for information on constructing your followers’ stats.' },
      { name: 'Kit Improvement', text: 'You can choose one additional ward from your Summoner’s Kit. Additionally, whenever you reduce an enemy to 0 Stamina with your Summoner Strike ability, you can use Call Forth as a free maneuver. Minions summoned this way are unable to act during this turn.' },
      returnToSource(ctx),
    ],
    choices: [
      { id: 'perk-6', label: 'Perk', help: 'Choose one interpersonal, lore, or supernatural perk.', kind: 'perk', options: PERK_NLS },
      { id: 'ward-6', label: 'Additional Ward', help: 'Choose one additional ward from your Summoner’s Kit.', kind: 'feature', options: wardOptions(6) },
      { id: 'essence-9', label: '9-Essence Ability', help: 'Summon the assistance of your future champion. Choose one heroic ability that costs 9 essence.', kind: 'ability', options: ESS_9 },
    ],
  },
  7: {
    summary: 'Essence floods you, and even death bends before your army.',
    staminaGain: 6,
    autoCharIncreaseAll: { delta: 1, max: 4 },
    autoFeatures: () => [
      { name: 'Characteristic Increase', text: 'All of your characteristics increase by 1, to a maximum score of 4.' },
      { name: 'Minion Improvement', text: 'At the start of each of your turns during combat, you can summon one additional signature minion at no cost into an unoccupied space within your Summoner’s Range (no action required). You can also increase each of your minions’ Stamina as shown on the 7th-Level Minion Stamina Increase table. Additionally, each minion that receives a Stamina boost can treat their characteristics as one higher for the purposes of resisting potencies (to a maximum value of 4). These benefits are not reflected in the stat blocks of new minions you acquire.',
        table: { head: ['Minion', 'Stamina Increase'], rows: [
          ['Signature Minion', 'Stamina +1 (to a total of +2)'],
          ['3-Essence Minion', 'Stamina +3 (to a total of +6)'],
          ['5-Essence Minion', 'Stamina +2 (to a total of +4)'],
          ['7-Essence Minion', 'Stamina +5'],
        ] } },
      { name: 'Font of Creation', text: 'When you gain essence at the start of each of your turns during combat, you gain 3 essence instead of 2.' },
      { name: 'Their Life for Mine', text: 'If you or an ally within your Summoner’s Range would die from an effect that isn’t age related, you sacrifice all your active minions (minimum 1) and spend all your essence (minimum 1) as a free triggered action to bring the target back to life, reconstructing the damaged parts of their body with summoned material related to your portfolio. The target comes back with 0 Stamina plus 1 Stamina for each minion and essence used in the effect. You must have at least one fragment of the creature’s remains, and the creature’s soul must be willing to return to life for the effect to work. You can’t use this feature again until you gain a new level, or until you spend 3 eidos to use it (see Eidos).' },
    ],
    choices: [
      { id: 'skill-7', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
  8: {
    summary: 'Your circle reveals its high mystery, and a champion joins your portfolio.',
    staminaGain: 6,
    autoFeatures: (ctx) => [
      ...(CIRCLE_FEAT_8[ctx.sub] || Object.values(CIRCLE_FEAT_8).flat()),
      championFeature(ctx),
    ],
    choices: [
      { id: 'perk-8', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
    ],
  },
  9: {
    summary: 'Your kit takes its ultimate form, and two worlds claim you as steward.',
    staminaGain: 6,
    autoFeatures: () => [
      { name: 'Kit Improvement', text: 'You\'ve conjured your kit into its ultimate form. You have the following benefits:\n\n- The potency of your Summoner Strike ability increases to R < STRONG.\n- You can choose one additional ward from your Summoner\'s Kit.\n- You have a double edge on tests made to dissuade or scare enemy minions or lackeys.\n- Your clothing and equipment become adorned with distinct and elaborate regalia to make you stand out from your army, like massive rib cage pauldrons, a tooth crested helmet, or a billowing mantle of fire.' },
      { name: 'Steward of Two Worlds', text: 'You and your allies are now welcome in your circle’s source manifold. Negotiations with native denizens of your circle’s source manifold have their patience increased by 2.' },
    ],
    choices: [
      { id: 'ward-9', label: 'Additional Ward', help: 'Choose one additional ward from your Summoner’s Kit.', kind: 'feature', options: wardOptions(9) },
      { id: 'essence-11', label: '11-Essence Ability', help: 'Choose one heroic ability that costs 11 essence.', kind: 'ability', options: ESS_11 },
    ],
  },
  10: {
    summary: 'Eidos crowns your craft — whole armies answer, and no cost is too great.',
    staminaGain: 6,
    autoCharacteristicIncrease: { Reason: 5, max: true },
    autoFeatures: () => [
      { name: 'Characteristic Increase', text: 'Your Reason score becomes 5. Additionally, you can increase one of your characteristic scores by 1, to a maximum score of 5.' },
      { name: 'Minion Improvement', text: 'You now start encounters and round-tracked situations by summoning up to two additional minions for every two Victories you have (in addition to the two you normally summon). Each of your minions’ Stamina improves as shown on the 10th-Level Minion Stamina Increase table. Additionally, each minion that receives a Stamina boost can treat their characteristics as one higher for the purposes of resisting potencies (to a maximum value of 5).',
        table: { head: ['Minion', 'Stamina Increase'], rows: [
          ['Signature Minion', 'Stamina +1 (to a total of +3)'],
          ['3-Essence Minion', 'Stamina +3 (to a total of +9)'],
          ['5-Essence Minion', 'Stamina +2 (to a total of +6)'],
          ['7-Essence Minion', 'Stamina +5 (to a total of +10)'],
        ] } },
      { name: 'Eidos', text: 'You gain an epic resource called eidos. When you take a respite, you gain eidos equal to the XP you gain. You can spend eidos as if it were essence on minions and abilities you have. When you do, you summon up to two bonus signature minions into unoccupied spaces within your Summoner’s Range. You and your champion also have access to abilities that can be used by spending eidos (see Their Life for Mine and Portfolio Champion). Eidos remains until you spend it.' },
      { name: 'No Matter the Cost', text: 'Whenever you sacrifice minions, you now reduce the cost of a heroic ability or minion by the same amount (to a minimum of 1) instead of only reducing the cost by 1.' },
      { name: 'Among Our Ranks', text: 'As a respite activity, you summon a willing and not-restrained NPC or player ally to join your party, regardless of distance or manifold. The target stays until the start of your next respite or until they are killed, in which they are immediately dismissed to the place from which they were summoned. You can\'t have more than one character summoned in this way.' },
    ],
    choices: [
      { id: 'char-bonus-10', label: 'Characteristic Increase', help: 'Increase one of your characteristic scores by 1 (max 5).', kind: 'char-bonus', max: 5,
        options: () => ['Might', 'Agility', 'Reason', 'Intuition', 'Presence'].map(c => ({ id: c, name: c, body: `+1 to ${c} (capped at 5)` })) },
      { id: 'perk-10', label: 'Perk', help: 'Choose one intrigue, interpersonal, or supernatural perk.', kind: 'perk', options: PERK_IIS },
      { id: 'skill-10', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
};
