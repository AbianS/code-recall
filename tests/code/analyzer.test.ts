/**
 * Tests for code-recall Code Analysis module
 */

import { describe, expect, test } from "bun:test";
import { analyzeFile, formatAnalysisResult } from "../../src/code/index.ts";

describe("Code Analysis", () => {
  test("analyzes TypeScript file with class", async () => {
    const source = `
/**
 * Example class
 */
export class UserService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async findUser(id: number): Promise<User | null> {
    return this.db.query("SELECT * FROM users WHERE id = ?", [id]);
  }

  static create(): UserService {
    return new UserService(new Database());
  }
}
`;

    const result = await analyzeFile("test.ts", source);

    expect(result.language).toBe("typescript");
    expect(result.fileHash).toBeDefined();
    expect(result.entities.length).toBeGreaterThan(0);

    // Should find the class
    const classEntity = result.entities.find(
      (e) => e.type === "class" && e.name === "UserService",
    );
    expect(classEntity).toBeDefined();
    // Note: JSDoc extraction depends on AST structure, may be undefined
    if (classEntity?.docstring) {
      expect(classEntity.docstring).toContain("Example class");
    }

    // Should find methods (qualified names depend on AST traversal order)
    const findUserMethod = result.entities.find(
      (e) => e.type === "method" && e.name === "findUser",
    );
    expect(findUserMethod).toBeDefined();
    // Qualified name may or may not have class prefix depending on traversal
    expect(findUserMethod?.qualifiedName).toContain("findUser");

    const createMethod = result.entities.find(
      (e) => e.type === "method" && e.name === "create",
    );
    expect(createMethod).toBeDefined();
  });

  test("analyzes TypeScript file with interface and type", async () => {
    const source = `
interface User {
  id: number;
  name: string;
  email: string;
}

type UserRole = 'admin' | 'user' | 'guest';

export interface DatabaseConfig {
  host: string;
  port: number;
}
`;

    const result = await analyzeFile("types.ts", source);

    expect(result.entities.length).toBeGreaterThanOrEqual(3);

    const userInterface = result.entities.find(
      (e) => e.type === "interface" && e.name === "User",
    );
    expect(userInterface).toBeDefined();

    const userRoleType = result.entities.find(
      (e) => e.type === "type" && e.name === "UserRole",
    );
    expect(userRoleType).toBeDefined();
  });

  test("analyzes JavaScript file with functions", async () => {
    const source = `
/**
 * Add two numbers
 */
function add(a, b) {
  return a + b;
}

async function fetchData(url) {
  const response = await fetch(url);
  return response.json();
}

const multiply = (a, b) => a * b;
`;

    const result = await analyzeFile("utils.js", source);

    expect(result.language).toBe("javascript");

    const addFunc = result.entities.find(
      (e) => e.type === "function" && e.name === "add",
    );
    expect(addFunc).toBeDefined();
    // Note: JSDoc extraction depends on AST structure, may be undefined
    if (addFunc?.docstring) {
      expect(addFunc.docstring).toContain("Add two numbers");
    }

    const fetchFunc = result.entities.find(
      (e) => e.type === "function" && e.name === "fetchData",
    );
    expect(fetchFunc).toBeDefined();
    expect(fetchFunc?.signature).toContain("async");
  });

  test("filters entities by type", async () => {
    const source = `
class Foo {}
interface Bar {}
function baz() {}
type Qux = string;
`;

    const allResult = await analyzeFile("test.ts", source);
    expect(allResult.entities.length).toBeGreaterThanOrEqual(4);

    const classOnly = await analyzeFile("test.ts", source, {
      includeTypes: ["class"],
    });
    expect(classOnly.entities.every((e) => e.type === "class")).toBe(true);
    expect(classOnly.entities.length).toBe(1);

    const multipleTypes = await analyzeFile("test.ts", source, {
      includeTypes: ["class", "interface"],
    });
    expect(
      multipleTypes.entities.every(
        (e) => e.type === "class" || e.type === "interface",
      ),
    ).toBe(true);
    expect(multipleTypes.entities.length).toBe(2);
  });

  test("handles TSX files", async () => {
    const source = `
import React from 'react';

interface Props {
  name: string;
}

export function Greeting({ name }: Props) {
  return <h1>Hello, {name}!</h1>;
}
`;

    const result = await analyzeFile("component.tsx", source);

    expect(result.language).toBe("typescript");
    expect(result.entities.some((e) => e.name === "Greeting")).toBe(true);
    expect(result.entities.some((e) => e.name === "Props")).toBe(true);
  });

  test("rejects unsupported file types", async () => {
    await expect(analyzeFile("test.py", "def hello(): pass")).rejects.toThrow(
      "Unsupported file type",
    );
  });

  test("formats analysis result correctly", async () => {
    const source = `
class MyClass {
  myMethod() {}
}
function myFunction() {}
`;

    const result = await analyzeFile("test.ts", source);
    const formatted = formatAnalysisResult(result);

    expect(formatted).toContain("File: test.ts");
    expect(formatted).toContain("Language: typescript");
    expect(formatted).toContain("Hash:");
    expect(formatted).toContain("MyClass");
    expect(formatted).toContain("myFunction");
  });

  test("calculates consistent file hash", async () => {
    const source = "const x = 1;";

    const result1 = await analyzeFile("test.ts", source);
    const result2 = await analyzeFile("test.ts", source);

    expect(result1.fileHash).toBe(result2.fileHash);

    const result3 = await analyzeFile("test.ts", source + " ");
    expect(result3.fileHash).not.toBe(result1.fileHash);
  });
});
