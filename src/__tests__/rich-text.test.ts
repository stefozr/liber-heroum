// rich-text — the markdown subset the shipped rules text uses. Fixtures are
// verbatim excerpts from src/data, so a content change that introduces a marker
// the parser doesn't know shows up here rather than on screen.
import { describe, it, expect } from 'vitest';
import { parseBlocks, parseInline, blocksToHtml, isPlain } from '../rich-text.js';
import { DS_CLASSES, DS_COMPLICATIONS, DS_ANCESTRIES } from '../data.jsx';

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const text = (spans: any[]) => spans.map((s: any) => s.s).join('');

describe('inline runs', () => {
  it('reads **bold** and *italic*, leaving unpaired markers literal', () => {
    expect(parseInline('a **b** c')).toEqual([
      { t: 'text', s: 'a ' }, { t: 'b', s: 'b' }, { t: 'text', s: ' c' },
    ]);
    expect(parseInline('see *Draw Steel: Monsters* now')).toEqual([
      { t: 'text', s: 'see ' }, { t: 'i', s: 'Draw Steel: Monsters' }, { t: 'text', s: ' now' },
    ]);
    // An odd marker is a content bug that data-lint reports; swallowing it here
    // would hide the very thing that test checks.
    expect(parseInline('a ** b')).toEqual([{ t: 'text', s: 'a ** b' }]);
  });

  it('does not read a bold run as an empty italic', () => {
    // classes.js tier text: '8 + **A** psychic damage; …'
    expect(parseInline('8 + **A** psychic')).toEqual([
      { t: 'text', s: '8 + ' }, { t: 'b', s: 'A' }, { t: 'text', s: ' psychic' },
    ]);
  });
});

describe('blocks', () => {
  it('leaves plain prose as a single paragraph', () => {
    const b = parseBlocks('One sentence. Then another.');
    expect(b).toHaveLength(1);
    expect(b[0].kind).toBe('p');
    expect(text(b[0].spans)).toBe('One sentence. Then another.');
  });

  it('splits paragraphs on the blank line', () => {
    expect(parseBlocks('First.\n\nSecond.\n\nThird.').map(b => b.kind)).toEqual(['p', 'p', 'p']);
  });

  it('gathers - lines into one list', () => {
    const b = parseBlocks('Intro:\n\n- one\n- two\n- three');
    expect(b.map(x => x.kind)).toEqual(['p', 'list']);
    expect((b[1] as any).items.map(text)).toEqual(['one', 'two', 'three']);
  });

  it('reads a bold-only paragraph as a heading', () => {
    const b = parseBlocks('Lead.\n\n**Discipline in Combat**\n\nBody.');
    expect(b.map(x => x.kind)).toEqual(['p', 'h', 'p']);
    expect(text((b[1] as any).spans)).toBe('Discipline in Combat');
  });

  it('reads a > sidebar, keeping its own paragraphs', () => {
    const b = parseBlocks('Before.\n\n> **Soul-y Moley!**\n>\n> One.\n>\n> Two.');
    expect(b.map(x => x.kind)).toEqual(['p', 'quote']);
    expect((b[1] as any).blocks.map((x: any) => x.kind)).toEqual(['h', 'p', 'p']);
  });

  it('leaves pipe-separated stat values alone', () => {
    // summoner-minions.js ships stamina: '4 | 4 | 4' — tier values, not a table.
    expect(isPlain('4 | 4 | 4')).toBe(true);
    expect(isPlain('One plain sentence.')).toBe(true);
    expect(isPlain('Has a\nnewline')).toBe(false);
  });
});

describe('shipped content', () => {
  const featureText = (clsId: string, name: string) => {
    const cls: any = DS_CLASSES.find((c: any) => c.id === clsId);
    const all = [...(cls.features || []), ...(cls.subclasses || []).flatMap((s: any) => s.features || [])];
    return all.find((f: any) => f.name === name)?.text;
  };

  it('parses the Null Field effect into prose, a labelled list and a closer', () => {
    const nullCls: any = DS_CLASSES.find((c: any) => c.id === 'null');
    const field = nullCls.features.flatMap((f: any) => f.ability ? [f.ability] : [])
      .find((a: any) => a.name === 'Null Field');
    const blocks = parseBlocks(field.effect);
    expect(blocks.map(b => b.kind)).toContain('list');
    const list: any = blocks.find(b => b.kind === 'list');
    expect(list.items).toHaveLength(3);
    // '- **Inertial Anchor:** Any target who…' — the label is a bold run, not text.
    expect(list.items.every((it: any[]) => it[0].t === 'b')).toBe(true);
    expect(blocks[blocks.length - 1].kind).toBe('p');
  });

  it('parses the resource features into headed sections', () => {
    for (const [cls, name] of [['null', 'Discipline'], ['shadow', 'Insight'], ['tactician', 'Focus']] as const) {
      const blocks = parseBlocks(featureText(cls, name));
      const heads = blocks.filter(b => b.kind === 'h').map((b: any) => text(b.spans));
      expect(heads).toEqual([`${name} in Combat`, `${name} Outside of Combat`]);
    }
  });

  it('parses Advanced Studies bullets and Doomsight paragraphs', () => {
    const adv: any = DS_COMPLICATIONS.find((c: any) => c.id === 'advanced-studies');
    expect(parseBlocks(adv.benefit).some(b => b.kind === 'list')).toBe(true);

    const hakaan: any = DS_ANCESTRIES.find((a: any) => a.id === 'hakaan');
    const doom = hakaan.traits.find((t: any) => t.name === 'Doomsight');
    expect(parseBlocks(doom.text).map(b => b.kind)).toEqual(['p', 'p', 'p']);
  });

  it('never leaves a stray asterisk in rendered spans', () => {
    const stray: string[] = [];
    const walk = (blocks: any[], where: string) => {
      for (const b of blocks) {
        if (b.kind === 'list') b.items.forEach((it: any[], i: number) => check(it, `${where}[${i}]`));
        else if (b.kind === 'quote') walk(b.blocks, where);
        else check(b.spans, where);
      }
    };
    const check = (spans: any[], where: string) => {
      for (const s of spans) if (s.s.includes('*')) stray.push(`${where}: ${s.s.slice(0, 60)}`);
    };
    const seen = (node: any, path: string) => {
      if (typeof node === 'string') { walk(parseBlocks(node), path); return; }
      if (Array.isArray(node)) { node.forEach((v, i) => seen(v, `${path}[${i}]`)); return; }
      if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) seen(v, `${path}.${k}`);
    };
    seen(DS_CLASSES, 'DS_CLASSES');
    seen(DS_ANCESTRIES, 'DS_ANCESTRIES');
    seen(DS_COMPLICATIONS, 'DS_COMPLICATIONS');
    expect(stray).toEqual([]);
  });
});

describe('html emitter (Foundry export)', () => {
  it('emits real paragraphs, lists and bold', () => {
    const html = blocksToHtml(parseBlocks('Lead.\n\n- **A:** one\n- two'), esc);
    expect(html).toBe('<p>Lead.</p><ul><li><strong>A:</strong> one</li><li>two</li></ul>');
  });

  it('escapes content but not its own tags', () => {
    const html = blocksToHtml(parseBlocks('a < b & **c**'), esc);
    expect(html).toBe('<p>a &lt; b &amp; <strong>c</strong></p>');
  });

  it('nests a sidebar', () => {
    expect(blocksToHtml(parseBlocks('> **Hi**\n>\n> Body.'), esc))
      .toBe('<blockquote><h4><strong>Hi</strong></h4><p>Body.</p></blockquote>');
  });
});
