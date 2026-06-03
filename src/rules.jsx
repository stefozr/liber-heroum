import React from 'react';
// rules.jsx — Default maneuvers + full rules glossary sourced from rules.pdf.
// Exports to window: DS_MANEUVERS, DS_RULES, ManeuversPanel, RulesGlossary.

// ─────────────────────────────────────────────────────────────────────────────
// Maneuvers — every creature can take these
// ─────────────────────────────────────────────────────────────────────────────
const DS_MANEUVERS = [
  {
    name: 'Aid Attack',
    blurb: 'Choose an adjacent enemy. The next ability power roll an ally makes against them before the start of your next turn has an edge.',
  },
  {
    name: 'Catch Breath',
    blurb: 'Spend a Recovery.',
  },
  {
    name: 'Escape Grab',
    keywords: ['Maneuver'],
    distance: 'Self',
    target: 'Self',
    roll: '+ M or A',
    tiers: {
      t1: 'No effect.',
      t2: 'You can escape the grab, but if you do, a creature who has you grabbed can make a melee free strike against you before you are no longer grabbed.',
      t3: 'You are no longer grabbed.',
    },
    effect: 'You take a bane on this maneuver if your size is smaller than the size of the creature, object, or effect that has you grabbed.',
  },
  {
    name: 'Grab',
    keywords: ['Melee', 'Weapon', 'Maneuver'],
    distance: 'Melee 1',
    target: 'One creature',
    roll: '+ M',
    tiers: {
      t1: 'No effect.',
      t2: 'You can grab the target, but if you do, the target can make a melee free strike against you before they are grabbed.',
      t3: 'The target is grabbed by you.',
    },
    effect: 'You can usually target only creatures of your size or smaller. If your Might score is 2 or higher, you can target any creature with a size equal to or less than your Might score. Unless otherwise indicated, a creature can grab only one creature at a time.',
  },
  {
    name: 'Hide',
    blurb: 'You become hidden from creatures who aren\u2019t observing you while you have cover or concealment from them.',
  },
  {
    name: 'Knockback',
    keywords: ['Melee', 'Weapon', 'Maneuver'],
    distance: 'Melee 1',
    target: 'One creature',
    roll: '+ M',
    tiers: {
      t1: 'Push 1',
      t2: 'Push 2',
      t3: 'Push 3',
    },
    effect: 'You can usually target only creatures of your size or smaller. If your Might score is 2 or higher, you can target any creature with a size equal to or less than your Might score.',
  },
  {
    name: 'Stand Up',
    blurb: 'You stand up from prone, ending that condition. Alternatively, you can use this maneuver to make an adjacent prone creature stand up.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Rules glossary — sectioned, each entry has { name, text }.
// text may be a string or array of strings (rendered as paragraphs).
// ─────────────────────────────────────────────────────────────────────────────
const DS_RULES = [
  {
    id: 'basics', title: 'The Basics',
    entries: [
      { name: 'Characteristics', text: 'Your Might, Agility, Reason, Intuition, and Presence are your characteristic scores — measures of mental and physical power.' },
      { name: 'Power Roll', text: 'Most abilities and all tests require you to roll 2d10 and add a characteristic. Each power roll has three tiers of outcome. Tier 1 is a result of 11 or lower. Tier 2 is a result of 12 to 16. Tier 3 is a result of 17 or higher.' },
      { name: 'Natural 19 or 20', text: 'A result of 19 or 20 rolled on the dice without a modifier (a Critical Hit) is always a Tier 3 result, no matter the modifiers.' },
      { name: 'Recovery', text: 'You can spend a Recovery to regain Stamina equal to your recovery value. Only heroes have Recoveries.' },
      { name: 'Respite', text: 'An uninterrupted rest for 24 hours in a safe place, at the end of which you regain all your Recoveries and Stamina and your Victories are converted into XP.' },
      { name: 'Skill', text: 'If you have at least one skill that applies to a test (not an ability roll), you gain a +2 bonus to it.' },
      { name: 'Victories', text: 'When you successfully overcome challenges such as combat in an adventure, you earn Victories.' },
    ],
  },
  {
    id: 'edges-banes', title: 'Edges & Banes',
    entries: [
      { name: 'Edge', text: 'If you have a situational advantage (edge) on a power roll, the roll gains +2.' },
      { name: 'Double Edge', text: 'If you have two or more edges, the roll is one tier higher instead.' },
      { name: 'Bane', text: 'If you have a situational disadvantage (bane) on a power roll, the roll gains \u22122.' },
      { name: 'Double Bane', text: 'If you have two or more banes, the roll is one tier lower instead.' },
      { name: 'Stacking', text: [
        'If you have an edge and a bane (or a double edge and a double bane), the roll is made normally without any edges or banes.',
        'If you have a double edge and a bane, the roll has one edge.',
        'If you have a double bane and an edge, the roll has one bane.',
      ]},
    ],
  },
  {
    id: 'hero-tokens', title: 'Hero Tokens',
    entries: [
      { name: 'Pool', text: 'Your Director will set out hero tokens in a shared pool at the start of each session.' },
      { name: 'Spend 1 token', text: [
        'Gain 2 surges.',
        'When you fail a saving throw, succeed on the save instead.',
        'Reroll a test. You must use the new roll.',
      ]},
      { name: 'Spend 2 tokens', text: 'On your turn or after you take damage (no action required), regain Stamina equal to your Recovery value.' },
    ],
  },
  {
    id: 'combat', title: 'Combat',
    entries: [
      { name: 'Combat Turn', text: 'On your turn in combat you can take a main action, a move action, and a maneuver. You can turn your action into an additional move action or maneuver. There is no limit to the number of free maneuvers you can take.' },
      { name: 'Triggered Action', text: 'You can take one triggered action per round when the trigger happens. There is no limit to the number of free triggered actions you can take.' },
    ],
  },
  {
    id: 'main-actions', title: 'Main Actions',
    intro: 'Any creature can take the following main actions, in addition to those listed in their stats.',
    entries: [
      { name: 'Charge', text: 'Move up to your speed in a straight line without shifting, and can then make a melee free strike or use an ability with the Charge keyword against a creature when you end your move.' },
      { name: 'Defend', text: 'All ability power rolls made against you have a double bane until the start of your next turn. You gain no benefit from this action while another creature is taunted by you.' },
      { name: 'Free Strike', text: 'You make a free strike.' },
      { name: 'Heal', text: 'Choose an adjacent creature who can spend a Recovery or make a saving throw.' },
    ],
  },
  {
    id: 'move-actions', title: 'Move Actions',
    entries: [
      { name: 'Advance', text: 'Move a number of squares up to your speed. You can break up this movement with your maneuver and action however you wish.' },
      { name: 'Disengage', text: 'Shift 1 square.' },
      { name: 'Ride', text: 'Cause a mount you are riding to take the Advance move action. A mount can only benefit from this once per round.' },
    ],
  },
  {
    id: 'maneuvers', title: 'Maneuvers',
    intro: 'Any creature can take the following maneuvers, in addition to those listed in their stats. See the Maneuvers panel on your character sheet for the full stat blocks of Grab, Knockback, and Escape Grab.',
    entries: [
      { name: 'Aid Attack', text: 'Choose an adjacent enemy. The next ability power roll an ally makes against them before the start of your next turn has an edge.' },
      { name: 'Catch Breath', text: 'Spend a Recovery.' },
      { name: 'Escape Grab', text: 'You use the Escape Grab ability while grabbed.' },
      { name: 'Grab', text: 'You use the Grab ability.' },
      { name: 'Hide', text: 'You become hidden from creatures who aren\u2019t observing you while you have cover or concealment from them.' },
      { name: 'Knockback', text: 'You use the Knockback ability.' },
      { name: 'Stand Up', text: 'You stand up from prone, ending that condition. Alternatively, you can use this maneuver to make an adjacent prone creature stand up.' },
    ],
  },
  {
    id: 'combat-glossary', title: 'Combat Glossary',
    entries: [
      { name: 'Critical Hit', text: 'When you roll a natural 19 or 20 on a Strike or ability power roll on an ability that uses an action, you can immediately take another action.' },
      { name: 'Concealment', text: 'Darkness, fog, invisibility magic, and any other effect that fully obscures a creature or object but doesn\u2019t protect their physical form grants that creature or object concealment. Even if you have line of effect to such a target, a creature or object has concealment from you if you can\u2019t see or otherwise observe them. You can target a creature or object with concealment using a strike, provided they aren\u2019t hidden. However, strikes against such targets take a bane.' },
      { name: 'Cover', text: 'When you have line of effect to a creature or object but that target has at least half their form blocked by a solid obstruction such as a tree, wall, or overturned table, the target has cover. You take a bane on damage-dealing abilities used against creatures or objects that have cover from you.' },
      { name: 'Damage Immunity', text: 'Each damage immunity has a type and value. If a creature with damage immunity takes damage of that type, they reduce the damage equal to the value (minimum 0). If a creature reduces incoming damage to 0, they avoid any associated effects with the damage too.' },
      { name: 'Damage Weakness', text: 'Each damage weakness has a type and value. If a creature with damage weakness takes damage of that type, they take additional damage equal to the weakness value.' },
      { name: 'Dying', text: 'While your Stamina is 0, you are dying and can\u2019t take the Catch Breath maneuver in combat. While dying, you are bleeding until you are no longer dying. When your Stamina is equal to negative your winded value, you die.' },
      { name: 'EoT', text: 'If an effect ends with \u201c(EoT)\u201d at the end of its description, a creature suffers the effect until the end of their next turn, or the current turn if they got the effect on their current turn.' },
      { name: 'Flanking', text: 'When you and at least one ally are adjacent to the same enemy and on completely opposite sides of the enemy, you are flanking that enemy. While flanking an enemy, you gain an edge on melee strikes against them.' },
      { name: 'High Ground', text: [
        'Whenever a creature uses an ability to target a creature or object while standing on the ground and occupying a space that is fully above the target\u2019s space, they gain an edge on the power roll against that target. To be fully above a target, the bottom of a creature\u2019s space must be higher than or bordering on the top of the target\u2019s space.',
        'A creature can gain this benefit while climbing only if they have \u201cclimb\u201d in their speed entry or can automatically climb at full speed while moving.',
      ]},
      { name: 'Line of Effect', text: 'To target a creature or object with an ability, you must have line of effect to them. If a solid object completely blocks the creature from you, then you don\u2019t have line of effect to them.' },
      { name: 'Opportunity Attack', text: 'When a creature within your reach willingly moves out of it without shifting, you can make a melee free strike against that creature as a free triggered action.' },
      { name: 'Potency', text: [
        'Many of your ability effects have a potency, which is a value that indicates how high a target\u2019s characteristic score must be to resist the effect.',
        'A potency always appears in text as a capital letter followed by a less-than sign (<) and then your potency value, such as M < 1 or R < 2. The single capital letter indicates which characteristic the target uses to resist the effect. M for Might, A for Agility, R for Reason, I for Intuition, and P for Presence. The value indicates the minimum score in that characteristic the target needs to beat the effect. If the target\u2019s characteristic score is equal to or higher than the potency value, they don\u2019t suffer the effect.',
      ]},
      { name: 'Saving Throws', text: 'If an effect ends with \u201c(save ends)\u201d at the end of its description, then a creature suffering the effect can make a saving throw at the end of their turn to remove the effect. To make a saving throw, roll a d10. On a 6 or higher, the effect ends. Otherwise, it continues.' },
      { name: 'Stamina', text: 'When you take damage, your Stamina is reduced by an amount equal to the damage you take. When you reduce a non-hero creature\u2019s Stamina to 0, you decide if they die or become unconscious until they regain Stamina.' },
      { name: 'Surges', text: [
        'Certain abilities give heroes surges.',
        'When you deal damage with an ability power roll, you can spend up to three surges to increase the damage you deal by 2 per surge spent to one creature or object targeted with the ability.',
        'When you target one or more creatures with an ability that has a potency, you can spend two surges to increase the potency by 1 for one of the creatures targeted with the effect. You can\u2019t increase the potency by more than 1 with surges, though you can spend multiple at once to increase the potency for multiple targets.',
        'After you spend a surge, it disappears. At the end of combat, you lose all surges.',
      ]},
      { name: 'Winded', text: 'When your Stamina is equal to half your maximum or less, you are winded.' },
    ],
  },
  {
    id: 'size', title: 'Size & Space',
    entries: [
      { name: 'Size', text: [
        'A creature\u2019s size indicates how many squares they occupy during combat, which defines the creature\u2019s space. If a creature\u2019s size is 1, they occupy a space of 1 square. If a creature is larger than 1 square, their size equals the number of squares they take up in length, width, and height.',
        'If a creature is a size 1, their size value includes the letter T, S, M, or L \u2014 abbreviations of tiny, small, medium, and large. The minimum space a creature can occupy is 1 square, so this letter indicates the difference between tiny pixies, small polders, medium humans, and large bugbears.',
        'Order from smallest to largest: 1T, 1S, 1M, 1L. Size 1T is one size smaller than 1S, two sizes smaller than 1M, etc. If a rule affects size 1 creatures, it applies to all size 1 creatures.',
      ]},
    ],
  },
  {
    id: 'movement', title: 'Movement',
    intro: 'A single move or other effect can never allow a creature to move more squares than their speed, unless the effect specifically states otherwise. All squares adjacent to your character cost 1 movement, even diagonally. A creature can\u2019t move diagonally when doing so would cross the corner of a wall or other structure.',
    entries: [
      { name: 'Climb', text: 'If a creature\u2019s speed entry includes the word \u201cclimb,\u201d they can climb across vertical and horizontal surfaces at full speed. Creatures without those types of movement can still climb when a rule allows them to move, but each square of climbing costs 2 squares of movement.' },
      { name: 'Crawl', text: 'If you are prone, you can remain prone and crawl on the ground. Doing so costs you 1 additional square of movement for every square you crawl. If you intentionally want to crawl, you can fall prone as a free maneuver on your turn. While voluntarily prone, you can choose to stand as a free maneuver.' },
      { name: 'Difficult Terrain', text: 'Areas of thick underbrush, rubble, spiderwebs, or other obstacles to movement create difficult terrain. It costs 1 additional square of movement to enter a square of difficult terrain.' },
      { name: 'Jump', text: [
        'When an effect allows you to move, you can long jump a number of squares up to your Might or Agility score (your choice; minimum 1 square) without a test as part of that movement. If you move at least 2 squares in a straight line immediately before your jump, you can long jump 1 additional square.',
        'If you want to jump even farther, make a medium Might test. On a success, you jump 1 additional square, or 2 additional squares with a success-and-reward.',
        'The height of your jump is 1 square. If you move at least 2 squares in a straight line immediately before your jump, you can jump 1 square higher.',
        'You can\u2019t jump farther or higher than the distance of the effect that allows you to move. You can\u2019t jump out of difficult or damaging terrain.',
      ]},
      { name: 'Teleport', text: [
        'When you teleport, you move from one space to another space instantaneously.',
        'Teleporting doesn\u2019t provoke opportunity attacks.',
        'You bypass any obstacles between the space you leave and your destination space.',
        'The creature teleporting you must have line of effect from the space you leave and to your destination space.',
        'Your destination space can\u2019t be occupied by another creature or object.',
        'The effect tells you how far you can teleport, which you can use even if it is greater than your speed.',
        'If you teleport while prone, you can be standing when you reach your destination space provided you are able to stand.',
        'If you teleport while affected by the grabbed or restrained conditions, those conditions end for you.',
        'You must leave the space when you start and enter a new one. You can\u2019t teleport and remain in the same space.',
      ]},
      { name: 'Shifting', text: 'The Disengage move action and certain abilities allow you to shift. When you shift, you move without provoking opportunity attacks. You can\u2019t shift into difficult terrain.' },
    ],
  },
  {
    id: 'forced', title: 'Forced Movement',
    intro: 'When you force move a target, you can always move that target fewer squares than the number indicated.',
    entries: [
      { name: 'Push X', text: 'You move the target up to X squares away from you in a straight line, without moving them vertically. Each square you move the creature must put them further away from you.' },
      { name: 'Pull X', text: 'You move the target up to X squares toward you in a straight line, without moving them vertically. Each square you move the creature must bring them closer to you.' },
      { name: 'Slide X', text: 'You move the target up to X squares in any direction, except for vertically.' },
      { name: 'Vertical', text: 'If a forced movement effect has the word \u201cvertical\u201d in front of it, then the forced movement can move a target up or down in addition to horizontally.' },
      { name: 'Big vs Little', text: 'When a larger creature force moves a smaller creature with a melee weapon ability, the force move distance is increased by 1. If a smaller creature force moves a larger creature with a melee weapon ability, the force move distance does not change.' },
      { name: 'Breaking Objects', text: [
        '1 remaining square of forced movement destroys 1 square of glass (3 damage to the creature).',
        '3 remaining squares destroy 1 square of wood (5 damage).',
        '6 remaining squares destroy 1 square of stone (8 damage).',
        '9 remaining squares destroy 1 square of metal (11 damage).',
        'If any forced movement remains after the object is destroyed, you can continue to move the creature who destroyed the object.',
      ]},
      { name: 'Slamming into Creatures', text: 'When you force move a creature into another creature, the movement ends and both creatures take 1 damage for each square remaining in the first creature\u2019s forced movement. You can force move another creature into yourself with a pull or a slide. If a creature is killed by damage from an ability or effect that force moves them, the second creature still takes damage.' },
      { name: 'Slamming into Objects', text: 'When you force move a creature into a stationary object that is their size or larger, the movement ends and the creature takes 2 damage plus 1 damage for each square remaining in their forced movement.' },
      { name: 'Stability', text: 'Each creature has a stability that allows them to resist forced movement. When a creature is force moved, they can reduce the movement up to a number of squares equal to their stability.' },
    ],
  },
  {
    id: 'aoe', title: 'Areas of Effect',
    intro: 'Area abilities cover an area, creating an effect within that area that lets you target multiple creatures or objects at once. The square the area spreads from is the origin square; you must have line of effect and distance to it. Unless otherwise noted, area abilities don\u2019t pass through solid barriers or spread around corners.',
    entries: [
      { name: 'Aura', text: 'Expressed as \u201cX aura.\u201d X is the radius of the aura, which always originates from you and moves with you for the duration of the ability that created it. A target must be within X squares of you.' },
      { name: 'Burst', text: 'Expressed as \u201cX burst.\u201d X is the radius of the burst, originating from you and lasting only for as long as it takes to affect its targets.' },
      { name: 'Cube', text: 'Expressed as \u201cX cube.\u201d X is the length of each of the area\u2019s sides. A target must be within the area.' },
      { name: 'Line', text: 'Expressed as \u201cA \u00d7 B line.\u201d A is the line\u2019s length in squares, B is its width and height. The squares must be in a straight line.' },
      { name: 'Wall', text: 'Expressed as \u201cX wall.\u201d X is how many squares are used. Each square must share at least one side (not just a corner) with another square of the wall. You can stack squares to make the wall higher. Unless otherwise stated, a wall can\u2019t be placed in occupied squares, and a wall blocks line of effect.' },
    ],
  },
  {
    id: 'conditions', title: 'Conditions',
    intro: 'Some abilities and other effects apply specific negative effects called conditions to a creature.',
    entries: [
      { name: 'Bleeding', text: [
        'While a creature is bleeding, whenever they use a main action, use a triggered action, or make a test or ability power roll using Might or Agility, they lose Stamina equal to 1d6 + their level after the main action, triggered action, or power roll is resolved. This Stamina loss can\u2019t be prevented in any way.',
        'You take damage from this condition when you use a main action off your turn \u2014 e.g. a signature attack used as a free triggered action with Strike Now triggers the damage.',
      ]},
      { name: 'Dazed', text: 'A creature who is dazed can do only one thing on their turn: use a main action, use a maneuver, or use a move action. A dazed creature also can\u2019t use triggered actions, free triggered actions, or free maneuvers.' },
      { name: 'Frightened', text: 'When a creature is frightened, any ability roll they make against the source of their fear takes a bane. If that source is a creature, their ability rolls made against the frightened creature gain an edge. A frightened creature can\u2019t willingly move closer to the source of their fear if they know the location of that source. If a creature gains the frightened condition from one source while already frightened by a different source, the new condition replaces the old one.' },
      { name: 'Grabbed', text: [
        'A creature who is grabbed has speed 0, can\u2019t be force moved except by the creature, object, or effect that has them grabbed, can\u2019t use the Knockback maneuver, and takes a bane on abilities that don\u2019t target the creature, object, or effect that has them grabbed.',
        'If a creature is grabbed by another creature and that creature moves, they bring the grabbed creature with them. If a creature\u2019s size is equal to or less than the size of a creature they have grabbed, their speed is halved while they have that creature grabbed.',
        'A creature who has another creature grabbed can use a maneuver to move the grabbed creature into an unoccupied space adjacent to them.',
        'A creature can release a creature they have grabbed at any time to end that condition (no action required). A creature targeted by an effect that would grab them can attempt to escape using the Escape Grab maneuver. If a grabbed creature teleports, or if either creature is force moved so they are no longer adjacent, the grab ends.',
        'A creature can grab only creatures of their size or smaller. Might \u2265 2 lets them grab any creature with a size equal to or less than their Might score. Unless otherwise indicated, a creature can grab only one creature at a time.',
      ]},
      { name: 'Prone', text: [
        'While a creature is prone, they are flat on the ground, any strike they make takes a bane, and melee abilities used against them gain an edge. A prone creature must crawl to move along the ground, which costs 1 additional square of movement for every square crawled. A creature can\u2019t climb, jump, swim, or fly while prone. If they are climbing, flying, or jumping when knocked prone, they fall.',
        'Unless the ability or effect that imposed the prone condition says otherwise, a prone creature can stand up using the Stand Up maneuver. An adjacent creature can likewise use the Stand Up maneuver to make a willing prone creature stand up.',
      ]},
      { name: 'Restrained', text: 'A creature who is restrained has speed 0, can\u2019t use the Stand Up maneuver, and can\u2019t be force moved. A restrained creature takes a bane on ability rolls and on Might and Agility tests, and abilities used against them gain an edge. If a creature teleports while restrained, that condition ends.' },
      { name: 'Slowed', text: 'A creature who is slowed has speed 2 unless their speed is already lower, and they can\u2019t shift.' },
      { name: 'Taunted', text: 'A creature who is taunted has a double bane on ability rolls for any ability that doesn\u2019t target the creature who taunted them, as long as they have line of effect to that creature. If a creature gains the taunted condition from one source while already taunted by a different source, the new condition replaces the old one.' },
      { name: 'Weakened', text: 'A creature who is weakened takes a bane on power rolls.' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Styles for the maneuvers panel and rules glossary modal.
// ─────────────────────────────────────────────────────────────────────────────
const RULES_CSS = `
/* Maneuvers panel */
.mnv-list { display: flex; flex-direction: column; gap: 10px; }
.mnv {
  border: 1px solid var(--line-2);
  background: linear-gradient(180deg, rgba(20,20,26, calc(0.55 * var(--surface-alpha, 1))), rgba(14,14,18, calc(0.62 * var(--surface-alpha, 1))));
  padding: 11px 13px;
}
.mnv-head {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 10px; margin-bottom: 4px;
}
.mnv-name {
  font-family: var(--display-2); font-size: 13px; font-weight: 600;
  letter-spacing: 0.16em; color: var(--ink); text-transform: uppercase;
}
.mnv-kw {
  font-family: var(--mono); font-size: 9px; color: var(--ink-3);
  letter-spacing: 0.2em; text-transform: uppercase;
}
.mnv-blurb {
  font-family: var(--serif); font-size: 13px; color: var(--ink-2);
  line-height: 1.5;
}
.mnv-roll {
  display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 4px 12px;
  font-family: var(--mono); font-size: 10px;
  margin: 6px 0 8px;
}
.mnv-roll .k { color: var(--ink-3); letter-spacing: 0.2em; text-transform: uppercase; font-size: 9px; }
.mnv-roll .v { color: var(--ink); font-family: var(--serif); font-size: 12px; }
.mnv-tier {
  display: grid; grid-template-columns: 24px 1fr; gap: 8px;
  font-family: var(--serif); font-size: 12px; color: var(--ink-2);
  line-height: 1.45; padding: 3px 0;
}
.mnv-tier .tg {
  font-family: var(--display); font-size: 14px; color: var(--gold);
  text-align: center; line-height: 1;
}
.mnv-tier.t1 .tg { opacity: 0.55; }
.mnv-tier.t3 .tg { color: var(--gold-2); }
.mnv-effect {
  font-family: var(--serif); font-size: 12px; color: var(--ink-3);
  font-style: italic; line-height: 1.5;
  border-top: 1px dashed var(--line-2); padding-top: 6px; margin-top: 6px;
}

/* Rules glossary modal */
.rg-modal {
  display: grid; grid-template-columns: 260px 1fr;
  width: min(960px, 96vw); height: min(720px, 88vh);
  border: 1px solid var(--gold);
  background: linear-gradient(180deg,
    rgba(20,20,26, calc(0.97 * var(--surface-alpha, 1))),
    rgba(8,8,10, calc(0.97 * var(--surface-alpha, 1))));
  box-shadow: 0 0 0 1px rgba(176,138,72,0.15), 0 30px 80px rgba(0,0,0,0.6);
  position: relative; overflow: hidden;
}
.rg-modal::before, .rg-modal::after {
  content: ''; position: absolute; width: 12px; height: 12px;
  border: 1px solid var(--gold); transform: rotate(45deg); background: var(--bg-1);
}
.rg-modal::before { top: -7px; left: 50%; margin-left: -6px; }
.rg-modal::after  { bottom: -7px; left: 50%; margin-left: -6px; }

.rg-nav {
  border-right: 1px solid var(--line);
  background: rgba(8,8,10, calc(0.6 * var(--surface-alpha, 1)));
  overflow-y: auto; padding: 22px 0;
}
.rg-nav-head {
  padding: 0 22px 14px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 8px;
}
.rg-nav-head .glyph {
  font-family: var(--display); color: var(--gold); font-size: 18px; letter-spacing: 0.3em; opacity: 0.8;
  display: block; text-align: center; margin-bottom: 6px;
}
.rg-nav-head .title {
  font-family: var(--display); font-size: 17px; letter-spacing: 0.14em;
  color: var(--ink); text-align: center;
}
.rg-nav-head .sub {
  font-family: var(--mono); font-size: 9px; color: var(--ink-3);
  letter-spacing: 0.28em; text-transform: uppercase;
  text-align: center; margin-top: 5px;
}
.rg-nav-item {
  display: block; width: 100%; text-align: left;
  background: transparent; border: 0; border-left: 2px solid transparent;
  color: var(--ink-2); padding: 9px 22px;
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; cursor: pointer;
  transition: color .12s, border-color .12s, background .12s;
}
.rg-nav-item:hover { color: var(--gold-2); }
.rg-nav-item.active {
  color: var(--gold-2); border-left-color: var(--gold);
  background: linear-gradient(90deg, rgba(176,138,72,0.10), transparent 80%);
}

.rg-body {
  overflow-y: auto; padding: 26px 32px 32px;
  position: relative;
}
.rg-close {
  position: absolute; top: 14px; right: 14px;
  width: 32px; height: 32px;
  background: transparent; border: 1px solid var(--line-2);
  color: var(--ink-2); cursor: pointer;
  font-family: var(--display); font-size: 16px;
}
.rg-close:hover { border-color: var(--rubric-2); color: var(--rubric-2); }
.rg-section-title {
  font-family: var(--display); font-size: 28px; letter-spacing: 0.1em;
  color: var(--ink); margin: 0 0 4px;
}
.rg-section-eyebrow {
  font-family: var(--mono); font-size: 9px; color: var(--gold);
  letter-spacing: 0.32em; text-transform: uppercase; margin-bottom: 4px;
}
.rg-section-intro {
  font-family: var(--serif); font-style: italic; font-size: 14px;
  color: var(--ink-2); line-height: 1.55; margin: 14px 0 22px;
  border-left: 2px solid var(--gold-deep); padding-left: 14px;
  max-width: 640px;
}
.rg-entry {
  margin: 14px 0 18px; max-width: 720px;
}
.rg-entry-name {
  font-family: var(--display-2); font-size: 13px; font-weight: 600;
  letter-spacing: 0.18em; color: var(--gold-2); text-transform: uppercase;
  margin-bottom: 6px;
  display: flex; align-items: baseline; gap: 10px;
}
.rg-entry-name::before {
  content: '\u2756'; color: var(--gold); font-size: 9px; opacity: 0.7;
}
.rg-entry-text {
  font-family: var(--serif); font-size: 14px; color: var(--ink);
  line-height: 1.6;
}
.rg-entry-text p { margin: 0 0 7px; }
.rg-entry-text p:last-child { margin: 0; }

/* Rules launcher button — used in play top bar and roster */
.rules-launcher {
  display: inline-flex; align-items: center; gap: 8px;
  background: transparent; border: 1px solid var(--line-2);
  color: var(--ink-2); cursor: pointer;
  padding: 8px 14px;
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase;
  transition: color .12s, border-color .12s, background .12s;
}
.rules-launcher::before {
  content: '\u2720'; color: var(--gold); font-family: var(--display);
}
.rules-launcher:hover { border-color: var(--gold); color: var(--ink); background: rgba(176,138,72,0.06); }
.rules-launcher.large {
  padding: 15px 30px; font-size: 12px; letter-spacing: 0.26em;
  font-family: var(--display-2); font-weight: 700;
  background: linear-gradient(180deg, var(--gold-2), var(--gold-deep));
  border: 1px solid var(--gold-2);
  color: #1a120a;
  box-shadow: 0 0 22px var(--gold-glow), inset 0 1px 0 rgba(255,255,255,0.25);
}
.rules-launcher.large::before { font-size: 17px; color: #2a1c08; }
.rules-launcher.large:hover {
  background: linear-gradient(180deg, #f0d480, #b8932f);
  border-color: var(--gold-2); color: #0b0e1f;
  box-shadow: 0 0 30px var(--gold-glow), inset 0 1px 0 rgba(255,255,255,0.3);
}
.rules-launcher.large:hover::before { color: #2a1c08; }
.rules-launcher.large:active { transform: translateY(1px); }
`;

function RulesStyles() {
  return <style>{RULES_CSS}</style>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Maneuvers panel (used on the play / character sheet view)
// ─────────────────────────────────────────────────────────────────────────────
function ManeuversPanel() {
  const [collapsed, setCollapsed] = React.useState(false);
  return (
    <div className={`panel ${collapsed ? 'collapsed' : ''}`}>
      <RulesStyles />
      <button
        type="button"
        className="panel-head panel-head-btn"
        onClick={() => setCollapsed(c => !c)}
        aria-expanded={!collapsed}
      >
        <div className="panel-title">Default Maneuvers</div>
        <div className={`panel-chevron ${collapsed ? 'down' : 'up'}`} aria-hidden="true">▾</div>
      </button>
      {!collapsed && (
        <div className="panel-body">
          <div className="mnv-list">
            {DS_MANEUVERS.map(m => <ManeuverRow key={m.name} m={m} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function ManeuverRow({ m }) {
  const AbilityCard = window.AbilityCard;
  // Shape each maneuver like an ability so it shares the ability-card design + action tag.
  const tiers = m.tiers
    ? [['\u2264 11', m.tiers.t1], ['12\u201316', m.tiers.t2], ['\u2265 17', m.tiers.t3]]
    : undefined;
  const ability = {
    name: m.name,
    type: 'Maneuver',
    keywords: m.keywords || [],
    distance: m.distance,
    target: m.target,
    powerRoll: m.roll ? m.roll.replace(/^\s*\+\s*/, '') : undefined,
    tiers,
    effect: m.effect || (m.tiers ? undefined : m.blurb),
    noBadge: true,
  };
  return <AbilityCard ability={ability} kind="" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rules glossary — modal with sidebar nav.
// Props: { open, onClose }
// ─────────────────────────────────────────────────────────────────────────────
function RulesGlossary({ open, onClose }) {
  const [activeId, setActiveId] = React.useState(DS_RULES[0].id);
  const bodyRef = React.useRef(null);

  // Reset scroll position when switching sections
  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [activeId]);

  // ESC closes
  React.useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);

  if (!open) return null;
  const active = DS_RULES.find(s => s.id === activeId) || DS_RULES[0];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <RulesStyles />
      <div className="rg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rg-nav">
          <div className="rg-nav-head">
            <div className="glyph">{'\u2720'}</div>
            <div className="title">Rules</div>
            <div className="sub">Liber Heroum</div>
          </div>
          {DS_RULES.map(s => (
            <button
              key={s.id}
              type="button"
              className={`rg-nav-item${s.id === activeId ? ' active' : ''}`}
              onClick={() => setActiveId(s.id)}
            >
              {s.title}
            </button>
          ))}
        </div>

        <div className="rg-body" ref={bodyRef}>
          <button type="button" className="rg-close" onClick={onClose} aria-label="Close">{'\u00d7'}</button>
          <div className="rg-section-eyebrow">Chapter</div>
          <h2 className="rg-section-title">{active.title}</h2>
          {active.intro && (
            <div className="rg-section-intro">{active.intro}</div>
          )}
          {active.entries.map(e => (
            <div className="rg-entry" key={e.name}>
              <div className="rg-entry-name">{e.name}</div>
              <div className="rg-entry-text">
                {Array.isArray(e.text)
                  ? e.text.map((p, i) => <p key={i}>{p}</p>)
                  : <p>{e.text}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Convenience launcher button
function RulesButton({ large, onClick, children }) {
  return (
    <>
      <RulesStyles />
      <button type="button" className={`rules-launcher${large ? ' large' : ''}`} onClick={onClick}>
        {children || 'Rules Glossary'}
      </button>
    </>
  );
}

Object.assign(window, {
  DS_MANEUVERS, DS_RULES,
  ManeuversPanel, RulesGlossary, RulesButton, RulesStyles,
});
export {
  DS_MANEUVERS, DS_RULES,
  ManeuversPanel, RulesGlossary, RulesButton, RulesStyles,
};
