# Lighthouse CLI Flags Reference

## Device presets

### Desktop
```bash
--preset=desktop \
--screenEmulation.width=1350 \
--screenEmulation.height=940 \
--screenEmulation.deviceScaleFactor=1 \
--screenEmulation.mobile=false
```

### Mobile (default Lighthouse behavior)
```bash
--form-factor=mobile \
--screenEmulation.width=375 \
--screenEmulation.height=812 \
--screenEmulation.deviceScaleFactor=3 \
--screenEmulation.mobile=true \
--throttling.rttMs=150 \
--throttling.throughputKbps=1638.4 \
--throttling.cpuSlowdownMultiplier=4
```

## Throttling options

### Applied throttling (default, simulates slow network)
No extra flags needed — Lighthouse applies throttling by default.

### No throttling (fastest, least realistic)
```bash
--throttling-method=provided
```

### Devtools throttling (more accurate, slower)
```bash
--throttling-method=devtools
```

## Output formats

```bash
--output=json                         # JSON only
--output=html                         # HTML report only
--output=json,html                    # Both
--output-path=./lighthouse-report     # Base filename (extensions added automatically for multiple formats)
```

## Headless Chrome flags (use in CI / no-display environments)
```bash
--chrome-flags="--headless --no-sandbox --disable-dev-shm-usage --disable-gpu"
```

## Auth / cookies (if page requires login)
```bash
--extra-headers='{"Cookie": "session=abc123"}'
```

## Performance budget
```bash
--budget-path=./budget.json
```

## Categories
```bash
--only-categories=performance,accessibility,best-practices,seo
```

## Useful debugging flags
```bash
--verbose          # Detailed logging
--quiet            # Suppress output (good for CI)
--max-wait-for-load=60000   # Max wait in ms (default 45000)
```

## Full recommended command

### Desktop
```bash
npx lighthouse <URL> \
  --output=json \
  --output-path=./lighthouse-before.json \
  --preset=desktop \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" \
  --quiet
```

### Mobile
```bash
npx lighthouse <URL> \
  --output=json \
  --output-path=./lighthouse-before.json \
  --form-factor=mobile \
  --screenEmulation.width=375 \
  --screenEmulation.height=812 \
  --screenEmulation.deviceScaleFactor=3 \
  --screenEmulation.mobile=true \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" \
  --quiet
```
