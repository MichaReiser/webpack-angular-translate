declare module "ast-types" {
  import * as ESTree from "estree";

  export interface Type {
    check(node: ESTree.Node): boolean;
  }

  export interface NamedTypes {
    Identifier: Type;
    Literal: Type;
    ArrayExpression: Type;
    MemberExpression: Type;
    FunctionExpression: Type;
    ObjectExpression: Type;
    BlockStatement: Type;
    Program: Type;
  }

  export interface Builders {
    identifier(name: string): ESTree.Identifier;
    literal(name: string): ESTree.Literal;
    arrayExpression(
      elements: Array<ESTree.Expression | ESTree.SpreadElement>
    ): ESTree.ArrayExpression;
  }

  export interface NodePath<N extends ESTree.Node> {
    node: N;
    parent: NodePath<any>;
    parentPath: NodePath<any>;
    name: string | number;
    replace(replacement: ESTree.Node): void;
    prune(): void;
  }

  export interface Context {
    reset(): void;
    traverse<N extends ESTree.Node>(path: NodePath<N>): void;
  }

  export class PathVisitor {
    AbortRequest: typeof Error;
    abort(): void;
    visit(ast: ESTree.Node): ESTree.Node;
  }

  export interface Visitor {
    visitCallExpression?: (path: NodePath<ESTree.CallExpression>) => boolean;
  }

  export var namedTypes: NamedTypes;
  export var builders: Builders;
  export function visit(ast: ESTree.Program, visitor: Visitor): void;
}
