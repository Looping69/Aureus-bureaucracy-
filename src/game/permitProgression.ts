import { Mine, Permit } from '../types';

export const applyPermitApproval = (
  permitId: string,
  permits: Record<string, Permit>,
  mines: Mine[],
): { permits: Record<string, Permit>; mines: Mine[]; notifications: string[] } => {
  const nextPermits = { ...permits };
  const nextMines = [...mines];
  const notifications: string[] = [];

  const makePermitAvailable = (id: string) => {
    const permit = nextPermits[id];
    if (permit && permit.status === 'LOCKED') {
      nextPermits[id] = { ...permit, status: 'AVAILABLE' };
    }
  };

  const patchMine = (id: string, patch: Partial<Mine>) => {
    const idx = nextMines.findIndex(m => m.id === id);
    if (idx === -1) return;
    const prevMine = nextMines[idx];
    const nextMine = { ...prevMine, ...patch };
    nextMines[idx] = nextMine;
    return { prevMine, nextMine };
  };

  if (permitId === 'extraction-intent') {
    makePermitAvailable('prospecting-license');
  } else if (permitId === 'prospecting-license') {
    makePermitAvailable('mining-permit-iron');
  } else if (permitId === 'mining-permit-iron') {
    makePermitAvailable('prospecting-permit-deep');
    patchMine('iron-vein', { status: 'OPERATIONAL' });
    const deep = patchMine('deep-hollow', { discovered: true, status: 'PROSPECTING' });
    if (deep && !deep.prevMine.discovered) {
      notifications.push('Deep Hollow is now accessible.');
    }
  } else if (permitId === 'prospecting-permit-deep') {
    makePermitAvailable('mining-permit-deep');
  } else if (permitId === 'mining-permit-deep') {
    makePermitAvailable('prospecting-permit-abyss');
    patchMine('deep-hollow', { status: 'OPERATIONAL' });
    const abyss = patchMine('abyssal-reach', { discovered: true, status: 'PROSPECTING' });
    if (abyss && !abyss.prevMine.discovered) {
      notifications.push('Abyssal Reach is now accessible.');
    }
  } else if (permitId === 'prospecting-permit-abyss') {
    makePermitAvailable('mining-permit-abyss');
  }

  return { permits: nextPermits, mines: nextMines, notifications };
};

