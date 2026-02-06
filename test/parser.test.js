import { describe, test, expect } from "bun:test";
import { parseDocument, mapShape, mapArrowStyle, detectDirection } from "../src/parser.js";

describe("mapShape", () => {
  test("rectangle without roundness → rectangle", () => {
    expect(mapShape({ type: "rectangle" })).toBe("rectangle");
  });

  test("rectangle with roundness → rounded", () => {
    expect(mapShape({ type: "rectangle", roundness: { type: 3 } })).toBe("rounded");
  });

  test("rectangle with dashed stroke → subroutine", () => {
    expect(mapShape({ type: "rectangle", strokeStyle: "dashed" })).toBe("subroutine");
  });

  test("diamond → diamond", () => {
    expect(mapShape({ type: "diamond" })).toBe("diamond");
  });

  test("ellipse → circle", () => {
    expect(mapShape({ type: "ellipse" })).toBe("circle");
  });

  test("unknown type → rectangle", () => {
    expect(mapShape({ type: "hexagon" })).toBe("rectangle");
  });
});

describe("mapArrowStyle", () => {
  test("solid arrow → arrow", () => {
    expect(mapArrowStyle({
      strokeStyle: "solid",
      strokeWidth: 2,
      endArrowhead: "arrow",
    })).toBe("arrow");
  });

  test("solid no arrowhead → line", () => {
    expect(mapArrowStyle({
      strokeStyle: "solid",
      strokeWidth: 2,
      endArrowhead: null,
    })).toBe("line");
  });

  test("dashed arrow → dotted", () => {
    expect(mapArrowStyle({
      strokeStyle: "dashed",
      strokeWidth: 2,
      endArrowhead: "arrow",
    })).toBe("dotted");
  });

  test("dashed no arrowhead → dotted-line", () => {
    expect(mapArrowStyle({
      strokeStyle: "dashed",
      strokeWidth: 2,
      endArrowhead: null,
    })).toBe("dotted-line");
  });

  test("dotted style → dotted", () => {
    expect(mapArrowStyle({
      strokeStyle: "dotted",
      strokeWidth: 2,
      endArrowhead: "arrow",
    })).toBe("dotted");
  });

  test("thick arrow → thick", () => {
    expect(mapArrowStyle({
      strokeStyle: "solid",
      strokeWidth: 4,
      endArrowhead: "arrow",
    })).toBe("thick");
  });

  test("thick line → thick-line", () => {
    expect(mapArrowStyle({
      strokeStyle: "solid",
      strokeWidth: 4,
      endArrowhead: null,
    })).toBe("thick-line");
  });

  test("endArrowhead 'none' treated as no arrow", () => {
    expect(mapArrowStyle({
      strokeStyle: "solid",
      strokeWidth: 2,
      endArrowhead: "none",
    })).toBe("line");
  });
});

describe("detectDirection", () => {
  test("horizontal edges → LR", () => {
    const nodes = new Map([
      ["a", { x: 0, y: 100, width: 100, height: 50 }],
      ["b", { x: 300, y: 100, width: 100, height: 50 }],
    ]);
    const edges = [{ source: "a", target: "b" }];
    expect(detectDirection(nodes, edges)).toBe("LR");
  });

  test("vertical edges → TD", () => {
    const nodes = new Map([
      ["a", { x: 100, y: 0, width: 100, height: 50 }],
      ["b", { x: 100, y: 300, width: 100, height: 50 }],
    ]);
    const edges = [{ source: "a", target: "b" }];
    expect(detectDirection(nodes, edges)).toBe("TD");
  });

  test("no edges → TD", () => {
    expect(detectDirection(new Map(), [])).toBe("TD");
  });

  test("mixed edges: majority wins", () => {
    const nodes = new Map([
      ["a", { x: 0, y: 0, width: 100, height: 50 }],
      ["b", { x: 300, y: 0, width: 100, height: 50 }],
      ["c", { x: 0, y: 300, width: 100, height: 50 }],
    ]);
    // 1 horizontal, 1 vertical → tie goes to TD
    const edges = [
      { source: "a", target: "b" },
      { source: "a", target: "c" },
    ];
    expect(detectDirection(nodes, edges)).toBe("TD");
  });
});

