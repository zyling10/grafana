import { sanitizeUrl as braintreeSanitizeUrl } from '@braintree/sanitize-url';
import DOMPurify from 'dompurify';

/**
 * Returns string safe from XSS attacks using DOMPurify.
 */

export function sanitize(unsanitizedString: string): string {
  DOMPurify.setConfig({
    SANITIZE_NAMED_PROPS: true,
    ALLOWED_ATTR: [
      'style',
      'class',
      'align',
      'alt',
      'autoplay',
      'border',
      'color',
      'colspan',
      'controls',
      'coords',
      'crossorigin',
      'datetime',
      'dir',
      'face',
      'height',
      'href',
      'loop',
      'muted',
      'open',
      'playsinline',
      'poster',
      'preload',
      'rowspan',
      'shape',
      'size',
      'span',
      'src',
      'target',
      'title',
      'valign',
      'width',
    ],
    ALLOWED_TAGS: [
      'a',
      'abbr',
      'address',
      'area',
      'article',
      'aside',
      'audio',
      'b',
      'bdi',
      'bdo',
      'big',
      'blockquote',
      'br',
      'caption',
      'center',
      'cite',
      'code',
      'col',
      'colgroup',
      'dd',
      'del',
      'details',
      'div',
      'dl',
      'dt',
      'em',
      'figcaption',
      'figure',
      'font',
      'footer',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'header',
      'hr',
      'i',
      'img',
      'ins',
      'li',
      'mark',
      'nav',
      'ol',
      'p',
      'pre',
      's',
      'section',
      'small',
      'span',
      'sub',
      'summary',
      'sup',
      'strong',
      'strike',
      'table',
      'tbody',
      'td',
      'tfoot',
      'th',
      'thead',
      'tr',
      'tt',
      'u',
      'ul',
      'video',
    ],
  });
  try {
    return DOMPurify.sanitize(unsanitizedString);
  } catch (error) {
    console.error('String could not be sanitized', unsanitizedString);
    return 'Text string could not be sanitized';
  }
}

export function sanitizeUrl(url: string): string {
  return braintreeSanitizeUrl(url);
}

export function hasAnsiCodes(input: string): boolean {
  return /\u001b\[\d{1,2}m/.test(input);
}

export function escapeHtml(str: string): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
