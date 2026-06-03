// main.tsx — application entry point.
//
// Replaces the old in-browser Babel + UMD-CDN setup. Vite compiles the real ES
// module graph rooted here. Most load ordering is now enforced by imports inside
// each module; the only thing that still needs explicit ordering is the per-class
// level-up tables, which augment window.LEVELUP_DATA as a side effect. We import
// levelup.jsx first (it publishes LEVELUP_DATA) and then the augmenters, before
// mounting <App/>.
import React from 'react';
import ReactDOM from 'react-dom/client';

import './levelup.jsx';
import './levelup-troubadour.jsx';
import './levelup-shadow.jsx';
import './levelup-null.jsx';
import './levelup-tactician.jsx';
import './levelup-talent.jsx';
import './levelup-fury-hi.jsx';
import './levelup-conduit-hi.jsx';
import './levelup-elementalist-hi.jsx';

import { App } from './app.jsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
