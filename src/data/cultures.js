// data/cultures.js — Draw Steel game data: DS_CULTURES. Split out of the former monolithic data.jsx.
import { DS_SKILL_GROUPS } from './skills.js';

const DS_CULTURES = {
  environments: [
    { id: 'nomadic',  name: 'Nomadic',  desc: 'Folk who travel from place to place to survive — following migrations or weather, selling wares, or simply restless. They learn to navigate the wild and rely on one another.', skillGroups: ['exploration','interpersonal'], quick: 'Navigate' },
    { id: 'rural',    name: 'Rural',    desc: 'A town, village, or settled enclave. People cultivate land, trade with travelers, fish, or mine — learning a trade and the lore handed down to keep the community alive.',           skillGroups: ['crafting','lore'],           quick: 'Nature' },
    { id: 'secluded', name: 'Secluded', desc: 'A close-quarters home that rarely meets outsiders — a monastery, castle, or prison. Living together, folk learn to get along, and spend their time in study and introspection.',       skillGroups: ['interpersonal','lore'],      quick: 'Read Person' },
    { id: 'urban',    name: 'Urban',    desc: 'A city — a walled metropolis, an underground warren, anywhere a large population lives close together. People learn to misdirect others to navigate crowds and political machinations.',                     skillGroups: ['interpersonal','intrigue'],  quick: 'Alertness' },
    { id: 'wilderness',name: 'Wilderness', desc: 'Desert, forest, swamp, tundra, ocean, or stranger climes. Rather than tame the land, these folk thrive within it, crafting their own tools, clothing, and shelter from what nature provides.',             skillGroups: ['crafting','exploration'],    quick: 'Endurance' },
  ],
  organizations: [
    { id: 'bureaucratic', name: 'Bureaucratic', desc: 'Official leadership and recorded laws — guilds, feudal lords, councils, ranked armies. Those who thrive here bend and reinterpret the rules to their advantage.', skillGroups: ['interpersonal','intrigue'], quick: 'Persuade' },
    { id: 'communal',     name: 'Communal',     desc: 'A place where all members are equals and decisions are made together — farming collectives, pirate cities, voting theater troupes. Everyone shares the burdens, and fends for themselves against outsiders.', skillGroups: ['crafting','exploration'], quick: 'Jump' },
  ],
  upbringings: [
    { id: 'academic', name: 'Academic', desc: 'Raised among people who collect, study, and share books and records — a college of wizards, a church of one deity. You learned that knowledge is power.', skillGroups: ['lore'], quick: 'History' },
    { id: 'creative', name: 'Creative', desc: 'Raised among folk who create art or wares valuable enough to trade — dance, music, sculpture, or practical craft. You learned the value of quality and detail.', skillGroups: ['interpersonal','crafting'], skills: ['Music','Perform', ...DS_SKILL_GROUPS.crafting], skillLabel: 'Music / Perform or any crafting', quick: 'Perform' },
    { id: 'labor',    name: 'Labor',    desc: 'Raised where people labored for a living — cultivators, hunters, loggers, miners, builders, carters. You know the value of hard work.', skillGroups: ['crafting','exploration','interpersonal'], skills: ['Blacksmithing','Handle Animals', ...DS_SKILL_GROUPS.exploration], skillLabel: 'Blacksmithing, Handle Animals, or any exploration', quick: 'Lift' },
    { id: 'lawless',  name: 'Lawless',  desc: 'Raised among folk whose activities others considered unlawful — pirates, assassins, spies, rebels. You don\'t mind breaking the rules, and you\'re good at not getting caught.', skillGroups: ['intrigue'], quick: 'Sneak' },
    { id: 'martial',  name: 'Martial',  desc: 'Raised by warriors — soldiers, mercenaries, monster-slayers. You\'re always ready for a fight, and you know how to finish it.', skillGroups: ['crafting','exploration','interpersonal','intrigue','lore'], skills: ['Blacksmithing','Fletching','Climb','Endurance','Ride','Intimidate','Alertness','Track','Monsters','Strategy'], skillLabel: 'A curated martial list', quick: 'Intimidate' },
    { id: 'noble',    name: 'Noble',    desc: 'Raised among leaders who rule others and play the games of politics. You understand that the right whispered word can outweigh any army.', skillGroups: ['interpersonal'], quick: 'Lead' },
  ],
  archetypes: [
    { name: 'Artisan guild',           env: 'urban',    org: 'bureaucratic', upb: 'creative' },
    { name: 'Borderland homestead',    env: 'wilderness', org: 'communal',   upb: 'labor' },
    { name: 'College conclave',        env: 'urban',    org: 'bureaucratic', upb: 'academic' },
    { name: 'Criminal gang',           env: 'urban',    org: 'communal',     upb: 'lawless' },
    { name: 'Farming village',         env: 'rural',    org: 'bureaucratic', upb: 'labor' },
    { name: 'Herding community',       env: 'nomadic',  org: 'communal',     upb: 'labor' },
    { name: 'Knightly order',          env: 'secluded', org: 'bureaucratic', upb: 'martial' },
    { name: 'Laborer neighborhood',    env: 'urban',    org: 'communal',     upb: 'labor' },
    { name: 'Mercenary band',          env: 'nomadic',  org: 'bureaucratic', upb: 'martial' },
    { name: 'Merchant caravan',        env: 'nomadic',  org: 'bureaucratic', upb: 'creative' },
    { name: 'Monastic order',          env: 'secluded', org: 'bureaucratic', upb: 'academic' },
    { name: 'Noble house',             env: 'urban',    org: 'bureaucratic', upb: 'noble' },
    { name: 'Outlaw band',             env: 'wilderness', org: 'communal',   upb: 'lawless' },
    { name: 'Pirate crew',             env: 'nomadic',  org: 'communal',     upb: 'lawless' },
    { name: 'Telepathic hive',         env: 'secluded', org: 'communal',     upb: 'creative' },
    { name: 'Traveling entertainers',  env: 'nomadic',  org: 'communal',     upb: 'creative' },
  ],
};

// ───────── Careers ─────────
// Each career: flavor description + defining questions, the benefits it grants,
// a quick-build perk suggestion, and inciting incidents with a short summary each.

export { DS_CULTURES };
