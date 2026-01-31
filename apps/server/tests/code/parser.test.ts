/**
 * Tests for Code Parser module
 */

import { beforeAll, describe, expect, test } from "bun:test";
import {
  detectLanguage,
  getParser,
  loadLanguage,
  parseCode,
} from "../../src/code/parser.ts";

describe("Code Parser", () => {
  // Initialize parser once before tests
  beforeAll(async () => {
    await getParser();
  });

  describe("detectLanguage", () => {
    test("detects TypeScript (.ts)", () => {
      expect(detectLanguage("file.ts")).toBe("typescript");
      expect(detectLanguage("/path/to/file.ts")).toBe("typescript");
      expect(detectLanguage("FILE.TS")).toBe("typescript");
    });

    test("detects TSX (.tsx)", () => {
      expect(detectLanguage("component.tsx")).toBe("tsx");
      expect(detectLanguage("/src/App.tsx")).toBe("tsx");
    });

    test("detects JavaScript (.js)", () => {
      expect(detectLanguage("file.js")).toBe("javascript");
      expect(detectLanguage("/path/to/file.js")).toBe("javascript");
    });

    test("detects JavaScript modules (.mjs, .cjs)", () => {
      expect(detectLanguage("file.mjs")).toBe("javascript");
      expect(detectLanguage("file.cjs")).toBe("javascript");
    });

    test("detects JSX as JavaScript", () => {
      expect(detectLanguage("component.jsx")).toBe("javascript");
    });

    test("detects Rust (.rs)", () => {
      expect(detectLanguage("file.rs")).toBe("rust");
      expect(detectLanguage("/path/to/lib.rs")).toBe("rust");
      expect(detectLanguage("main.RS")).toBe("rust");
    });

    test("returns null for unsupported extensions", () => {
      expect(detectLanguage("file.py")).toBeNull();
      expect(detectLanguage("file.go")).toBeNull();
      expect(detectLanguage("file.java")).toBeNull();
      expect(detectLanguage("file.cpp")).toBeNull();
      expect(detectLanguage("file.html")).toBeNull();
      expect(detectLanguage("file.css")).toBeNull();
      expect(detectLanguage("file.json")).toBeNull();
    });

    test("returns null for files without extension", () => {
      expect(detectLanguage("Makefile")).toBeNull();
      expect(detectLanguage("Dockerfile")).toBeNull();
    });

    test("handles complex paths", () => {
      expect(detectLanguage("/home/user/project/src/utils/helpers.ts")).toBe(
        "typescript",
      );
      expect(detectLanguage("C:\\Users\\user\\project\\file.js")).toBe(
        "javascript",
      );
    });
  });

  describe("loadLanguage", () => {
    test("loads TypeScript language", async () => {
      const lang = await loadLanguage("typescript");
      expect(lang).toBeDefined();
    });

    test("loads TSX language", async () => {
      const lang = await loadLanguage("tsx");
      expect(lang).toBeDefined();
    });

    test("loads JavaScript language", async () => {
      const lang = await loadLanguage("javascript");
      expect(lang).toBeDefined();
    });

    test("loads Rust language", async () => {
      const lang = await loadLanguage("rust");
      expect(lang).toBeDefined();
    });

    test("caches loaded languages", async () => {
      const lang1 = await loadLanguage("typescript");
      const lang2 = await loadLanguage("typescript");

      // Should be same cached instance
      expect(lang1).toBe(lang2);
    });
  });

  describe("parseCode", () => {
    test("parses TypeScript code", async () => {
      const source = `
const x: number = 1;
function add(a: number, b: number): number {
  return a + b;
}
`;
      const tree = await parseCode(source, "typescript");

      expect(tree).toBeDefined();
      expect(tree.rootNode).toBeDefined();
      expect(tree.rootNode.type).toBe("program");
    });

    test("parses JavaScript code", async () => {
      const source = `
const x = 1;
function add(a, b) {
  return a + b;
}
`;
      const tree = await parseCode(source, "javascript");

      expect(tree).toBeDefined();
      expect(tree.rootNode.type).toBe("program");
    });

    test("parses TSX code", async () => {
      const source = `
import React from 'react';
function App() {
  return <div>Hello</div>;
}
`;
      const tree = await parseCode(source, "tsx");

      expect(tree).toBeDefined();
      expect(tree.rootNode.type).toBe("program");
    });

    test("parses empty source", async () => {
      const tree = await parseCode("", "typescript");
      expect(tree).toBeDefined();
    });

    test("handles syntax errors gracefully", async () => {
      const badSource = `
function broken( {
  // Missing closing
`;
      // Should not throw, just return tree with ERROR nodes
      const tree = await parseCode(badSource, "typescript");
      expect(tree).toBeDefined();
    });

    test("parses class declarations", async () => {
      const source = `
class MyClass {
  private field: string;

  constructor() {
    this.field = "value";
  }

  method(): void {}
}
`;
      const tree = await parseCode(source, "typescript");

      expect(
        tree.rootNode.children.some(
          (c: { type: string }) => c.type === "class_declaration",
        ),
      ).toBe(true);
    });

    test("parses interface declarations", async () => {
      const source = `
interface User {
  id: number;
  name: string;
}
`;
      const tree = await parseCode(source, "typescript");

      expect(
        tree.rootNode.children.some(
          (c: { type: string }) => c.type === "interface_declaration",
        ),
      ).toBe(true);
    });

    test("parses type aliases", async () => {
      const source = `
type StringOrNumber = string | number;
`;
      const tree = await parseCode(source, "typescript");

      expect(
        tree.rootNode.children.some(
          (c: { type: string }) => c.type === "type_alias_declaration",
        ),
      ).toBe(true);
    });

    test("parses imports", async () => {
      const source = `
import { foo } from 'bar';
import * as baz from 'qux';
import defaultExport from 'module';
`;
      const tree = await parseCode(source, "typescript");

      const imports = tree.rootNode.children.filter(
        (c: { type: string }) => c.type === "import_statement",
      );
      expect(imports.length).toBe(3);
    });

    test("parses Rust code", async () => {
      const source = `
fn main() {
    println!("Hello, world!");
}

struct Point {
    x: i32,
    y: i32,
}
`;
      const tree = await parseCode(source, "rust");

      expect(tree).toBeDefined();
      expect(tree.rootNode).toBeDefined();
      expect(tree.rootNode.type).toBe("source_file");
    });

    test("parses Rust structs and functions", async () => {
      const source = `
pub struct User {
    name: String,
    age: u32,
}

impl User {
    pub fn new(name: String, age: u32) -> Self {
        Self { name, age }
    }
}
`;
      const tree = await parseCode(source, "rust");

      expect(
        tree.rootNode.children.some(
          (c: { type: string }) => c.type === "struct_item",
        ),
      ).toBe(true);
      expect(
        tree.rootNode.children.some(
          (c: { type: string }) => c.type === "impl_item",
        ),
      ).toBe(true);
    });
  });

  describe("getParser", () => {
    test("returns parser instance", async () => {
      const parser = await getParser();
      expect(parser).toBeDefined();
    });

    test("returns same instance on multiple calls", async () => {
      const parser1 = await getParser();
      const parser2 = await getParser();

      expect(parser1).toBe(parser2);
    });
  });
});
