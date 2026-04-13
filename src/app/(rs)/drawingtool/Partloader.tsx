// app/(rs)/drawingtool/Partloader.tsx
import * as THREE from 'three'
import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useThree, useFrame, ThreeElements } from '@react-three/fiber'
import { useGLTF, Detailed, Environment } from '@react-three/drei'

import { MeshFromVertices, MeshFromVerticesProps } from './MeshFromVerteces'
import { FoundationType } from './canvas/DropAnalyser'

const LOCAL_PARTS_BASE = "/models/balustrade"

function getLocalPartAsset(path: string) {
  return `${LOCAL_PARTS_BASE}/${path}`
}


type PlaneArrowType = Omit<ThreeElements['group'], 'key' | 'ref'> & {reactId:string, index:number, powdercoat_color:number, partName:string, plane_vector:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number}}

type PostType = Omit<ThreeElements['group'], 'key' | 'ref'> & {reactId:string, index:number, powdercoat_color:number, partName:string,  partType:string, post_vector:{id:number, x:number, y:number, z:number, v_x:number, v_y:number, v_z:number}}

type BaseplateType = Omit<ThreeElements['group'], 'key' | 'ref'> & {reactId:string, index:number, powdercoat_color:number, partName:string}

type VerticalInfillType = Omit<ThreeElements['group'], 'key' | 'ref'> & {reactId:string, index:number, powdercoat_color:number, partName:string,  infill_vector:{id:number,
          left:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          right:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          top:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          bottom:{x:number, y:number, z:number, v_x:number, v_y:number,v_z:number}}}

type GlassInfillType = Omit<ThreeElements['group'], 'key' | 'ref'> & {reactId:string, index:number, powdercoat_color:number, partName:string, infill_vector:{id:number,
          left:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          right:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          top:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          bottom:{x:number, y:number, z:number, v_x:number, v_y:number,v_z:number}}}

type MidRailType = Omit<ThreeElements['group'], 'key' | 'ref'> & {reactId:string, index:number, powdercoat_color:number, partName:string,  infill_vector:{id:number,
          left:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          right:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          top:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          bottom:{x:number, y:number, z:number, v_x:number, v_y:number,v_z:number}}}

type TopRailType = Omit<ThreeElements['group'], 'key' | 'ref'> & {reactId:string, index:number, powdercoat_color:number, partName:string, toprail_vector:{id:number,
          left:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          right:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number}}}

type HobWallType = Omit<ThreeElements['group'], 'key' | 'ref'> & {reactId:string, index:number, powdercoat_color:number, partName:string, toprail_vector:{id:number,
          left:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          right:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number}}}

type FixedComponentsType = Omit<ThreeElements['group'], 'key' | 'ref'> & {reactId:string, index:number, powdercoat_color:number, partName:string}


type FilterKeysByValueType<Obj, ValueType> = {
  [K in keyof Obj]: Obj[K] extends ValueType ? K : never;
}[keyof Obj];

function filterObjectKeysByValueType<T extends Record<string, unknown>, V>(
  obj: T,
  valueType: new (...args: any[]) => V // Constructor for runtime type check
): FilterKeysByValueType<T, V>[] {
  return (Object.keys(obj) as Array<keyof T>).filter(
    (key) => obj[key] instanceof valueType
  ) as FilterKeysByValueType<T, V>[];
}



function Plane_Arrow({reactId, index, partName, powdercoat_color, plane_vector,  ...props }:PlaneArrowType){
    const meshRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    const { viewport, camera } = useThree()
    // const { width, height } = viewport.getCurrentViewport(camera, [0, 0, -z])
    
    let part_address = getLocalPartAsset("debug/Plane_Arrow.gltf");

    const { nodes, materials } = useGLTF(part_address)

    //   const localPlane = new THREE.Plane( top_Vec, 0 );
    //   localPlane.setFromNormalAndCoplanarPoint ( top_Vec, new THREE.Vector3( post_vector.x/10, post_vector.y/10, post_vector.z/10 ) )

        let localPlane = new THREE.Plane( new THREE.Vector3( 0, - 1, 0 ).normalize(), 1 );
        localPlane.setFromNormalAndCoplanarPoint( new THREE.Vector3( plane_vector.v_x, plane_vector.v_y, plane_vector.v_z ).normalize(), new THREE.Vector3( (plane_vector.x/100), (plane_vector.y/100), (plane_vector.z/100) ));

      const mesh_material = new THREE.MeshStandardMaterial({
        color: hovered ?  0xAA0000 : 0xCCCCCC,
        side: THREE.DoubleSide,

        transparent: true,
        opacity: 0.2,
  
        // ***** Clipping setup (material): *****
        clippingPlanes: [ ],
        clipShadows: false
  
      });

    useFrame(() => {
        if (meshRef.current) {
          // code that runs at 60Hz
        //   meshRef.current.position.set(data.x , data.y, data.z)
        }
      })

    const meshes = filterObjectKeysByValueType(nodes, THREE.Mesh)

    return (
      <group
          {...props} 
          dispose={null} //scale={hovered ? 12 : 10}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          >
          {/* <ClippingPlane/> */}

          {meshes.map((meshKey, i) => (
            
          //  console.log(nodes[meshes[i]]),
            <mesh
              key={`${reactId}:${meshKey}`}
              castShadow
              receiveShadow
              geometry={(nodes[meshes[i]]  as THREE.Mesh).geometry}
              material = {mesh_material}
          />
            
              ))}
          
      </group>
    )
}

