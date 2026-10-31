// REV-TY-4: a slice of tests/playthrough/07-dig.mjs (steps FROM..TO, env), unchanged, for chaining with Kesh scenarios
import { steps as all } from '../../../../tests/playthrough/07-dig.mjs';
const a = +(process.env.FROM ?? 0), b = +(process.env.TO ?? all.length);
export const steps = [all[0], ...all.slice(Math.max(1, a), b)];
