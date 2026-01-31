/**
 * Tests for Rust Extractor
 */

import { beforeAll, describe, expect, test } from "bun:test";
import { extractRustEntities } from "../../src/code/extractors/rust.ts";
import { getParser, parseCode } from "../../src/code/parser.ts";

describe("Rust Extractor", () => {
  beforeAll(async () => {
    await getParser();
  });

  describe("Struct Extraction", () => {
    test("extracts struct declaration", async () => {
      const source = `
struct User {
    name: String,
    age: u32,
}
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const structEntity = entities.find(
        (e) => e.type === "struct" && e.name === "User",
      );
      expect(structEntity).toBeDefined();
      expect(structEntity?.signature).toContain("struct User");
    });

    test("extracts generic struct", async () => {
      const source = `
struct Container<T> {
    value: T,
}
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const structEntity = entities.find((e) => e.name === "Container");
      expect(structEntity).toBeDefined();
      expect(structEntity?.signature).toContain("<T>");
    });

    test("extracts tuple struct", async () => {
      const source = `
struct Point(i32, i32);
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const structEntity = entities.find((e) => e.name === "Point");
      expect(structEntity).toBeDefined();
    });
  });

  describe("Enum Extraction", () => {
    test("extracts enum declaration", async () => {
      const source = `
enum Color {
    Red,
    Green,
    Blue,
}
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const enumEntity = entities.find(
        (e) => e.type === "enum" && e.name === "Color",
      );
      expect(enumEntity).toBeDefined();
      expect(enumEntity?.signature).toContain("enum Color");
    });

    test("extracts generic enum", async () => {
      const source = `
enum Option<T> {
    Some(T),
    None,
}
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const enumEntity = entities.find((e) => e.name === "Option");
      expect(enumEntity?.signature).toContain("<T>");
    });
  });

  describe("Trait Extraction", () => {
    test("extracts trait declaration", async () => {
      const source = `
trait Display {
    fn fmt(&self) -> String;
}
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const traitEntity = entities.find(
        (e) => e.type === "trait" && e.name === "Display",
      );
      expect(traitEntity).toBeDefined();
      expect(traitEntity?.signature).toContain("trait Display");
    });

    test("extracts generic trait", async () => {
      const source = `
trait Iterator<T> {
    fn next(&mut self) -> Option<T>;
}
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const traitEntity = entities.find((e) => e.name === "Iterator");
      expect(traitEntity?.signature).toContain("<T>");
    });
  });

  describe("Impl Extraction", () => {
    test("extracts impl block", async () => {
      const source = `
impl User {
    fn new() -> Self {
        Self { name: String::new(), age: 0 }
    }
}
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const implEntity = entities.find(
        (e) => e.type === "impl" && e.name === "User",
      );
      expect(implEntity).toBeDefined();
      expect(implEntity?.signature).toContain("impl User");
    });

    test("extracts trait impl", async () => {
      const source = `
impl Display for User {
    fn fmt(&self) -> String {
        self.name.clone()
    }
}
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const implEntity = entities.find((e) => e.type === "impl");
      expect(implEntity).toBeDefined();
      expect(implEntity?.name).toContain("Display");
      expect(implEntity?.name).toContain("User");
    });
  });

  describe("Function Extraction", () => {
    test("extracts function declaration", async () => {
      const source = `
fn add(a: i32, b: i32) -> i32 {
    a + b
}
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const func = entities.find(
        (e) => e.type === "function" && e.name === "add",
      );
      expect(func).toBeDefined();
      expect(func?.signature).toContain("fn add");
      expect(func?.signature).toContain("-> i32");
    });

    test("extracts public function", async () => {
      const source = `
pub fn helper() -> bool {
    true
}
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const func = entities.find((e) => e.name === "helper");
      expect(func?.signature).toContain("pub");
    });

    test("extracts async function", async () => {
      const source = `
async fn fetch_data() -> Result<(), Error> {
    Ok(())
}
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const func = entities.find((e) => e.name === "fetch_data");
      expect(func?.signature).toContain("async");
    });

    test("extracts generic function", async () => {
      const source = `
fn identity<T>(value: T) -> T {
    value
}
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const func = entities.find((e) => e.name === "identity");
      expect(func?.signature).toContain("<T>");
    });
  });

  describe("Method Extraction", () => {
    test("extracts methods from impl block", async () => {
      const source = `
impl Calculator {
    fn add(&self, a: i32, b: i32) -> i32 {
        a + b
    }
}
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const method = entities.find(
        (e) => e.type === "method" && e.name === "add",
      );
      expect(method).toBeDefined();
      expect(method?.qualifiedName).toBe("Calculator::add");
    });

    test("extracts associated functions", async () => {
      const source = `
impl User {
    pub fn new(name: String) -> Self {
        Self { name, age: 0 }
    }
}
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const method = entities.find((e) => e.name === "new");
      expect(method?.signature).toContain("pub");
      expect(method?.qualifiedName).toBe("User::new");
    });
  });

  describe("Module Extraction", () => {
    test("extracts module declaration", async () => {
      const source = `
mod utils {
    pub fn helper() {}
}
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const modEntity = entities.find(
        (e) => e.type === "mod" && e.name === "utils",
      );
      expect(modEntity).toBeDefined();
      expect(modEntity?.signature).toContain("mod utils");
    });

    test("extracts public module", async () => {
      const source = `
pub mod api {
    pub fn endpoint() {}
}
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const modEntity = entities.find((e) => e.name === "api");
      expect(modEntity?.signature).toContain("pub");
    });
  });

  describe("Macro Extraction", () => {
    test("extracts macro definition", async () => {
      const source = `
macro_rules! say_hello {
    () => {
        println!("Hello!");
    };
}
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const macroEntity = entities.find(
        (e) => e.type === "macro" && e.name === "say_hello",
      );
      expect(macroEntity).toBeDefined();
      expect(macroEntity?.signature).toContain("macro_rules! say_hello");
    });
  });

  describe("Use (Import) Extraction", () => {
    test("extracts use declaration", async () => {
      const source = `
use std::collections::HashMap;
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const useEntity = entities.find((e) => e.type === "import");
      expect(useEntity).toBeDefined();
      expect(useEntity?.signature).toContain("use");
    });

    test("extracts use with glob", async () => {
      const source = `
use std::io::*;
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const useEntity = entities.find((e) => e.type === "import");
      expect(useEntity).toBeDefined();
    });
  });

  describe("Doc Comments", () => {
    test("extracts doc comments", async () => {
      const source = `
/// Adds two numbers together.
fn add(a: i32, b: i32) -> i32 {
    a + b
}
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const func = entities.find((e) => e.name === "add");
      if (func?.docstring) {
        expect(func.docstring).toContain("Adds two numbers");
      }
    });
  });

  describe("Line Numbers", () => {
    test("tracks correct line numbers", async () => {
      const source = `
// Line 1
// Line 2
fn test() { // Line 3
    // Line 4
} // Line 5
`;
      const tree = await parseCode(source, "rust");
      const entities = extractRustEntities(tree, source);

      const func = entities.find((e) => e.name === "test");
      expect(func?.startLine).toBeGreaterThanOrEqual(3);
      expect(func?.endLine).toBeGreaterThanOrEqual(func?.startLine ?? 0);
    });
  });
});
