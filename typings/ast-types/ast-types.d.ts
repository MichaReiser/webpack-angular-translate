declare namespace AstTypes {
  interface Type {
    check(node: ESTree.Node): boolean;
  }

  interface NamedTypes {
    Identifier: Type;
    Literal: Type;
    ArrayExpression: Type;
    MemberExpression: Type;
    FunctionExpression: Type;
    ObjectExpression: Type;
    BlockStatement: Type;
    Program: Type;
  }

  interface Builders {
    identifier(name: string): ESTree.Identifier;
    literal(name: string): ESTree.Literal;
    arrayExpression(
      elements: Array<ESTree.Expression | ESTree.SpreadElement>
    ): ESTree.ArrayExpression;
  }

  interface NodePath<N extends ESTree.Node> {
    node: N;
    parent: NodePath<any>;
    parentPath: NodePath<any>;
    name: string | number;
    replace(replacement: ESTree.Node): void;
    prune(): void;
  }

  interface Context {
    reset(): void;
    traverse<N extends ESTree.Node>(path: NodePath<N>): void;
  }

  class PathVisitor {
    AbortRequest: typeof Error;
    abort(): void;
    visit(ast: ESTree.Node): ESTree.Node;
  }

  interface Visitor {
    visitCallExpression?: (path: NodePath<ESTree.CallExpression>) => boolean;
  }

  var namedTypes: NamedTypes;
  var builders: Builders;
  function visit(ast: ESTree.Program, visitor: Visitor): void;
}

declare module "ast-types" {
  export = AstTypes;
}
