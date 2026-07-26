// theme/breakpoints.js — the single source of truth for responsive breakpoints.
//
// The stylesheets in this app are JS template literals injected as <style> tags,
// so media queries are interpolated in as `${MQ.phone} { ... }`. Each query must
// live in the SAME string as the rule it overrides: media queries add no
// specificity, so a rule in another sheet would win or lose purely on DOM mount
// order, which varies at runtime (RULES_CSS is injected by up to three mounts).
//
// index.html duplicates these numbers as literals in its root font-size ladder,
// because HTML cannot import JS. Keep the two in sync.

export const BP = {
  // Narrow desktop. Used by the two components that run out of room well above
  // the tablet tier: the 7-step wizard rail (~1080px minimum) and the play
  // sheet's 4-column .kv-row.
  rail: 1024,
  // Tablet portrait and phone landscape. The main "collapse the columns" tier.
  tab: 900,
  // Phone portrait, covering 360 through 540.
  phone: 560,
};

export const MQ = {
  rail:  `@media (max-width: ${BP.rail}px)`,
  tab:   `@media (max-width: ${BP.tab}px)`,
  phone: `@media (max-width: ${BP.phone}px)`,
  // Capability queries, deliberately not width-based: `hover` guards styles that
  // latch on touch, `touch` reveals affordances that are hover-only on desktop.
  // These also catch touch laptops, which a width query would miss.
  hover: '@media (hover: hover)',
  touch: '@media (hover: none)',
};