// {powdercoat_color, posts_data_array, posts_vectors_array}:{powdercoat_color:number, posts_data_array:{id: number, partName:string,  type:string, height:number, x:number, y:number, z:number, o:number, t:number}[], posts_vectors_array:{id:number, x:number, y:number, z:number, v_x:number, v_y:number, v_z:number}[]}
function Post_001({reactId, index, partName, partType, powdercoat_color, post_vector,  ...props }:PostType){
    const meshRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    const { viewport, camera } = useThree()
    // const { width, height } = viewport.getCurrentViewport(camera, [0, 0, -z])
    
    
    let part_address = getLocalPartAsset("posts/PST_001.gltf");

    switch (partName) {
        case "PST-001":
            part_address = getLocalPartAsset("posts/PST_001.gltf");
            break;
        case "PST-002":
            part_address = getLocalPartAsset("posts/PST_002.gltf");
            break;
            
        // ... more cases
        default:
            // Code to execute if no case matches (optional)
            break; // Optional for the default case if it's the last block
    }

    const { nodes, materials } = useGLTF(part_address)
    // const mesh_material = hovered ? new MeshStandardMaterial({ color: 0x00ffAA }) : materials['0.600000_0.600000_0.600000_0.000000_0.000000'];
    

    //   const localPlane = new THREE.Plane( top_Vec, 0 );
    //   localPlane.setFromNormalAndCoplanarPoint ( top_Vec, new THREE.Vector3( post_vector.x/10, post_vector.y/10, post_vector.z/10 ) )

        let localPlane = new THREE.Plane( new THREE.Vector3( 0, - 1, 0 ).normalize(), 1 );
        localPlane.setFromNormalAndCoplanarPoint( new THREE.Vector3( post_vector.v_x, post_vector.v_y, post_vector.v_z ).normalize(), new THREE.Vector3( (post_vector.x/100), (post_vector.y/100), (post_vector.z/100) ));

      const mesh_material = new THREE.MeshStandardMaterial({
        color: hovered ?  0x00ffAA : powdercoat_color,
        side: THREE.DoubleSide,
        metalness: 0.0,
        roughness: 0.25,
        envMapIntensity: 1.2,
        emissive: hovered ? 0x00ffAA : powdercoat_color,
        emissiveIntensity: hovered ? 0 : 0.2,
  
        // ***** Clipping setup (material): *****
        clippingPlanes: [ localPlane ],
        clipShadows: true
  
      });

    useFrame(() => {
        if (meshRef.current) {
          // code that runs at 60Hz
        //   meshRef.current.position.set(data.x , data.y, data.z)
        }
      })

    const meshes = filterObjectKeysByValueType(nodes, THREE.Mesh)

    return (
      partName === "PST-001" || partName === "PST-002" ?
      <group
          {...props} 
          dispose={null} //scale={hovered ? 12 : 10}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          >
          {/* <ClippingPlane/> */}

          {meshes.map((meshKey, i) => (
            
          //  console.log(nodes[meshes[i]]),
            <mesh
              key={`${reactId}:${meshKey}`}
              castShadow
              receiveShadow
              geometry={(nodes[meshes[i]]  as THREE.Mesh).geometry}
              material = {mesh_material}
          />
            
              ))}
          
      </group> :<></>
    )
}


// type postData = {id: Number, type:String, height:Number, x:Number, y:Number, z:Number, o:Number, t:Number}




function BP_001({ reactId, index, powdercoat_color, partName, ...props}:BaseplateType){
    const meshRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    const { viewport, camera } = useThree()
    // const { width, height } = viewport.getCurrentViewport(camera, [0, 0, -z])

let part_address = getLocalPartAsset("baseplates/BP_001.gltf");

    switch (partName) {
        case "BP":
            part_address = getLocalPartAsset("baseplates/BP_001.gltf");
            break;
        case "DP":
            part_address = getLocalPartAsset("baseplates/BP_005.gltf");
            break;
        case "CD":
            part_address = getLocalPartAsset("baseplates/BP_006.gltf");
            break;
            
        // ... more cases
        default:
            // Code to execute if no case matches (optional)
            break; // Optional for the default case if it's the last block
    }

    const { nodes, materials } = useGLTF(part_address)

      const mesh_material = new THREE.MeshStandardMaterial({
        color: hovered ?  0x00FFAA : powdercoat_color,
        side: THREE.DoubleSide,
        metalness: 0.0,
        roughness: 0.25,
        envMapIntensity: 1.2,
        emissive: hovered ? 0x00ffAA : powdercoat_color,
        emissiveIntensity: hovered ? 0 : 0.15,
  
        // ***** Clipping setup (material): *****
        // clippingPlanes: [ localPlane],
        clipShadows: true
  
      });

    useFrame(() => {
        if (meshRef.current) {
          // code that runs at 60Hz
        //   meshRef.current.position.set(data.x , data.y, data.z)
        }
      })

    const meshes = filterObjectKeysByValueType(nodes, THREE.Mesh)

    return (
      partName === "BP" || partName === "DP" || partName === "CD" ?
      <group
          {...props} 
          dispose={null} //scale={hovered ? 12 : 10}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          >
          {/* <ClippingPlane/> */}

          {meshes.map((meshKey, i) => (
            
          //  console.log(nodes[meshes[i]]),
            <mesh
              key={`${reactId}:${meshKey}`}
              castShadow
              receiveShadow
              geometry={(nodes[meshes[i]]  as THREE.Mesh).geometry}
              material = {mesh_material}
          />
            
              ))}
          
      </group>:<></>
    )
    
    
    
}

function Vertical_Infill({reactId, index, partName, powdercoat_color, infill_vector,...props}:VerticalInfillType){
    const meshRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    const { viewport, camera } = useThree()
    // const { width, height } = viewport.getCurrentViewport(camera, [0, 0, -z])
    let part_address = getLocalPartAsset("vertical-infill/19x18_Baluster.gltf");

    switch (partName) {
        case "19x18 Baluster":
            part_address = getLocalPartAsset("vertical-infill/19x18_Baluster.gltf");
            break;
        case "65x16 Slat":
            part_address = getLocalPartAsset("vertical-infill/65x16_Slat.gltf");
            break;
        case "Slat Side Frame":
            part_address = getLocalPartAsset("vertical-infill/Slat_Side_Frame.gltf");
            break;
        case "Post-002 Clipin":
            part_address = getLocalPartAsset("vertical-infill/Post_002_Clipin.gltf");
            break;
        case "Post-002 Rubber":
            part_address = getLocalPartAsset("vertical-infill/Post_002_Rubber.gltf");
            break;
            
        // ... more cases
        default:
            // Code to execute if no case matches (optional)
            break; // Optional for the default case if it's the last block
    }

    
    const { nodes, materials } = useGLTF(part_address)

    const left = infill_vector.left;
    const left_Vec = new THREE.Vector3( left.v_x, left.v_y, left.v_z ).normalize();
    const right = infill_vector.right;
    const right_Vec = new THREE.Vector3( right.v_x, right.v_y, right.v_z ).normalize();

    const top = infill_vector.top;
    // console.log(element);
    const top_Vec = new THREE.Vector3( top.v_x, top.v_y, top.v_z ).normalize();
    const bottom = infill_vector.bottom;
    const bottom_Vec = new THREE.Vector3( bottom.v_x, bottom.v_y, bottom.v_z ).normalize();

    let localPlane1 = new THREE.Plane( top_Vec.normalize(), 1 );
    localPlane1.setFromNormalAndCoplanarPoint(  top_Vec, new THREE.Vector3( top.x/100, top.y/100, top.z/100 )  );
    let localPlane2= new THREE.Plane( bottom_Vec, 0 );
    localPlane2.setFromNormalAndCoplanarPoint ( bottom_Vec, new THREE.Vector3( bottom.x/100, (partName ===  "Post-002 Clipin" ?  bottom.y-450 : bottom.y)/100, bottom.z/100 ) );

    const mesh_material = new THREE.MeshStandardMaterial({
        color: hovered ?  0x00ffAA : powdercoat_color,
        side: THREE.DoubleSide,
        metalness: 0.0,
        roughness: 0.25,
        envMapIntensity: 1.2,
        emissive: hovered ? 0x00ffAA : powdercoat_color,
        emissiveIntensity: hovered ? 0 : 0.15,

        // ***** Clipping setup (material): *****
        clippingPlanes: [localPlane1, localPlane2],
        clipShadows: true

    });

    useFrame(() => {
        if (meshRef.current) {
          // code that runs at 60Hz
        //   meshRef.current.position.set(data.x , data.y, data.z)
        }
      })

    const meshes = filterObjectKeysByValueType(nodes, THREE.Mesh)

    return (
      <group
          {...props} 
          dispose={null} //scale={hovered ? 12 : 10}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          >
          {/* <ClippingPlane/> */}

          {meshes.map((meshKey, i) => (
            
          //  console.log(nodes[meshes[i]]),
            <mesh
              key={`${reactId}:${meshKey}`}
              castShadow
              receiveShadow
              geometry={(nodes[meshes[i]]  as THREE.Mesh).geometry}
              material = {mesh_material}
          />
            
              ))}
          
      </group>
    )
}

