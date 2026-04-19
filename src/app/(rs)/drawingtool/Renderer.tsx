// /app/(rs)/drawingtool/Renderer.tsx
import { FC, useRef, useState, useEffect } from 'react'
// import { Retool } from '@tryretool/custom-component-support'
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { MeshStandardMaterial } from 'three';
import * as THREE from 'three'
import { CameraControls as CameraControlsDrei } from '@react-three/drei';
import type CameraControls from 'camera-controls'; // ✅ default type import
import { useGLTF, useTexture, Decal, Environment, OrbitControls, RandomizedLight, AccumulativeShadows } from '@react-three/drei'
import { Posts, Baseplates, Mid_Rails, Top_Rails, Vertical_Infills, Fixed_Components, Glass_Infills, Hob_Walls, Floor_Planes } from '@/app/(rs)/drawingtool/Partloader'
import { PlaneVec, InfillVectors, ToprailVectors } from '@/app/(rs)/drawingtool/canvas/DropAnalyser';

type LoadPartsPropsType = {
  powdercoat_color: number;
  posts_data_array: {id: number, partName:string,  type:string, height:number, x:number, y:number, z:number, o:number, t:number}[];
  baseplates_data_array: {partName:string, id:number, type:string, x:number,  y:number,  z:number,  o:number}[];
  vertical_infill_data_array: {partName: string, post_id: number, id: number, length: number, x: number, y: number, z: number, o: number, t: number}[];
  glass_infill_data_array: {partName: string, post_id: number, id: number, height: number, length: number, thickness: number, x: number, y: number, z: number, o: number, t: number}[];
  mid_rail_data_array: {partName:string, post_id:number, id:number,  length: number, x:number, y:number, z:number,  o:number, t:number}[];
  top_rail_data_array:{partName:string, id:number,  length: number, x:number, y:number, z:number,  o:number, t:number}[];
  fixed_components_data_array:  {partName: string, id: number, x: number, y: number, z: number, o: number, t: number}[];
  posts_vectors_array: {id: number, x: number, y: number, z: number, v_x: number, v_y: number, v_z: number}[];
  infill_vectors_array:InfillVectors[];
  toprail_vectors_array:ToprailVectors[];
  allowed_length: number;
  wall_data_array:{partName: string, id: number, length: number, height: number, x: number, y: number, z: number, o: number, t: number}[];
  foundation_array:{x:number,y:number,z:number}[];
  showLaser:boolean;
  showDimensions:boolean;
  showCuttingPlanes:boolean;
  on_loaded?: () => void;
  viewer_id?: string | number;
}

type RendererProps = {
  ready: boolean;
  powdercoat_color: number;
  lighting: {ambient_intensity:number, ambient_color:number, light_intensity:number, light_color:number, x:number, y:number, z:number};
  posts_data_array: {id: number, partName:string,  type:string, height:number, x:number, y:number, z:number, o:number, t:number}[];
  baseplates_data_array: {partName:string, id:number, type:string, x:number,  y:number,  z:number,  o:number}[];
  vertical_infill_data_array: {partName: string, post_id: number, id: number, length: number, x: number, y: number, z: number, o: number, t: number}[];
  glass_infill_data_array: {partName: string, post_id: number, id: number, height: number, length: number, thickness: number, x: number, y: number, z: number, o: number, t: number}[];
  mid_rail_data_array: {partName:string, post_id:number, id:number,  length: number, x:number, y:number, z:number,  o:number, t:number}[];
  top_rail_data_array:{partName:string, id:number,  length: number, x:number, y:number, z:number,  o:number, t:number}[];
  fixed_components_data_array:  {partName: string, id: number, x: number, y: number, z: number, o: number, t: number}[];
  posts_vectors_array: {id: number, x: number, y: number, z: number, v_x: number, v_y: number, v_z: number}[];
  infill_vectors_array:InfillVectors[];
  toprail_vectors_array:ToprailVectors[];
  allowed_length: number;
  wall_data_array:{partName: string, id: number, length: number, height: number, x: number, y: number, z: number, o: number, t: number}[];
  foundation_array:{x:number,y:number,z:number}[];
  showLaser:boolean;
  showDimensions:boolean;
  showCuttingPlanes:boolean;
  box_width:number;
  box_height:number;
  camera_on_load:Camera_props;
  reset_camera:boolean;
  enableControls?: boolean; // default true
  on_loaded?: () => void;
  viewer_id?: string | number;

}

type Camera_props = {
  x:number;
  y:number;
  z:number;
  o_x:number;
  o_y:number;
  o_z:number;
  fov:number;
}

