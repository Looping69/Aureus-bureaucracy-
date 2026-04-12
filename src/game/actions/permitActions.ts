import {
  GameFtueState,
  GameInteractionState,
  GameMeterState,
  GameProgressionState,
  GameResourceState,
} from '../../types';
import { approvePermit } from '../permitProgression';
import { GameNotification } from './mineActions';

type PermitActionState =
  Pick<GameResourceState, 'money' | 'evidence'> &
  Pick<GameMeterState, 'meters'> &
  Pick<GameProgressionState, 'permits' | 'mines'> &
  Pick<GameFtueState, 'tutorialStep'> &
  Pick<GameInteractionState, 'activeMiniGame' | 'activePermitId' | 'pendingPermitAction'>;

export const applyPermitOverlayAction = (
  prev: PermitActionState,
  id: string,
  action: 'SUBMIT' | 'PAY' | 'FAST_TRACK'
): { nextState: PermitActionState; notifications: GameNotification[] } => {
  const permit = prev.permits[id];
  if (!permit) return { nextState: prev, notifications: [] };
  const standardCost = permit.status === 'REJECTED' ? 100 : permit.cost;

  if (action === 'FAST_TRACK' || action === 'SUBMIT') {
    const cost = action === 'FAST_TRACK' ? standardCost * 2 : standardCost;
    if (prev.money < cost) {
      return {
        nextState: prev,
        notifications: [{ title: 'Insufficient Funds', msg: `Filing this form requires $${cost}.` }]
      };
    }
    return {
      nextState: {
        ...prev,
        money: prev.money - cost,
        activeMiniGame: 'FORM_PROCESSING',
        pendingPermitAction: action
      },
      notifications: []
    };
  }

  if (prev.money < standardCost) return { nextState: prev, notifications: [] };
  return {
    nextState: {
      ...prev,
      money: prev.money - standardCost,
      permits: {
        ...prev.permits,
        [id]: { ...permit, status: 'PENDING' }
      }
    },
    notifications: []
  };
};

export const applyMiniGameCompletion = (
  prev: PermitActionState,
  results: { accuracy: number; time: number }
): { nextState: PermitActionState; notifications: GameNotification[] } => {
  if (!prev.activePermitId) {
    return {
      nextState: { ...prev, activeMiniGame: null, pendingPermitAction: null },
      notifications: []
    };
  }

  if (prev.tutorialStep === 5) {
    return {
      nextState: {
        ...prev,
        tutorialStep: 6,
        permits: {
          ...prev.permits,
          [prev.activePermitId]: {
            ...prev.permits[prev.activePermitId],
            status: 'REJECTED',
            rejectionReason: "Ink color was 'Excessively Hopeful'.",
            accuracy: results.accuracy
          }
        },
        activeMiniGame: null,
        activePermitId: null,
        pendingPermitAction: null
      },
      notifications: [{
        title: 'FILING REJECTED',
        msg: "Reason: 'Excessive Hopefulness'. You should speak to the Licensing Officer."
      }]
    };
  }

  const permit = prev.permits[prev.activePermitId];
  if (!permit) {
    return {
      nextState: { ...prev, activeMiniGame: null, activePermitId: null, pendingPermitAction: null },
      notifications: []
    };
  }

  const isFailed = results.accuracy < 0.6;
  if (isFailed) {
    return {
      nextState: {
        ...prev,
        permits: {
          ...prev.permits,
          [prev.activePermitId]: { ...permit, status: 'REJECTED', rejectionReason: 'INSUFFICIENT ACCURACY', accuracy: results.accuracy }
        },
        activeMiniGame: null,
        activePermitId: null,
        pendingPermitAction: null
      },
      notifications: [{
        title: 'FILING REJECTED',
        msg: 'Your accuracy was too low. The Bureau has discarded your application and kept the fee.'
      }]
    };
  }

  const isPerfect = results.accuracy === 1 && results.time < 8;
  const isFast = results.time < 12;
  let moneyBonus = 0;
  let dirtBonus = 0;
  let trustBonus = 0;

  if (isPerfect) {
    moneyBonus = 200;
    dirtBonus = 3;
    trustBonus = 10;
  } else if (isFast) {
    moneyBonus = 100;
    dirtBonus = 1;
    trustBonus = 2;
  }

  const newPermits = { ...prev.permits };
  const approveImmediately =
    (prev.pendingPermitAction === 'FAST_TRACK' && results.accuracy > 0.9) ||
    (prev.pendingPermitAction === 'DIALOGUE');

  newPermits[prev.activePermitId] = {
    ...permit,
    status: approveImmediately ? 'APPROVED' : 'PENDING',
    accuracy: results.accuracy
  };

  let newMines = [...prev.mines];
  const notifications: GameNotification[] = [];

  if (approveImmediately) {
    const progression = approvePermit(prev.activePermitId, newPermits, newMines);
    Object.assign(newPermits, progression.permits);
    newMines = progression.mines;
    notifications.push(
      ...progression.notifications.map((msg) => ({ title: 'New Location Discovered', msg }))
    );
  }

  notifications.push({
    title: approveImmediately ? 'IMMEDIATE APPROVAL' : 'FILING SUBMITTED',
    msg: approveImmediately
      ? (prev.pendingPermitAction === 'DIALOGUE'
          ? `Officer Vane stamped your license on the spot! Bonus: $${moneyBonus}, +${dirtBonus} Evidence.`
          : `Your perfect filing was approved instantly! Bonus: $${moneyBonus}, +${dirtBonus} Evidence.`)
      : `Form submitted with ${Math.round(results.accuracy * 100)}% accuracy. The Bureau will review it shortly.`
  });

  return {
    nextState: {
      ...prev,
      mines: newMines,
      money: prev.money + moneyBonus,
      evidence: prev.evidence + dirtBonus,
      meters: {
        ...prev.meters,
        trust: Math.min(100, prev.meters.trust + trustBonus)
      },
      permits: newPermits,
      activeMiniGame: null,
      activePermitId: null,
      pendingPermitAction: null
    },
    notifications
  };
};
