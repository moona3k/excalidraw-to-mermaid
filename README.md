# @moona3k/excalidraw-to-mermaid

Convert [Excalidraw](https://excalidraw.com/) diagrams to [Mermaid](https://mermaid.js.org/) flowchart syntax.

No browser required. Works in Node.js and Bun.

## Install

```bash
npm install -g @moona3k/excalidraw-to-mermaid
```

Or use directly with npx:

```bash
npx @moona3k/excalidraw-to-mermaid diagram.excalidraw
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
import { convert, convertFile } from "@moona3k/excalidraw-to-mermaid";

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

## Example

Given an Excalidraw diagram with Start → Decision → Success/Error:

```
graph TD
    A(Start)
    B{Valid?}
    C[Success]
    D[Error]
    A --> B
    B -->|Yes| C
    B -.->|No| D
```

Which renders as:

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

## Development

```bash
# Run tests
bun test

# Run a single test file
bun test test/parser.test.js
```

## Motivation

Inspired by [excalidraw/mermaid-to-excalidraw#66](https://github.com/excalidraw/mermaid-to-excalidraw/issues/66) — 100+ upvotes requesting the reverse direction (Excalidraw → Mermaid). This fills that gap.

## License

MIT
