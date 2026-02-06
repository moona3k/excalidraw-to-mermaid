import { describe, test, expect, afterAll } from "bun:test";
import { execSync } from "child_process";
import { existsSync, unlinkSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(__dirname, "..", "src", "cli.js");
const FIXTURE = resolve(__dirname, "fixtures", "simple-flow.excalidraw");
const DECISION = resolve(__dirname, "fixtures", "decision-flow.excalidraw");
const TMP_OUTPUT = resolve(__dirname, "..", ".test-output.md");

function run(args) {
  return execSync(`node ${CLI} ${args}`, { encoding: "utf-8", timeout: 10000 }).trim();
}

afterAll(() => {
  if (existsSync(TMP_OUTPUT)) unlinkSync(TMP_OUTPUT);
});

describe("CLI", () => {
  test("--version prints version", () => {
    const output = run("--version");
    expect(output).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("--help prints usage", () => {
    const output = run("--help");
    expect(output).toContain("excalidraw-to-mermaid");
    expect(output).toContain("Usage:");
    expect(output).toContain("Options:");
  });

  test("no args exits with error", () => {
    try {
      run("");
      expect(false).toBe(true);
    } catch (err) {
      expect(err.status).toBe(1);
    }
  });

  test("missing file exits with error", () => {
    try {
      run("nonexistent.excalidraw");
      expect(false).toBe(true);
    } catch (err) {
      expect(err.status).toBe(1);
      expect(err.stderr.toString()).toContain("not found");
    }
  });

  test("unknown option exits with error", () => {
    try {
      run("--bogus");
      expect(false).toBe(true);
    } catch (err) {
      expect(err.status).toBe(1);
    }
  });

  test("prints mermaid to stdout", () => {
    const output = run(FIXTURE);
    expect(output).toContain("graph");
    expect(output).toContain("Start");
    expect(output).toContain("-->");
  });

  test("--output writes to file", () => {
    const output = run(`${FIXTURE} -o ${TMP_OUTPUT}`);
    expect(output).toContain("Converted");
    expect(output).toContain("nodes");
    expect(existsSync(TMP_OUTPUT)).toBe(true);

    const content = readFileSync(TMP_OUTPUT, "utf-8");
    expect(content).toContain("graph");
  });

  test("--direction forces direction", () => {
    const output = run(`${FIXTURE} --direction TD`);
    expect(output).toContain("graph TD");
  });

  test("--json outputs JSON metadata", () => {
    const output = run(`${FIXTURE} --json`);
    const parsed = JSON.parse(output);
    expect(parsed.nodeCount).toBe(3);
    expect(parsed.edgeCount).toBe(2);
    expect(parsed.mermaid).toContain("graph");
  });

  test("decision flow produces labeled edges", () => {
    const output = run(DECISION);
    expect(output).toContain("Yes");
    expect(output).toContain("No");
  });

  test("invalid direction exits with error", () => {
    try {
      run(`${FIXTURE} --direction XY`);
      expect(false).toBe(true);
    } catch (err) {
      expect(err.status).toBe(1);
      expect(err.stderr.toString()).toContain("--direction");
    }
  });
});
