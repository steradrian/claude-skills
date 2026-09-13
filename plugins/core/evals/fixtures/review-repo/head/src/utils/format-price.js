'use strict';

function formatPrice(amountCents) {
  return `$${(amountCents / 100).toFixed(2)}`;
}

module.exports = { formatPrice };
