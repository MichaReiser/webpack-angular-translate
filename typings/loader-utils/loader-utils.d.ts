declare module "loader-utils" {
    export function parseQuery(query: string): {[property: string]: any };
    export function parseQuery(): {[property: string]: any };
}
