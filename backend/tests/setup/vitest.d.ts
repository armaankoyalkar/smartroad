/** Values shared from globalSetup (provide) with the test files (inject). */
declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string | null;
  }
}

export {};