function Glass_Infill({reactId, index, partName, powdercoat_color, infill_vector,...props}:GlassInfillType){
    const meshRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    const { viewport, camera } = useThree()
    // const { width, height } = viewport.getCurrentViewport(camera, [0, 0, -z])
    let part_address = getLocalPartAsset("glass/Glass_Panel.gltf");

    switch (partName) {
        case "Glass Panel":
            part_address = getLocalPartAsset("glass/Glass_Panel.gltf");
            break;
            
        // ... more cases
        default:
            // Code to execute if no case matches (optional)
            break; // Optional for the default case if it's the last block
    }

    
    const { nodes, materials } = useGLTF(part_address)

    const left = infill_vector.left;
    const left_Vec = new THREE.Vector3( left.v_x, left.v_y, left.v_z ).normalize();
    const right = infill_vector.right;
    const right_Vec = new THREE.Vector3( right.v_x, right.v_y, right.v_z ).normalize();

    const top = infill_vector.top;
    // console.log(element);
    const top_Vec = new THREE.Vector3( top.v_x, top.v_y, top.v_z ).normalize();
    const bottom = infill_vector.bottom;
    const bottom_Vec = new THREE.Vector3( bottom.v_x, bottom.v_y, bottom.v_z ).normalize();

    let localPlane1 = new THREE.Plane( top_Vec.normalize(), 1 );
    localPlane1.setFromNormalAndCoplanarPoint(  top_Vec, new THREE.Vector3( top.x/100, top.y/100, top.z/100 )  );
    let localPlane2= new THREE.Plane( bottom_Vec, 0 );
    localPlane2.setFromNormalAndCoplanarPoint ( bottom_Vec, new THREE.Vector3( bottom.x/100, bottom.y/100, bottom.z/100 ) );

    const mesh_material = new THREE.MeshStandardMaterial({
        color: hovered ?  0x00ffAA : (powdercoat_color == 0xFF0000 ? 0xFF0000 : 0xAAAABA),
        transparent: true,
        opacity: hovered ?  1 : 0.15,
        side: THREE.DoubleSide,

        // ***** Clipping setup (material): *****
        clippingPlanes: [localPlane1, localPlane2],
        clipShadows: true

    });

    useFrame(() => {
        if (meshRef.current) {
          // code that runs at 60Hz
        //   meshRef.current.position.set(data.x , data.y, data.z)
        }
      })

    const meshes = filterObjectKeysByValueType(nodes, THREE.Mesh)

    return (
      <group
          {...props} 
          dispose={null} //scale={hovered ? 12 : 10}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          >
          {/* <ClippingPlane/> */}

          {meshes.map((meshKey, i) => (
            
          //  console.log(nodes[meshes[i]]),
            <mesh
              key={`${reactId}:${meshKey}`}
              castShadow
              receiveShadow
              geometry={(nodes[meshes[i]]  as THREE.Mesh).geometry}
              material = {mesh_material}
          />
            
              ))}
          
      </group>
    )
}

function Mid_Rail({reactId, index, partName, powdercoat_color, infill_vector,...props}:MidRailType){
    const meshRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    const { viewport, camera } = useThree()
    // const { width, height } = viewport.getCurrentViewport(camera, [0, 0, -z])
    let part_address = getLocalPartAsset("horizontal-infill/U_Rail.gltf");

    switch (partName) {
        case "U-Rail":
            part_address = getLocalPartAsset("horizontal-infill/U_Rail.gltf");
            break;
        case "U-Rail Top":
            part_address = getLocalPartAsset("horizontal-infill/U_Rail.gltf");
            break;
            
        case "Baluster Rail":
            part_address = getLocalPartAsset("horizontal-infill/Baluster_Rail.gltf");
            break;
        case "Glazing Rail":
            part_address = getLocalPartAsset("horizontal-infill/Glazing_Rail.gltf");
            break;
        case "Glazing Rail Top":
            part_address = getLocalPartAsset("horizontal-infill/Glazing_Rail_Top.gltf");
            break;
        case "65x16 Slat":
            part_address = getLocalPartAsset("horizontal-infill/65x16_Slat_Horizontal.gltf");
            break;
        case "4mm Spline":
            part_address = getLocalPartAsset("horizontal-infill/4mm_Spline.gltf");
            break;
        // ... more cases
        default:
            // Code to execute if no case matches (optional)
            break; // Optional for the default case if it's the last block
    }

    const { nodes, materials } = useGLTF(part_address)
    // const mesh_material = hovered ? new MeshStandardMaterial({ color: 0x00ffAA }) : materials['0.600000_0.600000_0.600000_0.000000_0.000000'];
    
        
    

    //   const localPlane = new THREE.Plane( top_Vec, 0 );
    //   localPlane.setFromNormalAndCoplanarPoint ( top_Vec, new THREE.Vector3( post_vector.x/10, post_vector.y/10, post_vector.z/10 ) )
    const left = infill_vector.left;
      const left_Vec = new THREE.Vector3( left.v_x, left.v_y, left.v_z ).normalize();
      const right = infill_vector.right;
      const right_Vec = new THREE.Vector3( right.v_x, right.v_y, right.v_z ).normalize();

      const top = infill_vector.top;
      // console.log(element);
      const top_Vec = new THREE.Vector3( top.v_x, top.v_y, top.v_z ).normalize();
      const bottom = infill_vector.bottom;
      const bottom_Vec = new THREE.Vector3( bottom.v_x, bottom.v_y, bottom.v_z ).normalize();

        let localPlane1 = new THREE.Plane( left_Vec.normalize(), 1 );
        localPlane1.setFromNormalAndCoplanarPoint(  left_Vec, new THREE.Vector3( left.x/100, left.y/100, left.z/100 )  );
      let localPlane2= new THREE.Plane( right_Vec, 0 );
      localPlane2.setFromNormalAndCoplanarPoint ( right_Vec, new THREE.Vector3( right.x/100, right.y/100, right.z/100 ) );

      const mesh_material = new THREE.MeshStandardMaterial({
        color: hovered ?  0x00ffAA : powdercoat_color,
        side: THREE.DoubleSide,
        metalness: 0.0,
        roughness: 0.25,
        envMapIntensity: 1.2,
        emissive: hovered ? 0x00ffAA : powdercoat_color,
        emissiveIntensity: hovered ? 0 : 0.15,
  
        // ***** Clipping setup (material): *****
        clippingPlanes: [localPlane1, localPlane2],
        clipShadows: true
  
      });

    useFrame(() => {
        if (meshRef.current) {
          // code that runs at 60Hz
        //   meshRef.current.position.set(data.x , data.y, data.z)
        }
      })

    const meshes = filterObjectKeysByValueType(nodes, THREE.Mesh)

    return (
      <group
          {...props} 
          dispose={null} //scale={hovered ? 12 : 10}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          >
          {/* <ClippingPlane/> */}

          {meshes.map((meshKey, i) => (
            
          //  console.log(nodes[meshes[i]]),
            <mesh
              key={`${reactId}:${meshKey}`}
              castShadow
              receiveShadow
              geometry={(nodes[meshes[i]]  as THREE.Mesh).geometry}
              material = {mesh_material}
          />
            
              ))}
          
      </group>
    )
}

