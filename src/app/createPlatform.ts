import type { PlatformPort } from "../contracts/platform";
import { selectPlatform } from "../platform/selectPlatform";

export function createPlatform(): PlatformPort {
  return selectPlatform();
}
