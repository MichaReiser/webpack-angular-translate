

declare module escodegen {
    interface Options {
        format?: {
            indent?: {
                style?: string,
                base?: number,
                adjustMultilineComment?: boolean
            },
            newline?: string,
            space?: string,
            json?: boolean,
            renumber?: boolean,
            hexadecimal?: boolean,
            quotes?: string,
            escapeless?: boolean,
            compact?: boolean,
            parentheses?: boolean,
            semicolons?: boolean,
            safeConcatenation?: boolean
        },
        moz?: {
            starlessGenerator?: boolean,
            parenthesizedComprehensionBlock?: boolean,
            comprehensionExpressionStartsWithAssignment?: boolean
        },
        parse?: Function,
        comment?: boolean,
        sourceMap?: string | boolean,
        sourceMapRoot?: string,
        sourceMapWithCode?: boolean,
        file?: string,
        sourceContent?: string,
        directive?: boolean,
        verbatim?: any;
    }

    function generate(ast: ESTree.Node, options?: Options): string | SourceMap.CodeWithSourceMap;
}

declare module "escodegen" {
    export = escodegen;
}