describe("parseDocument", () => {
  test("parses nodes with bound text", () => {
    const doc = {
      elements: [
        {
          type: "rectangle",
          id: "r1",
          x: 0, y: 0, width: 100, height: 50,
          isDeleted: false,
          groupIds: [],
          boundElements: [{ id: "t1", type: "text" }],
        },
        {
          type: "text",
          id: "t1",
          x: 10, y: 10, width: 80, height: 20,
          text: "Hello",
          containerId: "r1",
          isDeleted: false,
        },
      ],
    };
    const { nodes } = parseDocument(doc);
    expect(nodes.size).toBe(1);
    expect(nodes.get("r1").label).toBe("Hello");
  });

  test("parses edges with bindings", () => {
    const doc = {
      elements: [
        { type: "rectangle", id: "a", x: 0, y: 0, width: 100, height: 50, isDeleted: false, groupIds: [] },
        { type: "rectangle", id: "b", x: 200, y: 0, width: 100, height: 50, isDeleted: false, groupIds: [] },
        {
          type: "arrow", id: "arr",
          x: 100, y: 25, width: 100, height: 0,
          strokeStyle: "solid", strokeWidth: 2,
          startBinding: { elementId: "a" },
          endBinding: { elementId: "b" },
          endArrowhead: "arrow",
          isDeleted: false, groupIds: [],
        },
      ],
    };
    const { edges } = parseDocument(doc);
    expect(edges.length).toBe(1);
    expect(edges[0].source).toBe("a");
    expect(edges[0].target).toBe("b");
    expect(edges[0].style).toBe("arrow");
  });

  test("skips deleted elements", () => {
    const doc = {
      elements: [
        { type: "rectangle", id: "a", x: 0, y: 0, width: 100, height: 50, isDeleted: true, groupIds: [] },
      ],
    };
    const { nodes } = parseDocument(doc);
    expect(nodes.size).toBe(0);
  });

  test("skips arrows with missing bindings", () => {
    const doc = {
      elements: [
        { type: "rectangle", id: "a", x: 0, y: 0, width: 100, height: 50, isDeleted: false, groupIds: [] },
        {
          type: "arrow", id: "arr",
          x: 100, y: 25, width: 100, height: 0,
          strokeStyle: "solid", strokeWidth: 2,
          startBinding: { elementId: "a" },
          endBinding: null,
          endArrowhead: "arrow",
          isDeleted: false, groupIds: [],
        },
      ],
    };
    const { edges } = parseDocument(doc);
    expect(edges.length).toBe(0);
  });

  test("skips arrows pointing to non-node elements", () => {
    const doc = {
      elements: [
        { type: "rectangle", id: "a", x: 0, y: 0, width: 100, height: 50, isDeleted: false, groupIds: [] },
        { type: "text", id: "t", x: 200, y: 0, width: 100, height: 50, isDeleted: false },
        {
          type: "arrow", id: "arr",
          x: 100, y: 25, width: 100, height: 0,
          strokeStyle: "solid", strokeWidth: 2,
          startBinding: { elementId: "a" },
          endBinding: { elementId: "t" },
          endArrowhead: "arrow",
          isDeleted: false, groupIds: [],
        },
      ],
    };
    const { edges } = parseDocument(doc);
    expect(edges.length).toBe(0);
  });

  test("extracts arrow labels", () => {
    const doc = {
      elements: [
        { type: "rectangle", id: "a", x: 0, y: 0, width: 100, height: 50, isDeleted: false, groupIds: [] },
        { type: "rectangle", id: "b", x: 200, y: 0, width: 100, height: 50, isDeleted: false, groupIds: [] },
        {
          type: "arrow", id: "arr",
          x: 100, y: 25, width: 100, height: 0,
          strokeStyle: "solid", strokeWidth: 2,
          startBinding: { elementId: "a" },
          endBinding: { elementId: "b" },
          endArrowhead: "arrow",
          isDeleted: false, groupIds: [],
          boundElements: [{ id: "arr_text", type: "text" }],
        },
        {
          type: "text", id: "arr_text",
          x: 130, y: 10, width: 40, height: 20,
          text: "Yes",
          containerId: "arr",
          isDeleted: false,
        },
      ],
    };
    const { edges } = parseDocument(doc);
    expect(edges[0].label).toBe("Yes");
  });

  test("detects frame-based groups", () => {
    const doc = {
      elements: [
        {
          type: "frame", id: "frame1",
          x: 0, y: 0, width: 300, height: 200,
          name: "My Group",
          isDeleted: false, groupIds: [],
        },
        { type: "rectangle", id: "a", x: 10, y: 10, width: 100, height: 50, isDeleted: false, groupIds: [] },
        { type: "rectangle", id: "b", x: 150, y: 10, width: 100, height: 50, isDeleted: false, groupIds: [] },
        { type: "rectangle", id: "c", x: 400, y: 10, width: 100, height: 50, isDeleted: false, groupIds: [] },
      ],
    };
    const { groups } = parseDocument(doc);
    expect(groups.size).toBe(1);
    const group = groups.get("frame1");
    expect(group.label).toBe("My Group");
    expect(group.members).toContain("a");
    expect(group.members).toContain("b");
    expect(group.members).not.toContain("c");
  });

  test("detects groupId-based groups", () => {
    const doc = {
      elements: [
        { type: "rectangle", id: "a", x: 0, y: 0, width: 100, height: 50, isDeleted: false, groupIds: ["g1"] },
        { type: "rectangle", id: "b", x: 200, y: 0, width: 100, height: 50, isDeleted: false, groupIds: ["g1"] },
        { type: "rectangle", id: "c", x: 400, y: 0, width: 100, height: 50, isDeleted: false, groupIds: [] },
      ],
    };
    const { groups } = parseDocument(doc);
    expect(groups.size).toBe(1);
    const group = groups.get("g1");
    expect(group.members).toContain("a");
    expect(group.members).toContain("b");
    expect(group.members.length).toBe(2);
  });

  test("handles empty document", () => {
    const { nodes, edges, groups } = parseDocument({ elements: [] });
    expect(nodes.size).toBe(0);
    expect(edges.length).toBe(0);
    expect(groups.size).toBe(0);
  });

  test("handles missing elements array", () => {
    const { nodes } = parseDocument({});
    expect(nodes.size).toBe(0);
  });

  test("nodes without text get empty label", () => {
    const doc = {
      elements: [
        { type: "rectangle", id: "r", x: 0, y: 0, width: 100, height: 50, isDeleted: false, groupIds: [] },
      ],
    };
    const { nodes } = parseDocument(doc);
    expect(nodes.get("r").label).toBe("");
  });
});
