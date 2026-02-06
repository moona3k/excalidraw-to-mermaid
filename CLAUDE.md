# CLAUDE.md

## What is this?

Convert Excalidraw diagrams to Mermaid flowchart syntax. CLI + library. Zero dependencies.

**npm:** `excalidraw-to-mermaid` (unscoped)

## Architecture

```
src/
  cli.js        CLI entry point (argument parsing, --json/--output modes)
  index.js      Library entry point (convert, convertFile)
  parser.js     Excalidraw JSON → graph (nodes, edges, groups, direction)
  converter.js  Graph → Mermaid string

test/
  parser.test.js      Unit tests for parser
  converter.test.js   Unit tests for converter
  cli.test.js         CLI integration tests
  integration.test.js End-to-end with fixture files
  fixtures/           .excalidraw test inputs

assets/               README example images + source .excalidraw files
```

## Key Concepts

### Shape Mapping (parser.js → converter.js)

| Excalidraw | Condition | Mermaid |
|------------|-----------|---------|
| rectangle | `roundness: null` | `A[Label]` |
| rectangle | `roundness.type` set | `A(Label)` |
| rectangle | `strokeStyle: "dashed"` | `A[[Label]]` |
| diamond | — | `A{Label}` |
| ellipse | — | `A((Label))` |

### Arrow Style Mapping

| Excalidraw | Mermaid |
|------------|---------|
| solid + arrowhead | `-->` |
| dashed + arrowhead | `-.->` |
| strokeWidth >= 4 + arrowhead | `==>` |
| no arrowhead variants | `---`, `-.-`, `===` |

### Direction Detection

`detectDirection()` in parser.js compares horizontal vs vertical displacement across all edges. More horizontal = `graph LR`, more vertical = `graph TD`.

### Text Bindings

- Text inside shapes: `containerId` on text element points to shape ID
- Text on arrows: `containerId` on text element points to arrow ID → becomes edge label `-->|label|`

## Running Tests

```bash
bun test              # 88 tests
bun test test/parser.test.js  # single file
```

## Building / Publishing

```bash
npm publish           # publish to npm (unscoped)
```

No build step. Source ships directly (ESM, `"type": "module"`).

## Conventions

- ESM only — no `require()`
- LF line endings enforced via `.gitattributes`
- Test fixtures in `test/fixtures/` are real Excalidraw JSON files
- README examples are genuine converter output (run converter on `assets/*.excalidraw` to verify)
