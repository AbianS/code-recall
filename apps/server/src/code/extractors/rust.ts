/**
 * Rust Symbol Extractor for code-recall
 *
 * Extracts structs, enums, traits, impls, functions, mods, and macros
 * from Rust source files using tree-sitter.
 */

import type { Node as SyntaxNode, Tree } from "web-tree-sitter";
import type { CodeEntity } from "../types.ts";

/**
 * Extract code entities from a Rust syntax tree.
 */
export function extractRustEntities(tree: Tree, _source: string): CodeEntity[] {
  const entities: CodeEntity[] = [];
  const cursor = tree.walk();

  // Track current impl block for qualified names
  let currentImpl: string | null = null;

  function visit(): void {
    const node = cursor.currentNode;

    switch (node.type) {
      case "struct_item":
        entities.push(extractStruct(node));
        break;

      case "enum_item":
        entities.push(extractEnum(node));
        break;

      case "trait_item":
        entities.push(extractTrait(node));
        break;

      case "impl_item": {
        const implEntity = extractImpl(node);
        entities.push(implEntity);
        currentImpl = implEntity.name;
        break;
      }

      case "function_item":
        entities.push(extractFunction(node, currentImpl));
        break;

      case "mod_item":
        entities.push(extractMod(node));
        break;

      case "macro_definition":
        entities.push(extractMacro(node));
        break;

      case "use_declaration": {
        const importEntity = extractUse(node);
        if (importEntity) entities.push(importEntity);
        break;
      }
    }

    // Traverse children
    if (cursor.gotoFirstChild()) {
      do {
        visit();
      } while (cursor.gotoNextSibling());
      cursor.gotoParent();
    }

    // Reset impl context when leaving impl block
    if (node.type === "impl_item") {
      currentImpl = null;
    }
  }

  visit();
  return entities;
}

function getNodeName(node: SyntaxNode): string {
  const nameNode = node.childForFieldName("name");
  return nameNode?.text ?? "anonymous";
}

function getDocstring(node: SyntaxNode): string | undefined {
  // Look for preceding doc comments (/// or /** */)
  let prev = node.previousNamedSibling;

  // Collect all consecutive doc comments
  const docLines: string[] = [];
  while (prev) {
    if (prev.type === "line_comment" && prev.text.startsWith("///")) {
      docLines.unshift(prev.text.replace(/^\/\/\/\s?/, ""));
      prev = prev.previousNamedSibling;
    } else if (prev.type === "block_comment" && prev.text.startsWith("/**")) {
      const text = prev.text
        .replace(/^\/\*\*\s*/, "")
        .replace(/\s*\*\/$/, "")
        .replace(/^\s*\*\s?/gm, "")
        .trim();
      docLines.unshift(text);
      prev = prev.previousNamedSibling;
    } else if (prev.type === "attribute_item") {
      // Skip attributes like #[derive(...)]
      prev = prev.previousNamedSibling;
    } else {
      break;
    }
  }

  return docLines.length > 0 ? docLines.join("\n") : undefined;
}

function extractStruct(node: SyntaxNode): CodeEntity {
  const name = getNodeName(node);

  let signature = "struct " + name;
  const typeParams = node.childForFieldName("type_parameters");
  if (typeParams) {
    signature += typeParams.text;
  }

  return {
    type: "struct",
    name,
    qualifiedName: name,
    signature,
    docstring: getDocstring(node),
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
  };
}

function extractEnum(node: SyntaxNode): CodeEntity {
  const name = getNodeName(node);

  let signature = "enum " + name;
  const typeParams = node.childForFieldName("type_parameters");
  if (typeParams) {
    signature += typeParams.text;
  }

  return {
    type: "enum",
    name,
    qualifiedName: name,
    signature,
    docstring: getDocstring(node),
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
  };
}

function extractTrait(node: SyntaxNode): CodeEntity {
  const name = getNodeName(node);

  let signature = "trait " + name;
  const typeParams = node.childForFieldName("type_parameters");
  if (typeParams) {
    signature += typeParams.text;
  }

  // Check for trait bounds
  const bounds = node.children.find((c) => c.type === "trait_bounds");
  if (bounds) {
    signature += ": " + bounds.text;
  }

  return {
    type: "trait",
    name,
    qualifiedName: name,
    signature,
    docstring: getDocstring(node),
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
  };
}

function extractImpl(node: SyntaxNode): CodeEntity {
  // impl Type or impl Trait for Type
  const typeNode = node.childForFieldName("type");
  const traitNode = node.childForFieldName("trait");

  let name: string;
  let signature = "impl";

  const typeParams = node.childForFieldName("type_parameters");
  if (typeParams) {
    signature += typeParams.text;
  }

  if (traitNode && typeNode) {
    name = `${traitNode.text} for ${typeNode.text}`;
    signature += ` ${traitNode.text} for ${typeNode.text}`;
  } else if (typeNode) {
    name = typeNode.text;
    signature += ` ${typeNode.text}`;
  } else {
    name = "anonymous";
    signature += " anonymous";
  }

  return {
    type: "impl",
    name,
    qualifiedName: name,
    signature,
    docstring: getDocstring(node),
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
  };
}

function extractFunction(
  node: SyntaxNode,
  implName: string | null,
): CodeEntity {
  const name = getNodeName(node);
  const params = node.childForFieldName("parameters");
  const returnType = node.childForFieldName("return_type");

  let signature = "";

  // Check for visibility
  const visibility = node.children.find(
    (c) => c.type === "visibility_modifier",
  );
  if (visibility) {
    signature += visibility.text + " ";
  }

  // Check for function modifiers (async/const/unsafe)
  const functionModifiers = node.children.find(
    (c) => c.type === "function_modifiers",
  );
  if (functionModifiers) {
    const modifiers: string[] = [];
    for (const child of functionModifiers.children) {
      if (child.type === "async") modifiers.push("async");
      if (child.type === "const") modifiers.push("const");
      if (child.type === "unsafe") modifiers.push("unsafe");
    }
    if (modifiers.length > 0) {
      signature += modifiers.join(" ") + " ";
    }
  }

  signature += "fn " + name;

  const typeParams = node.childForFieldName("type_parameters");
  if (typeParams) {
    signature += typeParams.text;
  }

  if (params) {
    signature += params.text;
  }

  if (returnType) {
    signature += " -> " + returnType.text;
  }

  const qualifiedName = implName ? `${implName}::${name}` : name;

  return {
    type: implName ? "method" : "function",
    name,
    qualifiedName,
    signature,
    docstring: getDocstring(node),
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
  };
}

function extractMod(node: SyntaxNode): CodeEntity {
  const name = getNodeName(node);

  let signature = "";
  const visibility = node.children.find(
    (c) => c.type === "visibility_modifier",
  );
  if (visibility) {
    signature += visibility.text + " ";
  }
  signature += "mod " + name;

  return {
    type: "mod",
    name,
    qualifiedName: name,
    signature,
    docstring: getDocstring(node),
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
  };
}

function extractMacro(node: SyntaxNode): CodeEntity {
  const name = getNodeName(node);

  return {
    type: "macro",
    name,
    qualifiedName: name,
    signature: `macro_rules! ${name}`,
    docstring: getDocstring(node),
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
  };
}

function extractUse(node: SyntaxNode): CodeEntity | null {
  // Get the use path
  const argument = node.childForFieldName("argument");
  if (!argument) return null;

  const path = argument.text;

  return {
    type: "import",
    name: path,
    qualifiedName: path,
    signature: `use ${path}`,
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
  };
}
