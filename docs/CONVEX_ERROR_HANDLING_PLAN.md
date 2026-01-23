# Convex Error Handling Plan

Intent: align to Convex boundary contract; remove neverthrow; use ConvexError or return unions; add React error boundaries; update docs/tests; PR w/ benefits + example.

## Scope
- In: backend error flow, client error mapping, React error boundaries, docs/tests, PR write-up
- Out: new features, UI redesign, unrelated deps

## Action items
- [x] Read Convex error docs + React error boundary docs
- [x] Inventory current patterns: `throw new Error`, neverthrow `Result`, `formatError` usage
- [x] Define contract: expected errors via union return or `ConvexError` w/ serializable data; unexpected throw; mapping rules
- [x] Backend refactor: remove neverthrow utils/dep; replace Result flow with `ConvexError`/union returns; wrap third-party boundaries; keep transactional rollback
- [x] Frontend: add `src/lib/errors.ts` to normalize `ConvexError` + unknown; replace `formatError` call sites
- [x] React boundaries: root/route error components; use new error util; log/report
- [x] Tests: regression coverage for `ConvexError` payloads + boundary rendering
- [x] Verify: `pnpm test`, `pnpm run lint`, `pnpm run typecheck`
- [ ] Docs + PR: update `README.md` + `docs/SPEC.md`; open PR w/ benefits + code example

## Notes
- Convex boundary: throw `ConvexError` or return union; no `Result` to client.
- Sources:
  - https://docs.convex.dev/functions/error-handling/
  - https://docs.convex.dev/functions/error-handling/application-errors
  - https://react.dev/reference/react/Component
- Docs updated: `README.md`, `docs/SPEC.md`, `docs/PRD.md`
