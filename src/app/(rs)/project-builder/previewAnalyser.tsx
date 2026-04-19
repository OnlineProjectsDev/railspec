'use client';
import { generatePartsPdf, type PartRow, type DocumentDetails, type TemplateConfig } from "@/app/(rs)/drawingtool/generatePartsPdf"
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Canvas2D } from "@/app/(rs)/drawingtool/canvas/Canvas"

import { cn } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"

import { toast } from "sonner";
import { useAction } from "next-safe-action/hooks";
import { saveBalconyAction } from "@/app/actions/saveBalconyAction";
import { saveBalconyGeometryAction } from "@/app/actions/saveBalconyGeometryAction";
import {
  computeBoundsFromContributors,
  fitCameraToBounds,
  type BoundsContributor,
} from "@/app/(rs)/drawingtool/canvas/DropAnalyser";


// import { ModelViewer } from '@/app/(rs)/drawingtool/Renderer';


// DropAnalyser.tsx (or where you render the viewer)
import dynamic from 'next/dynamic';

// if your file exports `ModelViewer` named:
const ModelViewer = dynamic(() => import('@/app/(rs)/drawingtool/Renderer').then(m => m.ModelViewer), {
  ssr: false,
  loading: () => null, // optional skeleton
});


import { DropToPartslist } from "../drawingtool/canvas/DropsToPartslist";

import type { PartTypePost, PostVectorType, PartTypeRail, PartTypeVertical, PartTypeGlass, PartTypeComponent, InfillVectorType, ToprailVectorType } from "../drawingtool/canvas/DropsToPartslist"

export type PostsType = {id:number, post_id:number, type:string, length:number, angle:number, reversed:boolean, height:number, x:number, z:number, y_ref1:number, y_ref2:number, y_ref3:number}

export type FoundationType = {id:number, type:string, length:number, angle:number, offset:number, sections:number, height:number, x:number, z:number, y:number}



export type TableEvent =
  | { kind: 'action'; action: 'add' | 'multiply' | 'divide' | 'remove'; id: number; times: number }
  | { kind: 'editRow'; rowIndex: number; row: PostsType }; // full updated row

export type FoundationTableEvent =
  | { kind: 'action'; action: 'add' | 'multiply' | 'divide' | 'remove'; id: number; times: number }
  | { kind: 'editRow'; rowIndex: number; row: FoundationType }; // full updated row

export type PlaneVec = { x: number; y: number; z: number; v_x: number; v_y: number; v_z: number };

export type InfillVectors = {
  id: number;
  post_id: number;
  left: PlaneVec;
  right: PlaneVec;
  top: PlaneVec;  
  bottom: PlaneVec;
};
export type ToprailVectors = {
  id: number;
  left: PlaneVec;
  right: PlaneVec;
};

export type DropAnalyserProps = {
  balcony: {
    jobId: number;
    jobStageId: number;
    drop: string;
    balconyNo: string;

    foundationArray: FoundationType[];
    postsArray: PostsType[];

    heightMm?: number | null;
    panelMm?: number | null;
    max_spacing?: number | null;
    fflMm?: number | null;
    ffl_use?: boolean | null;
    design?: string | null;
    anchorage?: string | null;
    toprail?: string | null;
    infill?: string | null;
    powdercoatcolour?: {
        id: number | null;
        hex: string;
        name: string | null;
        range: string | null;
    } | null;
    metadata?: any;
    notes?: string | null;
    version?: number | null;
    isDeleted?: boolean | null;
  };
};


