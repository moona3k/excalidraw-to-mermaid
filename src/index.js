/**
 * excalidraw-to-mermaid
 *
 * Convert Excalidraw diagrams to Mermaid flowchart syntax.
 */

import { readFileSync, writeFileSync } from "fs";
import { parseDocument } from "./parser.js";
import { toMermaid } from "./converter.js";

/**
 * Convert an Excalidraw file to Mermaid syntax.
 *
 * @param {string} inputPath - Path to .excalidraw file
 * @param {object} [options]
 * @param {string} [options.direction] - Force direction ("TD", "LR", "BT", "RL")
 * @param {string} [options.output] - Path to write output file
 * @returns {{ mermaid: string, nodeCount: number, edgeCount: number, direction: string }}
 */
export function convertFile(inputPath, options = {}) {
  const raw = readFileSync(inputPath, "utf-8");
  const doc = JSON.parse(raw);
  return convert(doc, options);
}

/**
 * Convert an Excalidraw document object to Mermaid syntax.
 *
 * @param {object} doc - Parsed Excalidraw JSON object
 * @param {object} [options]
 * @param {string} [options.direction] - Force direction ("TD", "LR", "BT", "RL")
 * @param {string} [options.output] - Path to write output file
 * @returns {{ mermaid: string, nodeCount: number, edgeCount: number, direction: string }}
 */
export function convert(doc, options = {}) {
  const graph = parseDocument(doc);
  const mermaid = toMermaid(graph, { direction: options.direction });

  if (options.output) {
    writeFileSync(options.output, mermaid, "utf-8");
  }

  return {
    mermaid,
    nodeCount: graph.nodes.size,
    edgeCount: graph.edges.length,
    direction: options.direction || graph.direction,
  };
}

export { parseDocument } from "./parser.js";
export { toMermaid } from "./converter.js";
