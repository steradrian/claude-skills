'use strict';

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Never imported anywhere — the dead export knip is expected to surface.
function titleCase(value) {
  return String(value).replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

module.exports = { slugify, titleCase };
