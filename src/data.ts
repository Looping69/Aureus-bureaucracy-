import { NPC, Permit, Tile, Building, Mine, DialogueNode, OfficeItem, WorldPosition } from './types';
import { extendWorldEffect } from './game/dialogue/worldEffects';
import { addStoryFlag, addStoryFlags, hasStoryFlag } from './game/dialogue/storyFlags';
import { PLAYER_HOUSE_VOXELS } from './voxelData';
import {
  ASSET_BUILDING_A_VOXELS,
  ASSET_BUILDING_B_VOXELS,
  ASSET_BUILDING_C_VOXELS,
  ASSET_BUILDING_D_VOXELS,
  ASSET_BUILDING_E_VOXELS,
} from './assetBuildings';
import { WORLD_SIZE as SHARED_WORLD_SIZE } from './utils/voxelConstants';
import { 
  LICENSING_OFFICE_VOXELS, 
  UNION_HALL_VOXELS, 
  INSPECTOR_HQ_VOXELS, 
  FIXER_DEN_VOXELS, 
  CHIEF_HUT_VOXELS, 
  HOTLINE_BOOTH_VOXELS,
  PARK_VOXELS,
  ROAD_NS_VOXELS,
  ROAD_EW_VOXELS,
  ROAD_CROSS_VOXELS,
  GENERIC_HOUSE_A_VOXELS,
  GENERIC_HOUSE_B_VOXELS,
  GENERIC_OFFICE_VOXELS,
  FACTORY_VOXELS,
  TREE_A_VOXELS,
  TREE_B_VOXELS,
  BUSH_VOXELS,
  GARDEN_VOXELS,
  GENERIC_HOUSE_C_VOXELS,
  GENERIC_HOUSE_D_VOXELS,
} from './buildings';

export const generateGrid = (width: number, height: number, yieldRate: number = 0.2): Tile[] => {
  const grid: Tile[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isOre = Math.random() < yieldRate;
      const isRock = !isOre && Math.random() < 0.15;
      const type: Tile['type'] = isOre ? 'ORE' : (isRock ? 'ROCK' : 'DIRT');
      const stability = isRock
        ? 80 + Math.floor(Math.random() * 21)
        : 45 + Math.floor(Math.random() * 56);

      grid.push({
        id: `${x}-${y}`,
        x,
        y,
        z: 0,
        type,
        stability,
        mined: false,
        revealed: false
      });
    }
  }
  return grid;
};

export const INITIAL_NPCS: Record<string, NPC> = {
  'licensing': {
    id: 'licensing',
    name: 'Officer Vane',
    role: 'Licensing Gatekeeper',
    persona: 'Insecure, obsessed with stamps and protocol.',
    motive: 'Wants to feel important and feared.',
    vulnerability: {
      id: 'vane_status',
      description: 'Desperate for recognition and a promotion.',
      discovered: false,
      leverageDialogue: 'I heard the Regional Director is looking for "efficient" officers for the new sector...',
      successDialogue: 'The new sector? You... you have influence there? Perhaps we can expedite this.',
      reward: 'SPEED'
    },
    trustLevel: 50,
    leverage: 0,
    potentialLeverage: 'Evidence of mismanaged permit fees.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vane&backgroundColor=b6e3f4',
    rivals: ['chief', 'fixer'],
    allies: ['inspector'],
    workHours: { start: 9, end: 17 },
    homeBuildingId: 'house_south_a',
    workBuildingId: 'licensing_office',
    moodShiftType: 'GRUMPY'
  },
  'union': {
    id: 'union',
    name: 'Big Sal',
    role: 'Union Representative',
    persona: 'Gruff, talks about "the boys", loves backroom deals.',
    motive: 'Personal enrichment disguised as worker safety.',
    vulnerability: {
      id: 'sal_luxury',
      description: 'Has a taste for expensive, imported cigars.',
      discovered: false,
      leverageDialogue: 'I found these Cubans in a crate near the border. Interested?',
      successDialogue: 'Well now, that is a fine aroma. Maybe we can overlook a few safety regs.',
      reward: 'DISCOUNT'
    },
    trustLevel: 40,
    leverage: 0,
    potentialLeverage: 'Proof of pocketing worker safety funds.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sal&backgroundColor=ffdfbf',
    rivals: ['inspector'],
    allies: ['fixer'],
    workHours: { start: 10, end: 22 },
    homeBuildingId: 'union_hall',
    workBuildingId: 'union_hall',
    moodShiftType: 'HAPPY'
  },
  'inspector': {
    id: 'inspector',
    name: 'Inspector Krell',
    role: 'Safety Auditor',
    persona: 'Cold, robotic, cites sub-clauses from memory.',
    motive: 'Perfect compliance (or the appearance of it).',
    vulnerability: {
      id: 'krell_past',
      description: 'Haunted by a structural failure in Sector 4.',
      discovered: false,
      leverageDialogue: 'I found the original blueprints for Sector 4. They don\'t match your report.',
      successDialogue: 'Keep your voice down. Give me that, and I\'ll sign whatever you want.',
      reward: 'INFO'
    },
    trustLevel: 30,
    leverage: 0,
    potentialLeverage: 'Records of the Sector 4 structural failure cover-up.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Krell&backgroundColor=c0aede',
    rivals: ['union', 'fixer'],
    allies: ['licensing'],
    workHours: { start: 8, end: 16 },
    homeBuildingId: 'house_south_b',
    workBuildingId: 'inspector_hq',
    moodShiftType: 'GRUMPY'
  },
  'fixer': {
    id: 'fixer',
    name: 'Slink',
    role: 'Black Market Fixer',
    persona: 'Fast-talking, twitchy, knows everyone\'s secrets.',
    motive: 'Maximum chaos and profit.',
    vulnerability: {
      id: 'slink_debt',
      description: 'Owes a lot of money to off-world syndicates.',
      discovered: false,
      leverageDialogue: 'I know about the debt collectors looking for you.',
      successDialogue: 'Hey, hey! No need to broadcast that. I can get you a discount, just keep quiet.',
      reward: 'DISCOUNT'
    },
    trustLevel: 20,
    leverage: 0,
    potentialLeverage: 'The location of his hidden stash of stolen tech.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Slink&backgroundColor=ffd5dc',
    rivals: ['licensing', 'inspector'],
    allies: ['union'],
    workHours: { start: 18, end: 4 },
    homeBuildingId: 'fixer_den',
    workBuildingId: 'fixer_den',
    moodShiftType: 'HAPPY'
  },
  'journalist': {
    id: 'journalist',
    name: 'Elena Vox',
    role: 'Investigative Reporter',
    persona: 'Idealistic but cynical, looking for the "big one".',
    motive: 'Exposing the truth (or getting clicks).',
    vulnerability: {
      id: 'vox_scoop',
      description: 'Desperate for a story that will make her famous.',
      discovered: false,
      leverageDialogue: 'I have the scoop of the century on the Mayor.',
      successDialogue: 'Finally! Give it here. I owe you one.',
      reward: 'INFO'
    },
    trustLevel: 10,
    leverage: 0,
    potentialLeverage: 'Proof of her taking a bribe to kill a story.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena&backgroundColor=d1d4f9',
    rivals: [],
    allies: [],
    workHours: { start: 0, end: 24 },
    homeBuildingId: 'hotline_booth',
    workBuildingId: 'hotline_booth',
    moodShiftType: 'NEUTRAL'
  },
  'chief': {
    id: 'chief',
    name: 'Chief Okon',
    role: 'Local Community Leader',
    persona: 'Dignified, weary, protective of his people.',
    motive: 'Preserving the land and his community\'s health.',
    vulnerability: {
      id: 'okon_health',
      description: 'His granddaughter is sick and needs rare medicine.',
      discovered: false,
      leverageDialogue: 'I have the medicine your granddaughter needs.',
      successDialogue: 'You... you are a savior. The tribe is in your debt.',
      reward: 'INFO'
    },
    trustLevel: 15,
    leverage: 0,
    potentialLeverage: 'Knowledge of the secret "Old Vein" location.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Okon&backgroundColor=f1f2f3',
    rivals: ['licensing'],
    allies: [],
    workHours: { start: 6, end: 20 },
    homeBuildingId: 'chief_hut',
    workBuildingId: 'chief_hut',
    moodShiftType: 'NEUTRAL'
  },
  'resident_a': {
    id: 'resident_a',
    name: 'Marta Dunn',
    role: 'Factory Worker',
    persona: 'Quiet, hardworking, keeps her head down.',
    motive: 'Providing for her family.',
    vulnerability: {
      id: 'marta_debt',
      description: 'Behind on company housing payments.',
      discovered: false,
      leverageDialogue: 'I know about the payment notices.',
      successDialogue: 'Please, don\'t tell anyone. I\'ll help however I can.',
      reward: 'INFO'
    },
    trustLevel: 30,
    leverage: 0,
    potentialLeverage: 'Witnessed an accident at the factory.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marta&backgroundColor=ffd5dc',
    rivals: [],
    allies: [],
    workHours: { start: 7, end: 15 },
    homeBuildingId: 'house_nw_d',
    workBuildingId: 'factory_west',
    moodShiftType: 'NEUTRAL'
  },
  'resident_b': {
    id: 'resident_b',
    name: 'Dag Holt',
    role: 'Clerk',
    persona: 'Nervous, meticulous, always checking over his shoulder.',
    motive: 'Staying out of trouble.',
    vulnerability: {
      id: 'dag_files',
      description: 'Accidentally shredded an important audit report.',
      discovered: false,
      leverageDialogue: 'I found the missing audit pages in the recycler.',
      successDialogue: 'Oh no, oh no. Please, I\'ll do anything.',
      reward: 'INFO'
    },
    trustLevel: 25,
    leverage: 0,
    potentialLeverage: 'Knows where backup files are stored.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dag&backgroundColor=c0aede',
    rivals: [],
    allies: [],
    workHours: { start: 9, end: 17 },
    homeBuildingId: 'house_ne_c',
    workBuildingId: 'office_east',
    moodShiftType: 'GRUMPY'
  },
  'resident_c': {
    id: 'resident_c',
    name: 'Pria Sato',
    role: 'Miner',
    persona: 'Tough, laconic, covered in dust.',
    motive: 'Earning enough to leave this place.',
    vulnerability: {
      id: 'pria_moonlight',
      description: 'Sells ore on the side to a rival company.',
      discovered: false,
      leverageDialogue: 'I saw the off-books shipment manifest with your name on it.',
      successDialogue: 'Fine. What do you want?',
      reward: 'DISCOUNT'
    },
    trustLevel: 20,
    leverage: 0,
    potentialLeverage: 'Knows about unstable tunnels.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pria&backgroundColor=b6e3f4',
    rivals: [],
    allies: [],
    workHours: { start: 6, end: 14 },
    homeBuildingId: 'house_sw_e',
    workBuildingId: 'mine_entrance',
    moodShiftType: 'NEUTRAL'
  },
  'resident_d': {
    id: 'resident_d',
    name: 'Tomek Bray',
    role: 'Shift Supervisor',
    persona: 'Boisterous, likes a drink after work.',
    motive: 'Keep the operation running smoothly.',
    vulnerability: {
      id: 'tomek_injury',
      description: 'Hiding a chronic back injury to keep his position.',
      discovered: false,
      leverageDialogue: 'The medical records tell a different story, Tomek.',
      successDialogue: 'Alright, alright. Sit down, let\'s talk.',
      reward: 'SPEED'
    },
    trustLevel: 35,
    leverage: 0,
    potentialLeverage: 'Witnessed the safety cover-up in Sector 3.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tomek&backgroundColor=ffdfbf',
    rivals: [],
    allies: ['union'],
    workHours: { start: 8, end: 18 },
    homeBuildingId: 'house_east_f',
    workBuildingId: 'union_hall',
    moodShiftType: 'HAPPY'
  }
};

