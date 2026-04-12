// @/app/(rs)/drawingtool/canvas/DropAnalyser.tsx
'use client';
import { generatePartsPdf, type PartRow, type DocumentDetails, type TemplateConfig } from "@/app/(rs)/drawingtool/generatePartsPdf"
import { useEffect, useState, useMemo, useRef, useCallback, useLayoutEffect } from 'react';
import { Canvas2D } from "@/app/(rs)/drawingtool/canvas/Canvas"

import { cn } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"

import { toast } from "sonner";
import { useAction } from "next-safe-action/hooks";
import { saveBalconyAction } from "@/app/actions/saveBalconyAction";
import { saveBalconyGeometryAction } from "@/app/actions/saveBalconyGeometryAction";
import { ArrowDown, RefreshCw } from "lucide-react";


type SliderProps = React.ComponentProps<typeof Slider>


import { Button } from "@/components/ui/button"
import { Checkbox } from '@/components/ui/checkbox';

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { getMaxPostCentresSpacingMm, type WindLoad } from "@/lib/jobDesignRules";


// import { ModelViewer } from '@/app/(rs)/drawingtool/Renderer';


// DropAnalyser.tsx (or where you render the viewer)
import dynamic from 'next/dynamic';

// if your file exports `ModelViewer` named:
const ModelViewer = dynamic(() => import('@/app/(rs)/drawingtool/Renderer').then(m => m.ModelViewer), {
  ssr: false,
  loading: () => null, // optional skeleton
});


import DropTable from './DropTable';
import DropFoundationTable from './DropFoundationTable';
import { DropToPartslist } from './DropsToPartslist';
import { InputWithLabel } from '@/components/inputs/InputWithLabel';

import type { PartTypePost, PostVectorType, PartTypeRail, PartTypeVertical, PartTypeGlass, PartTypeComponent, InfillVectorType, ToprailVectorType } from "./DropsToPartslist"

export type PostsType = {id:number, post_id:number, type:string, length:number, angle:number, reversed:boolean, height:number, x:number, z:number, y_ref1:number, y_ref2:number, y_ref3:number}

export type FoundationType = {id:number, type:string, length:number, angle:number, offset:number, sections:number, height:number, x:number, z:number, y:number}

type Camera_props = {
  x: number; y: number; z: number;
  o_x: number; o_y: number; o_z: number;
  fov: number;
};



export type TableEvent =
  | { kind: 'action'; action: 'add' | 'multiply' | 'divide' | 'remove' | 'join'; id: number; times: number }
  | { kind: 'editRow'; rowIndex: number; row: PostsType }; // full updated row

export type FoundationTableEvent =
  | { kind: 'action'; action: 'add' | 'multiply' | 'divide' | 'remove' | 'join'; id: number; times: number }
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
    id: number;
    jobId: number;
    jobStageId: number;
    drop: string;
    balconyNo: string;

    foundationArray: FoundationType[];
    postsArray: PostsType[];

    foundationArrayRaw: FoundationType[];
    postsArrayRaw: PostsType[];

    heightMm?: number | null;
    panelMm?: number | null;
    fflMm?: number | null;
    ffl_use?: boolean | null;
    design?: string | null;
    anchorage?: string | null;
    toprail?: string | null;
    infill?: string | null;
    metadata?: any;
    notes?: string | null;
    version?: number | null;
    isDeleted?: boolean | null;
  };
  jobNumber: number;
  stageNo: number;
  postIdStart: number;
  maxPostSpacing?: number;
  windload: WindLoad;
};


