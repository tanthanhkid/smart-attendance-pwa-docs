# Test Plan

## 1. Unit tests
- geofence distance calculator
- lateness status calculator
- overtime calculator
- suspicious score calculator

## 2. Integration tests
- login
- refresh token
- branch CRUD
- employee assignment
- check-in success
- check-in reject outside geofence
- duplicate nonce reject
- check-out success

## 3. E2E tests
- employee login -> check-in -> history
- manager review flagged request
- admin create branch -> assign employee

## 4. Manual QA checklist
- mobile Safari
- Chrome Android
- PWA install
- no location permission flow
- flaky network
- expired token
- dashboard filters

## 5. Performance tests
- seed 5,000 employees
- simulate burst check-in
- inspect response time p95
