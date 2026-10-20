/** Stand-in for expo-crypto inside the Worker (see wrangler.jsonc `alias`). */
export const randomUUID = (): string => crypto.randomUUID();
