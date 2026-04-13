// src/app/(rs)/foundation-editor/derive/foundationTypes.ts
export type FoundationRole = "RUN_SEGMENT" | "PERP_OFFSET_START" | "PERP_OFFSET_END" | "RUN_BREAK" | "SPACE_ZONE";

export type FoundationType = {
  id: number;
  type: string; // support/environment: FLOOR | HOB | LOW_WALL | WALL | SPACE
  length: number; // mm
  angle: number; // degrees (-180..180). USER-FACING: 180 = straight, +90 = turn right, -90 = turn left
  offset: number; // mm (for RUN_SEGMENT: parallel offset; for PERP rows: trim along run direction)
  sections: number;
  height: number; // mm (placeholder; will matter later for y refs)
  x: number; // mm (ignored in milestone 0.x)
  z: number; // mm (ignored in milestone 0.x)
  y: number; // mm (ignored in milestone 0.x)
  meta?: {
    role?: FoundationRole;
    runId?: string;
    source?: {
      kind: "FLOOR" | "WALL" | "HOB" | "SPACE" | "LOW_WALL";
      objectId?: string;
      edgeIndex?: number;
    };
  };
};