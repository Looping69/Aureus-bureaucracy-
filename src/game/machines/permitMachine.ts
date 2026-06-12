import { createMachine } from 'xstate';
import { PermitStatus } from '../../types';

export type PermitMachineEvent =
  | { type: 'MAKE_AVAILABLE' }
  | { type: 'SUBMIT' }
  | { type: 'APPROVE' }
  | { type: 'REJECT' }
  | { type: 'RETRY' }
  | { type: 'LOCK' };

export const permitMachine = createMachine({
  id: 'permit',
  initial: 'LOCKED',
  states: {
    LOCKED: {
      on: {
        MAKE_AVAILABLE: 'AVAILABLE',
        LOCK: 'LOCKED',
      },
    },
    AVAILABLE: {
      on: {
        SUBMIT: 'PENDING',
        APPROVE: 'APPROVED',
        LOCK: 'LOCKED',
      },
    },
    PENDING: {
      on: {
        APPROVE: 'APPROVED',
        REJECT: 'REJECTED',
      },
    },
    REJECTED: {
      on: {
        RETRY: 'AVAILABLE',
        SUBMIT: 'PENDING',
        APPROVE: 'APPROVED',
        LOCK: 'LOCKED',
      },
    },
    APPROVED: {
      on: {
        APPROVE: 'APPROVED',
      },
    },
  },
});

const permitTransitions: Record<PermitStatus, Partial<Record<PermitMachineEvent['type'], PermitStatus>>> = {
  LOCKED: {
    MAKE_AVAILABLE: 'AVAILABLE',
    LOCK: 'LOCKED',
  },
  AVAILABLE: {
    SUBMIT: 'PENDING',
    APPROVE: 'APPROVED',
    LOCK: 'LOCKED',
  },
  PENDING: {
    APPROVE: 'APPROVED',
    REJECT: 'REJECTED',
  },
  REJECTED: {
    RETRY: 'AVAILABLE',
    SUBMIT: 'PENDING',
    APPROVE: 'APPROVED',
    LOCK: 'LOCKED',
  },
  APPROVED: {
    APPROVE: 'APPROVED',
  },
};

export const transitionPermitStatus = (
  status: PermitStatus,
  eventType: PermitMachineEvent['type'],
): PermitStatus | null => permitTransitions[status][eventType] ?? null;

export const canTransitionPermit = (
  status: PermitStatus,
  eventType: PermitMachineEvent['type'],
): boolean => transitionPermitStatus(status, eventType) !== null;
