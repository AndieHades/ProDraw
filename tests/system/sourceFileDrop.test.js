import { File } from "node:buffer";
import { describe, expect, it } from "vitest";
import * as actions from "../../src/core/actions.ts";
import { dropImage } from "../../src/systems/import/index.js";

describe("source file drop routing", () => {
  it("opens PNG as a separate gallery document with its desktop path", async () => {
    const file = new File([Uint8Array.from([137, 80, 78, 71])], "sprite.png",
      { type: "image/png" });
    let routed = null;
    actions.registerOrReplace("gallery.importDrop", async (value, location) => {
      routed = { value, location }; return true;
    });

    await dropImage(file, () => "C:\\Art\\sprite.png");
    expect(routed).toEqual({ value: file, location: "C:\\Art\\sprite.png" });
  });
});
