/**
 * @module relationshipState
 * Derives and updates lightweight NPC relationship states from trust, leverage,
 * and story flags.  These states are used to branch dialogue without
 * exploding branching complexity.
 */
import { GameState, NPC, NpcRelationshipState } from '../../types';
import { hasStoryFlag } from './storyFlags';

/**
 * Derive the current relationship state for a single NPC based on the
 * player's current GameState (trust, leverage, story flags).
 */
export const deriveRelationshipState = (
  npcId: string,
  npc: NPC,
  state: GameState
): NpcRelationshipState => {
  switch (npcId) {
    case 'licensing': {
      // Vane — The System
      if (hasStoryFlag(state, 'vane_exposed')) return 'opposed';
      if (hasStoryFlag(state, 'vane_backchannel') && npc.trustLevel >= 60) return 'complicit';
      if (npc.trustLevel >= 50 && npc.leverage >= 20) return 'aligned';
      return 'neutral';
    }
    case 'inspector': {
      // Krell — The Law
      if (hasStoryFlag(state, 'inspector_blacklist')) return 'targeting';
      if (hasStoryFlag(state, 'inspector_deputized') || npc.trustLevel >= 50) return 'watching';
      return 'neutral';
    }
    case 'fixer': {
      // Slink — The Chaos
      if (hasStoryFlag(state, 'fixer_smuggling_tie') && npc.trustLevel >= 50) return 'dependent';
      if (npc.trustLevel >= 30) return 'friendly';
      return 'neutral';
    }
    case 'journalist': {
      // Vox — The Power
      if (hasStoryFlag(state, 'vox_exclusive') || hasStoryFlag(state, 'vox_embargo')) return 'invested';
      if (npc.trustLevel >= 30 || state.dirtItems.length > 0) return 'interested';
      return 'neutral';
    }
    case 'chief': {
      // Okon — The Conscience
      if (hasStoryFlag(state, 'community_pact') && npc.trustLevel >= 50) return 'supportive';
      if (
        hasStoryFlag(state, 'fixer_smuggling_tie') &&
        !hasStoryFlag(state, 'community_pact')
      ) return 'disillusioned';
      return 'neutral';
    }
    default:
      return 'neutral';
  }
};

/**
 * Recompute all NPC relationship states and return an updated npcs record.
 * Call this after any state change that might shift a relationship
 * (trust change, leverage change, story flag set).
 */
export const refreshAllRelationshipStates = (
  state: GameState
): Record<string, NPC> => {
  const updated: Record<string, NPC> = {};
  for (const [id, npc] of Object.entries(state.npcs)) {
    const newState = deriveRelationshipState(id, npc, state);
    updated[id] = newState !== npc.relationshipState
      ? { ...npc, relationshipState: newState }
      : npc;
  }
  return updated;
};

/** Human-readable labels for relationship state transitions. */
const RELATIONSHIP_STATE_LABELS: Record<NpcRelationshipState, string> = {
  neutral: 'Neutral',
  aligned: 'Aligned',
  complicit: 'Complicit',
  opposed: 'Opposed',
  watching: 'Watching',
  targeting: 'Targeting',
  friendly: 'Friendly',
  dependent: 'Dependent',
  interested: 'Interested',
  invested: 'Invested',
  supportive: 'Supportive',
  disillusioned: 'Disillusioned',
};

/** A single NPC relationship state transition. */
export interface RelationshipStateChange {
  npcId: string;
  npcName: string;
  from: NpcRelationshipState;
  to: NpcRelationshipState;
}

/**
 * Compare old and new NPC records and return descriptions of any
 * relationship-state transitions.  Pure; no side-effects.
 */
export const detectRelationshipStateChanges = (
  oldNpcs: Record<string, NPC>,
  newNpcs: Record<string, NPC>,
): RelationshipStateChange[] => {
  const changes: RelationshipStateChange[] = [];
  for (const [id, newNpc] of Object.entries(newNpcs)) {
    const oldNpc = oldNpcs[id];
    if (!oldNpc) continue;
    if (oldNpc.relationshipState !== newNpc.relationshipState) {
      changes.push({
        npcId: id,
        npcName: newNpc.name,
        from: oldNpc.relationshipState,
        to: newNpc.relationshipState,
      });
    }
  }
  return changes;
};

