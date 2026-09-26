// The Identity step must upload a chosen portrait to Storage and keep only its
// URL on the hero. Storing the image inline as a base64 data URL pushed hero rows
// past Realtime's 1 MiB record cap, which truncated their live-sync payloads.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor, screen } from '@testing-library/react';
import React from 'react';
import { Wizard } from '../wizard.jsx';
import { newCharacter } from '../app.jsx';
import { DS } from '../backend.jsx';
import { DS_STEPS } from '../data.jsx';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const IDENTITY_STEP = DS_STEPS.findIndex((s: any) => /identity/i.test(s.id));

function heroAtIdentity() {
  const c: any = newCharacter('u-test', null);
  c.wizardStep = IDENTITY_STEP;
  c.identity.name = 'Test Hero';
  c.name = 'Test Hero';
  return c;
}

function mountWithUpdates() {
  let latest = heroAtIdentity();
  const update = (mut: any) => { latest = typeof mut === 'function' ? mut(latest) : mut; };
  const utils = render(<Wizard character={latest} update={update} onExit={() => {}} onComplete={() => {}} />);
  return { ...utils, latest: () => latest };
}

describe('Identity step — portrait upload', () => {
  it('uploads the file and stores the returned URL, never a data: URL', async () => {
    const upload = vi.spyOn(DS, 'uploadPortrait').mockResolvedValue('https://example.test/portraits/u-test/p.png');
    const { container, latest } = mountWithUpdates();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['not-really-an-image'], 'face.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(latest().portrait).toBe('https://example.test/portraits/u-test/p.png'));
    expect(String(latest().portrait)).not.toMatch(/^data:/);
  });

  it('keeps the hero untouched and says so when the upload fails', async () => {
    vi.spyOn(DS, 'uploadPortrait').mockRejectedValue(new Error('bucket offline'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container, latest } = mountWithUpdates();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'face.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/could not be uploaded/i));
    expect(latest().portrait).toBe('');
    expect(errSpy).toHaveBeenCalled();
  });

  it('ignores non-image files', async () => {
    const upload = vi.spyOn(DS, 'uploadPortrait').mockResolvedValue('https://example.test/p.png');
    const { container } = mountWithUpdates();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] } });
    await new Promise(r => setTimeout(r, 10));
    expect(upload).not.toHaveBeenCalled();
  });
});
