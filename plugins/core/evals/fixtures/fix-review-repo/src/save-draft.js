'use strict';

const { persist } = require('./storage');

/**
 * Writes the draft, then reports what the editor should show in the status bar.
 */
async function saveDraft(draftId, body) {
  const trimmed = String(body ?? '').trim();
  if (trimmed.length === 0) {
    return { saved: false, reason: 'empty' };
  }

  persist(draftId, trimmed);

  return { saved: true, at: Date.now() };
}

module.exports = { saveDraft };
