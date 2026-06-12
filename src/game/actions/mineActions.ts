import { GameState, Mine, Tile } from '../../types';
import { applyOreExport } from '../economy';
import { isWorldEffectActive } from '../dialogue/worldEffects';
import { applyExhaustionCollapse } from '../exhaustion';
import { getWeatherMiningModifiers } from '../weatherSystem';

export interface GameNotification {
  title: string;
  msg: string;
}

type MineRunState = Mine & {
  carriedOre?: number;
  carryLimit?: number;
  shaftStability?: number;
  braceCharges?: number;
};

const MINE_SAFETY_KIT_UPGRADE = 'mine-safety-kit';
const ORE_SCANNER_UPGRADE = 'mine-ore-scanner';
const DEFAULT_CARRY_LIMIT = 80;
const SAFETY_KIT_BRACE_CHARGES = 2;

const getRunMine = (mine: Mine): MineRunState => mine as MineRunState;
const getCarriedOre = (mine: MineRunState) => mine.carriedOre ?? 0;
const getCarryLimit = (mine: MineRunState) => mine.carryLimit ?? DEFAULT_CARRY_LIMIT;
const getShaftStability = (mine: MineRunState) => mine.shaftStability ?? 100;
const getBraceCharges = (mine: MineRunState, hasSafetyKit: boolean) =>
  mine.braceCharges ?? (hasSafetyKit ? SAFETY_KIT_BRACE_CHARGES : 0);

const patchActiveMine = (
  state: GameState,
  mineIndex: number,
  patch: Partial<MineRunState>,
): Mine[] => {
  const newMines = [...state.mines];
  newMines[mineIndex] = { ...newMines[mineIndex], ...patch } as Mine;
  return newMines;
};

const degradeAdjacentTiles = (grid: Tile[], tile: Tile, amount: number) =>
  grid.map((candidate) => {
    const distance = Math.abs(candidate.x - tile.x) + Math.abs(candidate.y - tile.y);
    if (distance !== 1 || candidate.mined || candidate.stability <= 0) return candidate;
    return { ...candidate, stability: Math.max(0, candidate.stability - amount) };
  });

