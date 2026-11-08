// Heal declares no dormantWhen: it patches the source, and a stage that patches
// the source decides what every pass reads (core ignores a rule on one).

import { describe, expect, it } from "vitest";
import { healStage } from "../src/stages";

describe("dormantWhen", () => {
  it.each([1, 2, 3] as const)("is not declared on line %i", (line) => {
    expect(healStage(line)).not.toHaveProperty("dormantWhen");
  });
});