function LoadParts({ powdercoat_color = 0xAAAAAA, posts_data_array = [], baseplates_data_array = [], vertical_infill_data_array = [], glass_infill_data_array = [], mid_rail_data_array = [], top_rail_data_array = [], fixed_components_data_array = [], wall_data_array = [], foundation_array=[], posts_vectors_array = [], infill_vectors_array = [], toprail_vectors_array = [], allowed_length = 1280, showLaser=false, showDimensions=false, showCuttingPlanes=false,
  on_loaded,
  viewer_id,}:LoadPartsPropsType) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  const firedRef = useRef(false);

  useFrame(() => {
    if (firedRef.current) return;

    const hasChildren = (groupRef.current?.children?.length ?? 0) > 0;
    if (!hasChildren) return;

    firedRef.current = true;

    on_loaded?.();
    window.dispatchEvent(
      new CustomEvent("rs:modelviewer:loaded", { detail: { viewer_id } })
    );
  });

  return (
    <group
      ref={groupRef}
      // scale={hovered ? 12 : 10}
      // onPointerOver={() => setHovered(true)}
      // onPointerOut={() => setHovered(false)}
    >
      <Posts powdercoat_color={powdercoat_color} posts_data_array={ posts_data_array }  posts_vectors_array={posts_vectors_array} />
      <Baseplates powdercoat_color={powdercoat_color} baseplates_data_array={ baseplates_data_array }/>
      <Vertical_Infills powdercoat_color={powdercoat_color} vertical_infill_data_array={vertical_infill_data_array} infill_vectors_array={infill_vectors_array} allowed_length={allowed_length}/>
      <Glass_Infills  powdercoat_color={powdercoat_color} glass_infill_data_array={glass_infill_data_array} infill_vectors_array={infill_vectors_array} allowed_length={allowed_length}/>
      <Mid_Rails powdercoat_color={powdercoat_color} mid_rail_data_array={mid_rail_data_array} infill_vectors_array={infill_vectors_array} allowed_length={allowed_length} showCuttingPlanes={showCuttingPlanes}/>
      <Top_Rails powdercoat_color={powdercoat_color} top_rail_data_array={top_rail_data_array} toprail_vectors_array={toprail_vectors_array} showCuttingPlanes={showCuttingPlanes} />
      <Fixed_Components powdercoat_color={powdercoat_color} component_data_array={fixed_components_data_array} />
      {/* <Hob_Walls powdercoat_color={powdercoat_color} wall_data_array={wall_data_array} toprail_vectors_array={toprail_vectors_array} /> */}
      <Floor_Planes foundation_array={foundation_array} showLaser={showLaser} />
    </group>
  );
}

