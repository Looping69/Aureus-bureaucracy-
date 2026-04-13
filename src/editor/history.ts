export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

const HISTORY_LIMIT = 80;

export const createHistoryState = <T>(initial: T): HistoryState<T> => ({
  past: [],
  present: initial,
  future: [],
});

export const pushHistoryState = <T>(
  history: HistoryState<T>,
  next: T,
  limit: number = HISTORY_LIMIT
): HistoryState<T> => {
  if (Object.is(history.present, next)) {
    return history;
  }

  const past = [...history.past, history.present];
  if (past.length > limit) {
    past.splice(0, past.length - limit);
  }

  return {
    past,
    present: next,
    future: [],
  };
};

export const replaceHistoryPresent = <T>(history: HistoryState<T>, next: T): HistoryState<T> => ({
  ...history,
  present: next,
});

export const undoHistoryState = <T>(history: HistoryState<T>): HistoryState<T> => {
  if (history.past.length === 0) {
    return history;
  }

  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
};

export const redoHistoryState = <T>(history: HistoryState<T>): HistoryState<T> => {
  if (history.future.length === 0) {
    return history;
  }

  const [next, ...rest] = history.future;
  return {
    past: [...history.past, history.present],
    present: next,
    future: rest,
  };
};