export function DropAnalyser({ balcony }: DropAnalyserProps) {
//   const [name, setName] = useState('Pieter');

    const [checkedPostDrawing, setPostChecked] = useState<boolean>(false);
    const [checkedFoundationDrawing, setFoundationChecked] = useState<boolean>(true);
    const [checkedFloorRef, setFloorRefChecked] = useState<boolean>(false);
    const [checkedShowCuttingPlanes, setShowCuttingPlanes] = useState<boolean>(false);
    const [checkedShowDimensions, setShowDimensions] = useState<boolean>(false);
    const [checkedShowLaserLine, setShowLaserLine] = useState<boolean>(false);

    
    const [checked_reset, setChecked_reset] = useState<boolean>(true);

    const [parentData, setParentData] = useState({x:0,y:0});

    const [tableAction, setTableAction] = useState({action:"none", id:0})

//   const [postRowAction, setPostRowAction] = useState()

    //   const handleChildTableData = (dataFromChild={x:0,z:0}) => {
    //     setParentData(dataFromChild);
    //     console.log(parentData)
    //   };

    // const [partslist_data, set_partslist_data] = useState()

    const [camera_on_load, set_camera ] = useState(
        {x:5,y:5,z:5,o_x:0,o_y:0,o_z:0,fov:75}
    )

    const [reset_camera, set_reset_camera ] = useState(
        false
    )
        
    const [powdercoat_color, set_powdercoat_color] = useState(
        0xAAAAAA
    )

    const [lighting, set_lighting] = useState(
        {ambient_intensity:1.8, ambient_color:0xFFFFFF, light_intensity:2, light_color:0xFFFFFF, x:10, y:10, z:10}
    )
    
    const [minHeight, setMinHeight] = useState<number | "">(1020); 
    const [panelHeight, setPanelHeight] = useState<number | "">(950); 
    const [floorRef, setFloorRef] = useState<number | "">(0); 

    const [design, setDesign] = useState<string>("RD-D1")

    const [allowed_length, set_allowed_length] = useState<number>(
        1280
    )
    
    const [foundation_array, set_foundation_array] = useState<FoundationType[]>(
        normaliseFoundationArray(balcony.foundationArray) ?? [{id:1, type:'F', length:1000, angle:180, offset:90, sections:1, height:0, x:0, z:-90, y:1020},
            {id:2, type:'F', length:0, angle:180, offset:90, sections:0, height:0, x:1000, z:-90, y:1020}
            ]
    );

    const [posts_array, set_posts_array] = useState<PostsType[]>(
        normalisePostsArray(balcony.postsArray) ?? [{id:1,  post_id:1, type:'BP', length:1000, angle:180, reversed:false, height:0, x:0, z:0, y_ref1:1020, y_ref2:989, y_ref3:80},{id:2, post_id:2, type:'BP', length:0, angle:180, reversed:false, height:0, x:1000, z:0, y_ref1:1020, y_ref2:989, y_ref3:80}]
    )

    const initialGeometryRef = useRef<{
        foundationArray: FoundationType[];
        postsArray: PostsType[];
    }>({
        foundationArray: balcony.foundationArray ?? [],
        postsArray: balcony.postsArray ?? [],
    });
        
    // derived geometry (sync transformer)
    const postsDerived = useSyncTransformer(posts_array, (posts) => computeGeometryPosts(posts, ((checkedFloorRef && Number(floorRef) < Math.min(...posts.map(post => {return post.height}))) ? Number(floorRef) : Math.min(...posts.map(post => {return post.height})))), [posts_array]);

    const foundationDerived = useSyncTransformer(foundation_array, computeGeometryFoundation, [foundation_array]);
    const postRefDerived = useSyncTransformer(foundationDerived, (posts) => computeGeometryPostRef(posts, allowed_length+1), [foundationDerived, allowed_length]);

    const [posts_data_array, set_posts_data_array] = useState(
        [{id: 1, partName:"PST-001",  type:'BP', height:973, x:0, y:16, z:0, o:0, t:0}]
    )
    const [baseplates_data_array, set_baseplates_data_array] = useState(
        [{partName:"BP-001", id:1, type:"BP", x:0,  y:0,  z:0,  o:0}]
    )

    const [vertical_infill_data_array, set_vertical_infill_data_array] = useState(
        [{partName:"19x18 Baluster", post_id:1, id:1,  length: 765, x:100,  y:102,  z:0,  o:0, t:0}]
    )

    const [glass_infill_data_array, set_glass_infill_data_array] = useState(
        [{partName:"Glass Panel", post_id:1, id:1,  height: 765, length:735, thickness:13.52, x:100,  y:102,  z:0,  o:0, t:0}]
    )

    const [mid_rail_data_array, set_mid_rail_data_array] = useState(
        [{partName:"U-Rail", id:1, post_id:1,  length: 800, x:400,  y:80,  z:0,  o:0, t:0}]
    )
    const [top_rail_data_array, set_top_rail_data_array] = useState(
        [{partName:"Elite Toprail", id:1,  length: 2000, x:0,  y:989,  z:0,  o:0, t:0}]
    )
    const [fixed_components_data_array, set_fixed_components_data_array] = useState(
        [{partName:"End Cap Elite", id:1, x:0,  y:989,  z:0,  o:0, t:0}]
    )
    const [posts_vectors_array, set_posts_vectors_array] = useState(
        [{id:1, x:0, y:989, z:0, v_x:0, v_y:-1, v_z:0}]
    )
    const [infill_vectors_array, set_infill_vectors_array] = useState<InfillVectors[]>(
        [{id: 1, post_id:1,
            left:   { x: 22.5,  y: 0, z: 0, v_x:  1, v_y: 0, v_z:  0 },
            right:  { x: 777.25, y: 0, z: 0, v_x: -1, v_y: 0, v_z:  0 },
            top:    { x: 22.5,  y: 0, z: 0, v_x:  0, v_y: 1, v_z:  0 },
            bottom: { x: 777.25, y: 0, z: 0, v_x:  0, v_y:-1, v_z:  0 }}]
    )
    const [toprail_vectors_array, set_toprail_vectors_array] = useState<ToprailVectors[]>(
        [{id:1,
            left:{x:-777.5, y:0, z:0, v_x:1, v_y:0, v_z:0},
            right:{x:777.25, y:0, z:0, v_x:-1, v_y:0, v_z:0}}]
        )

    // bounds derived from the transformed posts
    // bounds derived from the transformed posts
    const transformerInput = useMemo(
    () => [postsDerived, foundationDerived] as const,
    [postsDerived, foundationDerived]
    );

    const transformerFn = useCallback(
    ([posts, foundations]: readonly [PostsType[], FoundationType[]]) => xy_Boundaries(posts, foundations),
    []
    );

    const bounds = useSyncTransformer(transformerInput, transformerFn, [transformerInput, transformerFn]);

    const [zoom, setZoom] = useState<number>(
        10
    )

        // width/height derived (no state lag)
    const { width2D, height2D } = useSyncTransformer(
    { bounds, zoom },
    ({ bounds, zoom }) => ({
        width2D: Math.max(500, (2 * bounds.center.x) / zoom + 200),
        height2D: Math.max(500, (2 * bounds.center.y) / zoom + 200),
    }),
    [bounds, zoom]
    );

    const isDirty = useMemo(() => {
        const initial = initialGeometryRef.current;
        try {
            return (
            JSON.stringify(initial.foundationArray) !== JSON.stringify(foundation_array) ||
            JSON.stringify(initial.postsArray) !== JSON.stringify(posts_array)
            );
        } catch {
            return true;
        }
    }, [foundation_array, posts_array]);


    useDebouncedEffect(() => {
        if (checkedPostDrawing && (parentData.x !== 0 || parentData.y !== 0) ) {
            if (checked_reset){
            handleTableAction({
                kind: "action",
                action: "add",
                id: posts_array.length-1,
                times:1,
            })}
            else{
                setChecked_reset(true)
            }
        }
        else if (checkedFoundationDrawing && (parentData.x !== 0 || parentData.y !== 0) ) {
            if (checked_reset){
            handleFoundationTableAction({
                kind: "action",
                action: "add",
                id: foundation_array.length-1,
                times:1,
            })}
            else{
                setChecked_reset(true)
            }
        }
        else{
            setChecked_reset(false)
        }
    }, [parentData, checkedPostDrawing, checkedFoundationDrawing], 100);

    const [partsRevision, setPartsRevision] = useState(0);
    const partsBalconyIdRef = useRef<number | null>(null);

    const bounds3D = useMemo(() => {
        return computeBoundsFromContributors([
            { kind: "posts", items: posts_data_array as any },
            { kind: "toprails", items: top_rail_data_array as any },
        ]);
        }, [posts_data_array, top_rail_data_array]);

            function fit3DToView() {
        const next = fitCameraToBounds(bounds3D, camera_on_load.fov ?? 75, {
            padding: 1.35,
            viewDir: { x: -1, y: 0.35, z: 1 }, // left + lower
            minDistance: 200,
        });

        set_camera(next);
        set_reset_camera(true);
    }

    useEffect(() => {
        // if (partsBalconyIdRef.current !== balcony.id) return; // stale guard
        if (posts_data_array.length < 1) return;
        if (top_rail_data_array.length < 1) return;

        fit3DToView();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [partsRevision]);


    const [wall_data_array, set_wall_data_array] = useState(
        [{partName:"150mm Hob", id:1,  length: 2000, height:150, x:0,  y:-75,  z:0,  o:0, t:0}]
    )

    const onMinHeightChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        // If the field is cleared, keep it as empty string (avoids NaN/controlled warnings)
        if (e.currentTarget.value === "") {
        setMinHeight("");
        return;
        }

        // Use valueAsNumber for numeric inputs
        const n = e.currentTarget.valueAsNumber;
        if (!Number.isNaN(n)) setMinHeight(n);
    };

    const onPanelHeightChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        // If the field is cleared, keep it as empty string (avoids NaN/controlled warnings)
        if (e.currentTarget.value === "") {
        setPanelHeight("");
        return;
        }

        // Use valueAsNumber for numeric inputs
        const n = e.currentTarget.valueAsNumber;
        if (!Number.isNaN(n)) {setPanelHeight(Round(n,1))};
    };
    
    const onFloorRefChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        // If the field is cleared, keep it as empty string (avoids NaN/controlled warnings)
        if (e.currentTarget.value === "") {
        setFloorRef("");
        return;
        }

        // Use valueAsNumber for numeric inputs
        const n = e.currentTarget.valueAsNumber;
        if (!Number.isNaN(n)) setFloorRef(n);
    };

    // const onDesignChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    //     set
    // }


    const handleTableAction = (rowAction : TableEvent) => {
        let firstId = posts_array[1].id

        let tempArray:PostsType[] = []
        
        if (rowAction.kind === 'action') { 
            setTableAction(rowAction);
            console.log('Parent saw change:', rowAction); // run any parent logic
            
            switch (rowAction.action){
                case "add":
                    tempArray=([...posts_array.slice(0,rowAction.id),{
                        ...posts_array[rowAction.id],
                        angle: Math.round(xzToAngle({x:posts_array[rowAction.id].x,z:posts_array[rowAction.id].z},{x:posts_array[rowAction.id-1].x,z:posts_array[rowAction.id-1].z},{x:parentData.x,z:parentData.y})/45)*45,
                        length: Math.round(distance({x:posts_array[rowAction.id].x,z:posts_array[rowAction.id].z},{x:parentData.x,z:parentData.y})/100)*100
                    },{
                        ...posts_array[rowAction.id],
                        angle: 180
                    },...posts_array.slice(rowAction.id+1)])
                    break
                case "multiply":
                    const copies_M: PostsType[] = Array.from({length:rowAction.times}, () => ({...posts_array[rowAction.id],
                        angle: 180}))

                    tempArray=([...posts_array.slice(0,rowAction.id+1),
                        ...copies_M
                    ,...posts_array.slice(rowAction.id+1)])
                    break
                case "divide":
                    const copies_D: PostsType[] = Array.from({length:rowAction.times}, () => ({...posts_array[rowAction.id],
                        length:Math.round(posts_array[rowAction.id].length/(rowAction.times+1)*10)/10,
                        angle: 180}))

                    tempArray=([...posts_array.map((post, i) => {
                        if(i === rowAction.id){
                            post.length = Math.round(post.length/(rowAction.times+1)*10)/10
                        }
                        return post
                    })])
                    tempArray=([...tempArray.slice(0,rowAction.id+1),...copies_D,...tempArray.slice(rowAction.id+1)])
                    
                    break
                case "remove":
                    tempArray=([...posts_array.slice(0,rowAction.id),...posts_array.slice(rowAction.id+1)])
                    break
                default:

            }

        } else if (rowAction.kind === 'editRow') {
            // 👇 apply the edited row back at the same index
            console.log(rowAction.row)
            tempArray = posts_array.map((post, i) =>
            i === rowAction.rowIndex ? { ...post, ...rowAction.row } : post
            );
        }

        let xz = {x:posts_array[0].x, z:posts_array[0].z}
        let angleSum = 0

        set_posts_array([...tempArray.map( (post, i) => {

            angleSum += post.angle+180;

            let nextP =  rotate(xz.x, xz.z, xz.x + post.length, xz.z, angleSum)
            let prevP = {x:xz.x, z:xz.z}
            xz = nextP

            return {id:i, post_id: ((post.type === 'S' || post.type === 'G' || post.type === 'NP' || post.type === 'EC' || post.type === 'WC' ) ? 0 : (firstId++)), type:post.type, length:(i < tempArray.length-1 ? post.length:0), angle:(i < tempArray.length-1 ? post.angle:180), reversed:post.reversed, height:post.height, x:prevP.x, z:prevP.z, y_ref1:post.y_ref1, y_ref2:post.y_ref2, y_ref3:post.y_ref3}

        })])
        // console.log(posts_array)
    }
    const handleFoundationTableAction = (rowAction : FoundationTableEvent) => {
        
        // let firstId = foundation_array[1].id

        let tempArray:FoundationType[] = []
        
        if (rowAction.kind === 'action') { 
            setTableAction(rowAction);
            console.log('Parent saw change:', rowAction); // run any parent logic
            
            switch (rowAction.action){
                case "add":
                    tempArray=([...foundation_array.slice(0,rowAction.id),{
                        ...foundation_array[rowAction.id],
                        angle: Math.round(xzToAngle({x:foundation_array[rowAction.id].x,z:foundation_array[rowAction.id].z},{x:foundation_array[rowAction.id-1].x,z:foundation_array[rowAction.id-1].z},{x:parentData.x,z:parentData.y})/45)*45,
                        length: Math.round(distance({x:foundation_array[rowAction.id].x,z:foundation_array[rowAction.id].z},{x:parentData.x,z:parentData.y})/100)*100
                    },{
                        ...foundation_array[rowAction.id],
                        angle: 180
                    },...foundation_array.slice(rowAction.id+1)])
                    break
                case "multiply":
                    const copies_M: FoundationType[] = Array.from({length:rowAction.times}, () => ({...foundation_array[rowAction.id],
                        angle: 180}))

                    tempArray=([...foundation_array.slice(0,rowAction.id+1),
                        ...copies_M
                    ,...foundation_array.slice(rowAction.id+1)])
                    break
                case "divide":
                    const copies_D: FoundationType[] = Array.from({length:rowAction.times}, () => ({...foundation_array[rowAction.id],
                        length:Math.round(foundation_array[rowAction.id].length/(rowAction.times+1)*10)/10,
                        angle: 180}))

                    tempArray=([...foundation_array.map((post, i) => {
                        if(i === rowAction.id){
                            post.length = Math.round(post.length/(rowAction.times+1)*10)/10
                        }
                        return post
                    })])
                    tempArray=([...tempArray.slice(0,rowAction.id+1),...copies_D,...tempArray.slice(rowAction.id+1)])
                    
                    break
                case "remove":
                    tempArray=([...foundation_array.slice(0,rowAction.id),...foundation_array.slice(rowAction.id+1)])
                    break
                default:

            }

        } else if (rowAction.kind === 'editRow') {
            // 👇 apply the edited row back at the same index
            console.log(rowAction.row)
            tempArray = foundation_array.map((post, i) =>
            i === rowAction.rowIndex ? { ...post, ...rowAction.row } : post
            );
        }

        let xz = {x:foundation_array[0].x, z:foundation_array[0].z}
        let angleSum = 0

        set_foundation_array([...tempArray.map( (post, i) => {

            angleSum += post.angle+180;

            let nextP =  rotate(xz.x, xz.z, xz.x + post.length, xz.z, angleSum)
            let prevP = {x:xz.x, z:xz.z}
            xz = nextP


            return {id:i+1, type:post.type, length:(i < tempArray.length-1 ? post.length:0), angle:(i < tempArray.length-1 ? post.angle:180), offset:post.offset, sections:Math.ceil(post.length/allowed_length), height:post.height, x:prevP.x, z:prevP.z, y:post.y}

        })])
        

        
        console.log("FoundationUpdate")
    }

    const partslistAction = useCallback(() => {
        const partslist = DropToPartslist([...postsDerived], design, balcony.infill ?? "", balcony.toprail ?? "Elite");
        console.log(partslist);

        if (
            partslist.post_partslist.length &&
            partslist.post_vectors.length &&
            partslist.post_partslist.length === partslist.post_vectors.length
        ) {
            set_posts_data_array([...partslist.post_partslist.map((post, _i) => post)]);
            set_posts_vectors_array([...partslist.post_vectors.map((post_vec, _i) => post_vec)]);
        } else {
            set_posts_data_array([]);
            set_posts_vectors_array([]); // No Posts? Strange
        }

        if (partslist.baseplate_partslist.length) {
            set_baseplates_data_array([...partslist.baseplate_partslist.map((baseplate, _i) => ({ ...baseplate, type: baseplate.partName }))]);
        } else {
            set_baseplates_data_array([]);
        }

        if (partslist.fixed_components_partslist.length) {
            set_fixed_components_data_array([...partslist.fixed_components_partslist.map((component, _i) => ({ ...component, type: component.partName }))]);
        } else {
            set_fixed_components_data_array([]); // (was set_baseplates_data_array in your code)
        }

        if (partslist.infill_vectors.length) {
            set_infill_vectors_array([...partslist.infill_vectors.map((infill_vec, _i) => infill_vec)]);
        } else {
            set_infill_vectors_array([]);
        }

        if (partslist.midrail_partslist.length && partslist.infill_vectors.length) {
            set_mid_rail_data_array([
            ...partslist.midrail_partslist.map((rail, _i) => ({ ...rail, length: rail.partName === "65x16 Slat" ? rail.length : rail.length + 100 })),
            ]);
        } else {
            set_mid_rail_data_array([]);
        }

        if (partslist.vertical_infill_partslist.length && partslist.infill_vectors.length) {
            set_vertical_infill_data_array([...partslist.vertical_infill_partslist.map((rail, _i) => ({ ...rail, length: rail.length + 100 }))]);
        } else {
            set_vertical_infill_data_array([]);
        }

        if (partslist.glass_infill_partslist.length && partslist.infill_vectors.length) {
            set_glass_infill_data_array([...partslist.glass_infill_partslist.map((rail, _i) => ({ ...rail }))]);
        } else {
            set_glass_infill_data_array([]);
        }

        if (partslist.toprail_vectorslist.length && partslist.toprail_partslist.length) {
            set_top_rail_data_array([...partslist.toprail_partslist.map((rail, _i) => ({ ...rail, length: rail.length + 100 }))]);
            set_toprail_vectors_array([...partslist.toprail_vectorslist.map((toprail_vec, _i) => toprail_vec)]);
        } else {
            set_top_rail_data_array([]);
            set_toprail_vectors_array([]);
        }

        partsBalconyIdRef.current = 0;
        setPartsRevision((r) => r + 1);

        // saveGeometry();
    }, [postsDerived, design, balcony.toprail]);

    const postsWithOffset = useCallback(() => {
        console.log("Calculating posts...");

        let firstId = 0;
        let count = 0;
        const tempArray: PostsType[] = [];

        const post_y_ref = balcony.heightMm ?? 1020;

        postRefDerived.map((ref, i) =>
            tempArray.push({
            id: firstId++,
            post_id: ref.type === "S" || ref.type === "NP" || ref.type === "EC" || ref.type === "WC" ? 0 : count++,
            type: i === 0 || i === postRefDerived.length - 1 ? "EC" : balcony.anchorage ?? "BP",
            length: ref.length,
            angle: ref.angle,
            reversed: false,
            height: ref.height,
            x: ref.x,
            z: ref.z,
            y_ref1: post_y_ref,
            y_ref2: post_y_ref - 31,
            y_ref3: post_y_ref - Number(balcony.panelMm ?? panelHeight),
            })
        );

        set_posts_array([...tempArray]);
    }, [balcony.anchorage, balcony.heightMm, balcony.panelMm, panelHeight, postRefDerived]);


    useEffect(() => {

        setDesign(balcony.design ?? "RD-D1")
        postsWithOffset()
    }, [balcony.design, postsWithOffset]);

    useEffect(() => {
        setPanelHeight(balcony.panelMm ?? 950)
        postsWithOffset()
    }, [balcony.panelMm, postsWithOffset]);

    useEffect(() => {
        const raw = balcony.powdercoatcolour?.hex; // or whatever field holds your hex

        // console.log("raw colour value:", raw);

        if (!raw || typeof raw !== "string") {
            return;
        }

        // 1) Try to find a 6-digit hex sequence anywhere in the string
        //    e.g. "#AABBCC", "0xAABBCC", "AABBCC some text"
        const match = raw.match(/([0-9a-fA-F]{6})/);

        if (!match) {
            console.warn("No 6-digit hex found in:", raw);
            return;
        }

        const clean = match[1]; // e.g. "AABBCC"
        const numeric = parseInt(clean, 16);

        // console.log("clean:", clean, "numeric:", numeric);

        if (Number.isNaN(numeric)) {
            console.warn("Failed to parse hex as number:", clean);
            return;
        }

        // This is equivalent to 0xAABBCC as a JS number
        set_powdercoat_color(numeric);
        }, [balcony.powdercoatcolour]);

    useEffect(() => { 
        postsWithOffset()
    }, [balcony.anchorage, balcony.toprail, balcony.heightMm, foundationDerived, postsWithOffset]);

    useEffect(() => { 
        set_allowed_length(balcony.max_spacing ?? 1280);
        set_foundation_array(balcony.foundationArray);
    }, [balcony.max_spacing, balcony.foundationArray]);

    // useEffect(() => {

    //     setDesign(balcony.design ?? "RD-D1")
    //     set_posts_array(balcony.postsArray)
    // }, [balcony.design]);

    useEffect(() => {
        partslistAction();

    }, [postsDerived, partslistAction]);

    const designs = [
        "RD-D1","RD-D2","RD-D3","RD-D3SLATS","RD-D4",
        "RD-D4SLATS","RD-D5","RD-D6","RD-D7","RD-D8",
    ];

    // const recalculateXZ = () => {
    //     let xz = {x:posts_array[0].x, z:posts_array[0].z}
    //     let angleSum = 0

    //     set_posts_array([...posts_array.map( (post, i) => {
    //         if (i===0) return post

    //         angleSum += post.angle+180;

    //         let nextP =  rotate(xz.x, xz.z, xz.x + post.length, xz.z, angleSum)
    //         xz = nextP
    //         return {
    //                 ...post,
    //                 x: xz.x,
    //                 z: xz.z,
    //             }
    //     })])
    // }

    // const rotate = (cx:number, cy:number, x:number, y:number, angle:number) => {

    //     let radians = Math.PI*angle/180;
    //     let cos = Math.cos(radians);
    //     let sin = Math.sin(radians);
    //     let nx = (cos * (x - cx)) + (sin * (y - cy)) + cx;
    //     let ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
    //     return {x:Math.round(nx), z:Math.round(ny)};
    // }

    // useEffect(() => {

    //     const b = xy_Boundaries(posts_array);
    //     setWidth2D(Math.max(500,((2 * b.center.x)/zoom)+200));
    //     setHeight2D(Math.max(500,((2 * b.center.y)/zoom)+200));
    //     set_camera({x:5,y:5,z:5,o_x:0,o_y:0,o_z:0,fov:75})
    //     set_reset_camera(true)
    // }, [posts_array,zoom]);

    return (
    <>
        <ModelViewer
            ready={posts_data_array.length >= 1}
            powdercoat_color={powdercoat_color} 
            lighting={lighting}
            posts_data_array={posts_data_array}
            baseplates_data_array={baseplates_data_array}
            vertical_infill_data_array={vertical_infill_data_array}
            glass_infill_data_array={glass_infill_data_array}
            mid_rail_data_array={mid_rail_data_array}
            top_rail_data_array={top_rail_data_array}
            fixed_components_data_array={fixed_components_data_array}
            posts_vectors_array={posts_vectors_array}
            infill_vectors_array={infill_vectors_array}
            toprail_vectors_array={toprail_vectors_array}
            allowed_length={allowed_length}
            wall_data_array={wall_data_array}
            foundation_array={[...foundationDerived.map((post,i) => { return {x:post.x,y:-( checkedFloorRef && (floorRef !== "") ? floorRef : Math.min(...foundationDerived.map(post => {return post.height}),...postsDerived.map(post => {return post.height}))),z:post.z} })]}
            box_width={5.52*50}
            box_height={4.7*50}
            camera_on_load={camera_on_load}
            reset_camera={reset_camera}
            showLaser={checkedShowLaserLine}
            showDimensions={checkedShowDimensions}
            showCuttingPlanes={checkedShowCuttingPlanes}
        />
    </>
  );
}

