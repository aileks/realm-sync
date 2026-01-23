import { describe, it, expect } from 'vitest';
import { renderMarkdownToHtml } from '@/lib/markdown';

describe('renderMarkdownToHtml', () => {
  it('strips script tags from markdown output', () => {
    const html = renderMarkdownToHtml('Hello <script>alert(1)</script> **world**');
    expect(html).not.toContain('<script>');
    expect(html).toContain('<strong>world</strong>');
  });
});
