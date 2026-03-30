import { GameState, Tile } from '../../types';
import { applyOreExport } from '../economy';
import { isWorldEffectActive } from '../dialogue/worldEffects';
import { applyExhaustionCollapse } from '../exhaustion';

export interface GameNotification {
  title: string;
  msg: string;
}

const MINE_SAFETY_KIT_UPGRADE = 'mine-safety-kit';
const ORE_SCANNER_UPGRADE = 'mine-ore-scanner';

export const applyMineTileInteraction = (
  prev: GameState,
  tileId: string,
): { nextState: GameState; notifications: GameNotification[] } => {
  const activeMine = prev.mines.find(m => m.id === prev.activeMineId);
  if (!activeMine) return { nextState: prev, notifications: [] };

  const tileIndex = activeMine.grid.findIndex(t => t.id === tileId);
  if (tileIndex === -1) return { nextState: prev, notifications: [] };

  const tile = activeMine.grid[tileIndex];
  const prospectingPermit = prev.permits[activeMine.permits.prospectingId];
  const miningPermit = prev.permits[activeMine.permits.miningId];
  const hasProspecting = prospectingPermit?.status === 'APPROVED';
  const hasMining = miningPermit?.status === 'APPROVED';
  const hasSafetyKit = prev.upgrades.includes(MINE_SAFETY_KIT_UPGRADE);
  const hasOreScanner = prev.upgrades.includes(ORE_SCANNER_UPGRADE);
  const hasCommunityBacking = isWorldEffectActive(prev, 'communityBacking');
  const hasMediaHeat = isWorldEffectActive(prev, 'mediaHeat');

  if (activeMine.status === 'PROSPECTING') {
    if (!hasProspecting) {
      return {
        nextState: prev,
        notifications: [{
          title: 'Unlicensed Observation',
          msg: `You need a ${prospectingPermit?.name || 'Prospecting License'} to survey this land.`
        }]
      };
    }

    if (activeMine.prospectingCount >= 10) {
      return {
        nextState: prev,
        notifications: [{
          title: 'Survey Limit Reached',
          msg: 'You have collected enough samples. Submit your findings to apply for a Mining Permit.'
        }]
      };
    }

    if (tile.revealed) {
      return {
        nextState: prev,
        notifications: [{ title: 'Already Surveyed', msg: "You've already sampled this tile." }]
      };
    }

    const newMines = [...prev.mines];
    const mineIndex = newMines.findIndex(m => m.id === prev.activeMineId);
    const newGrid = [...newMines[mineIndex].grid];
    newGrid[tileIndex] = { ...tile, revealed: true };

    if (hasOreScanner && tile.type === 'ORE') {
      const neighbors = newGrid.filter((candidate) => {
        if (candidate.revealed || candidate.mined) return false;
        const dx = Math.abs(candidate.x - tile.x);
        const dy = Math.abs(candidate.y - tile.y);
        return dx + dy === 1;
      });
      if (neighbors.length > 0) {
        const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
        const neighborIndex = newGrid.findIndex(t => t.id === neighbor.id);
        if (neighborIndex >= 0) {
          newGrid[neighborIndex] = { ...newGrid[neighborIndex], revealed: true };
        }
      }
    }

    newMines[mineIndex] = {
      ...newMines[mineIndex],
      grid: newGrid,
      prospectingCount: newMines[mineIndex].prospectingCount + 1
    };

    const notifications: GameNotification[] = [];
    if (tile.stability < 55) {
      notifications.push({
        title: 'Unstable Pocket',
        msg: 'This tile looks weak. Expect higher cave-in risk during extraction.'
      });
    }
    if (hasOreScanner && tile.type === 'ORE') {
      notifications.push({
        title: 'Scanner Ping',
        msg: 'Nearby rock signature detected and partially revealed.'
      });
    }

    return {
      nextState: {
        ...prev,
        mines: newMines,
        energy: Math.max(0, prev.energy - 1)
      },
      notifications
    };
  }

  if (!hasMining) {
    return {
      nextState: prev,
      notifications: [{
        title: 'Unlicensed Extraction',
        msg: `You need a ${miningPermit?.name || 'Mining Permit'} to extract resources.`
      }]
    };
  }

  if (prev.energy < 5) {
    return {
      nextState: prev,
      notifications: [{ title: 'Exhausted', msg: 'You need more energy to mine.' }]
    };
  }

  const instabilityPenalty = tile.stability < 55 ? 15 : 0;
  const safetyReduction = hasSafetyKit ? 12 : 0;
  const hazardChance = Math.min(95, Math.max(2, activeMine.danger + instabilityPenalty - safetyReduction - (hasCommunityBacking ? 8 : 0)));
  const riskRoll = Math.random() * 100;
  const isHazard = riskRoll < hazardChance;
  const isGasLeak = isHazard && Math.random() > 0.5;
  const isCaveIn = isHazard && !isGasLeak;

  const newMines = [...prev.mines];
  const mineIndex = newMines.findIndex(m => m.id === prev.activeMineId);
  const newGrid = [...newMines[mineIndex].grid];
  newGrid[tileIndex] = { ...tile, mined: true, revealed: true };
  newMines[mineIndex] = {
    ...newMines[mineIndex],
    grid: newGrid
  };

  let oreGain = 0;
  let moneyGain = 0;
  let energyCost = hasSafetyKit ? 4 : 5;
  let richVeinBonus = 0;

  if (tile.type === 'ORE') {
    const hasWashPlant = prev.permits['wash-plant-permit']?.status === 'APPROVED';
    const multiplier = hasWashPlant ? 2 : 1;
    const foundRichVein = tile.stability >= 85 || (hasOreScanner && Math.random() < 0.35);
    richVeinBonus = foundRichVein ? multiplier : 0;
    oreGain = (activeMine.yield * multiplier) + richVeinBonus;
    // Economy rebalance: extraction yields ore primarily, cash comes from export flow.
    moneyGain = 0;
  }

  if (isGasLeak) {
    energyCost += hasSafetyKit ? 7 : 15;
  } else if (isCaveIn) {
    energyCost += hasSafetyKit ? 4 : 10;
    oreGain = Math.max(0, oreGain - 2);
  }

  if (hasCommunityBacking) {
    energyCost = Math.max(2, energyCost - 1);
  }

  const notifications: GameNotification[] = [];
  if (isGasLeak) {
    notifications.push({ title: 'Gas Leak!', msg: 'Toxic fumes released. You lost extra energy.' });
  } else if (isCaveIn) {
    notifications.push({ title: 'Cave-In!', msg: 'Unstable ground collapsed. You lost some ore and energy.' });
  } else if (tile.type === 'ORE') {
    if (richVeinBonus > 0) {
      notifications.push({
        title: 'Rich Vein!',
        msg: `High-grade seam yielded bonus ore (+${richVeinBonus}) and extra payout.`
      });
    } else {
      notifications.push({
        title: 'Strike!',
        msg: `Found ${oreGain} Ore.`
      });
    }
  } else if (tile.stability < 55) {
    notifications.push({
      title: 'Fragile Ground',
      msg: 'Low-stability tile collapsed faster than expected.'
    });
  }

  return {
    ...(prev.energy - energyCost <= 0
      ? (() => {
          const collapsed = applyExhaustionCollapse({
            ...prev,
            mines: newMines,
            energy: prev.energy - energyCost,
            ore: prev.ore + oreGain,
            money: prev.money + moneyGain,
            meters: {
              ...prev.meters,
              exposure: Math.min(100, prev.meters.exposure + (activeMine.danger * 0.1) + (hasMediaHeat ? 2 : 0))
            }
          });
          return {
            nextState: collapsed.nextState,
            notifications: [...notifications, collapsed.notification]
          };
        })()
      : {
          nextState: {
            ...prev,
            mines: newMines,
            energy: prev.energy - energyCost,
            ore: prev.ore + oreGain,
            money: prev.money + moneyGain,
            meters: {
              ...prev.meters,
              exposure: Math.min(100, prev.meters.exposure + (activeMine.danger * 0.1) + (hasMediaHeat ? 2 : 0))
            }
          },
          notifications
        })
  };
};

