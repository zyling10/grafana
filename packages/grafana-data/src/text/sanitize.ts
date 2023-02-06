import { sanitizeUrl as braintreeSanitizeUrl } from '@braintree/sanitize-url';
import DOMPurify from 'dompurify';

import { allowedAttributesHTML } from './dompurify-conf';

/**
 * Returns string safe from XSS attacks using DOMPurify.
 * There's a a chance that DOMPurify will throw an error, in that case we escape the string.
 * The allow list is defined in the allowedAttributes object, and originates from js-xss library.
 */

export function sanitize(unsanitizedString: string): string {
  try {
    return DOMPurify.sanitize(unsanitizedString, {
      ALLOWED_TAGS: Object.keys(allowedAttributesHTML),
      ALLOWED_ATTR: Object.values(allowedAttributesHTML).reduce((acc, val) => acc.concat(val), []),
      IN_PLACE: true,
      KEEP_CONTENT: true,
    });
  } catch (error) {
    console.error('String could not be sanitized', unsanitizedString);
    return escapeHtml(unsanitizedString);
  }
}

// This function is used to sanitize text panel content.
// We will allow some HTML tags and attributes, but we will escape the rest.
// This is because DOMPurify will remove the entire tag if it contains an attribute that is not in the allow list.
export function sanitizeTextPanelContent(unsanitizedString: string): string {
  try {
    const tags = unsanitizedString.match(/<[^>]+>/g) || [];
    for (const tag of tags) {
      const tagName = tag.match(/<\/?([a-z][a-z0-9]*)\b[^>]*>/i)?.[1] || '';
      if (!allowedAttributesHTML[tagName]) {
        unsanitizedString = unsanitizedString.replace(tag, escapeHtml(tag));
      }
    }
    return DOMPurify.sanitize(unsanitizedString, {
      ALLOWED_TAGS: Object.keys(allowedAttributesHTML),
      ALLOWED_ATTR: Object.values(allowedAttributesHTML).reduce((acc, val) => acc.concat(val), []),
      IN_PLACE: true,
      KEEP_CONTENT: true,
    });
  } catch (error) {
    console.error('String could not be sanitized', unsanitizedString);
    return 'Text string could not be sanitized';
  }
}

// This DOMPurify hook is used to remove attributes that are not in the allow list for specific tags.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName) {
    if (allowedAttributesHTML[node.tagName.toLowerCase()]) {
      // Get the allowed attributes for the current tag
      const allowedAttrs = allowedAttributesHTML[node.tagName.toLowerCase()];

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
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#47;')
    .replace(/"/g, '&quot;');
}
