import { describe, expect, test } from "bun:test";
import { MockLanguageModelV4 } from "ai/test";
import { simulateReadableStream } from "ai";
import { runInfographicAgent } from "./infographic-agent.ts";

const finish = {
  type: "finish",
  finishReason: { unified: "stop", raw: undefined },
  usage: { inputTokens: { total: 10 }, outputTokens: { total: 10 } },
};

const input = {
  prompt: "把字节跳动换成阿里巴巴",
  currentTemplate: "compare-binary-horizontal-badge-card-vs",
  currentContent: '{"template":"compare-binary-horizontal-badge-card-vs","data":{"title":"腾讯 vs 字节跳动"}}',
  candidates: ["compare-binary-horizontal-badge-card-vs", "sequence-timeline-simple"],
  history: [{ prompt: "对比腾讯和字节跳动", response: "已生成两家公司对比图。" }],
};

describe("infographic agent", () => {
  test("uses one SDK tool loop and preserves the conversation context", async () => {
    const events = [];
    let calls = 0;
    const model = new MockLanguageModelV4({ doStream: async () => {
      calls += 1;
      return { stream: simulateReadableStream({ chunks: calls === 1 ? [
        { type: "tool-call", toolCallId: "proposal-1", toolName: "propose_infographic", input: JSON.stringify({
          template: input.currentTemplate,
          data: { title: "腾讯 vs 阿里巴巴", compares: [
            { label: "腾讯", children: [{ label: "业务", desc: "社交" }] },
            { label: "阿里巴巴", children: [{ label: "业务", desc: "电商" }] },
          ] },
          explanation: "已替换对比对象并保留版式。",
        }) }, { ...finish, finishReason: { unified: "tool-calls", raw: undefined } },
      ] : [
        { type: "text-start", id: "text-1" },
        { type: "text-delta", id: "text-1", delta: "已替换对比对象并保留版式。" },
        { type: "text-end", id: "text-1" }, finish,
      ] }) };
    } });
    await runInfographicAgent({ input, model, signal: new AbortController().signal, onEvent: (event) => events.push(event) });
    expect(calls).toBe(2);
    expect(events.find((event) => event.type === "proposal")?.template).toBe(input.currentTemplate);
    expect(events.find((event) => event.type === "text-delta")?.text).toContain("保留版式");
    expect(events.at(-1)).toEqual({ type: "finish" });
    const modelPrompt = JSON.stringify(model.doStreamCalls[0].prompt);
    expect(modelPrompt).toContain("对比腾讯和字节跳动");
    expect(modelPrompt).toContain("把字节跳动换成阿里巴巴");
  });

  test("can ask for clarification without producing a graphic", async () => {
    const events = [];
    let calls = 0;
    const model = new MockLanguageModelV4({ doStream: async () => {
      calls += 1;
      return { stream: simulateReadableStream({ chunks: calls === 1 ? [
        { type: "tool-call", toolCallId: "question-1", toolName: "ask_clarification", input: JSON.stringify({ question: "要比较哪两家公司？" }) },
        { ...finish, finishReason: { unified: "tool-calls", raw: undefined } },
      ] : [finish] }) };
    } });
    await runInfographicAgent({ input: { ...input, prompt: "换一家公司" }, model, signal: new AbortController().signal, onEvent: (event) => events.push(event) });
    expect(events.some((event) => event.type === "proposal")).toBe(false);
    expect(events.find((event) => event.type === "question")?.question).toBe("要比较哪两家公司？");
    expect(events.find((event) => event.type === "text-delta")?.text).toBe("要比较哪两家公司？");
  });
});