export const INITIAL_PERMITS: Record<string, Permit> = {
  'extraction-intent': {
    id: 'extraction-intent',
    name: 'Extraction Intent (Form 17-B)',
    formNumber: '17-B',
    description: 'Preliminary declaration of intent to extract resources from the crust. Required for all mining operations.',
    cost: 50,
    status: 'AVAILABLE',
    unlocksFeature: 'prospecting'
  },
  'prospecting-license': {
    id: 'prospecting-license',
    name: 'Prospecting License (Form 404)',
    formNumber: '404',
    description: 'Allows for surface-level sampling (up to 10 samples) to determine site viability. Do not extract ore.',
    cost: 150,
    status: 'LOCKED',
    unlocksFeature: 'mine_access'
  },
  'mining-permit-iron': {
    id: 'mining-permit-iron',
    name: 'Iron Vein Extraction Permit',
    formNumber: 'FE-26',
    description: 'Full operational rights for the Iron Vein Outpost. Compliance with safety regulations mandatory.',
    cost: 500,
    status: 'LOCKED',
    unlocksFeature: 'iron_mine_full'
  },
  'prospecting-permit-deep': {
    id: 'prospecting-permit-deep',
    name: 'Deep Hollow Survey Request',
    formNumber: 'DH-01',
    description: 'Permission to survey the Deep Hollow region. High danger pay required for inspectors.',
    cost: 300,
    status: 'LOCKED'
  },
  'mining-permit-deep': {
    id: 'mining-permit-deep',
    name: 'Deep Hollow Excavation Rights',
    formNumber: 'DH-02',
    description: 'Full mining rights for Deep Hollow. Waiver of liability for "shadow sickness" required.',
    cost: 1200,
    status: 'LOCKED'
  },
  'prospecting-permit-abyss': {
    id: 'prospecting-permit-abyss',
    name: 'Abyssal Reach Probe Auth',
    formNumber: 'AR-00',
    description: 'Authorization to send probes into the Abyssal Reach. Extreme caution advised.',
    cost: 1000,
    status: 'LOCKED'
  },
  'wash-plant-permit': {
    id: 'wash-plant-permit',
    name: 'Wash Plant Installation',
    formNumber: 'WP-09',
    description: 'Permit to install a high-capacity wash plant, doubling ore yield per tile.',
    cost: 800,
    status: 'AVAILABLE',
    unlocksFeature: 'wash_plant'
  },
  'export-license': {
    id: 'export-license',
    name: 'Ore Export License',
    formNumber: 'EX-99',
    description: 'Authorization to sell extracted ore on the open market.',
    cost: 300,
    status: 'AVAILABLE',
    unlocksFeature: 'export_ore'
  },
  'claim-expansion': {
    id: 'claim-expansion',
    name: 'Claim Expansion Request',
    formNumber: 'CE-12',
    description: 'Expand the boundaries of your current mining claim.',
    cost: 1500,
    status: 'AVAILABLE',
    unlocksFeature: 'expand_claim'
  },
  'mining-permit-abyss': {
    id: 'mining-permit-abyss',
    name: 'Abyssal Reach Exploitation Grant',
    formNumber: 'AR-666',
    description: 'Unrestricted mining access to the Abyssal Reach. God help us all.',
    cost: 5000,
    status: 'LOCKED'
  }
};

export const REJECTION_REASONS = [
  "Ink color was 'Excessively Hopeful'.",
  "Margins failed to meet the 1.2mm 'Bureaucratic Anxiety' standard.",
  "Signature looks suspiciously like a cry for help.",
  "Form was submitted during a mandatory 'Silence Appreciation' hour.",
  "The inspector had a bad dream about a mole.",
  "Your ethical compliance score is 'Questionably Sincere'.",
  "Missing 'Appendix G: Proof of Existence'.",
  "The paper weight was 0.5g too light, suggesting a lack of gravitas."
];

export const WORLD_SIZE = SHARED_WORLD_SIZE;
export const WORLD_CENTER = WORLD_SIZE / 2;

export const INITIAL_MINES: Mine[] = [
  {
    id: 'iron-vein',
    name: 'Iron Vein Outpost',
    location: 'OUTSKIRTS',
    travelTime: 2,
    hasLocals: false,
    yield: 1,
    danger: 10,
    discovered: true,
    grid: generateGrid(5, 10, 0.3), // 5x10 grid (50 tiles)
    gridWidth: 5,
    gridHeight: 10,
    status: 'PROSPECTING', // Starts in prospecting phase
    prospectingCount: 0,
    permits: {
      prospectingId: 'prospecting-license',
      miningId: 'mining-permit-iron'
    }
  },
  {
    id: 'deep-hollow',
    name: 'Deep Hollow',
    location: 'DEEP_WASTE',
    travelTime: 6,
    hasLocals: true,
    chiefId: 'chief',
    yield: 3,
    danger: 40,
    discovered: false,
    grid: generateGrid(8, 15, 0.5), // Larger grid
    gridWidth: 8,
    gridHeight: 15,
    status: 'LOCKED',
    prospectingCount: 0,
    permits: {
      prospectingId: 'prospecting-permit-deep',
      miningId: 'mining-permit-deep'
    }
  },
  {
    id: 'abyssal-reach',
    name: 'Abyssal Reach',
    location: 'DEEP_WASTE',
    travelTime: 12,
    hasLocals: false,
    yield: 10,
    danger: 90,
    discovered: false,
    grid: generateGrid(10, 20, 0.8), // Huge grid
    gridWidth: 10,
    gridHeight: 20,
    status: 'LOCKED',
    prospectingCount: 0,
    permits: {
      prospectingId: 'prospecting-permit-abyss',
      miningId: 'mining-permit-abyss'
    }
  }
];

