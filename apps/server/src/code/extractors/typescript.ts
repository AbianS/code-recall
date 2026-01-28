/**
 * TypeScript/TSX Symbol Extractor for code-recall
 *
 * Extracts classes, functions, methods, interfaces, types, and imports
 * from TypeScript source files using tree-sitter.
 */

import type { Node as SyntaxNode, Tree } from "web-tree-sitter";
import type { CodeEntity } from "../types.ts";

/**
 * Extract code entities from a TypeScript/TSX syntax tree.
 */
export function extractTypeScriptEntities(
  tree: Tree,
  _source: string,
): CodeEntity[] {
  const entities: CodeEntity[] = [];
  const cursor = tree.walk();

  // Track current class for qualified names
  let currentClass: string | null = null;

  function visit(): void {
    const node = cursor.currentNode;

    switch (node.type) {
      case "class_declaration":
        entities.push(extractClass(node));
        // Enter class to extract methods
        currentClass = getNodeName(node);
        break;

      case "function_declaration":
        entities.push(extractFunction(node));
        break;

      case "method_definition":
        entities.push(extractMethod(node, currentClass));
        break;

      case "interface_declaration":
        entities.push(extractInterface(node));
        break;

      case "type_alias_declaration":
        entities.push(extractTypeAlias(node));
        break;

      case "lexical_declaration": {
        // Handle const/let exports (e.g., export const foo = ...)
        const varEntities = extractVariables(node);
        entities.push(...varEntities);
        break;
      }

      case "import_statement": {
        const importEntity = extractImport(node);
        if (importEntity) entities.push(importEntity);
        break;
      }

      case "export_statement":
        // Handle exported declarations
        break;
    }

    // Traverse children
    if (cursor.gotoFirstChild()) {
      do {
        visit();
      } while (cursor.gotoNextSibling());
      cursor.gotoParent();
    }

    // Reset class context when leaving class body
    if (node.type === "class_declaration") {
      currentClass = null;
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
  // Look for preceding comment
  let prev = node.previousNamedSibling;
  while (prev && prev.type === "decorator") {
    prev = prev.previousNamedSibling;
  }

  if (prev && prev.type === "comment") {
    const text = prev.text;
    // Check if it's a JSDoc comment
    if (text.startsWith("/**")) {
      return text
        .replace(/^\/\*\*\s*/, "")
        .replace(/\s*\*\/$/, "")
        .replace(/^\s*\*\s?/gm, "")
        .trim();
    }
  }
  return undefined;
}

function extractClass(node: SyntaxNode): CodeEntity {
  const name = getNodeName(node);

  // Build signature
  let signature = "class " + name;
  const heritage = node.childForFieldName("extends");
  if (heritage) {
    signature += " extends " + heritage.text;
  }
  const impl = node.children.find((c) => c.type === "implements_clause");
  if (impl) {
    signature += " " + impl.text;
  }

  return {
    type: "class",
    name,
    qualifiedName: name,
    signature,
    docstring: getDocstring(node),
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
  };
}

function extractFunction(node: SyntaxNode): CodeEntity {
  const name = getNodeName(node);
  const params = node.childForFieldName("parameters");
  const returnType = node.childForFieldName("return_type");

  let signature = "";
  const isAsync = node.children.some((c) => c.type === "async");
  if (isAsync) signature += "async ";
  signature += "function " + name;
  if (params) signature += params.text;
  if (returnType) signature += ": " + returnType.text;

  return {
    type: "function",
    name,
    qualifiedName: name,
    signature,
    docstring: getDocstring(node),
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
  };
}

function extractMethod(node: SyntaxNode, className: string | null): CodeEntity {
  const name = getNodeName(node);
  const params = node.childForFieldName("parameters");
  const returnType = node.childForFieldName("return_type");

  let signature = "";
  const isAsync = node.children.some((c) => c.type === "async");
  const isStatic = node.children.some((c) => c.text === "static");
  if (isStatic) signature += "static ";
  if (isAsync) signature += "async ";
  signature += name;
  if (params) signature += params.text;
  if (returnType) signature += ": " + returnType.text;

  const qualifiedName = className ? `${className}.${name}` : name;

  return {
    type: "method",
    name,
    qualifiedName,
    signature,
    docstring: getDocstring(node),
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
  };
}

function extractInterface(node: SyntaxNode): CodeEntity {
  const name = getNodeName(node);

  let signature = "interface " + name;
  const typeParams = node.childForFieldName("type_parameters");
  if (typeParams) signature += typeParams.text;
  const ext = node.children.find((c) => c.type === "extends_type_clause");
  if (ext) signature += " " + ext.text;

  return {
    type: "interface",
    name,
    qualifiedName: name,
    signature,
    docstring: getDocstring(node),
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
  };
}

function extractTypeAlias(node: SyntaxNode): CodeEntity {
  const name = getNodeName(node);
  const value = node.childForFieldName("value");

  let signature = "type " + name;
  const typeParams = node.childForFieldName("type_parameters");
  if (typeParams) signature += typeParams.text;
  if (value) {
    // Truncate long type definitions
    const valueText = value.text;
    signature +=
      " = " +
      (valueText.length > 100 ? valueText.slice(0, 100) + "..." : valueText);
  }

  return {
    type: "type",
    name,
    qualifiedName: name,
    signature,
    docstring: getDocstring(node),
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
  };
}

function extractVariables(node: SyntaxNode): CodeEntity[] {
  const entities: CodeEntity[] = [];
  const kind = node.children[0]?.text; // 'const', 'let', or 'var'

  // Find all variable declarators
  for (const child of node.children) {
    if (child.type === "variable_declarator") {
      const name = child.childForFieldName("name")?.text ?? "unknown";
      const type = child.childForFieldName("type");
      const value = child.childForFieldName("value");

      // Skip internal/private variables (starting with _)
      if (name.startsWith("_")) continue;

      let signature = kind + " " + name;
      if (type) signature += ": " + type.text;
      if (value) {
        // Show function/arrow function signature
        if (value.type === "arrow_function" || value.type === "function") {
          const params = value.childForFieldName("parameters");
          const returnType = value.childForFieldName("return_type");
          signature += " = ";
          if (params) signature += params.text;
          if (returnType) signature += ": " + returnType.text;
          signature += " => ...";
        }
      }

      entities.push({
        type: "variable",
        name,
        qualifiedName: name,
        signature,
        docstring: getDocstring(node),
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
      });
    }
  }

  return entities;
}

function extractImport(node: SyntaxNode): CodeEntity | null {
  const sourceNode = node.childForFieldName("source");
  if (!sourceNode) return null;

  const importSource = sourceNode.text.replace(/['"]/g, "");

  // Get imported names
  const clause = node.children.find((c) => c.type === "import_clause");
  const names: string[] = [];

  if (clause) {
    // Default import
    const defaultImport = clause.children.find((c) => c.type === "identifier");
    if (defaultImport) names.push(defaultImport.text);

    // Named imports
    const namedImports = clause.children.find(
      (c) => c.type === "named_imports",
    );
    if (namedImports) {
      for (const spec of namedImports.children) {
        if (spec.type === "import_specifier") {
          const name = spec.childForFieldName("name")?.text;
          if (name) names.push(name);
        }
      }
    }

    // Namespace import
    const namespaceImport = clause.children.find(
      (c) => c.type === "namespace_import",
    );
    if (namespaceImport) {
      const alias = namespaceImport.children.find(
        (c) => c.type === "identifier",
      );
      if (alias) names.push("* as " + alias.text);
    }
  }

  const signature = `import { ${names.join(", ")} } from '${importSource}'`;

  return {
    type: "import",
    name: importSource,
    qualifiedName: importSource,
    signature,
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
  };
}
