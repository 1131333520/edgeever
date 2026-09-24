import { describe, expect, test } from "bun:test";
import {
  createDefaultInfographicDocument,
  getInfographicSummary,
  parseInfographicDocument,
  serializeInfographicDocument,
} from "./infographic.ts";

describe("infographic note format", () => {
  test("round trips AntV syntax and keeps a readable fallback", () => {
    const document = {
      schemaVersion: 1,
      syntax: "infographic list-row-simple-horizontal-arrow\ndata\n  title 发布流程\n  lists\n    - label 准备\n    - label 发布",
    };
    const markdown = serializeInfographicDocument(document);
    expect(markdown).toContain("```infographic\n");
    expect(parseInfographicDocument(markdown)).toEqual(document);
    expect(getInfographicSummary(markdown)).toEqual({ infographic: true });
  });

  test("empty and invalid notes do not claim a valid document", () => {
    expect(parseInfographicDocument(serializeInfographicDocument(createDefaultInfographicDocument()))).toEqual(createDefaultInfographicDocument());
    expect(parseInfographicDocument("<!-- edgeever-infographic-v1:broken -->")).toBeNull();
    expect(getInfographicSummary("regular note")).toEqual({ infographic: false });
  });
});
