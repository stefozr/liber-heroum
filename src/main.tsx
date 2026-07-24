// main.tsx — application entry point.
//
// Replaces the old in-browser Babel + UMD-CDN setup. Vite compiles the real ES
// module graph rooted here; load ordering is enforced by imports inside each
// module (levelup.jsx imports every per-class level-up table itself).
import React from 'react';
import ReactDOM from 'react-dom/client';

import './levelup.jsx';
import { App } from './app.jsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
