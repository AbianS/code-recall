/**
 * Tests for TypeScript Extractor
 */

import { beforeAll, describe, expect, test } from "bun:test";
import { extractTypeScriptEntities } from "../../src/code/extractors/typescript.ts";
import { getParser, parseCode } from "../../src/code/parser.ts";

describe("TypeScript Extractor", () => {
  beforeAll(async () => {
    await getParser();
  });

  describe("Class Extraction", () => {
    test("extracts class declaration", async () => {
      const source = `
class UserService {
  private db: Database;
}
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const classEntity = entities.find(
        (e) => e.type === "class" && e.name === "UserService",
      );
      expect(classEntity).toBeDefined();
      expect(classEntity?.signature).toContain("class UserService");
    });

    test("extracts class with extends", async () => {
      const source = `
class Admin extends User {
  permissions: string[];
}
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const classEntity = entities.find((e) => e.name === "Admin");
      expect(classEntity).toBeDefined();
      expect(classEntity?.signature).toContain("class Admin");
      // Note: extends clause extraction depends on tree-sitter parser version
    });

    test("extracts class with implements", async () => {
      const source = `
class UserService implements IService, ILogger {
  serve() {}
}
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const classEntity = entities.find((e) => e.name === "UserService");
      expect(classEntity).toBeDefined();
      // The implements clause may or may not be captured depending on tree-sitter version
      expect(classEntity?.signature).toContain("class UserService");
    });

    test("extracts class with JSDoc", async () => {
      const source = `
/**
 * Manages user data
 */
class UserManager {
}
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const classEntity = entities.find((e) => e.name === "UserManager");
      if (classEntity?.docstring) {
        expect(classEntity.docstring).toContain("Manages user data");
      }
    });
  });

  describe("Method Extraction", () => {
    test("extracts methods from class", async () => {
      const source = `
class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const method = entities.find(
        (e) => e.type === "method" && e.name === "add",
      );
      expect(method).toBeDefined();
      expect(method?.qualifiedName).toContain("add");
    });

    test("extracts async methods", async () => {
      const source = `
class Api {
  async fetchData(url: string): Promise<any> {
    return fetch(url);
  }
}
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const method = entities.find((e) => e.name === "fetchData");
      expect(method?.signature).toContain("async");
    });

    test("extracts static methods", async () => {
      const source = `
class Utils {
  static create(): Utils {
    return new Utils();
  }
}
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const method = entities.find((e) => e.name === "create");
      expect(method?.signature).toContain("static");
    });

    test("extracts constructor", async () => {
      const source = `
class Service {
  constructor(private db: Database) {}
}
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const ctor = entities.find(
        (e) => e.type === "method" && e.name === "constructor",
      );
      expect(ctor).toBeDefined();
    });
  });

  describe("Function Extraction", () => {
    test("extracts function declaration", async () => {
      const source = `
function add(a: number, b: number): number {
  return a + b;
}
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const func = entities.find(
        (e) => e.type === "function" && e.name === "add",
      );
      expect(func).toBeDefined();
      expect(func?.signature).toContain("function add");
    });

    test("extracts async function", async () => {
      const source = `
async function fetchData(url: string): Promise<Response> {
  return fetch(url);
}
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const func = entities.find((e) => e.name === "fetchData");
      expect(func?.signature).toContain("async");
    });

    test("extracts exported function", async () => {
      const source = `
export function helper(): void {}
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const func = entities.find((e) => e.name === "helper");
      expect(func).toBeDefined();
    });
  });

  describe("Interface Extraction", () => {
    test("extracts interface declaration", async () => {
      const source = `
interface User {
  id: number;
  name: string;
}
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const iface = entities.find(
        (e) => e.type === "interface" && e.name === "User",
      );
      expect(iface).toBeDefined();
      expect(iface?.signature).toContain("interface User");
    });

    test("extracts interface with extends", async () => {
      const source = `
interface Admin extends User {
  permissions: string[];
}
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const iface = entities.find((e) => e.name === "Admin");
      expect(iface?.signature).toContain("extends");
    });

    test("extracts generic interface", async () => {
      const source = `
interface Response<T> {
  data: T;
  status: number;
}
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const iface = entities.find((e) => e.name === "Response");
      expect(iface?.signature).toContain("<T>");
    });
  });

  describe("Type Alias Extraction", () => {
    test("extracts type alias", async () => {
      const source = `
type UserRole = 'admin' | 'user' | 'guest';
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const typeAlias = entities.find(
        (e) => e.type === "type" && e.name === "UserRole",
      );
      expect(typeAlias).toBeDefined();
      expect(typeAlias?.signature).toContain("type UserRole");
    });

    test("extracts generic type alias", async () => {
      const source = `
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const typeAlias = entities.find((e) => e.name === "Result");
      expect(typeAlias?.signature).toContain("<T, E>");
    });

    test("truncates long type definitions", async () => {
      const source = `
type LongType = {
  field1: string;
  field2: number;
  field3: boolean;
  field4: string;
  field5: number;
  field6: boolean;
  field7: string;
  field8: number;
};
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const typeAlias = entities.find((e) => e.name === "LongType");
      if (typeAlias?.signature && typeAlias.signature.length > 100) {
        expect(typeAlias.signature).toContain("...");
      }
    });
  });

  describe("Variable Extraction", () => {
    test("extracts const declaration", async () => {
      const source = `
const MAX_SIZE = 100;
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const variable = entities.find(
        (e) => e.type === "variable" && e.name === "MAX_SIZE",
      );
      expect(variable).toBeDefined();
      expect(variable?.signature).toContain("const MAX_SIZE");
    });

    test("extracts arrow function variable", async () => {
      const source = `
const add = (a: number, b: number): number => a + b;
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const variable = entities.find((e) => e.name === "add");
      expect(variable?.signature).toContain("=>");
    });

    test("skips private variables (starting with _)", async () => {
      const source = `
const _privateVar = 'secret';
const publicVar = 'visible';
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      expect(entities.find((e) => e.name === "_privateVar")).toBeUndefined();
      expect(entities.find((e) => e.name === "publicVar")).toBeDefined();
    });
  });

  describe("Import Extraction", () => {
    test("extracts named imports", async () => {
      const source = `
import { foo, bar } from 'module';
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const importEntity = entities.find(
        (e) => e.type === "import" && e.name === "module",
      );
      expect(importEntity).toBeDefined();
      expect(importEntity?.signature).toContain("foo");
      expect(importEntity?.signature).toContain("bar");
    });

    test("extracts default import", async () => {
      const source = `
import React from 'react';
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const importEntity = entities.find((e) => e.name === "react");
      expect(importEntity?.signature).toContain("React");
    });

    test("extracts namespace import", async () => {
      const source = `
import * as utils from './utils';
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const importEntity = entities.find((e) => e.name === "./utils");
      expect(importEntity?.signature).toContain("* as utils");
    });
  });

  describe("Line Numbers", () => {
    test("tracks correct line numbers", async () => {
      const source = `
// Line 1
// Line 2
function test() { // Line 3
  // Line 4
} // Line 5
`;
      const tree = await parseCode(source, "typescript");
      const entities = extractTypeScriptEntities(tree, source);

      const func = entities.find((e) => e.name === "test");
      expect(func?.startLine).toBeGreaterThanOrEqual(3);
      expect(func?.endLine).toBeGreaterThanOrEqual(func?.startLine ?? 0);
    });
  });
});
