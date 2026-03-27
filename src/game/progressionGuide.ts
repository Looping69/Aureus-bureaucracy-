import { GameState, Permit } from '../types';

export interface ProgressGuidance {
  title: string;
  detail: string;
  tone: 'INFO' | 'WARN' | 'SUCCESS';
}

const permitCost = (permit: Permit | undefined) => {
  if (!permit) return 0;
  return permit.status === 'REJECTED' ? 100 : permit.cost;
};

const withMoneyBlocker = (state: GameState, permit: Permit | undefined, fallback: ProgressGuidance): ProgressGuidance => {
  if (!permit) return fallback;
  const cost = permitCost(permit);
  if (state.money < cost) {
    return {
      title: 'Blocked: Not Enough Funds',
      detail: `${permit.name} needs $${cost}. Current funds: $${state.money}. Export ore or restack cash first.`,
      tone: 'WARN'
    };
  }
  return fallback;
};

export const getProgressGuidance = (state: GameState): ProgressGuidance => {
  const extractionIntent = state.permits['extraction-intent'];
  const prospecting = state.permits['prospecting-license'];
  const miningIron = state.permits['mining-permit-iron'];
  const exportLicense = state.permits['export-license'];
  const ironMine = state.mines.find(m => m.id === 'iron-vein');

  if (state.tutorialStep === 0) {
    return {
      title: 'Start Your Journey',
      detail: 'Use the onboarding panel to begin; then head to the Bureau of Extraction.',
      tone: 'INFO'
    };
  }

  if (state.tutorialStep === 1 && state.currentScene !== 'OFFICE') {
    return {
      title: 'Go To The Bureau',
      detail: 'Enter an office and find Officer Vane to unlock your first permit path.',
      tone: 'INFO'
    };
  }

  if (state.tutorialStep === 2 && state.activeNPCId !== 'licensing') {
    return {
      title: 'Talk To Officer Vane',
      detail: 'Open dialogue with the licensing officer and ask about mining permits.',
      tone: 'INFO'
    };
  }

  if (extractionIntent && extractionIntent.status !== 'APPROVED') {
    if (extractionIntent.status === 'PENDING') {
      return {
        title: 'Permit In Review',
        detail: `${extractionIntent.name} is pending. Wait for bureau processing or use social leverage.`,
        tone: 'INFO'
      };
    }
    if (extractionIntent.status === 'LOCKED') {
      return {
        title: 'Unlock Extraction Intent',
        detail: 'Talk to Officer Vane to unlock Form 17-B filing.',
        tone: 'INFO'
      };
    }
    return withMoneyBlocker(state, extractionIntent, {
      title: 'File Form 17-B',
      detail: 'Open Office -> permits -> Extraction Intent and submit with high accuracy.',
      tone: 'INFO'
    });
  }

  if (prospecting && prospecting.status !== 'APPROVED') {
    if (prospecting.status === 'PENDING') {
      return {
        title: 'Prospecting License Pending',
        detail: 'Your prospecting permit is queued. Keep relationships warm while you wait.',
        tone: 'INFO'
      };
    }
    if (prospecting.status === 'LOCKED') {
      return {
        title: 'Prospecting Still Locked',
        detail: 'Progress extraction-intent approvals and licensing dialogue to unlock Form 404.',
        tone: 'WARN'
      };
    }
    return withMoneyBlocker(state, prospecting, {
      title: 'Apply For Prospecting License',
      detail: 'Submit Form 404 to legally survey up to 10 mine tiles.',
      tone: 'INFO'
    });
  }

  if (ironMine && ironMine.status === 'PROSPECTING' && ironMine.prospectingCount < 10) {
    if (state.energy < 1) {
      return {
        title: 'Blocked: No Energy',
        detail: 'Rest at home to recover energy, then continue surveying mine tiles.',
        tone: 'WARN'
      };
    }
    return {
      title: 'Survey Iron Vein',
      detail: `Prospecting progress ${ironMine.prospectingCount}/10. Enter mine and reveal more tiles.`,
      tone: 'INFO'
    };
  }

  if (miningIron && miningIron.status !== 'APPROVED') {
    if (miningIron.status === 'PENDING') {
      return {
        title: 'Mining Permit Pending',
        detail: 'Iron extraction rights are in review. Prepare capital and safety margin.',
        tone: 'INFO'
      };
    }
    if (miningIron.status === 'LOCKED') {
      return {
        title: 'Mining Permit Locked',
        detail: 'Finish enough prospecting and bureau approvals to unlock FE-26.',
        tone: 'WARN'
      };
    }
    return withMoneyBlocker(state, miningIron, {
      title: 'Secure FE-26 Permit',
      detail: 'Submit Iron Vein Extraction Permit to transition from survey to production.',
      tone: 'INFO'
    });
  }

  if (state.ore > 0 && exportLicense?.status === 'APPROVED') {
    return {
      title: 'Cash Out Ore',
      detail: `You have ${state.ore} ore ready. Open Market and sell it through the legal channel.`,
      tone: 'SUCCESS'
    };
  }

  if (state.ore > 0 && exportLicense?.status !== 'APPROVED') {
    if (exportLicense?.status === 'PENDING') {
      return {
        title: 'Sell Ore Or Wait',
        detail: 'You can sell ore right now through the Market, or wait for the export license for safer, higher-value sales.',
        tone: 'INFO'
      };
    }
    return withMoneyBlocker(state, exportLicense, {
      title: 'Use The Market',
      detail: 'Sell ore now through off-book buyers, or apply for EX-99 to improve payout and reduce exposure.',
      tone: 'INFO'
    });
  }

  if (state.energy < 10) {
    return {
      title: 'Energy Critical',
      detail: 'Head home and rest before attempting more mine actions.',
      tone: 'WARN'
    };
  }

  return {
    title: 'Continue Expanding',
    detail: 'Mine ore, file deeper permits, and improve influence to unlock high-yield zones.',
    tone: 'INFO'
  };
};