export const applyMineTileInteraction = (
  prev: GameState,
  tileId: string,
): { nextState: GameState; notifications: GameNotification[] } => {
  const mineIndex = prev.mines.findIndex(m => m.id === prev.activeMineId);
  if (mineIndex === -1) return { nextState: prev, notifications: [] };

  const activeMine = getRunMine(prev.mines[mineIndex]);
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
  const weatherModifiers = getWeatherMiningModifiers(prev.weather);

  if (tile.mined) {
    return { nextState: prev, notifications: [{ title: 'Spent Ground', msg: 'This tile has already been worked.' }] };
  }

  if (tile.stability <= 0) {
    return { nextState: prev, notifications: [{ title: 'Blocked By Collapse', msg: 'Rubble blocks this section. Expand or route around it.' }] };
  }

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

    const newGrid = [...activeMine.grid];
    newGrid[tileIndex] = { ...tile, revealed: true };

    if (hasOreScanner) {
      const neighbors = newGrid.filter((candidate) => {
        if (candidate.revealed || candidate.mined) return false;
        const dx = Math.abs(candidate.x - tile.x);
        const dy = Math.abs(candidate.y - tile.y);
        return dx + dy === 1;
      });
      const revealCount = tile.type === 'ORE' ? 2 : 1;
      neighbors.slice(0, revealCount).forEach((neighbor) => {
        const neighborIndex = newGrid.findIndex(t => t.id === neighbor.id);
        if (neighborIndex >= 0) {
          newGrid[neighborIndex] = { ...newGrid[neighborIndex], revealed: true };
        }
      });
    }

    const newMines = patchActiveMine(prev, mineIndex, {
      grid: newGrid,
      prospectingCount: activeMine.prospectingCount + 1,
      shaftStability: getShaftStability(activeMine),
      carriedOre: getCarriedOre(activeMine),
      carryLimit: getCarryLimit(activeMine),
      braceCharges: getBraceCharges(activeMine, hasSafetyKit),
    });

    const notifications: GameNotification[] = [];
    if (tile.stability < 55) {
      notifications.push({
        title: 'Unstable Pocket',
        msg: 'This tile looks weak. Expect higher cave-in risk during extraction.'
      });
    }
    if (hasOreScanner) {
      notifications.push({
        title: 'Scanner Sweep',
        msg: tile.type === 'ORE'
          ? 'Ore signature found. Nearby tiles were partially revealed.'
          : 'Nearby ground was partially revealed.'
      });
    }

    const prospectingEnergyCost = 1 + (weatherModifiers.energyMultiplier >= 1.15 ? 1 : 0);

    return {
      nextState: {
        ...prev,
        mines: newMines,
        energy: Math.max(0, prev.energy - prospectingEnergyCost)
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

  const carriedOre = getCarriedOre(activeMine);
  const carryLimit = getCarryLimit(activeMine);
  if (tile.type === 'ORE' && carriedOre >= carryLimit) {
    return {
      nextState: prev,
      notifications: [{ title: 'Load Full', msg: 'Secure your carried ore before extracting more.' }]
    };
  }

  const shaftStability = getShaftStability(activeMine);
  const braceCharges = getBraceCharges(activeMine, hasSafetyKit);
  const instabilityPenalty = tile.stability < 55 ? 18 : 0;
  const shaftPenalty = Math.max(0, 70 - shaftStability) * 0.35;
  const safetyReduction = hasSafetyKit ? 12 : 0;
  const hazardChance = Math.min(95, Math.max(2, activeMine.danger + instabilityPenalty + shaftPenalty + weatherModifiers.hazardBonus - safetyReduction - (hasCommunityBacking ? 8 : 0)));
  const riskRoll = Math.random() * 100;
  const isHazard = riskRoll < hazardChance;
  const isGasLeak = isHazard && Math.random() > 0.5;
  const isCaveIn = isHazard && !isGasLeak;

  let newGrid = [...activeMine.grid];
  let oreGain = 0;
  let moneyGain = 0;
  let energyCost = Math.ceil((hasSafetyKit ? 4 : 5) * weatherModifiers.energyMultiplier);
  let richVeinBonus = 0;
  let nextShaftStability = Math.max(0, shaftStability - (tile.stability < 55 ? 9 : 4) - Math.round(activeMine.danger / 18));
  let nextBraceCharges = braceCharges;
  const notifications: GameNotification[] = [];

  if (tile.type === 'ORE') {
    const hasWashPlant = prev.permits['wash-plant-permit']?.status === 'APPROVED';
    const multiplier = hasWashPlant ? 2 : 1;
    const foundRichVein = tile.stability >= 85 || (hasOreScanner && Math.random() < 0.35);
    richVeinBonus = foundRichVein ? multiplier : 0;
    oreGain = (activeMine.yield * multiplier) + richVeinBonus;
    oreGain = Math.max(1, Math.round(oreGain * weatherModifiers.yieldMultiplier));
    oreGain = Math.min(oreGain, carryLimit - carriedOre);
    moneyGain = 0;
  }

  if (isGasLeak) {
    energyCost += hasSafetyKit ? 7 : 15;
    notifications.push({ title: 'Gas Leak!', msg: 'Toxic fumes released. You lost extra energy.' });
  } else if (isCaveIn) {
    if (nextBraceCharges > 0) {
      nextBraceCharges -= 1;
      nextShaftStability = Math.max(nextShaftStability, 35);
      energyCost += 3;
      notifications.push({ title: 'Brace Deployed', msg: 'A support brace stopped the cave-in, but one charge was consumed.' });
    } else {
      energyCost += hasSafetyKit ? 4 : 10;
      oreGain = Math.max(0, oreGain - 2);
      nextShaftStability = Math.max(0, nextShaftStability - 12);
      newGrid[tileIndex] = { ...tile, type: 'ROCK', stability: 0, mined: false, revealed: true };
      newGrid = degradeAdjacentTiles(newGrid, tile, 8);
      notifications.push({ title: 'Cave-In!', msg: 'The tile collapsed into rubble and weakened adjacent ground.' });
    }
  }

  if (!isCaveIn || nextBraceCharges < braceCharges) {
    newGrid[tileIndex] = { ...tile, mined: true, revealed: true };
  }

  if (hasCommunityBacking) {
    energyCost = Math.max(2, energyCost - 1);
  }

  if (tile.type === 'ORE' && oreGain > 0) {
    notifications.push({
      title: richVeinBonus > 0 ? 'Rich Vein Loaded' : 'Ore Loaded',
      msg: `Added ${oreGain} ore to your carried load. Secure it before leaving.`
    });
  } else if (tile.type !== 'ORE' && tile.stability < 55 && !isCaveIn) {
    notifications.push({
      title: 'Fragile Ground',
      msg: 'Low-stability ground shook the shaft. Watch the stability meter.'
    });
  }

  if (nextShaftStability <= 20) {
    notifications.push({ title: 'Shaft Critical', msg: 'The mine is close to collapse. Secure your load or retreat.' });
  }

  const nextCarriedOre = carriedOre + oreGain;
  const patchedMines = patchActiveMine(prev, mineIndex, {
    grid: newGrid,
    carriedOre: nextCarriedOre,
    carryLimit,
    shaftStability: nextShaftStability,
    braceCharges: nextBraceCharges,
  });

  const exposureGain = (activeMine.danger * 0.1) + weatherModifiers.exposureBonus + (hasMediaHeat ? 2 : 0) + (nextShaftStability < 30 ? 1 : 0);

  if (prev.energy - energyCost <= 0) {
    const collapsedMine = getRunMine(patchedMines[mineIndex]);
    const lostOre = Math.ceil(getCarriedOre(collapsedMine) / 2);
    const collapseMines = patchActiveMine({ ...prev, mines: patchedMines }, mineIndex, {
      carriedOre: Math.max(0, getCarriedOre(collapsedMine) - lostOre),
      shaftStability: Math.max(0, getShaftStability(collapsedMine) - 20),
    });
    const collapsed = applyExhaustionCollapse({
      ...prev,
      mines: collapseMines,
      energy: prev.energy - energyCost,
      money: prev.money + moneyGain,
      meters: {
        ...prev.meters,
        exposure: Math.min(100, prev.meters.exposure + exposureGain)
      }
    });
    return {
      nextState: collapsed.nextState,
      notifications: [
        ...notifications,
        { title: 'Load Lost', msg: `You lost ${lostOre} carried ore during the collapse.` },
        collapsed.notification,
      ]
    };
  }

  return {
    nextState: {
      ...prev,
      mines: patchedMines,
      energy: prev.energy - energyCost,
      money: prev.money + moneyGain,
      meters: {
        ...prev.meters,
        exposure: Math.min(100, prev.meters.exposure + exposureGain)
      }
    },
    notifications
  };
};

export const applyMineSceneAction = (
  prev: GameState,
  action: string,
): { nextState: GameState; notifications: GameNotification[] } => {
  const mineIndex = prev.mines.findIndex(m => m.id === prev.activeMineId);
  if (mineIndex === -1) return { nextState: prev, notifications: [] };
  const activeMine = getRunMine(prev.mines[mineIndex]);
  const hasSafetyKit = prev.upgrades.includes(MINE_SAFETY_KIT_UPGRADE);

  if (action === 'SECURE_LOAD') {
    const carriedOre = getCarriedOre(activeMine);
    if (carriedOre <= 0) {
      return { nextState: prev, notifications: [{ title: 'No Load', msg: 'You are not carrying any ore to secure.' }] };
    }

    const newMines = patchActiveMine(prev, mineIndex, {
      carriedOre: 0,
      shaftStability: Math.min(100, getShaftStability(activeMine) + 4),
    });

    return {
      nextState: {
        ...prev,
        ore: prev.ore + carriedOre,
        mines: newMines,
      },
      notifications: [{ title: 'Load Secured', msg: `${carriedOre} ore moved from your pack into the stockpile.` }]
    };
  }

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

    const newTiles: Tile[] = [];
    for (let i = 0; i < activeMine.gridWidth; i++) {
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
        y: activeMine.gridHeight,
        z: 0
      });
    }

    const newMines = patchActiveMine(prev, mineIndex, {
      grid: [...activeMine.grid, ...newTiles],
      gridHeight: activeMine.gridHeight + 1,
      carryLimit: getCarryLimit(activeMine),
      carriedOre: getCarriedOre(activeMine),
      shaftStability: getShaftStability(activeMine),
      braceCharges: getBraceCharges(activeMine, hasSafetyKit),
    });

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
    const newMines = patchActiveMine(prev, mineIndex, {
      braceCharges: SAFETY_KIT_BRACE_CHARGES,
      shaftStability: Math.min(100, getShaftStability(activeMine) + 8),
    });
    return {
      nextState: {
        ...prev,
        mines: newMines,
        money: prev.money - cost,
        upgrades: [...prev.upgrades, MINE_SAFETY_KIT_UPGRADE]
      },
      notifications: [{ title: 'Safety Kit Installed', msg: 'Two brace charges added and hazard impact reduced.' }]
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
