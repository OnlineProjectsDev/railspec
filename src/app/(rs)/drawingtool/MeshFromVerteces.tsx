// MeshFromVertices.tsx
'use client';

import * as THREE from 'three';
import { useMemo, useEffect } from 'react';
import { ThreeElements } from '@react-three/fiber';

type Vec3 = { x: number; y: number; z: number } | THREE.Vector3;

export type MeshFromVerticesProps = Omit<ThreeElements['group'], 'children'> & {
  reactId?: string;

  /** Mesh appearance */
  color?: number;
  transparent?: boolean;
  opacity?: number;
  wireframe?: boolean;
  receiveShadow?: boolean;
  castShadow?: boolean;

  /** Geometry definition */
  vertices: Vec3[] | number[];     // Vec3[] or flat number[]
  indices?: number[];              // triangle indices (optional)
  autoComputeNormals?: boolean;    // defaults true

  /** Optional edge overlay */
  edgePairs?: Array<[number, number]>;  // pairs of vertex indices to connect
  edgeColor?: number;                   // default 0x222222
  edgeTransparent?: boolean;            // default false
  edgeOpacity?: number;                 // default 1
};

function toPositionArray(verts: Vec3[] | number[]): Float32Array {
  if (Array.isArray(verts) && typeof verts[0] === 'number') {
    return new Float32Array(verts as number[]);
  }
  const v = verts as Vec3[];
  const out = new Float32Array(v.length * 3);
  for (let i = 0; i < v.length; i++) {
    const p = v[i] as any;
    out[i * 3 + 0] = p.x;
    out[i * 3 + 1] = p.y;
    out[i * 3 + 2] = p.z;
  }
  return out;
}

function buildMeshGeometry(
  vertices: Vec3[] | number[],
  indices?: number[],
  autoNormals = true
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const pos = toPositionArray(vertices);
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  if (indices && indices.length) {
    geom.setIndex(indices);
  }
  if (autoNormals) geom.computeVertexNormals();
  geom.computeBoundingSphere();
  geom.computeBoundingBox();
  return geom;
}

/** Build a LineSegments geometry from edge pairs referencing the same vertex set */
function buildEdgeGeometry(
  vertices: Vec3[] | number[],
  edgePairs: Array<[number, number]>
): THREE.BufferGeometry {
  const pos = toPositionArray(vertices);
  const vertCount = pos.length / 3;

  const linePositions = new Float32Array(edgePairs.length * 2 * 3);
  let w = 0;

  const writeVertex = (idx: number) => {
    if (idx < 0 || idx >= vertCount) return; // guard
    const base = idx * 3;
    linePositions[w++] = pos[base + 0];
    linePositions[w++] = pos[base + 1];
    linePositions[w++] = pos[base + 2];
  };

  for (const [a, b] of edgePairs) {
    writeVertex(a);
    writeVertex(b);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  g.computeBoundingSphere();
  return g;
}

export function MeshFromVertices({
  reactId,

  color = 0xcccccc,
  transparent = false,
  opacity = 1,
  wireframe = false,
  receiveShadow = true,
  castShadow = true,

  vertices,
  indices,
  autoComputeNormals = true,

  edgePairs,
  edgeColor = 0x222222,
  edgeTransparent = false,
  edgeOpacity = 1,

  ...groupProps
}: MeshFromVerticesProps) {
  // Mesh geometry & material
  const meshGeometry = useMemo(
    () => buildMeshGeometry(vertices, indices, autoComputeNormals),
    [vertices, indices, autoComputeNormals]
  );
  useEffect(() => () => meshGeometry.dispose(), [meshGeometry]);

  const meshMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        transparent,
        opacity,
        wireframe,
        side: THREE.DoubleSide,
      }),
    [color, transparent, opacity, wireframe]
  );
  useEffect(() => () => meshMaterial.dispose(), [meshMaterial]);

  // Optional edges
  const edgeGeometry = useMemo(() => {
    if (!edgePairs || edgePairs.length === 0) return null;
    return buildEdgeGeometry(vertices, edgePairs);
  }, [vertices, edgePairs]);
  useEffect(() => {
    return () => {
      edgeGeometry?.dispose();
    };
  }, [edgeGeometry]);

  const edgeMaterial = useMemo(() => {
    if (!edgeGeometry) return null;
    return new THREE.LineBasicMaterial({
      color: edgeColor,
      transparent: edgeTransparent,
      opacity: edgeOpacity,
      depthTest: true,
      depthWrite: false, // keep lines visible over the surface
    });
  }, [edgeGeometry, edgeColor, edgeTransparent, edgeOpacity]);
  useEffect(() => () => edgeMaterial?.dispose(), [edgeMaterial]);

  return (
    <group key={reactId ?? undefined} {...groupProps}>
      <mesh
        geometry={meshGeometry}
        material={meshMaterial}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      />
      {edgeGeometry && edgeMaterial && (
        <lineSegments geometry={edgeGeometry} material={edgeMaterial} />
      )}
    </group>
  );
}
