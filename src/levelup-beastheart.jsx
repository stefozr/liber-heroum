// levelup-beastheart.jsx — Beastheart level-up data (levels 2–10).
// Wild Natures: Guardian / Prowler / Punisher / Spark · Resource: Ferocity · staminaPer 12.

import { companionById } from './data/beastheart-companions.js';

const PERK_EII = [
  { id: 'exploration',  name: 'Exploration Perk',  body: 'A boon for the wilds and the road.' },
  { id: 'interpersonal',name: 'Interpersonal Perk',body: 'A boon for the table and the court.' },
  { id: 'intrigue',     name: 'Intrigue Perk',     body: 'A boon for the shadows and the con.' },
];
const PERK_ANY = ['crafting','exploration','interpersonal','intrigue','lore','supernatural'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Perk', body: '' }));
const SKILL_ANY = ['crafting','exploration','interpersonal','intrigue','lore'].map(id => ({ id, name: id[0].toUpperCase()+id.slice(1)+' Skill', body: '' }));
const SKILL_LORE = [{ id: 'lore', name: 'Lore Skill', body: 'Avatar of the Green grants one skill from the lore group.' }];
const t = (t1, t2, t3) => [['≤ 11', t1], ['12–16', t2], ['17+', t3]];
const fer = (n, name, flavor, effect, extra) => ({ name, cost: n, resource: 'Ferocity', flavor, type: 'Main action', keywords: ['Beastheart','Melee','Strike','Weapon'], distance: 'Melee 1', target: 'One creature', effect, ...extra });

// Companion advancement features (levels 3 and 10; Become the Beast covers level 6).
const companionAdv = (lvl) => (ctx) => {
  const comp = companionById(ctx?.companion);
  const adv = comp?.advancements?.[lvl];
  return adv
    ? { name: `${comp.name} — ${adv.name}`, text: adv.text }
    : { name: `Level ${lvl} Companion Advancement`, text: `Your companion gains the level ${lvl} advancement feature granted by their stat block.` };
};
const becomeTheBeast = (ctx) => {
  const comp = companionById(ctx?.companion);
  const adv = comp?.advancements?.[6];
  const base = 'Your companion’s rampage burns in your brain, and you become part beast yourself. You gain the level 6 advancement feature granted by your companion’s stat block.';
  return { name: 'Become the Beast', text: adv ? `${base}\n\n**${adv.name}:** ${adv.text}` : base };
};

const FER_7 = () => [
  fer(7, 'Death and Violence', 'You leap from your foe’s corpse.', 'The target dies. You teleport to the target’s space, shift up to a number of squares equal to your Might score, and can then make a melee free strike. You then make the following power roll, targeting each enemy within 5 squares of the target.', { keywords:['Beastheart','Magic','Ranged'], type:'Triggered', trigger:'Your companion uses an ability that reduces the target to 0 Stamina.', distance:'Ranged 10', target:'One creature', powerRoll:'Might', tiers:t('P < WEAK, frightened (save ends)','4 psychic damage; P < AVERAGE, frightened (save ends)','8 psychic damage; P < STRONG, frightened (save ends)') }),
  fer(7, 'Head to Head', 'Your bloody-forehead smash drives your companion into a frenzy.', 'You are bleeding (save ends). Until the end of your next turn, your companion gains an edge on power rolls.', { keywords:['Beastheart','Melee','Strike'], powerRoll:'Might', tiers:t('13 + M damage; P < WEAK, dazed (save ends)','19 + M damage; P < AVERAGE, dazed (save ends)','25 + M damage; P < STRONG, dazed (save ends)') }),
  fer(7, 'Jaws of Death', 'Spectral teeth clamp on a foe, chaining them to you and draining their life essence.', 'Whenever a target more than 3 squares away from you fails the saving throw while weakened this way, you can pull the target up to a number of squares equal to your Intuition score as a free triggered action.', { keywords:['Beastheart','Magic','Melee','Ranged'], distance:'Melee 1 or ranged 5', powerRoll:'Intuition', tiers:t('7 + I damage; P < WEAK, weakened (save ends)','10 + I damage; P < AVERAGE, weakened (save ends)','14 + I damage; P < STRONG, weakened (save ends)') }),
  fer(7, 'Shieldbreaker', 'You smash through their guard and shatter their armor, leaving them wide open.', 'The next creature who damages the target before the start of your next turn gains 3 surges, which they can use on the triggering damage.', { keywords:['Beastheart','Melee','Ranged','Strike','Weapon'], distance:'Melee 1 or ranged 5', powerRoll:'Might', tiers:t('9 + M damage','14 + M damage','19 + M damage') }),
];
const FER_9 = () => [
  fer(9, 'Deadshot', 'You channel your companion’s feral senses to take the perfect shot.', 'If you are hidden, you remain hidden after the strike.', { keywords:['Beastheart','Ranged','Strike','Weapon'], distance:'Ranged 15', target:'One creature or object', powerRoll:'Intuition', tiers:t('12 + I damage','18 + I damage','30 + I damage') }),
  fer(9, 'Dogpile', 'You and your allies surround your enemy like a pack of wolves, mobbing them and pulling them down.', 'Each ally adjacent to the target can use a free triggered action to deal damage to the target equal to their highest characteristic score.', { powerRoll:'Might', tiers:t('10 + M damage; M < WEAK, grabbed and prone','15 + M damage; M < AVERAGE, grabbed and prone','20 + M damage; M < STRONG, grabbed and prone') }),
  fer(9, 'One, Two, Three, Heave', 'Harnessing your companion’s strength, you send your foe flying.', 'If your companion is adjacent to the target, this forced movement can ignore the target’s stability.', { powerRoll:'Might', tiers:t('10 + M damage; vertical push 4; prone','15 + M damage; vertical push 6; prone','20 + M damage; vertical push 8; prone') }),
  fer(9, 'Rip Them Apart!', 'In a gruesome display, you and your companion rip off a pinned enemy’s limb or other body part and toss it away.', 'If the target is grabbed by your partner, the target takes extra damage equal to your Might score plus your partner’s Might score. If the target is reduced to 0 Stamina by this ability, each enemy within 2 squares who has P < AVERAGE is frightened (save ends).', { keywords:['Melee','Strike','Weapon'], powerRoll:'Might', tiers:t('11 + M damage; M < WEAK, bleeding (save ends)','17 + M damage; M < AVERAGE, bleeding (save ends)','22 + M damage; M < STRONG, bleeding (save ends)') }),
];
const FER_11 = () => [
  fer(11, 'Life-Drinking Wound', 'As your attack strikes home, your enemy’s escaping life force drifts to your allies in crimson threads.', 'Up to three creatures within 2 squares of the target gain temporary Stamina equal to half the damage dealt.', { keywords:['Beastheart','Magic','Melee','Ranged','Strike','Weapon'], distance:'Melee 1 or ranged 5', powerRoll:'Might', tiers:t('12 + M damage','18 + M damage','24 + M damage') }),
  fer(11, 'On the Razor’s Edge', 'Driven by the pain and desperation of battle, you and your companion spend your last strength in a flurry of wild attacks.', 'Your companion can use this ability against an adjacent target, making their own power roll. Both power rolls gain an edge if either of you is bleeding, dying, or winded, and your power roll has a double edge if your companion is dead or otherwise unable to act.', { keywords:['Beastheart','Melee','Ranged','Strike','Weapon'], distance:'Melee 1 or ranged 5', target:'One creature or object', powerRoll:'Might', tiers:t('5 + M damage','15 + M damage','25 + M damage') }),
  fer(11, 'Ride or Die', 'Your enemies might be stronger than you, but that’s why you’re not alone.', 'You and your companion each use a different ability that costs 9 or fewer ferocity and is either a main action or a maneuver. These abilities cost no ferocity. If an ability lets you spend additional ferocity for an enhanced effect, you can’t do so.', { keywords:['Beastheart'], distance:'Self', target:'Self' }),
  fer(11, 'Turn the World To Ash', 'Wrenching power from your primordial bond, you unleash elemental power in a devastating conflagration you can’t control.', '', { keywords:['Area','Beastheart','Magic'], distance:'2 burst', target:'Each enemy in the area', powerRoll:'Intuition', tiers:t('10 cold, fire, lightning, or sonic damage','18 cold, fire, lightning, or sonic damage','26 cold, fire, lightning, or sonic damage'), spendCost:'2+', spend:'You can spend up to 6 ferocity. For every 2 ferocity spent, the size of the burst increases by 1, you gain a +2 bonus to the power roll, and you take 5 damage that can’t be reduced in any way. You can choose how much ferocity you spend after you make the power roll.' }),
];

// Wild nature features (auto, subclass-keyed)
const WILD_FEAT_2 = {
  guardian: [{ name: 'Watchdog', text: 'You and your companion can’t be surprised.' }],
  prowler: [{ name: 'Supersniffer', text: 'While a creature is adjacent to your companion, that creature can’t be hidden or have concealment from your companion.' }],
  punisher: [{ name: 'This One’s Yours', text: 'Once per turn, you or your companion can use the following free triggered action.\n\n**This One’s Yours (free triggered action, self):** When someone is pushed into you, you reach out to steady an ally or send a foe careening off in another direction. **Trigger:** A creature force moved by another creature enters a space adjacent to you. **Effect:** You end the forced movement. You can then push the creature up to a number of squares equal to 1 + your Might score. The creature takes 1 damage for each square they are force moved this way. **Spend 1 Ferocity:** You and your companion can each use this free triggered action on the same turn.' }],
  spark: [{ name: 'Stormheart', text: 'Whenever you or your companion deals cold, fire, lightning, sonic, or untyped damage, you can change the damage type to cold, fire, lightning, or sonic damage.' }],
};
const WILD_FEAT_5 = {
  guardian: [{ name: 'There For Each Other', text: 'When you or your companion uses your The Pack Defends ability to spend a Recovery, you and the target both regain Stamina.' }],
  prowler: [{ name: 'Melt Away', text: 'You or your companion can use your Shadow in the Mist ability even when targeted by the triggering ability.' }],
  punisher: [{ name: 'I Can Take It', text: 'When you or your companion uses your Thunderclap ability and halves the triggering damage, whoever uses the ability can take the remaining damage instead of the original target. The damage is transferred before immunity and weakness are applied.' }],
  spark: [{ name: 'Wildfire Pyre', text: 'When you or your companion deals damage with your Pyre ability, each enemy adjacent to either of you takes the damage.' }],
};
const WILD_FEAT_8 = {
  guardian: [{ name: 'Reflexes Perfected', text: 'Your and your companion’s free strikes deal extra damage equal to your Intuition score. Whenever an adjacent enemy moves to a space that isn’t adjacent, you or your companion can make an opportunity attack, even if the enemy shifted, teleported, was force moved, or used another feature that doesn’t provoke opportunity attacks.' }],
  prowler: [{ name: 'Born to Run', text: 'You and your companion gain a +2 bonus to speed.' }],
  punisher: [{ name: 'Built for Violence', text: 'You and your companion gain a +2 damage bonus to maneuvers that deal damage. When you or your companion pushes a creature, you can vertical push that creature.' }],
  spark: [{ name: 'Nature Will Not Harm Us', text: 'You and your companion have damage immunity 10 to cold, fire, lightning, and sonic damage.' }],
};

// Wild nature heroic abilities (choice of two, subclass-keyed)
const WILD_ABILITY_2 = {
  guardian: [
    fer(5, 'Fetch!', 'Your companion blinks out of existence, returning with a visitor you were particularly hoping to meet.', 'Your companion can teleport up to 5 squares before and after making the power roll. Instead of grabbing the target, your companion can pick up a target object that is smaller than they are. You can forgo dealing damage with this ability.\n\nAfter making the power roll, your companion can teleport with a grabbed creature or held object, provided the creature or object can fit in the destination. You choose which squares adjacent to your companion the grabbed creature or held object is teleported to.', { keywords:['Companion','Magic','Melee','Strike','Weapon'], target:'One creature or object', powerRoll:'Might', tiers:t('6 + M damage; M < WEAK, grabbed','8 + M damage; M < AVERAGE, grabbed','12 + M damage; M < STRONG, grabbed') }),
    fer(5, 'Omnomnom', 'What do you have in your mouth? No! Bad boy!', '**Special:** This ability targets only creatures who are grabbed and are your companion’s size or smaller.\n\nA swallowed creature shares your companion’s space, is grabbed and restrained, and has line of effect only to your companion. Nothing has line of effect to the swallowed creature. Once per round at the start of your turn, the swallowed creature takes acid damage equal to 1 + your companion’s Might score. If the swallowed creature escapes the grab, your companion immediately regurgitates the creature, who lands prone in an unoccupied square adjacent to your companion. Your companion can also regurgitate a swallowed creature as a free maneuver. Your companion can have only one creature swallowed at a time.', { keywords:['Companion','Melee','Strike','Weapon'], powerRoll:'Might', tiers:t('6 + M damage; M < WEAK, the target is swallowed','10 + M damage; M < AVERAGE, the target is swallowed','14 + M damage; M < STRONG, the target is swallowed') }),
  ],
  prowler: [
    fer(5, 'Jump Scare', 'Surprised to see me?', '**Special:** This ability targets only enemies with line of effect to your companion.\n\nYour companion shifts up to a number of squares equal to their Intuition score. During this movement, they are invisible. They then make a power roll.', { keywords:['Area','Companion','Magic'], distance:'2 burst', target:'Each enemy in the area', powerRoll:'Intuition', tiers:t('4 damage; P < WEAK, frightened (save ends)','6 damage; P < AVERAGE, frightened (save ends)','10 damage; P < STRONG, frightened (save ends)') }),
    fer(5, 'On You Like Your Shadow', 'Your companion darts around their target, staying out of reach and using them as a shield.', 'Your companion enters the target’s space. Until your companion is no longer in the target’s space, they can end their turn in that space, strikes against them also affect the target, and your strikes against the target gain an edge.', { keywords:['Charge','Companion','Melee','Strike','Weapon'], target:'One creature or object', powerRoll:'Might', tiers:t('5 + M damage','8 + M damage','12 + M damage') }),
  ],
  punisher: [
    fer(5, 'Foe Bowling', 'Your companion sends one enemy tumbling into another, taking them both out.', 'If the target is force moved at least 1 square, an enemy adjacent to the target at the end of this forced movement is also targeted by this ability’s power roll, but they don’t trigger this effect.', { keywords:['Charge','Companion','Melee','Strike','Weapon'], powerRoll:'Might', tiers:t('3 + M damage; push 2; M < WEAK, prone','5 + M damage; push 3; M < AVERAGE, prone','8 + M damage; push 4; M < STRONG, prone') }),
    fer(5, 'One Roar and We’re Back In the Fight', 'Your companion builds up courage with a roar, growl, or aggressive display.', 'Your companion and the target can each gain 2 surges, spend up to 2 Recoveries, and end one condition or effect on them that is ended by a saving throw or that ends at the end of their turn.', { keywords:['Companion'], type:'Maneuver', distance:'Ranged 5', target:'One ally' }),
  ],
  spark: [
    fer(5, 'Burning Lash', 'A blazing tongue of energy entangles a foe.', '', { keywords:['Companion','Magic','Melee','Strike','Weapon'], distance:'Melee 2', powerRoll:'Intuition', tiers:t('6 + I fire or lightning damage; M < WEAK, prone','9 + I fire or lightning damage; M < AVERAGE, prone','14 + I fire or lightning damage; M < STRONG, prone and can’t stand (EoT)'), spendCost:1, spend:'If you are within distance of the target, you can use a free maneuver to wield a second whip, dealing extra fire or lightning damage equal to your Intuition score.' }),
    fer(5, 'Howling Gale', 'A blizzard or thunderstorm sends foes flying and lifts you like a feather.', 'Until the end of your next turn, you and your companion can fly and gain a +3 bonus to speed.', { keywords:['Area','Companion','Magic'], distance:'3 cube within 5', target:'Each enemy in the area', powerRoll:'Might', tiers:t('6 cold or sonic damage; slide 1','9 cold or sonic damage; slide 2','13 cold or sonic damage; slide 4') }),
  ],
};
const WILD_ABILITY_6 = {
  guardian: [
    fer(9, 'Sic ’Em!', 'Your companion rushes forward to protect you from a dangerous foe.', '', { keywords:['Charge','Companion','Melee','Strike','Weapon'], powerRoll:'Might', tiers:t('11 + M damage; taunted (save ends); M < WEAK, prone','16 + M damage; taunted (save ends); M < AVERAGE, prone','21 + M damage; taunted (save ends); M < STRONG, prone and can’t stand (EoT)'), spendCost:2, spend:'Your companion can use this ability as a triggered action against an enemy who damages you.' }),
    fer(9, 'Stare Down', 'Your companion locks eyes with an enemy, imposing their will upon the enemy and daring them to move a muscle.', 'The first time the target uses a move action, main action, maneuver, or triggered action before the start of your next turn, your companion makes the following power roll before the target acts. If the target hasn’t acted before the start of your next turn, they are frightened of your companion (save ends).', { keywords:['Companion','Magic','Ranged'], type:'Maneuver', distance:'Ranged 5', powerRoll:'Intuition', tiers:t('9 + I psychic damage; I < WEAK, weakened (save ends)','13 + I psychic damage; I < AVERAGE, weakened (save ends)','18 + I psychic damage; I < STRONG, weakened (save ends)') }),
  ],
  prowler: [
    fer(9, 'Soft Underbelly', 'Your companion ducks under your enemy’s guard and rakes open their soft vitals, leaving them vulnerable.', 'While bleeding this way, the target has damage weakness 5.', { keywords:['Companion','Melee','Strike','Weapon'], distance:'Melee 2', powerRoll:'Might', tiers:t('10 + M damage; A < WEAK, bleeding (save ends)','15 + M damage; A < AVERAGE, bleeding (save ends)','20 + M damage; A < STRONG, bleeding (save ends)') }),
    fer(9, 'Wraith Heart', 'You and your companion become soul-freezing wraiths.', 'You and your companion shift up to your speeds. During this movement, you are both invisible, can move through enemies and objects, and ignore difficult terrain. You each deal corruption damage equal to your own Intuition score to each enemy you pass through during this movement. You can both damage each enemy once this way.', { keywords:['Magic'], type:'Move action', distance:'Self', target:'Self' }),
  ],
  punisher: [
    fer(9, 'Lead the Pack', 'Roaring like wild beasts, your companion and your allies rush toward the foe.', 'Your companion shifts up to their speed and can make a melee free strike. As a free triggered action, you and up to 10 allies within 10 squares of your companion’s starting position can shift up to their speed and make free strikes.', { keywords:['Companion'], type:'Maneuver', distance:'Self', target:'Self' }),
    fer(9, 'Rolling Thunder', 'The rumble of your companion’s dash is a rolling thunderclap, their impact an earthquake.', 'Your companion shifts up to their speed and makes one power roll that targets each enemy they come adjacent to during the shift. If your companion targets only one enemy with this ability, the power roll gains an edge.', { keywords:['Companion','Magic','Melee','Strike'], distance:'Self', target:'Self', powerRoll:'Might', tiers:t('9 sonic damage; M < WEAK, prone','13 sonic damage; M < AVERAGE, prone','18 sonic damage; M < STRONG, prone'), spendCost:2, spend:'You can move up to your speed. The power roll also targets each enemy you come adjacent to during the move.' }),
  ],
  spark: [
    fer(9, 'Elements Unleashed', 'Your companion’s body becomes a bank of glowing coals, a web of arcing lightning, a cloud of rumbling thunder, or a flurry of dancing ice crystals.', 'Your companion transforms into a creature made of elemental energy. Choose a damage type from cold, fire, lightning, or sonic damage. While transformed, your companion gains the following benefits:\n\n- Your companion can fly. If they could already fly, they gain a +2 bonus to speed.\n- When your companion enters another creature’s space for the first time on a turn or damages a creature with a strike, your companion deals 5 damage of the chosen type to the creature.\n- Your companion has immunity all to the chosen damage type and immunity 5 to all other damage.\n\nYour companion’s transformation lasts until the start of your next turn. At the start of each of your turns, you can spend 3 ferocity to extend the transformation’s duration for one turn. When you do so, you can change the chosen damage type.', { keywords:['Companion','Magic'], type:'Maneuver', distance:'Self', target:'Self', spendCost:2, spend:'You also transform.' }),
    fer(9, 'Killing Frost', 'Black frost freezes boots to the floor and creeps up trapped victims until they’re completely encased in ice.', 'While restrained this way, a creature takes 5 cold damage at the start of each of your turns. A creature killed by this ability becomes an ice statue and their space is difficult terrain.', { keywords:['Area','Companion','Magic'], distance:'5 cube within 1', target:'Each enemy in the area', powerRoll:'Might', tiers:t('5 cold damage; I < WEAK, restrained (save ends)','7 cold damage; I < AVERAGE, restrained (save ends)','12 cold damage; I < STRONG, restrained (save ends)') }),
  ],
};
const WILD_ABILITY_9 = {
  guardian: [
    fer(11, 'Banshee Howl', 'Your companion’s howl, screech, roar, or psychic emanation presages death to those who hear it.', 'While frightened this way, a creature takes 10 psychic damage at the start of each of your turns.', { keywords:['Area','Companion','Magic'], distance:'3 burst', target:'Each enemy in the area', powerRoll:'Intuition', tiers:t('5 sonic damage; I < WEAK, frightened (save ends)','10 sonic damage; I < AVERAGE, frightened (save ends)','15 sonic damage; I < STRONG, frightened (save ends)'), spendCost:1, spend:'This ability also affects a 3 burst originating from you. An enemy in both areas is only affected once.' }),
    fer(11, 'Relentless', 'Your companion launches at your foe, shielding allies with their body.', 'While the target is taunted this way, all creatures except your companion have immunity 10 to damage dealt by the target.', { keywords:['Charge','Companion','Melee','Strike','Weapon'], target:'One enemy', powerRoll:'Might', tiers:t('11 + M damage; P < WEAK, taunted (save ends)','17 + M damage; P < AVERAGE, taunted (save ends)','22 + M damage; P < STRONG, taunted (save ends)') }),
  ],
  prowler: [
    fer(11, 'Behold the Face of Chaos', 'Your companion appears next to their victim in the guise of a heart-stopping nightmare.', 'Your companion teleports up to their speed.', { keywords:['Companion','Magic','Melee','Strike','Weapon'], powerRoll:'Intuition', tiers:t('13 + I psychic damage; P < WEAK, frightened (save ends)','20 + I psychic damage; P < AVERAGE, frightened (save ends)','27 + I psychic damage; P < STRONG, frightened (save ends)') }),
    fer(11, 'Let’s Take This Outside', 'Your companion drags your chosen foe into storms of the Primordial Plane.', 'You, your companion, and the target enter the heart of an eternal storm on Quintessence. The three of you can’t affect or be affected by any creatures except each other. Creatures in this area are always adjacent to each other and can’t move or teleport away from each other, but can otherwise act normally.\n\nWhile on Quintessence, the target takes 5 cold damage, 5 fire damage, 5 lightning damage, and 5 sonic damage at the start of each of your turns.\n\nThe effect ends when one of you dies or you end it as a free maneuver. The target can make a save at the end of each of their turns to end the effect early. When the effect ends, you each reappear in the space you left or the nearest unoccupied space. If the target dies on Quintessence, their remains do not return.', { keywords:['Companion','Magic'] }),
  ],
  punisher: [
    fer(11, 'Battle Frenzy', 'Your companion shatters the floodgates that keep their rampage dammed up, and it cascades into the unprepared minds of nearby creatures.', '**Special:** This ability targets only creatures you choose within distance.\n\nIf a target resists the potency, they can choose to become battle-frenzied.\n\nA battle-frenzied creature must use a free triggered action to make a melee free strike against themself or a creature adjacent to them. You choose each creature’s target. After making this strike, they are no longer battle-frenzied.', { keywords:['Area','Companion','Magic'], distance:'5 burst', target:'Special', powerRoll:'Might', tiers:t('P < WEAK, the target is battle-frenzied','P < AVERAGE, the target is battle-frenzied','The target is battle-frenzied') }),
    fer(11, 'Juggernaut', 'Your companion plows through the front lines, tossing enemies—and allies—this way and that.', 'Your companion can forgo dealing damage to targets of your choice.', { keywords:['Area','Charge','Companion'], distance:'2 burst', target:'Each creature', powerRoll:'Intuition', tiers:t('9 damage; vertical slide 2; M < WEAK, prone','13 damage; vertical slide 4; M < AVERAGE, prone','18 damage; vertical slide 6; M < STRONG, prone') }),
  ],
  spark: [
    fer(11, 'For the Pack!', 'They’d tell stories in hushed tones of your companion’s last stand—if any of them lived to tell the tale.', 'Your companion makes a power roll, which targets each enemy in a 5 burst.\n\nAfterward, your companion dies. If you are dead and in the area, you are restored to life with 1 Stamina. You and each ally in the area can spend up to 2 Recoveries.', { keywords:['Area','Companion','Magic'], type:'Free triggered action', trigger:'After taking damage, your companion is dead or dying.', distance:'Self', target:'Self', powerRoll:'Intuition', tiers:t('20 cold, fire, lightning, or sonic damage','25 cold, fire, lightning, or sonic damage','30 cold, fire, lightning, or sonic damage') }),
    fer(11, 'Wild Hunt', 'Your companion summons a ravening pack of spectral ancestors to devour your foes.', 'Your companion summons a ghostly pack of creatures that resemble them to fill the area. The pack can appear in and move through creatures, objects, and terrain. Once summoned, the pack moves in a straight line toward your companion until it’s centered on your companion’s space, then continues moving in a straight line until it is up to 20 squares away.\n\nYour companion targets each enemy inside the pack’s area during its movement once with the following power roll. If a creature is killed by this ability, their body is dragged off to Quintessence to be devoured at leisure.', { keywords:['Area','Companion','Magic'], distance:'5 cube within 20', target:'Each enemy in the area', powerRoll:'Might', tiers:t('9 damage','13 damage','18 damage') }),
  ],
};
const allSubs = (m) => [...m.guardian, ...m.prowler, ...m.punisher, ...m.spark];

export const beastheart = {
  2: {
    summary: 'Your companion learns to help anyone, and your wild nature deepens.',
    staminaGain: 12,
    autoFeatures: ({ sub }) => [
      { name: 'Everyone’s Best Friend', text: 'Your companion may not be much of a talker, but they’ve got a lifetime of experience surviving the dangers of the wild. They can offer aid in nearly any circumstance: helping exhausted travelers find their way, leading panicked villagers out of a burning building, or even providing a comforting nuzzle at just the right time. Once per round during a montage test, when you or another character makes a test, your companion can increase the tier outcome by one tier (to a maximum of tier 3).' },
      ...(WILD_FEAT_2[sub] || []),
    ],
    choices: [
      { id: 'perk', label: 'Perk', help: 'Choose one exploration, interpersonal, or intrigue perk.', kind: 'perk', options: PERK_EII },
      { id: 'wild-ability-2', label: '2nd-Level Wild Nature Ability', help: 'Your wild nature grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => WILD_ABILITY_2[sub] || allSubs(WILD_ABILITY_2) },
    ],
  },
  3: {
    summary: 'Your companion grows in power, and your bond fuels mightier deeds.',
    staminaGain: 12,
    autoFeatures: (ctx) => [companionAdv(3)(ctx)],
    choices: [
      { id: 'ferocity-7', label: '7-Ferocity Ability', help: 'Choose one heroic ability that costs 7 ferocity.', kind: 'ability', options: FER_7 },
    ],
  },
  4: {
    summary: 'You and your companion grow stronger, and the beast strains its leash.',
    staminaGain: 12,
    autoCharacteristicIncrease: { Might: 3, Intuition: 3, max: true },
    autoFeatures: () => [
      { name: 'Characteristic Increase', text: 'Your and your companion’s Might and Intuition scores increase to 3.' },
      { name: 'Rampage Improvement', text: 'Your Rampage feature provides additional effects when your companion has 16 or more rampage.' },
      { name: 'Unleash the Beast', text: 'The first time each combat round that a creature adjacent to your companion takes damage, you gain 3 ferocity instead of 2 ferocity.' },
    ],
    choices: [
      { id: 'perk-4', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'skill-4', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
  5: {
    summary: 'Your wild nature reveals a deeper gift.',
    staminaGain: 12,
    autoFeatures: ({ sub }) => WILD_FEAT_5[sub] || [],
    choices: [
      { id: 'ferocity-9', label: '9-Ferocity Ability', help: 'Choose one heroic ability that costs 9 ferocity.', kind: 'ability', options: FER_9 },
    ],
  },
  6: {
    summary: 'The rampage burns in your own brain — you become part beast.',
    staminaGain: 12,
    autoFeatures: (ctx) => [becomeTheBeast(ctx)],
    choices: [
      { id: 'perk-6', label: 'Perk', help: 'Choose one exploration, interpersonal, or intrigue perk.', kind: 'perk', options: PERK_EII },
      { id: 'wild-ability-6', label: '6th-Level Wild Nature Ability', help: 'Your wild nature grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => WILD_ABILITY_6[sub] || allSubs(WILD_ABILITY_6) },
    ],
  },
  7: {
    summary: 'Ferocity floods your feral heart.',
    staminaGain: 12,
    autoCharIncreaseAll: { delta: 1, max: 4 },
    autoFeatures: () => [
      { name: 'Characteristic Increase', text: 'Each of your and your companion’s characteristic scores increases by 1, to a maximum of 4.' },
      { name: 'Feral Heart', text: 'At the start of each of your turns in combat, you gain 1d3 + 1 ferocity instead of 1d3.' },
      { name: 'Rampage Improvement', text: 'Your Rampage feature provides additional effects when your companion has 20 or more rampage.' },
    ],
    choices: [
      { id: 'skill-7', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
  8: {
    summary: 'Your wild nature perfects your bodies for the hunt.',
    staminaGain: 12,
    autoFeatures: ({ sub }) => WILD_FEAT_8[sub] || [],
    choices: [
      { id: 'perk-8', label: 'Perk', help: 'Choose any perk.', kind: 'perk', options: PERK_ANY },
      { id: 'ferocity-11', label: '11-Ferocity Ability', help: 'Choose one heroic ability that costs 11 ferocity.', kind: 'ability', options: FER_11 },
    ],
  },
  9: {
    summary: 'Your companion transcends beasthood, a vessel for nature’s wisdom.',
    staminaGain: 12,
    autoFeatures: () => [
      { name: 'Avatar of the Green', text: 'Your companion has transcended beasthood. Although they’re still your faithful friend, they’re also a vessel for nature’s wisdom and memories. Your companion’s Reason score increases to 1, or increases by 1 if it is already 1 or higher, and they learn every language you know. Your companion can communicate telepathically with any creature within 10 squares, using language as well as images and feelings. Additionally, you learn the Nature skill and one other skill from the lore skill group.' },
    ],
    choices: [
      { id: 'wild-ability-9', label: '9th-Level Wild Nature Ability', help: 'Your wild nature grants your choice of one of two heroic abilities.', kind: 'ability', options: ({ sub }) => WILD_ABILITY_9[sub] || allSubs(WILD_ABILITY_9) },
      { id: 'skill-9', label: 'Lore Skill', help: 'Avatar of the Green grants the Nature skill and one other skill from the lore skill group.', kind: 'skill-group', options: SKILL_LORE },
    ],
  },
  10: {
    summary: 'Your evolution completes — ferox burns where ferocity once flowed.',
    staminaGain: 12,
    autoCharacteristicIncrease: { Might: 5, Intuition: 5, max: true },
    autoFeatures: (ctx) => [
      { name: 'Characteristic Increase', text: 'Your and your companion’s Might and Intuition scores increase to 5.' },
      companionAdv(10)(ctx),
      { name: 'Final Evolution', text: 'When you gain ferocity at the start of each of your turns during combat, you gain 2d3 + 1 ferocity instead of 1d3 + 1.' },
      { name: 'Ferox', text: 'You have an epic resource called ferox. Each time you finish a respite, you gain ferox equal to the XP you gain. You can spend ferox on your abilities as if it were ferocity.\n\nAdditionally, you can spend 1 ferox as a free maneuver to allow you and your companion to each take a main action on your turn, instead of a main action and a maneuver. On that turn, the ferocity cost of your heroic abilities is reduced by 1.\n\nFerox remains until you spend it.' },
      { name: 'Rampage Improvement', text: 'Your Rampage feature provides additional effects when your companion has 24 or more rampage.' },
    ],
    choices: [
      { id: 'perk-10', label: 'Perk', help: 'Choose one exploration, interpersonal, or intrigue perk.', kind: 'perk', options: PERK_EII },
      { id: 'skill-10', label: 'Skill', help: 'Choose any skill from any group.', kind: 'skill-group', options: SKILL_ANY },
    ],
  },
};
