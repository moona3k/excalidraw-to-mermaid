import { describe, test, expect } from "bun:test";
import { readFileSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { convert, convertFile } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => resolve(__dirname, "fixtures", name);

describe("convert (API)", () => {
  test("simple flow produces valid mermaid", () => {
    const doc = JSON.parse(readFileSync(fixture("simple-flow.excalidraw"), "utf-8"));
    const result = convert(doc);

    expect(result.nodeCount).toBe(3);
    expect(result.edgeCount).toBe(2);
    expect(result.mermaid).toContain("graph");
    expect(result.mermaid).toContain("Start");
    expect(result.mermaid).toContain("Process");
    expect(result.mermaid).toContain("End");
    expect(result.mermaid).toContain("-->");
  });

  test("simple flow detects LR direction", () => {
    const doc = JSON.parse(readFileSync(fixture("simple-flow.excalidraw"), "utf-8"));
    const result = convert(doc);
    expect(result.direction).toBe("LR");
  });

  test("decision flow has diamond and labels", () => {
    const doc = JSON.parse(readFileSync(fixture("decision-flow.excalidraw"), "utf-8"));
    const result = convert(doc);

    expect(result.nodeCount).toBe(4);
    expect(result.edgeCount).toBe(3);
    // Should have a diamond for the decision
    expect(result.mermaid).toMatch(/\{.*Valid\?.*\}/);
    // Should have edge labels
    expect(result.mermaid).toContain("Yes");
    expect(result.mermaid).toContain("No");
  });

  test("decision flow has dashed arrow", () => {
    const doc = JSON.parse(readFileSync(fixture("decision-flow.excalidraw"), "utf-8"));
    const result = convert(doc);
    expect(result.mermaid).toContain("-.->");
  });

  test("all-shapes fixture has all node types", () => {
    const doc = JSON.parse(readFileSync(fixture("all-shapes.excalidraw"), "utf-8"));
    const result = convert(doc);

    expect(result.nodeCount).toBe(4);
    // Rectangle: [label]
    expect(result.mermaid).toMatch(/\w+\[Rectangle\]/);
    // Rounded: (label)
    expect(result.mermaid).toMatch(/\w+\(Rounded\)/);
    // Diamond: {label}
    expect(result.mermaid).toMatch(/\w+\{Choice\}/);
    // Circle: ((label))
    expect(result.mermaid).toMatch(/\w+\(\(End\)\)/);
  });

  test("all-shapes has thick and dotted arrows", () => {
    const doc = JSON.parse(readFileSync(fixture("all-shapes.excalidraw"), "utf-8"));
    const result = convert(doc);

    expect(result.mermaid).toContain("-->");  // regular
    expect(result.mermaid).toContain("-.->"); // dashed
    expect(result.mermaid).toContain("==>"); // thick
  });

  test("grouped fixture has subgraph", () => {
    const doc = JSON.parse(readFileSync(fixture("grouped.excalidraw"), "utf-8"));
    const result = convert(doc);

    expect(result.mermaid).toContain("subgraph");
    expect(result.mermaid).toContain("Backend Services");
    expect(result.mermaid).toContain("end");
    expect(result.nodeCount).toBe(3);
  });

  test("empty document returns empty mermaid", () => {
    const doc = JSON.parse(readFileSync(fixture("empty.excalidraw"), "utf-8"));
    const result = convert(doc);

    expect(result.nodeCount).toBe(0);
    expect(result.edgeCount).toBe(0);
    expect(result.mermaid.trim()).toBe("graph TD");
  });

  test("direction override works", () => {
    const doc = JSON.parse(readFileSync(fixture("simple-flow.excalidraw"), "utf-8"));
    const result = convert(doc, { direction: "TD" });

    expect(result.direction).toBe("TD");
    expect(result.mermaid).toContain("graph TD");
  });
});

describe("convertFile", () => {
  test("reads and converts file", () => {
    const result = convertFile(fixture("simple-flow.excalidraw"));
    expect(result.nodeCount).toBe(3);
    expect(result.mermaid).toContain("Start");
  });

  test("writes output file when specified", () => {
    const outPath = resolve(__dirname, "..", ".test-output.md");
    const result = convertFile(fixture("simple-flow.excalidraw"), { output: outPath });

    const written = readFileSync(outPath, "utf-8");
    expect(written).toBe(result.mermaid);

    // Cleanup
    unlinkSync(outPath);
  });
});
