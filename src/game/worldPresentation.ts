export const DAY_NIGHT_TIME_SCALE = 0.3;
export const DAY_AMBIENT_TIME_RATE = 0.12;
export const NIGHT_AMBIENT_TIME_RATE = 0.6;
export const WORLD_RENDER_Y_OFFSET = 1;

export const isNightHour = (time: number) => time >= 20 || time < 6;

export const getAmbientTimeStep = (time: number) =>
  (isNightHour(time) ? NIGHT_AMBIENT_TIME_RATE : DAY_AMBIENT_TIME_RATE) * DAY_NIGHT_TIME_SCALE;

export const toRenderedWorldY = (logicalY: number) => logicalY + WORLD_RENDER_Y_OFFSET;
export const toLogicalWorldY = (renderedY: number) => renderedY - WORLD_RENDER_Y_OFFSET;
