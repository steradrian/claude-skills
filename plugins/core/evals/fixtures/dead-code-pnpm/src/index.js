'use strict';

const { slugify } = require('./slugify');

function menuItemPath(name) {
  return `/menu/${slugify(name)}`;
}

module.exports = { menuItemPath };
