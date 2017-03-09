declare module "loader-utils" {
    export function getOptions<T>(loaderContext: { query: string | { [name: string] : any } }): T;
}