export function DropAnalyser({ balcony, jobNumber, stageNo, postIdStart, maxPostSpacing, windload }: DropAnalyserProps) {

    const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

    const [job_number, set_job_number] = useState<number>(jobNumber);
    const [job_stage, set_job_stage] = useState<number>(stageNo);
    const [drop_name, set_drop_name] = useState<string>(balcony.drop);
    const [balcony_name, set_balcony_name] = useState<string>(balcony.balconyNo);

    const [checkedPostDrawing, setPostChecked] = useState<boolean>(false);
    const [checkedFoundationDrawing, setFoundationChecked] = useState<boolean>(true);
    const [checkedFloorRef, setFloorRefChecked] = useState<boolean>(false);
    const [checkedShowCuttingPlanes, setShowCuttingPlanes] = useState<boolean>(false);
    const [checkedShowDimensions, setShowDimensions] = useState<boolean>(false);
    const [checkedShowLaserLine, setShowLaserLine] = useState<boolean>(false);
        
    const [checked_reset, setChecked_reset] = useState<boolean>(true);

    const [parentData, setParentData] = useState({x:0,y:0});

    const [tableAction, setTableAction] = useState({action:"none", id:0})

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
        {ambient_intensity:0.5, ambient_color:0xFFFFFF, light_intensity:0.5, light_color:0xFFFFFF, x:10, y:10, z:10}
    )
    
    const [minHeight, setMinHeight] = useState<number | "">(1020); 
    const [panelHeight, setPanelHeight] = useState<number | "">(950); 
    const [floorRef, setFloorRef] = useState<number | "">(0); 

    const [design, setDesign] = useState<string>("RD-D1")

    const [allowed_length, set_allowed_length] = useState<number>(
        maxPostSpacing ?? 1280
    )

    const [foundation_array, set_foundation_array] = useState<FoundationType[]>(
        normaliseFoundationArray(balcony.foundationArrayRaw) ?? [{id:1, type:'F', length:1000, angle:180, offset:90, sections:1, height:0, x:0, z:-90, y:1020},
            {id:2, type:'F', length:0, angle:180, offset:90, sections:0, height:0, x:1000, z:-90, y:1020}
            ]
    );

    const [posts_array, set_posts_array] = useState<PostsType[]>(
        normalisePostsArray(balcony.postsArrayRaw) ?? [{id:1,  post_id:1, type:'BP', length:1000, angle:180, reversed:false, height:0, x:0, z:0, y_ref1:1020, y_ref2:989, y_ref3:80},{id:2, post_id:2, type:'BP', length:0, angle:180, reversed:false, height:0, x:1000, z:0, y_ref1:1020, y_ref2:989, y_ref3:80}]
    )
    

    const initialGeometryRef = useRef<{
        foundationArray: FoundationType[];
        postsArray: PostsType[];
    }>({
        foundationArray: normaliseFoundationArray(balcony.foundationArrayRaw ?? balcony.foundationArray),
        postsArray: normalisePostsArray(balcony.postsArrayRaw ?? balcony.postsArray),
    });

    const [needsInitialParts, setNeedsInitialParts] = useState(false);
    const initLatchRef = useRef<string | null>(null);
    
    const [initTick, setInitTick] = useState(0); // 0 = not ready, 1 = ready

    const initReady = initTick > 0;

    const prevBalconyIdRef = useRef<number | null>(null);


    const postHeightsKey = useMemo(() => {
    // only heights matter for effectiveFfl
    // (string key is fine for debugging; later you can replace with a cheap hash)
    // console.log(posts_array.map(p => p.height).join(","))
    return posts_array.map(p => p.height).join(",");
    }, [posts_array]);

    const minPostHeight = useMemo(() => {
        if (!posts_array.length) return 0;
        return Math.min(...posts_array.map(p => p.height));
    }, [postHeightsKey]);

    const floorRefNum = floorRef === "" ? null : floorRef;

    const effectiveFfl = useMemo(() => {
    if (!posts_array.length) return 0;

    // ✅ Design-specific override
    if ((design === "RD-D9" || design === "RD-D11" || design === "RD-D13") && checkedFloorRef && floorRefNum !== null) {
        return floorRefNum;
    }

    const excluded = new Set(["SFI", "SFO", "S", "G", "NP", "EC", "WC"]);
    const eligible = posts_array.filter(p => !excluded.has(p.type));

    // ✅ If no eligible posts remain, fall back to floorRef (if enabled), otherwise 0
    if (eligible.length === 0) {
        return checkedFloorRef && floorRefNum !== null ? floorRefNum : 0;
    }

    const minEligibleHeight = Math.min(...eligible.map(p => p.height));

    if (checkedFloorRef && floorRefNum !== null) {
        if (floorRefNum < minEligibleHeight) return floorRefNum;
    }

    return minEligibleHeight;
    }, [design, checkedFloorRef, floorRefNum, postHeightsKey]);





    function useChangedKeys(label: string, values: Record<string, any>) {
        const prev = useRef<Record<string, any> | null>(null);
        useEffect(() => {
            if (!prev.current) {
                prev.current = values;
                console.log(`[${label}] first`, values);
            return;
            }
            const changes: Record<string, { from: any; to: any }> = {};
            for (const k of Object.keys(values)) {
                if (!Object.is(prev.current[k], values[k])) {
                    changes[k] = { from: prev.current[k], to: values[k] };
                }
            }
            if (Object.keys(changes).length) {
                console.log(`[${label}] changed`, changes);
            }
            prev.current = values;
        });
    }

    useChangedKeys("effectiveFfl deps", {
    initReady,
    checkedFloorRef,
    floorRef,
    minPostHeight,
    postsArrayRef: posts_array, // see if the array identity is changing constantly
    });

    const pendingInitRef = useRef<{
        balconyKey: string;
        nextFoundation: FoundationType[];
        nextPosts: PostsType[];
        nextDesign: string;
        nextFloorRef: number;
        nextFloorUse: boolean;
        nextMinHeight: number;
        nextPanelHeight: number;
    } | null>(null);

    const postsDerived = useSyncTransformer(
        posts_array,
        (posts) => (initReady ? computeGeometryPosts(posts, effectiveFfl, postIdStart) : posts),
        [posts_array, initReady, effectiveFfl, postIdStart]
    );

    const foundationDerived = useSyncTransformer(foundation_array, computeGeometryFoundation, [foundation_array]);
    const postRefDerived = useSyncTransformer(foundationDerived, (posts) => computeGeometryPostRef(posts, allowed_length), [foundationDerived, allowed_length]);

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
        [{id: 1, post_id: 1,
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
    const bounds = useSyncTransformer(
        [postsDerived, foundationDerived] as const,
        ([posts, foundations]) => xy_Boundaries(posts, foundations),
        [postsDerived, foundationDerived]
    );

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

    function sameJson(a: unknown, b: unknown) {
        try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
    }

    // const isDirty = useMemo(() => {
    //     const initial = initialGeometryRef.current;
    //     try {
    //         return (
    //         JSON.stringify(initial.foundationArray) !== JSON.stringify(foundation_array) ||
    //         JSON.stringify(initial.postsArray) !== JSON.stringify(posts_array)
    //         );
    //     } catch {
    //         return true;
    //     }
    // }, [foundation_array, posts_array]);

    function saveGeometry() {
        executeGeometrySave({
            balconyId: balcony.id,
            jobId: balcony.jobId,
            jobStageId: balcony.jobStageId,

            // ✅ new fields
            heightMm: typeof minHeight === "number" ? minHeight : (balcony.heightMm ?? 1020),
            panelMm: typeof panelHeight === "number" ? panelHeight : (balcony.panelMm ?? 1020),
            fflMm: typeof floorRef === "number" ? floorRef : (balcony.fflMm ?? 0),
            ffl_use: checkedFloorRef,

            foundationArray: foundationDerived,
            postsArray: postsDerived,
            foundationArrayRaw: foundation_array,
            postsArrayRaw: posts_array,
        });

        initialGeometryRef.current = {
            foundationArray: JSON.parse(JSON.stringify(foundation_array)),
            postsArray: JSON.parse(JSON.stringify(posts_array)),
        };
    }

    const {
        execute: executeGeometrySave,
        isPending: isSavingGeometry,
        } = useAction(saveBalconyGeometryAction, {
        onSuccess({ data }) {
            if (data?.success) {
            toast.success(data.message ?? "Geometry saved.");
            }
        },
        onError({ error, input }) {
        // 1) Always log the raw thing too (even if it prints `{}`)
        console.error("saveBalconyGeometryAction raw error:", error);

        // 2) Pull out the common next-safe-action fields explicitly
        const e = error as any;

        console.group("saveBalconyGeometryAction details");
        console.log("name:", e?.name);
        console.log("message:", e?.message);
        console.log("serverError:", e?.serverError);
        console.log("cause:", e?.cause);
        console.log("cause?.message:", e?.cause?.message);

        // validation shape (most important for your case)
        console.log("validationErrors:", e?.validationErrors);
        console.log("fieldErrors:", e?.fieldErrors);

        // Some libs put Zod info here
        console.log("issues:", e?.issues);
        console.log("stack:", e?.stack);

        // 3) Show the payload we sent (this is crucial to spot string vs number)
        console.log("input:", input);

        // 4) JSON-safe dump (handles non-enumerable props better)
        try {
            console.log(
            "error JSON:",
            JSON.stringify(
                e,
                Object.getOwnPropertyNames(e), // include non-enumerables
                2
            )
            );
        } catch (jsonErr) {
            console.log("error JSON stringify failed:", jsonErr);
        }

        // 5) Deep-inspect in Chrome DevTools
        console.dir(e, { depth: 6 });
        console.groupEnd();

        // existing toast logic can stay
        const msg =
            e?.serverError ??
            e?.message ??
            e?.cause?.message ??
            "";

        const isRedirect =
            e?.name === "NEXT_REDIRECT" ||
            String(msg).includes("NEXT_REDIRECT") ||
            String(msg).includes("redirect");

        if (isRedirect) {
            toast.error("Session expired / redirect to login. Check console.");
            return;
        }

        if (e?.validationErrors || e?.fieldErrors || e?.issues) {
            toast.error("Validation error (see console).");
            return;
        }

        toast.error(msg || "Failed to save geometry. (See console.)");
        }

    });

    const bounds3D = useMemo(() => {
        return computeBoundsFromContributors([
            { kind: "posts", items: posts_data_array as PartTypePost[] },
            { kind: "toprails", items: top_rail_data_array as PartTypeRail[] },
        ]);
    }, [posts_data_array, top_rail_data_array]);

    function fit3DToView() {
        const next = fitCameraToBounds(bounds3D, camera_on_load.fov ?? 75, {
            padding: 1.35,
            viewDir: { x: -1, y: 0.35, z: 1 }, // 👈 left instead of right
            minDistance: 200,
        });

        set_camera(next);
        set_reset_camera(true);
    }

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
        const s = e.currentTarget.value;
        setFloorRefSafe(s === "" ? 0 : Number(s));
    };

    const setFloorRefSafe = useCallback((next: number) => {
        if (!Number.isFinite(next)) return;
        // console.log("Floor ref: ", next)
        setFloorRef(prev => (Object.is(prev, next) ? prev : next));
    }, []);

    const handleTableAction = (rowAction : TableEvent) => {
        console.log("[CALL] handleTableAction", rowAction);
        console.trace();
        let firstId = postIdStart;

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
                case "join":
                    const post_prev: PostsType = {...posts_array[rowAction.id-1], length : posts_array[rowAction.id-1].length+posts_array[rowAction.id].length}
                    tempArray=([...posts_array.slice(0,rowAction.id-1), post_prev, ...posts_array.slice(rowAction.id+1)])
                    break
                default:

            }

        } else if (rowAction.kind === 'editRow') {
            // 👇 apply the edited row back at the same index
            // console.log("row" , posts_array[rowAction.rowIndex],rowAction.row)
            tempArray = posts_array.map((post, i) =>
            i === rowAction.rowIndex ? { ...post, ...rowAction.row } : post
            );
        }

        let xz = {x:posts_array[0].x, z:posts_array[0].z}
        let angleSum = 0

        // console.log(tempArray.map(p => p.y_ref3).join(","))
        // console.log(tempArray.map(p => p.y_ref2).join(","))
        // console.log(tempArray.map(p => p.y_ref1).join(","))

        set_posts_array([...tempArray.map( (post, i) => {

            angleSum += post.angle+180;

            let nextP =  rotate(xz.x, xz.z, xz.x + post.length, xz.z, angleSum)
            let prevP = {x:xz.x, z:xz.z}
            xz = nextP

            return {id:i, post_id: isNumberedPost(post) ? firstId++ : 0, type:post.type, length:(i < tempArray.length-1 ? post.length:0), angle:(i < tempArray.length-1 ? post.angle:180), reversed:post.reversed, height:post.height, x:prevP.x, z:prevP.z, y_ref1:post.y_ref1, y_ref2:post.y_ref2, y_ref3:post.y_ref3}

        })])
        // console.log(posts_array)
    }

    const handleFoundationTableAction = (rowAction : FoundationTableEvent) => {
        console.log("[CALL] handleFoundationTableAction", rowAction);
        console.trace();
        
        let firstId = foundation_array[1].id

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
                case "join":
                    const post_prev: FoundationType = {...foundation_array[rowAction.id-1], length : foundation_array[rowAction.id-1].length+foundation_array[rowAction.id].length}
                    tempArray=([...foundation_array.slice(0,rowAction.id-1), post_prev, ...foundation_array.slice(rowAction.id+1)])
                    break
                default:

            }

        } else if (rowAction.kind === "editRow") {
            const idx = rowAction.rowIndex;

            // apply the edit
            tempArray = foundation_array.map((post, i) =>
                i === idx ? { ...post, ...rowAction.row } : post
            );

            // mirror offset between row 0 and 1 only
            if (idx === 0 || idx === 1) {
                const offset = tempArray[idx]?.offset;

                // only mirror if we have a real number
                if (typeof offset === "number" && Number.isFinite(offset)) {
                const other = idx === 0 ? 1 : 0;

                if (tempArray[other]) {
                    tempArray = tempArray.map((post, i) =>
                    i === other ? { ...post, offset } : post
                    );
                }
                }
            }
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

    const glassType = balcony.infill ?? "";

    const partslistAction = () => {
        // console.log(postsDerived.map(p => p.height).join(","))
        // console.log(postsDerived.map(p => p.y_ref1).join(","))
        // console.log(postsDerived.map(p => p.y_ref2).join(","))
        // console.log(postsDerived.map(p => p.y_ref3).join(","))
        const partslist = DropToPartslist([...postsDerived],design,glassType)
        console.log(partslist)
        if(partslist.post_partslist.length && partslist.post_vectors.length && (partslist.post_partslist.length == partslist.post_vectors.length)){
            set_posts_data_array([...partslist.post_partslist.map((post,_i) => {return post})])
            set_posts_vectors_array([...partslist.post_vectors.map((post_vec,_i) => {return post_vec})])
        }
        else{
            set_posts_data_array([])
            set_posts_vectors_array([]) // No Posts? Strange
        }

        if(partslist.baseplate_partslist.length){
            set_baseplates_data_array([...partslist.baseplate_partslist.map((baseplate,_i) => {return {...baseplate, type:baseplate.partName}})])
        }
        else{
            set_baseplates_data_array([])
        }

        if(partslist.fixed_components_partslist.length){
            set_fixed_components_data_array([...partslist.fixed_components_partslist.map((component,_i) => {return {...component, type:component.partName}})])
        }
        else{
            set_baseplates_data_array([])
        }

        if(partslist.infill_vectors.length){
            set_infill_vectors_array([...partslist.infill_vectors.map((infill_vec,_i) => {return infill_vec})])
        } // The Else empty here seems like something is wrong or less than 2 posts are available
        else{
            set_infill_vectors_array([])
        }
        
        if(partslist.midrail_partslist.length && partslist.infill_vectors.length){
            set_mid_rail_data_array([...partslist.midrail_partslist.map((rail,_i) => {return {...rail, length: (rail.partName === "65x16 Slat") ? rail.length: rail.length+100}})])
        }
        else{
            set_mid_rail_data_array([])
        }
        
        if(partslist.vertical_infill_partslist.length && partslist.infill_vectors.length){
            // console.log([...partslist.vertical_infill_partslist.map((rail,_i) => {return {...rail, length: rail.length+100}})])
            set_vertical_infill_data_array([...partslist.vertical_infill_partslist.map((rail,_i) => {return {...rail, length: rail.length+100}})])
        }
        else{
            set_vertical_infill_data_array([])
        }
        
        if(partslist.glass_infill_partslist.length && partslist.infill_vectors.length){
            // console.log([...partslist.glass_infill_partslist.map((rail,_i) => {return {...rail, length: rail.length+100}})])
            set_glass_infill_data_array([...partslist.glass_infill_partslist.map((rail,_i) => {return {...rail}})])
        }
        else{
            set_glass_infill_data_array([])
        }

        if(partslist.toprail_vectorslist.length && partslist.toprail_partslist.length){
            // console.log([...partslist.glass_infill_partslist.map((rail,_i) => {return {...rail, length: rail.length+100}})])
            set_top_rail_data_array([...partslist.toprail_partslist.map((rail,_i) => {return {...rail, length: rail.length+100}})])
            set_toprail_vectors_array([...partslist.toprail_vectorslist.map((toprail_vec,_i) => {return toprail_vec})])
        }
        else{
            set_glass_infill_data_array([])
        }

        // saveGeometry();
        partsBalconyIdRef.current = balcony.id;
        setPartsRevision((n) => n + 1);
    }

    const balconyKey = `${balcony.id}:${balcony.version ?? 0}`;

    useLayoutEffect(() => {
        // reset init gating for this balconyKey *synchronously before paint*
        initLatchRef.current = null;
        setInitTick(0);

        const nextFoundation = normaliseFoundationArray(balcony.foundationArrayRaw ?? balcony.foundationArray);
        const nextPosts = normalisePostsArray(balcony.postsArrayRaw ?? balcony.postsArray);

        const nextDesign = balcony.design ?? "RD-D1";
        const nextMinHeight = balcony.heightMm ?? 1020;
        const nextPanelHeight = balcony.panelMm ?? 950;
        const nextFloorUse = Boolean(balcony.ffl_use);
        const nextFloorRef = balcony.fflMm ?? 0;

        pendingInitRef.current = {
            balconyKey,
            nextFoundation,
            nextPosts,
            nextDesign,
            nextFloorRef,
            nextFloorUse,
            nextMinHeight,
            nextPanelHeight,
        };

        set_job_number(jobNumber);
        set_job_stage(stageNo);
        set_drop_name(balcony.drop);
        set_balcony_name(balcony.balconyNo);

        setMinHeight(nextMinHeight);
        setPanelHeight(nextPanelHeight);
        setFloorRefChecked(nextFloorUse);
        setDesign(nextDesign);
        set_allowed_length(maxPostSpacing ?? 1280);
        setFloorRefSafe(nextFloorRef);

        set_foundation_array(prev => (sameJson(prev, nextFoundation) ? prev : nextFoundation));
        // console.log(`Load: `, nextPosts)
        set_posts_array(prev => (sameJson(prev, nextPosts) ? prev : nextPosts));

        initialGeometryRef.current = { foundationArray: nextFoundation, postsArray: nextPosts };

        const isNewBalcony = prevBalconyIdRef.current !== balcony.id;
        prevBalconyIdRef.current = balcony.id;
        if (isNewBalcony) setNeedsInitialParts(true);

        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [jobNumber, stageNo, balconyKey]);

        useEffect(() => {
            const pending = pendingInitRef.current;
            if (!pending) return;
            if (pending.balconyKey !== balconyKey) return;

            const ready =
                sameJson(foundation_array, pending.nextFoundation) &&
                sameJson(posts_array, pending.nextPosts) &&
                design === pending.nextDesign &&
                (typeof floorRef === "number" ? floorRef : Number(floorRef)) === pending.nextFloorRef &&
                checkedFloorRef === pending.nextFloorUse &&
                (typeof minHeight === "number" ? minHeight : Number(minHeight)) === pending.nextMinHeight &&
                (typeof panelHeight === "number" ? panelHeight : Number(panelHeight)) === pending.nextPanelHeight;

            if (!ready) return;

            if (initLatchRef.current === balconyKey) return;
            initLatchRef.current = balconyKey;

            setInitTick(1);
        }, [
            balconyKey,
            foundation_array,
            posts_array,
            design,
            floorRef,
            checkedFloorRef,
            minHeight,
            panelHeight,
        ]);



    const prevBalconyKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (!needsInitialParts) return;

        const key = `${balcony.id}:${balcony.version ?? 0}`;

        if (prevBalconyKeyRef.current === key) {
            setNeedsInitialParts(false);
            return;
        }

        partslistAction();

        prevBalconyKeyRef.current = key;
        setNeedsInitialParts(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [needsInitialParts, balconyKey]);

        const postsWithOffset = () => {
        console.log("Calculating posts...")

        let firstId = 0
        let count = postIdStart
        let tempArray:PostsType[] = []

        const post_y_ref = minHeight === "" || panelHeight === ""? 0 : minHeight+Math.max(...foundationDerived.map(post => {return post.height}),...postsDerived.map(post => {return post.height}))-( checkedFloorRef && (floorRef !== "") ? Math.min(floorRef,...foundationDerived.map(post => {return post.height}),...postsDerived.map(post => {return post.height})) : Math.min(...foundationDerived.map(post => {return post.height}),...postsDerived.map(post => {return post.height})))
        // console.log(`Y Ref ${post_y_ref}`)
        postRefDerived.map( (ref,i) => tempArray.push(
            {id:firstId++, post_id: isNumberedPost(ref) ? count++ : 0, type: i===0 || i === postRefDerived.length-1 ? "EC" : balcony.anchorage ?? "BP", length:ref.length, angle:ref.angle != 180 ? (i > 0 ? (tempArray[i-1].type === "EC" ? 180 : ref.angle) : ref.angle) : ref.angle, reversed:false, height:ref.height, x:ref.x, z:ref.z, y_ref1:post_y_ref, y_ref2:post_y_ref-31, y_ref3:post_y_ref-Number(panelHeight)}
        ))
        // console.log(postRefDerived)
        set_posts_array([...tempArray])   
    }

    const designs = [
        "RD-D1","RD-D2","RD-D3","RD-D3SLATS","RD-D4",
        "RD-D4SLATS","RD-D5","RD-D6","RD-D7","RD-D8",
    ];

    const [partsRevision, setPartsRevision] = useState(0);
    const partsBalconyIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (partsBalconyIdRef.current !== balcony.id) return; // ensure current balcony
        if (posts_data_array.length < 1) return;
        if (top_rail_data_array.length < 1) return;

        fit3DToView();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [partsRevision]);

    const maxBalHeightMm = useMemo(() => {
        if (minHeight === "") return null;

        const maxY = Math.max(
            ...foundationDerived.map((p) => p.height),
            ...postsDerived.map((p) => p.height)
        );

        const minY = checkedFloorRef && floorRef !== ""
            ? Math.min(
                floorRef,
                ...foundationDerived.map((p) => p.height),
                ...postsDerived.map((p) => p.height)
            )
            : Math.min(
                ...foundationDerived.map((p) => p.height),
                ...postsDerived.map((p) => p.height)
            );

        return Round(Number(minHeight) + maxY - minY, 1);
    }, [minHeight, checkedFloorRef, floorRef]);

    const derivedAllowedLength = useMemo(() => {
        const spacing = getMaxPostCentresSpacingMm({
            design,
            wind: windload,
            balustradeHeightMm: maxBalHeightMm, // ✅ use derived max height
        });
        // console.log("spacing" , spacing)

        return Math.min(
            spacing ?? Infinity,
            maxPostSpacing ?? Infinity,
            1280
        );
    }, [design, windload, maxBalHeightMm, maxPostSpacing]);

    useEffect(() => {
        set_allowed_length((prev) => (prev === derivedAllowedLength ? prev : derivedAllowedLength));
    }, [derivedAllowedLength]);

    const handleCanvasData = useCallback((next: { x: number; y: number }) => {
        setParentData((prev) =>
            prev.x === next.x && prev.y === next.y ? prev : next
        );
        }, []);


    return (
        <>
        <div>
            Job: {job_number} Stage: {job_stage}  Drop: {drop_name} Level: {balcony_name}
        </div>
        <div className="flex flex-1/2 gap-4 w-full h-full">
            <div style={{ width: 700, height: 200 }}>
                <div className="h-full overflow-auto">
                    
                    
                    <Button
                        type="button"
                        variant="default"
                        title="action"
                        onClick={() => {
                            saveGeometry()
                        }}
                    >
                        Save    
                    </Button>
                    {/* <Button
                        type="button"
                        variant="default"
                        className="ml-3"
                        title="action"
                        onClick={() => {
                            downloadPdf()
                        }}
                    >
                        Print    
                    </Button> */}
                    {/* <NumberPromptDialog
                    trigger={<Button variant="default">Set Count</Button>}
                    title="Set item count"
                    description="Must be at least 1."
                    confirmLabel="Apply"
                    onConfirm={(n) => {
                        // your function here
                        console.log("Confirmed with:", n);
                    }}
                    /> */}

                    <label className="flex items-center gap-2">
                    <Checkbox
                    checked={checkedPostDrawing}
                    onCheckedChange={(v) => {setPostChecked(v === true), setChecked_reset(false), setFoundationChecked(false)}} // coerce to boolean
                    />
                    <span>Post Drawing enabled</span>
                    <Checkbox
                    checked={checkedFoundationDrawing}
                    onCheckedChange={(v) => {setFoundationChecked(v === true), setChecked_reset(false), setPostChecked(false)}} // coerce to boolean
                    />
                    <span>Foundation Drawing enabled</span>
                </label>

                    {/* <p>x: {parentData.x}   z: {parentData.y} (first post x=0,z=0)</p> */}

                    <p>Zoom {zoom}</p>
                    <Slider
                        defaultValue={[10]}
                        min={1}
                        max={40}
                        step={1}
                        className={cn("w-[30%] p-5")}
                        onValueChange={(v) => setZoom(v[0])} // v is number[]
                    />
                    
                    <div className="inline-flex rounded-md border overflow-hidden">
                        <Button
                            type="button"
                            variant={viewMode === '2d' ? "default" : "ghost"}
                            className="rounded-none"
                            onClick={() => setViewMode('2d')}
                        >
                            2D
                        </Button>
                        <Button
                            type="button"
                            variant={viewMode === '3d' ? "default" : "ghost"}
                            className="rounded-none"
                            onClick={() => {setViewMode('3d')

                                if (posts_data_array.length < 1) return;
                                if (top_rail_data_array.length < 1) return;

                                fit3DToView();
                            }
                                
                            }
                        >
                            3D
                        </Button>
                </div>
                <Button
                        type="button"
                        variant="default"
                        className="ml-3"
                        title="action"
                        onClick={() => {
                            // console.log(Round(Number(minHeight)+Math.max(...foundationDerived.map(post => {return post.height}),...postsDerived.map(post => {return post.height}))-( checkedFloorRef && (floorRef !== "") ? Math.min(floorRef,...foundationDerived.map(post => {return post.height}),...postsDerived.map(post => {return post.height})) : Math.min(...foundationDerived.map(post => {return post.height}),...postsDerived.map(post => {return post.height}))),1))
                            partslistAction()
                        }}
                    >
                        
                        <RefreshCw className="h-4 w-4 transition-transform hover:rotate-180" />
                        Drawing
                    </Button>

                </div>
            </div>
            <div style={{ width: 800, height: 200 }}>
                <div className="h-full overflow-auto">
                    <div className="grid w-full max-w-sm items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label htmlFor="minHeight" className="text-sm font-medium">
                                Min height (mm)
                            </label>

                            <Input
                                id="minHeight"
                                type="number"
                                placeholder="1020"
                                min={100}
                                step={1}
                                value={minHeight}
                                onChange={onMinHeightChange}
                                className="w-28"   // or remove and let it fill with 1fr
                            />
                            <p className="text-xs text-muted-foreground">
                                {/* Current value: {minHeight === "" ? "—" : minHeight}  */}
                                Current Max: {minHeight === "" ? "—" : Math.max(...foundationDerived.map(post => {return post.height}),...postsDerived.map(post => {return post.height}))-Math.min(...foundationDerived.map(post => {return post.height}),...postsDerived.map(post => {return post.height}))+minHeight} mm
                            </p>
                            <DropdownMenu>
                                
                                <DropdownMenuTrigger asChild>
                                    <Button variant="default" className="px-3 py-2 border rounded" style={{width: 150}}>{design}</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                <DropdownMenuLabel>Design</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {designs.map((d) => (
                                <DropdownMenuItem key={d} onSelect={() => setDesign(d)}>
                                    {d}
                                </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                            </DropdownMenu>
                        
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="panelHeight" className="text-sm font-medium">
                                Panel height (mm)
                            </label>

                            <Input
                                id="panelHeight"
                                type="number"
                                placeholder="950"
                                min={design == "RD-D5" ? 66+31: 1}
                                step={design == "RD-D5" ? 74.8 : 1}
                                value={panelHeight}
                                onChange={onPanelHeightChange}
                                className="w-28"   // or remove and let it fill with 1fr
                            />
                            <p className="text-xs text-muted-foreground">
                                {/* Current value: {minHeight === "" ? "—" : minHeight}  */}
                                Max Bottom Airgap: {minHeight === "" || panelHeight === ""? "—" : Round(minHeight-panelHeight+Math.max(...foundationDerived.map(post => {return post.height}),...postsDerived.map(post => {return post.height}))-( checkedFloorRef && (floorRef !== "") ? Math.min(floorRef,...foundationDerived.map(post => {return post.height}),...postsDerived.map(post => {return post.height})) : Math.min(...foundationDerived.map(post => {return post.height}),...postsDerived.map(post => {return post.height}))),1)} mm
                                
                                Min Bottom Airgap: {minHeight === "" || panelHeight === ""? "—" : Round(minHeight-panelHeight,1)} mm
                                
                            </p>
                        
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="floorRef" className="text-sm font-medium">
                                Floor laser level (mm)
                            </label>

                            <Input
                                id="floorRef"
                                type="number"
                                placeholder="0"
                                min={-1800}
                                step={1}
                                value={floorRef === "" ? "" : floorRef}
                                onChange={onFloorRefChange}
                                className="w-28"   // or remove and let it fill with 1fr
                            />
                            <Checkbox
                                checked={checkedFloorRef}
                                onCheckedChange={(v) => {setFloorRefChecked(v === true)}} // coerce to boolean
                                />
                                <span>Use as FFL</span>
                        
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={checkedShowLaserLine}
                                onCheckedChange={(v) => {setShowLaserLine(v === true)}} // coerce to boolean
                                />
                                <span>Show Laser Level  </span>
                            <Checkbox
                                checked={checkedShowDimensions}
                                onCheckedChange={(v) => {setShowDimensions(v === true)}} // coerce to boolean
                                />
                                <span>Show Dimensions </span>
                            <Checkbox
                                checked={checkedShowCuttingPlanes}
                                onCheckedChange={(v) => {setShowCuttingPlanes(v === true)}} // coerce to boolean
                                />
                                <span>Show Cutting Planes </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="text-[clamp(0.75rem, 0.9vw, 0.9rem)] flex flex-1/2 gap-4 w-full h-full">
            <div className="flex flex-1/2 gap-4 w-full">
                {viewMode === '2d' ? (
                    <div className="border border-black" style={{ width: 500, height: 500 }}>
                    <div className="h-full overflow-auto">
                        <Canvas2D
                        onDataSend={handleCanvasData}
                        width={width2D}
                        height={height2D}
                        scale={zoom}
                        foundation_array={foundationDerived}
                        posts_array={postsDerived}
                        allowed_length={allowed_length}
                        />
                    </div>
                    </div>
                ) : (
                    <div className="border border-black" style={{ width: 500, height: 500 }}>
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
                        foundation_array={[
                        ...foundationDerived.map((post) => {
                            const floor =
                            checkedFloorRef && floorRef !== ""
                                ? floorRef
                                : Math.min(
                                    ...foundationDerived.map((p) => p.height),
                                    ...postsDerived.map((p) => p.height)
                                );

                            return { x: post.x, y: -floor, z: post.z };
                        }),
                        ]}
                        box_width={5.52 * 50}
                        box_height={4.7 * 50}
                        camera_on_load={camera_on_load}
                        reset_camera={reset_camera}
                        showLaser={checkedShowLaserLine}
                        showDimensions={checkedShowDimensions}
                        showCuttingPlanes={checkedShowCuttingPlanes}
                    />
                    </div>
                )}
            </div>

            <div className="border border-black" style={{ width: 800, height: 500 }}>
                <div className="h-full overflow-auto">
                    {/* <p>Do: {tableAction.action}   on row: {tableAction.id}</p> */}
                    {/* <DropTable_Copy data={posts_array} action_trigger={handleTableAction} /> */}
                    <DropFoundationTable  data={foundation_array} allowed_spacing={allowed_length} action_trigger={handleFoundationTableAction} />
                    <Button
                        type="button"
                        variant="default"
                        title="action"
                        onClick={() => {
                            postsWithOffset();
                        }}
                        className="inline-flex items-center gap-2"
                        >
                        From Foundation
                        <ArrowDown className="h-4 w-4" />
                    </Button>
                    
                    <DropTable  data={posts_array} allowed_spacing={allowed_length} action_trigger={handleTableAction} />
                </div>
            </div>

        </div>

      
        {/* <Editor name={name} onNameChange={setName} />
        <Preview name={name} /> */}

        {/* {Array.from({ length: posts_data_array.length }, (_, i) => (
            <p key={ posts_data_array[i].id} >
                {JSON.stringify(posts_data_array[i])}
            </p>))} */}
    </>
    )
}



// HELPER FUNCTIONS

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

export function useSyncTransformer<TIn, TOut>(
  input: TIn,
  fn: (input: TIn) => TOut,
  deps: React.DependencyList = [input]
): TOut {
  // NOTE (eslint): `deps` is intentionally caller-controlled.
  // Many call sites pass inline `fn`, and including `fn` here would change behaviour
  // (recomputing every render) and may cascade into extra renders/effects.
  // TODO: Large fix later — migrate call sites to stable `fn` (useCallback) and use [input, fn].
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

function computeGeometryPosts(posts: PostsType[], ffl: number, postIdStart: number) {
    // console.log(ffl)

  if (!posts.length) return posts;

    console.log("FFL", ffl)
    console.log("P1", posts[1].id)
    console.log("y-ref1", posts[1].y_ref1)
    console.log("y-ref2", posts[1].y_ref2)
    console.log("y-ref3", posts[1].y_ref3)
    console.log("height", posts[1].height)
    
 

  let firstId = postIdStart;   // <-- THIS is the fix
  let xz = { x: posts[0].x, z: posts[0].z };
  let angleSum = 0;

    const wall_offset = posts.reduce((max, p) => {
    if (p.type === "SFI" || p.type === "SFO") {
        return Math.max(max, p.height - ffl);
    }
    return max;
    }, 0);
    console.log(posts.map(p => p.type).join(","))
    console.log("Wall offset: ", wall_offset)

  return posts.map((post, i) => {
    angleSum += post.angle + 180;
    const nextP = rotate(xz.x, xz.z, xz.x + post.length, xz.z, angleSum);
    const prevP = { x: xz.x, z: xz.z };
    xz = nextP;

    return {
      id: i,
      post_id: isNumberedPost(post) ? firstId++ : 0,
      type: post.type,
      length: i < posts.length - 1 ? Math.round(post.length * 100) / 100 : 0,
      angle: i < posts.length - 1 ? post.angle : 180,
      reversed: post.reversed,
      height: post.height,
      x: prevP.x,
      z: prevP.z,
      y_ref1: post.y_ref1 - ffl+ wall_offset,
      y_ref2: post.y_ref2 - ffl+ wall_offset,
      y_ref3: post.y_ref3 - ffl + wall_offset,
    } as PostsType;
  });
}

function isNumberedPost(p: { type: string }) {
  return !["S", "G", "NP", "EC", "WC"].includes(p.type);
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
                        length: post.length,
                        x : corner_1.x,
                        z : corner_1.z
                    })
                    // tempArray.push({...post,
                    //     length: Math.round(distance(corner_1,corner_2)*100)/100-post.offset - (i===posts.length-2 ? posts[posts.length-1].offset :0),
                    //     x : corner_1.x-post.offset*dir.x,
                    //     z : corner_1.z-post.offset*dir.z
                    // })
                }
                else if ( i === 1){
                    tempArray.push({...post,
                        length: Math.round(distance(corner_1,corner_2)*100)/100-posts[0].length - (i===posts.length-2 ? posts[posts.length-1].offset :0),
                        x : corner_1.x-posts[0].length*dir.x,
                        z : corner_1.z-posts[0].length*dir.z
                    })
                    //  console.log( "L",posts[0].length)
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

                let dist = distance(corner_1,corner_2) - (i===0 || i===1 ? posts[0].length :0) - (i===posts.length-2 ? posts[posts.length-1].offset :0)
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

//   console.log(raw.map(p => p.y_ref3).join(","))
//   console.log(raw.map(p => p.y_ref2).join(","))
//   console.log(raw.map(p => p.y_ref1).join(","))
  return raw
    .map((item, index) => {
      const obj = item as Record<string, unknown>;

    //   console.log(obj)
      return {
        id: toNumberOr(obj.id, index + 1),
        post_id: toNumberOr(obj.post_id, 0),
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


export type Bounds = {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
};

function makeEmptyBounds(): Bounds {
  return {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity },
  };
}

function expandBounds(b: Bounds, x: number, y: number, z: number) {
  if (x < b.min.x) b.min.x = x;
  if (y < b.min.y) b.min.y = y;
  if (z < b.min.z) b.min.z = z;
  if (x > b.max.x) b.max.x = x;
  if (y > b.max.y) b.max.y = y;
  if (z > b.max.z) b.max.z = z;
}

function expandBoundsByExtents(
  b: Bounds,
  cx: number,
  cy: number,
  cz: number,
  ex: number,
  ey: number,
  ez: number
) {
  expandBounds(b, cx - ex, cy - ey, cz - ez);
  expandBounds(b, cx + ex, cy + ey, cz + ez);
}

function degToRad(d: number) {
  return (d * Math.PI) / 180;
}

function computeBoundsFromPostsAndToprails(
  posts: PartTypePost[],
  toprails: PartTypeRail[],
  opts?: {
    postRadiusXZ?: number;      // mm-ish
    railHalfHeight?: number;    // mm-ish
    railHalfWidth?: number;     // mm-ish (profile width)
    minSize?: number;           // avoid degenerate bounds
  }
): Bounds {
  const postRadiusXZ = opts?.postRadiusXZ ?? 30;   // conservative profile radius
  const railHalfHeight = opts?.railHalfHeight ?? 30;
  const railHalfWidth = opts?.railHalfWidth ?? 30;
  const minSize = opts?.minSize ?? 1;

  const b = makeEmptyBounds();

  // Posts: treat as vertical columns from y .. y+height, with small XZ radius.
  for (const p of posts) {
    const y0 = p.y;
    const y1 = p.y + (p.height ?? 0);
    const cy = (y0 + y1) / 2;
    const ey = Math.max(minSize, Math.abs(y1 - y0) / 2);

    expandBoundsByExtents(b, p.x, cy, p.z, postRadiusXZ, ey, postRadiusXZ);
  }

  // Toprails: use length + orientation to get XZ extents cheaply.
  // We compute projected half-length along X and Z:
  // hx = |cos(o)|*(L/2) + railHalfWidth
  // hz = |sin(o)|*(L/2) + railHalfWidth
  for (const r of toprails) {
    const halfLen = Math.max(minSize, (r.length ?? 0) / 2);
    const rad = degToRad(r.o ?? 0);

    const hx = Math.abs(Math.cos(rad)) * halfLen + railHalfWidth;
    const hz = Math.abs(Math.sin(rad)) * halfLen + railHalfWidth;

    expandBoundsByExtents(b, r.x, r.y, r.z, hx, railHalfHeight, hz);
  }

  // If no parts, return a tiny default bounds around origin (prevents NaNs).
  if (!Number.isFinite(b.min.x)) {
    return {
      min: { x: -500, y: -500, z: -500 },
      max: { x: 500, y: 500, z: 500 },
    };
  }

  return b;
}

export type BoundsContributor =
  | { kind: "posts"; items: PartTypePost[] }
  | { kind: "toprails"; items: PartTypeRail[] };
// Later:
// | { kind: "glass"; items: PartTypeGlass[] }
// | { kind: "vertical"; items: PartTypeVertical[] }
// | { kind: "components"; items: PartTypeComponent[] }

export function computeBoundsFromContributors(
  contributors: BoundsContributor[]
): Bounds {
  const b = makeEmptyBounds();

  // reuse the same constants
  const postRadiusXZ = 30;
  const railHalfHeight = 30;
  const railHalfWidth = 30;
  const minSize = 1;

  for (const c of contributors) {
    if (c.kind === "posts") {
      for (const p of c.items) {
        const y0 = p.y;
        const y1 = p.y + (p.height ?? 0);
        const cy = (y0 + y1) / 2;
        const ey = Math.max(minSize, Math.abs(y1 - y0) / 2);
        expandBoundsByExtents(b, p.x, cy, p.z, postRadiusXZ, ey, postRadiusXZ);
      }
    }

    if (c.kind === "toprails") {
      for (const r of c.items) {
        const halfLen = Math.max(minSize, (r.length ?? 0) / 2);
        const rad = degToRad(r.o ?? 0);
        const hx = Math.abs(Math.cos(rad)) * halfLen + railHalfWidth;
        const hz = Math.abs(Math.sin(rad)) * halfLen + railHalfWidth;
        expandBoundsByExtents(b, r.x, r.y, r.z, hx, railHalfHeight, hz);
      }
    }
  }

  if (!Number.isFinite(b.min.x)) {
    return {
      min: { x: -500, y: -500, z: -500 },
      max: { x: 500, y: 500, z: 500 },
    };
  }
  return b;
}


export function fitCameraToBounds(
  bounds: Bounds,
  fovDeg: number,
  opts?: {
    padding?: number; // 1.2..1.6
    viewDir?: { x: number; y: number; z: number }; // direction from center
    minDistance?: number;
  }
): Camera_props {
  const padding = opts?.padding ?? 1.35;
  const viewDir = opts?.viewDir ?? { x: 1, y: 0.8, z: 1 }; // stable iso-ish
  const minDistance = opts?.minDistance ?? 200; // in same units as bounds (mm)

  const cx = (bounds.min.x + bounds.max.x) / 2;
  const cy = (bounds.min.y + bounds.max.y) / 2;
  const cz = (bounds.min.z + bounds.max.z) / 2;

  const sx = bounds.max.x - bounds.min.x;
  const sy = bounds.max.y - bounds.min.y;
  const sz = bounds.max.z - bounds.min.z;

  const radius = 0.5 * Math.sqrt(sx * sx + sy * sy + sz * sz); // bounding sphere radius

  const fovRad = degToRad(fovDeg);
  const dist = Math.max(minDistance, (radius / Math.tan(fovRad / 2)) * padding);

  // normalize viewDir
  const vLen = Math.sqrt(viewDir.x ** 2 + viewDir.y ** 2 + viewDir.z ** 2) || 1;
  const vx = viewDir.x / vLen;
  const vy = viewDir.y / vLen;
  const vz = viewDir.z / vLen;

  return {
    x: cx + vx * dist,
    y: cy + vy * dist,
    z: cz + vz * dist,
    o_x: cx,
    o_y: cy,
    o_z: cz,
    fov: fovDeg,
  };
}
