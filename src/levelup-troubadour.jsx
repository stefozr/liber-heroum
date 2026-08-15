// levelup-troubadour.jsx — Troubadour level-up data (levels 2–10).
// Extends window.LEVELUP_DATA after levelup.jsx has loaded.
// Class Acts: Auteur / Duelist / Virtuoso · Resource: Drama · staminaPer 6.

// 4th-level Melodrama: pick two — new drama-gaining events, or boosts to base events.
const MELODRAMA_4 = [
  { id: 'nat-2',              name: 'Natural 2 on a Power Roll',
    body: 'Whenever a creature rolls a natural 2 on a power roll, you gain 2 drama.' },
  { id: 'villain-malice',     name: 'Damage from a Villain Action or Malice',
    body: 'The first time the Director deals damage to a hero using a villain action or an ability that costs Malice, you gain 2 drama.' },
  { id: 'big-fall',           name: 'An Unwilling Fall of 5+ Squares',
    body: 'The first time a hero unwillingly falls 5 or more squares, you gain 2 drama.' },
  { id: 'three-surges',       name: 'Damage Dealt with 3 Surges',
    body: 'The first time a hero deals damage with 3 surges, you gain 2 drama.' },
  { id: 'last-recovery',      name: 'A Hero’s Last Recovery',
    body: 'Whenever a hero spends their last Recovery, you gain 2 drama.' },
  { id: 'boost-three-heroes', name: 'Boost: 3+ Heroes Act on One Turn',
    body: 'The first time three or more heroes use an ability on the same turn now grants you 3 drama (instead of 2).' },
  { id: 'boost-winded',       name: 'Boost: First Hero Winded',
    body: 'The first time a hero is winded now grants you 3 drama (instead of 2).' },
  { id: 'boost-nat-19-20',    name: 'Boost: Natural 19–20',
    body: 'A creature in your line of effect rolling a natural 19–20 now grants you 4 drama (instead of 3).' },
  { id: 'boost-death',        name: 'Boost: A Hero Dies',
    body: 'A hero dying now grants you 11 drama (instead of 10).' },
];

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

// Performance abilities share one chassis (see the level-1 Routines feature): a 5 aura
// with the Performance keyword, switched at the start of a combat round (no action).
const perf = (name, flavor, effect, target = 'Self and each ally in the area') => ({
  name, flavor, badge: 'PERFORMANCE',
  keywords: ['Area', 'Magic', 'Performance'],
  distance: '5 aura', target, effect,
});

