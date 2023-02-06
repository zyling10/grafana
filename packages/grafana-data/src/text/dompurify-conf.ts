// This file is a copy of the default configuration of dompurify
// Create a new object and add the tags and attributes that we want to allow
// We do this to avoid modifying the default configuration of dompurify (prototype pollution)

export const allowedAttributesHTML: { [tag: string]: string[] } = Object.create(null);
allowedAttributesHTML.a = ['target', 'href', 'title', 'class', 'style'];
allowedAttributesHTML.abbr = ['title', 'class', 'style'];
allowedAttributesHTML.address = ['class', 'style'];
allowedAttributesHTML.area = ['shape', 'coords', 'href', 'alt', 'class', 'style'];
allowedAttributesHTML.article = ['class', 'style'];
allowedAttributesHTML.aside = ['class', 'style'];
allowedAttributesHTML.audio = [
  'autoplay',
  'controls',
  'crossorigin',
  'loop',
  'muted',
  'preload',
  'src',
  'class',
  'style',
];
allowedAttributesHTML.b = ['class', 'style'];
allowedAttributesHTML.bdi = ['dir', 'class', 'style'];
allowedAttributesHTML.bdo = ['dir', 'class', 'style'];
allowedAttributesHTML.big = ['class', 'style'];
allowedAttributesHTML.blockquote = ['cite', 'class', 'style'];
allowedAttributesHTML.br = ['class', 'style'];
allowedAttributesHTML.caption = ['class', 'style'];
allowedAttributesHTML.center = ['class', 'style'];
allowedAttributesHTML.cite = ['class', 'style'];
allowedAttributesHTML.code = ['class', 'style'];
allowedAttributesHTML.col = ['align', 'valign', 'span', 'width', 'class', 'style'];
allowedAttributesHTML.colgroup = ['align', 'valign', 'span', 'width', 'class', 'style'];
allowedAttributesHTML.dd = ['class', 'style'];
allowedAttributesHTML.del = ['datetime', 'class', 'style'];
allowedAttributesHTML.dfn = ['class', 'style'];
allowedAttributesHTML.dir = ['class', 'style'];
allowedAttributesHTML.div = ['class', 'style'];
allowedAttributesHTML.dl = ['class', 'style'];
allowedAttributesHTML.dt = ['class', 'style'];
allowedAttributesHTML.em = ['class', 'style'];
allowedAttributesHTML.font = ['color', 'size', 'face', 'class', 'style'];
allowedAttributesHTML.footer = ['class', 'style'];
allowedAttributesHTML.h1 = ['class', 'style'];
allowedAttributesHTML.h2 = ['class', 'style'];
allowedAttributesHTML.h3 = ['class', 'style'];
allowedAttributesHTML.h4 = ['class', 'style'];
allowedAttributesHTML.h5 = ['class', 'style'];
allowedAttributesHTML.h6 = ['class', 'style'];
allowedAttributesHTML.header = ['class', 'style'];
allowedAttributesHTML.hr = ['class', 'style'];
allowedAttributesHTML.i = ['class', 'style'];
allowedAttributesHTML.img = ['src', 'alt', 'title', 'width', 'height', 'class', 'style'];
allowedAttributesHTML.ins = ['datetime', 'class', 'style'];
allowedAttributesHTML.li = ['class', 'style'];
allowedAttributesHTML.mark = ['class', 'style'];
allowedAttributesHTML.nav = ['class', 'style'];
allowedAttributesHTML.ol = ['class', 'style'];
allowedAttributesHTML.p = ['class', 'style'];
allowedAttributesHTML.pre = ['class', 'style'];
allowedAttributesHTML.s = ['class', 'style'];
allowedAttributesHTML.section = ['class', 'style'];
allowedAttributesHTML.small = ['class', 'style'];
allowedAttributesHTML.span = ['class', 'style'];
allowedAttributesHTML.sub = ['class', 'style'];
allowedAttributesHTML.sup = ['class', 'style'];
allowedAttributesHTML.strong = ['class', 'style'];
allowedAttributesHTML.table = ['width', 'border', 'align', 'valign', 'class', 'style'];
allowedAttributesHTML.tbody = ['align', 'valign', 'class', 'style'];
allowedAttributesHTML.td = ['width', 'rowspan', 'colspan', 'align', 'valign', 'class', 'style'];
allowedAttributesHTML.tfoot = ['align', 'valign', 'class', 'style'];
allowedAttributesHTML.th = ['width', 'rowspan', 'colspan', 'align', 'valign', 'class', 'style'];
allowedAttributesHTML.thead = ['align', 'valign', 'class', 'style'];
allowedAttributesHTML.tr = ['rowspan', 'align', 'valign', 'class', 'style'];
allowedAttributesHTML.tt = ['class', 'style'];
allowedAttributesHTML.u = ['class', 'style'];
allowedAttributesHTML.ul = ['class', 'style'];
allowedAttributesHTML.video = [
  'autoplay',
  'controls',
  'loop',
  'muted',
  'preload',
  'src',
  'height',
  'width',
  'class',
  'style',
];