function Top_Rail({reactId, index, partName, powdercoat_color, toprail_vector,...props}:TopRailType){
    const meshRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    const { viewport, camera } = useThree()
    // const { width, height } = viewport.getCurrentViewport(camera, [0, 0, -z])
    let part_address = getLocalPartAsset("toprails/Elite_Toprail.gltf");

    switch (partName) {
        case "Elite Toprail":
            part_address = getLocalPartAsset("toprails/Elite_Toprail.gltf");
            break;
        case "Slenderline Toprail":
            part_address = getLocalPartAsset("toprails/Slenderline_Toprail.gltf");
            break;
        case "Visage Toprail":
            part_address = getLocalPartAsset("toprails/Visage_Toprail.gltf");
            break;
        case "Oval Toprail":
            part_address = getLocalPartAsset("toprails/Oval_Toprail.gltf");
            break;
        case "Round Toprail":
            part_address = getLocalPartAsset("toprails/Round_Toprail.gltf");
            break;
        case "25mm Round Toprail":
            part_address = getLocalPartAsset("toprails/SS-RD25-HR.gltf");
            break;
        case "38mm Round Toprail":
            part_address = getLocalPartAsset("toprails/SS-RD38-HR.gltf");
            break;
        case "42mm Round Toprail":
            part_address = getLocalPartAsset("toprails/SS-RD42-HR.gltf");
            break;
        case "25mm Square Toprail":
            part_address = getLocalPartAsset("toprails/SS-SQ25-HR.gltf");
            break;
        // ... more cases
        default:
            // Code to execute if no case matches (optional)
            break; // Optional for the default case if it's the last block
    }

    const { nodes, materials } = useGLTF(part_address)
    
    // const mesh_material = hovered ? new MeshStandardMaterial({ color: 0x00ffAA }) : materials['0.600000_0.600000_0.600000_0.000000_0.000000'];
    

    //   const localPlane = new THREE.Plane( top_Vec, 0 );
    //   localPlane.setFromNormalAndCoplanarPoint ( top_Vec, new THREE.Vector3( post_vector.x/10, post_vector.y/10, post_vector.z/10 ) )
    const left = toprail_vector.left;
      const left_Vec = new THREE.Vector3( left.v_x, left.v_y, left.v_z ).normalize();
      const right = toprail_vector.right;
      const right_Vec = new THREE.Vector3( right.v_x, right.v_y, right.v_z ).normalize();

        let localPlane1 = new THREE.Plane( left_Vec.normalize(), 1 );
        localPlane1.setFromNormalAndCoplanarPoint(  left_Vec, new THREE.Vector3( left.x/100, left.y/100, left.z/100 )  );
      let localPlane2= new THREE.Plane( right_Vec, 0 );
      localPlane2.setFromNormalAndCoplanarPoint ( right_Vec, new THREE.Vector3( right.x/100, right.y/100, right.z/100 ) );

      const mesh_material = new THREE.MeshStandardMaterial({
        color: hovered ?  0x00ffAA : powdercoat_color,
        side: THREE.DoubleSide,
        metalness: 0.0,
        roughness: 0.25,
        envMapIntensity: 1.2,
        emissive: hovered ? 0x00ffAA : powdercoat_color,
        emissiveIntensity: hovered ? 0 : 0.15,
  
        // ***** Clipping setup (material): *****
        clippingPlanes: [localPlane1, localPlane2],
        clipShadows: true
  
      });

    useFrame(() => {
        if (meshRef.current) {
          // code that runs at 60Hz
        //   meshRef.current.position.set(data.x , data.y, data.z)
        }
      })

    const meshes = filterObjectKeysByValueType(nodes, THREE.Mesh)

    return (
      <group
          {...props} 
          dispose={null} //scale={hovered ? 12 : 10}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          >
          {/* <ClippingPlane/> */}

          {meshes.map((meshKey, i) => (
            
          //  console.log(nodes[meshes[i]]),
            <mesh
              key={`${reactId}:${meshKey}`}
              castShadow
              receiveShadow
              geometry={(nodes[meshes[i]]  as THREE.Mesh).geometry}
              material = {mesh_material}
          />
            
              ))}
          
      </group>
    )

}

function Hob_Wall({reactId, index, partName, powdercoat_color, toprail_vector,...props}:HobWallType){
    const meshRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    const { viewport, camera } = useThree()
    // const { width, height } = viewport.getCurrentViewport(camera, [0, 0, -z])
    let part_address = getLocalPartAsset("walls/Block.gltf");

    switch (partName) {
        case "150mm Hob":
            part_address = getLocalPartAsset("walls/Block.gltf");
            break;
        // ... more cases
        default:
            // Code to execute if no case matches (optional)
            break; // Optional for the default case if it's the last block
    }

    const { nodes, materials } = useGLTF(part_address)
    
    // const mesh_material = hovered ? new MeshStandardMaterial({ color: 0x00ffAA }) : materials['0.600000_0.600000_0.600000_0.000000_0.000000'];
    

    //   const localPlane = new THREE.Plane( top_Vec, 0 );
    //   localPlane.setFromNormalAndCoplanarPoint ( top_Vec, new THREE.Vector3( post_vector.x/10, post_vector.y/10, post_vector.z/10 ) )
    const left = toprail_vector.left;
      const left_Vec = new THREE.Vector3( left.v_x, left.v_y, left.v_z ).normalize();
      const right = toprail_vector.right;
      const right_Vec = new THREE.Vector3( right.v_x, right.v_y, right.v_z ).normalize();

        let localPlane1 = new THREE.Plane( left_Vec.normalize(), 1 );
        localPlane1.setFromNormalAndCoplanarPoint(  left_Vec, new THREE.Vector3( left.x/100, left.y/100, left.z/100 )  );
      let localPlane2= new THREE.Plane( right_Vec, 0 );
      localPlane2.setFromNormalAndCoplanarPoint ( right_Vec, new THREE.Vector3( right.x/100, right.y/100, right.z/100 ) );

      const mesh_material = new THREE.MeshStandardMaterial({
        color: hovered ?  0x000000 : powdercoat_color,
        transparent: true,
        opacity: hovered ?  0.01 : 0.2,
        side: THREE.DoubleSide,
  
        // ***** Clipping setup (material): *****
        clippingPlanes: [localPlane1, localPlane2],
        clipShadows: true
  
      });

    useFrame(() => {
        if (meshRef.current) {
          // code that runs at 60Hz
        //   meshRef.current.position.set(data.x , data.y, data.z)
        }
      })

    const meshes = filterObjectKeysByValueType(nodes, THREE.Mesh)

    return (
      <group
          {...props} 
          dispose={null} //scale={hovered ? 12 : 10}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          >
          {/* <ClippingPlane/> */}

          {meshes.map((meshKey, i) => (
            
          //  console.log(nodes[meshes[i]]),
            <mesh
              key={`${reactId}:${meshKey}`}
              castShadow
              receiveShadow
              geometry={(nodes[meshes[i]]  as THREE.Mesh).geometry}
              material = {mesh_material}
          />
            
              ))}
          
      </group>
    )

}