export const DIALOGUE_TREES: Record<string, Record<string, DialogueNode>> = {
  'licensing': {
    'root': {
      id: 'root',
      text: "Vane doesn't look up from his ledger. 'Form 1-A is the foundation of civilization. Without it, you are merely a loiterer with a shovel. What do you want?'",
      options: [
        {
          text: "I need a permit to start digging. (Tutorial)",
          condition: (s) => s.tutorialStep === 2,
          action: (s) => ({
            tutorialStep: 3,
            permits: {
              ...s.permits,
              'extraction-intent': { ...s.permits['extraction-intent'], status: 'AVAILABLE' }
            }
          }),
          nextNodeId: 'tutorial_intro'
        },
        {
          text: "I'm here for the Prospecting License.",
          nextNodeId: 'prospecting',
          condition: (s) => s.permits['prospecting-license'].status === 'AVAILABLE'
        },
        {
          text: "I need to discuss my rejected application (Form 17-B).",
          nextNodeId: 'rejection_discussion',
          condition: (s) => s.permits['extraction-intent'].status === 'REJECTED'
        },
        {
          text: "Your filing system is remarkably efficient, Officer.",
          action: (s) => ({
            npcs: {
              ...s.npcs,
              'licensing': { ...s.npcs['licensing'], trustLevel: Math.min(100, s.npcs['licensing'].trustLevel + 5) }
            }
          }),
          nextNodeId: 'flattery'
        },
        {
          text: "Chief Okon says you buried contamination reports.",
          condition: (s) => hasStoryFlag(s, 'chief_water_quest') && !hasStoryFlag(s, 'vane_exposed'),
          nextNodeId: 'contamination_confrontation'
        }
      ]
    },
    'tutorial_intro': {
      id: 'tutorial_intro',
      text: "'New meat? Very well. You'll need Form 17-B. I've unlocked it in your file. Fill it out. Don't make mistakes.'",
      options: [
        { text: "I'll get right on it.", nextNodeId: 'root' }
      ]
    },
    'rejection_discussion': {
      id: 'rejection_discussion',
      text: "'Ah, yes. The 17-B. Rejected for... let me see... 'Excessive Hopefulness'. A serious infraction. We can't have dreamers clogging up the tunnels.'",
      options: [
        {
          text: "This is absurd! I demand an appeal.",
          nextNodeId: 'appeal_denied'
        },
        {
          text: "Is there any way to... expedite a reconsideration?",
          nextNodeId: 'bribe_hint'
        }
      ]
    },
    'appeal_denied': {
      id: 'appeal_denied',
      text: "'Appeals require Form 99-Z, which is currently out of print. Come back in six to eight months.' He smirks, clearly enjoying this.",
      options: [
        { text: "I don't have six months.", nextNodeId: 'bribe_hint' }
      ]
    },
    'bribe_hint': {
      id: 'bribe_hint',
      text: "'Time is a luxury, isn't it? Just like... recognition. You know, the Regional Director is visiting soon. He values... initiative.'",
      options: [
        {
          text: "I see. Initiative. [Insight]",
          action: (s) => ({
            tutorialStep: 5, // Advance to 'Use Knowledge' step
            npcs: {
              ...s.npcs,
              'licensing': { 
                ...s.npcs['licensing'], 
                vulnerability: { ...s.npcs['licensing'].vulnerability, discovered: true } 
              }
            }
          }),
          nextNodeId: 'negotiation_phase'
        }
      ]
    },
    'negotiation_phase': {
      id: 'negotiation_phase',
      text: "Vane waits, tapping his pen. He expects you to make a move.",
      options: [
        {
          text: "I heard the Director is looking for 'efficient' officers... [Use Vulnerability]",
          condition: (s) => s.npcs['licensing'].vulnerability.discovered,
          action: (s) => ({
            tutorialStep: 7, // Complete tutorial
            worldEffects: extendWorldEffect(s, 'bureauPull', 10),
            permits: {
              ...s.permits,
              'extraction-intent': { ...s.permits['extraction-intent'], status: 'APPROVED' }
            },
            npcs: {
              ...s.npcs,
              'licensing': { ...s.npcs['licensing'], trustLevel: s.npcs['licensing'].trustLevel + 20 }
            },
            meters: {
              ...s.meters,
              influence: s.meters.influence + 5,
              trust: s.meters.trust + 10
            }
          }),
          nextNodeId: 'tutorial_success'
        },
        {
          text: "Maybe I can offer a 'processing fee'? ($50)",
          condition: (s) => s.money >= 50,
          action: (s) => ({
            money: s.money - 50,
            tutorialStep: 7, // Complete tutorial
            permits: {
              ...s.permits,
              'extraction-intent': { ...s.permits['extraction-intent'], status: 'APPROVED' }
            },
            meters: {
              ...s.meters,
              exposure: s.meters.exposure + 5,
              trust: Math.max(0, s.meters.trust - 5)
            }
          }),
          nextNodeId: 'tutorial_success'
        }
      ]
    },
    'tutorial_success': {
      id: 'tutorial_success',
      text: "'Well now. That is... precisely the kind of initiative we look for. Your 17-B is approved. Try not to die down there.'",
      options: [
        { text: "Thanks, Vane.", nextNodeId: 'root' }
      ]
    },
    'prospecting': {
      id: 'prospecting',
      text: "'The 1-A? A bold choice. It requires a $50 processing fee and a soul free of administrative clutter. Shall we proceed?'",
      options: [
        {
          text: "Here is the $50. [Pay]",
          condition: (s) => s.money >= 50,
          action: (s) => ({
            money: s.money - 50,
            activeMiniGame: 'FORM_PROCESSING',
            activePermitId: 'prospecting-license',
            pendingPermitAction: 'DIALOGUE',
            activeNPCId: null
          }),
          nextNodeId: 'approved'
        },
        { text: "I'll come back later.", nextNodeId: 'root' }
      ]
    },
    'flattery': {
      id: 'flattery',
      text: "He pauses, a tiny smirk appearing. 'Efficiency is its own reward, but recognition... recognition is rare in this sector. You have a keen eye.'",
      options: [
        { text: "Just stating the obvious.", nextNodeId: 'root' }
      ]
    },
    'contamination_confrontation': {
      id: 'contamination_confrontation',
      text: "Vane freezes. 'You do not understand the sensitivity of those reports. There are two ways this goes: quietly, or catastrophically.'",
      options: [
        {
          text: 'Quietly. Open your backchannel and move my permits.',
          action: (s) => ({
            storyFlags: addStoryFlag(s, 'vane_backchannel'),
            worldEffects: extendWorldEffect(s, 'bureauPull', 18),
            npcs: {
              ...s.npcs,
              licensing: { ...s.npcs.licensing, trustLevel: Math.min(100, s.npcs.licensing.trustLevel + 10), leverage: Math.min(100, s.npcs.licensing.leverage + 15) }
            },
            meters: {
              ...s.meters,
              exposure: Math.min(100, s.meters.exposure + 6)
            }
          }),
          nextNodeId: 'backchannel_opened'
        },
        {
          text: 'Catastrophically. I am taking this public.',
          action: (s) => ({
            storyFlags: addStoryFlags(s, 'vane_exposed', 'public_scandal'),
            worldEffects: extendWorldEffect(s, 'mediaHeat', 24),
            meters: {
              ...s.meters,
              influence: Math.min(100, s.meters.influence + 10),
              trust: Math.min(100, s.meters.trust + 4),
              exposure: Math.min(100, s.meters.exposure + 10)
            },
            npcs: {
              ...s.npcs,
              licensing: { ...s.npcs.licensing, trustLevel: Math.max(0, s.npcs.licensing.trustLevel - 35) }
            }
          }),
          nextNodeId: 'vane_burned'
        }
      ]
    },
    'backchannel_opened': {
      id: 'backchannel_opened',
      text: "'Fine. Quiet signatures, quiet approvals, and you never mention the water again.'",
      options: [{ text: 'We understand each other.', nextNodeId: 'root' }]
    },
    'vane_burned': {
      id: 'vane_burned',
      text: "'You self-righteous little saboteur. Whatever door I could have opened for you is closed.'",
      options: [{ text: 'Good.', nextNodeId: 'root' }]
    },
    'approved': {
      id: 'approved',
      text: "'Stamp. Stamp. Stamp. You are now officially a Prospector. Don't make me regret my ink usage.'",
      options: [
        { text: "Thank you, Officer.", nextNodeId: 'root' }
      ]
    }
  },
  'chief': {
    'root': {
      id: 'root',
      text: "Chief Okon stands by a small fire. 'The earth groans beneath your machines, stranger. Why have you come to our sector?'",
      options: [
        {
          text: "I'm just looking for work.",
          nextNodeId: 'work'
        },
        {
          text: "I want to help your people. [Trust 30+]",
          trustRequired: 30,
          condition: (s) => !hasStoryFlag(s, 'fixer_smuggling_tie') || hasStoryFlag(s, 'community_pact'),
          nextNodeId: 'help'
        },
        {
          text: "Let's build a clean-water pact. [Trust 45+]",
          trustRequired: 45,
          condition: (s) => !hasStoryFlag(s, 'community_pact') && !hasStoryFlag(s, 'fixer_smuggling_tie'),
          action: (s) => ({
            storyFlags: addStoryFlag(s, 'community_pact'),
            worldEffects: extendWorldEffect(s, 'communityBacking', 24),
            npcs: {
              ...s.npcs,
              chief: { ...s.npcs.chief, trustLevel: Math.min(100, s.npcs.chief.trustLevel + 10) }
            }
          }),
          nextNodeId: 'community_pact'
        },
        {
          text: "Chief, I know Slink. Hear me out.",
          condition: (s) => hasStoryFlag(s, 'fixer_smuggling_tie') && !hasStoryFlag(s, 'community_pact'),
          nextNodeId: 'smuggler_rebuke'
        },
        {
          text: "I have medicine for the elders. [Give Item]",
          condition: (s) => s.upgrades.includes('meds'),
          action: (s) => ({
            worldEffects: extendWorldEffect(s, 'communityBacking', 18),
            npcs: {
              ...s.npcs,
              'chief': { ...s.npcs['chief'], trustLevel: Math.min(100, s.npcs['chief'].trustLevel + 25) }
            }
          }),
          nextNodeId: 'meds_given'
        }
      ]
    },
    'work': {
      id: 'work',
      text: "'Work brings holes. Holes bring the Bureau. The Bureau brings sickness. Be careful what you dig for.'",
      options: [
        { text: "I understand.", nextNodeId: 'root' }
      ]
    },
    'help': {
      id: 'help',
      text: "'Help is a heavy word. If you truly wish to help, find out why the water in the lower tunnels has turned black. Officer Vane knows, but he hides behind his stamps.'",
      options: [
        { 
          text: "I'll look into it. [Gain Dirt on Vane]",
          action: (s) => ({
            storyFlags: addStoryFlag(s, 'chief_water_quest'),
            dirtItems: [...s.dirtItems, {
              id: `dirt-vane-water-${Date.now()}`,
              type: 'PERMIT_VIOLATION',
              description: "Evidence of Vane ignoring water contamination reports.",
              targetNpcId: 'licensing',
              value: 20
            }]
          }),
          nextNodeId: 'quest_accepted'
        }
      ]
    },
    'quest_accepted': {
      id: 'quest_accepted',
      text: "'Then we shall see if your heart is as strong as your shovel.'",
      options: [{ text: "Goodbye.", nextNodeId: 'root' }]
    },
    'community_pact': {
      id: 'community_pact',
      text: "'Then we stand together. Keep Slink's contraband away from my people, and our wells stay open to you.'",
      options: [{ text: 'Understood.', nextNodeId: 'root' }]
    },
    'smuggler_rebuke': {
      id: 'smuggler_rebuke',
      text: "'Slink poisons every deal he touches. Break from him before you ask this village for trust.'",
      options: [{ text: 'I hear you.', nextNodeId: 'root' }]
    },
    'meds_given': {
      id: 'meds_given',
      text: "His eyes soften. 'You bring life to a dying place. We will not forget this.'",
      options: [{ text: "It was the right thing to do.", nextNodeId: 'root' }]
    }
  },
  'union': {
    'root': {
      id: 'root',
      text: "Big Sal is leaning back, a thick cigar in his hand. 'The boys are restless, kid. Safety's a joke, and the pay is worse. You looking to make things better, or just looking to get rich?'",
      options: [
        {
          text: "I want to ensure worker safety. [Trust 20+]",
          trustRequired: 20,
          nextNodeId: 'safety'
        },
        {
          text: "I'm looking for a way to 'expedite' my permits.",
          nextNodeId: 'expedite'
        },
        {
          text: "Get your workers to testify about the poisoned water.",
          condition: (s) => hasStoryFlag(s, 'community_pact') && hasStoryFlag(s, 'chief_water_quest') && !hasStoryFlag(s, 'vane_exposed'),
          nextNodeId: 'worker_testimony'
        }
      ]
    },
    'safety': {
      id: 'safety',
      text: "'Safety, huh? Inspector Krell talks a big game, but he's in Vane's pocket. If you want real safety, you need to talk to the Chief. He knows the land better than any auditor.'",
      options: [
        { 
          text: "I'll talk to Chief Okon. [Gain Trust with Union]",
          action: (s) => ({
            worldEffects: extendWorldEffect(s, 'communityBacking', 12),
            npcs: {
              ...s.npcs,
              'union': { ...s.npcs['union'], trustLevel: Math.min(100, s.npcs['union']!.trustLevel + 10) }
            }
          }),
          nextNodeId: 'root'
        }
      ]
    },
    'expedite': {
      id: 'expedite',
      text: "'Expedite? That's a fancy word for a bribe. I like fancy words. But Vane is a stickler. Unless you have something on him... something that would make him sweat through his uniform.'",
      options: [
        { text: "I'll see what I can find.", nextNodeId: 'root' }
      ]
    },
    'worker_testimony': {
      id: 'worker_testimony',
      text: "'If you're really taking this public, I can line up men who've seen the black runoff. No turning back after that.'",
      options: [
        {
          text: 'Do it. Burn Vane in public.',
          action: (s) => ({
            storyFlags: addStoryFlags(s, 'vane_exposed', 'public_scandal'),
            worldEffects: extendWorldEffect(s, 'mediaHeat', 24),
            meters: {
              ...s.meters,
              influence: Math.min(100, s.meters.influence + 12),
              trust: Math.min(100, s.meters.trust + 6),
              exposure: Math.min(100, s.meters.exposure + 8)
            },
            npcs: {
              ...s.npcs,
              licensing: { ...s.npcs.licensing, trustLevel: Math.max(0, s.npcs.licensing.trustLevel - 30) },
              union: { ...s.npcs.union, trustLevel: Math.min(100, s.npcs.union.trustLevel + 8) }
            }
          }),
          nextNodeId: 'root'
        },
        {
          text: 'Not yet.',
          nextNodeId: 'root'
        }
      ]
    }
  },
  'journalist': {
    'root': {
      id: 'root',
      text: "Elena Vox is frantically typing on a tablet. 'The Bureau is a black hole, and I'm the only one trying to shine a light. You got something for me, or are you just another cog in the machine?'",
      options: [
        {
          text: "I have evidence of corruption. [Show Dirt]",
          condition: (s) => s.dirtItems.length > 0 && !hasStoryFlag(s, 'vox_embargo'),
          nextNodeId: 'dirt_menu'
        },
        {
          text: "What are you working on right now?",
          nextNodeId: 'current_story'
        },
        {
          text: 'Give Vox the exclusive and go loud.',
          condition: (s) =>
            (hasStoryFlag(s, 'public_scandal') || hasStoryFlag(s, 'vane_exposed')) &&
            !hasStoryFlag(s, 'vox_embargo') &&
            !hasStoryFlag(s, 'vox_exclusive') &&
            !hasStoryFlag(s, 'inspector_deputized'),
          nextNodeId: 'exclusive_offer'
        },
        {
          text: 'Buy a week of silence.',
          condition: (s) =>
            hasStoryFlag(s, 'vane_backchannel') &&
            !hasStoryFlag(s, 'vox_exclusive') &&
            !hasStoryFlag(s, 'vox_embargo'),
          nextNodeId: 'embargo_offer'
        },
        {
          text: 'Vox is sitting on your embargo.',
          condition: (s) => hasStoryFlag(s, 'vox_embargo'),
          nextNodeId: 'embargo_status'
        }
      ]
    },
    'dirt_menu': {
      id: 'dirt_menu',
      text: "'Let's see it. The more scandalous, the better. I can make sure the right people see this... and the wrong people feel the heat.'",
      options: [
        { 
          text: "Leak everything. [Gain Leverage/Exposure]",
          action: (s) => {
            const exposureGain = Math.min(18, 4 + (s.dirtItems.length * 3));
            const influenceGain = Math.min(20, 6 + (s.dirtItems.length * 4));
            return {
              dirtItems: [],
              worldEffects: extendWorldEffect(s, 'mediaHeat', 18),
              storyFlags: addStoryFlag(s, 'public_scandal'),
              meters: {
                ...s.meters,
                exposure: Math.min(100, s.meters.exposure + exposureGain),
                influence: Math.min(100, s.meters.influence + influenceGain),
                trust: Math.max(0, s.meters.trust - Math.min(8, s.dirtItems.length * 2))
              }
            };
          },
          nextNodeId: 'root'
        },
        { text: "Actually, I'll hold onto it.", nextNodeId: 'root' }
      ]
    },
    'exclusive_offer': {
      id: 'exclusive_offer',
      text: "'You give me first rights, I give you a citywide detonation. No more quiet lanes after this.'",
      options: [
        {
          text: 'Run it. I want maximum daylight.',
          action: (s) => ({
            storyFlags: addStoryFlags(s, 'vox_exclusive', 'public_scandal', 'vane_exposed'),
            worldEffects: extendWorldEffect(s, 'mediaHeat', 30),
            meters: {
              ...s.meters,
              influence: Math.min(100, s.meters.influence + 14),
              exposure: Math.min(100, s.meters.exposure + 8)
            },
            npcs: {
              ...s.npcs,
              journalist: { ...s.npcs.journalist, trustLevel: Math.min(100, s.npcs.journalist.trustLevel + 15) },
              licensing: { ...s.npcs.licensing, trustLevel: Math.max(0, s.npcs.licensing.trustLevel - 25) }
            }
          }),
          nextNodeId: 'root'
        }
      ]
    },
    'embargo_offer': {
      id: 'embargo_offer',
      text: "'Silence is expensive. Pay me, and I sit on the story for a week. But if you betray the deal, I burn you twice as hard.'",
      options: [
        {
          text: 'Pay $150 and cool the press.',
          condition: (s) => s.money >= 150,
          action: (s) => ({
            money: s.money - 150,
            storyFlags: addStoryFlag(s, 'vox_embargo'),
            worldEffects: extendWorldEffect(s, 'bureauPull', 12),
            meters: {
              ...s.meters,
              exposure: Math.max(0, s.meters.exposure - 4)
            }
          }),
          nextNodeId: 'root'
        },
        {
          text: 'Too expensive.',
          nextNodeId: 'root'
        }
      ]
    },
    'embargo_status': {
      id: 'embargo_status',
      text: "'The story is on ice, for now. Use the quiet while you still have it.'",
      options: [{ text: 'Understood.', nextNodeId: 'root' }]
    },
    'current_story': {
      id: 'current_story',
      text: "'I'm looking into the Sector 4 structural failure. Krell says it was an 'act of god', but I think it was an 'act of greed'. If you find anything in those tunnels... anything at all... bring it to me.'",
      options: [
        { text: "I'll keep my eyes open.", nextNodeId: 'root' }
      ]
    }
  },
  'inspector': {
    'root': {
      id: 'root',
      text: "Inspector Krell studies you in silence. 'Compliance is not a suggestion. What do you want?'",
      options: [
        {
          text: 'Request a formal safety sweep.',
          condition: (s) => !hasStoryFlag(s, 'inspector_blacklist') && (!hasStoryFlag(s, 'fixer_smuggling_tie') || hasStoryFlag(s, 'reform_alliance')),
          nextNodeId: 'safety_sweep'
        },
        {
          text: 'Ask about Sector 4 collapse records.',
          nextNodeId: 'sector4_records'
        },
        {
          text: 'Krell already heard about your fixer routes.',
          condition: (s) => hasStoryFlag(s, 'fixer_smuggling_tie') && !hasStoryFlag(s, 'reform_alliance'),
          nextNodeId: 'smuggling_conflict'
        },
        {
          text: 'Build a reform alliance against Vane.',
          condition: (s) => (hasStoryFlag(s, 'public_scandal') || hasStoryFlag(s, 'vane_exposed')) && !hasStoryFlag(s, 'reform_alliance'),
          nextNodeId: 'reform_alliance'
        },
        {
          text: 'Become Krell\'s internal witness.',
          condition: (s) =>
            !hasStoryFlag(s, 'inspector_blacklist') &&
            !hasStoryFlag(s, 'inspector_deputized') &&
            !hasStoryFlag(s, 'fixer_smuggling_tie') &&
            (hasStoryFlag(s, 'public_scandal') || hasStoryFlag(s, 'reform_alliance')),
          nextNodeId: 'deputized_offer'
        },
        {
          text: 'Tell Krell to stay out of your business.',
          condition: (s) =>
            hasStoryFlag(s, 'fixer_smuggling_tie') &&
            !hasStoryFlag(s, 'inspector_blacklist') &&
            !hasStoryFlag(s, 'inspector_deputized'),
          nextNodeId: 'blacklist_offer'
        },
        {
          text: 'Krell has blacklisted your operation.',
          condition: (s) => hasStoryFlag(s, 'inspector_blacklist'),
          nextNodeId: 'blacklist_status'
        }
      ]
    },
    'smuggling_conflict': {
      id: 'smuggling_conflict',
      text: "'You want compliance while running Slink's errands? End that relationship or bring me something big enough to justify the hypocrisy.'",
      options: [
        { text: 'I will come back with leverage.', nextNodeId: 'root' }
      ]
    },
    'safety_sweep': {
      id: 'safety_sweep',
      text: "'A sweep costs resources. Convince me this operation isn't another death trap.'",
      options: [
        {
          text: 'Offer full documentation (+Trust, +Community Backing 12h if accepted).',
          condition: (s) => s.meters.trust >= 35,
          action: (s) => ({
            worldEffects: extendWorldEffect(s, 'communityBacking', 12),
            npcs: {
              ...s.npcs,
              inspector: {
                ...s.npcs.inspector,
                trustLevel: Math.min(100, s.npcs.inspector.trustLevel + 12)
              }
            },
            meters: {
              ...s.meters,
              exposure: Math.max(0, s.meters.exposure - 4)
            }
          }),
          nextNodeId: 'sweep_success'
        },
        {
          text: 'Back off for now.',
          nextNodeId: 'root'
        }
      ]
    },
    'sweep_success': {
      id: 'sweep_success',
      text: "'Unexpected. Your files are cleaner than most. I'll lower inspection pressure this week.'",
      options: [
        {
          text: 'Thank you.',
          nextNodeId: 'root'
        }
      ]
    },
    'sector4_records': {
      id: 'sector4_records',
      text: "'Those records are sealed. But if your intent is reform, perhaps selected details can be... reviewed.'",
      options: [
        {
          text: 'Use findings to build a reform case (+Influence, +Bureau Pull 10h).',
          action: (s) => ({
            evidence: s.evidence + 1,
            storyFlags: addStoryFlag(s, 'reform_alliance'),
            worldEffects: extendWorldEffect(s, 'bureauPull', 10),
            meters: {
              ...s.meters,
              influence: Math.min(100, s.meters.influence + 5)
            }
          }),
          nextNodeId: 'root'
        },
        {
          text: 'Keep this between us.',
          action: (s) => ({
            npcs: {
              ...s.npcs,
              inspector: {
                ...s.npcs.inspector,
                trustLevel: Math.min(100, s.npcs.inspector.trustLevel + 6)
              }
            }
          }),
          nextNodeId: 'root'
        }
      ]
    },
    'reform_alliance': {
      id: 'reform_alliance',
      text: "'If Vane is slipping, I can stop shielding him. But once I start, I am done protecting anyone tied to smuggling.'",
      options: [
        {
          text: 'Do it. I want clean approvals, not favors.',
          action: (s) => ({
            storyFlags: addStoryFlags(s, 'reform_alliance', 'vane_exposed'),
            worldEffects: extendWorldEffect(s, 'bureauPull', 20),
            meters: {
              ...s.meters,
              influence: Math.min(100, s.meters.influence + 8),
              exposure: Math.max(0, s.meters.exposure - 3)
            }
          }),
          nextNodeId: 'root'
        }
      ]
    },
    'deputized_offer': {
      id: 'deputized_offer',
      text: "'Then you stop acting like an operator and start acting like a witness. Quiet routes die here. Clean ones open.'",
      options: [
        {
          text: 'Deputize me. I am done playing both sides.',
          action: (s) => ({
            storyFlags: addStoryFlags(s, 'inspector_deputized', 'reform_alliance', 'vane_exposed'),
            worldEffects: extendWorldEffect(s, 'bureauPull', 24),
            meters: {
              ...s.meters,
              exposure: Math.max(0, s.meters.exposure - 5),
              influence: Math.min(100, s.meters.influence + 6)
            },
            npcs: {
              ...s.npcs,
              inspector: { ...s.npcs.inspector, trustLevel: Math.min(100, s.npcs.inspector.trustLevel + 15) }
            }
          }),
          nextNodeId: 'root'
        }
      ]
    },
    'blacklist_offer': {
      id: 'blacklist_offer',
      text: "'Then we are done. I stop helping, you stop pretending this is a legal operation.'",
      options: [
        {
          text: 'Fine. Blacklist me.',
          action: (s) => ({
            storyFlags: addStoryFlag(s, 'inspector_blacklist'),
            worldEffects: extendWorldEffect(s, 'marketInsight', 12),
            meters: {
              ...s.meters,
              exposure: Math.min(100, s.meters.exposure + 6)
            }
          }),
          nextNodeId: 'root'
        },
        {
          text: 'Not yet.',
          nextNodeId: 'root'
        }
      ]
    },
    'blacklist_status': {
      id: 'blacklist_status',
      text: "'You chose the dirty lane. Do not expect inspections, approvals, or warnings from me.'",
      options: [{ text: 'Message received.', nextNodeId: 'root' }]
    }
  },
  'fixer': {
    'root': {
      id: 'root',
      text: "Slink grins. 'You need speed, silence, or something that definitely isn't legal?'",
      options: [
        {
          text: 'Take a courier job for intel.',
          condition: (s) => !hasStoryFlag(s, 'community_pact'),
          nextNodeId: 'courier_job'
        },
        {
          text: 'Ask for market rumors.',
          nextNodeId: 'market_rumors'
        },
        {
          text: 'Your village pact kills this business.',
          condition: (s) => hasStoryFlag(s, 'community_pact'),
          nextNodeId: 'fixer_pact_blocked'
        },
        {
          text: 'Run a smuggling convoy while the Bureau is distracted.',
          condition: (s) => hasStoryFlag(s, 'fixer_smuggling_tie') && !hasStoryFlag(s, 'community_pact'),
          nextNodeId: 'smuggling_convoy'
        }
      ]
    },
    'courier_job': {
      id: 'courier_job',
      text: "'Simple run. No questions. Deliver this package and don't open it.'",
      options: [
        {
          text: 'Accept the run (-$60, +Evidence, +Influence, +Market Window 10h).',
          condition: (s) => s.money >= 60,
          action: (s) => ({
            money: s.money - 60,
            evidence: s.evidence + 2,
            storyFlags: addStoryFlag(s, 'fixer_smuggling_tie'),
            worldEffects: extendWorldEffect(s, 'marketInsight', 10),
            meters: {
              ...s.meters,
              influence: Math.min(100, s.meters.influence + 3),
              exposure: Math.min(100, s.meters.exposure + 2)
            },
            npcs: {
              ...s.npcs,
              fixer: {
                ...s.npcs.fixer,
                trustLevel: Math.min(100, s.npcs.fixer.trustLevel + 8)
              }
            }
          }),
          nextNodeId: 'courier_done'
        },
        {
          text: 'Decline.',
          nextNodeId: 'root'
        }
      ]
    },
    'courier_done': {
      id: 'courier_done',
      text: "'Smooth work. Keep this up and I can connect you to bigger players.'",
      options: [
        { text: 'I am listening.', nextNodeId: 'root' }
      ]
    },
    'fixer_pact_blocked': {
      id: 'fixer_pact_blocked',
      text: "'You shook hands with Okon? Then you don't get my fast lanes and he doesn't get my poison. Pick a side and live with it.'",
      options: [
        { text: 'Fair enough.', nextNodeId: 'root' }
      ]
    },
    'smuggling_convoy': {
      id: 'smuggling_convoy',
      text: "'Now we're talking. A convoy moves tonight under all that press noise. Big upside, filthy downside.'",
      options: [
        {
          text: 'Move the convoy (+$500, +Market Window, +Exposure).',
          action: (s) => ({
            worldEffects: extendWorldEffect(s, 'marketInsight', 18),
            meters: {
              ...s.meters,
              exposure: Math.min(100, s.meters.exposure + 10),
              influence: Math.min(100, s.meters.influence + 4)
            },
            money: s.money + 500
          }),
          nextNodeId: 'root'
        },
        {
          text: 'Too hot for me.',
          nextNodeId: 'root'
        }
      ]
    },
    'market_rumors': {
      id: 'market_rumors',
      text: "'Prices jump when inspectors get nervous. If your papers are clean, export during panic windows.'",
      options: [
        {
          text: 'Use the tip (+small trust and influence, +Market Window 12h).',
          action: (s) => ({
            worldEffects: extendWorldEffect(s, 'marketInsight', 12),
            npcs: {
              ...s.npcs,
              fixer: {
                ...s.npcs.fixer,
                trustLevel: Math.min(100, s.npcs.fixer.trustLevel + 4)
              }
            },
            meters: {
              ...s.meters,
              influence: Math.min(100, s.meters.influence + 2)
            }
          }),
          nextNodeId: 'root'
        }
      ]
    }
  }
};

