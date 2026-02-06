#!/usr/bin/env node

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { convertFile } from "./index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function printHelp() {
  console.log(`
Usage: excalidraw-to-mermaid <input.excalidraw> [options]

Convert Excalidraw diagrams to Mermaid flowchart syntax.

Options:
  -o, --output <file>   Write output to file (default: stdout)
  -d, --direction <dir> Force direction: TD, LR, BT, RL (default: auto-detect)
  --json                Output as JSON with metadata
  -v, --version         Show version
  -h, --help            Show this help

Examples:
  excalidraw-to-mermaid diagram.excalidraw
  excalidraw-to-mermaid diagram.excalidraw -o output.md
  excalidraw-to-mermaid diagram.excalidraw --direction LR
  excalidraw-to-mermaid diagram.excalidraw --json
`.trim());
}

function getVersion() {
  const pkgPath = resolve(__dirname, "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  return pkg.version;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(1);
  }

  let inputPath = null;
  let outputPath = null;
  let direction = null;
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
        break;
      case "-v":
      case "--version":
        console.log(getVersion());
        process.exit(0);
        break;
      case "-o":
      case "--output":
        outputPath = args[++i];
        if (!outputPath) {
          console.error("Error: --output requires a file path");
          process.exit(1);
        }
        break;
      case "-d":
      case "--direction":
        direction = args[++i];
        if (!direction || !["TD", "LR", "BT", "RL", "TB"].includes(direction.toUpperCase())) {
          console.error("Error: --direction must be TD, LR, BT, or RL");
          process.exit(1);
        }
        direction = direction.toUpperCase();
        if (direction === "TB") direction = "TD";
        break;
      case "--json":
        jsonOutput = true;
        break;
      default:
        if (arg.startsWith("-")) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        inputPath = arg;
    }
  }

  if (!inputPath) {
    console.error("Error: No input file specified");
    printHelp();
    process.exit(1);
  }

  const resolved = resolve(inputPath);
  if (!existsSync(resolved)) {
    console.error(`Error: File not found: ${resolved}`);
    process.exit(1);
  }

  try {
    const options = {};
    if (direction) options.direction = direction;
    if (outputPath) options.output = resolve(outputPath);

    const result = convertFile(resolved, options);

    if (jsonOutput) {
      console.log(JSON.stringify({
        mermaid: result.mermaid,
        nodeCount: result.nodeCount,
        edgeCount: result.edgeCount,
        direction: result.direction,
        ...(outputPath ? { output: resolve(outputPath) } : {}),
      }, null, 2));
    } else if (outputPath) {
      console.log(`Converted ${result.nodeCount} nodes, ${result.edgeCount} edges → ${outputPath}`);
    } else {
      process.stdout.write(result.mermaid);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
