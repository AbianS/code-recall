/**
 * Test Setup Utilities for code-recall
 *
 * Shared utilities and fixtures for tests.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseManager } from "../src/database/index.ts";

/**
 * Create a temporary test database.
 * Returns the database instance, directory path, and cleanup function.
 */
export function createTestDb() {
  const dir = mkdtempSync(join(tmpdir(), "code-recall-test-"));
  const db = new DatabaseManager({ projectPath: dir });
  return {
    db,
    dir,
    cleanup: () => {
      db.close();
      rmSync(dir, { recursive: true });
    },
  };
}

/**
 * Sample TypeScript code for testing extractors.
 */
export const SAMPLE_TS_CODE = `
/**
 * Sample class for testing
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

interface User {
  id: number;
  name: string;
  email: string;
}

type UserRole = 'admin' | 'user' | 'guest';

export const DEFAULT_ROLE: UserRole = 'user';

export function validateEmail(email: string): boolean {
  return email.includes('@');
}
`;

/**
 * Sample JavaScript code for testing extractors.
 */
export const SAMPLE_JS_CODE = `
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

class Calculator {
  constructor() {
    this.result = 0;
  }

  add(value) {
    this.result += value;
    return this;
  }

  reset() {
    this.result = 0;
    return this;
  }
}
`;

/**
 * Sample TSX code for testing extractors.
 */
export const SAMPLE_TSX_CODE = `
import React from 'react';

interface Props {
  name: string;
  count?: number;
}

export function Greeting({ name, count = 0 }: Props) {
  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>Count: {count}</p>
    </div>
  );
}

export const Button: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return <button onClick={onClick}>Click me</button>;
};
`;

/**
 * Wait for a specific amount of time (useful for testing time-based features).
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random string for unique test data.
 */
export function randomString(length: number = 8): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}
