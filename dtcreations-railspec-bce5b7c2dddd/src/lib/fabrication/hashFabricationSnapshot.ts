// /lib/fabrication/hashFabricationSnapshot.ts
import { createHash } from "crypto"

import type { StageFabricationPartRow } from "@/app/(rs)/fabrication/deriveStageFabricationRawParts"
import { normalizeFabricationSnapshot } from "./normalizeFabricationSnapshot"

export function hashFabricationSnapshot(parts: StageFabricationPartRow[]) {
  const normalized = normalizeFabricationSnapshot(parts)
  const json = JSON.stringify(normalized)

  return createHash("sha256").update(json).digest("hex")
}