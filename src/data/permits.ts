import { Permit } from '../types';

export const INITIAL_PERMITS: Record<string, Permit> = {
  'extraction-intent': {
    id: 'extraction-intent',
    name: 'Extraction Intent (Form 17-B)',
    formNumber: '17-B',
    description: 'Preliminary declaration of intent to extract resources from the crust. Required for all mining operations.',
    cost: 50,
    status: 'LOCKED',
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