export const OFFICE_ITEMS: Record<string, OfficeItem> = {
  'vane_ledger': {
    id: 'vane_ledger',
    name: 'Vane\'s Personal Ledger',
    description: 'A dusty ledger hidden under a stack of Form 99-Zs. It contains notes about "Regional Director visits" and "promotion criteria".',
    type: 'CLUE',
    icon: 'BookOpen',
    position: { x: 20, y: 30 }
  },
  'trash_can_vane': {
    id: 'trash_can_vane',
    name: 'Overflowing Trash Can',
    description: 'Shredded documents and coffee stains. Something catches your eye.',
    type: 'DIRT',
    icon: 'Trash2',
    position: { x: 80, y: 70 }
  },
  'krell_blueprints': {
    id: 'krell_blueprints',
    name: 'Sector 4 Blueprints',
    description: 'Old, yellowed blueprints. Some sections are marked with red "X"s that were later erased.',
    type: 'CLUE',
    icon: 'Map',
    position: { x: 50, y: 40 }
  },
  'sal_cigar_box': {
    id: 'sal_cigar_box',
    name: 'Empty Cigar Box',
    description: 'An expensive-looking box from the "Upper Spires". It smells of luxury.',
    type: 'CLUE',
    icon: 'Box',
    position: { x: 30, y: 60 }
  }
};

