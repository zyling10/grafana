import { sanitizeUrl as braintreeSanitizeUrl } from '@braintree/sanitize-url';
import DOMPurify from 'dompurify';
import * as xss from 'xss';

const XSSWL = Object.keys(xss.whiteList).reduce<xss.IWhiteList>((acc, element) => {
  acc[element] = xss.whiteList[element]?.concat(['class', 'style']);
  return acc;
}, {});

const sanitizeXSS = new xss.FilterXSS({
  whiteList: XSSWL,
});

const sanitizeTextPanelWhitelist = new xss.FilterXSS({
  whiteList: XSSWL,
  css: {
    whiteList: {
      ...xss.getDefaultCSSWhiteList(),
      'flex-direction': true,
      'flex-wrap': true,
      'flex-basis': true,
      'flex-grow': true,
      'flex-shrink': true,
      'flex-flow': true,
      gap: true,
      order: true,
      'justify-content': true,
      'justify-items': true,
      'justify-self': true,
      'align-items': true,
      'align-content': true,
      'align-self': true,
    },
  },
});

/**
 * Returns string safe from XSS attacks.
 *
 * Even though we allow the style-attribute, there's still default filtering applied to it
 * Info: https://github.com/leizongmin/js-xss#customize-css-filter
 * Whitelist: https://github.com/leizongmin/js-css-filter/blob/master/lib/default.js
 */
export function sanitize(unsanitizedString: string): string {
  try {
    return sanitizeXSS.process(unsanitizedString);
  } catch (error) {
    console.error('String could not be sanitized', unsanitizedString);
    return unsanitizedString;
  }
}

const panelHtmlConfig = {
  USE_PROFILES: {
    html: true,
  },
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
};

export function sanitizeTextPanelContent(unsanitizedString: string): string {
  try {
    if (false) {
      console.log(xss.getDefaultCSSWhiteList());
      return DOMPurify.sanitize(unsanitizedString, panelHtmlConfig);
    }
    return sanitizeTextPanelWhitelist.process(unsanitizedString);
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
