'use strict';

async function persist(draftId, body) {
  return { draftId, bytes: Buffer.byteLength(body, 'utf8') };
}

module.exports = { persist };
