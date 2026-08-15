// data/summoner-minions.js — the Summoner's four circle portfolios: minions,
// fixtures (Summoner's Dominion, L2), champions (Portfolio Champion, L8), and
// the Summoner's Kit wards (L3/6/9 picks).
const ab = (name, props) => ({ name, ...props });

export const SUMMONER_PORTFOLIOS = {
  // ───── Circle of Blight — Demon Portfolio ─────
  blight: {
    label: 'Demon Portfolio',
    signature: [
      {
        id: 'ensnarer', name: 'Ensnarer',
        role: 'Signature Minion Brute',
        keywords: ['Abyssal', 'Demon'],
        cost: { essence: 1, count: 1 },
        size: '1M', speed: '5', stamina: '2', stability: '0', freeStrike: '2',
        weakness: 'Holy 1',
        characteristics: { Might: 2, Agility: 0, Reason: -1, Intuition: -1, Presence: -1 },
        flavor: 'This vaguely humanoid form is warped and distorted by a demon nestled inside them. They extend long tongues from multiple orifices to drag victims in close.',
        traits: [
          { name: 'Extended Barbed Strike', text: 'The ensnarer’s melee free strikes have a distance of 3 and inflict pull 1. The pull distance increases by 1 for each additional ensnarer striking the same target. Choose the ensnarer that the target is being pulled to before applying forced movement.' },
          { name: 'Soulsight', text: 'Each creature adjacent to the ensnarer can’t be hidden from them.' },
        ],
      },
      {
        id: 'rasquine', name: 'Rasquine',
        role: 'Signature Minion Ambusher',
        keywords: ['Abyssal', 'Demon'],
        cost: { essence: 1, count: 1 },
        size: '1S', speed: '4', stamina: '2', stability: '0', freeStrike: '2',
        weakness: 'Holy 1', movement: 'Teleport',
        characteristics: { Might: -1, Agility: 0, Reason: -1, Intuition: -1, Presence: 2 },
        flavor: 'The rasquine are skulking demons that shimmer in the light. They teleport into position before biting the necks of their prey.',
        traits: [
          { name: 'Skulker', text: 'Once per turn, the rasquine can hide as a free maneuver after teleporting.' },
          { name: 'Soulsight', text: 'Each creature adjacent to the rasquine can’t be hidden from them.' },
        ],
      },
      {
        id: 'razor', name: 'Razor',
        role: 'Signature Minion Harrier',
        keywords: ['Abyssal', 'Demon'],
        cost: { essence: 1, count: 1 },
        size: '1M', speed: '6', stamina: '2', stability: '0', freeStrike: '1',
        weakness: 'Holy 1',
        characteristics: { Might: 0, Agility: 2, Reason: -1, Intuition: -1, Presence: -1 },
        flavor: 'Razors appear to be a diminutive variant of the ruinant demon. Their bodies are swift, tumbling mounds of scarred flesh and deadly claws.',
        traits: [
          { name: 'Teeth!', text: 'Once per turn, whenever an adjacent enemy grabs the razor or uses a melee ability against them, that enemy takes 1 damage for each razor adjacent to them.' },
          { name: 'Soulsight', text: 'Each creature adjacent to the razor can’t be hidden from them.' },
        ],
      },
    ],
    t3: [
      {
        id: 'archer-spittlich', name: 'Archer Spittlich',
        role: '3-Essence Minion Artillery',
        keywords: ['Abyssal', 'Demon'],
        cost: { essence: 3, count: 2 },
        size: '1S', speed: '5', stamina: '5 | 5', stability: '2', freeStrike: '5', freeStrikeType: 'Poison',
        weakness: 'Holy 1',
        characteristics: { Might: 0, Agility: 2, Reason: -1, Intuition: -1, Presence: 0 },
        flavor: 'These minor demons resemble larger pitlings. They can spit a nerve-numbing phlegm at long distance that makes it easy to catch their next meal.',
        traits: [
          { name: 'Splash Strike', text: 'The spittlich’s ranged free strikes have a distance of 10 and deal 2 poison damage to an enemy adjacent to the target. Creatures that take poison damage from this spittlich can’t shift until the start of the spittlich’s next turn.' },
          { name: 'Soulsight', text: 'Each creature adjacent to the spittlich can’t be hidden from them.' },
        ],
      },
      {
        id: 'fanged-musilex', name: 'Fanged Musilex',
        role: '3-Essence Minion Brute',
        keywords: ['Abyssal', 'Demon'],
        cost: { essence: 3, count: 2 },
        size: '1L', speed: '6', stamina: '6 | 6', stability: '1', freeStrike: '5',
        weakness: 'Holy 1',
        characteristics: { Might: 2, Agility: 1, Reason: -1, Intuition: -1, Presence: 0 },
        flavor: 'Ensnarers knot and twist their bodies together to form heaving, heavy musilexes. They’re compelled to drag everything in toward their body.',
        traits: [
          { name: 'Mawful Strike', text: 'The musilex’s melee free strikes have a distance of 2 + R and inflict pull 2. The pull distance increases by 2 for each additional musilex striking the same target. Choose the musilex that the target is being pulled to before applying forced movement. If the target is pulled adjacent to the musilex, the musilex either deals an additional 2 damage or grabs them.' },
          { name: 'Soulsight', text: 'Each creature adjacent to the musilex can’t be hidden from them.' },
        ],
      },
      {
        id: 'twisted-bengrul', name: 'Twisted Bengrul',
        role: '3-Essence Minion Hexer',
        keywords: ['Abyssal', 'Demon'],
        cost: { essence: 3, count: 2 },
        size: '1L', speed: '5', stamina: '5 | 5', stability: '1', freeStrike: '4', freeStrikeType: 'Psychic',
        weakness: 'Holy 1',
        characteristics: { Might: 2, Agility: 1, Reason: -1, Intuition: -1, Presence: 0 },
        flavor: 'The bengrul is an undulating heap of glass and flesh. They shatter pieces of themselves to disrupt senses and inflict grisly wounds on their prey.',
        abilities: [
          ab('Mind Twist', {
            keywords: ['Magic', 'Ranged', 'Strike'], type: 'Main action',
            distance: 'Ranged 5', target: 'One creature or object per minion',
            powerRoll: 'Reason', tiers: [['≤11', '4 damage; P < WEAK, twisted (save ends)'], ['12–16', '6 damage; P < AVERAGE, twisted (save ends)'], ['17+', '8 damage; P < STRONG, twisted (save ends)']],
            effect: 'A twisted target can’t take advantage of edges or search for hidden creatures until the condition ends.',
          }),
        ],
        traits: [
          { name: 'Soulsight', text: 'Each creature adjacent to the ensnarer can’t be hidden from them.' },
        ],
      },
    ],
    t5: [
      {
        id: 'gushing-spewler', name: 'Gushing Spewler',
        role: '5-Essence Minion Controller',
        keywords: ['Abyssal', 'Demon'],
        cost: { essence: 5, count: 3 },
        size: '1M', speed: '5', stamina: '4 | 4 | 4', stability: '0', freeStrike: '3', freeStrikeType: 'Acid',
        weakness: 'Holy 1',
        characteristics: { Might: -2, Agility: 0, Reason: -1, Intuition: 3, Presence: 3 },
        flavor: 'A spewler’s mouth makes up most of its size. They unleash torrents of acid and bile from their pitless stomachs before consuming their prey with bag-like maws.',
        traits: [
          { name: 'Gushing Strike', text: 'The spewler’s ranged free strikes have a distance of 10 and slides the target R + 2 squares.' },
          { name: 'Spew Slide', text: 'Each time the spewler takes damage, the spewler shifts 2 after all effects resolve. Each square they exit during this movement is covered in slime until the end of the encounter. An enemy has a bane on strikes while occupying a slimed square.' },
          { name: 'Soulsight', text: 'Each creature adjacent to the spewler can’t be hidden from them.' },
        ],
      },
      {
        id: 'hulking-chimor', name: 'Hulking Chimor',
        role: '5-Essence Minion Defender',
        keywords: ['Abyssal', 'Demon'],
        cost: { essence: 5, count: 3 },
        size: '2', speed: '5', stamina: '7 | 7 | 7', stability: '3', freeStrike: '3',
        weakness: 'Holy 1',
        characteristics: { Might: 3, Agility: 0, Reason: 2, Intuition: 1, Presence: 1 },
        flavor: 'Chimors have no true shape; their bodies restructure and change endlessly. Pieces of the chimor demon snap off inside their prey, causing their bodies to also restructure from the inside out.',
        traits: [
          { name: 'Mercurial Strike', text: 'The chimor’s melee free strikes inflict M < WEAK, weakened (EoT). The potency is increased by the current round number.' },
          { name: 'Evershifting', text: 'The chimor doesn’t provoke opportunity attacks by moving.' },
          { name: 'Soulsight', text: 'Each creature adjacent to the chimor can’t be hidden from them.' },
        ],
      },
      {
        id: 'violent', name: 'Violent',
        role: '5-Essence Minion Ambusher',
        keywords: ['Abyssal', 'Demon'],
        cost: { essence: 5, count: 3 },
        size: '1M', speed: '7', stamina: '5 | 5 | 5', stability: '1', freeStrike: '4', freeStrikeType: 'Corruption',
        weakness: 'Holy 1', movement: 'Climb',
        characteristics: { Might: 2, Agility: 3, Reason: 0, Intuition: -1, Presence: -1 },
        flavor: 'The violents are lanky, oily bipeds with bright red flesh that contort and snap their bodies into unassuming objects. Their mimicry is particularly precise, to the point where it’s unclear whether their victims die from the surprise or the violent transformation process first.',
        traits: [
          { name: 'Transforming Strike', text: 'The violent’s melee free strikes deal an additional 2 damage to each adjacent enemy from whom they were hidden. The violent loses their disguise after striking.' },
          { name: 'Mimicry', text: 'The violent uses the Hide maneuver at the start of their turn as a free maneuver, disguising themselves as a size 1M or smaller object.' },
          { name: 'Soulsight', text: 'Each creature adjacent to the violent can’t be hidden from them.' },
        ],
      },
    ],
    t7: [
      {
        id: 'faded-blightling', name: 'Faded Blightling',
        role: '7-Essence Minion Support',
        keywords: ['Abyssal', 'Demon'],
        cost: { essence: 7, count: 2 },
        size: '1L', speed: '5', stamina: '17 | 17', stability: '0', freeStrike: '7', freeStrikeType: 'Corruption',
        weakness: 'Holy 1', movement: 'Fly',
        characteristics: { Might: 0, Agility: 0, Reason: -1, Intuition: 4, Presence: 3 },
        flavor: 'This cherubin creature is bloated and warped by demonic energy. The lights from their myriad eyes have all but gone out, now resembling pustules across their body.',
        abilities: [
          ab('Blighted Strike', {
            keywords: ['Magic', 'Ranged', 'Strike'], type: 'Main action',
            distance: 'Ranged 5', target: 'One creature or object per minion',
            powerRoll: 'Reason', tiers: [['≤11', '7 corruption damage; P < WEAK, bleeding (EoT)'], ['12–16', '11 corruption damage; P < AVERAGE, bleeding (EoT)'], ['17+', '16 corruption damage; P < STRONG, bleeding (EoT)']],
            effect: 'Instead of taking damage, you or an ally targeted by this ability impose a double bane on the next strike that targets them.',
          }),
        ],
        traits: [
          { name: 'Wilted Wings', text: 'The blightling must land on the ground at the end of their turn or fall prone.' },
          { name: 'Soulsight', text: 'Each creature adjacent to the blightling can’t be hidden from them.' },
        ],
      },
      {
        id: 'gorrre', name: 'Gorrre',
        role: '7-Essence Minion Brute',
        keywords: ['Abyssal', 'Demon'],
        cost: { essence: 7, count: 2 },
        size: '2', speed: '5', stamina: '17 | 17', stability: '2', freeStrike: '8',
        weakness: 'Holy 1',
        characteristics: { Might: 4, Agility: 3, Reason: 0, Intuition: -1, Presence: 0 },
        flavor: 'The gorrre demons evoke features of rhino and orangutan while clad in heavy armor. They’ve been utilized as jail guards by devils, as few prisoners can ever hope to outrun a monster with unlimited endurance.',
        traits: [
          { name: 'Gorrring Strike', text: 'The gorrre must charge before making a strike. The target is M < STRONG, knocked prone if the gorrre moved through an enemy or object other than the target during the charge.' },
          { name: 'Devastating Charge', text: 'The gorrre ignores difficult terrain while charging and destroys unattended, size 1 objects in their path. Each enemy they move through during a charge takes 3 damage.' },
          { name: 'Soulsight', text: 'Each creature adjacent to the gorrre can’t be hidden from them.' },
        ],
      },
      {
        id: 'vicisittante', name: 'Vicisittante',
        role: '7-Essence Minion Harrier',
        keywords: ['Abyssal', 'Demon'],
        cost: { essence: 7, count: 2 },
        size: '2', speed: '10', stamina: '17 | 17', stability: '0', freeStrike: '7', freeStrikeType: 'Psychic',
        weakness: 'Holy 1',
        characteristics: { Might: 3, Agility: 4, Reason: 0, Intuition: 0, Presence: -1 },
        flavor: 'It’s difficult to identify the base nature of a vicisittante apart from an ever-changing mass of burning flesh. Any surface they touch immediately scars as the demon leaves parts of themselves behind.',
        abilities: [
          ab('Cerebral Flay', {
            keywords: ['Melee', 'Psionic', 'Strike'], type: 'Main action',
            distance: 'Melee 1', target: 'One creature or object per minion',
            powerRoll: 'Reason', tiers: [['≤11', '7 psychic damage; P < WEAK, weakened (save ends)'], ['12–16', '11 psychic damage; P < AVERAGE, weakened (save ends)'], ['17+', '16 psychic damage; P < STRONG, weakened (save ends)']],
            effect: 'A target weakened by this ability is always considered flanked by the vicisittante regardless of position until the condition ends.',
          }),
        ],
        traits: [
          { name: 'Soulsight', text: 'Each creature adjacent to the vicisittante can’t be hidden from them.' },
        ],
      },
    ],
    fixture: {
      id: 'the-boil', name: 'The Boil',
      role: 'Fixture · Hazard Support',
      size: '2', stamina: '20 + your level',
      flavor: 'The boil arises from the chaotic depths of the Abyssal Waste, concentrated into a heaving mass by the pressure of a coherent reality. As it slushes and threatens to burst, the noises drive nearby demons into a frenzy.',
      traits: [
        { name: 'Hunger Thrush', text: 'Each enemy that starts their turn within 3 squares of the boil is I < AVERAGE, taunted (EoT) by the boil, or I < WEAK, taunted (EoT) by the boil and can’t move further from it.' },
        { name: 'Oh, It Pops', text: 'When the boil is destroyed, each enemy within 3 squares of the boil takes acid damage equal to your level and is A < STRONG, weakened (save ends).' },
      ],
      advancements: {
        5: { traits: [
          { name: 'Soul Rancor', text: 'You gain a surge the first time in a round that your demon minions deal 3 or more damage to a creature while you have line of effect to the boil. You can choose to give the surge to an ally who also has line of effect to the boil.' },
        ] },
        9: { traits: [
          { name: 'Size Increase', text: 'The boil is now size 3.' },
          { name: 'Fester Field', text: 'Each non-abyssal enemy that starts their turn within 3 squares of the boil takes 5 corruption damage.' },
        ] },
      },
    },
    champion: {
      id: 'demon-lords-aspect', name: 'Demon Lord’s Aspect',
      role: 'Champion',
      keywords: ['Abyssal', 'Demon'],
      cost: { essence: 9, count: 1 },
      size: '2', speed: '5', stamina: 'Your maximum Stamina', stability: '2', freeStrike: '9', freeStrikeType: 'Corruption',
      immunity: 'Corruption 5', movement: 'Teleport',
      characteristics: { Might: 2, Agility: 5, Reason: 5, Intuition: 2, Presence: 2 },
      flavor: 'Your champion is an Aspect of a demon lord. They have borne witness to your exploits and struck a deal with you: Allow their children to feed and you can call forth a modicum of their power. Morality is none of their concern, but certainly a hero is enough of an arbiter of whose souls deserve to be fed to demons, right?\n\nThe demon lord’s Aspect enjoys bringing enemies in close with their appendages or flinging victims and throwing them to the gnashing horde. They’re willing to put your connection to this world at risk if it means taking one more bite.',
      abilities: [
        ab('Grasping Appendages', {
          keywords: ['Melee', 'Strike', 'Weapon'], type: 'Main action',
          distance: 'Melee 5', target: 'Two creatures or objects',
          special: 'Power roll: 2d10 + 5.',
          tiers: [['≤11', '9 corruption damage; pull 2'], ['12–16', '12 corruption damage; pull 4'], ['17+', '14 corruption damage; pull 5']],
          effect: 'A target pulled adjacent to the Aspect is grabbed.',
        }),
        ab('I Like Your Taste', {
          type: 'Free triggered action', badge: 'TRIGGER',
          distance: 'Self', target: 'Self',
          trigger: 'The Aspect takes damage from an enemy.',
          effect: 'The Aspect has a double edge on their next power roll. They can choose to give this benefit to an ally within your Summoner\'s Range instead.',
        }),
      ],
      traits: [
        { name: 'Warping Strike', text: 'The Aspect’s free strikes teleport the target 5 squares.' },
        { name: 'Champion’s Ire', text: 'If the Aspect only targets one creature or object with a strike, they deal additional damage to the target equal to your Reason.' },
        { name: 'Frenzy', text: 'When the Aspect is reduced to 0 Stamina, they make a free strike against each adjacent enemy before dying.' },
      ],
      advancements: {
        10: {
          traits: [{ name: 'Size Increase', text: 'The Aspect is now size 3.' }],
          abilities: [
            ab('Reality Flense', {
              cost: 1, resource: 'Eidos', type: 'Champion Action',
              distance: '20 burst', target: 'Self and each non-minion ally in the area',
              effect: 'Each target teleports up to their speed and makes a free strike. If a target has a Save Ends condition, they can inflict the condition onto a creature with their strike and end the condition on themself.',
            }),
          ],
        },
      },
    },
  },

  // ───── Circle of Graves — Undead Portfolio ─────
  graves: {
    label: 'Undead Portfolio',
    signature: [
      {
        id: 'husk', name: 'Husk',
        role: 'Signature Minion Defender',
        keywords: ['Undead'],
        cost: { essence: 1, count: 1 },
        size: '1M', speed: '5', stamina: '3', stability: '1', freeStrike: '1', freeStrikeType: 'Corruption',
        immunity: 'Damage 2, corruption R, poison R',
        characteristics: { Might: 2, Agility: 0, Reason: -1, Intuition: -1, Presence: -1 },
        flavor: 'Husks have stiff corpses that snap and crackle with each sudden movement. Corrosive breath endlessly billows from their slackjawed faces.',
        traits: [
          { name: 'Rotting Strike', text: 'The husk’s melee free strikes inflict M < WEAK, slowed (EoT). The potency increases by 1 for each additional husk adjacent to the target (maximum +2).' },
        ],
      },
      {
        id: 'shrieker', name: 'Shrieker',
        role: 'Signature Minion Artillery',
        keywords: ['Undead'],
        cost: { essence: 1, count: 1 },
        size: '1M', speed: '4', stamina: '1', stability: '0', freeStrike: '2', freeStrikeType: 'Sonic',
        immunity: 'Corruption R, poison R',
        characteristics: { Might: -2, Agility: -2, Reason: 0, Intuition: 0, Presence: 2 },
        flavor: 'The shrieker expresses their unending pain in a way that can be heard and felt for miles. A white-hot fire smolders within each of their sunken eye sockets.',
        traits: [
          { name: 'Howling Strike', text: 'The shrieker’s ranged free strikes have a distance of 12.' },
          { name: 'Shrill Alarm', text: 'Each enemy within 2 squares of the shrieker can’t hide or be hidden.' },
        ],
      },
      {
        id: 'skeleton', name: 'Skeleton',
        role: 'Signature Minion Harrier',
        keywords: ['Undead'],
        cost: { essence: 1, count: 1 },
        size: '1M', speed: '6', stamina: '2', stability: '0', freeStrike: '1',
        immunity: 'Corruption R, poison R',
        characteristics: { Might: 2, Agility: 0, Reason: -1, Intuition: -1, Presence: -1 },
        flavor: 'These autonomous bone networks fall just short of replicating the structure they had in life. Skeleton bones are especially brittle and can splinter into huge shards when met with enough force.',
        traits: [
          { name: 'Bonetrops', text: 'When the skeleton is reduced to 0 Stamina, their square becomes difficult terrain for enemies. The first time any enemy enters this space, they take 2 damage and end this effect.' },
        ],
      },
    ],
    t3: [
      {
        id: 'grave-knight', name: 'Grave Knight',
        role: '3-Essence Minion Brute',
        keywords: ['Undead'],
        cost: { essence: 3, count: 2 },
        size: '1M', speed: '6', stamina: '6 | 6', stability: '1', freeStrike: '5',
        immunity: 'Corruption R, poison R',
        characteristics: { Might: 2, Agility: 1, Reason: 0, Intuition: 0, Presence: 1 },
        flavor: 'The grave knights are zombie warriors that continue to fight after death. Any blood spilled at a grave knight’s hand runs pitch black.',
        abilities: [
          ab('Knight Strike', {
            keywords: ['Melee', 'Strike', 'Weapon'], type: 'Main action',
            distance: 'Melee 1', target: 'One creature or object per minion',
            powerRoll: 'Reason', tiers: [['≤11', '5 corruption damage; M < WEAK, bleeding (EoT)'], ['12–16', '7 corruption damage; M < AVERAGE, bleeding (EoT)'], ['17+', '9 corruption damage; M < STRONG, bleeding (save ends)']],
          }),
        ],
        traits: [
          { name: 'To the Grave', text: 'When the grave knight is reduced to 0 Stamina, they can make a melee free strike before being destroyed.' },
        ],
      },
      {
        id: 'stalker-shade', name: 'Stalker Shade',
        role: '3-Essence Minion Ambusher',
        keywords: ['Undead'],
        cost: { essence: 3, count: 2 },
        size: '1M', speed: '5', stamina: '6 | 6', stability: '1', freeStrike: '5', freeStrikeType: 'Corruption',
        immunity: 'Corruption R, poison R', movement: 'Fly, hover',
        characteristics: { Might: -2, Agility: 1, Reason: 0, Intuition: 0, Presence: 2 },
        flavor: 'Shades are a form of umbral stalker that float free from any floor or surface. They can bend their appearance to completely vanish in the light.',
        traits: [
          { name: 'Shadow Strike', text: 'The stalker shade turns invisible, shifts 3 squares, and reappears after making a strike.' },
          { name: 'Shadow Phasing', text: 'The stalker shade can move through other creatures and objects at normal speed. The first time in a round that the stalker shade passes through a creature, that creature takes 2 corruption damage. The stalker shade doesn’t take damage from being force moved into objects.' },
        ],
      },
      {
        id: 'zombie-lumberer', name: 'Zombie Lumberer',
        role: '3-Essence Minion Defender',
        keywords: ['Undead'],
        cost: { essence: 3, count: 2 },
        size: '2', speed: '5', stamina: '8 | 8', stability: 'R', freeStrike: '1',
        immunity: 'Corruption R, poison R',
        characteristics: { Might: 2, Agility: -2, Reason: 0, Intuition: 0, Presence: 1 },
        flavor: 'These massive, animated ogre corpses still maintain their incredible grip strength. When a lumberer falls, they’ll take anything within reach down with them.',
        traits: [
          { name: 'Zombie Clutch', text: 'The lumberer’s melee free strikes inflict A < AVERAGE, grabbed. A creature or object that starts their turn grabbed by the lumberer takes corruption damage equal to your Reason.' },
          { name: 'Death Grasp', text: 'When the lumberer is reduced to 0 Stamina, they can latch onto an adjacent enemy before being destroyed. The enemy is M < STRONG, restrained (EoT).' },
        ],
      },
    ],
    t5: [
      {
        id: 'accursed-mummy', name: 'Accursed Mummy',
        role: '5-Essence Minion Hexer',
        keywords: ['Mummy', 'Undead'],
        cost: { essence: 5, count: 3 },
        size: '1M', speed: '5', stamina: '4 | 4 | 4', stability: '2', freeStrike: '3', freeStrikeType: 'Poison',
        immunity: 'Corruption R, poison R', weakness: 'Fire 1',
        characteristics: { Might: 2, Agility: -1, Reason: 1, Intuition: 3, Presence: -1 },
        flavor: 'The preserved dead, bound for eternal rest, know only violence when robbed of their future. Accursed mummies use their wrappings to bind others to the same fate.',
        abilities: [
          ab('Fetid Bindings', {
            keywords: ['Melee', 'Strike', 'Weapon'], type: 'Main action',
            distance: 'Melee R', target: 'One creature or object per minion',
            powerRoll: 'Reason', tiers: [['≤11', '3 poison damage; pull R'], ['12–16', '4 poison damage; pull R + 1'], ['17+', '6 poison damage; pull R + 2']],
            effect: 'A target pulled adjacent to the mummy is M < STRONG, weakened (EoT).',
          }),
        ],
        traits: [
          { name: 'Mummy Dust', text: 'Whenever the mummy takes damage, each enemy adjacent to the mummy takes 2 poison damage.' },
        ],
      },
      {
        id: 'ceaseless-mournling', name: 'Ceaseless Mournling',
        role: '5-Essence Minion Controller',
        keywords: ['Undead'],
        cost: { essence: 5, count: 3 },
        size: '2', speed: '4', stamina: '4 | 4 | 4', stability: 'R', freeStrike: '3', freeStrikeType: 'Sonic',
        immunity: 'Corruption R, poison R', movement: 'Burrow',
        characteristics: { Might: 3, Agility: 2, Reason: -1, Intuition: 1, Presence: -2 },
        flavor: 'Mournlings are hulking amalgams of mismatched cadavers with tear-stained trenches where their cheeks used to be. Their crying shakes enemies to their bone and renders them struggling to move.',
        traits: [
          { name: 'Always Crying', text: 'At the end of the mournling’s turn, each enemy within 1 of the mournling takes 2 sonic damage and can’t shift until the start of the mournling’s next turn.' },
          { name: 'Immutable Form', text: 'The mournling’s shape can’t change via any external effects.' },
          { name: 'Rupture', text: 'The first time the mournling burrows out of the ground on their turn, they can make a free strike against each adjacent enemy.' },
        ],
      },
      {
        id: 'phase-ghoul', name: 'Phase Ghoul',
        role: '5-Essence Minion Harrier',
        keywords: ['Undead'],
        cost: { essence: 5, count: 3 },
        size: '1M', speed: '5', stamina: '5 | 5 | 5', stability: '0', freeStrike: '3',
        immunity: 'Corruption R, poison R', movement: 'Teleport',
        characteristics: { Might: 2, Agility: 3, Reason: -2, Intuition: 0, Presence: 1 },
        flavor: 'Phase ghouls are bilocated undead caught between two different manifolds, rapidly flickering between them. They almost appear transparent save for their long, bright blue tongues that appears to lag behind their movements by a full second.',
        traits: [
          { name: 'Leaping Strike', text: 'The ghoul teleports 5 squares before making a melee free strike. The target is M < AVERAGE, knocked prone. If the target is in the air, the potency increases by 1.' },
          { name: 'Nerveless', text: 'The ghoul takes no damage from falling and always lands on their feet.' },
        ],
      },
    ],
    t7: [
      {
        id: 'false-vampire', name: 'False Vampire',
        role: '7-Essence Minion Brute',
        keywords: ['Undead'],
        cost: { essence: 7, count: 2 },
        size: '1L', speed: '6', stamina: '17 | 17', stability: '2', freeStrike: '8', freeStrikeType: 'Acid',
        immunity: 'Corruption R, poison R', movement: 'Climb',
        characteristics: { Might: 4, Agility: 1, Reason: 3, Intuition: 0, Presence: 0 },
        flavor: 'A false vampire is a bestial, bipedal ghoul that draws life from liquified remains. In death, their hands curl into thick hooks, their bodies turn a putrid red-green as if wearing a dress suit, and their mouth twists and extends into a large feeding needle that can pierce steel.',
        traits: [
          { name: 'Proboscis Strike', text: 'The false vampire’s melee free strikes have a distance of 2 and inflict M < AVERAGE, restrained (EoT). The false vampire can move the target while they are restrained this way. At the start of a restrained creature’s turn, they take acid damage equal to your Reason.' },
          { name: 'Bloodthirsty', text: 'The false vampire has a speed of 10 while a creature is bleeding within 10.' },
        ],
      },
      {
        id: 'phantom-of-the-ripper', name: 'Phantom of the Ripper',
        role: '7-Essence Minion Ambusher',
        keywords: ['Undead'],
        cost: { essence: 7, count: 2 },
        size: '1M', speed: '6', stamina: '17 | 17', stability: '1', freeStrike: '8',
        immunity: 'Corruption R, poison R', movement: 'Fly, hover',
        characteristics: { Might: 0, Agility: 4, Reason: 0, Intuition: 0, Presence: 3 },
        flavor: 'These phantoms puppet the remnants of their corporeal forms. Unlike other spirits, the ripper tears the reality around them and leaves behind distorted or uneven “bumps” in the air, which can affect stone, metal, and flesh.',
        abilities: [
          ab('Plunge of the Knife', {
            keywords: ['Melee', 'Strike', 'Weapon'], type: 'Main action',
            distance: 'Melee 1', target: 'One creature or object per minion',
            powerRoll: 'Reason', tiers: [['≤11', '8 damage; A < WEAK, slowed (save ends)'], ['12–16', '13 damage; A < AVERAGE, slowed (save ends)'], ['17+', '17 damage; A < STRONG, slowed (save ends)']],
            effect: 'The phantom deals an additional 3 damage if they have an edge.',
          }),
        ],
        traits: [
          { name: 'Ripping Phase', text: 'The phantom can move through other creatures and objects at normal speed. The first time in a round that the phantom passes through a creature, that creature takes 3 corruption damage and has a bane on their next strike. The phantom doesn’t take damage from being force moved into objects.' },
        ],
      },
      {
        id: 'zombie-titan', name: 'Zombie Titan',
        role: '7-Essence Minion Defender',
        keywords: ['Undead'],
        cost: { essence: 7, count: 1 },
        size: '4', speed: '4', stamina: '40', stability: 'R', freeStrike: '7',
        immunity: 'Corruption R, poison R',
        characteristics: { Might: 4, Agility: -3, Reason: 0, Intuition: 2, Presence: 3 },
        flavor: 'Zombie titan is a catchall for undead giants, patchwork ogres and mournlings, or amalgamations of a graveyard’s entire population. The titan lumbers and slumps across battlefields, wanting desperately to collapse and crash into the earth like a sea of flesh and bone.',
        traits: [
          { name: 'Big Stomp', text: 'The titan’s melee free strikes M < STRONG, knock the target prone.' },
          { name: 'Overwhelming Size', text: 'The titan can move through enemies at normal speed. If the titan ends their turn in a prone size 2 or smaller creature’s space, the creature can’t stand.' },
          { name: 'Flesh to Mountains', text: 'When the titan is reduced to 0 Stamina, their space becomes difficult terrain. If a creature was prone underneath the titan when the titan is killed, they take 10 damage and are restrained (save ends).' },
        ],
      },
    ],
    fixture: {
      id: 'barrow-gates', name: 'Barrow Gates',
      role: 'Fixture · Fortification Defender',
      size: '2', stamina: '20 + your level',
      flavor: 'Tall iron gates from the Necropolitan Ruins arise from the earth as wailing spirits swirl around its bars. The undead refuse to stop moving while near the threshold of oblivion.',
      traits: [
        { name: 'The Bell Tolls', text: 'Each enemy that starts their turn within 3 squares of the gates is I < AVERAGE, frightened (EoT) by the gates. The potency increases by 1 for winded enemies.' },
        { name: 'Undead Dominion', text: 'Each of your undead minions has damage immunity 2 while occupying a space within 3 squares of the gates.' },
      ],
      advancements: {
        5: { traits: [
          { name: 'Memento Mori', text: 'You gain a surge the first time in a round one of your undead minions unwillingly dies while you have line of effect to the gates. You can choose to give the surge to an ally who also has line of effect to the gates.' },
        ] },
        9: { traits: [
          { name: 'Size Increase', text: 'The gates are now size 3.' },
          { name: 'Open the Gates', text: 'You can use Rise! as a free triggered action each time an enemy dies within 3 squares of the gates while you have line of effect to the gates.' },
        ] },
      },
    },
    champion: {
      id: 'avatar-of-death', name: 'Avatar of Death',
      role: 'Champion',
      keywords: ['Undead'],
      cost: { essence: 9, count: 1 },
      size: '2', speed: '6', stamina: 'Your maximum Stamina', stability: '3', freeStrike: '9', freeStrikeType: 'Holy',
      immunity: 'Corruption 5, poison 5', movement: 'Fly',
      characteristics: { Might: 5, Agility: 2, Reason: 5, Intuition: 2, Presence: 2 },
      flavor: 'Your champion is an Avatar of death. The number of creatures you and your army have laid to rest now hangs above your head and threatens to crush your skull at any moment. You were unable to gain the power of the ultimate force of nature without a memento mori to keep you humble.\n\nThe Avatar of death weighs down their foes with conditions so their army can take care of the rest. If an enemy can’t handle it, well then maybe they should just die.',
      abilities: [
        ab('Culling Scythe', {
          keywords: ['Melee', 'Strike', 'Weapon'], type: 'Main action',
          distance: 'Melee 2', target: 'Two creatures or objects',
          special: 'Power roll: 2d10 + 5.',
          tiers: [['≤11', '9 corruption damage; M < WEAK, bleeding (save ends)'], ['12–16', '12 corruption damage; M < AVERAGE, bleeding (save ends)'], ['17+', '14 corruption damage; M < STRONG, bleeding (save ends)']],
          effect: 'If the target is a creature that isn’t a leader or a solo and they are still bleeding at the end of the encounter, they instantly die.',
        }),
        ab('Dust and Rot', {
          keywords: ['Area'], type: 'Free triggered action', badge: 'TRIGGER',
          distance: '1 burst', target: 'Each enemy in the burst',
          trigger: 'The Avatar takes damage.',
          effect: 'M < AVERAGE, weakened (EoT).',
        }),
      ],
      traits: [
        { name: 'Revelation Strike', text: 'The Avatar’s melee free strikes P < WEAK, instantly reduce a winded non-leader or solo creature to 0 Stamina, including targets winded by the strike.' },
        { name: 'Champion’s Ire', text: 'If the Avatar only targets one creature or object with a strike, they deal additional damage to the target equal to your Reason.' },
        { name: 'Drifting Spirit', text: 'The Avatar is unaffected by difficult terrain and damage from forced movement.' },
      ],
      advancements: {
        10: {
          traits: [{ name: 'Size Increase', text: 'The Avatar is now size 3.' }],
          abilities: [
            ab('Gravemaker', {
              cost: 1, resource: 'Eidos', type: 'Champion Action',
              keywords: ['Area', 'Magic', 'Ranged'],
              distance: '5 × 3 line within 1', target: 'Each enemy and object in the line',
              effect: '9 holy damage. Each target is vertically pulled a number of squares equal to their size straight down, ignoring stability. If the target would be force moved into the ground, they are buried beneath the ground instead.',
            }),
          ],
        },
      },
    },
  },

  // ───── Circle of Spring — Fey Portfolio ─────
  spring: {
    label: 'Fey Portfolio',
    signature: [
      {
        id: 'nixie-soakreed', name: 'Nixie Soakreed',
        role: 'Signature Minion Controller',
        keywords: ['Fey'],
        cost: { essence: 1, count: 1 },
        size: '1T', speed: '5', stamina: '1', stability: '0', freeStrike: '1',
        movement: 'Swim',
        characteristics: { Might: -2, Agility: -1, Reason: 0, Intuition: 2, Presence: 1 },
        flavor: 'These nixies are especially tiny. Their hair grows longer than their bodies and curls into reeds. The water soakreeds swim in tends to turn thick and cling to surfaces.',
        traits: [
          { name: 'Water Weird', text: 'Once per turn during their move action, each nixie under your control can teleport to a body of water within 5. The soakreed can’t teleport into water created by their own soaking bog.' },
          { name: 'Soaking Bog', text: 'The area within 1 square of the soakreed is filled with swampy water. An enemy that starts their turn in the area is A < WEAK, slowed (EoT). The potency increases by 1 for each additional soaking bog the target occupies (maximum +2).' },
          { name: 'Minuscule', text: 'The soakreed has cover while occupying a larger creature’s space.' },
        ],
      },
      {
        id: 'pixie-bellringer', name: 'Pixie Bellringer',
        role: 'Signature Minion Support',
        keywords: ['Fey'],
        cost: { essence: 1, count: 1 },
        size: '1T', speed: '5', stamina: '2', stability: '0', freeStrike: '1',
        movement: 'Fly, hover',
        characteristics: { Might: -3, Agility: 1, Reason: 0, Intuition: 0, Presence: 2 },
        flavor: 'The bellringers are glowing pixies that jingle as they fly. Historically, these pixies worked alongside bowman to ensure their arrows struck true.',
        traits: [
          { name: 'Ringing Strike', text: 'The bellringer’s free strikes grant an edge to the next strike made against the target, or a double edge if two or more bellringers strike the same target.' },
          { name: 'Fairy Chime', text: 'Each ally within 1 square of a bellringer has a +1 to saving throws. Each enemy within 1 square of a bellringer has a −1 to saving throws.' },
          { name: 'Minuscule', text: 'The bellringer has cover while occupying a larger creature’s space.' },
        ],
      },
      {
        id: 'sprite-dandeknight', name: 'Sprite Dandeknight',
        role: 'Signature Minion Harrier',
        keywords: ['Fey'],
        cost: { essence: 1, count: 1 },
        size: '1T', speed: '6', stamina: '2', stability: '0', freeStrike: '1',
        movement: 'Fly',
        characteristics: { Might: 2, Agility: 0, Reason: -1, Intuition: -1, Presence: -1 },
        flavor: 'Dandeknights are sprite warriors whose dragonfly wingbeats emit a tonal drone. They’re usually clad in tassels that shift color as they swing their weapons.',
        traits: [
          { name: 'Magic Strike', text: 'When the dandeknight strikes, you can choose one of the following damage types: acid, cold, corruption, fire, lightning, poison, or sonic. The strike deals that damage.' },
          { name: 'Staccato Swings', text: 'When the dandeknight makes a free strike, they can make two free strikes instead. The damage is added together and treated as a single strike if both strikes hit the same target.' },
          { name: 'Minuscule', text: 'The dandeknight has cover while occupying a larger creature’s space.' },
        ],
      },
    ],
    t3: [
      {
        id: 'pixie-hydrain', name: 'Pixie Hydrain',
        role: '3-Essence Minion Artillery',
        keywords: ['Fey'],
        cost: { essence: 3, count: 2 },
        size: '1T', speed: '5', stamina: '5 | 5', stability: '0', freeStrike: '5', freeStrikeType: 'Acid',
        immunity: 'Acid R', movement: 'Fly, hover',
        characteristics: { Might: -3, Agility: 0, Reason: 1, Intuition: 0, Presence: 2 },
        flavor: 'This pixie flies on a delicate array of vibrant flower petals for wings. The color drains from their wings as they call forth acid rain showers.',
        abilities: [
          ab('Burning/Healing Rain', {
            keywords: ['Magic', 'Ranged', 'Strike'], type: 'Main action',
            distance: 'Ranged 5', target: 'One creature or object per minion',
            powerRoll: 'Reason', tiers: [['≤11', '5 acid damage; M < WEAK, weakened (EoT)'], ['12–16', '7 acid damage; M < AVERAGE, weakened (EoT)'], ['17+', '9 acid damage; M < STRONG, weakened (save ends)']],
            effect: 'After the hydrain’s squad uses this ability, you or one ally within distance can spend a Recovery or end a condition.',
          }),
        ],
        traits: [
          { name: 'Minuscule', text: 'The hydrain has cover while occupying a larger creature’s space.' },
        ],
      },
      {
        id: 'pixie-loftlilly', name: 'Pixie Loftlilly',
        role: '3-Essence Minion Controller',
        keywords: ['Fey'],
        cost: { essence: 3, count: 2 },
        size: '1T', speed: '5', stamina: '5 | 5', stability: '0', freeStrike: '4', freeStrikeType: 'Poison',
        immunity: 'Poison R', movement: 'Fly, hover',
        characteristics: { Might: -2, Agility: 1, Reason: 0, Intuition: 0, Presence: 2 },
        flavor: 'Loftlillies lazily drift through the air in flower cups. They sip on toxic nectar to emit a powerful haze from their skin.',
        traits: [
          { name: 'Floating Toxins', text: 'The area within 1 square of the loftlilly causes each enemy and object with a size equal to your Reason or smaller to float 1 square off the ground until they leave the area. A floating enemy that can’t fly is unable to shift, moves 2 additional squares from forced movement, and has a bane on strikes.' },
          { name: 'Minuscule', text: 'The loftlilly has cover while occupying a larger creature’s space.' },
        ],
      },
      {
        id: 'sprite-orchiguard', name: 'Sprite Orchiguard',
        role: '3-Essence Minion Defender',
        keywords: ['Fey'],
        cost: { essence: 3, count: 2 },
        size: '1S', speed: '6', stamina: '8 | 8', stability: '2', freeStrike: '4',
        movement: 'Fly',
        characteristics: { Might: 2, Agility: 0, Reason: -1, Intuition: -1, Presence: -1 },
        flavor: 'The orchiguard is a sprite surrounded by a wheel of shields. They are usually crushed by the pressures of their own impenetrable defenses before ever being felled by enemy hands.',
        traits: [
          { name: 'Fairy Guard', text: 'Each non-orchiguard ally takes half damage from abilities while within 1 square of the orchiguard. Whenever the orchiguard reduces damage this way, they take damage equal to half their maximum Stamina and their free strike damage increases by 1.' },
          { name: 'Minuscule', text: 'The orchiguard has cover while occupying a larger creature’s space.' },
        ],
      },
    ],
    t5: [
      {
        id: 'nixie-hemloche', name: 'Nixie Hemloche',
        role: '5-Essence Minion Hexer',
        keywords: ['Fey'],
        cost: { essence: 5, count: 3 },
        size: '1T', speed: '6', stamina: '4 | 4 | 4', stability: '0', freeStrike: '3', freeStrikeType: 'Lightning',
        movement: 'Swim',
        characteristics: { Might: -2, Agility: 0, Reason: 1, Intuition: 3, Presence: 2 },
        flavor: 'Hemloches are spotted nixies whose long, wavy hair endlessly bobs and flows into the water surrounding them. Any sailor caught in a whirlpool created by hemloches knows that their ship won’t survive the encounter.',
        traits: [
          { name: 'Water Weird', text: 'Once per turn during their move action, each nixie under your control can teleport to a body of water within 6. The hemloche can’t teleport into water created by their own whirling waves.' },
          { name: 'Whirling Waves', text: 'The area within 1 square of the hemloche is filled with churning water and is considered difficult terrain. At the end of the hemloche’s turn, the hemloche can choose to slide each enemy in the affected area 3 squares. An enemy that takes damage while being force moved is also M < AVERAGE, knocked prone.' },
          { name: 'Minuscule', text: 'The hemloche has cover while occupying a larger creature’s space.' },
        ],
      },
      {
        id: 'sprite-foxglow', name: 'Sprite Foxglow',
        role: '5-Essence Minion Ambusher',
        keywords: ['Fey'],
        cost: { essence: 5, count: 3 },
        size: '1T', speed: '8', stamina: '5 | 5 | 5', stability: '0', freeStrike: '4', freeStrikeType: 'Fire',
        immunity: 'Fire R', movement: 'Fly',
        characteristics: { Might: -1, Agility: 3, Reason: 0, Intuition: 1, Presence: 2 },
        flavor: 'Foxglows are masked sprites that leave behind an evanescent trail of tiny glowing orbs as they fly. They beat their wings at a frequency that completely blocks out all nearby noise.',
        traits: [
          { name: 'Flash Strike', text: 'The foxglow’s melee strikes inflict I < STRONG, dazed (EoT) if they were hidden when they make the strike.' },
          { name: 'Quiet Flight', text: 'The area within 2 squares of the foxglow is completely silent. Each enemy has a bane on tests made to search for the foxglow and allies hidden in the affected area.' },
          { name: 'Minuscule', text: 'The foxglow has cover while occupying a larger creature’s space.' },
        ],
      },
      {
        id: 'pixie-rosenthall', name: 'Pixie Rosenthall',
        role: '5-Essence Minion Harrier',
        keywords: ['Fey', 'Swarm'],
        cost: { essence: 5, count: 3 },
        size: '2', speed: '6', stamina: '5 | 5 | 5', stability: '1', freeStrike: '3',
        movement: 'Fly, hover',
        characteristics: { Might: 0, Agility: 2, Reason: 4, Intuition: 0, Presence: 3 },
        flavor: 'The collective of blood-eyed pixie warriors that make up a rosenthall are also known as rosies. It’s said that some rosenthall armies contain thousands of pixies and can span half the length of a wode.',
        abilities: [
          ab('Stickerbush Symphony', {
            keywords: ['Melee', 'Strike', 'Weapon'], type: 'Main action',
            distance: 'Melee 2', target: 'One creature or object per minion',
            powerRoll: 'Reason', tiers: [['≤11', '3 damage; pull 2; A < WEAK, bleeding (EoT)'], ['12–16', '6 damage; pull 3; A < AVERAGE, bleeding (EoT)'], ['17+', '8 damage; pull 4; A < STRONG, bleeding (EoT)']],
            effect: 'A target can’t shift while bleeding from this ability.',
          }),
        ],
        traits: [
          { name: 'Swarm', text: 'The rosenthall can move through squares as if they were size 1T, and can occupy other creatures’ spaces. At the start of the rosenthall’s turn, they deal 2 damage to each enemy whose space they share.' },
        ],
      },
    ],
    t7: [
      {
        id: 'nixie-corallia', name: 'Nixie Corallia',
        role: '7-Essence Minion Support',
        keywords: ['Fey'],
        cost: { essence: 7, count: 2 },
        size: '1T', speed: '6', stamina: '17 | 17', stability: '0', freeStrike: '7', freeStrikeType: 'Lightning',
        immunity: 'Lightning R', movement: 'Swim',
        characteristics: { Might: -2, Agility: 3, Reason: 3, Intuition: 4, Presence: 1 },
        flavor: 'Corallias are saltwater nixies with coarse, coral-like skin and curly hair with hooked ends. Their salty tears are used to hallow places of worship and ward off demons.',
        traits: [
          { name: 'Water Weird', text: 'Once per turn during their move action, each nixie under your control can teleport to a body of water within 6. The corallia can’t teleport into water created by their own seafoam pool.' },
          { name: 'Seafoam Pool', text: 'The area within 2 squares of the corallia is filled with purifying saltwater that disables the effects of difficult terrain created by enemies. At the end of the corallia’s turn, the corallia can scrub you or an ally in the affected area and end one condition.' },
          { name: 'Minuscule', text: 'The corallia has cover while occupying a larger creature\'s space.' },
        ],
      },
      {
        id: 'pixie-belladonix', name: 'Pixie Belladonix',
        role: '7-Essence Minion Artillery',
        keywords: ['Fey'],
        cost: { essence: 7, count: 2 },
        size: '1T', speed: '6', stamina: '16 | 16', stability: '0', freeStrike: '8', freeStrikeType: 'Poison',
        immunity: 'Poison R', movement: 'Fly, hover',
        characteristics: { Might: -2, Agility: 2, Reason: 4, Intuition: 0, Presence: 4 },
        flavor: 'The belladonix are found among the elite guard of fey monarchs and carry themselves like royalty. Their moth-like wings ooze with vibrant colors and are barbed; the poison within threatening to completely shift the reality of their victims.',
        abilities: [
          ab('A Thorn, Woe to the Pricked', {
            keywords: ['Magic', 'Ranged', 'Strike'], type: 'Main action',
            distance: 'Ranged 15', target: 'One creature or object per minion',
            powerRoll: 'Reason', tiers: [['≤11', '8 poison damage; M < WEAK, restrained (save ends)'], ['12–16', '12 poison damage; M < AVERAGE, restrained (save ends)'], ['17+', '17 poison damage; M < STRONG, restrained (save ends)']],
            effect: 'A target restrained by this ability is trapped in a poison-fueled haze and considers each creature within 1 square of them to be an enemy until the condition ends.',
          }),
        ],
        traits: [
          { name: 'Minuscule', text: 'The belladonix has cover while occupying a larger creature’s space.' },
        ],
      },
      {
        id: 'sprite-olyender', name: 'Sprite Olyender',
        role: '7-Essence Minion Brute',
        keywords: ['Fey'],
        cost: { essence: 7, count: 2 },
        size: '1T', speed: '6', stamina: '17 | 17', stability: 'R', freeStrike: '8',
        movement: 'Fly',
        characteristics: { Might: 4, Agility: 3, Reason: 0, Intuition: 1, Presence: 2 },
        flavor: 'These brawny sprites wear heavy beetle armor and have a halo hovering away from their backs where their wings used to be. The faster the halo spins, the more power the olyender generates, enabling them to stand toe to toe with giants.',
        traits: [
          { name: 'Warrior’s Toss', text: 'The olyender’s melee strikes inflict push 4. If the target is force moved into an object, they are M < AVERAGE, knocked prone and can’t stand (save ends).' },
          { name: 'Use Their Might', text: 'When targeting a creature with a grab or forced movement, the olyender’s size is considered one larger than the target.' },
          { name: 'Minuscule', text: 'The olyender has cover while occupying a larger creature’s space.' },
        ],
      },
    ],
    fixture: {
      id: 'glade-pond', name: 'Glade Pond',
      role: 'Fixture · Hazard Ambusher',
      size: '2', stamina: '20 + your level',
      flavor: 'The vibrant waters of Arcadia pour through a hole in reality and pool into a verdant cup of paradise. As the pond babbles, it causes the surrounding flora to grow and provides the fey places to hide.',
      traits: [
        { name: 'Bubbling Boost', text: 'You and each non-minion ally that enters one or more squares within 3 squares of the pond or starts their turn there has their speed increased by 2 until the end of their turn.' },
        { name: 'Overgrowth', text: 'Each of your fey minions that ends their turn within 3 squares of the pond is hidden until the start of their next turn.' },
      ],
      advancements: {
        5: { traits: [
          { name: 'Garden of Jest', text: 'You can spend a Recovery the first time in a round a creature gains or starts their turn with a condition while you have line of effect to the pond. Alternatively, you can choose to enable an ally who also has line of effect to the boil to spend a Recovery instead.' },
        ] },
        9: { traits: [
          { name: 'Size Increase', text: 'The pond is now size 3.' },
          { name: 'Folly Field', text: 'Each non-fey enemy that starts their turn within 3 squares of the pond has a −1 penalty to saving throws and resisting potencies until the start of their next turn.' },
        ] },
      },
    },
    champion: {
      id: 'celestial-attendant', name: 'Celestial Attendant',
      role: 'Champion',
      keywords: ['Fey'],
      cost: { essence: 9, count: 1 },
      size: '2', speed: '7', stamina: 'Your maximum Stamina', stability: '0', freeStrike: '9', freeStrikeType: 'Poison',
      immunity: 'Damage 2', movement: 'Fly, hover',
      characteristics: { Might: 2, Agility: 2, Reason: 5, Intuition: 2, Presence: 5 },
      flavor: 'Your champion is an Attendant of a celestial. Whenever you call on their assistance, you must formally welcome and introduce them to the occasion. You can’t be certain if this is truly the blessing of a celestial you’ve previously allied yourself with, or if you’ve received someone else’s power—neither circumstance puts you in any less danger.\n\nThe celestial Attendant wants to swarm the map with pixies while limiting their foes’ ability to do anything about it. A single neurotoxic strike is all it takes to move everyone into position.',
      abilities: [
        ab('Pixie Swarm', {
          keywords: ['Magic', 'Ranged', 'Strike'], type: 'Main action',
          distance: 'Ranged 10', target: 'Two creatures or objects',
          special: 'Power roll: 2d10 + 5.',
          tiers: [['≤11', '9 damage; slide 3'], ['12–16', '12 damage; slide 5'], ['17+', '14 damage; slide 6']],
          effect: 'An ally targeted by this ability can, instead, spend a Recovery and shift the slide amount.',
        }),
        ab('Celestial Bell', {
          type: 'Free triggered action', badge: 'TRIGGER',
          distance: 'Self', target: 'Self',
          trigger: 'The Attendant takes damage from an enemy.',
          effect: 'The Attendant rings a bell, and you summon a signature minion into an unoccupied space adjacent to the Attendant.',
        }),
      ],
      traits: [
        { name: 'Neurotoxic Strike', text: 'A creature that takes damage from the Attendant’s free strike is I < AVERAGE, unable to establish line of effect beyond 3 squares (EoT).' },
        { name: 'Champion’s Ire', text: 'If the Attendant only targets one creature or object with a strike, they deal additional damage to the target equal to your Reason.' },
        { name: 'Pixie Bouquet', text: 'The Attendant starts their turn with temporary Stamina equal to 2 × the number of fey minions within 1 square of them. This temporary Stamina lasts until the start of their next turn.' },
      ],
      advancements: {
        10: {
          traits: [{ name: 'Size Increase', text: 'The Attendant is now size 3.' }],
          abilities: [
            ab('A Shower of Dust', {
              cost: 1, resource: 'Eidos', type: 'Champion Action',
              distance: '20 burst', target: 'Self and each non-minion ally in the area',
              effect: 'Each target gains 20 temporary Stamina and receives the benefits of one of your Flash Powder effects until the end of their next turn.',
            }),
          ],
        },
      },
    },
  },

  // ───── Circle of Storms — Elemental Portfolio ─────
  storms: {
    label: 'Elemental Portfolio',
    signature: [
      {
        id: 'elemental-mote', name: 'Elemental Mote',
        role: 'Signature Minion Hexer',
        keywords: ['Elemental'],
        cost: { essence: 1, count: 1 },
        size: '1T', speed: '5', stamina: '1', stability: '0', freeStrike: '1',
        movement: 'Fly',
        characteristics: { Might: 0, Agility: 0, Reason: 0, Intuition: 0, Presence: 2 },
        flavor: 'This near-pure form of autonomous essence just barely maintains their form. They can shift their nature to match their surroundings.',
        traits: [
          { name: 'Dweomer Burst', text: 'When the mote is reduced to 0 Stamina, each enemy adjacent to the mote has a bane on their next strike.' },
          { name: 'Catalyst', text: 'Once per turn, the mote can transform into an adjacent allied signature minion, maintaining their current Stamina. The minion must be reassigned to a new squad if their new name differs from the other squad members.\n\nAlternatively, you can spend 1 essence to transform the mote into any signature minion in the elemental portfolio you don’t have, as if you summoned the new minion into the mote’s space.' },
        ],
      },
      {
        id: 'brisk-gale', name: 'Brisk Gale',
        role: 'Signature Minion Harrier',
        keywords: ['Elemental (Air)'],
        cost: { essence: 1, count: 1 },
        size: '1S', speed: '5', stamina: '2', stability: '0', freeStrike: '1', freeStrikeType: 'Sonic',
        immunity: 'Sonic R', movement: 'Fly',
        characteristics: { Might: -2, Agility: 2, Reason: 0, Intuition: 0, Presence: 1 },
        flavor: 'The gales are twisting ribbons of cloud and debris endlessly dancing in place. They disrupt the air and allow their allies to move freely.',
        traits: [
          { name: 'Cutting the Air', text: 'The gale doesn’t provoke opportunity attacks by moving.' },
          { name: 'Whirlwind', text: 'When the gale is reduced to 0 Stamina, winds whip in their space until the end of the encounter. You or an ally that enters this space or starts their turn there can immediately shift (including vertically).' },
        ],
      },
      {
        id: 'fire-plume', name: 'Fire Plume',
        role: 'Signature Minion Artillery',
        keywords: ['Elemental (Fire)'],
        cost: { essence: 1, count: 1 },
        size: '1T', speed: '5', stamina: '1', stability: '0', freeStrike: '2', freeStrikeType: 'Fire',
        immunity: 'Fire R',
        characteristics: { Might: -2, Agility: 1, Reason: 0, Intuition: 0, Presence: 2 },
        flavor: 'A fire plume burns so bright that their true shape is hard to discern from the flames. They sputter and spit motes of fire in high arcs.',
        traits: [
          { name: 'Spitfire Strike', text: 'The plume’s ranged free strikes have a distance of 10.' },
          { name: 'Pyre', text: 'When the plume is reduced to 0 Stamina, their space becomes wreathed in flames until the end of the encounter. An enemy that enters this space or starts their turn there takes 2 fire damage.' },
        ],
      },
      {
        id: 'walking-boulder', name: 'Walking Boulder',
        role: 'Signature Minion Defender',
        keywords: ['Elemental (Earth)'],
        cost: { essence: 1, count: 1 },
        size: '2', speed: '4', stamina: '3', stability: 'R', freeStrike: '1',
        movement: 'Climb',
        characteristics: { Might: 2, Agility: -2, Reason: 0, Intuition: 0, Presence: 1 },
        flavor: 'These massive clods of animated stone roll upon smaller piles of rocks that could be perceived as limbs. Walking boulders are useful for taking up space and forming barricades.',
        traits: [
          { name: 'Obstruct', text: 'The boulder obstructs line of effect for enemies.' },
          { name: 'Pile Up', cost: '1 Essence', text: 'When one or more boulders is reduced to 0 Stamina, they each leave behind a stone wall equal to their size in their space until the end of the encounter.' },
        ],
      },
    ],
    t3: [
      {
        id: 'crux-of-ash', name: 'Crux of Ash',
        role: '3-Essence Minion Ambusher',
        keywords: ['Elemental (Fire, Air)'],
        cost: { essence: 3, count: 2 },
        size: '1M', speed: '5', stamina: '6 | 6', stability: '0', freeStrike: '5',
        immunity: 'Fire R, sonic R', movement: 'Fly',
        characteristics: { Might: -2, Agility: -2, Reason: 0, Intuition: 0, Presence: 1 },
        flavor: 'The crux is a curtain of billowing hot ash with an avian head. They cover their victims in a burning cloak of charcoal and soot.',
        traits: [
          { name: 'Soot Strike', text: 'The crux’s melee free strikes M < AVERAGE, automatically hide each ally from the target until the start of the crux’s next turn, until the target uses a maneuver to clear the soot, until the crux takes damage, or until the crux is destroyed.' },
          { name: 'Ashen Cloud', cost: '1 Essence', text: 'When the crux is reduced to 0 Stamina, the area within 1 square of the crux is clouded by ash until it is dispersed by wind. You or any ally are concealed while occupying an affected square. An enemy can’t establish line of effect beyond the ash while occupying an affected square.' },
        ],
      },
      {
        id: 'flow-of-magma', name: 'Flow of Magma',
        role: '3-Essence Minion Harrier',
        keywords: ['Elemental (Fire, Earth)'],
        cost: { essence: 3, count: 2 },
        size: '1L', speed: '5', stamina: '6 | 6', stability: '2', freeStrike: '4', freeStrikeType: 'Fire',
        immunity: 'Fire R', movement: 'Climb',
        characteristics: { Might: 2, Agility: -2, Reason: 0, Intuition: 0, Presence: 1 },
        flavor: 'This elemental is a long, serpentine creature of heated rock. Flows of magma drool trails of lava from their fangs after biting their prey.',
        abilities: [
          ab('Molten Strike', {
            keywords: ['Magic', 'Melee', 'Strike'], type: 'Main action',
            distance: 'Melee 2', target: 'One creature or object per minion',
            powerRoll: 'Reason', tiers: [['≤11', '4 fire damage; shift 3'], ['12–16', '6 fire damage; shift 4'], ['17+', '8 fire damage; shift 5']],
            effect: 'Each square that the flow shifts into becomes wreathed in flames until the start of the flow’s next turn. An enemy that enters an affected square takes 2 damage.',
          }),
        ],
        traits: [
          { name: 'Eruption', cost: '1 Essence', text: 'When the flow is reduced to 0 Stamina, they launch lava into an area equal to 1 + their size within 5 squares. The affected area becomes difficult terrain for enemies until the end of the encounter. An enemy that enters an affected square or starts their turn there takes A < AVERAGE, 4 fire damage.' },
        ],
      },
      {
        id: 'desolation-of-sand', name: 'Desolation of Sand',
        role: '3-Essence Minion Hexer',
        keywords: ['Elemental (Air, Earth)'],
        cost: { essence: 3, count: 2 },
        size: '1M', speed: '5', stamina: '5 | 5', stability: '1', freeStrike: '4',
        immunity: 'Sonic R', movement: 'Burrow',
        characteristics: { Might: 1, Agility: 2, Reason: 0, Intuition: 0, Presence: -2 },
        flavor: 'The desolations have vaguely humanoid sand forms with no legs. Their glass hose “arms” shift and bristle before firing high pressure streams of sand at their foes.',
        traits: [
          { name: 'Burying Strike', text: 'The desolation’s free strikes inflict M < AVERAGE, slowed (save ends). If the target is already slowed, then they are M < STRONG, restrained (EoT).' },
          { name: 'Sand Through Your Fingers', text: 'The desolation doesn’t provoke opportunity attacks by moving.' },
          { name: 'Shifting Sand Pit', cost: '1 Essence', text: 'When the desolation is reduced to 0 Stamina, the area within 1 square of the desolation becomes difficult terrain for enemies until the end of the encounter. You or an ally that enters the affected area can immediately shift 3.' },
        ],
      },
    ],
    t5: [
      {
        id: 'dancing-silk', name: 'Dancing Silk',
        role: '5-Essence Minion Controller',
        keywords: ['Elemental (Earth, Air, Green)'],
        cost: { essence: 5, count: 3 },
        size: '1T', speed: '5', stamina: '4 | 4 | 4', stability: '0', freeStrike: '3',
        immunity: 'Poison R', movement: 'Fly',
        characteristics: { Might: -1, Agility: 2, Reason: 3, Intuition: 0, Presence: -1 },
        flavor: 'The silks are akin to baby spiders ballooning through the air on strands of webbing. They spin silk from their legs as they fly, eventually turning huge swaths of the environment into tangled web mazes.',
        traits: [
          { name: 'Entangling Strike', text: 'The silk’s ranged free strikes inflict A < AVERAGE, restrained (EoT). Each creature adjacent to the target is A < WEAK, slowed (EoT).' },
          { name: 'Web', cost: '1 Essence', text: 'When the silk is reduced to 0 Stamina, they launch ribbons of webbing into an area equal to their size + 1 within 5 before being destroyed. The affected area is considered difficult terrain for enemies until the end of the encounter. An enemy that ends their turn in the webbing is M < STRONG, slowed (EoT).' },
        ],
      },
      {
        id: 'principle-of-the-swamp', name: 'Principle of the Swamp',
        role: '5-Essence Minion Brute',
        keywords: ['Elemental (Green, Water, Rot)'],
        cost: { essence: 5, count: 3 },
        size: '2', speed: '4', stamina: '5 | 5 | 5', stability: 'R', freeStrike: '4',
        immunity: 'Corruption R, poison R', movement: 'Swim',
        characteristics: { Might: 3, Agility: -2, Reason: 0, Intuition: 2, Presence: -2 },
        flavor: 'The manes of these equine sludge dwellers extend and hook into things like strong, fraying arms. This allows the principle of the swamp to either pull themselves onto dry land, or pull their prey into the dank depths.',
        traits: [
          { name: 'Encroaching Strike', text: 'The principle’s melee free strikes have a distance of R and inflict M < STRONG, grabbed. The principle can have an unlimited number of creatures or objects grabbed. A creature grabbed by this strike still has their normal speed, but can’t move farther away from the principle.' },
          { name: 'Sludgefoot', cost: '1 Essence', text: 'When the principle is reduced to 0 Stamina, the area within 1 square of the principle becomes difficult terrain for enemies until the end of the encounter. An enemy that ends their turn in the affected area is pulled 4 toward the center of the area.' },
        ],
      },
      {
        id: 'quiet-of-snow', name: 'Quiet of Snow',
        role: '5-Essence Minion Artillery',
        keywords: ['Elemental (Air, Rot, Water)'],
        cost: { essence: 5, count: 3 },
        size: '1S', speed: '5', stamina: '4 | 4 | 4', stability: '1', freeStrike: '4', freeStrikeType: 'Cold',
        immunity: 'Sonic R, cold R', movement: 'Fly, hover',
        characteristics: { Might: -1, Agility: 2, Reason: 0, Intuition: 0, Presence: 3 },
        flavor: 'This elemental is a pure-white vulpine with six legs that freely sprints through the air. Their howls are telepathic, washing over the receivers with a strong chill and a wave of goosebumps.',
        abilities: [
          ab('Freezing Howl', {
            keywords: ['Magic', 'Ranged', 'Strike'], type: 'Main action',
            distance: 'Ranged 5', target: 'One creature or object per minion',
            powerRoll: 'Reason', tiers: [['≤11', '4 cold damage; M < WEAK, slowed (EoT)'], ['12–16', '6 cold damage; M < AVERAGE, slowed (EoT)'], ['17+', '8 cold damage; M < STRONG, speed is 0 (EoT)']],
            effect: 'Frost slows the enemy down, allowing one ally adjacent to each target to shift 2 and either hide or defend.',
          }),
        ],
        traits: [
          { name: 'Cold Surge', text: 'When the quiet is reduced to 0 Stamina, they launch a refreshing blast of air into an area equal to their size + 1 within 5 before being destroyed. Each ally in the affected area gains a surge.' },
        ],
      },
    ],
    t7: [
      {
        id: 'iron-reaver', name: 'Iron Reaver',
        role: '7-Essence Minion Harrier',
        keywords: ['Elemental (Earth, Fire, Void)'],
        cost: { essence: 7, count: 3 },
        size: '1L', speed: '6', stamina: '10 | 10 | 10', stability: 'R', freeStrike: '6',
        immunity: 'Poison R', movement: 'Burrow',
        characteristics: { Might: 3, Agility: 4, Reason: 0, Intuition: 0, Presence: -1 },
        flavor: 'Iron reavers are long, gnashing lines of centipede-like bladed legs. Their bodies endlessly shed metal shavings and hard sheets of iron as they move.',
        traits: [
          { name: 'Decentralized Segments', text: 'The reaver has cover while adjacent to another reaver they were summoned with. Whenever they receive an effect that allows them to move or shift outside of their move action, they share the effect with each adjacent reaver they were summoned with.' },
          { name: 'Bladed Strike', text: 'The reaver’s free strikes inflict M < WEAK, bleeding (save ends). Each time the reaver inflicts bleeding on a creature, they can shift 2 and make an additional free strike on a new target.' },
          { name: 'Iron Barricade', cost: '1 Essence', text: 'When the reaver is reduced to 0 Stamina, they create a line equal to 2 × their size centered on their space of iron shards on the ground until the end of the encounter. You or any ally has cover and damage immunity 2 while occupying an affected square.' },
        ],
      },
      {
        id: 'knight-of-blood', name: 'Knight of Blood',
        role: '7-Essence Minion Controller',
        keywords: ['Elemental (Earth, Fire, Rot, Water)'],
        cost: { essence: 7, count: 2 },
        size: '1L', speed: '6', stamina: '16 | 16', stability: 'R', freeStrike: '7', freeStrikeType: 'Corruption',
        immunity: 'Corruption R',
        characteristics: { Might: 4, Agility: 2, Reason: 0, Intuition: 0, Presence: 3 },
        flavor: 'These faceless suits of armor have visible rivers of deep red blood flowing throughout their being. Their blood has a powerful pull to it, causing any open wounds nearby to rip deeper and leak toward the knight.',
        traits: [
          { name: 'Scarlet Death', text: 'The knight’s melee strikes inflict P < STRONG, bleeding (save ends). While bleeding this way, the target can’t roll lower than a 3 on the die used to resolve bleeding damage.' },
          { name: 'Red River', cost: '2 Essence', text: 'When the knight is reduced to 0 Stamina, they move up to their speed ignoring opportunity attacks. Each square that they exit during this movement pools with blood until the end of the encounter. Each affected square is considered difficult terrain for enemies and deals 3 corruption damage to an enemy when they first enter it on a turn. Whenever a bleeding enemy starts their turn within 10 squares of the blood pool, they are pulled 2 toward the nearest affected square, ignoring stability.' },
        ],
      },
      {
        id: 'light-of-the-sun', name: 'Light of the Sun',
        role: '7-Essence Minion Support',
        keywords: ['Elemental (Air, Green, Fire, Void)'],
        cost: { essence: 7, count: 2 },
        size: '2', speed: '6', stamina: '17 | 17', stability: '0', freeStrike: '7', freeStrikeType: 'Fire',
        immunity: 'Corruption R, fire R', movement: 'Fly',
        characteristics: { Might: 0, Agility: 2, Reason: 4, Intuition: 0, Presence: 3 },
        flavor: 'These elementals are blazing white avian-shaped beings that are nearly impossible to perceive directly. Between a light of the sun’s talons is a massive glowing sword that can split the heaviest of defenses asunder.',
        abilities: [
          ab('Solar Blade', {
            keywords: ['Magic', 'Melee', 'Strike'], type: 'Main action',
            distance: 'Melee 1', target: 'One creature or object per minion',
            powerRoll: 'Reason', tiers: [['≤11', '7 fire damage; I < WEAK, dazed (EoT)'], ['12–16', '11 fire damage; I < AVERAGE, dazed (EoT)'], ['17+', '16 fire damage; I < STRONG, dazed (save ends)']],
            effect: 'A target dazed by this ability has their stability reduced to 0 until the condition ends.',
          }),
        ],
        traits: [
          { name: 'Radiant Field', cost: '2 Essence', text: 'When the light is reduced to 0 Stamina, the area within 1 square of the light becomes wreathed in sentient flames until the end of the encounter. An enemy that enters this area or starts their turn there takes 3 fire damage and is slowed (EoT). You or any ally that enters this area or starts their turn there gains 5 temporary Stamina and their speed increases by 2 until the end of their turn.' },
        ],
      },
    ],
    fixture: {
      id: 'primordial-crystal', name: 'Primordial Crystal',
      role: 'Fixture · Relic Artillery',
      size: '2', stamina: '20 + your level',
      flavor: 'The storm of elements from Quintessence coalesce into a hardened, crystalline structure. It magnifies the elemental composition of any matter that passes through it and emits supernatural colors while doing so.',
      traits: [
        { name: 'Magnetic Pull', text: 'Each enemy that starts their turn within 3 squares of the crystal is vertically pulled 3.' },
        { name: 'Elemental Boost', text: 'When you or an ally uses a ranged ability that draws a line through the crystal, the distance increases by 5.' },
      ],
      advancements: {
        5: { traits: [
          { name: 'Terra Resonance', text: 'Each round, you gain a surge the first time an area of terrain gains a supernatural effect (excluding auras) while you have line of effect to the crystal. You can choose to give the surge to an ally who also has line of effect to the crystal.' },
        ] },
        9: { traits: [
          { name: 'Size Increase', text: 'The crystal is now size 3.' },
          { name: 'Magnified Strike', text: 'When you or an ally makes a ranged strike that draws a line through the crystal, the user gains a surge which they can use on the ability.' },
        ] },
      },
    },
    champion: {
      id: 'dragons-portent', name: 'Dragon’s Portent',
      role: 'Champion',
      keywords: ['Dragon', 'Elemental'],
      cost: { essence: 9, count: 1 },
      size: '2', speed: '6', stamina: 'Your maximum Stamina', stability: '4', freeStrike: '9', freeStrikeType: 'Affinity',
      immunity: 'Affinity 5', movement: 'Fly',
      characteristics: { Might: 2, Agility: 2, Reason: 5, Intuition: 5, Presence: 2 },
      flavor: 'Your champion is a Portent of a dragon yet to manifest. Through defending the innocent, you have made yourself and your elementals a close neighbor to the malice that threatens them. The dragon desires you bring their creation about and lends you strength to see your justice through.\n\nAs a harbinger of ruin, the dragon’s Portent has incredibly potent impact and control of the environment. Their final shape has yet to be determined; use this to your advantage and call upon the affinity that will end conflict the quickest.',
      abilities: [
        ab('Elemental Tail Swing', {
          keywords: ['Charge', 'Melee', 'Strike', 'Weapon'], type: 'Main action',
          distance: 'Melee 2', target: 'Two creatures or objects',
          special: 'Power roll: 2d10 + 5.',
          tiers: [['≤11', '9 affinity damage; push 2'], ['12–16', '12 affinity damage; push 4'], ['17+', '14 affinity damage; push 6']],
        }),
      ],
      traits: [
        { name: 'Affinity', text: 'The Portent selects an affinity for one of the following damage types when they are summoned: acid, cold, corruption, fire, lightning, or poison. This type determines the Portent’s affinity immunity and the damage type of their abilities.' },
        { name: 'Sealing Strike', text: 'The Portent’s free strikes inflict M < STRONG, slowed (save ends). While slowed this way, the target takes 1d6 affinity damage at the start of each of their turns.' },
        { name: 'Champion’s Ire', text: 'If the Portent only targets one creature or object with a strike, they deal additional damage to the target equal to your Reason.' },
        { name: 'Searing Wyrmscale', text: 'Whenever an adjacent creature deals damage to the Portent, they take 4 affinity damage.' },
        { name: 'Dragon Heart', text: 'Once per turn, the Portent can take 10 damage to allow you or an ally within your Summoner’s Range to gain 1 heroic resource. This damage can’t be reduced in any way.' },
      ],
      advancements: {
        10: {
          traits: [{ name: 'Size Increase', text: 'The Portent is now size 3.' }],
          abilities: [
            ab('A Breath Felt in a Hurricane', {
              cost: 1, resource: 'Eidos', type: 'Champion Action',
              keywords: ['Area', 'Magic', 'Ranged'],
              distance: '4 cube within 10', target: 'Each enemy and object in the area',
              effect: '9 affinity damage. The damage ignores immunity.\n\nThe affected area becomes difficult terrain. An enemy has affinity weakness 5 while occupying an affected square.',
            }),
          ],
        },
      },
    },
  },
};

