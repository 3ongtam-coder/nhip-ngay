// Augment the cloudflare:workers Env interface so TypeScript knows
// which bindings are available in this project.
// See: https://developers.cloudflare.com/workers/configuration/bindings/

declare module "cloudflare:workers" {
  interface Env {
    DB: D1Database;
    ASSETS: Fetcher;
  }
}
