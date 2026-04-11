import { DialogueNode } from '../types';
import { extendWorldEffect } from '../game/dialogue/worldEffects';
import { addStoryFlag, addStoryFlags, hasStoryFlag } from '../game/dialogue/storyFlags';

export const DIALOGUE_TREES: Record<string, Record<string, DialogueNode>> = {
  'licensing': {
    'root': {
      id: 'root',
      text: "Vane arranges his stamps without looking up. 'You can do this properly… or you can do it quickly. I process both. I just don't remember both the same way.'",
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
          text: "I want it done right.",
          nextNodeId: 'proper_path',
          condition: (s) => s.permits['prospecting-license']?.status === 'AVAILABLE' || s.permits['extraction-intent']?.status === 'REJECTED'
        },
        {
          text: "Make it fast.",
          nextNodeId: 'fast_path',
          condition: (s) => s.permits['prospecting-license']?.status === 'AVAILABLE' || s.permits['extraction-intent']?.status === 'REJECTED'
        },
        {
          text: "What do you mean by that?",
          nextNodeId: 'system_reveal'
        },
        {
          text: "Chief Okon says you buried contamination reports.",
          condition: (s) => hasStoryFlag(s, 'chief_water_quest') && !hasStoryFlag(s, 'vane_exposed'),
          nextNodeId: 'contamination_confrontation'
        }
      ]
    },
    'proper_path': {
      id: 'proper_path',
      text: "'Done right. Good. That means forms, reviews, waiting. The system rewards patience — or at least, it punishes impatience less.'",
      options: [
        {
          text: "I'm here for the Prospecting License.",
          nextNodeId: 'prospecting',
          condition: (s) => s.permits['prospecting-license'].status === 'AVAILABLE'
        },
        {
          text: "I need to discuss my rejected application.",
          nextNodeId: 'rejection_discussion',
          condition: (s) => s.permits['extraction-intent'].status === 'REJECTED'
        },
        { text: "I'll come back when I'm ready.", nextNodeId: 'root' }
      ]
    },
    'fast_path': {
      id: 'fast_path',
      text: "'Fast it is. Nobody audits what nobody files. But fast leaves marks — the kind that show up later, when someone important is asking questions.'",
      options: [
        {
          text: "I need to discuss my rejected application.",
          nextNodeId: 'bribe_hint',
          condition: (s) => s.permits['extraction-intent'].status === 'REJECTED'
        },
        {
          text: "Show me how the real system works.",
          action: (s) => ({
            meters: {
              ...s.meters,
              exposure: Math.min(100, s.meters.exposure + 2)
            }
          }),
          nextNodeId: 'system_reveal'
        }
      ]
    },
    'system_reveal': {
      id: 'system_reveal',
      text: "'Every permit has two paths. The one in the binder, and the one in the drawer. The drawer is faster, quieter, and costs you something you won't notice until later. That's how stability works — small compromises, stacked until they hold everything up.'",
      options: [
        {
          text: "That sounds like corruption.",
          action: (s) => ({
            npcs: {
              ...s.npcs,
              'licensing': { ...s.npcs['licensing'], trustLevel: Math.max(0, s.npcs['licensing'].trustLevel - 3) }
            }
          }),
          nextNodeId: 'corruption_pushback'
        },
        {
          text: "I understand. Stability has a price.",
          action: (s) => ({
            npcs: {
              ...s.npcs,
              'licensing': { ...s.npcs['licensing'], trustLevel: Math.min(100, s.npcs['licensing'].trustLevel + 8) }
            }
          }),
          nextNodeId: 'aligned_response'
        }
      ]
    },
    'corruption_pushback': {
      id: 'corruption_pushback',
      text: "'Call it what you like. But when your operation needs a signature by end of day, you'll be back. And the price won't have changed — only your willingness to pay it.'",
      options: [
        { text: "We'll see.", nextNodeId: 'root' }
      ]
    },
    'aligned_response': {
      id: 'aligned_response',
      text: "He finally looks up. A thin, knowing smile. 'Now you're speaking my language. We'll do well together — as long as you remember who holds the stamps.'",
      options: [
        { text: "I won't forget.", nextNodeId: 'root' }
      ]
    },
    'tutorial_intro': {
      id: 'tutorial_intro',
      text: "'New arrival. Here's how this works: Form 17-B gets you digging rights. Fill it correctly and I process it. Fill it wrong, and I process it anyway — into the rejection pile. Your choice.'",
      options: [
        { text: "I'll get right on it.", nextNodeId: 'root' }
      ]
    },
    'rejection_discussion': {
      id: 'rejection_discussion',
      text: "'The 17-B? Rejected for 'Excessive Hopefulness'. Don't look at me like that — I didn't make the rules. I just enforce them. Selectively.'",
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
      text: "'Appeals require Form 99-Z, which is currently out of print. Come back in six to eight months.' He straightens a perfectly straight stack of papers.",
      options: [
        { text: "I don't have six months.", nextNodeId: 'bribe_hint' }
      ]
    },
    'bribe_hint': {
      id: 'bribe_hint',
      text: "'Time is a luxury, isn't it? Just like... recognition. The Regional Director is visiting soon. He values initiative — and so do I, when it's directed my way.'",
      options: [
        {
          text: "I see. Initiative. [Insight]",
          action: (s) => ({
            ...(s.tutorialStep === 6 && { tutorialStep: 7 }),
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
            ...(s.tutorialStep === 7 && { tutorialStep: 8 }),
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
            ...(s.tutorialStep === 7 && { tutorialStep: 8 }),
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
    },
    'vane_signature_moment': {
      id: 'vane_signature_moment',
      text: "Vane slides a folder across the desk. Inside, you see your name on a violation report — one that should have ended your operation. He strikes a match and holds it to the corner of the page. 'This never existed. And neither does the favour you now owe me.'",
      options: [
        {
          text: "…Thank you.",
          action: (s) => ({
            npcs: {
              ...s.npcs,
              licensing: { ...s.npcs.licensing, trustLevel: Math.min(100, s.npcs.licensing.trustLevel + 15), relationshipState: 'complicit' as const }
            },
            meters: {
              ...s.meters,
              exposure: Math.max(0, s.meters.exposure - 10)
            }
          }),
          nextNodeId: 'root'
        },
        {
          text: "I don't want to owe you anything.",
          action: (s) => ({
            npcs: {
              ...s.npcs,
              licensing: { ...s.npcs.licensing, trustLevel: Math.max(0, s.npcs.licensing.trustLevel - 10) }
            }
          }),
          nextNodeId: 'root'
        }
      ]
    }
  },
  'chief': {
    'root': {
      id: 'root',
      text: "Chief Okon watches you approach. His eyes carry the weight of generations. 'Systems come and go, stranger. People remain. What matters to you — the machine, or the lives it grinds through?'",
      options: [
        {
          text: "I'm just looking for work.",
          nextNodeId: 'work'
        },
        {
          text: "The people. I want to help. [Trust 30+]",
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
    },
    'okon_signature_moment': {
      id: 'okon_signature_moment',
      text: "Chief Okon stands before the village assembly. He points at you. 'This one came from outside. They had every reason to take and leave. Instead they brought medicine, fought for clean water, and stood with us when nobody else would.' He pauses. 'But I must ask you all — and I must ask you, outsider — are you here for us, or for what we can give you?' The village watches. Waiting.",
      options: [
        {
          text: "I'm here for you. No strings.",
          action: (s) => ({
            npcs: {
              ...s.npcs,
              chief: { ...s.npcs.chief, trustLevel: Math.min(100, s.npcs.chief.trustLevel + 20), relationshipState: 'supportive' as const }
            },
            meters: {
              ...s.meters,
              trust: Math.min(100, s.meters.trust + 10)
            }
          }),
          nextNodeId: 'root'
        },
        {
          text: "I won't pretend I don't benefit. But the help is real.",
          action: (s) => ({
            npcs: {
              ...s.npcs,
              chief: { ...s.npcs.chief, trustLevel: Math.min(100, s.npcs.chief.trustLevel + 12) }
            },
            meters: {
              ...s.meters,
              trust: Math.min(100, s.meters.trust + 5),
              influence: Math.min(100, s.meters.influence + 3)
            }
          }),
          nextNodeId: 'root'
        }
      ]
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
      text: "Elena Vox closes her tablet. 'Information is power. The only question is who holds it — and what they're willing to do with it. So. What have you got?'",
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
          text: 'Check on the embargo status.',
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
      text: "'This is the deal that locks everything else out. You give me first rights, and I blow this sector wide open. No more backchannels, no more quiet deals. After this, every ending but mine is closed.'",
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
              journalist: { ...s.npcs.journalist, trustLevel: Math.min(100, s.npcs.journalist.trustLevel + 15), relationshipState: 'invested' as const },
              licensing: { ...s.npcs.licensing, trustLevel: Math.max(0, s.npcs.licensing.trustLevel - 25) }
            }
          }),
          nextNodeId: 'root'
        },
        {
          text: "That's too permanent. I need options.",
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
      text: "Inspector Krell doesn't sit. He stands at his desk like a sentry. 'Every operation in this sector exists because I allow it. What business do you have here?'",
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
          text: "'You know about my fixer contacts.'",
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
      text: "'You want compliance while running Slink's errands? I enforce order regardless of cost. End that association or bring me something that justifies the hypocrisy.'",
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
    },
    'krell_signature_moment': {
      id: 'krell_signature_moment',
      text: "Krell appears at your operation site, unannounced. He inspects every beam, every support, every permit on the wall. Then he tears one down. 'This signature is forged. Section 14-C. Your operation is suspended effective immediately.' He pauses. 'You had potential. But the law doesn't negotiate.'",
      options: [
        {
          text: "You're making a mistake.",
          action: (s) => ({
            meters: {
              ...s.meters,
              exposure: Math.min(100, s.meters.exposure + 12)
            },
            npcs: {
              ...s.npcs,
              inspector: { ...s.npcs.inspector, trustLevel: Math.max(0, s.npcs.inspector.trustLevel - 20), relationshipState: 'targeting' as const }
            }
          }),
          nextNodeId: 'root'
        },
        {
          text: "…You're right. Help me fix this.",
          action: (s) => ({
            npcs: {
              ...s.npcs,
              inspector: { ...s.npcs.inspector, trustLevel: Math.min(100, s.npcs.inspector.trustLevel + 10) }
            }
          }),
          nextNodeId: 'root'
        }
      ]
    }
  },
  'fixer': {
    'root': {
      id: 'root',
      text: "Slink leans against the wall, flipping a coin. 'Everything has a price. The question is whether you're paying it now or later. Most people prefer later — that's where I make my money.'",
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
          text: "'I made a pact with the community.'",
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
    },
    'slink_signature_moment': {
      id: 'slink_signature_moment',
      text: "Your operation is collapsing. Guards at the gate, permits revoked, no way out. Then a truck pulls up — unmarked. Slink steps out, tosses you keys. 'Get in. Questions later.' He saved you instantly. But the manifest in the glove box has your name on a shipment you've never seen. The cost is invisible, and it's already been paid.",
      options: [
        {
          text: "…What did you do?",
          action: (s) => ({
            storyFlags: addStoryFlag(s, 'fixer_smuggling_tie'),
            npcs: {
              ...s.npcs,
              fixer: { ...s.npcs.fixer, trustLevel: Math.min(100, s.npcs.fixer.trustLevel + 15), relationshipState: 'dependent' as const }
            },
            meters: {
              ...s.meters,
              exposure: Math.min(100, s.meters.exposure + 5)
            }
          }),
          nextNodeId: 'root'
        },
        {
          text: "I don't want to know.",
          action: (s) => ({
            storyFlags: addStoryFlag(s, 'fixer_smuggling_tie'),
            npcs: {
              ...s.npcs,
              fixer: { ...s.npcs.fixer, trustLevel: Math.min(100, s.npcs.fixer.trustLevel + 10), relationshipState: 'dependent' as const }
            },
            meters: {
              ...s.meters,
              exposure: Math.min(100, s.meters.exposure + 8)
            }
          }),
          nextNodeId: 'root'
        }
      ]
    }
  }
};