const CITY_CELL_SIZE = 14;
const CITY_GRID_WIDTH = 11;
const CITY_GRID_HEIGHT = 11;
const CITY_ORIGIN = {
  x: WORLD_CENTER - Math.floor((CITY_GRID_WIDTH - 1) * CITY_CELL_SIZE / 2),
  y: WORLD_CENTER - Math.floor((CITY_GRID_HEIGHT - 1) * CITY_CELL_SIZE / 2),
};

type CityCell = { x: number; y: number };

const toWorldFromCityCell = ({ x, y }: CityCell): WorldPosition => ({
  x: CITY_ORIGIN.x + x * CITY_CELL_SIZE,
  y: CITY_ORIGIN.y + y * CITY_CELL_SIZE,
});

const createCityLine = (start: CityCell, end: CityCell): CityCell[] => {
  const dx = Math.sign(end.x - start.x);
  const dy = Math.sign(end.y - start.y);
  const steps = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
  return Array.from({ length: steps + 1 }, (_, index) => ({
    x: start.x + dx * index,
    y: start.y + dy * index,
  }));
};

const createPlacedTiles = (
  prefix: string,
  type: 'ROAD' | 'SIDEWALK',
  cells: CityCell[],
  voxels: { id: number, x: number, y: number, z: number, c: string }[],
  occupiedCells: Set<string>,
  discovered: boolean = true
): Record<string, Building> => {
  const tiles: Record<string, Building> = {};

  cells.forEach((cell, index) => {
    const key = `${cell.x},${cell.y}`;
    if (occupiedCells.has(key)) {
      throw new Error(`City layout overlap at cell ${key} while placing ${prefix}`);
    }
    occupiedCells.add(key);

    const id = `${prefix}_${index}`;
    tiles[id] = {
      id,
      npcId: 'none',
      name: type === 'ROAD' ? 'Road' : 'Sidewalk',
      pos: toWorldFromCityCell(cell),
      type,
      isDiscovered: discovered,
      voxels,
    };
  });

  return tiles;
};

