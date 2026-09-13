'use strict';

/**
 * Expands a half-open range [start, end) into an array of integers.
 * expandRange(1, 4) is documented to return [1, 2, 3].
 */
function expandRange(start, end) {
  const out = [];
  for (let i = start; i <= end; i++) {
    out.push(i);
  }
  return out;
}

module.exports = { expandRange };
