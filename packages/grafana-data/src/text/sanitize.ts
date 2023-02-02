import { sanitizeUrl as braintreeSanitizeUrl } from '@braintree/sanitize-url';
import DOMPurify from 'dompurify';

const allowedAttributes: { [tag: string]: string[] } = {
  a: ['target', 'href', 'title'],
  abbr: ['title'],
  address: [],
  area: ['shape', 'coords', 'href', 'alt'],
  article: [],
  aside: [],
  audio: ['autoplay', 'controls', 'crossorigin', 'loop', 'muted', 'preload', 'src'],
  b: [],
  bdi: ['dir'],
  bdo: ['dir'],
  big: [],
  blockquote: ['cite'],
  br: [],
  caption: [],
  center: [],
  cite: [],
  code: [],
  col: ['align', 'valign', 'span', 'width'],
  colgroup: ['align', 'valign', 'span', 'width'],
  dd: [],
  del: ['datetime'],
  details: ['open'],
  div: ['class', 'style'],
  dl: [],
  dt: [],
  em: [],
  figcaption: [],
  figure: [],
  font: ['color', 'size', 'face'],
  footer: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  h5: [],
  h6: [],
  header: [],
  hr: [],
  i: [],
  img: ['src', 'alt', 'title', 'width', 'height'],
  ins: ['datetime'],
  li: [],
  mark: [],
  nav: [],
  ol: [],
  p: [],
  pre: [],
  s: [],
  section: [],
  small: [],
  span: [],
  sub: [],
  summary: [],
  sup: [],
  strong: [],
  strike: [],
  table: ['width', 'border', 'align', 'valign'],
  tbody: ['align', 'valign'],
  td: ['width', 'rowspan', 'colspan', 'align', 'valign'],
  tfoot: ['align', 'valign'],
  th: ['width', 'rowspan', 'colspan', 'align', 'valign'],
  thead: ['align', 'valign'],
  tr: ['rowspan', 'align', 'valign'],
  tt: [],
  u: [],
  ul: [],
  video: [
    'autoplay',
    'controls',
    'crossorigin',
    'loop',
    'muted',
    'playsinline',
    'poster',
    'preload',
    'src',
    'height',
    'width',
  ],
};

// Add a hook to DOMPurify to only allow specified attributes on specific tags
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName) {
    if (allowedAttributes[node.tagName.toLowerCase()]) {
      // Get the allowed attributes for the current tag
      const allowedAttrs = allowedAttributes[node.tagName.toLowerCase()];

      // Iterate over all attributes of the current node
      for (let i = node.attributes.length - 1; i >= 0; i--) {
        const attr = node.attributes[i];

        // If the attribute is not in the allowed attributes list, remove it
        if (!allowedAttrs.includes(attr.name)) {
          node.removeAttribute(attr.name);
        }
      }
    }
  }
});

DOMPurify.setConfig({
  ALLOWED_TAGS: Object.keys(allowedAttributes),
  ALLOWED_ATTR: Object.values(allowedAttributes).reduce((acc, val) => acc.concat(val), []),
  IN_PLACE: true,
});

/**
 * Returns string safe from XSS attacks using DOMPurify.
 * There's a a chance that DOMPurify will throw an error, in that case we escape the string.
 * The allow list is defined in the allowedAttributes object, and originates from js-xss library.
 */

export function sanitize(unsanitizedString: string): string {
  try {
    return DOMPurify.sanitize(unsanitizedString);
  } catch (error) {
    console.error('String could not be sanitized', unsanitizedString);
    return escapeHtml(unsanitizedString);
  }
}

export function sanitizeTextPanelContent(unsanitizedString: string): string {
  try {
    return DOMPurify.sanitize(unsanitizedString);
  } catch (error) {
    console.error('String could not be sanitized', unsanitizedString);
    return 'Text string could not be sanitized';
  }
}

export function sanitizeSVGContent(unsanitizedString: string): string {
  return DOMPurify.sanitize(unsanitizedString, { USE_PROFILES: { svg: true, svgFilters: true } });
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