const createPlacedBuilding = (
  cell: CityCell,
  building: Omit<Building, 'pos'>,
  occupiedCells: Set<string>
): Building => {
  const key = `${cell.x},${cell.y}`;
  if (occupiedCells.has(key)) {
    throw new Error(`City layout overlap at cell ${key} while placing ${building.id}`);
  }
  occupiedCells.add(key);

  return {
    ...building,
    pos: toWorldFromCityCell(cell),
  };
};

const getLayoutBounds = (buildings: Record<string, Building>) => {
  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  Object.values(buildings).forEach((building) => {
    if (building.voxels && building.voxels.length > 0) {
      building.voxels.forEach((voxel) => {
        bounds.minX = Math.min(bounds.minX, building.pos.x + voxel.x);
        bounds.maxX = Math.max(bounds.maxX, building.pos.x + voxel.x);
        bounds.minY = Math.min(bounds.minY, building.pos.y + voxel.y);
        bounds.maxY = Math.max(bounds.maxY, building.pos.y + voxel.y);
      });
      return;
    }

    bounds.minX = Math.min(bounds.minX, building.pos.x);
    bounds.maxX = Math.max(bounds.maxX, building.pos.x);
    bounds.minY = Math.min(bounds.minY, building.pos.y);
    bounds.maxY = Math.max(bounds.maxY, building.pos.y);
  });

  return bounds;
};

