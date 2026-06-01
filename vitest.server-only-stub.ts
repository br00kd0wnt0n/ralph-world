// Empty stub — aliased in place of the `server-only` package during tests.
// The real package throws at import time outside a Next server context;
// in vitest's jsdom env that prevents server-coupled modules from being
// unit-tested. `next build` still enforces the server-only guard.
export {}
