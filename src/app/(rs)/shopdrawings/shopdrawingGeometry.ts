// src/app/(rs)/shopdrawings/shopdrawingGeometry.ts
import type { PostsType, FoundationType } from "@/app/(rs)/drawingtool/canvas/DropAnalyser";

export function normaliseFoundationArray(raw: unknown): FoundationType[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const obj = item as Record<string, unknown>;
    return {
      id: toNumberOr(obj.id, index + 1),
      type: typeof obj.type === "string" ? obj.type : "F",
      length: toNumberOr(obj.length, 0),
      angle: toNumberOr(obj.angle, 180),
      offset: toNumberOr(obj.offset, 0),
      sections: toNumberOr(obj.sections, 0),
      height: toNumberOr(obj.height, 0),
      x: toNumberOr(obj.x, 0),
      z: toNumberOr(obj.z, 0),
      y: toNumberOr(obj.y, 0),
    } satisfies FoundationType;
  });
}

export function normalisePostsArray(raw: unknown): PostsType[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const obj = item as Record<string, unknown>;
    return {
      id: toNumberOr(obj.id, index + 1),
      post_id: toNumberOr(obj.post_id, index + 1),
      type: typeof obj.type === "string" ? obj.type : "BP",
      length: toNumberOr(obj.length, 0),
      angle: toNumberOr(obj.angle, 180),
      reversed: typeof obj.reversed === "boolean" ? obj.reversed : false,
      height: toNumberOr(obj.height, 0),
      x: toNumberOr(obj.x, 0),
      z: toNumberOr(obj.z, 0),
      y_ref1: toNumberOr(obj.y_ref1, 0),
      y_ref2: toNumberOr(obj.y_ref2, 0),
      y_ref3: toNumberOr(obj.y_ref3, 0),
    } satisfies PostsType;
  });
}

// Keep this version (your “works as well since post.post_id is already correct” approach):
function rotate(cx: number, cy: number, x: number, y: number, angle: number) {
  const radians = (Math.PI * angle) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const nx = cos * (x - cx) + sin * (y - cy) + cx;
  const ny = cos * (y - cy) - sin * (x - cx) + cy;
  return { x: Math.round(nx), z: Math.round(ny) };
}

export function computeGeometryPosts(posts: PostsType[]) {
  if (!posts.length) return posts;

  let xz = { x: posts[0].x, z: posts[0].z };
  let angleSum = 0;

  return posts.map((post, i) => {
    angleSum += post.angle + 180;
    const nextP = rotate(xz.x, xz.z, xz.x + post.length, xz.z, angleSum);
    const prevP = { x: xz.x, z: xz.z };
    xz = nextP;

    return {
      ...post,
      id: i,
      // ✅ do NOT override post_id
      length: i < posts.length - 1 ? post.length : 0,
      angle: i < posts.length - 1 ? post.angle : 180,
      x: prevP.x,
      z: prevP.z,
    } satisfies PostsType;
  });
}

export function toNumberOr<TDefault extends number>(value: unknown, fallback: TDefault): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}