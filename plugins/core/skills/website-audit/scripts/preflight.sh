#!/usr/bin/env bash
# Reports which audit tools can actually run. Exit 0 always; the report is the output.
CHROME=""
for c in "$CHROME_PATH" "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
         "$(command -v google-chrome 2>/dev/null)" "$(command -v chromium 2>/dev/null)" \
         "$(command -v chromium-browser 2>/dev/null)"; do
  [ -n "$c" ] && [ -x "$c" ] && CHROME="$c" && break
done
echo "== website-audit preflight =="
if [ -n "$CHROME" ]; then
  echo "chrome:      OK  ($CHROME)"; echo "             export CHROME_PATH=\"$CHROME\""
else
  echo "chrome:      MISSING — Lighthouse, axe, pa11y and consent-check cannot run; mark those findings INFERRED"
fi
command -v node >/dev/null && echo "node:        OK  ($(node -v))" || echo "node:        MISSING"
command -v npx  >/dev/null && echo "npx:         OK" || echo "npx:         MISSING"
command -v curl >/dev/null && echo "curl:        OK" || echo "curl:        MISSING"
if grep -P '' </dev/null >/dev/null 2>&1; then echo "grep -P:     OK"; else echo "grep -P:     NO  — use grep -E / sed / node for extraction"; fi
[ -n "$SERPAPI_KEY" ]        && echo "serp api:    OK  (SERPAPI_KEY set — SERP positions can be MEASURED)" \
                             || echo "serp api:    NONE — SERP positions and AI Overview presence are INFERRED; say so in the report"
[ -n "$DATAFORSEO_LOGIN" ]   && echo "dataforseo:  OK" || true
SD="$(cd "$(dirname "$0")" && pwd)"
if [ ! -d "$SD/node_modules/puppeteer-core" ]; then
  (cd "$SD" && npm install --silent --no-audit --no-fund >/dev/null 2>&1) && echo "consent-check: OK  (deps installed)" || echo "consent-check: FAILED to install puppeteer-core — cookie test is INFERRED"
else echo "consent-check: OK"; fi
echo "output root: ${AUDIT_OUTPUT_DIR:-$HOME/audits}"
