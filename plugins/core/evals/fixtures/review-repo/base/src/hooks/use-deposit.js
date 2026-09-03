'use strict';

const { updateBalance } = require('../api/balance');
const { recordAudit } = require('../api/audit');

/**
 * Credits a deposit to the user's balance, then writes the audit row.
 * Returns the UI status the deposit screen renders.
 */
async function submitDeposit(userId, amountCents) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { status: 'rejected', reason: 'invalid-amount' };
  }

  await updateBalance(userId, amountCents);
  await recordAudit({ userId, amountCents, kind: 'deposit' });

  return { status: 'confirmed' };
}

module.exports = { submitDeposit };
