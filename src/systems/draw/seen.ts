// Pixels already touched by the active stroke.
import * as bus from "../../core/bus.ts";

export const strokeSeen = new Set<number>();
const clear = (): void => strokeSeen.clear();
bus.on("stroke-begin", clear);
bus.on("snapshot", clear);
