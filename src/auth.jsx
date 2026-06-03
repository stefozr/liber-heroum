import React from 'react';
import { Button, Modal } from './theme.jsx';
import { DS } from './backend.jsx';
// auth.jsx — identity surfaces: avatars, the login gate, the app bar, the account menu.

const { useState: useAuthState, useEffect: useAuthEffect, useRef: useAuthRef } = React;

// ───────── shared chrome styles (avatars, app bar, menu, auth gate) ─────────
const ACCOUNT_CSS = `
.ds-avatar {
  display: grid; place-items: center; flex-shrink: 0;
  border: 1px solid var(--line-strong);
  font-family: var(--display-2); font-weight: 700; letter-spacing: 0.02em;
  border-radius: 50%; line-height: 1; user-select: none;
}
.ds-avatar.square { border-radius: 0; }

/* App bar — only on the logged-in roster / campaign chrome */
.ds-shell { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.ds-shell-body { flex: 1; min-height: 0; position: relative; }
.ds-appbar {
  display: flex; align-items: center; gap: 18px;
  padding: 12px 28px; border-bottom: 1px solid var(--line);
  background: rgba(8,8,10,0.78); backdrop-filter: blur(8px);
  position: relative; z-index: 40; flex-shrink: 0;
}
.ds-appbar .ab-brand {
  font-family: var(--display); font-weight: 700; font-size: 15px;
  letter-spacing: 0.26em; color: var(--gold-2); white-space: nowrap;
}
.ds-appbar .ab-mark {
  width: 30px; height: 30px; display: grid; place-items: center;
  border: 1px solid var(--gold); color: var(--gold); font-family: var(--display); font-size: 15px;
  flex-shrink: 0;
}
.ds-nav { display: flex; gap: 4px; margin-left: 8px; }
.ds-nav .ds-tab {
  font-family: var(--display-2); font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--ink-3); background: transparent; border: none; cursor: pointer;
  padding: 9px 16px; border-bottom: 2px solid transparent; transition: color .14s, border-color .14s;
  display: inline-flex; align-items: center; gap: 8px;
}
.ds-nav .ds-tab:hover { color: var(--ink); }
.ds-nav .ds-tab.on { color: var(--ink); border-bottom-color: var(--gold); }
.ds-nav .ds-tab .ds-count {
  font-family: var(--mono); font-size: 9px; color: var(--ink-3);
  border: 1px solid var(--line-2); padding: 1px 6px;
}

/* Account button + dropdown */
.ds-account { position: relative; margin-left: auto; }
.ds-account-btn {
  display: inline-flex; align-items: center; gap: 10px; cursor: pointer;
  background: transparent; border: 1px solid var(--line-2); padding: 5px 12px 5px 6px;
  color: var(--ink-2); transition: border-color .14s;
}
.ds-account-btn:hover { border-color: var(--gold-deep); }
.ds-account-btn .nm { font-family: var(--display-2); font-size: 12px; letter-spacing: 0.08em; color: var(--ink); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ds-account-btn .cv { font-family: var(--mono); font-size: 9px; color: var(--ink-3); }
.ds-menu {
  position: absolute; top: calc(100% + 8px); right: 0; width: 290px; z-index: 60;
  background: linear-gradient(180deg, var(--bg-2), var(--bg-0));
  border: 1px solid var(--gold);
  box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(176,138,72,0.2);
}
.ds-menu .m-head { padding: 16px 16px 14px; border-bottom: 1px solid var(--line); display: flex; gap: 12px; align-items: center; }
.ds-menu .m-head .nm { font-family: var(--display-2); font-size: 14px; letter-spacing: 0.06em; color: var(--ink); }
.ds-menu .m-head .em { font-family: var(--mono); font-size: 9.5px; color: var(--ink-3); letter-spacing: 0.06em; margin-top: 3px; word-break: break-all; }
.ds-menu .m-prov { font-family: var(--mono); font-size: 8.5px; color: var(--gold-2); letter-spacing: 0.18em; text-transform: uppercase; margin-top: 5px; }
.ds-menu .m-section { font-family: var(--mono); font-size: 8.5px; color: var(--ink-3); letter-spacing: 0.24em; text-transform: uppercase; padding: 12px 16px 6px; }
.ds-menu .m-item {
  display: flex; align-items: center; gap: 11px; width: 100%; text-align: left; cursor: pointer;
  background: transparent; border: none; padding: 9px 16px; color: var(--ink-2);
  font-family: var(--serif); font-size: 14px; transition: background .12s, color .12s;
}
.ds-menu .m-item:hover { background: rgba(176,138,72,0.08); color: var(--ink); }
.ds-menu .m-item .sub { font-family: var(--mono); font-size: 9px; color: var(--ink-3); letter-spacing: 0.08em; margin-left: auto; text-transform: uppercase; }
.ds-menu .m-item.danger { color: var(--rubric-2); }
.ds-menu .m-item.danger:hover { background: rgba(138,58,48,0.10); }
.ds-menu .m-foot { border-top: 1px solid var(--line); }

/* The login gate */
.auth-wrap {
  position: relative; z-index: 2; width: 100%; height: 100%;
  overflow: auto; display: grid; place-items: center; padding: 40px 20px;
}
.auth-card { width: 100%; max-width: 452px; text-align: center; }
.auth-crown { font-family: var(--display); color: var(--gold); letter-spacing: 0.4em; font-size: 13px; opacity: 0.7; }
.auth-title {
  font-family: var(--display); font-weight: 700; font-size: 46px; letter-spacing: 0.10em;
  color: var(--ink); margin: 14px 0 0; line-height: 1; text-shadow: 0 0 30px rgba(176,138,72,0.18);
}
.auth-sub { font-family: var(--hand); font-style: italic; font-size: 19px; color: var(--gold-2); margin-top: 12px; }
.auth-panel {
  margin-top: 30px; border: 1px solid var(--line-2);
  background: linear-gradient(180deg, rgba(20,20,26,0.7), rgba(14,14,18,0.85));
  padding: 28px 26px 26px; text-align: left; position: relative;
}
.auth-panel .bc { position: absolute; width: 16px; height: 16px; pointer-events: none; }
.auth-panel .bc-tl { top: -1px; left: -1px; border-top: 2px solid var(--gold-deep); border-left: 2px solid var(--gold-deep); }
.auth-panel .bc-tr { top: -1px; right: -1px; border-top: 2px solid var(--gold-deep); border-right: 2px solid var(--gold-deep); }
.auth-panel .bc-bl { bottom: -1px; left: -1px; border-bottom: 2px solid var(--gold-deep); border-left: 2px solid var(--gold-deep); }
.auth-panel .bc-br { bottom: -1px; right: -1px; border-bottom: 2px solid var(--gold-deep); border-right: 2px solid var(--gold-deep); }
.auth-mode-label { font-family: var(--mono); font-size: 10px; color: var(--gold); letter-spacing: 0.28em; text-transform: uppercase; text-align: center; }
.auth-providers { display: flex; flex-direction: column; gap: 9px; margin-top: 18px; }
.auth-provider {
  display: flex; align-items: center; gap: 13px; cursor: pointer;
  background: rgba(255,255,255,0.015); border: 1px solid var(--line-2);
  padding: 11px 15px; color: var(--ink); transition: border-color .14s, background .14s;
  font-family: var(--display-2); font-size: 12.5px; letter-spacing: 0.12em;
}
.auth-provider:hover { border-color: var(--gold); background: rgba(176,138,72,0.06); }
.auth-provider .pm {
  width: 26px; height: 26px; display: grid; place-items: center; flex-shrink: 0;
  border: 1px solid var(--line-strong); font-family: var(--display); font-size: 13px; color: var(--gold-2);
}
.auth-provider .pgo { margin-left: auto; font-family: var(--mono); font-size: 14px; color: var(--ink-3); }
.auth-or { display: flex; align-items: center; gap: 12px; margin: 18px 0; }
.auth-or .ln { flex: 1; height: 1px; background: var(--line-2); }
.auth-or .tx { font-family: var(--mono); font-size: 9px; color: var(--ink-3); letter-spacing: 0.24em; text-transform: uppercase; white-space: nowrap; }
.auth-fields { display: flex; flex-direction: column; gap: 12px; }
.auth-error {
  font-family: var(--serif); font-size: 13.5px; color: var(--rubric-2); margin-top: 14px;
  border-left: 2px solid var(--rubric); padding: 6px 0 6px 12px; background: rgba(138,58,48,0.06);
}
.auth-toggle { text-align: center; margin-top: 18px; font-family: var(--serif); font-size: 13.5px; color: var(--ink-3); }
.auth-toggle button {
  background: transparent; border: none; cursor: pointer; color: var(--gold-2);
  font-family: var(--serif); font-size: 13.5px; text-decoration: underline; text-underline-offset: 3px;
}
.auth-toggle button:hover { color: var(--ink); }
.auth-foot { font-family: var(--mono); font-size: 9px; color: var(--ink-4); letter-spacing: 0.18em; text-transform: uppercase; margin-top: 26px; text-align: center; line-height: 1.7; }
`;

