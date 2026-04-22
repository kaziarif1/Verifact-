# Verifact Load Tests (Phase 6)

## Prerequisites
```bash
# Install k6
winget install k6        # Windows
brew install k6          # macOS
```

## Run Tests

### Feed (500 concurrent users)
```bash
k6 run load-tests/feed.js
# With custom base URL:
k6 run -e BASE_URL=http://localhost:5000 load-tests/feed.js
```

### Voting (100 concurrent users on one claim)
```bash
k6 run -e CLAIM_ID=<your-claim-id> -e AUTH_TOKEN=<your-jwt> load-tests/voting.js
```

### ML Service (50 concurrent predictions)
```bash
k6 run -e ML_KEY=<your-key> -e ML_URL=http://localhost:8000 load-tests/ml_service.js
```

## Targets (from planning.txt)
| Test     | Users | p95 target  |
|----------|-------|-------------|
| Feed     | 500   | < 300ms     |
| Voting   | 100   | < 500ms     |
| ML       | 50    | < 2000ms    |