export function ModelViewer ({
  ready,
  powdercoat_color= 0xAAAAAA,
  lighting={ambient_intensity:0.5, ambient_color:0xFFFFFF, light_intensity:0.5, light_color:0xFFFFFF, x:10, y:10, z:10},
  posts_data_array= [{id: 1, partName:"PST-001",  type:'BP', height:973, x:0, y:16, z:0, o:0, t:0}],
  baseplates_data_array= [{partName:"BP-001", id:1, type:"BP", x:0,  y:0,  z:0,  o:0}],
  vertical_infill_data_array= [{partName:"19x18 Baluster", post_id:1, id:1,  length: 765, x:100,  y:102,  z:0,  o:0, t:0}],
  glass_infill_data_array= [{partName:"Glass Panel", post_id:1, id:1,  height: 765, length:735, thickness:13.52, x:100,  y:102,  z:0,  o:0, t:0}],
  mid_rail_data_array= [{partName:"U-Rail", id:1, post_id:1,  length: 800, x:400,  y:80,  z:0,  o:0, t:0}],
  top_rail_data_array= [{partName:"Elite Toprail", id:1,  length: 2000, x:0,  y:989,  z:0,  o:0, t:0}],
  fixed_components_data_array= [{partName:"End Cap Elite", id:1, x:0,  y:989,  z:0,  o:0, t:0}],
  posts_vectors_array=[{id:1, x:0, y:989, z:0, v_x:0, v_y:-1, v_z:0}],
  infill_vectors_array= [{id:1, post_id: 1,
    left:{x:22.5, y:0, z:0, v_x:1, v_y:0, v_z:0},
    right:{x:777.25, y:0, z:0, v_x:-1, v_y:0, v_z:0},
    top:{x:22.5, y:0, z:0, v_x:0, v_y:1, v_z:0},
    bottom:{x:777.25, y:0, z:0, v_x:0, v_y:-1,v_z:0}}],
  toprail_vectors_array=[{id:1,
    left:{x:-777.5, y:0, z:0, v_x:1, v_y:0, v_z:0},
    right:{x:777.25, y:0, z:0, v_x:-1, v_y:0, v_z:0}}],
  allowed_length= 1280,
  wall_data_array=
    [{partName:"150mm Hob", id:1,  length: 2000, height:150, x:0,  y:-75,  z:0,  o:0, t:0}],
  foundation_array=[],
  box_width= 100,
  box_height= 100,
  camera_on_load={x:5,y:5,z:5,o_x:0,o_y:0,o_z:0,fov:75},
  reset_camera=false,
  showLaser=false,
  showDimensions=false,
  showCuttingPlanes=false,
  enableControls = true,
  viewer_id,
  on_loaded,

}:RendererProps)  {

  // --- WebGL context-loss hardening (minimal additions) ---
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasElRef.current;
    if (!canvas) return;

    const onLost = (e: Event) => {
      // Prevent browser default reload behaviour; let us recover instead
      e.preventDefault();
      setContextLost(true);
    };

    const onRestored = () => {
      // Either auto-recreate, or leave it to the button.
      // We'll auto-recreate by bumping the key.
      setContextLost(false);
      setCanvasKey((k) => k + 1);
    };

    canvas.addEventListener("webglcontextlost", onLost as any, false);
    canvas.addEventListener("webglcontextrestored", onRestored as any, false);

    return () => {
      canvas.removeEventListener("webglcontextlost", onLost as any, false);
      canvas.removeEventListener("webglcontextrestored", onRestored as any, false);
    };
  }, [canvasKey, ready]);

  if(!ready){
    return <div style={{ width: "100%", height: "100%" }} />;
  }

  if (contextLost) {
    return (
      <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
        <button
          onClick={() => {
            setContextLost(false);
            setCanvasKey((k) => k + 1);
          }}
          style={{ padding: "8px 12px", border: "1px solid #999", borderRadius: 6 }}
        >
          Restart 3D View
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", padding: "0.75em", background: "white", boxSizing: "border-box", borderRadius: "0.5rem" }}>
      <div style={{ width: "100%", height: "100%", position: "relative", borderRadius: "0.5rem", overflow: "hidden" }}>
      <Canvas
        key={canvasKey}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        gl={{ localClippingEnabled: true }}
        onCreated={({ gl }) => {
          canvasElRef.current = gl.domElement;
        }}
      >
        <color attach="background" args={["#eaebee"]} />
        <gridHelper
          args={[80, 40, "#b0b4bc", "#d0d3d8"]}
          position={(() => {
            if (posts_data_array.length === 0) return [15, 0, 2] as [number,number,number];
            const xs = posts_data_array.map(p => p.x / 100);
            const zs = posts_data_array.map(p => p.z / 100);
            const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
            const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
            return [cx, 0, cz] as [number, number, number];
          })()}
        />
        <ambientLight intensity={lighting.ambient_intensity} color={lighting.ambient_color}/>
        <pointLight position={[lighting.x, lighting.y, lighting.z]} intensity={lighting.light_intensity} color={lighting.light_color}/>
        <LoadParts powdercoat_color={(powdercoat_color)} posts_data_array={posts_data_array} baseplates_data_array={baseplates_data_array} vertical_infill_data_array={vertical_infill_data_array} glass_infill_data_array={glass_infill_data_array} mid_rail_data_array={mid_rail_data_array} top_rail_data_array={top_rail_data_array} fixed_components_data_array={fixed_components_data_array} wall_data_array={wall_data_array} posts_vectors_array={posts_vectors_array} infill_vectors_array={infill_vectors_array} toprail_vectors_array={toprail_vectors_array} allowed_length={allowed_length} foundation_array={foundation_array} showLaser={showLaser} showDimensions={showDimensions} showCuttingPlanes={showCuttingPlanes}
          on_loaded={on_loaded}
          viewer_id={viewer_id} />
        {/* <OrbitControls /> */}
        <Rig enabled={enableControls} camera_reset={reset_camera} position={[camera_on_load.x/100,camera_on_load.y/100,camera_on_load.z/100] } focus={[camera_on_load.o_x/100,camera_on_load.o_y/100,camera_on_load.o_z/100] }></Rig>
      </Canvas>
      </div>
    </div>
  )
}

export function Rig({
  enabled = false,
  camera_reset = false,
  position = [0, 0, 2] as [number, number, number],
  focus = [0, 0, 0] as [number, number, number],
}) {
  const controlsRef = useRef<CameraControls | null>(null);
  const { camera } = useThree();

  // Always apply the initial camera pose (even when controls are disabled)
  useEffect(() => {
    if (enabled) {
      // Controls exist -> use them to set lookAt (smooth + correct)
      if (controlsRef.current) controlsRef.current.setLookAt(...position, ...focus, true);
    } else {
      // No controls -> set camera directly
      camera.position.set(position[0], position[1], position[2]);
      camera.lookAt(focus[0], focus[1], focus[2]);
      camera.updateProjectionMatrix();
    }
  }, [enabled, camera, position, focus]);

  // Keep your reset behaviour when enabled
  useEffect(() => {
    if (!enabled) return;
    if (!camera_reset || !controlsRef.current) return;
    controlsRef.current.setLookAt(...position, ...focus, true);
  }, [enabled, camera_reset, position, focus]);

  // ✅ THIS is what actually disables interaction:
  if (!enabled) return null;

  return (
    <CameraControlsDrei
      ref={controlsRef}
      makeDefault
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2}
    />
  );
}
