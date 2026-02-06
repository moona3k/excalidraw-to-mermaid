# excalidraw-to-mermaid

Convert [Excalidraw](https://excalidraw.com/) diagrams to [Mermaid](https://mermaid.js.org/) flowchart syntax.

No browser required. Works in Node.js and Bun.

## Before & After

### Context Window Compaction

**Excalidraw input:**

![Excalidraw context compaction diagram](assets/example-compaction-excalidraw.png)

**Mermaid output:**

```mermaid
graph TD
    subgraph frame_before["BEFORE (~78% full)"]
        A(System Prompt)
        B(Message 1)
        C("Tool Result (5K)")
        D(Message 2)
        E("Tool Result (8K)")
        F(Message N)
        G("Buffer (45K reserved)")
    end
    subgraph frame_after["AFTER (compacted)"]
        H(System Prompt)
        I(SUMMARY)
        J(Recent File 1)
        K(Recent File 2)
        L(FREE SPACE)
        M("Buffer (45K reserved)")
    end
    A --- B
    B --- C
    C --- D
    D --- E
    E --- F
    F -.- G
    H --- I
    I --- J
    J --- K
    K --- L
    L --- M
    E -->|compact| I
```

Frames become subgraphs. Arrow labels, edge styles (solid, dashed), and node connections are all preserved.

### Decision Flowchart

**Excalidraw input:**

![Excalidraw decision flowchart](assets/example-excalidraw.png)

**Mermaid output:**

```mermaid
graph TD
    A(Start)
    B{Valid?}
    C[Success]
    D[Error]
    A --> B
    B -->|Yes| C
    B -.->|No| D
```

### Shape Mapping

**Excalidraw input:**

![Excalidraw shapes](assets/example-shapes-excalidraw.png)

**Mermaid output:**

```mermaid
graph LR
    A[Rectangle]
    B(Rounded)
    C{Choice}
    D((End))
    A --> B
    B -.-> C
    C ==> D
```

Every Excalidraw shape maps to its Mermaid equivalent. Arrow styles are preserved too — solid, dashed, and thick.

### Real-World Architecture

**Excalidraw input:**

![Excalidraw architecture diagram](assets/example-architecture-excalidraw.png)

**Mermaid output:**

```mermaid
graph LR
    A(CloudFront)
    B(React SPA)
    C(REST API)
    D(Redis)
    E(Stripe API)
    F(PostgreSQL)
    G(S3)
    A --> B
    B -->|REST calls| C
    C -.->|cache| D
    C -->|payments| E
    C -->|queries| F
    F -.->|uploads| G
```

Multi-tier architecture with labeled edges, dashed connections for caching/storage, and container frames automatically filtered out.

---

## Install

```bash
npm install -g excalidraw-to-mermaid
```

Or use directly with npx:

```bash
npx excalidraw-to-mermaid diagram.excalidraw
```

## CLI Usage

```bash
# Print Mermaid to stdout
excalidraw-to-mermaid diagram.excalidraw

# Write to file
excalidraw-to-mermaid diagram.excalidraw -o output.md

# Force direction (TD, LR, BT, RL)
excalidraw-to-mermaid diagram.excalidraw --direction LR

# JSON output with metadata
excalidraw-to-mermaid diagram.excalidraw --json
```

### Options

| Flag | Description |
|------|-------------|
| `-o, --output <file>` | Write output to file |
| `-d, --direction <dir>` | Force direction: TD, LR, BT, RL |
| `--json` | Output as JSON with metadata |
| `-v, --version` | Show version |
| `-h, --help` | Show help |

## API Usage

```js
import { convert, convertFile } from "excalidraw-to-mermaid";

// From file
const result = convertFile("diagram.excalidraw");
console.log(result.mermaid);

// From parsed JSON
const doc = JSON.parse(fs.readFileSync("diagram.excalidraw", "utf-8"));
const result = convert(doc, { direction: "LR" });
console.log(result.mermaid);
// → graph LR
//       A[Start]
//       B[Process]
//       C[End]
//       A --> B
//       B --> C
```

### Return value

```js
{
  mermaid: "graph LR\n    A[Start]\n    ...",
  nodeCount: 3,
  edgeCount: 2,
  direction: "LR"
}
```

## What Gets Converted

### Node shapes

| Excalidraw | Mermaid | Syntax |
|-----------|---------|--------|
| Rectangle | Square box | `A[Label]` |
| Rounded rectangle | Rounded box | `A(Label)` |
| Diamond | Rhombus | `A{Label}` |
| Ellipse | Circle | `A((Label))` |
| Dashed rectangle | Subroutine | `A[[Label]]` |

### Edge styles

| Excalidraw | Mermaid | Syntax |
|-----------|---------|--------|
| Solid arrow | Arrow | `-->` |
| Solid line (no head) | Line | `---` |
| Dashed arrow | Dotted arrow | `-.->` |
| Dashed line | Dotted line | `-.-` |
| Thick arrow | Bold arrow | `==>` |
| Thick line | Bold line | `===` |

### Other features

- **Arrow labels** — Bound text on arrows becomes edge labels (`-->|label|`)
- **Subgraphs** — Excalidraw frames and grouped elements become Mermaid subgraphs
- **Auto direction** — Detects whether layout flows left-to-right or top-to-bottom
- **Special characters** — Labels with colons, brackets, pipes, etc. are automatically quoted

## Development

```bash
# Run tests (88 tests)
bun test

# Run a single test file
bun test test/parser.test.js
```

## Motivation

Inspired by [excalidraw/mermaid-to-excalidraw#66](https://github.com/excalidraw/mermaid-to-excalidraw/issues/66) — 100+ upvotes requesting the reverse direction (Excalidraw → Mermaid). This fills that gap.

## License

MIT
