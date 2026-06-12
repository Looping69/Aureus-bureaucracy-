# Stability Guardrails

This project now uses a few small libraries to stabilize the game without replacing the existing architecture.

## Responsibilities

- **Zod** validates runtime save data and loaded game-state candidates. TypeScript protects source code, but Zod protects LocalStorage, older save envelopes, and malformed runtime data.
- **XState** documents and guards fragile legal transitions. The first guarded flows are permit status changes, scene validity, and FTUE/form-processing state.
- **Zustand** owns non-saveable UI and debug state that should not bloat the serialized `GameState` or `App.tsx`.
- **Vitest** runs deterministic unit and invariant tests around pure rule modules.
- **fast-check** adds property-based checks for rules that should hold across many generated states.

## Current Guarded Flows

### Save Validation

`src/game/saveValidation.ts` validates save candidates with Zod before they enter the runtime hydration path. It also rejects malformed interaction combinations such as a form minigame without a pending permit action.

### Permit Transitions

`src/game/machines/permitMachine.ts` defines legal permit transitions:

```txt
LOCKED -> AVAILABLE -> PENDING -> APPROVED
                    -> REJECTED -> PENDING
```

`src/game/actions/permitActions.ts` and `src/game/permitProgression.ts` route permit filing and approval through those transition helpers.

### Scene Validity

`src/game/machines/sceneMachine.ts` protects scene-level state. In particular, `currentScene: 'MINE'` must have a valid discovered `activeMineId`; otherwise the state normalizes back to `WORLD`.

### FTUE/Form Flow

`src/game/machines/ftueMachine.ts` defines the tutorial phase order and protects form-processing context. The form minigame must always know which permit it is processing and which filing action is pending.

### UI And Debug State

`src/stores/uiStore.ts` owns app chrome state and debug telemetry. `src/hooks/app/useAppChrome.ts` now reads/writes the UI store through the existing hook API, so `App.tsx` does not need a large migration all at once. `src/hooks/app/useDebugTelemetry.ts` provides the same adapter pattern for debug telemetry.

## Verification

Use the stability workflow or run locally:

```bash
npm install
npm run lint
npm run test
npm run build
npm run smoke:regression
```

`npm install` is currently required instead of `npm ci` until `package-lock.json` is regenerated with the new dependencies.

## Next Cleanup Target

After the workflow is green, move `App.tsx` debug telemetry from local React state to `useDebugTelemetry()`. Keep canonical `GameState` in React for now; do not move gameplay truth into Zustand until the pure rule modules and tests are broader.
