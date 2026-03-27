import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';
import { extendWorldEffect } from '../../game/dialogue/worldEffects';
import { hasStoryFlag } from '../../game/dialogue/storyFlags';

interface UseCityEventLoopArgs {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  setNotification: React.Dispatch<React.SetStateAction<{ title: string; msg: string } | null>>;
  enabled?: boolean;
}

export const useCityEventLoop = ({ setState, setNotification, enabled = true }: UseCityEventLoopArgs) => {
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      setState(prev => {
        const hourKey = (prev.day * 24) + Math.floor(prev.time);
        if (hourKey === prev.lastCityEventHour) return prev;

        const roll = Math.random();
        const chance = 0.22;
        if (roll > chance) {
          return { ...prev, lastCityEventHour: hourKey };
        }

        const options = [
          () => ({
            title: 'Union Relief Run',
            msg: 'Workers shared supplies. Energy +8, Trust +2.',
            next: {
              ...prev,
              energy: Math.min(prev.maxEnergy, prev.energy + 8),
              meters: { ...prev.meters, trust: Math.min(100, prev.meters.trust + 2) },
              lastCityEventHour: hourKey
            }
          }),
          () => ({
            title: 'Black Dust Storm',
            msg: 'Logistics disrupted. You lost $120 and gained +3 Exposure.',
            next: {
              ...prev,
              money: Math.max(0, prev.money - 120),
              meters: { ...prev.meters, exposure: Math.min(100, prev.meters.exposure + 3) },
              lastCityEventHour: hourKey
            }
          }),
          () => ({
            title: 'Anonymous Tip',
            msg: 'A courier dropped off intelligence. +1 Evidence, +1 Influence.',
            next: {
              ...prev,
              evidence: prev.evidence + 1,
              meters: { ...prev.meters, influence: Math.min(100, prev.meters.influence + 1) },
              lastCityEventHour: hourKey
            }
          }),
          () => ({
            title: 'Permit Window Surge',
            msg: 'Clerks are unusually efficient today. Pending applications moved faster.',
            next: {
              ...prev,
              lastCityEventHour: hourKey
            }
          })
        ];

        if (hasStoryFlag(prev, 'community_pact')) {
          options.push(() => ({
            title: 'Village Water Crew',
            msg: 'Okon sent crews to stabilize supply lines. Exposure -2, Community Backing refreshed.',
            next: {
              ...prev,
              worldEffects: extendWorldEffect(prev, 'communityBacking', 12),
              meters: {
                ...prev.meters,
                exposure: Math.max(0, prev.meters.exposure - 2),
                trust: Math.min(100, prev.meters.trust + 2)
              },
              lastCityEventHour: hourKey
            }
          }));
        }

        if (hasStoryFlag(prev, 'fixer_smuggling_tie')) {
          options.push(() => ({
            title: 'Smuggler Cache',
            msg: 'Slink routed contraband through your lane. +$180, +4 Exposure, Market Window extended.',
            next: {
              ...prev,
              money: prev.money + 180,
              worldEffects: extendWorldEffect(prev, 'marketInsight', 12),
              meters: {
                ...prev.meters,
                exposure: Math.min(100, prev.meters.exposure + 4)
              },
              lastCityEventHour: hourKey
            }
          }));
        }

        if (hasStoryFlag(prev, 'vox_exclusive')) {
          options.push(() => ({
            title: 'Exclusive Follow-Up',
            msg: 'Vox pushed the story harder. Influence +4, Exposure +4.',
            next: {
              ...prev,
              meters: {
                ...prev.meters,
                influence: Math.min(100, prev.meters.influence + 4),
                exposure: Math.min(100, prev.meters.exposure + 4)
              },
              lastCityEventHour: hourKey
            }
          }));
        }

        if (hasStoryFlag(prev, 'vox_embargo')) {
          options.push(() => ({
            title: 'Press Freeze',
            msg: 'The embargo is holding. Exposure -2 and clerks are less jumpy.',
            next: {
              ...prev,
              worldEffects: extendWorldEffect(prev, 'bureauPull', 8),
              meters: {
                ...prev.meters,
                exposure: Math.max(0, prev.meters.exposure - 2)
              },
              lastCityEventHour: hourKey
            }
          }));
        }

        if (hasStoryFlag(prev, 'inspector_deputized') || hasStoryFlag(prev, 'reform_alliance')) {
          options.push(() => ({
            title: 'Internal Memo Leak',
            msg: 'Krell slipped you a compliance memo. +1 Evidence, Bureau Pull refreshed.',
            next: {
              ...prev,
              evidence: prev.evidence + 1,
              worldEffects: extendWorldEffect(prev, 'bureauPull', 10),
              lastCityEventHour: hourKey
            }
          }));
        }

        if (hasStoryFlag(prev, 'inspector_blacklist')) {
          options.push(() => ({
            title: 'Compliance Sweep',
            msg: 'Blacklisted crews got hit hard. -$180 and +5 Exposure.',
            next: {
              ...prev,
              money: Math.max(0, prev.money - 180),
              meters: {
                ...prev.meters,
                exposure: Math.min(100, prev.meters.exposure + 5)
              },
              lastCityEventHour: hourKey
            }
          }));
        }

        const event = options[Math.floor(Math.random() * options.length)]();
        setNotification({ title: event.title, msg: event.msg });
        return event.next;
      });
    }, 2500);

    return () => clearInterval(timer);
  }, [enabled, setNotification, setState]);
};