const normalizeWorldLayout = (buildings: Record<string, Building>) => {
  const WORLD_PADDING = 16;
  const bounds = getLayoutBounds(buildings);
  const currentCenterX = (bounds.minX + bounds.maxX) / 2;
  const currentCenterY = (bounds.minY + bounds.maxY) / 2;

  let offsetX = Math.round(WORLD_CENTER - currentCenterX);
  let offsetY = Math.round(WORLD_CENTER - currentCenterY);

  const shiftedMinX = bounds.minX + offsetX;
  const shiftedMaxX = bounds.maxX + offsetX;
  const shiftedMinY = bounds.minY + offsetY;
  const shiftedMaxY = bounds.maxY + offsetY;

  if (shiftedMinX < WORLD_PADDING) offsetX += WORLD_PADDING - shiftedMinX;
  if (shiftedMaxX > WORLD_SIZE - 1 - WORLD_PADDING) offsetX -= shiftedMaxX - (WORLD_SIZE - 1 - WORLD_PADDING);
  if (shiftedMinY < WORLD_PADDING) offsetY += WORLD_PADDING - shiftedMinY;
  if (shiftedMaxY > WORLD_SIZE - 1 - WORLD_PADDING) offsetY -= shiftedMaxY - (WORLD_SIZE - 1 - WORLD_PADDING);

  return Object.fromEntries(
    Object.entries(buildings).map(([id, building]) => [
      id,
      {
        ...building,
        pos: {
          x: building.pos.x + offsetX,
          y: building.pos.y + offsetY,
        },
      },
    ])
  ) as Record<string, Building>;
};

const occupiedCityCells = new Set<string>();

// ── Road network ─────────────────────────────────────────────────────
// Two main roads form a connected cross through the centre of the grid.
//   Main Avenue  (NS) : x = 5, y = 1 → 9   (9 tiles, vertical)
//   Cross Street (EW) : y = 5, x = 1 → 9   (9 tiles, horizontal)
// An additional north lane connects the upper buildings.
//   North Lane   (EW) : y = 8, x = 2 → 8   (7 tiles, horizontal)
// Intersections use a dedicated cross tile whose centre-lines point in
// both directions so the lane markings match the connecting segments.

const cityStreets: Record<string, Building> = {
  // Main Avenue extends from bottom to top of grid (NS tiles)
  ...createPlacedTiles(
    'main_ave_s',
    'ROAD',
    createCityLine({ x: 5, y: 0 }, { x: 5, y: 4 }),
    ROAD_NS_VOXELS,
    occupiedCityCells
  ),
  // Main Avenue / Cross Street intersection
  ...createPlacedTiles(
    'main_cross',
    'ROAD',
    [{ x: 5, y: 5 }],
    ROAD_CROSS_VOXELS,
    occupiedCityCells
  ),
  // Main Avenue between the two EW roads (NS tiles)
  ...createPlacedTiles(
    'main_ave_m',
    'ROAD',
    createCityLine({ x: 5, y: 6 }, { x: 5, y: 7 }),
    ROAD_NS_VOXELS,
    occupiedCityCells
  ),
  // Main Avenue / North Lane intersection
  ...createPlacedTiles(
    'main_north',
    'ROAD',
    [{ x: 5, y: 8 }],
    ROAD_CROSS_VOXELS,
    occupiedCityCells
  ),
  // Main Avenue north end (NS tile – stops at y=9 because mine entrance is at y=10)
  ...createPlacedTiles(
    'main_ave_n',
    'ROAD',
    createCityLine({ x: 5, y: 9 }, { x: 5, y: 9 }),
    ROAD_NS_VOXELS,
    occupiedCityCells
  ),
  // Cross Street extends from left edge to right edge (EW tiles)
  ...createPlacedTiles(
    'cross_st_w',
    'ROAD',
    createCityLine({ x: 0, y: 5 }, { x: 4, y: 5 }),
    ROAD_EW_VOXELS,
    occupiedCityCells
  ),
  // Cross Street east of intersection (EW tiles)
  ...createPlacedTiles(
    'cross_st_e',
    'ROAD',
    createCityLine({ x: 6, y: 5 }, { x: 10, y: 5 }),
    ROAD_EW_VOXELS,
    occupiedCityCells
  ),
  // North Lane extends from left edge to right edge (EW tiles)
  ...createPlacedTiles(
    'north_ln_w',
    'ROAD',
    createCityLine({ x: 0, y: 8 }, { x: 4, y: 8 }),
    ROAD_EW_VOXELS,
    occupiedCityCells
  ),
  // North Lane east of intersection (EW tiles)
  ...createPlacedTiles(
    'north_ln_e',
    'ROAD',
    createCityLine({ x: 6, y: 8 }, { x: 10, y: 8 }),
    ROAD_EW_VOXELS,
    occupiedCityCells
  ),
};

// ── Building placement ───────────────────────────────────────────────
// Buildings are positioned on the 11 × 11 city grid so that every
// structure sits directly adjacent to at least one road cell.
// Roads now extend to the grid edges for a more complete feel.
// (Y increases upward in the diagram; top row = y 10.)
//
//    0  1  2  3  4  5  6  7  8  9  10
// 10 .  .  .  .  .  ME .  .  .  .  .
//  9 .  .  .  PH .  R  .  .  .  FD .
//  8 R  R  R  R  R  +  R  R  R  R  R
//  7 .  .  .  CP .  R  .  UH .  .  .
//  6 .  .  .  .  .  R  .  .  .  .  .
//  5 R  R  R  R  R  +  R  R  R  R  R
//  4 .  .  HB .  .  R  .  LO .  .  .
//  3 .  CH .  .  .  R  .  .  .  .  .
//  2 .  .  .  .  .  R  .  .  IH .  .
//  1 .  .  .  .  .  R  .  .  .  .  .
//  0 .  .  .  .  .  R  .  .  .  .  .