export const applyMineSceneAction = (
  prev: GameState,
  action: string,
): { nextState: GameState; notifications: GameNotification[] } => {
  const activeMine = prev.mines.find(m => m.id === prev.activeMineId);
  if (!activeMine) return { nextState: prev, notifications: [] };

  if (action === 'EXPORT_ORE') {
    const exported = applyOreExport(prev, prev.ore);
    return {
      nextState: exported.nextState,
      notifications: exported.notification ? [exported.notification] : []
    };
  }

  if (action === 'WASH_PLANT') {
    if (prev.permits['wash-plant-permit']?.status !== 'APPROVED') {
      return {
        nextState: prev,
        notifications: [{ title: 'Permit Required', msg: 'You need a Wash Plant Installation permit.' }]
      };
    }
    return {
      nextState: prev,
      notifications: [{ title: 'Wash Plant Active', msg: 'Ore yield is doubled for this claim.' }]
    };
  }

  if (action === 'EXPAND_CLAIM') {
    if (prev.permits['claim-expansion']?.status !== 'APPROVED') {
      return {
        nextState: prev,
        notifications: [{ title: 'Permit Required', msg: 'You need a Claim Expansion Request approved.' }]
      };
    }

    const newMines = [...prev.mines];
    const mineIndex = newMines.findIndex(m => m.id === prev.activeMineId);
    const mine = newMines[mineIndex];

    const newTiles: Tile[] = [];
    for (let i = 0; i < mine.gridWidth; i++) {
      const nextType = Math.random() > 0.7 ? 'ORE' : 'DIRT';
      newTiles.push({
        id: `new-${Date.now()}-${i}`,
        type: nextType,
        stability: nextType === 'ORE'
          ? 60 + Math.floor(Math.random() * 41)
          : 45 + Math.floor(Math.random() * 46),
        mined: false,
        revealed: false,
        x: i,
        y: mine.gridHeight,
        z: 0
      });
    }

    newMines[mineIndex] = {
      ...mine,
      grid: [...mine.grid, ...newTiles],
      gridHeight: mine.gridHeight + 1
    };

    return {
      nextState: { ...prev, mines: newMines },
      notifications: [{ title: 'Claim Expanded', msg: 'Added a new row to your claim.' }]
    };
  }

  if (action === 'BUY_SAFETY_KIT') {
    if (prev.upgrades.includes(MINE_SAFETY_KIT_UPGRADE)) {
      return {
        nextState: prev,
        notifications: [{ title: 'Already Installed', msg: 'Safety kit is already active for your operation.' }]
      };
    }
    const cost = 450;
    if (prev.money < cost) {
      return {
        nextState: prev,
        notifications: [{ title: 'Insufficient Funds', msg: `Safety kit requires $${cost}.` }]
      };
    }
    return {
      nextState: {
        ...prev,
        money: prev.money - cost,
        upgrades: [...prev.upgrades, MINE_SAFETY_KIT_UPGRADE]
      },
      notifications: [{ title: 'Safety Kit Installed', msg: 'Hazard impact reduced and base mining strain lowered.' }]
    };
  }

  if (action === 'BUY_ORE_SCANNER') {
    if (prev.upgrades.includes(ORE_SCANNER_UPGRADE)) {
      return {
        nextState: prev,
        notifications: [{ title: 'Already Installed', msg: 'Ore scanner is already mounted.' }]
      };
    }
    const cost = 700;
    if (prev.money < cost) {
      return {
        nextState: prev,
        notifications: [{ title: 'Insufficient Funds', msg: `Ore scanner requires $${cost}.` }]
      };
    }
    return {
      nextState: {
        ...prev,
        money: prev.money - cost,
        upgrades: [...prev.upgrades, ORE_SCANNER_UPGRADE]
      },
      notifications: [{ title: 'Ore Scanner Installed', msg: 'Prospecting reveals nearby tiles and improves rich-vein finds.' }]
    };
  }

  return { nextState: prev, notifications: [] };
};
