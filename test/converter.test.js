import { describe, test, expect } from "bun:test";
import {
  toMermaid,
  assignIds,
  shortId,
  renderNode,
  renderConnector,
  quoteLabel,
} from "../src/converter.js";

describe("shortId", () => {
  test("0 → A", () => expect(shortId(0)).toBe("A"));
  test("1 → B", () => expect(shortId(1)).toBe("B"));
  test("25 → Z", () => expect(shortId(25)).toBe("Z"));
  test("26 → AA", () => expect(shortId(26)).toBe("AA"));
  test("27 → AB", () => expect(shortId(27)).toBe("AB"));
  test("51 → AZ", () => expect(shortId(51)).toBe("AZ"));
  test("52 → BA", () => expect(shortId(52)).toBe("BA"));
});

describe("assignIds", () => {
  test("assigns sequential IDs", () => {
    const nodes = new Map([
      ["long_id_1", {}],
      ["long_id_2", {}],
      ["long_id_3", {}],
    ]);
    const idMap = assignIds(nodes);
    expect(idMap.get("long_id_1")).toBe("A");
    expect(idMap.get("long_id_2")).toBe("B");
    expect(idMap.get("long_id_3")).toBe("C");
  });
});

describe("renderNode", () => {
  test("rectangle", () => {
    expect(renderNode("A", { shape: "rectangle", label: "Box" })).toBe("A[Box]");
  });

  test("rounded", () => {
    expect(renderNode("B", { shape: "rounded", label: "Pill" })).toBe("B(Pill)");
  });

  test("diamond", () => {
    expect(renderNode("C", { shape: "diamond", label: "Decision" })).toBe("C{Decision}");
  });

  test("circle", () => {
    expect(renderNode("D", { shape: "circle", label: "End" })).toBe("D((End))");
  });

  test("subroutine", () => {
    expect(renderNode("E", { shape: "subroutine", label: "Sub" })).toBe("E[[Sub]]");
  });

  test("empty label uses shortId", () => {
    expect(renderNode("X", { shape: "rectangle", label: "" })).toBe("X[X]");
  });

  test("special chars get quoted", () => {
    expect(renderNode("A", { shape: "rectangle", label: "DB: PostgreSQL" }))
      .toBe('A["DB: PostgreSQL"]');
  });
});

describe("renderConnector", () => {
  test("arrow → -->", () => expect(renderConnector({ style: "arrow" })).toBe("-->"));
  test("line → ---", () => expect(renderConnector({ style: "line" })).toBe("---"));
  test("dotted → -.->", () => expect(renderConnector({ style: "dotted" })).toBe("-.->"));
  test("dotted-line → -.-", () => expect(renderConnector({ style: "dotted-line" })).toBe("-.-"));
  test("thick → ==>", () => expect(renderConnector({ style: "thick" })).toBe("==>"));
  test("thick-line → ===", () => expect(renderConnector({ style: "thick-line" })).toBe("==="));
  test("unknown defaults to -->", () => expect(renderConnector({ style: "unknown" })).toBe("-->"));
});

describe("quoteLabel", () => {
  test("plain text passes through", () => {
    expect(quoteLabel("Hello World")).toBe("Hello World");
  });

  test("colon triggers quoting", () => {
    expect(quoteLabel("DB: Main")).toBe('"DB: Main"');
  });

  test("brackets trigger quoting", () => {
    expect(quoteLabel("[info]")).toBe('"[info]"');
  });

  test("pipes trigger quoting", () => {
    expect(quoteLabel("A | B")).toBe('"A | B"');
  });

  test("newlines become <br>", () => {
    expect(quoteLabel("Line 1\nLine 2")).toBe("Line 1<br>Line 2");
  });

  test("empty string returns empty quotes", () => {
    expect(quoteLabel("")).toBe('""');
  });

  test("null returns empty quotes", () => {
    expect(quoteLabel(null)).toBe('""');
  });

  test("inner double quotes escaped", () => {
    expect(quoteLabel('say "hi"')).toBe('"say #quot;hi#quot;"');
  });
});

describe("toMermaid", () => {
  test("simple linear flow", () => {
    const nodes = new Map([
      ["n1", { label: "Start", shape: "rectangle" }],
      ["n2", { label: "End", shape: "rectangle" }],
    ]);
    const edges = [{ source: "n1", target: "n2", label: "", style: "arrow" }];
    const groups = new Map();

    const result = toMermaid({ nodes, edges, groups, direction: "LR" });
    expect(result).toContain("graph LR");
    expect(result).toContain("A[Start]");
    expect(result).toContain("B[End]");
    expect(result).toContain("A --> B");
  });

  test("edge with label", () => {
    const nodes = new Map([
      ["n1", { label: "A", shape: "rectangle" }],
      ["n2", { label: "B", shape: "rectangle" }],
    ]);
    const edges = [{ source: "n1", target: "n2", label: "request", style: "arrow" }];
    const groups = new Map();

    const result = toMermaid({ nodes, edges, groups, direction: "TD" });
    expect(result).toContain("A -->|request| B");
  });

  test("respects direction override", () => {
    const nodes = new Map([["n1", { label: "A", shape: "rectangle" }]]);
    const result = toMermaid(
      { nodes, edges: [], groups: new Map(), direction: "TD" },
      { direction: "LR" }
    );
    expect(result).toStartWith("graph LR");
  });

  test("renders subgraphs", () => {
    const nodes = new Map([
      ["n1", { label: "API", shape: "rectangle" }],
      ["n2", { label: "DB", shape: "rectangle" }],
      ["n3", { label: "Client", shape: "rectangle" }],
    ]);
    const groups = new Map([
      ["g1", { id: "g1", label: "Backend", members: ["n1", "n2"] }],
    ]);

    const result = toMermaid({ nodes, edges: [], groups, direction: "TD" });
    expect(result).toContain("subgraph");
    expect(result).toContain("Backend");
    expect(result).toContain("end");
    // Client should be outside the subgraph
    expect(result).toContain("C[Client]");
  });

  test("mixed node shapes", () => {
    const nodes = new Map([
      ["n1", { label: "Start", shape: "rounded" }],
      ["n2", { label: "Check", shape: "diamond" }],
      ["n3", { label: "Done", shape: "circle" }],
    ]);

    const result = toMermaid({ nodes, edges: [], groups: new Map(), direction: "TD" });
    expect(result).toContain("A(Start)");
    expect(result).toContain("B{Check}");
    expect(result).toContain("C((Done))");
  });

  test("empty graph produces minimal output", () => {
    const result = toMermaid({
      nodes: new Map(),
      edges: [],
      groups: new Map(),
      direction: "TD",
    });
    expect(result.trim()).toBe("graph TD");
  });

  test("edge with missing source/target skipped", () => {
    const nodes = new Map([["n1", { label: "A", shape: "rectangle" }]]);
    const edges = [{ source: "n1", target: "missing", label: "", style: "arrow" }];

    const result = toMermaid({ nodes, edges, groups: new Map(), direction: "TD" });
    expect(result).not.toContain("-->");
  });
});