const AccountStyles = () => React.createElement('style', { id: 'ds-account-css' }, ACCOUNT_CSS);

// ───────── Avatar ─────────
function Avatar({ user, size = 36, square = false }) {
  if (!user) return null;
  const c = DS.avatarColors(user.id);
  return (
    <div
      className={`ds-avatar ${square ? 'square' : ''}`}
      title={user.displayName}
      style={{
        width: size, height: size,
        background: c.bg, color: c.ink, borderColor: c.ring,
        fontSize: Math.round(size * 0.38),
      }}>
      {DS.initialsOf(user.displayName)}
    </div>
  );
}

// ───────── A single text field (matches the wizard's input vocabulary) ─────────
function AuthField({ label, type = 'text', value, onChange, placeholder, autoFocus, onEnter }) {
  return (
    <div className="input-row">
      <label>{label}</label>
      <input
        className="input-text"
        type={type}
        value={value}
        placeholder={placeholder || ''}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }}
      />
    </div>
  );
}

// ───────── The login gate ─────────
// OAuth only (Discord / Google). onProvider throws on failure; we catch + surface.
function AuthScreen({ onProvider }) {
  const [error, setError] = useAuthState('');

  // Real OAuth: this redirects to Discord/Google and returns to the app.
  const launchProvider = async (key) => {
    setError('');
    try { await onProvider(key); }
    catch (e) { setError(e.message || 'Something went wrong.'); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-crown">✠ · ❦ · ✦ · ❦ · ✠</div>
        <h1 className="auth-title">LIBER HEROUM</h1>
        <div className="auth-sub">The keeping of heroes, bound across many hands</div>

        <div className="auth-panel">
          <span className="bc bc-tl"></span><span className="bc bc-tr"></span>
          <span className="bc bc-bl"></span><span className="bc bc-br"></span>

          <div className="auth-mode-label">Enter the Chronicle</div>

          <div className="auth-providers">
            {Object.entries(DS.PROVIDERS).map(([key, p]) => (
              <button key={key} className="auth-provider" onClick={() => launchProvider(key)}>
                <span className="pm">{p.mark}</span>
                <span>Continue with {p.label}</span>
                <span className="pgo">→</span>
              </button>
            ))}
          </div>

          {error && <div className="auth-error">{error}</div>}
        </div>

        <div className="auth-foot">
          Accounts &amp; campaigns are kept on a shared server<br />
          sign in from any device to find your heroes
        </div>
      </div>
    </div>
  );
}

// ───────── Display Name prompt (shown once, right after first sign-in) ─────────
// Blocking full-screen card. Prefilled with the provider's name; the chosen value is
// what shows throughout the app. onConfirm(name) throws on failure; we catch + surface.
function DisplayNamePrompt({ defaultName, onConfirm }) {
  const [name, setName] = useAuthState(defaultName || '');
  const [error, setError] = useAuthState('');
  const [busy, setBusy] = useAuthState(false);

  const submit = async () => {
    if (!name.trim()) { setError('Choose a name fellow heroes will know you by.'); return; }
    setError(''); setBusy(true);
    try { await onConfirm(name); }
    catch (e) { setError(e.message || 'Something went wrong.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-crown">✠ · ❦ · ✦ · ❦ · ✠</div>
        <h1 className="auth-title">LIBER HEROUM</h1>
        <div className="auth-sub">By what name shall you be known?</div>

        <div className="auth-panel">
          <span className="bc bc-tl"></span><span className="bc bc-tr"></span>
          <span className="bc bc-bl"></span><span className="bc bc-br"></span>

          <div className="auth-mode-label">Inscribe a New Name</div>

          <div className="auth-fields" style={{ marginTop: 18 }}>
            <AuthField label="Display name" value={name} onChange={setName} placeholder="The name at your table" autoFocus onEnter={submit} />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div style={{ marginTop: 20 }}>
            <Button kind="primary" onClick={submit} disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
              {busy ? 'One moment…' : 'Enter the Chronicle'}
            </Button>
          </div>
        </div>

        <div className="auth-foot">This is how fellow heroes will see you — you can change it later</div>
      </div>
    </div>
  );
}

// ───────── App bar (top chrome for roster + campaign views) ─────────
function AppBar({ view, onNav, heroCount, campaignCount, user, onSignOut, onRename }) {
  return (
    <div className="ds-appbar">
      <div className="ab-mark">✠</div>
      <div className="ab-brand">LIBER HEROUM</div>
      <nav className="ds-nav">
        <button className={`ds-tab ${view === 'roster' ? 'on' : ''}`} onClick={() => onNav('roster')}>
          My Heroes <span className="ds-count">{heroCount}</span>
        </button>
        <button className={`ds-tab ${view === 'campaigns' || view === 'campaign' ? 'on' : ''}`} onClick={() => onNav('campaigns')}>
          Campaigns <span className="ds-count">{campaignCount}</span>
        </button>
      </nav>
      <AccountMenu user={user} onSignOut={onSignOut} onRename={onRename} />
    </div>
  );
}

// ───────── Account menu ─────────
function AccountMenu({ user, onSignOut, onRename }) {
  const [open, setOpen] = useAuthState(false);
  const [renaming, setRenaming] = useAuthState(false);
  const [name, setName] = useAuthState(user.displayName || '');
  const [error, setError] = useAuthState('');
  const [busy, setBusy] = useAuthState(false);
  const ref = useAuthRef(null);
  useAuthEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const openRename = () => { setOpen(false); setName(user.displayName || ''); setError(''); setRenaming(true); };
  const saveRename = async () => {
    if (!name.trim()) { setError('Choose a name fellow heroes will know you by.'); return; }
    setError(''); setBusy(true);
    try { await onRename(name); setRenaming(false); }
    catch (e) { setError(e.message || 'Something went wrong.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="ds-account" ref={ref}>
      <button className="ds-account-btn" onClick={() => setOpen(o => !o)}>
        <Avatar user={user} size={30} />
        <span className="nm">{user.displayName}</span>
        <span className="cv">▾</span>
      </button>

      {open && (
        <div className="ds-menu">
          <div className="m-head">
            <Avatar user={user} size={42} />
            <div style={{ minWidth: 0 }}>
              <div className="nm">{user.displayName}</div>
              <div className="em">{user.email}</div>
              <div className="m-prov">via {DS.PROVIDERS[user.provider] ? DS.PROVIDERS[user.provider].label : 'Email'}</div>
            </div>
          </div>

          {onRename && (
            <button className="m-item" onClick={openRename}>
              <span style={{ width: 26, textAlign: 'center' }}>✎</span>
              Change display name
            </button>
          )}

          <div className="m-foot">
            <button className="m-item danger" onClick={() => { setOpen(false); onSignOut(); }}>
              <span style={{ width: 26, textAlign: 'center' }}>⎋</span>
              Sign out
            </button>
          </div>
        </div>
      )}

      {renaming && (
        <Modal
          open
          title="Change display name"
          onClose={() => setRenaming(false)}
          footer={
            <Button kind="primary" onClick={saveRename} disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          }>
          <div className="auth-fields">
            <AuthField label="Display name" value={name} onChange={setName} placeholder="The name at your table" autoFocus onEnter={saveRename} />
          </div>
          {error && <div className="auth-error">{error}</div>}
        </Modal>
      )}
    </div>
  );
}

Object.assign(window, { AccountStyles, Avatar, AuthField, AuthScreen, DisplayNamePrompt, AppBar, AccountMenu });
export { AccountStyles, Avatar, AuthField, AuthScreen, DisplayNamePrompt, AppBar, AccountMenu };
