import { sanitizeUrl as braintreeSanitizeUrl } from '@braintree/sanitize-url';
import DOMPurify from 'dompurify';

const allowedAttributes: { [tag: string]: string[] } = {
  a: ['target', 'href', 'title', 'class', 'style'],
  abbr: ['title', 'class', 'style'],
  address: ['class', 'style'],
  area: ['shape', 'coords', 'href', 'alt', 'class', 'style'],
  article: ['class', 'style'],
  aside: ['class', 'style'],
  audio: ['autoplay', 'controls', 'crossorigin', 'loop', 'muted', 'preload', 'src', 'class', 'style'],
  b: ['class', 'style'],
  bdi: ['dir', 'class', 'style'],
  bdo: ['dir', 'class', 'style'],
  big: ['class', 'style'],
  blockquote: ['cite', 'class', 'style'],
  br: ['class', 'style'],
  caption: ['class', 'style'],
  center: ['class', 'style'],
  cite: ['class', 'style'],
  code: ['class', 'style'],
  col: ['align', 'valign', 'span', 'width', 'class', 'style'],
  colgroup: ['align', 'valign', 'span', 'width', 'class', 'style'],
  dd: ['class', 'style'],
  del: ['datetime', 'class', 'style'],
  details: ['open', 'class', 'style'],
  div: ['class', 'style', 'class', 'style'],
  dl: ['class', 'style'],
  dt: ['class', 'style'],
  em: ['class', 'style'],
  figcaption: ['class', 'style'],
  figure: ['class', 'style'],
  font: ['color', 'size', 'face', 'class', 'style'],
  footer: ['class', 'style'],
  h1: ['class', 'style'],
  h2: ['class', 'style'],
  h3: ['class', 'style'],
  h4: ['class', 'style'],
  h5: ['class', 'style'],
  h6: ['class', 'style'],
  header: ['class', 'style'],
  hr: ['class', 'style'],
  i: ['class', 'style'],
  img: ['src', 'alt', 'title', 'width', 'height', 'class', 'style'],
  ins: ['datetime', 'class', 'style'],
  li: ['class', 'style'],
  mark: ['class', 'style'],
  nav: ['class', 'style'],
  ol: ['class', 'style'],
  p: ['class', 'style'],
  pre: ['class', 'style'],
  s: ['class', 'style'],
  section: ['class', 'style'],
  small: ['class', 'style'],
  span: ['class', 'style'],
  sub: ['class', 'style'],
  summary: ['class', 'style'],
  sup: ['class', 'style'],
  strong: ['class', 'style'],
  strike: ['class', 'style'],
  table: ['width', 'border', 'align', 'valign', 'class', 'style'],
  tbody: ['align', 'valign', 'class', 'style'],
  td: ['width', 'rowspan', 'colspan', 'align', 'valign', 'class', 'style'],
  tfoot: ['align', 'valign', 'class', 'style'],
  th: ['width', 'rowspan', 'colspan', 'align', 'valign', 'class', 'style'],
  thead: ['align', 'valign', 'class', 'style'],
  tr: ['rowspan', 'align', 'valign', 'class', 'style'],
  tt: ['class', 'style'],
  u: ['class', 'style'],
  ul: ['class', 'style'],
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
    'class',
    'style',
  ],
};

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
  KEEP_CONTENT: true,
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