export function minionById(id) {
  for (const key of Object.keys(SUMMONER_PORTFOLIOS)) {
    const p = SUMMONER_PORTFOLIOS[key];
    for (const tier of ['signature', 't3', 't5', 't7']) {
      const found = (p[tier] || []).find(m => m.id === id);
      if (found) return found;
    }
    if (p.fixture && p.fixture.id === id) return p.fixture;
    if (p.champion && p.champion.id === id) return p.champion;
  }
  return null;
}

export const SUMMONER_WARDS = [
  { id: 'conjured-ward', name: 'Conjured Ward', text: 'You are clad in the natural defenses of your portfolio (bones, fairy wood, stone, writhing flesh). You gain a +3 bonus to Stamina and that bonus increases by 3 at 4th, 7th, and 10th levels.', bonuses: { sta_per: 3 } },
  { id: 'emergency-ward', name: 'Emergency Ward', text: 'The first time each round you take damage, you can use a free triggered action to shift 1 after the triggering effect resolves and summon a signature minion into the square you left (as long as there is enough space).' },
  { id: 'howling-ward', name: 'Howling Ward', text: 'You create a 1-aura vortex of slicing magic around you when you enter combat. An enemy that starts their turn adjacent to you takes damage equal to your Reason.' },
  { id: 'snare-ward', name: 'Snare Ward', text: 'Whenever an adjacent creature deals damage to you, you can use a free triggered action to pull that creature toward one of your minions within your Summoner’s Range a number of squares equal to your Reason score.' },
];

export function collectMinionIds(character) {
  const cc = character?.cclass || {};
  const ids = [...((cc.minions && cc.minions.sig) || []), ...((cc.minions && cc.minions.t3) || [])];
  for (const lvl of [2, 5]) {
    const picks = character?.levelChoices?.[lvl]?.picks || {};
    const pick = picks['portfolio-minion-' + lvl];
    if (pick) ids.push(typeof pick === 'string' ? pick : pick.id);
  }
  return ids;
}
