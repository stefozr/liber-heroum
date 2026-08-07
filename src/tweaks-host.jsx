// tweaks-host.jsx — DEV-ONLY wrapper around the design-host tweaks panel.
// Loaded lazily behind import.meta.env.DEV (app.jsx), so neither this file nor
// tweaks-panel.jsx ships in the production bundle. The panel opens only via the
// design host's postMessage handshake; its theme/alpha edits apply live here.
// Production owns the defaults itself: app.jsx pins --surface-alpha to 0.85 and
// index.html stamps data-theme="obsidian".
import React from 'react';
import { useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakRadio } from './tweaks-panel.jsx';

export default function TweaksHost() {
  const [tw, setTweak] = useTweaks({
    theme: 'obsidian',
    surfaceAlpha: 0.85,
  });
  React.useEffect(() => {
    document.body.dataset.theme = tw.theme;
    document.body.style.setProperty('--surface-alpha', String(tw.surfaceAlpha));
  }, [tw.theme, tw.surfaceAlpha]);

  return (
    <TweaksPanel>
      <TweakSection label="Theme" />
      <TweakRadio
        label="Scheme"
        value={tw.theme}
        options={[
          { value: 'obsidian',  label: 'Obsidian' },
          { value: 'reliquary', label: 'Reliquary' },
        ]}
        onChange={(v) => setTweak('theme', v)}
      />
      <TweakSlider
        label="Surface opacity"
        value={tw.surfaceAlpha}
        min={0.4} max={1} step={0.05}
        onChange={(v) => setTweak('surfaceAlpha', v)}
      />
    </TweaksPanel>
  );
}