function Fixed_Component({ reactId, index, partName, powdercoat_color, ...props }: FixedComponentsType) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  let part_address =
    getLocalPartAsset("caps-and-components/End_Cap_Elite.gltf");

  switch (partName) {
    case "End Cap Elite":
      part_address = getLocalPartAsset("caps-and-components/End_Cap_Elite.gltf");
      break;
    case "End Cap Slenderline":
      part_address = getLocalPartAsset("caps-and-components/End_Cap_Slenderline.gltf");
      break;
    case "End Cap Oval":
      part_address = getLocalPartAsset("caps-and-components/End_Cap_Oval.gltf");
      break;
    case "End Cap Round":
      part_address = getLocalPartAsset("caps-and-components/End_Cap_Round.gltf");
      break;
    case "Wall Cap Elite":
      part_address = getLocalPartAsset("caps-and-components/Wall_Cap_Elite.gltf");
      break;
    case "SF Anchor":
      part_address = getLocalPartAsset("caps-and-components/SF_Anchor.gltf");
      break;
    case "PST-002 Glass Cushion":
      part_address = getLocalPartAsset("caps-and-components/46x46_Post_Glass_Cushion.gltf");
      break;

    case "Spigot_RDTF":
      part_address = getLocalPartAsset("spigots/D10-Spigot-RDTF.gltf");
      break;
    case "Spigot_SQTF":
      part_address = getLocalPartAsset("spigots/D10-Spigot-SQTF.gltf");
      break;
    case "Spigot_RDCD":
      part_address = getLocalPartAsset("spigots/D10-Spigot-RDCD.gltf");
      break;
    case "Spigot_SQCD":
      part_address = getLocalPartAsset("spigots/D10-Spigot-SQCD.gltf");
      break;
    case "Spigot_HDTF":
      part_address = getLocalPartAsset("spigots/D12-TF-Spigot.gltf");
      break;
    case "Spigot_HDCD":
      part_address = getLocalPartAsset("spigots/D12-CD-Spigot.gltf");
      break;
    case "Spigot_SF":
      part_address = getLocalPartAsset("spigots/SS-DIA50mmx32mm.gltf");
      break;

    default:
      break;
  }

  // ✅ use scene to preserve hierarchy (occurrence nodes/matrices)
  const { scene } = useGLTF(part_address);

  // ✅ Spigot variants are named like "Spigot_RDTF" etc.
  const isSpigot = partName.startsWith("Spigot_");

  // --- materials (stable instances) ---
  const powdercoatMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        metalness: 0.0,
        roughness: 0.25,
        envMapIntensity: 1.2,
        clipShadows: true,
      }),
    []
  );

  const rubberMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        metalness: 0.0,
        roughness: 0.7,
        envMapIntensity: 1.2,
        clipShadows: true,
      }),
    []
  );

  const stainlessMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        metalness: 0.85,
        roughness: 0.25,
        envMapIntensity: 1.2,
        clipShadows: true,
      }),
    []
  );

  // update colors on hover / powdercoat change
  useEffect(() => {
    powdercoatMat.color.setHex(hovered ? 0x00ffaa : powdercoat_color);
    powdercoatMat.emissive.setHex(hovered ? 0x00ffaa : powdercoat_color);
    powdercoatMat.emissiveIntensity = hovered ? 0 : 0.15;

    rubberMat.color.setHex(hovered ? 0x00ffaa : 0x111111);
    rubberMat.emissive.setHex(0x000000);
    rubberMat.emissiveIntensity = 0;

    stainlessMat.color.setHex(hovered ? 0x00ffaa : 0xbfc6cc);
    stainlessMat.emissive.setHex(0x000000);
    stainlessMat.emissiveIntensity = 0;
  }, [hovered, powdercoat_color, powdercoatMat, rubberMat, stainlessMat]);

  const MAT_WHITE = "0.917647_0.917647_0.917647_0.000000_0.000000";
  const MAT_BLACK = "0.000000_0.000000_0.000000_0.000000_0.000000";
  const MAT_GREY  = "0.603922_0.647059_0.686275_0.000000_0.000000";

  function getMaterialName(m: THREE.Material | THREE.Material[] | undefined) {
    if (!m) return "";
    if (Array.isArray(m)) return m[0]?.name ?? "";
    return m.name ?? "";
  }

  // ✅ clone scene and swap materials on meshes (keeps transforms correct)
  const model = useMemo(() => {
    const cloned = scene.clone(true);

    cloned.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      obj.castShadow = true;
      obj.receiveShadow = true;

      // non-spigot: everything powdercoat
      if (!isSpigot) {
        obj.material = powdercoatMat;
        return;
      }

      // spigot: choose by original material name
      const matName = getMaterialName(obj.material);

      if (matName === MAT_BLACK) obj.material = rubberMat;
      else if (matName === MAT_GREY) obj.material = stainlessMat;
      else if (matName === MAT_WHITE) obj.material = powdercoatMat;
      else obj.material = powdercoatMat;
    });

    return cloned;
  }, [scene, isSpigot, powdercoatMat, rubberMat, stainlessMat]);

  return (
    <group
      {...props}
      dispose={null}
      ref={meshRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <primitive object={model} />
    </group>
  );
}




// function FloorPlane({...props}:Omit<ThreeElements['group'], 'key' | 'ref'>){
//     const planeGeometry = new THREE.PlaneGeometry(3,3,1,1)

//     const mesh_material = new THREE.MeshStandardMaterial({
//         color: 0xCCCCCC,
//         side: THREE.DoubleSide,

//         transparent: true,
//         opacity: 0.2,
  
//         // ***** Clipping setup (material): *****
//         // clippingPlanes: [ ],
//         // clipShadows: false
  
//       });

//       return (
//         <mesh
//           key={`Floor:1`}
//           receiveShadow
//           geometry={planeGeometry}
//           material={mesh_material}
//         />
//       )

// }

