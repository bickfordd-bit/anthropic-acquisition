import path from "path";
import { fileURLToPath } from "url";

// `verifyDataRoom.ts` executes immediately on import (main() at module top-level).
// Set defaults BEFORE importing it.
const here = path.dirname(fileURLToPath(import.meta.url));
process.env.DATA_ROOM_OUT ??= path.join(here, "..", "bickford-acquisition-data-room");

// Reuse the repo's deterministic verifier: it validates MANIFEST + CANON + LEDGER hash chains.
import "./verifyDataRoom";