// ── Subclass-keyed choice tables ──
const INVOCATION_2 = [
  { name: 'Allow Me to Introduce Tonight\u2019s Players',
    ability: { name: 'Allow Me to Introduce Tonight\u2019s Players', noBadge: true,
      flavor: 'The stage is set; the players take their places.',
      type: 'Main action', distance: 'Self', target: 'Self and each ally',
      effect: 'Usable only when you take the first turn of a combat. You introduce the party: each ally shifts up to their speed, power rolls made against the introduced heroes have a double bane until the end of the round, and surprised enemies are no longer surprised.' } },
  { name: 'Formal Introductions', body: 'As a respite activity, scribe a notice of your arrival to an enemy. When they receive it they become alarmed; the Director gains +1 Malice per round in their encounters, but the heroes start each such encounter with 2 extra hero tokens.' },
  { name: 'My Reputation Precedes Me', body: 'At the start of a social interaction with strangers, auto-bond one NPC (counts against your Scene Partner limit). While bonded, all heroes treat Renown as 2 higher when entering negotiation with them.' },
];
const ACT_ABILITY_2 = {
  auteur: [
    { name: 'Guest Star', cost: 5, resource: 'Drama', flavor: 'We offered them a percentage of the gross. So they\u2019re working for free!', keywords: ['Magic','Ranged'], type: 'Main action', distance: 'Ranged 10', target: 'Special', effect: 'A guest star appears to help you during the encounter: either a bystander within distance uplifted by your magic, or a mysterious new hero who appears in an unoccupied space within distance.\n\nThis guest star is controlled by you, has their own turn, and shares your characteristics. Their Stamina maximum is half yours. They have no abilities other than your melee and ranged free strikes.\n\nAt the end of the encounter, or when the guest star is reduced to 0 Stamina, they retreat or revert to a bystander. The same bystander can’t be uplifted this way more than once during an encounter.' },
    { name: 'Twist at the End', cost: 5, resource: 'Drama', flavor: 'You didn\u2019t see that coming, did you?!', keywords: ['Magic','Ranged'], type: 'Main action', distance: 'Ranged 10', target: 'One dead enemy', effect: 'A target who is not a leader or solo creature comes back to life with half their Stamina and becomes an ally under the Director’s control. The players can work with the Director to determine when the target takes their turn each combat round.\n\nAt the end of the encounter, the target turns to dust and is blown away.' },
  ],
  duelist: [
    { name: 'Classic Chandelier Stunt', cost: 5, resource: 'Drama', flavor: 'Audiences love this bit.', keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'Self and one willing ally', effect: 'Each target can shift up to 5 squares, including vertically, but must end this movement adjacent to the other target and on solid ground.\n\nEach target can then make a melee free strike that deals extra damage equal to twice their highest characteristic score.' },
    { name: 'En Garde!', cost: 5, resource: 'Drama', flavor: 'Wait, it’s … Guard! Turn! Parry! Dodge! Spin! Thrust! Ha!', keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature', powerRoll: 'Agility', tiers: t('7 + A damage','11 + A damage','16 + A damage'), effect: 'The target can make a melee free strike against you. If they do, you can make a melee free strike against the target.' },
  ],
  virtuoso: [
    { name: 'Encore', cost: 5, resource: 'Drama', flavor: 'Again! Again!', keywords: ['Magic','Strike'], type: 'Main action', distance: 'Special', target: 'Special', effect: 'You use an ability that you have observed being used this combat round. The ability must have the Strike keyword, cost 5 or fewer of a Heroic Resource, and cost no Malice.\n\nWhen you make the strike, you use your Presence score for any power rolls, and any damage you deal is sonic damage.' },
    { name: 'Tough Crowd', cost: 5, resource: 'Drama', flavor: 'Your fans don’t seem to like the opening act …', keywords: ['Area','Magic','Ranged'], type: 'Main action', distance: '3 cube within 10', target: 'Special', powerRoll: 'Presence', tiers: t('5 corruption damage; M < WEAK, pull 1 toward the center of the area','9 corruption damage; M < AVERAGE, pull 2 toward the center of the area','12 corruption damage; M < STRONG, pull 3 toward the center of the area'), effect: 'The area is haunted by a swirling horde of phantoms until the end of the encounter. Allies can enter any square of the area without spending movement.\n\nAt the end of each of your turns, you can make one power roll that targets each enemy in the area.' },
  ],
};
const ACT_FEATURE_3 = {
  auteur: [{ name: 'Missed Cue', text: 'If you aren\'t surprised at the start of an encounter, you can choose one enemy within your line of effect who is not a leader or solo creature. The Director temporarily removes the chosen creature from the encounter. The chosen creature enters the encounter at the start of the second combat round. You must earn 3 Victories before you can use this feature again.' }],
  duelist: [{ name: 'Foil', text: 'At the start of an encounter, choose one creature within your line of effect. You have a double edge on power rolls made against or in competition with that creature. The chosen creature also has a double edge on power rolls made against or in competition with you. If the chosen creature is reduced to 0 Stamina, you can choose a new foil at the start of the next combat round.' }],
  virtuoso: [
    { name: 'Second Album', text: 'You have the following performance abilities, which are usable with your Routines feature.' },
  ],
};
const ACT_ABILITY_AUTO_3 = {
  virtuoso: [
    perf('“Fire Up the Night”', 'Maybe you and I ♪ We can still bring the light!♪',
      'While this performance is active, each target who starts their turn in the area doesn\'t take a bane on strikes against creatures with concealment. Once during their turn, they can search for hidden creatures as a free maneuver (see Hide and Sneak in Chapter 9: Tests).'),
    perf('“Never-Ending Hero”', 'And toniiight we can truly say ♪ They will alllways find a way!♪',
      'While this performance is active, each target who starts their turn dying while in the area gains an edge on power rolls and ignores the effects of bleeding until the end of their turn.'),
  ],
};
const ACT_FEATURE_5 = {
  auteur: [
    { name: 'Fix It in Post',
      ability: { name: 'Fix It in Post', noBadge: true,
        flavor: 'A snip here, a splice there \u2014 the scene plays out differently.',
        type: 'Free maneuver', distance: 'Dramatic Monologue distance', target: 'One creature',
        effect: 'Once per turn, you can change one condition (bleeding, frightened, prone, slowed, or taunted) affecting the target into another condition from that list, keeping its duration and origin.' } },
    { name: 'Take Two!',
      ability: perf('Take Two!', 'One more, with feeling this time.',
        'While this performance is active, each target who starts their turn in the area can reroll the first power roll they make that turn that obtains a tier 2 outcome. They must use the new roll.') },
  ],
  duelist: [
    { name: 'Verbal Duel',
      ability: { name: 'Verbal Duel', noBadge: true,
        flavor: 'Wit cuts deeper than steel.',
        type: 'Free maneuver', distance: 'Melee 1', target: 'Your Foil',
        effect: 'Usable once per turn while your Foil is adjacent to you. You and the Foil make an opposed Presence test; the winner makes a free strike that deals psychic damage instead of its usual damage type.' } },
    { name: 'We Can\u2019t Be Upstaged!',
      ability: perf('We Can\u2019t Be Upstaged!', 'The whole troupe moves as one.',
        'While this performance is active, each target who starts their turn in the area gains a bonus to the distance they can shift equal to your Presence score until the end of their turn.') },
  ],
  virtuoso: [
    { name: 'Bolstering Banter',
      ability: { name: 'Bolstering Banter', noBadge: true,
        flavor: 'A word of encouragement between the verses.',
        type: 'Free maneuver', distance: 'Special', target: 'One target of your current performance',
        effect: 'Once per turn, the target can spend a Recovery to gain temporary Stamina equal to their recovery value instead of regaining Stamina.' } },
    { name: 'Medley', body: 'You can maintain two performances at a time with your Routines feature.' },
  ],
};
const ACT_ABILITY_6 = {
  auteur: [
    { name: 'Here\u2019s How Your Story Ends', cost: 9, resource: 'Drama', flavor: 'You give away the ending of this battle, and it’s not great for them.', keywords: ['Area','Magic'], type: 'Main action', distance: '5 burst', target: 'Each enemy in the area', powerRoll: 'Presence', tiers: t('2 psychic damage; P < WEAK, frightened (save ends)','5 psychic damage; P < AVERAGE, frightened (save ends)','7 psychic damage; P < STRONG, frightened (save ends)') },
    { name: 'You\u2019re All My Understudies', cost: 9, resource: 'Drama', flavor: 'It’s important for everyone to know each other’s lines, just in case …', keywords: ['Area','Magic'], type: 'Maneuver', distance: '5 burst', target: 'Each ally in the area', effect: 'Until the end of the encounter, each target gains the speed bonus, weapon distance bonus, disengage bonus, and stability bonus of your currently equipped kit in addition to their own kit’s bonuses.' },
  ],
  duelist: [
    { name: 'Blood on the Stage', cost: 9, resource: 'Drama', flavor: 'It’s love and blood or drama and blood. Either way, there’s always blood.', keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature or object', powerRoll: 'Agility', tiers: t('12 + A damage; M < WEAK, bleeding (save ends)','18 + A damage; M < AVERAGE, bleeding (save ends)','24 + A damage; bleeding (EoT), or if M < STRONG, bleeding (save ends)') },
    { name: 'Fight Choreography', cost: 9, resource: 'Drama', flavor: 'You and your partner make a flashy show of derring-do, then get back to your corners.', keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature', effect: 'You and the target each make a melee free strike that targets each enemy within 3 squares of either of you, dividing the enemies between each of you. You choose which enemies your free strike targets and which enemies the target creature’s free strike targets.\n\nYou then slide the target 5 squares, ignoring stability.' },
  ],
  virtuoso: [
    { name: 'Feedback', cost: 9, resource: 'Drama', flavor: 'Your music pounds the crowd to the beat until their hearts can’t stand it anymore.', keywords: ['Area','Magic'], type: 'Main action', distance: 'Three 3 cubes within 1', target: 'Each enemy in the area', powerRoll: 'Presence', tiers: t('7 sonic damage; P < WEAK, prone','10 sonic damage; P < AVERAGE, prone','13 sonic damage; P < STRONG, prone'), effect: 'A prone target ignores this ability.' },
    { name: 'Legendary Drum Fill', cost: 9, resource: 'Drama', flavor: 'You start a drumroll that roars like thunder with every impact the heroes make.', keywords: ['Area','Magic'], type: 'Maneuver', distance: '4 burst', target: 'Self and each ally in the area', effect: 'Each target gains 1 surge, then gains 1 surge at the start of each combat round until the end of the encounter.' },
  ],
};
const ACT_FEATURE_8 = {
  auteur: [],
  duelist: [{ name: 'Masterwork', text: 'Choose one of your signature abilities and name it after yourself. You always have this ability available, even if it is sourced from a kit you switch out. Whenever you use this ability, you gain an edge and 1 surge that you can use only on this ability.\n\nAdditionally, when your named signature ability is the last ability you use in an encounter, you can immediately use the Hear Ye, Hear Ye! effect of your Zeitgeist feature to tell tales of your exploits after the encounter ends.' }],
  virtuoso: [
    { name: 'Crowd Favorites', text: 'You have the following performance abilities, which are usable with your Routines feature.' },
  ],
};
const ACT_ABILITY_AUTO_8 = {
  auteur: [
    { name: 'Deleted Scene', cost: 1, resource: 'Drama',
      flavor: 'That take never happened. Roll it again.',
      type: 'Free triggered action', distance: 'Dramatic Monologue distance', target: 'The triggering creature',
      trigger: 'A creature within your Dramatic Monologue distance makes a power roll.',
      effect: 'Whenever a creature within distance of your Dramatic Monologue ability makes a power roll, you can spend 1 drama as a free triggered action to use Dramatic Monologue, targeting only one creature.' },
  ],
  virtuoso: [
    perf('Moonlight Sonata', 'Music pours out of your heart, filling the area with the utmost delicacy and without damper.',
      'While this performance is active, each target who is dead can choose to continue taking turns after death. On each of their turns, a target can move and use either a main action or a maneuver, but can\'t spend Recoveries or use triggered actions. At the end of the encounter, each target who chose to take turns this way turns to dust and blows away.',
      'Each ally in the area'),
    perf('Radical Fantasia', '𝅘𝅥𝅮♪Viras, my Viras, will you hold their hands as they cryyy—aaaiigh?♪',
      'While this performance is active, each target who starts their turn in the area ignores difficult terrain, and any ability they use that imposes forced movement gains a +2 bonus to the forced movement distance until the end of their turn. Additionally, once per combat round, each target can use a triggered action as a free triggered action.'),
  ],
};
const ACT_ABILITY_9 = {
  auteur: [
    { name: 'Epic', cost: 11, resource: 'Drama', flavor: 'Your story tells a tale of the villain’s waning power and how the heroes rose to the occasion to stop them.', keywords: ['Magic','Melee','Ranged'], type: 'Maneuver', distance: 'Melee 1 or ranged 10', target: 'One creature', powerRoll: 'Presence', tiers: t('The target takes a bane on ability rolls (save ends).','The target has a double bane on ability rolls (save ends).','The target has a double bane on power rolls (save ends).'), effect: 'Choose one ally within distance. While the target is affected by this ability, each time they use an ability, that ally can make a free strike against them after the ability is resolved.' },
    { name: 'Rising Tension', cost: 11, resource: 'Drama', flavor: 'You narrate the tension of the scene and put all hope into your protagonist to turn things around.', keywords: ['Magic','Ranged'], type: 'Maneuver', distance: 'Ranged 10', target: 'One ally', effect: 'The target gains 3 of their Heroic Resource, has a double edge on a power roll of their choice made during their next turn, is no longer slowed or weakened if they were before, and can immediately take their turn after yours if they have not taken their turn already this round.' },
  ],
  duelist: [
    { name: 'Expert Fencer', cost: 11, resource: 'Drama', flavor: 'If you can land the strike, the crowd goes wild.', keywords: ['Charge','Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 3', target: 'One creature or object', powerRoll: 'Agility', tiers: t('15 + A damage','21 + A damage','28 + A damage; M < STRONG, bleeding (save ends)'), effect: 'This ability can’t obtain better than a tier 2 outcome unless the target is at maximum distance. If you obtain a tier 3 outcome with a natural 17 or higher, you gain 3 surges that you can use immediately.' },
    { name: 'Renegotiated Contract', cost: 11, resource: 'Drama', flavor: 'No, no. You don’t die until the sequel.', keywords: ['Melee','Strike','Weapon'], type: 'Main action', distance: 'Melee 1', target: 'One creature', powerRoll: 'Presence', tiers: t('You and the target can each end one effect on yourselves that is ended by a saving throw or that ends at the end of your turns.','You and the target can end any effects on yourselves that are ended by a saving throw or that end at the end of your turns.','You can choose any of the current effects on you and the target that are ended by a saving throw or that end at the end of your turns, apply the chosen effects to the target, and end the rest.'), effect: 'Add your current Stamina to your target’s current Stamina, then you have half that total Stamina and the target has the remainder. If either of you would gain more Stamina this way than their Stamina maximum, the difference in Stamina between what that creature would gain and their maximum is gained by the other creature. Neither of you can gain more Stamina than your maximum this way. You then make a power roll.' },
  ],
  virtuoso: [
    { name: 'Jam Session', cost: 11, resource: 'Drama', flavor: 'Your jam session creates new genres that compel everyone to get up and move.', keywords: ['Area','Magic'], type: 'Main action', distance: '5 burst', target: 'Each enemy in the area', powerRoll: 'Presence', tiers: t('8 sonic damage','11 sonic damage','15 sonic damage'), effect: 'Each creature within distance gains a +5 bonus to speed until the end of their next turn. While under this effect, each target must use their full movement during their turn.' },
    { name: 'Melt Their Faces', cost: 11, resource: 'Drama', flavor: 'The power of music rips through the reality around the target and blows them away.', keywords: ['Magic','Melee','Ranged','Strike'], type: 'Main action', distance: 'Melee 1 or ranged 10', target: 'One creature or object', powerRoll: 'Presence', tiers: t('12 + P sonic damage; push 5','16 + P sonic damage; push 10','22 + P sonic damage; push 15'), effect: 'Forced movement from this ability ignores stability.' },
  ],
};

// ── Shared heroic-ability pools (not class-act gated) — official Heroes data ──
const DRAMA_7 = [
  { name: 'Extensive Rewrites', cost: 7, resource: 'Drama', flavor: 'No, this isn’t right. That foe was over there!', keywords: ['Area','Magic'], type: 'Maneuver', distance: '4 burst', target: 'Each enemy in the area', powerRoll: 'Presence', tiers: t('slide 3; P < WEAK, this slide ignores the target’s stability.','slide 5; P < AVERAGE, this slide ignores the target’s stability.','slide 7; P < STRONG, this slide ignores the target’s stability.'), effect: 'Instead of sliding a target, you can swap their location with another target as long as each can fit into the other’s space. You can’t slide targets into other creatures or objects using this ability.' },
  { name: 'Infernal Gavotte', cost: 7, resource: 'Drama', flavor: 'A spicy performance lights a fire under your allies’ feet.', keywords: ['Area','Magic','Melee','Weapon'], type: 'Main action', distance: '3 burst', target: 'Each enemy in the area', powerRoll: 'Presence', tiers: t('5 fire damage; A < WEAK, weakened (save ends)','7 fire damage; A < AVERAGE, weakened (save ends)','10 fire damage; A < STRONG, weakened (save ends)'), effect: 'Each ally in the area can shift up to 2 squares.' },
  { name: 'Star Solo', cost: 7, resource: 'Drama', flavor: 'Your performance travels and doesn’t stop moving until your audience is completely rocked.', keywords: ['Magic','Melee','Ranged','Strike','Weapon'], type: 'Main action', distance: 'Melee 1 or ranged 10', target: 'One creature or object', powerRoll: 'Presence', tiers: t('5 + P damage','8 + P damage; push 3','11 + P damage; push 5'), effect: 'You can choose to have this ability deal sonic damage. Additionally, you can use this ability against the same target for the next 2 combat rounds without spending drama.' },
  { name: 'We Meet at Last', cost: 7, resource: 'Drama', flavor: 'You magically intertwine your fate with another creature—for better or worse.', keywords: ['Magic','Ranged'], type: 'Maneuver', distance: 'Ranged 10', target: 'One creature', effect: 'Until the end of the encounter, both you and the target can target each other with abilities even if you are beyond distance, with the distance of this ability replacing those abilities\' distances. The target can\'t be force moved by an ability used beyond distance this way.' },
];
const DRAMA_9 = [
  { name: 'Action Hero', cost: 9, resource: 'Drama', flavor: 'You wield your weapon at blistering speed, leaving everyone around you fighting for their lives.', keywords: ['Area','Melee','Weapon'], type: 'Main action', distance: '3 burst', target: 'Each enemy in the area', powerRoll: 'Agility', tiers: t('10 damage','14 damage','20 damage'), effect: 'Unless you score a critical hit, this ability can’t reduce a non-minion target below 1 Stamina.' },
  { name: 'Continuity Error', cost: 9, resource: 'Drama', flavor: 'Your subject is written into two places at once.', keywords: ['Magic','Ranged'], type: 'Maneuver', distance: 'Ranged 10', target: 'One enemy or object', effect: 'The target is split into two separate entities, one of which remains in the target’s space while the other appears in an unoccupied space of your choice within distance. If the target is a creature, this creates a new creature under the Director’s control. Each entity has half the original target’s Stamina, is weakened, and takes 1d6 corruption damage at the start of each of their turns. If either entity is reduced to 0 Stamina, the other entity persists as the original entity and this effect ends. The effect also ends if both entities occupy the same space, causing them to automatically merge and combine their current Stamina.' },
  { name: 'Love Song', cost: 9, resource: 'Drama', flavor: 'You play a small ditty that plants you inside your target’s heart.', keywords: ['Magic','Ranged'], type: 'Maneuver', distance: 'Ranged 10', target: 'One creature or object', effect: 'The target gains 20 temporary Stamina. Until the end of the encounter, whenever the target takes damage while you\'re within distance, you can choose to take the damage instead of the target.' },
  { name: 'Patter Song', cost: 9, resource: 'Drama', flavor: 'Dazzle them with your fancy patter and they forget where they were.', keywords: ['Magic','Ranged'], type: 'Maneuver', distance: 'Ranged 10', target: 'Special', powerRoll: 'Presence', tiers: t('One ally within distance can take their turn immediately after yours.','Two allies within distance can take their turns immediately after yours in any order.','Three allies within distance can take their turns immediately after yours in any order. One of those allies can have already taken a turn this combat round.') },
];
const DRAMA_11 = [
  { name: 'Dramatic Reveal', cost: 11, resource: 'Drama', flavor: 'A little stage trickery, and where once stood a foe, now stands a friend!', keywords: ['Magic'], type: 'Maneuver', distance: 'Self', target: 'Self', effect: 'Until the end of the encounter, whenever you reduce a creature to 0 Stamina using an ability, you can use a free triggered action to teleport an ally within distance of that ability into the creature’s space in a plume of rose petals. You or the teleported ally can then make a melee free strike.' },
  { name: 'Power Ballad', cost: 11, resource: 'Drama', flavor: 'A song for the brokenhearted wraps itself around the target and blossoms into a ward of thorns.', keywords: ['Magic','Ranged'], type: 'Maneuver', distance: 'Ranged 10', target: 'Self or one ally', effect: 'Until the end of the encounter, whenever the target takes damage while winded, they can use a free triggered action to deal half the damage they took to the source of the damage.' },
  { name: 'Saved in the Edit', cost: 11, resource: 'Drama', flavor: 'You shout a word of power that allows you to rewrite reality to your whims.', keywords: ['Magic'], type: 'Maneuver', distance: 'Self', target: 'Self', effect: 'Until the end of the encounter, whenever you deal rolled damage to a creature or object, or enable a creature to spend a Recovery, you can use a free triggered action to give that creature or object one of the following effects until the start of your next turn. If this ability is triggered by multiple targets taking damage or multiple creatures spending Recoveries simultaneously, each target receives the same effect:' },
  { name: 'The Show Must Go On', cost: 11, resource: 'Drama', flavor: 'You shine a bright light on the players on the stage and compel them to finish the performance.', keywords: ['Area','Magic','Ranged'], type: 'Maneuver', distance: '5 cube within 10', target: 'Each enemy in the area', powerRoll: 'Presence', tiers: t('6 damage; P < WEAK, the target can\'t willingly leave the area (EoT)','8 damage; P < AVERAGE, the target can\'t willingly leave the area (save ends)','12 damage; the target can\'t willingly leave the area (EoT); if P < STRONG, they can\'t willingly leave the area (save ends)'), effect: 'Each ally within distance can’t obtain lower than a tier 2 outcome on the next test they make before the start of your next turn.' },
];

export const troubadour = {
  2: {
    summary: 'You learn to coax the muses — and bend a battle\u2019s drama to your will.',
    staminaGain: 6,
    autoFeatures: () => [
      { name: 'Appeal to the Muses', text: 'You can give a rousing speech, invoke your inspirations, or lift your fellows\' spirits, appealing to the muses to heighten a battle\'s drama. However, irony is eager to hand your fortune to the villain to achieve the same end.\n\nBefore you roll to gain drama at the start of your turn, you can make your appeal (no action required). If you do, your roll gains the following additional effects:\n\n- If the roll is a 1, you gain 1 additional drama. The Director gains 1d3 Malice (see *Draw Steel: Monsters*).\n- If the roll is a 2, you gain 1 Heroic Resource, which you can keep or give to an ally within the distance of your active performance. The Director gains 1 Malice.\n- If the roll is a 3, you gain 2 of a Heroic Resource, which you can distribute among yourself and any allies within the distance of your active performance.' },
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
    autoAbilities: ({ sub }) => ACT_ABILITY_AUTO_3[sub] || [],
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
      { name: 'Zeitgeist', text: 'You always have your ear to the ground, your finger on the pulse. When you start or finish a respite, choose one of the following effects.' },
    ],
    choices: [
      { id: 'melodrama-4', label: 'Melodrama', help: 'Choose two new events that grant you drama in battle — or spend a pick boosting an event you already have by +1 drama.', kind: 'feature', count: 2, options: MELODRAMA_4 },
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
    autoAbilities: () => [
      perf('Spotlight', 'The audience is watching, so you\'d better give them a show.',
        'While this performance is active, each target who starts their turn in the area gains 1 of their Heroic Resource. This Heroic Resource disappears at the end of the target\'s turn if they don\'t spend it.'),
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
      { name: 'Characteristic Increase', text: 'Each of your characteristic scores increases by 1, to a maximum of 4.' },
      { name: 'Equal Billing', text: 'You can use your Scene Partner feature to form a bond with one willing hero instead of an NPC you interact with using a test. If you bond with another hero, you lose your existing bond with a hero.\n\nAdditionally, you and creatures you are bonded with gain a +1 bonus to saving throws. Whenever you or a bonded creature succeeds on a saving throw, you and each creature you are bonded with gains temporary Stamina equal to your level.' },
      { name: 'A Muse\u2019s Muse', text: 'At the start of each of your turns during combat, you gain 1d3 + 1 drama instead of 1d3.' },
    ],
    choices: [
      { id: 'skill-7', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
  8: {
    summary: 'Your class act entrusts you with its highest craft.',
    staminaGain: 6,
    autoFeatures: ({ sub }) => ACT_FEATURE_8[sub] || [],
    autoAbilities: ({ sub }) => ACT_ABILITY_AUTO_8[sub] || [],
    choices: [
      { id: 'perk-8', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'drama-11', label: '11-Drama Ability', help: 'Choose one heroic ability that costs 11 drama.', kind: 'ability', options: DRAMA_11 },
    ],
  },
  9: {
    summary: 'The roar of the crowd makes you unbreakable.',
    staminaGain: 6,
    autoFeatures: () => [
      { name: 'Roar of the Crowd', text: 'You are empowered by your audience, near and far. You can\'t be made frightened, and if you are prone, you can stand up as a free maneuver.\n\nAdditionally, whenever you spend a Recovery, you can forgo regaining Stamina to invoke the roar of an invisible applauding audience. You and each ally within 3 squares of you gains temporary Stamina equal to 10 + the number of active bonds from your Scene Partner feature + either your Victories or the number of players in your game (whichever is higher).' },
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
      { name: 'Applause', text: 'You have an epic resource called applause. Each time you finish a respite, you gain applause equal to the XP you gain. You can spend applause on your abilities as if it were drama.\n\nAdditionally, whenever you or a creature within 3 squares would obtain a failure or a tier 1 outcome on a test, you can spend 1 applause to improve the outcome by 1 tier.\n\nApplause remains until you spend it.' },
      { name: 'Dramaturgy', text: 'You gain 1 additional drama or other Heroic Resource whenever you use your Appeal to the Muses feature. Additionally, your performances no longer have a distance, but can affect any target on the encounter map within your line of effect.' },
      { name: 'Greatest of All Time', text: 'Whenever you obtain a success on a test, each NPC within your line of effect has their Impression score decreased by 4 during a negotiation (to a minimum of 1), and each ally within 3 squares of you gains an edge on their next test. These effects last until you start your next respite.' },
    ],
    choices: [
      { id: 'perk-10', label: 'Perk', help: 'Choose one interpersonal, lore, or supernatural perk.', kind: 'perk', options: PERK_ILS },
      { id: 'skill-10', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
};
