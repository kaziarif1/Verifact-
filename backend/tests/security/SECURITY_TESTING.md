# Verifact Security Testing Guide (Phase 6)

## 1. Automated OWASP ZAP Scan
```bash
# Passive scan
docker run -v $(pwd):/zap/wrk/:rw \
  ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t http://localhost:5000 -r zap-report.html
```

## 2. JWT Tampering Tests
```bash
# No token → 401
curl http://localhost:5000/api/v1/auth/me

# Tampered payload → 401
curl http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer notavalidtoken"
```

## 3. IDOR Tests
```bash
# User A deletes User B's claim → 403
curl -X DELETE http://localhost:5000/api/v1/claims/$CLAIM_ID_B \
  -H "Authorization: Bearer $TOKEN_A"

# Regular user accesses admin → 403
curl http://localhost:5000/api/v1/admin/dashboard \
  -H "Authorization: Bearer $USER_TOKEN"
```

## 4. NoSQL Injection Tests
```bash
# Operator injection in login → 400/401
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":{"$gt":""},"password":{"$gt":""}}'
```

## 5. Rate Limiting Tests
```bash
# Hammer auth endpoint — 11th request should return 429
for i in $(seq 1 15); do
  curl -X POST http://localhost:5000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"x@x.com","password":"wrong"}'
done
```

## Security Checklist

| Check                  | Method                     | Status |
|------------------------|----------------------------|--------|
| OWASP Top 10           | ZAP scan                   | Run pre-release |
| JWT tampering          | curl tests                 | ✅ Validated |
| IDOR on resources      | curl tests                 | ✅ Validated |
| NoSQL injection        | express-mongo-sanitize     | ✅ Applied globally |
| Rate limiting          | express-rate-limit + Redis | ✅ Applied |
| Mass assignment        | Mongoose select:false      | ✅ Applied |
| File upload validation | multer fileFilter          | ✅ MIME + size limits |
| Security headers       | Helmet.js                  | ✅ Applied |
| CORS whitelist         | cors middleware            | ✅ Frontend URL only |
| Parameter pollution    | hpp middleware             | ✅ Applied |
| Password hashing       | bcrypt 12 rounds           | ✅ Applied |
| Token rotation         | Redis refresh tokens       | ✅ Applied |
| Cookie security        | httpOnly+Secure+SameSite   | ✅ Applied |
