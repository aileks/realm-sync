import { marked } from 'marked';
import DOMPurify from 'dompurify';

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

export function renderMarkdownToHtml(markdown: string) {
  const rawHtml = marked.parse(markdown, { async: false });
  const canSanitize =
    typeof window !== 'undefined' &&
    DOMPurify.isSupported &&
    typeof DOMPurify.sanitize === 'function';
  if (canSanitize) {
    return DOMPurify.sanitize(rawHtml);
  }
  return escapeHtml(rawHtml);
}
