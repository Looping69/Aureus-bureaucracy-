import { OfficeItem } from '../types';

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
