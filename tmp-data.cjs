"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILDINGS = exports.OFFICE_ITEMS = exports.DIALOGUE_TREES = exports.INITIAL_MINES = exports.WORLD_CENTER = exports.WORLD_SIZE = exports.REJECTION_REASONS = exports.INITIAL_PERMITS = exports.INITIAL_NPCS = exports.generateGrid = void 0;
const worldEffects_1 = require("./game/dialogue/worldEffects");
const storyFlags_1 = require("./game/dialogue/storyFlags");
const voxelData_1 = require("./voxelData");
const voxelConstants_1 = require("./utils/voxelConstants");
const buildings_1 = require("./buildings");
const generateGrid = (width, height, yieldRate = 0.2) => {
    const grid = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const isOre = Math.random() < yieldRate;
            const isRock = !isOre && Math.random() < 0.15;
            const type = isOre ? 'ORE' : (isRock ? 'ROCK' : 'DIRT');
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
exports.generateGrid = generateGrid;
exports.INITIAL_NPCS = {
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
        homeBuildingId: 'licensing_office',
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
        moodShiftType: 'NEUTRAL'
    }
};
exports.INITIAL_PERMITS = {
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
exports.REJECTION_REASONS = [
    "Ink color was 'Excessively Hopeful'.",
    "Margins failed to meet the 1.2mm 'Bureaucratic Anxiety' standard.",
    "Signature looks suspiciously like a cry for help.",
    "Form was submitted during a mandatory 'Silence Appreciation' hour.",
    "The inspector had a bad dream about a mole.",
    "Your ethical compliance score is 'Questionably Sincere'.",
    "Missing 'Appendix G: Proof of Existence'.",
    "The paper weight was 0.5g too light, suggesting a lack of gravitas."
];
exports.WORLD_SIZE = voxelConstants_1.WORLD_SIZE;
exports.WORLD_CENTER = exports.WORLD_SIZE / 2;
exports.INITIAL_MINES = [
    {
        id: 'iron-vein',
        name: 'Iron Vein Outpost',
        location: 'OUTSKIRTS',
        travelTime: 2,
        hasLocals: false,
        yield: 1,
        danger: 10,
        discovered: true,
        grid: (0, exports.generateGrid)(5, 10, 0.3), // 5x10 grid (50 tiles)
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
        chiefId: 'chief-hollow',
        yield: 3,
        danger: 40,
        discovered: false,
        grid: (0, exports.generateGrid)(8, 15, 0.5), // Larger grid
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
        grid: (0, exports.generateGrid)(10, 20, 0.8), // Huge grid
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
exports.DIALOGUE_TREES = {
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
                    condition: (s) => (0, storyFlags_1.hasStoryFlag)(s, 'chief_water_quest') && !(0, storyFlags_1.hasStoryFlag)(s, 'vane_exposed'),
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
                        worldEffects: (0, worldEffects_1.extendWorldEffect)(s, 'bureauPull', 10),
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
                        storyFlags: (0, storyFlags_1.addStoryFlag)(s, 'vane_backchannel'),
                        worldEffects: (0, worldEffects_1.extendWorldEffect)(s, 'bureauPull', 18),
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
                        storyFlags: (0, storyFlags_1.addStoryFlags)(s, 'vane_exposed', 'public_scandal'),
                        worldEffects: (0, worldEffects_1.extendWorldEffect)(s, 'mediaHeat', 24),
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
                    condition: (s) => !(0, storyFlags_1.hasStoryFlag)(s, 'fixer_smuggling_tie') || (0, storyFlags_1.hasStoryFlag)(s, 'community_pact'),
                    nextNodeId: 'help'
                },
                {
                    text: "Let's build a clean-water pact. [Trust 45+]",
                    trustRequired: 45,
                    condition: (s) => !(0, storyFlags_1.hasStoryFlag)(s, 'community_pact') && !(0, storyFlags_1.hasStoryFlag)(s, 'fixer_smuggling_tie'),
                    action: (s) => ({
                        storyFlags: (0, storyFlags_1.addStoryFlag)(s, 'community_pact'),
                        worldEffects: (0, worldEffects_1.extendWorldEffect)(s, 'communityBacking', 24),
                        npcs: {
                            ...s.npcs,
                            chief: { ...s.npcs.chief, trustLevel: Math.min(100, s.npcs.chief.trustLevel + 10) }
                        }
                    }),
                    nextNodeId: 'community_pact'
                },
                {
                    text: "Chief, I know Slink. Hear me out.",
                    condition: (s) => (0, storyFlags_1.hasStoryFlag)(s, 'fixer_smuggling_tie') && !(0, storyFlags_1.hasStoryFlag)(s, 'community_pact'),
                    nextNodeId: 'smuggler_rebuke'
                },
                {
                    text: "I have medicine for the elders. [Give Item]",
                    condition: (s) => s.upgrades.includes('meds'),
                    action: (s) => ({
                        worldEffects: (0, worldEffects_1.extendWorldEffect)(s, 'communityBacking', 18),
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
                        storyFlags: (0, storyFlags_1.addStoryFlag)(s, 'chief_water_quest'),
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
                    condition: (s) => (0, storyFlags_1.hasStoryFlag)(s, 'community_pact') && (0, storyFlags_1.hasStoryFlag)(s, 'chief_water_quest') && !(0, storyFlags_1.hasStoryFlag)(s, 'vane_exposed'),
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
                        worldEffects: (0, worldEffects_1.extendWorldEffect)(s, 'communityBacking', 12),
                        npcs: {
                            ...s.npcs,
                            'union': { ...s.npcs['union'], trustLevel: Math.min(100, s.npcs['union'].trustLevel + 10) }
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
                        storyFlags: (0, storyFlags_1.addStoryFlags)(s, 'vane_exposed', 'public_scandal'),
                        worldEffects: (0, worldEffects_1.extendWorldEffect)(s, 'mediaHeat', 24),
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
                    condition: (s) => s.dirtItems.length > 0 && !(0, storyFlags_1.hasStoryFlag)(s, 'vox_embargo'),
                    nextNodeId: 'dirt_menu'
                },
                {
                    text: "What are you working on right now?",
                    nextNodeId: 'current_story'
                },
                {
                    text: 'Give Vox the exclusive and go loud.',
                    condition: (s) => ((0, storyFlags_1.hasStoryFlag)(s, 'public_scandal') || (0, storyFlags_1.hasStoryFlag)(s, 'vane_exposed')) &&
                        !(0, storyFlags_1.hasStoryFlag)(s, 'vox_embargo') &&
                        !(0, storyFlags_1.hasStoryFlag)(s, 'vox_exclusive') &&
                        !(0, storyFlags_1.hasStoryFlag)(s, 'inspector_deputized'),
                    nextNodeId: 'exclusive_offer'
                },
                {
                    text: 'Buy a week of silence.',
                    condition: (s) => (0, storyFlags_1.hasStoryFlag)(s, 'vane_backchannel') &&
                        !(0, storyFlags_1.hasStoryFlag)(s, 'vox_exclusive') &&
                        !(0, storyFlags_1.hasStoryFlag)(s, 'vox_embargo'),
                    nextNodeId: 'embargo_offer'
                },
                {
                    text: 'Vox is sitting on your embargo.',
                    condition: (s) => (0, storyFlags_1.hasStoryFlag)(s, 'vox_embargo'),
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
                            worldEffects: (0, worldEffects_1.extendWorldEffect)(s, 'mediaHeat', 18),
                            storyFlags: (0, storyFlags_1.addStoryFlag)(s, 'public_scandal'),
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
                        storyFlags: (0, storyFlags_1.addStoryFlags)(s, 'vox_exclusive', 'public_scandal', 'vane_exposed'),
                        worldEffects: (0, worldEffects_1.extendWorldEffect)(s, 'mediaHeat', 30),
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
                        storyFlags: (0, storyFlags_1.addStoryFlag)(s, 'vox_embargo'),
                        worldEffects: (0, worldEffects_1.extendWorldEffect)(s, 'bureauPull', 12),
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
                    condition: (s) => !(0, storyFlags_1.hasStoryFlag)(s, 'inspector_blacklist') && (!(0, storyFlags_1.hasStoryFlag)(s, 'fixer_smuggling_tie') || (0, storyFlags_1.hasStoryFlag)(s, 'reform_alliance')),
                    nextNodeId: 'safety_sweep'
                },
                {
                    text: 'Ask about Sector 4 collapse records.',
                    nextNodeId: 'sector4_records'
                },
                {
                    text: 'Krell already heard about your fixer routes.',
                    condition: (s) => (0, storyFlags_1.hasStoryFlag)(s, 'fixer_smuggling_tie') && !(0, storyFlags_1.hasStoryFlag)(s, 'reform_alliance'),
                    nextNodeId: 'smuggling_conflict'
                },
                {
                    text: 'Build a reform alliance against Vane.',
                    condition: (s) => ((0, storyFlags_1.hasStoryFlag)(s, 'public_scandal') || (0, storyFlags_1.hasStoryFlag)(s, 'vane_exposed')) && !(0, storyFlags_1.hasStoryFlag)(s, 'reform_alliance'),
                    nextNodeId: 'reform_alliance'
                },
                {
                    text: 'Become Krell\'s internal witness.',
                    condition: (s) => !(0, storyFlags_1.hasStoryFlag)(s, 'inspector_blacklist') &&
                        !(0, storyFlags_1.hasStoryFlag)(s, 'inspector_deputized') &&
                        !(0, storyFlags_1.hasStoryFlag)(s, 'fixer_smuggling_tie') &&
                        ((0, storyFlags_1.hasStoryFlag)(s, 'public_scandal') || (0, storyFlags_1.hasStoryFlag)(s, 'reform_alliance')),
                    nextNodeId: 'deputized_offer'
                },
                {
                    text: 'Tell Krell to stay out of your business.',
                    condition: (s) => (0, storyFlags_1.hasStoryFlag)(s, 'fixer_smuggling_tie') &&
                        !(0, storyFlags_1.hasStoryFlag)(s, 'inspector_blacklist') &&
                        !(0, storyFlags_1.hasStoryFlag)(s, 'inspector_deputized'),
                    nextNodeId: 'blacklist_offer'
                },
                {
                    text: 'Krell has blacklisted your operation.',
                    condition: (s) => (0, storyFlags_1.hasStoryFlag)(s, 'inspector_blacklist'),
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
                        worldEffects: (0, worldEffects_1.extendWorldEffect)(s, 'communityBacking', 12),
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
                        storyFlags: (0, storyFlags_1.addStoryFlag)(s, 'reform_alliance'),
                        worldEffects: (0, worldEffects_1.extendWorldEffect)(s, 'bureauPull', 10),
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
                        storyFlags: (0, storyFlags_1.addStoryFlags)(s, 'reform_alliance', 'vane_exposed'),
                        worldEffects: (0, worldEffects_1.extendWorldEffect)(s, 'bureauPull', 20),
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
                        storyFlags: (0, storyFlags_1.addStoryFlags)(s, 'inspector_deputized', 'reform_alliance', 'vane_exposed'),
                        worldEffects: (0, worldEffects_1.extendWorldEffect)(s, 'bureauPull', 24),
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
                        storyFlags: (0, storyFlags_1.addStoryFlag)(s, 'inspector_blacklist'),
                        worldEffects: (0, worldEffects_1.extendWorldEffect)(s, 'marketInsight', 12),
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
                    condition: (s) => !(0, storyFlags_1.hasStoryFlag)(s, 'community_pact'),
                    nextNodeId: 'courier_job'
                },
                {
                    text: 'Ask for market rumors.',
                    nextNodeId: 'market_rumors'
                },
                {
                    text: 'Your village pact kills this business.',
                    condition: (s) => (0, storyFlags_1.hasStoryFlag)(s, 'community_pact'),
                    nextNodeId: 'fixer_pact_blocked'
                },
                {
                    text: 'Run a smuggling convoy while the Bureau is distracted.',
                    condition: (s) => (0, storyFlags_1.hasStoryFlag)(s, 'fixer_smuggling_tie') && !(0, storyFlags_1.hasStoryFlag)(s, 'community_pact'),
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
                        storyFlags: (0, storyFlags_1.addStoryFlag)(s, 'fixer_smuggling_tie'),
                        worldEffects: (0, worldEffects_1.extendWorldEffect)(s, 'marketInsight', 10),
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
                        worldEffects: (0, worldEffects_1.extendWorldEffect)(s, 'marketInsight', 18),
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
                        worldEffects: (0, worldEffects_1.extendWorldEffect)(s, 'marketInsight', 12),
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
exports.OFFICE_ITEMS = {
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
const createLinearTiles = (prefix, type, start, end, voxels, discovered = true) => {
    const tiles = {};
    const dx = Math.sign(end.x - start.x);
    const dy = Math.sign(end.y - start.y);
    const steps = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
    for (let i = 0; i <= steps; i++) {
        const x = start.x + dx * i;
        const y = start.y + dy * i;
        const id = `${prefix}_${i}`;
        tiles[id] = {
            id,
            npcId: 'none',
            name: type === 'ROAD' ? 'Road' : 'Sidewalk',
            pos: { x, y },
            type,
            isDiscovered: discovered,
            voxels
        };
    }
    return tiles;
};
const centralHub = { x: exports.WORLD_CENTER, y: exports.WORLD_CENTER + 10 };
const cityScape = {
    ...createLinearTiles('main_avenue', 'ROAD', { x: centralHub.x, y: exports.WORLD_CENTER - 6 }, { x: centralHub.x, y: exports.WORLD_CENTER + 44 }, buildings_1.ROAD_VOXELS),
    ...createLinearTiles('civic_east', 'ROAD', { x: centralHub.x, y: centralHub.y }, { x: exports.WORLD_CENTER + 32, y: centralHub.y }, buildings_1.ROAD_VOXELS),
    ...createLinearTiles('market_west', 'ROAD', { x: exports.WORLD_CENTER - 28, y: centralHub.y }, { x: centralHub.x, y: centralHub.y }, buildings_1.ROAD_VOXELS),
    ...createLinearTiles('plaza_north_walk', 'SIDEWALK', { x: exports.WORLD_CENTER - 10, y: centralHub.y - 10 }, { x: exports.WORLD_CENTER + 10, y: centralHub.y - 10 }, buildings_1.SIDEWALK_VOXELS),
    ...createLinearTiles('plaza_south_walk', 'SIDEWALK', { x: exports.WORLD_CENTER - 10, y: centralHub.y + 10 }, { x: exports.WORLD_CENTER + 10, y: centralHub.y + 10 }, buildings_1.SIDEWALK_VOXELS),
    ...createLinearTiles('bureau_walk', 'SIDEWALK', { x: exports.WORLD_CENTER + 12, y: centralHub.y - 8 }, { x: exports.WORLD_CENTER + 28, y: centralHub.y - 8 }, buildings_1.SIDEWALK_VOXELS),
    ...createLinearTiles('union_walk', 'SIDEWALK', { x: exports.WORLD_CENTER + 10, y: centralHub.y + 12 }, { x: exports.WORLD_CENTER + 24, y: centralHub.y + 12 }, buildings_1.SIDEWALK_VOXELS),
};
const baseBuildings = {
    'player_home': {
        id: 'player_home',
        npcId: 'none',
        name: 'Your House',
        pos: { x: exports.WORLD_CENTER, y: exports.WORLD_CENTER - 4 },
        type: 'HOME',
        isDiscovered: true,
        voxels: voxelData_1.PLAYER_HOUSE_VOXELS
    },
    'licensing_office': {
        id: 'licensing_office',
        npcId: 'licensing',
        name: 'Bureau of Extraction',
        pos: { x: exports.WORLD_CENTER + 24, y: centralHub.y - 10 },
        type: 'OFFICE',
        isDiscovered: false,
        explorationItems: ['vane_ledger', 'trash_can_vane'],
        voxels: buildings_1.LICENSING_OFFICE_VOXELS
    },
    'union_hall': {
        id: 'union_hall',
        npcId: 'union',
        name: 'The Gilded Pick',
        pos: { x: exports.WORLD_CENTER + 18, y: centralHub.y + 18 },
        type: 'PUB',
        isDiscovered: false,
        explorationItems: ['sal_cigar_box'],
        voxels: buildings_1.UNION_HALL_VOXELS
    },
    'inspector_hq': {
        id: 'inspector_hq',
        npcId: 'inspector',
        name: 'Compliance Tower',
        pos: { x: exports.WORLD_CENTER + 18, y: centralHub.y - 26 },
        type: 'OFFICE',
        isDiscovered: false,
        explorationItems: ['krell_blueprints'],
        voxels: buildings_1.INSPECTOR_HQ_VOXELS
    },
    'fixer_den': {
        id: 'fixer_den',
        npcId: 'fixer',
        name: 'Slink\'s Salvage',
        pos: { x: exports.WORLD_CENTER + 34, y: centralHub.y + 30 },
        type: 'HOME',
        isDiscovered: false,
        voxels: buildings_1.FIXER_DEN_VOXELS
    },
    'hotline_booth': {
        id: 'hotline_booth',
        npcId: 'journalist',
        name: 'Hotline Booth',
        pos: { x: exports.WORLD_CENTER - 16, y: centralHub.y + 2 },
        type: 'HOTLINE',
        isDiscovered: true,
        voxels: buildings_1.HOTLINE_BOOTH_VOXELS
    },
    'chief_hut': {
        id: 'chief_hut',
        npcId: 'chief',
        name: 'Chief\'s Hut',
        pos: { x: exports.WORLD_CENTER - 32, y: centralHub.y - 24 },
        type: 'HOME',
        isDiscovered: true,
        voxels: buildings_1.CHIEF_HUT_VOXELS
    },
    'mine_entrance': {
        id: 'mine_entrance',
        npcId: 'none',
        name: 'Sector 4 Entrance',
        pos: { x: centralHub.x, y: exports.WORLD_CENTER + 52 },
        type: 'MINE_ENTRANCE',
        isDiscovered: true
    },
    'central_park': {
        id: 'central_park',
        npcId: 'none',
        name: 'Dusty Palms Park',
        pos: { x: exports.WORLD_CENTER - 4, y: centralHub.y - 2 },
        type: 'PARK',
        isDiscovered: true,
        description: 'The only place with actual (dying) trees.',
        voxels: buildings_1.PARK_VOXELS
    },
    ...cityScape
};
exports.BUILDINGS = baseBuildings;
