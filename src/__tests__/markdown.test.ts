import { describe, it, expect, vi } from 'vitest';
import { renderMarkdownToHtml } from '@/lib/markdown';

describe('renderMarkdownToHtml', () => {
  it('strips script tags from markdown output', () => {
    const html = renderMarkdownToHtml('Hello <script>alert(1)</script> **world**');
    expect(html).not.toContain('<script>');
    expect(html).toContain('<strong>world</strong>');
  });

  it('escapes output when window is unavailable', () => {
    const originalWindow = globalThis.window;
    try {
      vi.stubGlobal('window', undefined);
      const html = renderMarkdownToHtml('**world**');
      expect(html).toContain('&lt;');
    } finally {
      vi.stubGlobal('window', originalWindow);
    }
  });
});
