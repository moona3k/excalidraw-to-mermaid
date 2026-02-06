/**
 * Convert a parsed graph into Mermaid flowchart syntax.
 */

/**
 * Characters that require quoting a Mermaid label.
 */
const NEEDS_QUOTES = /[:"{}|[\]<>()#&]/;

/**
 * Convert a parsed graph to a Mermaid flowchart string.
 *
 * @param {{ nodes: Map, edges: Array, groups: Map, direction: string }} graph
 * @param {{ direction?: string }} options
 * @returns {string}
 */
export function toMermaid(graph, options = {}) {
  const { nodes, edges, groups, direction } = graph;
  const dir = options.direction || direction || "TD";
  const lines = [];

  lines.push(`graph ${dir}`);

  // Assign short IDs (A, B, C, ... AA, AB, ...)
  const idMap = assignIds(nodes);

  // Track which nodes are inside a group
  const groupedNodes = new Set();
  for (const group of groups.values()) {
    for (const memberId of group.members) {
      groupedNodes.add(memberId);
    }
  }

  // Track rendered nodes to prevent duplicates across groups
  const renderedNodes = new Set();

  // Render groups with their contained nodes
  for (const group of groups.values()) {
    const groupShortId = sanitizeId(group.id);
    const label = group.label || "";
    if (label) {
      lines.push(`    subgraph ${groupShortId}[${quoteLabel(label)}]`);
    } else {
      lines.push(`    subgraph ${groupShortId}`);
    }

    for (const memberId of group.members) {
      if (renderedNodes.has(memberId)) continue;
      const node = nodes.get(memberId);
      if (node) {
        lines.push(`        ${renderNode(idMap.get(memberId), node)}`);
        renderedNodes.add(memberId);
      }
    }
    lines.push("    end");
  }

  // Render ungrouped nodes
  for (const [nodeId, node] of nodes) {
    if (groupedNodes.has(nodeId)) continue;
    lines.push(`    ${renderNode(idMap.get(nodeId), node)}`);
  }

  // Render edges
  for (const edge of edges) {
    const srcId = idMap.get(edge.source);
    const tgtId = idMap.get(edge.target);
    if (!srcId || !tgtId) continue;

    const connector = renderConnector(edge);
    if (edge.label) {
      lines.push(`    ${srcId} ${connector}|${quoteLabel(edge.label)}| ${tgtId}`);
    } else {
      lines.push(`    ${srcId} ${connector} ${tgtId}`);
    }
  }

  return lines.join("\n") + "\n";
}

/**
 * Assign short alphabetic IDs to nodes.
 * A, B, C, ... Z, AA, AB, ...
 */
export function assignIds(nodes) {
  const idMap = new Map();
  let i = 0;
  for (const nodeId of nodes.keys()) {
    idMap.set(nodeId, shortId(i));
    i++;
  }
  return idMap;
}

/**
 * Generate a short alphabetic ID from an index.
 * 0→A, 1→B, ..., 25→Z, 26→AA, 27→AB, ...
 */
export function shortId(index) {
  let result = "";
  let n = index;
  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return result;
}

/**
 * Render a node declaration in Mermaid syntax.
 */
export function renderNode(shortId, node) {
  const label = node.label || shortId;
  const quoted = quoteLabel(label);

  switch (node.shape) {
    case "diamond":
      return `${shortId}{${quoted}}`;
    case "circle":
      return `${shortId}((${quoted}))`;
    case "rounded":
      return `${shortId}(${quoted})`;
    case "subroutine":
      return `${shortId}[[${quoted}]]`;
    case "rectangle":
    default:
      return `${shortId}[${quoted}]`;
  }
}

/**
 * Render an edge connector string.
 */
export function renderConnector(edge) {
  switch (edge.style) {
    case "thick":
      return "==>";
    case "thick-line":
      return "===";
    case "dotted":
      return "-.->";
    case "dotted-line":
      return "-.-";
    case "line":
      return "---";
    case "arrow":
    default:
      return "-->";
  }
}

/**
 * Quote a label if it contains special characters.
 * Mermaid uses double quotes for labels with special chars.
 */
export function quoteLabel(text) {
  if (!text) return '""';
  // Check if original text needs quoting (before <br> substitution)
  const needsQuotes = NEEDS_QUOTES.test(text);
  // Replace newlines with <br>
  const cleaned = text.replace(/\n/g, "<br>");
  if (needsQuotes) {
    // Escape any existing double quotes
    return `"${cleaned.replace(/"/g, "#quot;")}"`;
  }
  return cleaned;
}

/**
 * Sanitize an Excalidraw ID for use as a Mermaid subgraph ID.
 */
function sanitizeId(id) {
  return id.replace(/[^a-zA-Z0-9_]/g, "_").substring(0, 20);
}