// function Editor({ name, onNameChange }: { name: string; onNameChange: (v: string) => void }) {
//   return <input value={name} onChange={(e) => onNameChange(e.target.value)} />;
// }

// function Preview({ name }: { name: string }) {
//   return <p>Hello, {name}</p>;
// }

// function InsertPost({post}:{ post:PostsType}){
//     console.log(post)
// }

function xy_Boundaries(posts_array:PostsType[],foundation_array:FoundationType[]){
    let min_x = Number(posts_array[0].x);
    let max_x = Number(posts_array[0].x);
    let min_y = Number(posts_array[0].z);
    let max_y = Number(posts_array[0].z);

    for (let index = 0; index < posts_array.length; index++) {
        if (Number(posts_array[index].x) < min_x){
            min_x = Number(posts_array[index].x);
        }
        if (Number(posts_array[index].x) > max_x){
            max_x = Number(posts_array[index].x);
        }
        if (Number(posts_array[index].z) < min_y){
            min_y = Number(posts_array[index].z);
        }
        if (Number(posts_array[index].z) > max_y){
            max_y = Number(posts_array[index].z);
        }
    }
    for (let index = 0; index < foundation_array.length; index++) {
        if (Number(foundation_array[index].x) < min_x){
            min_x = Number(foundation_array[index].x);
        }
        if (Number(foundation_array[index].x) > max_x){
            max_x = Number(foundation_array[index].x);
        }
        if (Number(foundation_array[index].z) < min_y){
            min_y = Number(foundation_array[index].z);
        }
        if (Number(foundation_array[index].z) > max_y){
            max_y = Number(foundation_array[index].z);
        }
    }

    const xy_bounds = {"center":{"x":(min_x+max_x)/2, "y":(min_y+max_y)/2}, "min":{"x":min_x, "y":min_y}, "max":{"x":max_x, "y":max_y}};
    return xy_bounds;
}


