# Stability Implementation Log

Date: 2026-06-12

## Completed

- Added stabilization dependencies and scripts in `package.json`:
  - `zod`
  - `xstate`
  - `zustand`
  - `vitest`
  - `fast-check`
  - `@vitest/ui`
- Replaced manual save candidate checks with Zod-backed validation in `src/game/saveValidation.ts`.
- Added permit transition guards in `src/game/machines/permitMachine.ts`.
- Added scene validity guards in `src/game/machines/sceneMachine.ts`.
- Routed permit filing and approval through transition guards:
  - `src/game/actions/permitActions.ts`
  - `src/game/permitProgression.ts`
- Added FTUE/form-flow guard machine in `src/game/machines/ftueMachine.ts`.
- Hardened form processing so minigame state always retains the active permit id and clears pending action state when canceled.
- Backed app chrome state with Zustand through `src/hooks/app/useAppChrome.ts` and `src/stores/uiStore.ts`.
- Added a debug telemetry Zustand adapter at `src/hooks/app/useDebugTelemetry.ts`.
- Added deterministic stability tests in `src/game/stability.test.ts`, including fast-check invariants.
- Added GitHub Actions workflow `.github/workflows/stability.yml` to run install, lint, test, build, Playwright browser install, and smoke regression.
- Added architecture notes in `docs/stability-guardrails.md`.

## Verification Status

Local verification from the agent workspace could not run because direct GitHub clone/download and npm registry access returned or hung behind `403` proxy restrictions.

The repository now contains a GitHub Actions workflow intended to run the full verification in an environment with npm registry access:

```bash
npm install
npm run lint
npm run test
npm run build
npm run smoke:regression
```

The workflow intentionally uses `npm install` instead of `npm ci` until `package-lock.json` is regenerated with the new stabilization dependencies.

## Follow-Up Cleanup

Once the workflow is green, the next low-risk cleanup is moving `App.tsx` debug telemetry calls from local React state to `useDebugTelemetry()`. Keep canonical gameplay state in React until broader rule coverage exists.
