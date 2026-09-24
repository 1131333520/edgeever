import { describe, expect, test } from "bun:test";
import { createDefaultDiagramDocument, parseDiagramDocument, serializeDiagramDocument } from "./diagram.ts";
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

  test("keeps AI revision requests with the infographic across reads", () => {
    const document = {
      schemaVersion: 1,
      syntax: "infographic sequence-steps-simple\ndata\n  title 发布流程",
      history: [
        { id: "one", prompt: "做一个发布流程图", createdAt: "2026-09-24T10:00:00.000Z", kind: "generated", resultTitle: "发布流程" },
        { id: "two", prompt: "把第二步改成审核", createdAt: "2026-09-24T10:01:00.000Z", kind: "refined", resultTitle: "发布流程", undoneAt: "2026-09-24T10:02:00.000Z" },
      ],
    };
    expect(parseInfographicDocument(serializeInfographicDocument(document))).toEqual(document);
    expect(parseInfographicDocument(serializeInfographicDocument({ ...document, history: [{ ...document.history[0], prompt: 42 }] }))).toBeNull();
  });

  test("infographic syntax and visual diagram IR keep separate envelopes", () => {
    const infographic = serializeInfographicDocument({ schemaVersion: 1, syntax: "infographic sequence-steps-simple\ndata\n  sequences\n    - label 开始" });
    const diagram = serializeDiagramDocument(createDefaultDiagramDocument("flowchart"));
    expect(parseInfographicDocument(infographic)?.syntax).toContain("sequence-steps-simple");
    expect(parseDiagramDocument(infographic)).toBeNull();
    expect(parseDiagramDocument(diagram)?.kind).toBe("flowchart");
    expect(parseInfographicDocument(diagram)).toBeNull();
  });
});