// NOTE:
// This hook intentionally forwards its dependency list to useMemo.
// react-hooks/exhaustive-deps cannot statically analyze generic hooks.
// Do not add `fn` or `input` here — dependencies are controlled by the caller.

export function useSyncTransformer<TIn, TOut>(
    input: TIn,
    fn: (input: TIn) => TOut,
    deps: React.DependencyList = [input]
): TOut {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => fn(input), deps);
}

function useDebouncedEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  delay: number
) {
  useEffect(() => {
    const id = setTimeout(() => {
      const cleanup = effect();
      // pass cleanup through if provided
      if (typeof cleanup === "function") {
        return cleanup;
      }
    }, delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function computeGeometryPosts(posts: PostsType[], ffl:number) {
  if (!posts.length) return posts;

  let firstId = posts[1]?.id ?? posts[0].id ?? 1;
  let xz = { x: posts[0].x, z: posts[0].z };
  let angleSum = 0;

//   if (isPostsArray(posts)){
    return posts.map((post, i) => {
        angleSum += post.angle + 180;
        const nextP = rotate(xz.x, xz.z, xz.x + post.length, xz.z, angleSum);
        const prevP = { x: xz.x, z: xz.z };
        xz = nextP;

        return {
        id: i,
        post_id:
            post.type === 'S' || post.type === 'NP' || post.type === 'EC' || post.type === 'WC'
            ? 0
            : firstId++,
        type: post.type,
        length: i < posts.length - 1 ? post.length : 0,
        angle:  i < posts.length - 1 ? post.angle  : 180,
        reversed: post.reversed,
        height: post.height,
        x: prevP.x,
        z: prevP.z,
        y_ref1: post.y_ref1-ffl,
        y_ref2: post.y_ref2-ffl,
        y_ref3: post.y_ref3-ffl,
        } as PostsType;
  })
  
}

function computeGeometryFoundation(posts: FoundationType[]) {
  if (!posts.length) return posts;

  let firstId = posts[1]?.id ?? posts[0].id ?? 1;
  let xz = { x: posts[0].x, z: posts[0].z };
  let angleSum = 0;

    return posts.map((post, i) => {
        angleSum += post.angle + 180;
        const nextP = rotate(xz.x, xz.z, xz.x + post.length, xz.z, angleSum);
        const prevP = { x: xz.x, z: xz.z };
        xz = nextP;

        return {
        id: i,
        type: post.type,
        length: i < posts.length - 1 ? post.length : 0,
        angle:  i < posts.length - 1 ? post.angle  : 180,
        sections: post.sections,
        height: post.height,
        offset: post.offset,
        x: prevP.x,
        z: prevP.z,
        y: post.y,
        } as FoundationType;
  })
  
}

function computeGeometryPostRef(posts: FoundationType[], allowed_spacing:number) {
    if (!posts.length) return posts;

    
    let tempArray:FoundationType[] = []

    posts.map((post, i) => {
        if (i < posts.length-1){
            const left = {x:post.x,y:post.y,z:post.z}
            const right = {x:posts[i+1].x,y:posts[i+1].y,z:posts[i+1].z}
            const dir = direction_vector_xyz(right,left).vector

            
            // Required for intersection planes
            const dir2 = i < posts.length-2 ? direction_vector_xyz({x:Number(posts[i+2].x),y:Number(posts[i+2].y),z:Number(posts[i+2].z)},right).vector : dir
            const dir0 = i>0 ? direction_vector_xyz(left,{x:posts[i-1].x,y:posts[i-1].y,z:posts[i-1].z}).vector : {x:-dir.x,y:-dir.y,z:-dir.z}

            // console.log(dir)


            const left_Vec = i===0 || (Math.round(dir.x*100)=== -Math.round(dir0.x*100) && Math.round(dir.y*100)=== -Math.round(dir0.y*100) && Math.round(dir.z*100)=== -Math.round(dir0.z*100)) ? {x:Math.round(dir.x*10000)/10000,y:Math.round(dir.y*10000)/10000,z:Math.round(dir.z*10000)/10000} : angleDegToXZVector((360+xzVectorToAngleDeg(dir)+xzVectorToAngleDeg(dir0))/2)
                            
            const right_Vec = i===posts.length-2  || (Math.round(dir.x*100)===Math.round(dir2.x*100) && Math.round(dir.y*100)=== Math.round(dir2.y*100) && Math.round(dir.z*100)=== Math.round(dir2.z*100)) ? {x:-Math.round(dir.x*10000)/10000,y:-Math.round(dir.y*10000)/10000,z:-Math.round(dir.z*10000)/10000} : angleDegToXZVector(-90+(180+xzVectorToAngleDeg(dir)+xzVectorToAngleDeg(dir2))/2)

            const orientaiton = xzVectorToAngleDeg(dir)
            // console.log(orientaiton)

            let offset = post.offset
            // console.log(offset)

            const left_Offset = {x:left.x+offset*Math.sin((orientaiton)*Math.PI/180),y:left.y,z:left.z+offset*Math.sin((-90+orientaiton)*Math.PI/180)}
            const right_Offset = {x:right.x+offset*Math.sin((orientaiton)*Math.PI/180),y:right.y,z:right.z+offset*Math.sin((-90+orientaiton)*Math.PI/180)}

            const midpoint = {x:(left_Offset.x+right_Offset.x)/2,y:(left_Offset.y+right_Offset.y)/2,z:(left_Offset.z+right_Offset.z)/2}

            let corner_1 = toPlane({x:midpoint.x,y:midpoint.y,z:midpoint.z},{x:-dir.x,y:-dir.y,z:-dir.z},left,left_Vec);
            let corner_2 = toPlane({x:midpoint.x,y:midpoint.y,z:midpoint.z},dir,right,right_Vec);

            if(i>0){
                if(offset != posts[i-1].offset){
                    const orientaiton_ref = xzVectorToAngleDeg(dir0)
                    const left_Offset_ref = {x:posts[i-1].x+posts[i-1].offset*Math.sin((orientaiton_ref)*Math.PI/180),y:posts[i-1].y,z:posts[i-1].z+posts[i-1].offset*Math.sin((-90+orientaiton_ref)*Math.PI/180)}
                    const right_Offset_ref = {x:post.x+posts[i-1].offset*Math.sin((orientaiton_ref)*Math.PI/180),y:post.y,z:post.z+posts[i-1].offset*Math.sin((-90+orientaiton_ref)*Math.PI/180)}

                    const midpoint_ref = {x:(left_Offset_ref.x+right_Offset_ref.x)/2,y:(left_Offset_ref.y+right_Offset_ref.y)/2,z:(left_Offset_ref.z+right_Offset_ref.z)/2}
                    corner_1 = toPlane({x:midpoint.x,y:midpoint.y,z:midpoint.z},{x:-dir.x,y:-dir.y,z:-dir.z},midpoint_ref,{x:dir0.z,y:dir0.y,z:-dir0.x});
                }
            }
            if(i<posts.length-2){
                if(offset != posts[i+1].offset){
                    const orientaiton_ref = xzVectorToAngleDeg(dir2)
                    const left_Offset_ref = {x:posts[i+1].x+posts[i+1].offset*Math.sin((orientaiton_ref)*Math.PI/180),y:posts[i+1].y,z:posts[i+1].z+posts[i+1].offset*Math.sin((-90+orientaiton_ref)*Math.PI/180)}
                    const right_Offset_ref = {x:posts[i+2].x+posts[i+1].offset*Math.sin((orientaiton_ref)*Math.PI/180),y:posts[i+2].y,z:posts[i+2].z+posts[i+1].offset*Math.sin((-90+orientaiton_ref)*Math.PI/180)}

                    const midpoint_ref = {x:(left_Offset_ref.x+right_Offset_ref.x)/2,y:(left_Offset_ref.y+right_Offset_ref.y)/2,z:(left_Offset_ref.z+right_Offset_ref.z)/2}
                    corner_2 = toPlane({x:midpoint.x,y:midpoint.y,z:midpoint.z},dir,midpoint_ref,{x:-dir2.z,y:dir2.y,z:dir2.x});
                }
            }

            

            if (Math.round(distance(corner_1,corner_2)*100)/100 <= allowed_spacing){

                if(i === 0){
                    tempArray.push({...post,
                        length: post.offset,
                        x : corner_1.x,
                        z : corner_1.z
                    })
                    tempArray.push({...post,
                        length: Math.round(distance(corner_1,corner_2)*100)/100-post.offset - (i===posts.length-2 ? posts[posts.length-1].offset :0),
                        x : corner_1.x-post.offset*dir.x,
                        z : corner_1.z-post.offset*dir.z
                    })
                }
                else {
                     tempArray.push({...post,
                        length: Math.round(distance(corner_1,corner_2)*100)/100 - (i===posts.length-2 ? posts[posts.length-1].offset :0),
                        x : corner_1.x,
                        z : corner_1.z
                    })
                }
                
           
            }
            else{

                if (i === 0) {
                    tempArray.push({...post,
                        length: post.offset,
                        x : corner_1.x,
                        z : corner_1.z
                    })
                }

                let dist = distance(corner_1,corner_2) - (i===0 ? post.offset :0) - (i===posts.length-2 ? posts[posts.length-1].offset :0)
                let sections = Math.ceil(dist/allowed_spacing)
                let length = dist/sections

                tempArray.push({...post,
                    length: Math.round(length*100)/100,
                    x : corner_1.x - (i===0 ? post.offset*dir.x : 0),
                    z : corner_1.z - (i===0 ? post.offset*dir.z : 0)
                })
                for(let j=1; j< sections; j++){
                    tempArray.push({...post,
                        length: Math.round(length*100)/100,
                        angle:180,
                        x : corner_1.x-j*dir.x*Math.round(length*100)/100 - (i===0 ? post.offset*dir.x : 0),
                        z : corner_1.z-j*dir.z*Math.round(length*100)/100- (i===0 ? post.offset*dir.z : 0),
                    })
                }

            }

            if (i === posts.length-2){

                tempArray.push({...posts[posts.length-1],
                    length: Math.round(posts[posts.length-1].offset*100)/100,
                    x : corner_2.x+post.offset*dir.x,
                    z : corner_2.z+post.offset*dir.z
                })

                tempArray.push({...posts[posts.length-1],
                length:0,
                x : corner_2.x,
                z : corner_2.z
            })
}
        }
    })

    // console.log("temArray:",[...tempArray])
    return [...tempArray]

//     return posts.map((post, i) => {
        

//         return {
//         ...post,
//         } as FoundationType;
//   })
  
}

function isPostsType(v: unknown): v is PostsType {
  if (!v || typeof v !== "object") return false;
  const o = v as any;
  return (
    typeof o.type === "string" &&
    typeof o.length === "number" &&
    typeof o.angle === "number" &&
    typeof o.height === "number" &&
    typeof o.x === "number" &&
    typeof o.z === "number" &&
    // fields that are specific to PostsType
    typeof o.y_ref1 === "number" &&
    typeof o.y_ref2 === "number" &&
    typeof o.y_ref3 === "number" &&
    // avoid confusing with FoundationType
    o.sections === undefined
  );
}

function isFoundationType(v: unknown): v is FoundationType {
  if (!v || typeof v !== "object") return false;
  const o = v as any;
  return (
    typeof o.type === "string" &&
    typeof o.length === "number" &&
    typeof o.angle === "number" &&
    typeof o.height === "number" &&
    typeof o.x === "number" &&
    typeof o.z === "number" &&
    // fields that are specific to FoundationType
    typeof o.y === "number" &&
    Array.isArray(o.sections)
  );
}

function isPostsArray(v: unknown): v is PostsType[] {
  return Array.isArray(v) && v.every(isPostsType);
}

function isFoundationArray(v: unknown): v is FoundationType[] {
  return Array.isArray(v) && v.every(isFoundationType);
}

function rotate (cx:number, cy:number, x:number, y:number, angle:number) {

    let radians = Math.PI*angle/180;
    let cos = Math.cos(radians);
    let sin = Math.sin(radians);
    let nx = (cos * (x - cx)) + (sin * (y - cy)) + cx;
    let ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
    return {x:Math.round(nx), z:Math.round(ny)};
}

function distance(post_ref:{x:number,z:number}, post_next:{x:number,z:number}){
  return (
    Math.sqrt(Math.pow(post_next.x - post_ref.x,2)
    +Math.pow(post_next.z - post_ref.z,2)
    ))
}

export function angleDegToXZVector(angleDeg: number, length = 1): {x:number,y:number,z:number} {
  const rad = (angleDeg)*Math.PI/180;
  const x = -Math.cos(rad) * length;
  const z = -Math.sin(rad) * length;
  return {x:x, y:0, z:z};
}

export function xzVectorToAngleDeg(vector: {x:number,y:number,z:number}): number {
  const angleRad = Math.atan2(vector.z, vector.x);
  return (angleRad)*180/Math.PI;
}

function xzToAngle(post_ref:{x:number,z:number}, post_prev:{x:number,z:number}, post_next:{x:number,z:number}){
    let angle = -(180-(Math.atan2(post_ref.z-post_next.z,post_next.x-post_ref.x)*180/Math.PI - Math.atan2(post_prev.z-post_ref.z,post_ref.x-post_prev.x)*180/Math.PI));

  if (angle > 180){angle -= 360;}
  else if (angle <= -180){angle += 360;}

  return angle
}

function direction_vector (point0:PostsType, point1:PostsType){
  
  const d_vector = normalize(point1.x-point0.x,point1.y_ref2-point0.y_ref2,point1.z-point0.z);

  return d_vector;
}

function direction_vector_xyz (point0:{x:number,y:number,z:number}, point1:{x:number,y:number,z:number}){
  
  const d_vector = normalize(point1.x-point0.x,point1.y-point0.y,point1.z-point0.z);

  return d_vector;
}

function angle_between_vectors(a:{x:number,y:number,z:number},b:{x:number,y:number,z:number}){
    return Math.round(10*Math.acos(dot_product(a,b)/(norm_vector(a)*norm_vector(b)))*180/Math.PI)/10;
}

function cross_product(a:{x:number,y:number,z:number},b:{x:number,y:number,z:number}){
    return {x: a.y*b.z - a.z*b.y, y: a.z*b.x - a.x*b.z, z: a.x*b.y - a.y*b.z};
}

function dot_product(a:{x:number,y:number,z:number},b:{x:number,y:number,z:number}){
    let c = a.x*b.x + a.y*b.y+ a.z*b.z;
    return c;
}

function norm_function(x:number,y:number,z:number){
  return Math.sqrt(Math.pow(x,2)+Math.pow(y,2)+Math.pow(z,2));
}

function norm_vector(a:{x:number,y:number,z:number}){
  return norm_function(a.x,a.y,a.z);
}

function normalize(x:number,y:number,z:number){
  let norm = norm_function(x,y,z);
  //  console.log(norm);
  return {vector:{x:Math.round(1000*x/norm)/1000, y:Math.round(1000*y/norm)/1000, z:Math.round(1000*z/norm)/1000},norm:norm};
}

function toPlane(point:{x:number,y:number,z:number}, dir:{x:number,y:number,z:number}, coor:{x:number,y:number,z:number}, normal:{x:number,y:number,z:number}){
    let d = normal.x*coor.x + normal.y*coor.y + normal.z*coor.z;

    let dist = (d - normal.x*point.x - normal.y*point.y - normal.z*point.z)/(normal.x*dir.x + normal.y*dir.y + normal.z*dir.z);

    let x = point.x + dist*dir.x
    let y = point.y + dist*dir.y
    let z = point.z + dist*dir.z

    return {x:x, y:y, z:z};
}

async function downloadPdf() {
  const details: DocumentDetails = {
    jobNumber: "RS-2904",
    clientName: "Acme Pty Ltd",
    siteAddress: "123 High St, Sydney",
    createdBy: "Pieter",
    createdAt: new Date(),
  };

  const parts: PartRow[] = [
    { partName: "PST-001", id: 1, post_id: 10, drilling_info: "M8", length: 950, lhc: 2, rhc: 2, lvc: 0, rvc: 0, quantity: 4 },
    { partName: "PST-001", id: 2, post_id: 11, drilling_info: "M8", length: 1000, lhc: 2, rhc: 2, lvc: 0, rvc: 0, quantity: 2 },
    { partName: "Glass Panel", id: 3, drilling_info: "", length: 1200, quantity: 6 },
  ];

  const template: TemplateConfig = {
    headerTitle: "Railsafe Balustrades – Parts List",
    headerSubtitle: "Manufacture Sheet",
    footerLeft: "Confidential",
    footerRight: "Page {page} of {pages}",
    // Optional: base64 data URL for a small logo (PNG/JPG)
    // logoDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    pageSize: "a4",
    pageOrientation: "portrait",
    margin: 12,
  };

  const doc = await generatePartsPdf(details, parts, template);
  doc.save(`parts-${details.jobNumber}.pdf`);
}

function Round(n:number,d:number){
    return Math.round(n*Math.pow(10,d))/Math.pow(10,d)
}

function toNumberOr<TDefault extends number>(
  value: unknown,
  fallback: TDefault
): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function normaliseFoundationArray(raw: unknown): FoundationType[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) => {
      const obj = item as Record<string, unknown>;

      return {
        id: toNumberOr(obj.id, index + 1),
        type: typeof obj.type === "string" ? obj.type : "F",
        length: toNumberOr(obj.length, 0),
        angle: toNumberOr(obj.angle, 0),
        offset: toNumberOr(obj.offset, 0),
        sections: toNumberOr(obj.sections, 0),
        height: toNumberOr(obj.height, 0),
        x: toNumberOr(obj.x, 0),
        z: toNumberOr(obj.z, 0),
        y: toNumberOr(obj.y, 0),
      } satisfies FoundationType;
    });
}

function normalisePostsArray(raw: unknown): PostsType[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) => {
      const obj = item as Record<string, unknown>;

      return {
        id: toNumberOr(obj.id, index + 1),
        post_id: toNumberOr(obj.post_id, index + 1),
        type: typeof obj.type === "string" ? obj.type : "BP",
        length: toNumberOr(obj.length, 0),
        angle: toNumberOr(obj.angle, 0),
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