/**
 * Build a single notification summarising relationship state changes,
 * or `null` if no transitions occurred.
 */
export const buildRelationshipChangeNotification = (
  changes: RelationshipStateChange[],
): { title: string; msg: string } | null => {
  if (changes.length === 0) return null;
  if (changes.length === 1) {
    const c = changes[0];
    return {
      title: `${c.npcName} — ${RELATIONSHIP_STATE_LABELS[c.to]}`,
      msg: `Your standing with ${c.npcName} shifted from ${RELATIONSHIP_STATE_LABELS[c.from]} to ${RELATIONSHIP_STATE_LABELS[c.to]}.`,
    };
  }
  const names = changes.map(c => c.npcName).join(', ');
  return {
    title: 'Relationships Shifted',
    msg: `Your standing changed with ${names}.`,
  };
};

/**
 * Get reactive dialogue text based on the NPC's relationship state
 * and the player's alignment with other factions.
 * This implements the micro-conflict loop (Step 4).
 */
export const getRelationshipReactiveText = (
  npc: NPC,
  state: GameState
): string | null => {
  const rs = npc.relationshipState;

  switch (npc.id) {
    case 'licensing': {
      // Vane reacts to player leaning Fixer
      if (state.npcs['fixer']?.relationshipState === 'dependent') {
        if (rs === 'neutral' || rs === 'aligned') {
          return '"I hear you\'ve been spending time at Slink\'s den. Interesting choice. I process all kinds of paperwork… but some files have a way of disappearing."';
        }
      }
      if (rs === 'aligned') {
        return '"You file the right forms, you pay the right fees, you ask the right questions. I appreciate a professional."';
      }
      if (rs === 'complicit') {
        return '"We understand each other now. That\'s how a system works — smoothly, quietly, without anyone asking questions that don\'t need answers."';
      }
      if (rs === 'opposed') {
        return '"You burned that bridge yourself. Don\'t expect any favours from this office."';
      }
      break;
    }
    case 'inspector': {
      // Krell becomes harsher if player leans Fixer
      if (state.npcs['fixer']?.relationshipState === 'friendly' ||
          state.npcs['fixer']?.relationshipState === 'dependent') {
        return '"Your association with known market irregularities has been noted. I\'d advise you to choose your allies more carefully."';
      }
      if (rs === 'watching') {
        return '"You have my attention. That can be a good thing — or a very bad one. Depends on what I see next."';
      }
      if (rs === 'targeting') {
        return '"Every form you file, every step you take — I\'m watching. One mistake is all I need."';
      }
      break;
    }
    case 'fixer': {
      // Fixer becomes aggressive if player leans Community
      if (state.npcs['chief']?.relationshipState === 'supportive') {
        return '"Playing saviour now? Funny. You said no to me yesterday. Today you\'re doing the same thing… just slower."';
      }
      if (rs === 'friendly') {
        return '"You\'re learning the rhythm. Stick with me and this town opens up in ways the Bureau never shows you."';
      }
      if (rs === 'dependent') {
        return '"We\'re in deep now, you and me. Not the kind of partnership you walk away from."';
      }
      break;
    }
    case 'journalist': {
      // Vox becomes dismissive if player leans Community
      if (state.npcs['chief']?.relationshipState === 'supportive' && rs === 'neutral') {
        return '"Grassroots hero? That doesn\'t sell papers. Come back when you have something with teeth."';
      }
      if (rs === 'interested') {
        return '"I\'m listening. You\'ve got the look of someone who stumbles into stories worth printing. Keep talking."';
      }
      if (rs === 'invested') {
        return '"We have a deal. An exclusive. Don\'t forget — I own this story, and if you back out, the next headline is about you."';
      }
      break;
    }
    case 'chief': {
      if (state.npcs['fixer']?.relationshipState === 'dependent') {
        return '"The children are getting sicker, and you\'re running errands for that smuggler. Look me in the eye and tell me that\'s who you are."';
      }
      if (rs === 'supportive') {
        return '"You kept your word. That matters here. The community stands with you."';
      }
      if (rs === 'disillusioned') {
        return '"I wanted to believe in you. But your actions speak louder than promises."';
      }
      break;
    }
  }

  return null;
};
