// data/level-bonuses.js — always-on derived-stat bonuses granted by class/subclass
// features at levels past 1st. These features live as prose in the level-up data
// (levelup*.jsx autoFeatures); this table is what computeDerived consumes.
// Bonus shape matches kits/traits: sta (flat), sta_per (×echelon), sta_lvl (×level),
// spd/stab/disengage (additive), spdChar/stabChar/disChar (+= named characteristic).
// `sub: null` means the feature is class-wide regardless of subclass.
const DS_LEVEL_BONUSES = [
  { cls: 'fury',         sub: 'reaver',    level: 2,  name: 'Inescapable Wrath',          bonuses: { spdChar: 'Agility' } },
  { cls: 'fury',         sub: 'berserker', level: 3,  name: 'Immovable Object',           bonuses: { stabChar: 'Might' } },
  { cls: 'fury',         sub: 'reaver',    level: 8,  name: 'A Step Ahead',               bonuses: { disChar: 'Agility' } },
  { cls: 'elementalist', sub: 'earth',     level: 2,  name: 'Disciple of Earth',          bonuses: { sta_lvl: 3 } },
  { cls: 'elementalist', sub: 'earth',     level: 5,  name: 'The Mountain Does Not Move', bonuses: { stabLvl: 1 } },
  { cls: 'null',         sub: null,        level: 9,  name: 'I Am the Weapon',            bonuses: { sta: 21 } },
  { cls: 'troubadour',   sub: 'green',     level: 10, name: 'Master of Green',            bonuses: { rec: 2 } },
];

export { DS_LEVEL_BONUSES };
