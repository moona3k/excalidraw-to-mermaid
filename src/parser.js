/**
 * Parse Excalidraw JSON into a structured graph representation.
 *
 * Extracts nodes (shapes with text), edges (arrows with bindings),
 * and groups (frames or grouped elements).
 */

/**
 * Shape types that represent graph nodes.
 */
const NODE_TYPES = new Set(["rectangle", "ellipse", "diamond"]);

/**
 * Shape types that represent graph edges.
 */
const EDGE_TYPES = new Set(["arrow", "line"]);

/**
 * Parse an Excalidraw document into nodes, edges, and groups.
 *
 * @param {object} doc - Parsed Excalidraw JSON
 * @returns {{ nodes: Map, edges: Array, groups: Map, direction: string }}
 */
export function parseDocument(doc) {
  const elements = (doc.elements || []).filter((el) => !el.isDeleted);

  // Build element lookup
  const byId = new Map();
  for (const el of elements) {
    byId.set(el.id, el);
  }

  // Extract bound text for each container
  const textByContainer = new Map();
  for (const el of elements) {
    if (el.type === "text" && el.containerId) {
      textByContainer.set(el.containerId, el.text || el.originalText || "");
    }
  }

  // Extract nodes
  const nodes = new Map();
  for (const el of elements) {
    if (!NODE_TYPES.has(el.type)) continue;

    const label = textByContainer.get(el.id) || "";

    // Skip container rectangles: dashed stroke + no label = decorative frame
    if (el.type === "rectangle" && el.strokeStyle === "dashed" && !label) {
      continue;
    }

    const shape = mapShape(el);

    nodes.set(el.id, {
      id: el.id,
      label,
      shape,
      x: el.x,
      y: el.y,
      width: el.width || 0,
      height: el.height || 0,
      strokeStyle: el.strokeStyle || "solid",
      strokeColor: el.strokeColor,
      backgroundColor: el.backgroundColor,
      groupIds: el.groupIds || [],
    });
  }

  // Extract edges
  const edges = [];
  for (const el of elements) {
    if (!EDGE_TYPES.has(el.type)) continue;

    const startId = el.startBinding?.elementId;
    const endId = el.endBinding?.elementId;

    // Only include edges that connect two known nodes
    if (!startId || !endId) continue;
    if (!nodes.has(startId) || !nodes.has(endId)) continue;

    // Get arrow label (bound text on the arrow itself)
    const label = textByContainer.get(el.id) || "";

    const style = mapArrowStyle(el);

    edges.push({
      id: el.id,
      source: startId,
      target: endId,
      label,
      style,
    });
  }

  // Detect groups (frames or groupIds)
  const groups = extractGroups(elements, nodes, byId);

  // Detect flow direction
  const direction = detectDirection(nodes, edges);

  return { nodes, edges, groups, direction };
}

/**
 * Map an Excalidraw element to a Mermaid node shape type.
 */
export function mapShape(el) {
  switch (el.type) {
    case "diamond":
      return "diamond";
    case "ellipse":
      return "circle";
    case "rectangle":
      if (el.roundness && el.roundness.type) {
        return "rounded";
      }
      if (el.strokeStyle === "dashed") {
        return "subroutine";
      }
      return "rectangle";
    default:
      return "rectangle";
  }
}

/**
 * Map an Excalidraw arrow to a Mermaid edge style.
 */
export function mapArrowStyle(el) {
  const hasEnd = el.endArrowhead != null && el.endArrowhead !== "none";
  const isDashed =
    el.strokeStyle === "dashed" || el.strokeStyle === "dotted";
  const isThick = (el.strokeWidth || 1) >= 4;

  if (isThick) {
    return hasEnd ? "thick" : "thick-line";
  }
  if (isDashed) {
    return hasEnd ? "dotted" : "dotted-line";
  }
  if (hasEnd) {
    return "arrow";
  }
  return "line";
}

/**
 * Extract groups from frames and groupIds.
 */
function extractGroups(elements, nodes, byId) {
  const groups = new Map();

  // Frames: elements contained within frame bounds
  const frames = elements.filter((el) => el.type === "frame");
  for (const frame of frames) {
    const label = frame.name || "";
    const members = [];
    for (const [nodeId, node] of nodes) {
      if (isInsideFrame(node, frame)) {
        members.push(nodeId);
      }
    }
    if (members.length > 0) {
      groups.set(frame.id, { id: frame.id, label, members });
    }
  }

  // GroupIds: elements sharing the same groupId
  const groupIdSets = new Map();
  for (const [nodeId, node] of nodes) {
    for (const gid of node.groupIds) {
      if (!groupIdSets.has(gid)) {
        groupIdSets.set(gid, []);
      }
      groupIdSets.get(gid).push(nodeId);
    }
  }
  for (const [gid, members] of groupIdSets) {
    if (members.length > 1 && !groups.has(gid)) {
      groups.set(gid, { id: gid, label: "", members });
    }
  }

  return groups;
}

/**
 * Check if a node is inside a frame's bounds.
 */
function isInsideFrame(node, frame) {
  const nodeCx = node.x + node.width / 2;
  const nodeCy = node.y + node.height / 2;
  return (
    nodeCx >= frame.x &&
    nodeCx <= frame.x + (frame.width || 0) &&
    nodeCy >= frame.y &&
    nodeCy <= frame.y + (frame.height || 0)
  );
}

/**
 * Detect whether the diagram flows left-to-right or top-to-bottom.
 */
export function detectDirection(nodes, edges) {
  if (edges.length === 0) return "TD";

  let horizontalScore = 0;
  let verticalScore = 0;

  for (const edge of edges) {
    const src = nodes.get(edge.source);
    const tgt = nodes.get(edge.target);
    if (!src || !tgt) continue;

    const dx = Math.abs(
      tgt.x + tgt.width / 2 - (src.x + src.width / 2)
    );
    const dy = Math.abs(
      tgt.y + tgt.height / 2 - (src.y + src.height / 2)
    );

    if (dx > dy) {
      horizontalScore++;
    } else {
      verticalScore++;
    }
  }

  return horizontalScore > verticalScore ? "LR" : "TD";
}