export function Posts({powdercoat_color, posts_data_array, posts_vectors_array}:{powdercoat_color:number, posts_data_array:{id: number, partName:string,  type:string, height:number, x:number, y:number, z:number, o:number, t:number}[], posts_vectors_array:{id:number, x:number, y:number, z:number, v_x:number, v_y:number, v_z:number}[]}){
    return (

        <mesh>
            {Array.from({ length: posts_data_array.length }, (_, i) => (
               posts_vectors_array.find(obj => obj.id === posts_data_array[i].id) && (posts_data_array[i].type != 'NP') ? <Post_001 key={`${posts_data_array[i].partName}_${posts_data_array[i].id}`} reactId={`${posts_data_array[i].partName}_${i}`}  index={i} powdercoat_color={powdercoat_color} post_vector={posts_vectors_array.find(obj => obj.id === posts_data_array[i].id)!} partName={posts_data_array[i].partName} partType={posts_data_array[i].type} position= {[(posts_data_array[i].x/100),(posts_data_array[i].y+posts_data_array[i].height/2)/100,posts_data_array[i].z/100]} rotation-order="YXZ"  rotation={[0,posts_data_array[i].o*Math.PI/180,posts_data_array[i].t*Math.PI/180]} scale={[10,posts_data_array[i].height/100,10]} >
                </Post_001> : <></>))}
         </mesh>
    )
}

export function Baseplates({powdercoat_color, baseplates_data_array}:{powdercoat_color:number, baseplates_data_array:{partName:string, id:number, type:string, x:number, y:number, z:number, o:number}[]}){
    return (

        <mesh>
            {Array.from({ length: baseplates_data_array.length }, (_, i) => (
                <BP_001 key={`${baseplates_data_array[i].partName}_${baseplates_data_array[i].id}`} reactId={`${baseplates_data_array[i].partName}_${i}`}  index={i} powdercoat_color={powdercoat_color} partName={baseplates_data_array[i].type} position= {[(baseplates_data_array[i].x/100),(baseplates_data_array[i].y/100),baseplates_data_array[i].z/100]} rotation-order="YXZ"  rotation={[0,(90+baseplates_data_array[i].o)*Math.PI/180,0]} scale={[10,10,10]} >
                </BP_001>))}
         </mesh>
    )
}

export function Vertical_Infills({powdercoat_color, vertical_infill_data_array, infill_vectors_array, allowed_length}:{powdercoat_color:number, vertical_infill_data_array:{partName:string, post_id:number, id:number,  length: number, x:number, y:number, z:number,  o:number, t:number}[], infill_vectors_array:{id:number, post_id:number,
          left:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          right:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          top:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          bottom:{x:number, y:number, z:number, v_x:number, v_y:number,v_z:number}}[], allowed_length:number}){
    return (

        <mesh>
            {Array.from({ length: vertical_infill_data_array.length }, (_, i) => (
                infill_vectors_array.find(obj => obj.post_id === vertical_infill_data_array[i].post_id) ? <Vertical_Infill key={`${vertical_infill_data_array[i].partName}_${vertical_infill_data_array[i].id}${vertical_infill_data_array[i].post_id}`} reactId={`${vertical_infill_data_array[i].partName}_${i}`}  index={i} powdercoat_color={ (get_distance(infill_vectors_array.find(obj => obj.post_id === vertical_infill_data_array[i].post_id)) + 45 ) <= allowed_length ? ((vertical_infill_data_array[i].partName == "Post-002 Rubber") ? 0x000000 : powdercoat_color) : 0xFF0000} partName={vertical_infill_data_array[i].partName} infill_vector={infill_vectors_array.find(obj => obj.post_id === vertical_infill_data_array[i].post_id)!} position= {[(vertical_infill_data_array[i].x/100),(vertical_infill_data_array[i].y+vertical_infill_data_array[i].length/2)/100,vertical_infill_data_array[i].z/100]} rotation-order="YXZ"  rotation={[0,vertical_infill_data_array[i].o*Math.PI/180,vertical_infill_data_array[i].t*Math.PI/180]} scale={[10,vertical_infill_data_array[i].length/100,10]} >
                </Vertical_Infill> : <></>))}
         </mesh>
    )
}

export function Glass_Infills({powdercoat_color, glass_infill_data_array, infill_vectors_array, allowed_length}:{powdercoat_color:number, glass_infill_data_array:{partName:string, post_id:number, id:number,  length: number,  height: number,  thickness: number, x:number, y:number, z:number,  o:number, t:number}[], infill_vectors_array:{id:number, post_id:number,
          left:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          right:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          top:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          bottom:{x:number, y:number, z:number, v_x:number, v_y:number,v_z:number}}[], allowed_length:number}){
    return (

        <mesh>
            {Array.from({ length: glass_infill_data_array.length }, (_, i) => (
                infill_vectors_array.find(obj => obj.post_id === glass_infill_data_array[i].post_id) ? <Glass_Infill key={`${glass_infill_data_array[i].partName}_${glass_infill_data_array[i].id}_${glass_infill_data_array[i].post_id}`} reactId={`${glass_infill_data_array[i].partName}_${glass_infill_data_array[i].id}`}  index={i} powdercoat_color={ (get_distance(infill_vectors_array.find(obj => obj.post_id === glass_infill_data_array[i].id)) + ((glass_infill_data_array[i].thickness === 6.38 || glass_infill_data_array[i].thickness === 9.52) ? 45 :0) ) <= allowed_length ? powdercoat_color : 0xFF0000} partName={glass_infill_data_array[i].partName} infill_vector={infill_vectors_array.find(obj => obj.post_id === glass_infill_data_array[i].post_id)!} position= {[(glass_infill_data_array[i].x/100),(glass_infill_data_array[i].y+glass_infill_data_array[i].height/2)/100,glass_infill_data_array[i].z/100]} rotation-order="YXZ"  rotation={[0,glass_infill_data_array[i].o*Math.PI/180,glass_infill_data_array[i].t*Math.PI/180]} scale={[glass_infill_data_array[i].thickness,glass_infill_data_array[i].height/100,glass_infill_data_array[i].length/100]} >
                </Glass_Infill> : <></>))}
         </mesh>
    )
}

