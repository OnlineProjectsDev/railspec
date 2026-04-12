// /app/(rs)/fabrication/deriveRootStateFabricationParts.ts
import type { RootState } from "@/lib/types"
import type {
  FabricationComponentPart,
  FabricationExtrusionPart,
  FabricationGlassPart,
} from "./deriveFabricationParts"
import { deriveBayFabricationParts } from "./deriveBayFabricationParts"
import { derivePostFabricationParts, derivePostComponentFabricationParts } from "./derivePostFabricationParts"
import { deriveToprailFabricationParts, deriveToprailComponentFabricationParts } from "./deriveToprailFabricationParts"
import { deriveFramelessComponentFabricationParts } from "./deriveFramelessComponentFabricationParts"
import { applyPostDrillingToFabricationParts } from "./derivePostDrilling"

export type DerivedRootStateFabricationParts = {
  extrusions: FabricationExtrusionPart[]
  glass: FabricationGlassPart[]
  components: FabricationComponentPart[]
}

export function deriveRootStateFabricationParts(
  state: RootState
): DerivedRootStateFabricationParts {
  const postParts = derivePostFabricationParts(state)
  const postComponentParts = derivePostComponentFabricationParts(state)
  const toprailParts = deriveToprailFabricationParts(state)
  const toprailComponentParts = deriveToprailComponentFabricationParts(state)
  const bayParts = deriveBayFabricationParts(state)
  const framelessComponentParts = deriveFramelessComponentFabricationParts(state)

  const drilledPostParts = applyPostDrillingToFabricationParts({
    state,
    postParts,
    bayParts: bayParts.extrusions,
  })

  return {
    extrusions: [
      ...drilledPostParts,
      ...toprailParts,
      ...bayParts.extrusions,
    ],
    glass: bayParts.glass,
    components: [
      ...postComponentParts,
      ...toprailComponentParts,
      ...framelessComponentParts,
    ],
  }
}