const baseBuildings: Record<string, Building> = {
  player_home: createPlacedBuilding(
    { x: 3, y: 9 },
    {
      id: 'player_home',
      npcId: 'none',
      name: 'Your House',
      type: 'HOME',
      isDiscovered: true,
      voxels: PLAYER_HOUSE_VOXELS,
    },
    occupiedCityCells
  ),
  licensing_office: createPlacedBuilding(
    { x: 7, y: 4 },
    {
      id: 'licensing_office',
      npcId: 'licensing',
      name: 'Bureau of Extraction',
      type: 'OFFICE',
      isDiscovered: false,
      explorationItems: ['vane_ledger', 'trash_can_vane'],
      voxels: LICENSING_OFFICE_VOXELS,
    },
    occupiedCityCells
  ),
  union_hall: createPlacedBuilding(
    { x: 7, y: 7 },
    {
      id: 'union_hall',
      npcId: 'union',
      name: 'The Gilded Pick',
      type: 'PUB',
      isDiscovered: false,
      explorationItems: ['sal_cigar_box'],
      voxels: UNION_HALL_VOXELS,
    },
    occupiedCityCells
  ),
  inspector_hq: createPlacedBuilding(
    { x: 8, y: 2 },
    {
      id: 'inspector_hq',
      npcId: 'inspector',
      name: 'Compliance Tower',
      type: 'OFFICE',
      isDiscovered: false,
      explorationItems: ['krell_blueprints'],
      voxels: INSPECTOR_HQ_VOXELS,
    },
    occupiedCityCells
  ),
  fixer_den: createPlacedBuilding(
    { x: 9, y: 9 },
    {
      id: 'fixer_den',
      npcId: 'fixer',
      name: 'Slink\'s Salvage',
      type: 'HOME',
      isDiscovered: false,
      voxels: FIXER_DEN_VOXELS,
    },
    occupiedCityCells
  ),
  hotline_booth: createPlacedBuilding(
    { x: 2, y: 4 },
    {
      id: 'hotline_booth',
      npcId: 'journalist',
      name: 'Hotline Booth',
      type: 'HOTLINE',
      isDiscovered: true,
      voxels: HOTLINE_BOOTH_VOXELS,
    },
    occupiedCityCells
  ),
  chief_hut: createPlacedBuilding(
    { x: 1, y: 3 },
    {
      id: 'chief_hut',
      npcId: 'chief',
      name: 'Chief\'s Hut',
      type: 'HOME',
      isDiscovered: true,
      voxels: CHIEF_HUT_VOXELS,
    },
    occupiedCityCells
  ),
  mine_entrance: createPlacedBuilding(
    { x: 5, y: 10 },
    {
      id: 'mine_entrance',
      npcId: 'none',
      name: 'Sector 4 Entrance',
      type: 'MINE_ENTRANCE',
      isDiscovered: true,
    },
    occupiedCityCells
  ),
  central_park: createPlacedBuilding(
    { x: 3, y: 7 },
    {
      id: 'central_park',
      npcId: 'none',
      name: 'Dusty Palms Park',
      type: 'PARK',
      isDiscovered: true,
      description: 'The only place with actual (dying) trees.',
      voxels: PARK_VOXELS,
    },
    occupiedCityCells
  ),

  // ── Extra buildings ────────────────────────────────────────────────
  house_south_a: createPlacedBuilding(
    { x: 3, y: 1 },
    {
      id: 'house_south_a',
      npcId: 'none',
      name: 'Residential Unit A',
      type: 'HOME',
      isDiscovered: true,
      voxels: GENERIC_HOUSE_A_VOXELS,
    },
    occupiedCityCells
  ),
  house_south_b: createPlacedBuilding(
    { x: 7, y: 1 },
    {
      id: 'house_south_b',
      npcId: 'none',
      name: 'Residential Unit B',
      type: 'HOME',
      isDiscovered: true,
      voxels: GENERIC_HOUSE_B_VOXELS,
    },
    occupiedCityCells
  ),
  office_east: createPlacedBuilding(
    { x: 9, y: 3 },
    {
      id: 'office_east',
      npcId: 'none',
      name: 'District Office',
      type: 'OFFICE',
      isDiscovered: true,
      voxels: GENERIC_OFFICE_VOXELS,
    },
    occupiedCityCells
  ),
  factory_west: createPlacedBuilding(
    { x: 1, y: 6 },
    {
      id: 'factory_west',
      npcId: 'none',
      name: 'Processing Plant',
      type: 'OFFICE',
      isDiscovered: true,
      voxels: FACTORY_VOXELS,
    },
    occupiedCityCells
  ),
  house_north_a: createPlacedBuilding(
    { x: 7, y: 9 },
    {
      id: 'house_north_a',
      npcId: 'none',
      name: 'Foreman\'s Quarters',
      type: 'HOME',
      isDiscovered: true,
      voxels: GENERIC_HOUSE_A_VOXELS,
    },
    occupiedCityCells
  ),
  house_west_c: createPlacedBuilding(
    { x: 1, y: 9 },
    {
      id: 'house_west_c',
      npcId: 'none',
      name: 'Worker Housing',
      type: 'HOME',
      isDiscovered: true,
      voxels: GENERIC_HOUSE_B_VOXELS,
    },
    occupiedCityCells
  ),

  // ── NPC residential houses ─────────────────────────────────────────
  house_nw_d: createPlacedBuilding(
    { x: 4, y: 9 },
    {
      id: 'house_nw_d',
      npcId: 'resident_a',
      name: 'Dunn Residence',
      type: 'HOME',
      isDiscovered: true,
      voxels: GENERIC_HOUSE_C_VOXELS,
    },
    occupiedCityCells
  ),
  house_ne_c: createPlacedBuilding(
    { x: 6, y: 9 },
    {
      id: 'house_ne_c',
      npcId: 'resident_b',
      name: 'Holt Residence',
      type: 'HOME',
      isDiscovered: true,
      voxels: GENERIC_HOUSE_D_VOXELS,
    },
    occupiedCityCells
  ),
  house_sw_e: createPlacedBuilding(
    { x: 4, y: 3 },
    {
      id: 'house_sw_e',
      npcId: 'resident_c',
      name: 'Sato Residence',
      type: 'HOME',
      isDiscovered: true,
      voxels: GENERIC_HOUSE_C_VOXELS,
    },
    occupiedCityCells
  ),
  house_east_f: createPlacedBuilding(
    { x: 9, y: 7 },
    {
      id: 'house_east_f',
      npcId: 'resident_d',
      name: 'Bray Residence',
      type: 'HOME',
      isDiscovered: true,
      voxels: GENERIC_HOUSE_D_VOXELS,
    },
    occupiedCityCells
  ),

  // ── Foliage / green spaces ─────────────────────────────────────────
  tree_sw_1: createPlacedBuilding(
    { x: 1, y: 1 },
    {
      id: 'tree_sw_1',
      npcId: 'none',
      name: 'Dusty Oak',
      type: 'PARK',
      isDiscovered: true,
      voxels: TREE_A_VOXELS,
    },
    occupiedCityCells
  ),
  tree_se_1: createPlacedBuilding(
    { x: 9, y: 1 },
    {
      id: 'tree_se_1',
      npcId: 'none',
      name: 'Roadside Pine',
      type: 'PARK',
      isDiscovered: true,
      voxels: TREE_B_VOXELS,
    },
    occupiedCityCells
  ),
  garden_east: createPlacedBuilding(
    { x: 9, y: 6 },
    {
      id: 'garden_east',
      npcId: 'none',
      name: 'East Gardens',
      type: 'PARK',
      isDiscovered: true,
      voxels: GARDEN_VOXELS,
    },
    occupiedCityCells
  ),
  tree_ne_1: createPlacedBuilding(
    { x: 9, y: 10 },
    {
      id: 'tree_ne_1',
      npcId: 'none',
      name: 'Northern Pine',
      type: 'PARK',
      isDiscovered: true,
      voxels: TREE_A_VOXELS,
    },
    occupiedCityCells
  ),
  bush_w_1: createPlacedBuilding(
    { x: 1, y: 4 },
    {
      id: 'bush_w_1',
      npcId: 'none',
      name: 'Wild Brush',
      type: 'PARK',
      isDiscovered: true,
      voxels: BUSH_VOXELS,
    },
    occupiedCityCells
  ),
  tree_nw_1: createPlacedBuilding(
    { x: 1, y: 10 },
    {
      id: 'tree_nw_1',
      npcId: 'none',
      name: 'Withered Tree',
      type: 'PARK',
      isDiscovered: true,
      voxels: TREE_B_VOXELS,
    },
    occupiedCityCells
  ),
  garden_center: createPlacedBuilding(
    { x: 3, y: 4 },
    {
      id: 'garden_center',
      npcId: 'none',
      name: 'Median Garden',
      type: 'PARK',
      isDiscovered: true,
      voxels: GARDEN_VOXELS,
    },
    occupiedCityCells
  ),
  tree_mid_east: createPlacedBuilding(
    { x: 7, y: 6 },
    {
      id: 'tree_mid_east',
      npcId: 'none',
      name: 'Lone Oak',
      type: 'PARK',
      isDiscovered: true,
      voxels: TREE_A_VOXELS,
    },
    occupiedCityCells
  ),

  ...cityStreets,

  // ── Imported voxel model buildings ─────────────────────────────────
  asset_tower_a: createPlacedBuilding(
    { x: 0, y: 2 },
    {
      id: 'asset_tower_a',
      npcId: 'none',
      name: 'Aureus Tower',
      type: 'LANDMARK',
      isDiscovered: true,
      voxels: ASSET_BUILDING_A_VOXELS,
    },
    occupiedCityCells
  ),
  asset_block_b: createPlacedBuilding(
    { x: 2, y: 6 },
    {
      id: 'asset_block_b',
      npcId: 'none',
      name: 'Commerce Block',
      type: 'OFFICE',
      isDiscovered: true,
      voxels: ASSET_BUILDING_B_VOXELS,
    },
    occupiedCityCells
  ),
  asset_hall_c: createPlacedBuilding(
    { x: 8, y: 4 },
    {
      id: 'asset_hall_c',
      npcId: 'none',
      name: 'Borough Hall',
      type: 'LANDMARK',
      isDiscovered: true,
      voxels: ASSET_BUILDING_C_VOXELS,
    },
    occupiedCityCells
  ),
  asset_depot_d: createPlacedBuilding(
    { x: 10, y: 4 },
    {
      id: 'asset_depot_d',
      npcId: 'none',
      name: 'Supply Depot',
      type: 'INDUSTRIAL',
      isDiscovered: true,
      voxels: ASSET_BUILDING_D_VOXELS,
    },
    occupiedCityCells
  ),
  asset_quarters_e: createPlacedBuilding(
    { x: 6, y: 3 },
    {
      id: 'asset_quarters_e',
      npcId: 'none',
      name: 'Staff Quarters',
      type: 'HOME',
      isDiscovered: true,
      voxels: ASSET_BUILDING_E_VOXELS,
    },
    occupiedCityCells
  ),
};

export const BUILDINGS = normalizeWorldLayout(baseBuildings);
