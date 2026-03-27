import { Objective } from '../types';

export const isObjectiveComplete = (objectives: Objective[], objectiveId: string) =>
  objectives.some(o => o.id === objectiveId && o.isCompleted);

export const completeObjective = (objectives: Objective[], objectiveId: string): Objective[] =>
  objectives.map(o => o.id === objectiveId ? { ...o, isCompleted: true } : o);

export const upsertObjective = (objectives: Objective[], objective: Objective): Objective[] => {
  if (objectives.some(o => o.id === objective.id)) return objectives;
  return [...objectives, objective];
};