export function Mid_Rails({powdercoat_color, mid_rail_data_array, infill_vectors_array, allowed_length, showCuttingPlanes}:{powdercoat_color:number, mid_rail_data_array:{partName:string, post_id:number, id:number,  length: number, x:number, y:number, z:number,  o:number, t:number}[],
  infill_vectors_array:{id:number, post_id:number,
          left:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          right:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          top:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          bottom:{x:number, y:number, z:number, v_x:number, v_y:number,v_z:number}}[],
          allowed_length:number, showCuttingPlanes:boolean}){
            
    return (
      <>
        <mesh>
            {Array.from({ length: mid_rail_data_array.length }, (_, i) => (
                infill_vectors_array.find(obj => obj.post_id === mid_rail_data_array[i].post_id) ? <Mid_Rail key={`MR-${mid_rail_data_array[i].partName}_${mid_rail_data_array[i].id}_${mid_rail_data_array[i].post_id}`} reactId={`${mid_rail_data_array[i].partName}_${i}`}  index={i} powdercoat_color={ (get_distance(infill_vectors_array.find(obj => obj.post_id === mid_rail_data_array[i].post_id)) + 45 ) <= allowed_length ? ((mid_rail_data_array[i].partName == "4mm Spline") ? 0x000000 : powdercoat_color) : 0xFF0000} partName={mid_rail_data_array[i].partName} infill_vector={infill_vectors_array.find(obj => obj.post_id === mid_rail_data_array[i].post_id)!} position= {[(mid_rail_data_array[i].x/100),(mid_rail_data_array[i].y)/100,mid_rail_data_array[i].z/100]} rotation-order="YXZ"  rotation={[mid_rail_data_array[i].t*Math.PI/180,(mid_rail_data_array[i].o+90)*Math.PI/180,0]} scale={[10,10,mid_rail_data_array[i].length/100]}>
                </Mid_Rail> : <></>))}
         </mesh>

         <mesh>
            { showCuttingPlanes ? Array.from({ length: infill_vectors_array.length }, (_, i) => (
                <>
                <Plane_Arrow key={`${"Left"}_${infill_vectors_array[i].id}`} reactId={`${"Left"}_${i}`}  index={i} powdercoat_color={ 0x000000} partName={"left"} plane_vector={infill_vectors_array[i].left} position={[(infill_vectors_array[i].left.x/100),(infill_vectors_array[i].left.y)/100,infill_vectors_array[i].left.z/100]} rotation-order="YXZ"  rotation={eulerYXZFromVectorToVector(new THREE.Vector3(1,0,0),new THREE.Vector3(infill_vectors_array[i].left.v_x,infill_vectors_array[i].left.v_y,infill_vectors_array[i].left.v_z))} scale={[10,10,10]}>
                </Plane_Arrow>
                <Plane_Arrow key={`${"Right"}_${infill_vectors_array[i].id}`} reactId={`${"Right"}_${i}`}  index={i} powdercoat_color={ 0x000000} partName={"right"} plane_vector={infill_vectors_array[i].right} position={[(infill_vectors_array[i].right.x/100),(infill_vectors_array[i].right.y)/100,infill_vectors_array[i].right.z/100]} rotation-order="YXZ"  rotation={eulerYXZFromVectorToVector(new THREE.Vector3(1,0,0),new THREE.Vector3(infill_vectors_array[i].right.v_x,infill_vectors_array[i].right.v_y,infill_vectors_array[i].right.v_z))} scale={[10,10,10]}>
                </Plane_Arrow>
                <Plane_Arrow key={`${"Top"}_${infill_vectors_array[i].id}`} reactId={`${"Top"}_${i}`}  index={i} powdercoat_color={ 0x000000} partName={"top"} plane_vector={infill_vectors_array[i].top} position={[(infill_vectors_array[i].top.x/100),(infill_vectors_array[i].top.y)/100,infill_vectors_array[i].top.z/100]} rotation-order="YXZ"  rotation={eulerYXZFromVectorToVector(new THREE.Vector3(1,0,0),new THREE.Vector3(infill_vectors_array[i].top.v_x,infill_vectors_array[i].top.v_y,infill_vectors_array[i].top.v_z))} scale={[10,10,10]}>
                </Plane_Arrow>
                <Plane_Arrow key={`${"Bottom"}_${infill_vectors_array[i].id}`} reactId={`${"Bottom"}_${i}`}  index={i} powdercoat_color={ 0x000000} partName={"bottom"} plane_vector={infill_vectors_array[i].bottom} position={[(infill_vectors_array[i].bottom.x/100),(infill_vectors_array[i].bottom.y)/100,infill_vectors_array[i].bottom.z/100]} rotation-order="YXZ"  rotation={eulerYXZFromVectorToVector(new THREE.Vector3(1,0,0),new THREE.Vector3(infill_vectors_array[i].bottom.v_x,infill_vectors_array[i].bottom.v_y,infill_vectors_array[i].bottom.v_z))} scale={[10,10,10]}>
                </Plane_Arrow>
                </>)):<></>}
         </mesh>
        </>
    )
}

export function Top_Rails({powdercoat_color, top_rail_data_array, toprail_vectors_array, showCuttingPlanes}:{powdercoat_color:number, top_rail_data_array:{partName:string, id:number,  length: number, x:number, y:number, z:number,  o:number, t:number}[], toprail_vectors_array:{id:number,
          left:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          right:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number}}[], showCuttingPlanes:boolean}){
    return (
        <>
        <mesh>
            {Array.from({ length: top_rail_data_array.length }, (_, i) => (
                toprail_vectors_array.find(obj => obj.id === top_rail_data_array[i].id) ? <Top_Rail key={`${top_rail_data_array[i].partName}_${top_rail_data_array[i].id}`} reactId={`${top_rail_data_array[i].partName}_${i}`}  index={i} powdercoat_color={powdercoat_color} partName={top_rail_data_array[i].partName} toprail_vector={toprail_vectors_array.find(obj => obj.id === top_rail_data_array[i].id)!} position= {[(top_rail_data_array[i].x/100),(top_rail_data_array[i].y)/100,top_rail_data_array[i].z/100]} rotation-order="YXZ" rotation={[top_rail_data_array[i].t*Math.PI/180,(top_rail_data_array[i].o+90)*Math.PI/180,0]} scale={[10,10,top_rail_data_array[i].length/100]} >
                </Top_Rail> : <></>))}
         </mesh>

         <mesh>
           {showCuttingPlanes ? Array.from({ length: toprail_vectors_array.length }, (_, i) => (
                <>
                <Plane_Arrow key={`${"Left"}_${toprail_vectors_array[i].id}`} reactId={`${"Left"}_${i}`}  index={i} powdercoat_color={ 0x000000} partName={"left"} plane_vector={toprail_vectors_array[i].left} position={[(toprail_vectors_array[i].left.x/100),(toprail_vectors_array[i].left.y)/100,toprail_vectors_array[i].left.z/100]} rotation-order="YXZ"  rotation={eulerYXZFromVectorToVector(new THREE.Vector3(1,0,0),new THREE.Vector3(toprail_vectors_array[i].left.v_x,toprail_vectors_array[i].left.v_y,toprail_vectors_array[i].left.v_z))} scale={[10,10,10]}>
                </Plane_Arrow>
                <Plane_Arrow key={`${"Right"}_${toprail_vectors_array[i].id}`} reactId={`${"Right"}_${i}`}  index={i} powdercoat_color={ 0x000000} partName={"right"} plane_vector={toprail_vectors_array[i].right} position={[(toprail_vectors_array[i].right.x/100),(toprail_vectors_array[i].right.y)/100,toprail_vectors_array[i].right.z/100]} rotation-order="YXZ"  rotation={eulerYXZFromVectorToVector(new THREE.Vector3(1,0,0),new THREE.Vector3(toprail_vectors_array[i].right.v_x,toprail_vectors_array[i].right.v_y,toprail_vectors_array[i].right.v_z))} scale={[10,10,10]}>
                </Plane_Arrow>
                </>)) : <></>}
         </mesh>
         </>
    )
}

