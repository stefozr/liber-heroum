// levelup-troubadour.jsx — Troubadour level-up data (levels 2–10).
// Extends window.LEVELUP_DATA after levelup.jsx has loaded.
// Class Acts: Auteur / Duelist / Virtuoso · Resource: Drama · staminaPer 6.

// 4th-level Zeitgeist: pick one of three respite benefits.
const ZEITGEIST = [
  { id: 'foreshadowing', name: 'Foreshadowing',
    body: 'You can ask the Director for two clues regarding an upcoming encounter or negotiation. One of the clues can be false.' },
  { id: 'hear-ye', name: 'Hear Ye, Hear Ye!',
    body: 'By bragging, intimidating, leading, or lying, you attempt to spread one piece of information into the local area. Make a Presence test. On a tier 1 result your information reaches no one. On a tier 2 it reaches the nearest populated area of town size or larger, and you and each ally present gain an edge on Presence tests there until one of you spends a Recovery. On a tier 3 it also reaches the next closest such population, and the edge lasts until you start your next respite.' },
  { id: 'latest-goss', name: 'Latest Goss',
    body: 'You can ask the Director for three rumors regarding the area you’re in or an area you plan on entering before your next respite. One of the rumors can be false.' },
];

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
    { name: 'Guest Star', cost: 5, resource: 'Drama', flavor: 'We offered them a percentage of the gross. So they\u2019re working for free!', keywords: ['Magic','Ranged'], type: 'Main action', distance: 'Ranged 10', target: 'Special', effect: 'A guest star appears to help you during the encounter: either a bystander within distance uplifted by your magic, or a mysterious new hero who appears in an unoccupied space within distance.\n\nThis guest star is controlled by you, has their own turn, and shares your characteristics. Their Stamina maximum is half yours. They have no abilities other than your melee and ranged free strikes.\n\nAt the end of the encounter, or when the guest star is reduced to 0 Stamina, they retreat or revert to a bystander. The same bystander can’t be uplifted this way more than once during an encounter.' },
    { name: 'Twist at the End', cost: 5, resource: 'Drama', flavor: 'You didn\u2019t see that coming, did you?!', keywords: ['Magic','Ranged'], type: 'Main action', distance: 'Ranged 10', target: 'One enemy', effect: 'A target who is not a leader or solo creature comes back to life with half their Stamina and becomes an ally under the Director’s control. The players can work with the Director to determine when the target takes their turn each combat round.\n\nAt the end of the encounter, the target turns to dust and is blown away.' },
  ],
  duelist: [
    { name: 'Classic Chandelier Stunt', cost: 5, resource: 'Drama', flavor: 'Audiences love this bit.', keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'Self or one ally', effect: 'Each target can shift up to 5 squares, including vertically, but must end this movement adjacent to the other target and on solid ground.\n\nEach target can then make a melee free strike that deals extra damage equal to twice their highest characteristic score.' },
    { name: 'En Garde!', cost: 5, resource: 'Drama', flavor: 'Wait, it’s … Guard! Turn! Parry! Dodge! Spin! Thrust! Ha!', keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature', powerRoll: 'Agility', tiers: t('7 + A damage','11 + A damage','16 + A damage'), effect: 'The target can make a melee free strike against you. If they do, you can make a melee free strike against the target.' },
  ],
  virtuoso: [
    { name: 'Encore', cost: 5, resource: 'Drama', flavor: 'Again! Again!', keywords: ['Magic','Strike'], type: 'Main action', distance: 'Special', target: 'Special', effect: 'You use an ability that you have observed being used this combat round. The ability must have the Strike keyword, cost 5 or fewer of a Heroic Resource, and cost no Malice.\n\nWhen you make the strike, you use your Presence score for any power rolls, and any damage you deal is sonic damage.' },
    { name: 'Tough Crowd', cost: 5, resource: 'Drama', flavor: 'Your fans don’t seem to like the opening act …', keywords: ['Area','Magic','Ranged'], type: 'Main action', distance: '3 cube within 10', target: 'Special', powerRoll: 'Presence', tiers: t('5 corruption damage; M < WEAK, pull 1 toward the center of the area','9 corruption damage; P < AVERAGE, pull 2 toward the center of the area','12 corruption damage; P < STRONG, pull 3 toward the center of the area'), effect: 'The area is haunted by a swirling horde of phantoms until the end of the encounter. Allies can enter any square of the area without spending movement.\n\nAt the end of each of your turns, you can make one power roll that targets each enemy in the area.' },
  ],
};
const ACT_FEATURE_3 = {
  auteur: [{ name: 'Missed Cue', text: 'If not surprised at the start of an encounter, you can pull one non-leader, non-solo enemy out of the fight; they enter at the start of the 2nd round. Recharge after 3 Victories.' }],
  duelist: [{ name: 'Foil', text: 'At the start of an encounter choose a creature in line of effect. You and it each have a double edge on power rolls made against or competing with the other. If it drops to 0, pick a new foil next round.' }],
  virtuoso: [
    { name: 'Second Album', text: 'You add two new performances to your repertoire, which you can use with your Routines feature.' },
    { name: '“Fire Up the Night”', text: '5 aura, self and each ally in the area. While this performance is active, each target who starts their turn in the area doesn’t take a bane on strikes against creatures with concealment. Once during their turn, they can search for hidden creatures as a free maneuver.' },
    { name: '“Never-Ending Hero”', text: '5 aura, self and each ally in the area. While this performance is active, each target who starts their turn dying while in the area gains an edge on power rolls and ignores the effects of bleeding until the end of their turn.' },
  ],
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
    { name: 'Here\u2019s How Your Story Ends', cost: 9, resource: 'Drama', flavor: 'You give away the ending of this battle, and it’s not great for them.', keywords: ['Area','Magic'], type: 'Main action', distance: '5 burst', target: 'Each enemy in the area', powerRoll: 'Presence', tiers: t('2 psychic damage; P < WEAK, frightened (save ends)','5 psychic damage; P < AVERAGE, frightened (save ends)','7 psychic damage; P < STRONG, frightened (save ends)') },
    { name: 'You\u2019re All My Understudies', cost: 9, resource: 'Drama', flavor: 'It’s important for everyone to know each other’s lines, just in case …', keywords: ['Area','Magic'], type: 'Maneuver', distance: '5 burst', target: 'Each ally in the area', effect: 'Until the end of the encounter, each target gains the speed bonus, weapon distance bonus, disengage bonus, and stability bonus of your currently equipped kit in addition to their own kit’s bonuses.' },
  ],
  duelist: [
    { name: 'Blood on the Stage', cost: 9, resource: 'Drama', flavor: 'It’s love and blood or drama and blood. Either way, there’s always blood.', keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature or object', powerRoll: 'Agility', tiers: t('12 + A; M<WEAK, bleeding (save)','18 + A; M<AVERAGE, bleeding (save)','24 + A; bleeding (EoT) or M<STRONG bleeding (save)') },
    { name: 'Fight Choreography', cost: 9, resource: 'Drama', flavor: 'You and your partner make a flashy show of derring-do, then get back to your corners.', keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature', effect: 'You and the target each make a melee free strike that targets each enemy within 3 squares of either of you, dividing the enemies between each of you. You choose which enemies your free strike targets and which enemies the target creature’s free strike targets.\n\nYou then slide the target 5 squares, ignoring stability.' },
  ],
  virtuoso: [
    { name: 'Feedback', cost: 9, resource: 'Drama', flavor: 'Your music pounds the crowd to the beat until their hearts can’t stand it anymore.', keywords: ['Area','Magic'], type: 'Main action', distance: '3 cube within 1', target: 'Self', powerRoll: 'Presence', tiers: t('7 sonic damage; P < WEAK, prone','10 sonic damage; P < AVERAGE, prone','13 sonic damage; P < STRONG, prone'), effect: 'A prone target ignores this ability.' },
    { name: 'Legendary Drum Fill', cost: 9, resource: 'Drama', flavor: 'You start a drumroll that roars like thunder with every impact the heroes make.', keywords: ['Area','Magic'], type: 'Maneuver', distance: '4 burst', target: 'Self and each ally in the area', effect: 'Each target gains 1 surge, then gains 1 surge at the start of each combat round until the end of the encounter.' },
  ],
};
const ACT_FEATURE_8 = {
  auteur: [{ name: 'Deleted Scene', text: 'When a creature within your Dramatic Monologue distance makes a power roll, spend 1 drama as a free triggered action to use Dramatic Monologue against just that creature.' }],
  duelist: [{ name: 'Masterwork', text: 'Name one signature ability after yourself; you always have it (even from a swapped kit). When you use it you gain an edge and 1 surge usable only on it. If it\u2019s your last ability of an encounter, trigger Hear Ye, Hear Ye! afterward.' }],
  virtuoso: [
    { name: 'Crowd Favorites', text: 'You add two more performances to your repertoire, which you can use with your Routines feature.' },
    { name: 'Moonlight Sonata', text: '5 aura, each ally in the area. While this performance is active, each target who is dead can choose to continue taking turns after death. On each of their turns, a target can move and use either a main action or a maneuver, but can’t spend Recoveries or use triggered actions.' },
    { name: 'Radical Fantasia', text: '5 aura, self and each ally in the area. While this performance is active, each target who starts their turn in the area ignores difficult terrain, and any ability they use that imposes forced movement gains a +2 bonus to the forced movement distance until the end of their turn. Additionally, once per combat round, each target can use a triggered action.' },
  ],
};
const ACT_ABILITY_9 = {
  auteur: [
    { name: 'Epic', cost: 11, resource: 'Drama', flavor: 'Your story tells a tale of the villain’s waning power and how the heroes rose to the occasion to stop them.', keywords: ['Magic','Melee','Ranged'], type: 'Maneuver', distance: 'Melee 1 or ranged 10', target: 'One creature', powerRoll: 'Presence', tiers: t('The target takes a bane on ability rolls (save ends).','The target has a double bane on ability rolls (save ends).','The target has a double bane on power rolls (save ends).'), effect: 'Choose one ally within distance. While the target is affected by this ability, each time they use an ability, that ally can make a free strike against them after the ability is resolved.' },
    { name: 'Rising Tension', cost: 11, resource: 'Drama', flavor: 'You narrate the tension of the scene and put all hope into your protagonist to turn things around.', keywords: ['Magic','Ranged'], type: 'Maneuver', distance: 'Ranged 10', target: 'One ally', effect: 'The target gains 3 of their Heroic Resource, has a double edge on a power roll of their choice made during their next turn, is no longer slowed or weakened if they were before, and can immediately take their turn after yours if they have not taken their turn already this round.' },
  ],
  duelist: [
    { name: 'Expert Fencer', cost: 11, resource: 'Drama', flavor: 'If you can land the strike, the crowd goes wild.', keywords: ['Charge','Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 3', target: 'One creature or object', powerRoll: 'Agility', tiers: t('15 + A','21 + A','28 + A damage; M < STRONG, bleeding (save ends)'), effect: 'This ability can’t obtain better than a tier 2 outcome unless the target is at maximum distance. If you obtain a tier 3 outcome with a natural 17 or higher, you gain 3 surges that you can use immediately.' },
    { name: 'Renegotiated Contract', cost: 11, resource: 'Drama', flavor: 'No, no. You don’t die until the sequel.', keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature', powerRoll: 'Presence', tiers: t('You and the target can each end one effect on yourselves that is ended by a saving throw or that ends at the end of your turns.','You and the target can end any effects on yourselves that are ended by a saving throw or that end at the end of your turns.','You can choose any of the current effects on you and the target that are ended by a saving throw or that end at the end of your turns, apply the chosen effects to the target, and end the rest.'), effect: 'Add your current Stamina to your target’s current Stamina, then you have half that total Stamina and the target has the remainder. If either of you would gain more Stamina this way than their Stamina maximum, the difference in Stamina between what that creature would gain and their maximum is gained by the other creature. Neither of you can gain more Stamina than your maximum this way. You then make a power roll.' },
  ],
  virtuoso: [
    { name: 'Jam Session', cost: 11, resource: 'Drama', flavor: 'Your jam session creates new genres that compel everyone to get up and move.', keywords: ['Area','Magic'], type: 'Main action', distance: '5 burst', target: 'Each enemy in the area', powerRoll: 'Presence', tiers: t('8 sonic damage','11 sonic damage','15 sonic damage'), effect: 'Each creature within distance gains a +5 bonus to speed until the end of their next turn. While under this effect, each target must use their full movement during their turn.' },
    { name: 'Melt Their Faces', cost: 11, resource: 'Drama', flavor: 'The power of music rips through the reality around the target and blows them away.', keywords: ['Magic','Melee','Ranged','Strike'], type: 'Main action', distance: 'Melee 1 or ranged 10', target: 'One creature or object', powerRoll: 'Presence', tiers: t('12 + P damage; push 5','16 + P sonic; push 10','22 + P sonic; push 15'), effect: 'Forced movement from this ability ignores stability.' },
  ],
};

// ── Shared heroic-ability pools (not class-act gated) — official Heroes data ──
const DRAMA_7 = [
  { name: 'Extensive Rewrites', cost: 7, resource: 'Drama', flavor: 'No, this isn’t right. That foe was over there!', keywords: ['Area','Magic'], type: 'Maneuver', distance: '4 burst', target: 'Each enemy in the area', powerRoll: 'Presence', tiers: t('slide 3; P < WEAK, this slide ignores the target’s stability.','slide 5; P < AVERAGE, this slide ignores the target’s stability.','slide 7; P < STRONG, this slide ignores the target’s stability.'), effect: 'Instead of sliding a target, you can swap their location with another target as long as each can fit into the other’s space. You can’t slide targets into other creatures or objects using this ability.' },
  { name: 'Infernal Gavotte', cost: 7, resource: 'Drama', flavor: 'A spicy performance lights a fire under your allies’ feet.', keywords: ['Area','Magic','Melee','Weapon'], type: 'Main action', distance: '3 burst', target: 'Each enemy in the area', powerRoll: 'Agility', tiers: t('5 + A fire damage; A < WEAK, weakened (save ends)','7 + A fire damage; A < AVERAGE, weakened (save ends)','10 + A fire damage; A < STRONG, weakened (save ends)'), effect: 'Each ally in the area can shift up to 2 squares.' },
  { name: 'Star Solo', cost: 7, resource: 'Drama', flavor: 'Your performance travels and doesn’t stop moving until your audience is completely rocked.', keywords: ['Magic','Melee','Ranged','Strike','Weapon'], type: 'Main action', distance: 'Melee 1 or ranged 10', target: 'One creature or object', powerRoll: 'Presence', tiers: t('5 + P damage','8 + P damage; push 3','11 + P damage; push 5'), effect: 'You can choose to have this ability deal sonic damage. Additionally, you can use this ability against the same target for the next 2 combat rounds without spending drama.' },
  { name: 'We Meet at Last', cost: 7, resource: 'Drama', flavor: 'You magically intertwine your fate with another creature—for better or worse.', keywords: ['Magic','Ranged'], type: 'Maneuver', distance: 'Ranged 10', target: 'One creature', effect: 'Until the end of the encounter, both you and the target can target each other with abilities even if you are beyond distance, with the distance of this ability replacing those abilities’ distances. The target can’t be force moved by an ability used beyond distance this way.\n\nAdditionally, once on each of your turns, you can use a free maneuver to communicate a motivating or dispiriting message to the target, either granting them 2 surges or forcing them to take a bane on the next ability roll they make before the start of your next turn.' },
];
const DRAMA_9 = [
  { name: 'Action Hero', cost: 9, resource: 'Drama', flavor: 'You wield your weapon at blistering speed, leaving everyone around you fighting for their lives.', keywords: ['Area','Melee','Weapon'], type: 'Main action', distance: '3 burst', target: 'Each enemy in the area', powerRoll: 'Agility', tiers: t('10 damage','14 damage','20 damage'), effect: 'Unless you score a critical hit, this ability can’t reduce a non-minion target below 1 Stamina.' },
  { name: 'Continuity Error', cost: 9, resource: 'Drama', flavor: 'Your subject is written into two places at once.', keywords: ['Magic','Ranged'], type: 'Main action', distance: 'Ranged 10', target: 'One enemy or object', effect: 'The target is split into two separate entities, one of which remains in the target’s space while the other appears in an unoccupied space of your choice within distance. If the target is a creature, this creates a new creature under the Director’s control. Each entity has half the original target’s Stamina, is weakened, and takes 1d6 corruption damage at the start of each of their turns. If either entity is reduced to 0 Stamina, the other entity persists as the original entity and this effect ends. The effect also ends if both entities occupy the same space, causing them to automatically merge and combine their current Stamina.' },
  { name: 'Love Song', cost: 9, resource: 'Drama', flavor: 'You play a small ditty that plants you inside your target’s heart.', keywords: ['Magic','Ranged'], type: 'Maneuver', distance: 'Ranged 10', target: 'One creature or object', effect: 'The target gains 20 Stamina. Until the end of the encounter, whenever the target takes damage while you’re within distance, you can choose to take the damage instead of the target.' },
  { name: 'Patter Song', cost: 9, resource: 'Drama', flavor: 'Dazzle them with your fancy patter and they forget where they were.', keywords: ['Magic','Ranged'], type: 'Maneuver', distance: 'Ranged 10', target: 'Special', powerRoll: 'Presence', tiers: t('One ally within distance can take their turn immediately after yours.','Two allies within distance can take their turns immediately after yours in any order.','Three allies within distance can take their turns immediately after yours in any order. One of those allies can have already taken a turn this combat round.') },
];
const DRAMA_11 = [
  { name: 'Dramatic Reveal', cost: 11, resource: 'Drama', flavor: 'A little stage trickery, and where once stood a foe, now stands a friend!', keywords: ['Magic'], type: 'Maneuver', distance: 'Self', target: 'Self', effect: 'Until the end of the encounter, whenever you reduce a creature to 0 Stamina using an ability, you can use a free triggered action to teleport an ally within distance of that ability into the creature’s space in a plume of rose petals. You or the teleported ally can then make a melee free strike.' },
  { name: 'Power Ballad', cost: 11, resource: 'Drama', flavor: 'A song for the brokenhearted wraps itself around the target and blossoms into a ward of thorns.', keywords: ['Magic','Ranged'], type: 'Maneuver', distance: 'Ranged 10', target: 'Self or one ally', effect: 'Until the end of the encounter, whenever the target takes damage while winded, they can use a free triggered action to deal half the damage they took to the source of the damage.' },
  { name: 'Saved in the Edit', cost: 11, resource: 'Drama', flavor: 'You shout a word of power that allows you to rewrite reality to your whims.', keywords: ['Magic'], type: 'Maneuver', distance: 'Self', target: 'Self', effect: 'Until the end of the encounter, whenever you deal rolled damage to a creature or object, or enable a creature to spend a Recovery, you can use a free triggered action to give that creature or object one of the following effects until the start of your next turn. If this ability is triggered by multiple targets taking damage or multiple creatures spending Recoveries simultaneously, each target receives the same effect:\n\n- The target has damage weakness equal to your Presence score against any magic, psionic, or weapon ability.\n- The target has damage immunity equal to your Presence score.\n- The target has a bonus to stability and a penalty to speed equal to your Presence score.\n- The target has a bonus to speed and a penalty to stability equal to your Presence score.' },
  { name: 'The Show Must Go On', cost: 11, resource: 'Drama', flavor: 'You shine a bright light on the players on the stage and compel them to finish the performance.', keywords: ['Area','Magic','Ranged'], type: 'Maneuver', distance: '5 cube within 10', target: 'Each enemy in the area', powerRoll: 'Presence', tiers: t('6 damage; P < WEAK, the target can\'t willingly leave the area (EoT)','8 damage; P < AVERAGE, the target can\'t willingly leave the area (save ends)','12 damage; the target can\'t willingly leave the area (EoT); if P < STRONG, they can\'t willingly leave the area (save ends)'), effect: 'Each ally within distance can’t obtain lower than a tier 2 outcome on the next test they make before the start of your next turn.' },
];

export const troubadour = {
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
      { id: 'drama-7', label: '7-Drama Ability', help: 'Choose one heroic ability that costs 7 drama.', kind: 'ability', options: DRAMA_7 },
    ],
  },
  4: {
    summary: 'You wring still more drama from the scene, and your body answers the role.',
    staminaGain: 6,
    autoCharacteristicIncrease: { Agility: 3, Presence: 3, max: true },
    autoFeatures: () => [
      { name: 'Characteristic Increase', text: 'Your Agility and Presence scores each increase to 3.' },
      { name: 'Melodrama', text: 'Choose two new events that grant you drama in battle (e.g. a natural 2 on a power roll; a hero winded by Malice; a hero falling 5+ squares; a hero dealing damage with 3 surges; a hero spending their last Recovery). Or boost one event you already have by +1 drama.' },
      { name: 'Zeitgeist', text: 'You have your finger on the pulse of the world. Whenever you start or finish a respite, you gain the benefit of one Zeitgeist option of your choice.' },
    ],
    choices: [
      { id: 'zeitgeist-4', label: 'Zeitgeist', help: 'Choose the Zeitgeist option you take whenever you start or finish a respite.', kind: 'feature', options: ZEITGEIST },
      { id: 'perk-4', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'skill-4', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
  5: {
    summary: 'Your class act reveals a deeper craft.',
    staminaGain: 6,
    choices: [
      { id: 'act-feature-5', label: '5th-Level Class Act Feature', help: 'Your class act grants your choice of one of two features.', kind: 'feature', options: ({ sub }) => ACT_FEATURE_5[sub] || [] },
      { id: 'drama-9', label: '9-Drama Ability', help: 'Choose one heroic ability that costs 9 drama.', kind: 'ability', options: DRAMA_9 },
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
      { id: 'drama-11', label: '11-Drama Ability', help: 'Choose one heroic ability that costs 11 drama.', kind: 'ability', options: DRAMA_11 },
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
