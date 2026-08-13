// data/beastheart-companions.js — the Beastheart's 14 companion stat blocks.
// Chosen at 1st level (cclass.companion); advancements unlock at levels 3/6/10.
const ab = (name, props) => ({ name, ...props });

export const BEASTHEART_COMPANIONS = [
  {
    id: 'basilisk', name: 'Basilisk',
    role: 'Companion',
    keywords: ['Beast', 'Companion'],
    size: '1L', speed: '5', stability: '2', freeStrike: '1+M',
    immunity: 'Poison 3',
    skills: ['Alertness'],
    characteristics: { Might: 2, Agility: 1, Reason: -1, Intuition: 2, Presence: 2 },
    abilities: [
      ab('Petrify', {
        flavor: 'Transfixed by the basilisk’s magical gaze or struck by their poisoned claws, the foe’s body begins to calcify.',
        keywords: ['Companion', 'Magic', 'Melee', 'Ranged', 'Weapon'], type: 'Maneuver',
        distance: 'Melee 1 or ranged 5', target: 'One enemy',
        effect: 'The target takes corruption damage equal to 3 + the basilisk’s Might score and is stoned (save ends) (see Stoned).',
        resource: 'Ferocity', spendCost: 1, spend: 'While stoned this way, the target is also slowed.',
      }),
    ],
    traits: [
      { name: 'Stoned', text: 'A stoned creature is magically turning to stone. Each time a creature fails the saving throw to end this effect, they take corruption damage equal to the basilisk’s Might score. A stoned creature or a creature adjacent to them can use a maneuver to cut the encroaching stone from the stoned target’s body, ending the effect and dealing damage to the target equal to twice the basilisk’s Might score that can’t be reduced in any way. A creature reduced to 0 Stamina while they are stoned, or by an ability that causes a creature to become stoned, is turned to stone until they are restored to life by magical means.' },
    ],
    advancements: {
      3:  { name: 'Foes Forever Frozen', text: 'Whenever the basilisk makes a strike against a creature while rampaging, the target is stoned (save ends).' },
      6:  { name: 'Rock Smasher', text: 'Whenever you deal rolled damage to a stoned creature while the basilisk is rampaging, you deal extra damage equal to twice your Might score.' },
      10: { name: 'Heart of Stone', text: 'While the basilisk is rampaging, you and the basilisk have damage immunity 10 as you become nearly impervious living statues.' },
    },
  },

  {
    id: 'bear', name: 'Bear',
    role: 'Companion',
    keywords: ['Animal', 'Companion'],
    size: '1L', speed: '5', stability: '2', freeStrike: '1+M',
    movement: 'Climb',
    skills: ['Intimidate'],
    characteristics: { Might: 2, Agility: 1, Reason: -1, Intuition: 2, Presence: 2 },
    abilities: [
      ab('Backhand', {
        flavor: 'The bear casually swats the pesky foe into next week.',
        keywords: ['Companion', 'Melee', 'Weapon'], type: 'Maneuver',
        distance: 'Melee 1', target: 'One creature or object',
        effect: 'The target takes damage equal to 4 + the bear’s Might score and is pushed up to 2 squares.',
        resource: 'Ferocity', spendCost: 1, spend: 'The target is force moved up to a number of additional squares equal to the bear’s Might score.',
      }),
    ],
    traits: [
      { name: 'Strong Like Bear', text: 'You gain a +1 bonus to your stability.' },
    ],
    advancements: {
      3:  { name: 'Foe Thresher', text: 'Whenever the bear targets a creature with a strike that doesn’t impose forced movement while rampaging, the bear can push the target up to a number of squares equal to the bear’s Might score.' },
      6:  { name: 'Ursine Form', text: 'While the bear is rampaging, you have damage immunity 5 and your size increases to the bear’s size (to a maximum of 2). If you don’t have enough unoccupied space to grow, you grow as soon as there is sufficient space.' },
      10: { name: 'Twin Colossi', text: 'While the bear is rampaging, you gain a +1 bonus to distance with melee weapon abilities, your size increases to match the bear’s size (to a maximum of 3), and your strikes deal an extra 5 damage.' },
    },
  },

  {
    id: 'boar', name: 'Boar',
    role: 'Companion',
    keywords: ['Animal', 'Companion'],
    size: '1M', speed: '5', stability: '2', freeStrike: '1+M',
    skills: ['Search'],
    characteristics: { Might: 2, Agility: 1, Reason: -1, Intuition: 2, Presence: 2 },
    abilities: [
      ab('Gore', {
        flavor: 'With an enraged snort, the boar lunges forward to rip open foes with their tusks.',
        keywords: ['Companion', 'Melee', 'Weapon'], type: 'Maneuver',
        distance: 'Melee 1', target: 'One creature or object',
        effect: 'The boar moves up to their speed in a straight line. When this movement ends, they can deal damage equal to 3 + their Might score to an adjacent target. If the boar moved closer to the target as part of this movement, the boar deals extra damage equal to their Might score.',
        resource: 'Ferocity', spendCost: 1, spend: 'The target is bleeding until the end of their next turn.',
      }),
    ],
    traits: [
      { name: 'Spiteful Endurance', text: 'While the boar is winded, they have damage immunity equal to their Might score and ignore the effects of bleeding.' },
    ],
    advancements: {
      3:  { name: 'Greased Pig', text: 'While the boar is rampaging, they have a +2 bonus to speed and a double edge on the Escape Grab maneuver.' },
      6:  { name: 'Wild Rush', text: 'While the boar is rampaging, you can use their Gore maneuver, and you and the boar can shift instead of move when using the Charge action or the Gore maneuver.' },
      10: { name: 'Immortal Rage', text: 'Whenever you or the boar use an ability that deals damage while the boar is rampaging, you gain 10 temporary Stamina.' },
    },
  },

  {
    id: 'condor', name: 'Condor',
    role: 'Companion',
    keywords: ['Animal', 'Companion'],
    size: '1M', speed: '7', stability: '0', freeStrike: '1+M',
    movement: 'Fly',
    skills: ['Alertness'],
    characteristics: { Might: 2, Agility: 1, Reason: -1, Intuition: 2, Presence: 1 },
    abilities: [
      ab('Flurry of Wings', {
        flavor: 'I can’t draw a bead on them with that infernal bird flapping in my face!',
        keywords: ['Companion', 'Melee', 'Weapon'], type: 'Maneuver',
        distance: 'Melee 1', target: 'One creature or object',
        effect: 'The target takes damage equal to 3 + the condor’s Might score. Additionally, enemies are weakened while adjacent to the condor until the end of your next turn.',
        resource: 'Ferocity', spendCost: 1, spend: 'An enemy who would be weakened by this ability is taunted instead.',
      }),
    ],
    traits: [
      { name: 'Moving Target', text: 'While the condor is flying and has a speed greater than 0, ranged strikes against them take a bane.' },
    ],
    advancements: {
      3:  { name: 'Dive Bomb', text: 'Whenever the condor makes a strike while rampaging, they deal extra damage equal to the number of squares they’ve moved on their turn (to a maximum of 5).' },
      6:  { name: 'Borne Aloft', text: 'While the condor is rampaging, you gain wings and can fly. While flying, you gain a +2 bonus to speed. If you are midair when the condor’s rampage ends, you take no damage from the fall.' },
      10: { name: 'Flight of the Condor', text: 'While the condor is rampaging, you and the condor gain a +5 bonus to speed.' },
    },
  },

  {
    id: 'deinonychus', name: 'Deinonychus',
    role: 'Companion',
    keywords: ['Animal', 'Companion'],
    size: '1M', speed: '7', stability: '1', freeStrike: '1+M',
    skills: ['Track'],
    characteristics: { Might: 2, Agility: 2, Reason: -1, Intuition: 2, Presence: 1 },
    abilities: [
      ab('Terrible Claws', {
        flavor: 'The deinonychus kicks their prey, then slashes them with wicked claws.',
        keywords: ['Companion', 'Melee', 'Weapon'], type: 'Maneuver',
        distance: 'Melee 1', target: 'One enemy',
        effect: 'The target takes damage equal to 3 + the deinonychus’s Might score, and if they have M < AVERAGE, they are bleeding until the end of their next turn.',
        resource: 'Ferocity', spendCost: 1, spend: 'A target who has M < STRONG is bleeding (save ends).',
      }),
    ],
    traits: [
      { name: 'Blood Frenzy', text: 'Whenever the deinonychus deals damage to a bleeding creature, they gain 1 surge.' },
    ],
    advancements: {
      3:  { name: 'Tear You to Ribbons', text: 'Whenever the deinonychus makes a strike against a creature while rampaging, the target is bleeding until the end of their next turn.' },
      6:  { name: 'Slake My Thirst in Blood', text: 'Whenever you use an ability that deals rolled damage to a bleeding creature while the deinonychus is rampaging, you gain 2 surges.' },
      10: { name: 'Reaping Scythe', text: 'The deinonychus’s claws slash at creatures underfoot. When the deinonychus moves adjacent to an enemy or enters an enemy’s space for the first time on a turn while rampaging, the deinonychus deals damage to that enemy equal to the deinonychus’s Might score.' },
    },
  },

  {
    id: 'drake', name: 'Drake',
    role: 'Companion',
    keywords: ['Companion', 'Dragon'],
    size: '1M', speed: '5', stability: '1', freeStrike: '1+M',
    immunity: 'Attuned damage type 3 (see Elementally Attuned)',
    movement: 'Fly',
    skills: ['Intimidate'],
    characteristics: { Might: 2, Agility: 1, Reason: -1, Intuition: 2, Presence: 2 },
    optionChoice: { id: 'attunedType', label: 'Attuned Damage Type', options: ['acid', 'cold', 'corruption', 'fire', 'lightning', 'poison', 'sonic'] },
    abilities: [
      ab('Drake Breath', {
        flavor: 'The drake exhales a blast of flesh-melting energy.',
        keywords: ['Area', 'Companion', 'Magic'], type: 'Maneuver',
        distance: '1 or 2 cube within 1', target: 'Each creature in the area',
        effect: 'The target takes damage of the drake’s attuned damage type (see Elementally Attuned) equal to the drake’s Might score.',
        resource: 'Ferocity', spendCost: '1 or 2', spend: 'This ability affects a 3 cube (if you spend 1 ferocity) or a 4 cube (if you spend 2 ferocity) within 1.',
      }),
    ],
    traits: [
      { name: 'Elementally Attuned', text: 'When you gain this companion, you choose their attuned damage type from acid, cold, corruption, fire, lightning, poison, or sonic. The drake’s attuned damage type affects their other features.' },
      { name: 'Shared Scales', text: 'You have immunity 3 to the drake’s attuned damage type.' },
    ],
    advancements: {
      3:  { name: 'Endless Breath', text: 'The drake’s Drake Breath maneuver deals an extra 2 damage.' },
      6:  { name: 'A Burning Inside Me', text: 'While the drake is rampaging, you gain draconic wings and can fly. If you are midair when the drake’s rampage ends, you take no damage from the fall. Additionally, you can use the drake’s Drake Breath maneuver until their rampage ends.' },
      10: { name: 'Elemental Avatar', text: 'While the drake is rampaging, you and the drake have immunity all to the drake’s attuned damage type, and whenever you or the drake make a strike against a creature you can cause the target to be dragonsealed (save ends). A dragonsealed creature has weakness 10 to the drake’s attuned damage type.' },
    },
  },

  {
    id: 'elemental-spark', name: 'Elemental Spark',
    role: 'Companion',
    keywords: ['Companion', 'Elemental'],
    size: '1M', speed: '7', stability: '1', freeStrike: '1+M',
    immunity: 'Lightning 3',
    skills: ['Magic'],
    characteristics: { Might: 2, Agility: 2, Reason: -1, Intuition: 2, Presence: 1 },
    abilities: [
      ab('Static Shock', {
        flavor: 'An arc of lightning crackles from the spark.',
        keywords: ['Companion', 'Magic', 'Melee'], type: 'Maneuver',
        distance: 'Melee 1', target: 'One creature or object',
        effect: 'The target takes lightning damage equal to 2 + the spark’s Might score.',
        resource: 'Ferocity', spendCost: 1, spend: 'The distance increases to melee 5.',
      }),
    ],
    traits: [
      { name: 'Electric Surge', text: 'The first time on a turn that you or the spark deal lightning damage, you gain 1 surge.' },
    ],
    advancements: {
      3:  { name: 'Electroshock', text: 'Whenever the spark makes a strike against a creature while rampaging, they can cause a target who has M < AVERAGE to be dazed until the end of the target’s next turn.' },
      6:  { name: 'Conductive', text: 'While the spark is rampaging, lightning sings through your blood, and whenever you make a strike against a creature, you deal extra lightning damage equal to your Might score.' },
      10: { name: 'Lightning Speed', text: 'While the spark is rampaging, you and the spark can shift up to your speed as a free maneuver once on each of your turns.' },
    },
  },

  {
    id: 'gummy-ball', name: 'Gummy Ball',
    role: 'Companion',
    keywords: ['Companion', 'Ooze'],
    size: '1L', speed: '5', stability: '2', freeStrike: '1+M',
    immunity: 'Acid 3',
    skills: ['Sneak'],
    characteristics: { Might: 2, Agility: 2, Reason: -1, Intuition: 2, Presence: 1 },
    abilities: [
      ab('Absorb', {
        flavor: 'With a sickening squelch, the ball oozes around their hapless prey.',
        keywords: ['Companion', 'Melee', 'Weapon'], type: 'Maneuver',
        distance: 'Melee 1', target: 'One enemy',
        effect: 'The target takes acid damage equal to 3 + the ball’s Might score, and if they have A < AVERAGE, the ball moves into the target’s space. If the target completely fits within the ball’s space, the target is grabbed by the ball.',
        resource: 'Ferocity', spendCost: 1, spend: 'A target grabbed this way takes acid damage equal to the ball’s Might score at the end of each of the ball’s turns.',
      }),
    ],
    traits: [
      { name: 'Gelatinous', text: 'The ball can occupy another creature’s space. While occupying a creature’s space, the ball has line of effect to that creature. If the creature completely fits within the ball’s space, the creature has line of effect only to the ball and creatures outside the ball don’t have line of effect to the creature. The ball’s space is difficult terrain.' },
    ],
    advancements: {
      3:  { name: 'Suck It Up', text: 'Whenever the ball makes a strike while rampaging, one target is pulled up to 3 squares into the ball’s space. If the target ends this movement and completely fits within the ball’s space, the target is grabbed by the ball.' },
      6:  { name: 'Taffy Pull', text: 'While the ball is rampaging, your arms and legs become viscous and stretchy, and you gain a +2 bonus to speed and melee distance.' },
      10: { name: 'Runaway Expansion', text: 'While the ball is rampaging, you and the ball have acid immunity 10, and whenever a creature is reduced to 0 Stamina while inside the ball, the ball’s size increases by 1 (to a maximum of 5). The ball’s size can’t increase this way more than once a turn, and the ball shrinks back to their original size when their rampage ends.' },
    },
  },

  {
    id: 'hellhound', name: 'Hellhound',
    role: 'Companion',
    keywords: ['Companion', 'Infernal'],
    size: '1M', speed: '7', stability: '1', freeStrike: '1+M',
    immunity: 'Fire 3',
    skills: ['Intimidate'],
    characteristics: { Might: 2, Agility: 2, Reason: -1, Intuition: 2, Presence: 1 },
    abilities: [
      ab('Fire Breath', {
        flavor: 'The hellhound exhales infernal flames.',
        keywords: ['Companion', 'Magic', 'Melee', 'Ranged'], type: 'Maneuver',
        distance: 'Melee 1 or ranged 2', target: 'One creature or object',
        effect: 'The target takes fire damage equal to 3 + the hellhound’s Might score.',
        resource: 'Ferocity', spendCost: 1, spend: 'This ability gains a bonus to either its damage or distance equal to the hellhound’s Intuition score.',
      }),
    ],
    traits: [
      { name: 'Hellish Pact', text: 'You have fire immunity equal to the hellhound’s fire immunity.' },
    ],
    advancements: {
      3:  { name: 'Infernal Apparition', text: 'Whenever the hellhound makes a strike against a creature while rampaging, they can cause a target who has P < AVERAGE to be frightened until the end of the target’s next turn.' },
      6:  { name: 'Slavering Jaws', text: 'While the hellhound is rampaging, your mouth foams with acidic ichor, and whenever you make a strike against a creature, you deal extra acid damage equal to your Might score.' },
      10: { name: 'Wreathed in Flames', text: 'While the hellhound is rampaging, you and the hellhound are surrounded by an aura of flames, and each enemy who starts their turn adjacent to you or the hellhound takes fire damage equal to the hellhound’s Might score.' },
    },
  },

  {
    id: 'lightbender', name: 'Lightbender',
    role: 'Companion',
    keywords: ['Beast', 'Companion'],
    size: '1L', speed: '7', stability: '2', freeStrike: '1+M',
    skills: ['Hide'],
    characteristics: { Might: 2, Agility: 1, Reason: -1, Intuition: 2, Presence: 2 },
    abilities: [
      ab('Sparking Tail Whip', {
        flavor: 'The lightbender swings their tail, sending gouts of sparks in their foe’s face.',
        keywords: ['Companion', 'Melee', 'Weapon'], type: 'Maneuver',
        distance: 'Melee 1', target: 'One enemy',
        effect: 'The target takes damage equal to 3 + the lightbender’s Might score, and if they have M < AVERAGE, they are dazzled until the end of their next turn. A dazzled creature has line of effect only within 1 square.',
        resource: 'Ferocity', spendCost: 1, spend: 'A dazzled creature also takes a bane on strikes.',
      }),
    ],
    traits: [
      { name: 'Avoidance', text: 'Any effect on the lightbender that would be ended by a saving throw instead ends automatically at the end of their next turn.' },
    ],
    advancements: {
      3:  { name: 'Hit and Run', text: 'Whenever the lightbender makes a strike against a creature while rampaging, the lightbender can teleport up to 5 squares and use the Hide maneuver.' },
      6:  { name: 'Lightbearer', text: 'While the lightbender is rampaging, you can use a free maneuver to glow with blinding light that lasts until the rampage ends or you use this ability again. While glowing, your skin sheds light for 10 squares and strikes against you take a bane.' },
      10: { name: 'Everywhere and Nowhere', text: 'While the lightbender is rampaging, your grip on spatial reality is weakened, and once on each of your turns, you or the lightbender can teleport up to 3 spaces as a free maneuver. Additionally, strikes made against you and the lightbender have a double bane until the lightbender’s rampage ends.' },
    },
  },

  {
    id: 'panther', name: 'Panther',
    role: 'Companion',
    keywords: ['Animal', 'Companion'],
    size: '1M', speed: '7', stability: '1', freeStrike: '1+M',
    movement: 'Climb',
    skills: ['Sneak'],
    characteristics: { Might: 2, Agility: 2, Reason: -1, Intuition: 2, Presence: 1 },
    abilities: [
      ab('Pounce', {
        flavor: 'The panther bunches up, then uncoils into a deadly leap.',
        keywords: ['Companion', 'Melee', 'Weapon'], type: 'Maneuver',
        distance: 'Melee 1', target: 'One enemy',
        effect: 'The target takes damage equal to 3 + the panther’s Might score, and if they have M < AVERAGE, they are knocked prone.',
        resource: 'Ferocity', spendCost: 1, spend: 'The panther can jump up to a number of squares equal to their speed before using this ability. If they jump at least 1 square in this way, a target who has M < STRONG is knocked prone.',
      }),
    ],
    traits: [
      { name: 'Mighty Spring', text: 'Whenever the panther takes the Advance move action or the Charge action, they can jump up to a number of squares equal to their speed in any direction, including vertically, as part of this movement.' },
    ],
    advancements: {
      3:  { name: 'Cat and Mouse', text: 'Whenever the panther makes a strike against a creature while rampaging, the panther can knock the target prone.' },
      6:  { name: 'Single Bound', text: 'While the panther is rampaging, you can jump up to a number of squares equal to your speed as a free maneuver once on each of your turns.' },
      10: { name: 'Panther Spirit', text: 'While the panther is rampaging, you and the panther are invisible and can move through objects and terrain, which are difficult terrain for you both. A creature who ends their turn inside a solid object from moving this way is teleported to the last unoccupied space they previously occupied.' },
    },
  },

  {
    id: 'spider', name: 'Spider',
    role: 'Companion',
    keywords: ['Animal', 'Companion'],
    size: '1M', speed: '5', stability: '1', freeStrike: '1+M',
    movement: 'Climb',
    skills: ['Sneak'],
    characteristics: { Might: 2, Agility: 2, Reason: -1, Intuition: 2, Presence: 1 },
    abilities: [
      ab('Web Shot', {
        flavor: 'The spider fires a ball of sticky silk.',
        keywords: ['Companion', 'Ranged', 'Weapon'], type: 'Maneuver',
        distance: 'Ranged 5', target: 'One enemy',
        effect: 'If the target has M < AVERAGE, they are restrained until the end of their next turn.',
        resource: 'Ferocity', spendCost: 1, spend: 'If the target has M < STRONG, they are restrained (save ends).',
      }),
    ],
    traits: [
      { name: 'Come Into My Parlor', text: 'Whenever the spider makes a strike against a restrained creature, the spider deals extra poison damage equal to twice their Intuition score.' },
    ],
    advancements: {
      3:  { name: 'Dripping Fangs', text: 'Whenever the spider makes a strike against a creature while rampaging, the spider can deal extra poison damage equal to their Might score.' },
      6:  { name: 'Web Slinger', text: 'Once on each of your turns while the spider is rampaging, you can shoot a web to a ceiling, wall, or sturdy object above you within 5 squares as a free maneuver. You can then fly in a straight line to any space within 5 squares of that object.' },
      10: { name: 'Life Drinker', text: 'Whenever you or the spider deals damage with a maneuver while the spider is rampaging, the attacker regains Stamina equal to the damage dealt.' },
    },
  },

  {
    id: 'sporeling', name: 'Sporeling',
    role: 'Companion',
    keywords: ['Beast', 'Companion'],
    size: '1S', speed: '5', stability: '0', freeStrike: '1+M',
    immunity: 'Poison 3',
    skills: ['Track'],
    characteristics: { Might: 2, Agility: 2, Reason: -1, Intuition: 2, Presence: 1 },
    abilities: [
      ab('Spore Puff', {
        flavor: 'The sporeling breathes a cloud of disorienting fumes.',
        keywords: ['Companion', 'Melee'], type: 'Maneuver',
        distance: 'Melee 1', target: 'One enemy',
        effect: 'The target takes poison damage equal to 3 + the sporeling’s Might score, and the sporeling is invisible to the target until the end of the sporeling’s next turn or they deal damage to the target.',
        resource: 'Ferocity', spendCost: 1, spend: 'If the target has M < STRONG, they are dazed until the end of their next turn.',
      }),
    ],
    traits: [
      { name: 'Skulker', text: 'The sporeling can end their movement in an ally’s space. While occupying an ally’s space, the sporeling has cover.' },
    ],
    advancements: {
      3:  { name: 'Slowing Spores', text: 'Whenever the sporeling makes a strike against a creature while rampaging, the sporeling can cause the target to be slowed until the end of the target’s next turn.' },
      6:  { name: 'Plant Walk', text: 'Once on each of your turns while the sporeling is rampaging, you can teleport to a space within 15 squares as a free maneuver, provided the space or an adjacent space contains the sporeling or plants or fungus of size 1S or larger. You then gain an edge on the next strike you make before the end of your turn.' },
      10: { name: 'Trailing Mycelia', text: 'While the sporeling is rampaging, you and the sporeling sprout rootlike, gripping mycelia along your limbs, and whenever you or the sporeling makes a strike against a creature who has M < STRONG, the creature is grabbed by the attacker. Additionally, you and the sporeling can’t be force moved or knocked prone until the sporeling’s rampage ends.' },
    },
  },

  {
    id: 'wolf', name: 'Wolf',
    role: 'Companion',
    keywords: ['Animal', 'Companion'],
    size: '1M', speed: '7', stability: '1', freeStrike: '1+M',
    skills: ['Track'],
    characteristics: { Might: 2, Agility: 2, Reason: -1, Intuition: 2, Presence: 1 },
    abilities: [
      ab('Clamping Jaws', {
        flavor: 'With an unnerving growl, the wolf sinks powerful teeth into their quarry.',
        keywords: ['Companion', 'Melee', 'Weapon'], type: 'Maneuver',
        distance: 'Melee 1', target: 'One enemy',
        effect: 'The target takes damage equal to 3 + the wolf’s Might score, and if they have M < AVERAGE, they are grabbed by the wolf.',
        resource: 'Ferocity', spendCost: 1, spend: 'If the target has M < STRONG, they are grabbed by the wolf.',
      }),
    ],
    traits: [
      { name: 'Retriever', text: 'The wolf can move at full speed while they have a creature grabbed, no matter the grabbed creature’s size.' },
    ],
    advancements: {
      3:  { name: 'My, What Big Teeth You Have', text: 'Whenever the wolf makes a strike against a creature while rampaging, they can grab the target.' },
      6:  { name: 'Call of the Wild', text: 'While the wolf is rampaging, you and the wolf gain a +2 bonus to speed, and creatures within 5 squares can’t be hidden or have concealment from you or the wolf.' },
      10: { name: 'Dire Wolf', text: 'While the wolf is rampaging, you and the wolf are surrounded by an aura of dread, and enemies who start their turn adjacent to you or the wolf who have P < STRONG are frightened until the end of their next turn.' },
    },
  },
];

export const companionById = (id) => BEASTHEART_COMPANIONS.find((x) => x.id === id) || null;