export function Fixed_Components({powdercoat_color, component_data_array}:{powdercoat_color:number, component_data_array:{partName:string, id:number, x:number,  y:number,  z:number,  o:number, t:number}[]}){
    return (

        <mesh>
            {Array.from({ length: component_data_array.length }, (_, i) => (
                <Fixed_Component key={`${component_data_array[i].partName}_${component_data_array[i].id}`} reactId={`${component_data_array[i].partName}_${i}`}  index={i} powdercoat_color={(component_data_array[i].partName == "PST-002 Glass Cushion") ? 0x000000 : powdercoat_color} partName={component_data_array[i].partName} position= {[(component_data_array[i].x/100),(component_data_array[i].y)/100,component_data_array[i].z/100]} rotation-order="YXZ" rotation={[component_data_array[i].t*Math.PI/180,(component_data_array[i].o+90)*Math.PI/180,0]} scale={[10,10,10]} >
                </Fixed_Component>))}
         </mesh>
    )
}

export function Hob_Walls({powdercoat_color, wall_data_array, toprail_vectors_array}:{powdercoat_color:number, wall_data_array:{partName:string, id:number,  length: number, height:number, x:number,  y:number,  z:number,  o:number, t:number}[], toprail_vectors_array:{id:number,
          left:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number},
          right:{x:number, y:number, z:number, v_x:number, v_y:number, v_z:number}}[]}){
    
    // Quad made of two triangles + draw only two selected edges
    // const verts = [
    //   0, 0, 0,   // 0
    //   10, 0, 0,   // 1
    //   0, -2, 10,   // 2
    //   0, 0, 10,   // 3
    // ];
    // const tris = [0,1,2,  0,2,3];
    
    
    return (
        <mesh>
          {/* <MeshFromVertices
            reactId="panel-01"
            vertices={verts}
            indices={tris}
            color={0xFFFFFF}
            transparent
            opacity={0.75}
            position={[0, 0, 0]}
            // highlight edges
            edgePairs={[
              [0, 3],
              [3, 2],
              [0, 2],
              [0, 1],
              [1, 2],
            ]}
            edgeColor={0x222222}
          /> */}
          {/* <FloorPlane position={[(500/100),500/100,500/100]} rotation-order="YXZ"  rotation={[-Math.PI/2,0,0]} scale={[10,10,10]} ></FloorPlane> */}

            {Array.from({ length: wall_data_array.length }, (_, i) => (
                toprail_vectors_array.find(obj => obj.id === wall_data_array[i].id) ? <Hob_Wall key={`${wall_data_array[i].partName}_${wall_data_array[i].id}`} reactId={`${wall_data_array[i].partName}_${i}`}  index={i} powdercoat_color={0x111111} partName={wall_data_array[i].partName} toprail_vector={toprail_vectors_array.find(obj => obj.id === wall_data_array[i].id)!} position= {[(wall_data_array[i].x/100),(wall_data_array[i].y-wall_data_array[i].height/2)/100,wall_data_array[i].z/100]} rotation-order="YXZ" rotation={[wall_data_array[i].t*Math.PI/180,(wall_data_array[i].o+90)*Math.PI/180,0]} scale={[150/100,wall_data_array[i].height/100,wall_data_array[i].length/100]} >
                </Hob_Wall> : <></>))}
         </mesh>
    )
}

export function Floor_Planes({foundation_array, showLaser}:{foundation_array:{x:number,y:number,z:number}[], showLaser:boolean}){
  let verts: number[] = []

  verts.push(Math.max(foundation_array[0].x , foundation_array[foundation_array.length-1].x)/100,foundation_array[0].y/100,Math.max(foundation_array[0].z , foundation_array[foundation_array.length-1].z)/100)

  foundation_array.map((post,_i) => {verts.push( post.x/100,post.y/100,post.z/100)})
// console.log(foundation_array)
  let tris: number[] = []

  verts.map((_post,i) => {
    if (i > 0 && i < foundation_array.length) {
      tris.push(0,i,i+1)
    }


  })

  verts.push(foundation_array[0].x/100,foundation_array[0].y/100,foundation_array[foundation_array.length-1].z/100)
  verts.push(8+foundation_array[foundation_array.length-1].x/100,foundation_array[0].y/100,foundation_array[foundation_array.length-1].z/100)

  tris.push(0,1,foundation_array.length+1)
  tris.push(0,foundation_array.length,foundation_array.length+2)

    //   console.log(verts)
    // console.log(tris)
  return (
    <>
    <MeshFromVertices
        reactId="panel-01"
        vertices={verts}
        indices={tris}
        color={0xFFFFFF}
        transparent
        opacity={0.75}
        position={[0, 0, 0]}
        // highlight edges
        edgePairs={[
          // [0, 3],
          // [3, 2],
          // [0, 2],
          // [0, 1],
          // [1, 2],
        ]}
        edgeColor={0x222222}
      />

      { showLaser ? <MeshFromVertices
        reactId="panel-01"
        vertices={verts}
        indices={tris}
        color={0xFF0000}
        transparent
        opacity={0.2}
        position={[0, -foundation_array[0].y/100, 0]}
        // highlight edges
        edgePairs={[
          // [0, 3],
          // [3, 2],
          // [0, 2],
          // [0, 1],
          // [1, 2],
        ]}
        edgeColor={0x222222}
      /> : <></>}
      </>
  )

}

function get_distance(infill_vector={id:0,
          left:{x:-10, y:0, z:0, v_x:0, v_y:0, v_z:0},
          right:{x:0, y:0, z:0, v_x:0, v_y:0, v_z:0},
          top:{x:0, y:0, z:0, v_x:0, v_y:0, v_z:0},
          bottom:{x:0, y:0, z:0, v_x:0, v_y:0 ,v_z:0}}){
    const left = infill_vector.left;
    //   const left_Vec = new THREE.Vector3( left.v_x, left.v_y, left.v_z ).normalize();
      const right = infill_vector.right;
    //   const right_Vec = new THREE.Vector3( right.v_x, right.v_y, right.v_z ).normalize();

    return Math.sqrt(Math.pow(left.x - right.x,2) + Math.pow(left.z - right.z,2));

}


export function eulerYXZFromVectorToVector(
  vFrom: THREE.Vector3,
  vTo: THREE.Vector3
): [number, number, number] {
  const a = vFrom.clone().normalize();
  const b = vTo.clone().normalize();

  // If either is zero-ish, bail out with no rotation
  if (a.lengthSq() < 1e-12 || b.lengthSq() < 1e-12) return [0, 0, 0];

  // Quaternion that rotates a -> b (handles parallel/opposite cases internally)
  const q = new THREE.Quaternion().setFromUnitVectors(a, b);

  // Convert to Euler with the order you want
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return [e.x, e.y, e.z];
}

