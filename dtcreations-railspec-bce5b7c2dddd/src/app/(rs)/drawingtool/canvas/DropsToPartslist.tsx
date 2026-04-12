// /src/app/(rs)/drawingtool/canvas/DropsToPartslist.tsx
import { type PostsType, type PlaneVec, type InfillVectors, type ToprailVectors, xzVectorToAngleDeg } from "@/app/(rs)/drawingtool/canvas/DropAnalyser"
import { DEG2RAD, degToRad } from "three/src/math/MathUtils.js"

// Part types
export type PartTypePost = {id:number, post_id:number, partName:string, type:string, height:number, x: number, y:number, z: number, o:number, t:number}
export type PostVectorType = PlaneVec & {id:number}

export type PartTypeRail = {partName:string, id:number, post_id:number,  length: number, x:number,  y:number,  z:number,  o:number, t:number, lhc:number, rhc:number, lvc:number, rvc:number}
export type PartTypeVertical = {id:number, post_id:number, partName:string, length:number, x: number, y:number, z: number, o:number, t:number}

export type PartTypeGlass = {id:number, post_id:number, partName:string, length:number, height:number, thickness:number, glassType:string, x: number, y:number, z: number, o:number, t:number}

export type PartTypeComponent = {id:number, partName:string, x: number, y:number, z: number, o:number, t:number}

export type InfillVectorType = {id:number, post_id:number, left:PlaneVec, right:PlaneVec, top:PlaneVec, bottom:PlaneVec}
export type ToprailVectorType = {id:number, left:PlaneVec, right:PlaneVec}


const POST_FIXING_TYPES = ["BP", "BPST", "DP", "CD", "SFI", "SFO"]
const BASEPLATE_FIXING_TYPES = ["BP", "BPST", "DP", "CD"]

const SPIGOT_TYPES = [
  "Spigot_RDTF",
  "Spigot_SQTF",
  "Spigot_RDCD",
  "Spigot_SQCD",
  "Spigot_HDTF",
  "Spigot_HDCD",
  "Spigot_SF",
];

export const DropToPartslist = (
  posts_array: PostsType[],
  design: string,
  infillType: string,
  toprail: string = "Elite",
) => {
    
    const xyo: {x:number, y:number, o:number}[] = [];
    let o = 180;
    for (let index = 0; index < posts_array.length; index++) {
        o += Number(posts_array[index].angle);
        o = (o+180)%360 ;
        xyo[index]  = {x:Number(posts_array[index].x), y:Number(posts_array[index].z), o:-o};
    }
    for (let index = 0; index < posts_array.length; index++) {
        xyo[index].o = xyo[index].o%360;            
    }

    const post_vectors = GetPostVectors(posts_array,xyo,design)
    const post_partslist = GetPosts(posts_array,xyo,design)

    const infill_vectors = GetInfillVectors(posts_array, post_partslist, xyo,design)

    const [baseplate_partslist, fixed_components_partslist] = GetFixedComponents(posts_array,post_partslist,infill_vectors,design,toprail)
    // console.log({posts:post_partslist, post_vectors:post_vectors})

    
    const midrail_partslist = GetMidrails(posts_array,infill_vectors, xyo,design,infillType)
    // console.log({midrails:midrail_partslist, infill_vectors:infill_vectors})
    const vertical_infill_partslist = GetVerticalRails(posts_array,infill_vectors,xyo,design,infillType)
    
    const glass_infill_partslist = GetGlassPanels(posts_array,infill_vectors,xyo,design,infillType)

    const toprails = GetToprails(posts_array,xyo,design,toprail)

    // console.log(posts_array)

    return {
        post_partslist: post_partslist,
        post_vectors: post_vectors,
        infill_vectors: infill_vectors,
        midrail_partslist: midrail_partslist,
        baseplate_partslist: baseplate_partslist,
        fixed_components_partslist: fixed_components_partslist,
        vertical_infill_partslist: vertical_infill_partslist,
        glass_infill_partslist:glass_infill_partslist,
        toprail_partslist:toprails.toprail_partslist,
        toprail_vectorslist:toprails.toprail_vectorslist,

    }
}

function GetPosts(posts_array: PostsType[], xyo: { x: number; y: number; o: number }[], design: string) {
   let posts_partslist: PartTypePost[] = [];
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // SFI/SFO grouping helpers (post-process only those entries; leave everything else unchanged)
  const isSfiSfo = (t: string) => t === "SFI" || t === "SFO";
  const isGroupBlocker = (t: string) => t === "BP" || t === "BPST" || t === "DP" || t === "CD" || t === "G";

  type SfiMember = { postIndex: number; partsIndex: number; y: number; top: number };
  const sfiMembers: SfiMember[] = [];

  const hasBlockerBetween = (a: number, b: number) => {
    const start = Math.min(a, b) + 1;
    const end = Math.max(a, b);
    for (let k = start; k < end; k++) {
      if (isGroupBlocker(posts_array[k].type)) return true;
    }
    return false;
  };

  const applyGroup = (group: SfiMember[]) => {
    if (!group.length) return;

    let minY = Infinity;
    let maxTop = -Infinity;

    for (const m of group) {
      if (m.y < minY) minY = m.y;
      if (m.top > maxTop) maxTop = m.top;
    }

    const newHeight = maxTop - minY;

    for (const m of group) {
      posts_partslist[m.partsIndex].y = minY;
      posts_partslist[m.partsIndex].height = newHeight;
    }
  };

//   console.log(posts_array.map(p => p.y_ref2).join(","))
  posts_array.map((post, i) => {
    if ((POST_FIXING_TYPES.includes(post.type) || post.type === "WF") && (design != "RD-D10" && design != "RD-D11" && design != "RD-D12" && design !== "RD-D13" && design != "RD-14")) {
      const dir = angleDegToXZVector(xyo[i].o);
      const dir0 = i > 0 ? angleDegToXZVector(xyo[i - 1].o + 180) : { x: -dir.x, y: -dir.y, z: -dir.z };

      const d1 = i > 0 ? displacementForAngle(toRad(post.angle)) : 0;

      const left_Offset_postcenter =
        i > 0
          ? (Round((posts_array[i].angle + 360) % 90, 1) == 0
              ? { x: 0, y: 0, z: 0 }
              : (Math.abs(posts_array[i].angle % 90) < 35
                  ? (post.reversed ? { x: -d1 * dir0.x, y: -d1 * dir0.y, z: -d1 * dir0.z } : scaleV(dir, -d1))
                  : { x: d1 * (dir.x + dir0.x) / 2, y: d1 * (dir.y + dir0.y) / 2, z: d1 * (dir.z + dir0.z) / 2 }))
          : { x: 0, y: 0, z: 0 };

      const adjust = post.type === "BP" || post.type === "BPST" || post.type === "DP" ? -16 : (post.type === "SFI" || post.type === "SFO" ? 270 : (post.type === "CD" ? 100 : (post.type === "WF" ? -(post.y_ref3 + post.height) : 0)));

      
      posts_partslist.push({
        id: post.id,
        post_id: post.post_id,
        partName: "PST-001",
        type: post.type,
        height: post.y_ref2 + post.height + adjust,
        x: Round(post.x + left_Offset_postcenter.x, 2),
        y: -post.height - adjust,
        z: Round(post.z + left_Offset_postcenter.z, 2),
        o: -(i > 0 ? (Math.abs(xyo[i].o - xyo[i - 1].o) < 60 ? (xyo[i].o + xyo[i - 1].o) / 2 : posts_array[i].reversed ? xyo[i - 1].o : xyo[i].o) : xyo[i].o),
        t: 0
      });

      // capture SFI/SFO members for grouping
      if (isSfiSfo(post.type)) {
        const partsIndex = posts_partslist.length - 1;
        const y = posts_partslist[partsIndex].y;
        const top = y + posts_partslist[partsIndex].height;
        sfiMembers.push({ postIndex: i, partsIndex, y, top });
      }
    } else {
        // console.log(post.id, post.type)
      posts_partslist.push({
        id: post.id,
        post_id: post.post_id,
        partName: "No Post",
        type: post.type,
        height: post.y_ref2 + post.height,
        x: Round(post.x, 2),
        y: -post.height,
        z: Round(post.z, 2),
        o: -(i > 0 ? (Math.abs(xyo[i].o - xyo[i - 1].o) < 60 ? (xyo[i].o + xyo[i - 1].o) / 2 : posts_array[i].reversed ? xyo[i - 1].o : xyo[i].o) : xyo[i].o),
        t: 0
      });
    }
  });

  // Post-process SFI/SFO groups:
  // - split group if any blocker (BP/BPST/DP/CD/G) appears between them in posts_array order
  // - split group if abs(y difference) > 50 (indicates separate groups)
  if (sfiMembers.length) {
    let group: SfiMember[] = [];
    let prev: SfiMember | null = null;

    for (const m of sfiMembers) {
      if (!prev) {
        group = [m];
        prev = m;
        continue;
      }

      const splitBecauseBlocker = hasBlockerBetween(prev.postIndex, m.postIndex);
      const splitBecauseYJump = Math.abs(m.y - prev.y) > 50;

      if (splitBecauseBlocker || splitBecauseYJump) {
        applyGroup(group);
        group = [m];
      } else {
        group.push(m);
      }

      prev = m;
    }

    applyGroup(group);
  }
  return posts_partslist;

}




function GetPostVectors(posts_array:PostsType[], xyo: {x:number, y:number, o:number}[],design:string){
    let post_vectorslist: PostVectorType[] = [];
    posts_array.map((post,i) => {

        post_vectorslist.push({
            x: post.x,
            y: post.y_ref2,
            z: post.z,
            v_x: 0,
            v_y: -1,
            v_z: 0,
            id: post.id
        })
    })

    return post_vectorslist
}


function GetFixedComponents(posts_array:PostsType[], posts:PartTypePost[], infill_vectors_array:InfillVectorType[],design:string, toprail:string){
    let baseplate_partslist: PartTypeComponent[] = []
    let fixed_components_partslist: PartTypeComponent[] = []


    posts.map((post,i) => {
        if (BASEPLATE_FIXING_TYPES.includes(post.type)){
            baseplate_partslist.push({
                id: post.id,
                partName: post.type.slice(0,2),
                x: post.x,
                y: (post.type === "CD") ? post.y +100 : post.y-16,
                z: post.z,
                o: post.o,
                t: post.t
            })
        }
        else if((post.type === "EC" || post.type === "WC") && (design != "RD-D10" && design != "RD-D11" && design != "RD-D12" && design !== "RD-D13" && design != "RD-D14")){
            fixed_components_partslist.push({
                id: fixed_components_partslist.length-1,
                partName: post.type === "EC" ? "End Cap " + toprail:"Wall Cap " + toprail,
                x: post.x,
                y: posts_array[i].y_ref2,
                z: post.z,
                o: i > 0 ? BASEPLATE_FIXING_TYPES.includes(posts[i-1].type) ? post.o+180: post.o: post.o,
                t: post.t
            })
            baseplate_partslist.push({
                id: post.id,
                partName: "No BP",
                x: post.x,
                y: post.y,
                z: post.z,
                o: post.o,
                t: post.t
            })
        }
        else if (design === "RD-D10" || design === "RD-D11" || design === "RD-D12" || design === "RD-D13" || design === "RD-14"){
            if (SPIGOT_TYPES.includes(post.type) && (posts_array[i+1].type !== "EC" && posts_array[i+1].type !== "WC")){
                // console.log(post.id, post.type)
                // 2 equally spaced spigots or 4 SF studs

                

                const infill_vector = infill_vectors_array.find(v => v.post_id === post.post_id)
                if (infill_vector){

                let dir_line = vectorizeLine(infill_vector.left, infill_vector.right)

                let length =Round(distance(infill_vector.left,infill_vector.right)-40,0)
                
                let spacing = 250
                
                if (length < spacing * 3){
                    spacing = length/3
                }


                // console.log(`Spacing: ${spacing}`)


                    // console.log(first)

                let o = -xzVectorToAngleDeg(dir_line.x_axis)

                if (design === "RD-D10" ||  design === "RD-D12"){
                  fixed_components_partslist.push({
                  id: fixed_components_partslist.length,
                  partName: post.type,
                  x: infill_vector.left.x+spacing*dir_line.x_axis.x,
                  y: post.y+spacing*dir_line.x_axis.y,
                  z: infill_vector.left.z+spacing*dir_line.x_axis.z,
                  o: o,
                  t: post.t
                  })

                  fixed_components_partslist.push({
                  id: fixed_components_partslist.length,
                  partName: post.type,
                  x: infill_vector.right.x-spacing*dir_line.x_axis.x,
                  y: post.y-spacing*dir_line.x_axis.y,
                  z: infill_vector.right.z-spacing*dir_line.x_axis.z,
                  o: o,
                  t: post.t
                  })

                }
                else if (design === "RD-D11" || design === "RD-D13"){
                  const y_offset = infill_vector.bottom.y + 100;
                  fixed_components_partslist.push({
                  id: fixed_components_partslist.length,
                  partName: post.type,
                  x: infill_vector.left.x+spacing*dir_line.x_axis.x,
                  y: post.y+spacing*dir_line.x_axis.y+y_offset,
                  z: infill_vector.left.z+spacing*dir_line.x_axis.z,
                  o: o+180,
                  t: post.t
                  })

                  fixed_components_partslist.push({
                  id: fixed_components_partslist.length,
                  partName: post.type,
                  x: infill_vector.right.x-spacing*dir_line.x_axis.x,
                  y: post.y-spacing*dir_line.x_axis.y+y_offset,
                  z: infill_vector.right.z-spacing*dir_line.x_axis.z,
                  o: o+180,
                  t: post.t
                  })
                  fixed_components_partslist.push({
                  id: fixed_components_partslist.length,
                  partName: post.type,
                  x: infill_vector.left.x+spacing*dir_line.x_axis.x,
                  y: post.y+spacing*dir_line.x_axis.y+y_offset+150,
                  z: infill_vector.left.z+spacing*dir_line.x_axis.z,
                  o: o+180,
                  t: post.t
                  })

                  fixed_components_partslist.push({
                  id: fixed_components_partslist.length,
                  partName: post.type,
                  x: infill_vector.right.x-spacing*dir_line.x_axis.x,
                  y: post.y-spacing*dir_line.x_axis.y+y_offset+150,
                  z: infill_vector.right.z-spacing*dir_line.x_axis.z,
                  o: o+180,
                  t: post.t
                  })

                }
            }}
        }
        else{
            baseplate_partslist.push({
                id: post.id,
                partName: "No BP",
                x: post.x,
                y: post.y,
                z: post.z,
                o: post.o,
                t: post.t
            })
        }
    })

    return [baseplate_partslist,fixed_components_partslist]
}



function GetInfillVectors(posts_array:PostsType[], post_partslist:PartTypePost[], xyo: {x:number, y:number, o:number}[],design:string){
    let infill_vectorslist: InfillVectorType[] = [];
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    let edge_offset =(design === "RD-D10" || design === "RD-D11" || design === "RD-D12" || design === "RD-D13" || design === "RD-14") ? ((design === "RD-D11" || design === "RD-D13") ? 5 : 15) : 22.5

    posts_array.map((post,i) => {
        if (i < posts_array.length - 1 ){

            const left_symmetry = i>0 ? ((((Math.abs(posts_array[i].angle)%90) < 35) && ((Math.abs(posts_array[i].angle)%90)) > 0 || ((Math.abs(posts_array[i].angle)%180) && ((Math.abs(posts_array[i].angle)%180) < 125))) ? false : true) : true 
            const right_symmetry = i < xyo.length -1 ? (((((Math.abs(posts_array[i+1].angle)%90) < 35) && ((Math.abs(posts_array[i+1].angle)%90) > 0)) || ((Math.abs(posts_array[i+1].angle)%180) && (Math.abs(posts_array[i+1].angle)%180) < 125)) ? false : true) : true 


            const dir = angleDegToXZVector(xyo[i].o)
            const dir0 = i>0 ? angleDegToXZVector(xyo[i-1].o+180) : {x:-dir.x,y:-dir.y,z:-dir.z}
            const dir2 = i < xyo.length ? angleDegToXZVector(xyo[i+1].o) : dir

            const d1 = i>0 ? displacementForAngle(toRad(post.angle)):0;
            const d2 = i < xyo.length -1 ? displacementForAngle(toRad(posts_array[i+1].angle)):0;

            const left_Offset_postcenter = i > 0 ?
                  {x:post_partslist[i].x-post.x, y:0,z:post_partslist[i].z-post.z} 

                : {x:0,y:0,z:0}     

            const right_Offset_postcenter = i < xyo.length -1 ? 
                  {x:post_partslist[i+1].x-posts_array[i+1].x, y:0,z:post_partslist[i+1].z-posts_array[i+1].z} 

                : {x:0,y:0,z:0}      

            const dir_l = left_symmetry ? rotateAroundNormal(dir,(180-post.angle)/2,{x:0,y:1,z:0}) : (post.reversed ? rotateAroundNormal(dir0,90*post.angle/Math.abs(post.angle), {x:0,y:1,z:0}) : dir )

            const dir_r = right_symmetry ? rotateAroundNormal(scaleV(dir,-1),-(180-posts_array[i+1].angle)/2,{x:0,y:1,z:0}) : (posts_array[i+1].reversed ? scaleV(dir,-1) : rotateAroundNormal(dir2,-90*posts_array[i+1].angle/Math.abs(posts_array[i+1].angle), {x:0,y:1,z:0}) )

            let t = (design === "RD-D10" || design === "RD-D11") ? 12:  13.52;


            const edge_offset_left = (edge_offset < 22) ? (post.angle !== 180 ? solveL(t,post.angle) : edge_offset) : edge_offset
            const edge_offset_right = (edge_offset < 22) && i < xyo.length -1  ? (posts_array[i+1].angle !== 180 ? solveL(t,posts_array[i+1].angle): edge_offset) : edge_offset

            const left_vec:PlaneVec =  {
                x: (edge_offset_left*Round(dir_l.x,6)*(post.angle < -120 ? -1 : 1)+post.x+left_Offset_postcenter.x),
                y: (edge_offset_left*Round(dir_l.y,6)*(post.angle < -120 ? -1 : 1)+post.y_ref3+left_Offset_postcenter.y),
                z: (edge_offset_left*Round(dir_l.z,6)*(post.angle < -120 ? -1 : 1)+post.z+left_Offset_postcenter.z),
                v_x: Round(dir_l.x,6)*(post.angle < -120 ? -1 : 1),
                v_y: Round(dir_l.y,6)*(post.angle < -120 ? -1 : 1),
                v_z: Round(dir_l.z,6)*(post.angle < -120 ? -1 : 1),
            }

            const right_vec:PlaneVec = {
                x: (edge_offset_right*Round(dir_r.x,6)*(posts_array[i+1].angle < -120 ? -1 : 1)+posts_array[i+1].x+right_Offset_postcenter.x),
                y: (edge_offset_right*Round(dir_r.y,6)*(posts_array[i+1].angle < -120 ? -1 : 1)+posts_array[i+1].y_ref3+right_Offset_postcenter.y),
                z: (edge_offset_right*Round(dir_r.z,6)*(posts_array[i+1].angle < -120 ? -1 : 1)+posts_array[i+1].z+right_Offset_postcenter.z),
                v_x: Round(dir_r.x,6)*(posts_array[i+1].angle < -120 ? -1 : 1),
                v_y: Round(dir_r.y,6)*(posts_array[i+1].angle < -120 ? -1 : 1),
                v_z: Round(dir_r.z,6)*(posts_array[i+1].angle < -120 ? -1 : 1)
            }

            let top_offset=0
            let bottom_offset=0

            switch (design) {
                case "RD-D1":
                    top_offset = 8
                    bottom_offset = 12
                    break;
                case "RD-D2":
                    top_offset = -113
                    bottom_offset = 12
                    break;
                case "RD-D3":
                case "RD-D3SLATS":
                    top_offset = -14
                    bottom_offset = 22
                    break;
                case "RD-D4":
                case "RD-D4SLATS":
                    top_offset = -122
                    bottom_offset = 22
                    break;
                case "RD-D5":
                    top_offset = 0
                    bottom_offset = 0
                    break;
                case "RD-D6":
                    top_offset = 10
                    bottom_offset = 0
                    break;
                case "RD-D7":
                    top_offset = 10
                    bottom_offset = 12
                    break;
                case "RD-D8":
                    top_offset = -100
                    bottom_offset = 12
                    break;
                case "RD-D9":
                    top_offset = 0
                    bottom_offset = 22
                    break;
                case "RD-D10": // spigot type needs to be applied
                    top_offset = 0
                    bottom_offset = 0
                    break;
                case "RD-D11":
                    top_offset = 0
                    bottom_offset = -200
                    break;
                case "RD-D12": // spigot type needs to be applied
                    top_offset = 0
                    bottom_offset = 0
                    break;
                case "RD-D13":
                    top_offset = 0
                    bottom_offset = -200
                    break;
                case "RD-D14":
                    top_offset = 0
                    bottom_offset = 0
                    break;
            
                default:
                    break;
            }

            const t_temp = vectorizeLine({x:post.x,y:post.y_ref2+top_offset,z:post.z},{x:posts_array[i+1].x,y:posts_array[i+1].y_ref2+top_offset,z:posts_array[i+1].z},)
            const top_vec:PlaneVec = {
                x: ((t_temp.origin.x+t_temp.ref.x)/2),
                y: ((t_temp.origin.y+t_temp.ref.y)/2),
                z: ((t_temp.origin.z+t_temp.ref.z)/2),
                v_x: 0,//Round(t_temp.y_axis.vector.x,6),
                v_y: -1,//Round(-t_temp.y_axis.vector.y,6),
                v_z: 0//Round(t_temp.y_axis.vector.z,6)
            }

            const b_temp = vectorizeLine({x:post.x,y:post.y_ref3+bottom_offset,z:post.z},{x:posts_array[i+1].x,y:posts_array[i+1].y_ref3+bottom_offset,z:posts_array[i+1].z},)
            const bottom_vec:PlaneVec = {
                x: ((b_temp.origin.x+b_temp.ref.x)/2),
                y: ((b_temp.origin.y+b_temp.ref.y)/2),
                z: ((b_temp.origin.z+b_temp.ref.z)/2),
                v_x: 0,//Round(b_temp.y_axis.vector.x,6),
                v_y: 1,// Round(b_temp.y_axis.vector.y,6),
                v_z: 0//Round(b_temp.y_axis.vector.z,6)
            }

            infill_vectorslist.push({id:Number(post.id), post_id: Number(post.post_id), left:left_vec, right:right_vec, top:top_vec, bottom:bottom_vec})
            // console.log(i,Round(distance(post,left_vec),2), Round(distance(posts_array[i+1],right_vec),2))
            // console.log(i,Round(distance(post,posts_array[i+1]),2), Round(distance(left_vec,right_vec),2))
        }
    })

    return infill_vectorslist;
}



function GetMidrails(posts_array: PostsType[], infill_vectors_array: InfillVectorType[], xyo: { x: number; y: number; o: number} [], design: string, infillType: string){
    const degToRad = (d: number) => (d * Math.PI) / 180;

    const cotDeg = (deg: number) => 1 / Math.tan(degToRad(deg));
        let midrail_partslist: PartTypeRail[] = []

        infill_vectors_array.map( (infill_vector,i) => {
            if ((POST_FIXING_TYPES.includes(posts_array[i].type) || posts_array[i].type === "WF") && (POST_FIXING_TYPES.includes(posts_array[i+1].type) || posts_array[i+1].type === "WF")){

                // let dir_line = vectorizeLine(post_to_xyz(posts_array[i]), post_to_xyz(posts_array[i+1]))

                // console.log(i, infill_vector.left,dir_line.x_axis, angleDegToXZVector(xyo[i].o),angle_between_vectors(infill_vector.left,dir_line.x_axis),)
                

                // --- rail axis (already correct in your file) ---
    // const dir_line = vectorizeLine(infill_vector.left, infill_vector.right);

                // unit rail direction for this span (XZ)
    const railLR = normalize(
    xyo[i+1].x - xyo[i].x,
    0,
    xyo[i+1].y - xyo[i].y
    ).vector;

    // delta between your two plane points (XZ)
    const dx = infill_vector.right.x - infill_vector.left.x;
    const dz = infill_vector.right.z - infill_vector.left.z;

    // base length along rail centreline (projection)
    const base = Math.abs(dx * railLR.x + dz * railLR.z);

    const railRL = { x: -railLR.x, y: 0, z: -railLR.z };

    const planeL = { x: infill_vector.left.v_x, y: 0, z: infill_vector.left.v_z };
    const planeR = { x: infill_vector.right.v_x, y: 0, z: infill_vector.right.v_z };

    // ✅ Mixed order is intentional:
    // - left end: rail -> plane
    // - right end: plane -> rail
    const thetaL = signedAngleXZ(railLR, planeL);
    const thetaR = signedAngleXZ(planeR, railRL);

    let lhc = fold0_180(90 - thetaL);
    let rhc = fold0_180(90 - thetaR);

    lhc = Round(lhc, 1);
    rhc = Round(rhc, 1);

    const length = Round(base, 2);

    // console.log("post offset left:", distance2D(post_to_xyz(posts_array[i]),infill_vector.left));
    // console.log("post offset right:", distance2D(post_to_xyz(posts_array[i+1]),infill_vector.right));
    // console.log("Final lhc:", lhc);
    // console.log("Final rhc:", rhc);
            if (design === "RD-D1" || design === "RD-D2" || design === "RD-D7" || design === "RD-D8"){
                // Add bottom glazing rail

                midrail_partslist.push({
                    partName: "Glazing Rail",
                    id: midrail_partslist.length ?? 0,
                    post_id: infill_vector.post_id,
                    length: Round(length+0.5*34*(cotDeg(lhc)+cotDeg(rhc)), 2),
                    x: infill_vector.bottom.x,
                    y: infill_vector.bottom.y - 12,
                    z: infill_vector.bottom.z,
                    o: -xyo[i].o,
                    t: 0, //angle_between_vectors(infill_vector.bottom,angleDegToXZVector(xyo[i].o))
                    lhc: lhc,
                    rhc: rhc,
                    lvc: 90,
                    rvc: 90
                })

                // if (infill_vector.post_id === 4 || infill_vector.post_id === 5) {
                //     const base = length;
                //     const extra34 = 0.5 * 34 * (cotDeg(lhc) + cotDeg(rhc));
                //     const extra55 = 0.5 * 55 * (cotDeg(lhc) + cotDeg(rhc));

                //     console.log("=== GlazingRail debug post_id", infill_vector.post_id, "===");
                //     console.log("lhc/rhc:", lhc, rhc);
                //     console.log("base:", base);
                //     console.log("extra34:", extra34, "len34:", base + extra34);
                //     console.log("extra55:", extra55, "len55:", base + extra55);
                //     }
                
            }
            if (design === "RD-D2" || design === "RD-D8"){
                // Add top Glazing Rail
                midrail_partslist.push({
                    partName: "Glazing Rail Top",
                    id: midrail_partslist.length ?? 0,
                    post_id: infill_vector.post_id,
                    length: Round(length+0.5*34*(cotDeg(lhc)+cotDeg(rhc)), 2),
                    x: infill_vector.top.x,
                    y: infill_vector.top.y - 12,
                    z: infill_vector.top.z,
                    o: -xyo[i].o,
                    t: 0, //angle_between_vectors(infill_vector.bottom,angleDegToXZVector(xyo[i].o))
                    lhc: lhc,
                    rhc: rhc,
                    lvc: 90,
                    rvc: 90
                })
            }
            if (design === "RD-D3" || design === "RD-D4" || design === "RD-D3SLATS" || design === "RD-D4SLATS"){
                // Add bottom U-Rail
                midrail_partslist.push({
                    partName: "U-Rail",
                    id: midrail_partslist.length ?? 0,
                    post_id: infill_vector.post_id,
                    length: Round(length+0.5*34*(cotDeg(lhc)+cotDeg(rhc)), 2),
                    x: infill_vector.bottom.x,
                    y: infill_vector.bottom.y - 22,
                    z: infill_vector.bottom.z,
                    o: -xyo[i].o,
                    t: 0, //angle_between_vectors(infill_vector.bottom,angleDegToXZVector(xyo[i].o))
                    lhc: lhc,
                    rhc: rhc,
                    lvc: 90,
                    rvc: 90
                })
            }
            if (design === "RD-D3" || design === "RD-D3SLATS"){
                // Add baluster rail
                midrail_partslist.push({
                    partName: "Baluster Rail",
                    id: midrail_partslist.length ?? 0,
                    post_id: infill_vector.post_id,
                    length: Round(length+0.5*34*(cotDeg(lhc)+cotDeg(rhc)), 2),
                    x: infill_vector.top.x,
                    y: infill_vector.top.y,
                    z: infill_vector.top.z,
                    o: -xyo[i].o,
                    t: 0, //angle_between_vectors(infill_vector.bottom,angleDegToXZVector(xyo[i].o))
                    lhc: lhc,
                    rhc: rhc,
                    lvc: 90,
                    rvc: 90
                })
            }
            if (design === "RD-D4" || design === "RD-D4SLATS"){
                // Add top U-Rail
                midrail_partslist.push({
                    partName: "U-Rail Top",
                    id: midrail_partslist.length ?? 0,
                    post_id: infill_vector.post_id,
                    length: Round(length+0.5*34*(cotDeg(lhc)+cotDeg(rhc)), 2),
                    x: infill_vector.top.x,
                    y: infill_vector.top.y,
                    z: infill_vector.top.z,
                    o: -xyo[i].o,
                    t: 0, //angle_between_vectors(infill_vector.bottom,angleDegToXZVector(xyo[i].o))
                    lhc: lhc,
                    rhc: rhc,
                    lvc: 90,
                    rvc: 90
                })
            }
            if (design === "RD-D5"){
                // Add horizontal Slats
                let spacer = infillType == "Slats 9mm Spacers" ? 9 : 5
                const quantity = Math.floor((infill_vector.top.y-infill_vector.bottom.y-65.8)/(65.8+spacer))+1
                // console.log(infill_vector.top.y-infill_vector.bottom.y)

                for(let j = 1; j <= quantity; j++){
                    midrail_partslist.push({
                        partName: "65x16 Slat",
                        id: midrail_partslist.length ?? 0,
                        post_id: infill_vector.post_id,
                        length: Round(length+0.5*34*(cotDeg(lhc)+cotDeg(rhc))-20, 2),
                        x: infill_vector.top.x,
                        y: Round(infill_vector.top.y-(j-0.5)*65.8-spacer*(j-1),1),
                        z: infill_vector.top.z,
                        o: -xyo[i].o,
                        t: 0, //angle_between_vectors(infill_vector.bottom,angleDegToXZVector(xyo[i].o))
                        lhc: 90,
                        rhc: 90,
                        lvc: 90,
                        rvc: 90
                    })
                }

            }
            if (design === "RD-D6"){
                // Nothing to add
            }
            if (design === "RD-D9" && infillType == "Midrail"){
                midrail_partslist.push({
                    partName: "U-Rail",
                    id: midrail_partslist.length ?? 0,
                    post_id: infill_vector.post_id,
                    length: Round(length+0.5*34*(cotDeg(lhc)+cotDeg(rhc)), 2),
                    x: infill_vector.bottom.x,
                    y: infill_vector.bottom.y - 22,
                    z: infill_vector.bottom.z,
                    o: -xyo[i].o,
                    t: 0, //angle_between_vectors(infill_vector.bottom,angleDegToXZVector(xyo[i].o))
                    lhc: lhc,
                    rhc: rhc,
                    lvc: 90,
                    rvc: 90
                })
            }
        }
    })

    // console.log(midrail_partslist)
    return midrail_partslist;
}

function GetVerticalRails(posts_array: PostsType[], infill_vectors_array: InfillVectorType[], xyo: { x: number; y: number; o: number} [], design: string, infillType: string){
    let vertical_infill_partslist: PartTypeRail[] = []

    infill_vectors_array.map( (infill_vector,i) => {
        if ((POST_FIXING_TYPES.includes(posts_array[i].type)|| posts_array[i].type === "WF") && (POST_FIXING_TYPES.includes(posts_array[i+1].type) || posts_array[i+1].type === "WF")){

            let dir_line = vectorizeLine(infill_vector.left, infill_vector.right)
            // console.log(dir_line.x_axis)
                // let dir_line = vectorizeLine(infill_vector.left, infill_vector.right)

            // console.log(i, infill_vector.left,dir_line.x_axis, angleDegToXZVector(xyo[i].o),angle_between_vectors(infill_vector.left,dir_line.x_axis),)
            
            // const lhc = (posts_array[i].reversed ? 2:1)*90-((Round((signedAngleXZ(dir_line.x_axis,infill_vector.left)),1)+180)%90)
            // const rhc = 180-(90*(Math.abs(posts_array[i+1].angle) > 120 || posts_array[i+1].reversed ? 1:0)+((Round((signedAngleXZ(infill_vector.right,scaleVector(dir_line.x_axis,-1))),1))%90))
            
            if (design === "RD-D1" || design === "RD-D2" || design === "RD-D7" || design === "RD-D8"){
                // None
            }
            if (design === "RD-D2" || design === "RD-D8"){
                // None
            }
            if (design === "RD-D3" || design === "RD-D4"){
                // Add bottom Balusters
                let spacing = 120

                const quantity = Math.ceil((distance(infill_vector.left, infill_vector.right)-spacing+19)/spacing)
                // console.log(quantity)
                if(infillType == "Balusters Equally Spaced"){
                    spacing = Round((distance(infill_vector.left, infill_vector.right)+19)/(quantity+1),2)
                }

                // console.log(`Spacing: ${spacing}`)

                const first = {x: infill_vector.bottom.x - spacing*dir_line.x_axis.x*(0.5*(quantity-1)),
                    y: infill_vector.bottom.y - spacing*dir_line.x_axis.y*(0.5*(quantity-1)),
                    z: infill_vector.bottom.z - spacing*dir_line.x_axis.z*(0.5*(quantity-1))}

                    // console.log(first)
                    
                for(let j = 0; j < quantity; j++){

                vertical_infill_partslist.push({
                    partName: "19x18 Baluster",
                    id: vertical_infill_partslist.length ?? 0,
                    post_id: infill_vector.id,
                    length: Round((infill_vector.top.y - infill_vector.bottom.y), 2),
                    x: first.x+j*spacing*dir_line.x_axis.x,
                    y: first.y+j*spacing*dir_line.x_axis.y,
                    z: first.z+j*spacing*dir_line.x_axis.z,
                    o: -xyo[i].o,
                    t: 0, //angle_between_vectors(infill_vector.bottom,angleDegToXZVector(xyo[i].o))
                    lhc: 90,
                    rhc: 90,
                    lvc: 90,
                    rvc: 90
                })}
                // console.log(vertical_infill_partslist)
            }
            if (design === "RD-D3SLATS" || design === "RD-D4SLATS"){
                // Add Slats
                let spacing = 165
                const quantity = Math.ceil((distance(infill_vector.left, infill_vector.right)-spacing+65)/spacing)
                if(infillType == "Slats Equally Spaced"){
                    spacing = Round((distance(infill_vector.left, infill_vector.right)+65)/(quantity+1),2)
                }
                
                // console.log(`Infill: ${infillType}`)
                
                // console.log(`Spacing: ${spacing}`)
                const first = {x: infill_vector.bottom.x - spacing*dir_line.x_axis.x*(0.5*(quantity-1)),
                    y: infill_vector.bottom.y - spacing*dir_line.x_axis.y*(0.5*(quantity-1)),
                    z: infill_vector.bottom.z - spacing*dir_line.x_axis.z*(0.5*(quantity-1))}
                    
                for(let j = 0; j < quantity; j++){

                vertical_infill_partslist.push({
                    partName: "65x16 Slat",
                    id: vertical_infill_partslist.length ?? 0,
                    post_id: infill_vector.id,
                    length: Round((infill_vector.top.y - infill_vector.bottom.y), 2),
                    x: first.x+j*spacing*dir_line.x_axis.x,
                    y: first.y+j*spacing*dir_line.x_axis.y,
                    z: first.z+j*spacing*dir_line.x_axis.z,
                    o: 90-xyo[i].o,
                    t: 0, //angle_between_vectors(infill_vector.bottom,angleDegToXZVector(xyo[i].o))
                    lhc: 90,
                    rhc: 90,
                    lvc: 90,
                    rvc: 90
                })}
            }

            if (design === "RD-D5"){
                // Add Slat Sideframe
                const quantity = Math.floor((infill_vector.top.y-infill_vector.bottom.y-65.8)/(65.8+9))+1
                const length = quantity*74.8-9
                vertical_infill_partslist.push({
                    partName: "Slat Side Frame",
                    id: vertical_infill_partslist.length ?? 0,
                    post_id: infill_vector.id,
                    length: length,
                    x: infill_vector.left.x,
                    y: infill_vector.top.y-length,
                    z: infill_vector.left.z,
                    o: 90-xyo[i].o,
                    t: 0,
                    lhc: 0,
                    rhc: 0,
                    lvc: 0,
                    rvc: 0
                })

                vertical_infill_partslist.push({
                    partName: "Slat Side Frame",
                    id: vertical_infill_partslist.length ?? 0,
                    post_id: infill_vector.id,
                    length: length,
                    x: infill_vector.right.x,
                    y: infill_vector.top.y-length,
                    z: infill_vector.right.z,
                    o: 270-xyo[i].o,
                    t: 0,
                    lhc: 0,
                    rhc: 0,
                    lvc: 0,
                    rvc: 0
                })

            }
            if (design === "RD-D6"){
                // Nothing to add
            }
        }
    })

    return vertical_infill_partslist;
}

function GetGlassPanels(posts_array:PostsType[], infill_vectors_array:InfillVectorType[], xyo: {x:number, y:number, o:number}[],design:string, glassType:string){
    let glass_infill_partslist: PartTypeGlass[] = []

    // console.log(posts_array.map(p => p.y_ref2).join(","))
    infill_vectors_array.map( (infill_vector,i) => {
        if ((POST_FIXING_TYPES.includes(posts_array[i].type) || posts_array[i].type === "WF" || SPIGOT_TYPES.includes(posts_array[i].type)) && (POST_FIXING_TYPES.includes(posts_array[i+1].type) || posts_array[i+1].type === "WF" || SPIGOT_TYPES.includes(posts_array[i+1].type))){

            let dir_line = vectorizeLine(infill_vector.left, infill_vector.right)
            // console.log(dir_line.x_axis)
                // let dir_line = vectorizeLine(infill_vector.left, infill_vector.right)

            // console.log(i, infill_vector.left,dir_line.x_axis, angleDegToXZVector(xyo[i].o),angle_between_vectors(infill_vector.left,dir_line.x_axis),)
            
            // const lhc = (posts_array[i].reversed ? 2:1)*90-((Round((signedAngleXZ(dir_line.x_axis,infill_vector.left)),1)+180)%90)
            // const rhc = 180-(90*(Math.abs(posts_array[i+1].angle) > 120 || posts_array[i+1].reversed ? 1:0)+((Round((signedAngleXZ(infill_vector.right,scaleVector(dir_line.x_axis,-1))),1))%90))
            
            if (design === "RD-D1" || design === "RD-D2" || design === "RD-D7" || design === "RD-D8"){
                // 6.38mm or 9.52mm Thck glass
                glass_infill_partslist.push({
                    id: glass_infill_partslist.length ?? 0,
                    post_id: infill_vector.id,
                    partName: "Glass Panel",
                    length: Round(distance(infill_vector.left,infill_vector.right)-40,0),
                    height: Round(infill_vector.top.y-infill_vector.bottom.y,0),
                    thickness: design === "RD-D1" || design === "RD-D2"? 6.38 : 9.52,
                    glassType: glassType,
                    x: infill_vector.bottom.x,
                    y: infill_vector.bottom.y,
                    z: infill_vector.bottom.z,
                    o: 90-xyo[i].o,
                    t: 0
                })
            }
            if (design === "RD-D2" || design === "RD-D8"){
                // None
            }
            if (design === "RD-D3" || design === "RD-D4"){
                // None
                
            }
            if (design === "RD-D3SLATS" || design === "RD-D4SLATS"){
                // None
            }

            if (design === "RD-D5"){

            }
            if (design === "RD-D6"){
                // 10mm thick glass
                glass_infill_partslist.push({
                    id: glass_infill_partslist.length ?? 0,
                    post_id: infill_vector.id,
                    partName: "Glass Panel",
                    length: Round(distance(infill_vector.left,infill_vector.right)+20,0),
                    height: Round(infill_vector.top.y-infill_vector.bottom.y,0),
                    thickness: 10,
                    glassType: glassType,
                    x: infill_vector.bottom.x,
                    y: infill_vector.bottom.y,
                    z: infill_vector.bottom.z,
                    o: 90-xyo[i].o,
                    t: 0
                })
            }
            if (design === "RD-D10" || design === "RD-D11"){
                // 12mm thick glass
                glass_infill_partslist.push({
                    id: glass_infill_partslist.length ?? 0,
                    post_id: infill_vector.id,
                    partName: "Glass Panel",
                    length: Round(distance(infill_vector.left,infill_vector.right),0),
                    height: Round(infill_vector.top.y-infill_vector.bottom.y,0),
                    thickness: 12,
                    glassType: glassType,
                    x: infill_vector.bottom.x,
                    y: infill_vector.bottom.y,
                    z: infill_vector.bottom.z,
                    o: 90-xyo[i].o,
                    t: 0
                })
            }
            if (design === "RD-D12" || design === "RD-D13" || design === "RD-D14"){
                // 12mm thick glass
                glass_infill_partslist.push({
                    id: glass_infill_partslist.length ?? 0,
                    post_id: infill_vector.id,
                    partName: "Glass Panel",
                    length: Round(distance(infill_vector.left,infill_vector.right),0),
                    height: Round(infill_vector.top.y-infill_vector.bottom.y,0),
                    thickness: 13.52,
                    glassType: glassType,
                    x: infill_vector.bottom.x,
                    y: infill_vector.bottom.y,
                    z: infill_vector.bottom.z,
                    o: 90-xyo[i].o,
                    t: 0
                })
            }
        }
    })

    return glass_infill_partslist;
}

function GetToprails(posts_array:PostsType[], xyo: {x:number, y:number, o:number}[],design:string, toprail:string){
    let toprail_partslist: PartTypeRail[] = []
    let toprail_vectorslist: ToprailVectorType[] = [];

    let toprail_name = toprail ?? "Elite"

    let toprail_section_length = -3 //Math.max(overhang_left.value.overhang_length, 22.5)-3;
    let left_cut = {x:0, y:0, z:0, v_x:1, v_y:0, v_z:0};
    let right_cut = {x:0, y:0, z:0, v_x:-1, v_y:0, v_z:-1};
    let count = 0;

    if(toprail !== "None"){
    posts_array.map((post,i) => {
        // if ((design === "RD-D6") && (Math.abs(post.angle) >= 135)) {

        // }
        if (i === 0 ){
            toprail_section_length += post.length

            const d_vector = angleDegToXZVector(xyo[i].o)

            left_cut = {
                x:post.x+3*d_vector.x, 
                y:post.y_ref2+3*d_vector.y, 
                z:post.z+3*d_vector.z,
                v_x:d_vector.x,
                v_y:d_vector.y,
                v_z:d_vector.z
            }
        }
        else if (i === posts_array.length-1 ||( (posts_array[i-1].type != "EC" && posts_array[i-1].type != "WC" && posts_array[i-1].type != "S") && ( post.type === "EC" || post.type === "WC"))){
            const d_vector = angleDegToXZVector(xyo[i].o)

            right_cut = {
                x:post.x-3*d_vector.x, 
                y:post.y_ref2, 
                z:post.z-3*d_vector.z,
                v_x:-d_vector.x,
                v_y:-d_vector.y,
                v_z:-d_vector.z
            }

            // last toprail code
            toprail_partslist.push({
                partName: toprail_name+" Toprail",
                id: toprail_partslist.length ?? 0,
                post_id: post.post_id,
                length: Round(toprail_section_length,2),
                x: Round((left_cut.x+right_cut.x)/2,1),
                y: Round((left_cut.y+right_cut.y)/2,1),
                z: Round((left_cut.z+right_cut.z)/2,1),
                o: -xyo[i].o,
                t: 0,
                lhc: 0,
                rhc: 90,
                lvc: 0,
                rvc: 90
            })

            toprail_vectorslist.push({
                id:toprail_vectorslist.length ?? 0,
                left:{x:left_cut.x, y:left_cut.y, z:left_cut.z, v_x:left_cut.v_x, v_y:left_cut.v_y, v_z:left_cut.v_z},
                right:{x:right_cut.x, y:right_cut.y, z:right_cut.z, v_x:right_cut.v_x, v_y:right_cut.v_y, v_z:right_cut.v_z}
            });
        }
        else if (( (posts_array[i+1].type != "EC" && posts_array[i+1].type != "WC" && posts_array[i+1].type != "S") && ( post.type === "EC" || post.type === "WC"))){
            toprail_section_length += post.length

            const d_vector = angleDegToXZVector(xyo[i].o)

            left_cut = {
                x:post.x+3*d_vector.x, 
                y:post.y_ref2+3*d_vector.y, 
                z:post.z+3*d_vector.z,
                v_x:d_vector.x,
                v_y:d_vector.y,
                v_z:d_vector.z
            }
        }
        else {
            // compare angles to confirm corner joint
            if (Math.abs(post.angle) !== 180){
                // add a new toprail section

                // End accumelated length on post centre with mitre cut
                let vec0 = angleDegToXZVector(xyo[i-1].o)
                let vec1 = angleDegToXZVector(xyo[i].o)

                let vec3 = normalize((vec0.x+vec1.x)/2,(vec0.y+vec1.y)/2,(vec0.z+vec1.z)/2).vector

                const d_vector = vec3

                right_cut =  {x:post.x, y:post.y_ref2, z:post.z, v_x:-d_vector.x, v_y:-d_vector.y, v_z:-d_vector.z}

                toprail_partslist.push({
                    partName: toprail_name+" Toprail",
                    id: toprail_partslist.length ?? 0,
                    post_id: post.post_id,
                    length: Round(toprail_section_length,2),
                    x: Round((left_cut.x+right_cut.x)/2,1),
                    y: Round((left_cut.y+right_cut.y)/2,1),
                    z: Round((left_cut.z+right_cut.z)/2,1),
                    o: -xyo[i-1].o,
                    t: 0,
                    lhc: 0,
                    rhc: 90,
                    lvc: 0,
                    rvc: 90
                })

                toprail_vectorslist.push({
                    id:toprail_vectorslist.length ?? 0,
                    left:{x:left_cut.x, y:left_cut.y, z:left_cut.z, v_x:left_cut.v_x, v_y:left_cut.v_y, v_z:left_cut.v_z},
                    right:{x:right_cut.x, y:right_cut.y, z:right_cut.z, v_x:right_cut.v_x, v_y:right_cut.v_y, v_z:right_cut.v_z}
                });

                left_cut = {x:post.x, y:post.y_ref2, z:post.z, v_x:d_vector.x, v_y:d_vector.y, v_z:d_vector.z}

                toprail_section_length = post.length
            }
            else if (toprail_section_length+post.length + (i === posts_array.length-1 ? -3 : 22.5) > 5600){
                const d_vector = angleDegToXZVector(xyo[i].o)

                right_cut =  {x:post.x+(22.5)*d_vector.x, y:post.y_ref2+(22.5)*d_vector.y, z:post.z+(22.5)*d_vector.z, v_x:-d_vector.x, v_y:-d_vector.y, v_z:-d_vector.z}
                toprail_section_length += 22.5;

                toprail_partslist.push({
                    partName: toprail_name+" Toprail",
                    id: toprail_partslist.length ?? 0,
                    post_id: post.post_id,
                    length: Round(toprail_section_length,2),
                    x: Round((left_cut.x+right_cut.x)/2,1),
                    y: Round((left_cut.y+right_cut.y)/2,1),
                    z: Round((left_cut.z+right_cut.z)/2,1),
                    o: -xyo[i].o,
                    t: 0,
                    lhc: 0,
                    rhc: 90,
                    lvc: 0,
                    rvc: 90
                })

                toprail_vectorslist.push({
                    id:toprail_vectorslist.length ?? 0,
                    left:{x:left_cut.x, y:left_cut.y, z:left_cut.z, v_x:left_cut.v_x, v_y:left_cut.v_y, v_z:left_cut.v_z},
                    right:{x:right_cut.x, y:right_cut.y, z:right_cut.z, v_x:right_cut.v_x, v_y:right_cut.v_y, v_z:right_cut.v_z}
                });

                left_cut =  {x:post.x+(22.5)*d_vector.x, y:post.y_ref2+(22.5)*d_vector.y, z:post.z+(22.5)*d_vector.z, v_x:d_vector.x, v_y:d_vector.y, v_z:d_vector.z}

                toprail_section_length = post.length-22.5;
            }
            else{
                toprail_section_length += post.length
            }
        }
    })

    }
    // console.log(toprail_partslist, toprail_vectorslist)
    return {toprail_partslist:toprail_partslist,toprail_vectorslist:toprail_vectorslist}
}




function distance(post_ref:{x:number,z:number}, post_next:{x:number,z:number}){
  return (
    Math.sqrt(Math.pow(post_next.x - post_ref.x,2)
    +Math.pow(post_next.z - post_ref.z,2)
    ))
}

function xzToAngle(post_ref:{x:number,z:number}, post_prev:{x:number,z:number}, post_next:{x:number,z:number}){
    let angle = -(180-(Math.atan2(post_ref.z-post_next.z,post_next.x-post_ref.x)*180/Math.PI - Math.atan2(post_prev.z-post_ref.z,post_ref.x-post_prev.x)*180/Math.PI));

  if (angle > 180){angle -= 360;}
  else if (angle <= -180){angle += 360;}

  return angle
}

function angleDegToXZVector(angleDeg: number, length = 1): {x:number,y:number,z:number} {
  const rad = (angleDeg)*Math.PI/180;
  const x = -Math.cos(rad) * length;
  const z = -Math.sin(rad) * length;
  return {x:Round(x,6), y:0, z:Round(z,6)};
}

function scaleVector(v:{x:number,y:number,z:number},s:number){
    return {x:s*v.x,y:s*v.y,z:s*v.z}
}

export function displacementForAngle(a: number): number {
    
  const PI = Math.PI;
  const HALF_PI = 0.5 * PI;
  const TWO_THIRDS_PI = (2 / 3) * PI;
  const EPS = 1e-10;

  // normalize if a > π
  let angle = a;
  if (angle > PI) angle -= PI;

  // helper: "approximately equals"
  const approx = (x: number, y: number) => Math.abs(x - y) < EPS;

  if (angle > HALF_PI && angle < TWO_THIRDS_PI) {
    // shifted along the second panel
    return Math.abs(22.5 * Math.tan(angle - HALF_PI));
  } else if (
    approx(angle, 0) ||
    approx(Math.abs(angle), PI) ||
    approx(Math.abs(angle), HALF_PI)
  ) {
    // on a 90° corner or panels are in line
    return 0;
  } else if (angle < HALF_PI) {
    // angle < 90°
    return Math.abs(22.5 * Math.tan(angle + HALF_PI));
  } else {
    // angle > 120° and panels not in line
    return Math.abs(Math.abs(22.5 / Math.tan(angle / 2)));
  }
}

function toPlane(point:{x:number,y:number,z:number}, dir:{x:number,y:number,z:number}, coor:{x:number,y:number,z:number}, normal:{x:number,y:number,z:number}){
    let d = normal.x*coor.x + normal.y*coor.y + normal.z*coor.z;

    let dist = (d - normal.x*point.x - normal.y*point.y - normal.z*point.z)/(normal.x*dir.x + normal.y*dir.y + normal.z*dir.z);

    let x = point.x + dist*dir.x
    let y = point.y + dist*dir.y
    let z = point.z + dist*dir.z

    return {x:x, y:y, z:z};
}

function post_to_xyz(post:PostsType){
    return({x:post.x,y:post.y_ref3,z:post.z})
}

type VecLike = {
  x?: number; y?: number; z?: number;
  v_x?: number | null; v_y?: number | null; v_z?: number | null;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function resolveXYZ(v: VecLike): { x: number; y: number; z: number } {
  const x = (v.v_x ?? v.x ?? 0);
  const y = (v.v_y ?? v.y ?? 0);
  const z = (v.v_z ?? v.z ?? 0);
  return { x, y, z };
}

function angle_between_vectors(aIn: VecLike, bIn: VecLike): number {
  const a = resolveXYZ(aIn);
  const b = resolveXYZ(bIn);
    if(Math.abs(Round(a.x-b.x,3)) <= 0.1 && Math.abs(Round(a.y-b.y,3)) <= 0.1 && Math.abs(Round(a.z-b.z,3)) <= 0.1 ){ return 0}
    return Math.round(10*Math.acos(dot_product(a,b)/(norm_vector(a)*norm_vector(b)))*180/Math.PI)/10;
}

type Vec = { x: number; y: number; z: number };

const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec, b: Vec): Vec => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const scale = (v: Vec, s: number): Vec => ({ x: v.x * s, y: v.y * s, z: v.z * s });
const norm = (v: Vec) => Math.hypot(v.x, v.y, v.z);
const normalizeC = (v: Vec): Vec => {
  const n = norm(v);
  return n === 0 ? { x: 0, y: 0, z: 0 } : { x: v.x / n, y: v.y / n, z: v.z / n };
};

/**
 * Rotate vector vIn by angleDeg (degrees) around unit normal nIn.
 * Right-handed convention: positive angles rotate counterclockwise
 * when looking along +n.
 */
export function rotateAroundNormal(vIn: Vec, angleDeg: number, nIn: Vec): Vec {
  const v = vIn;                   // if needed, copy/normalize v
  const n = normalizeC(nIn);        // n MUST be unit length
  const rad = (angleDeg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);

  // Rodrigues' rotation formula:
  // v' = v*c + (n × v)*s + n*(n·v)*(1 - c)
  const term1 = scale(v, c);
  const term2 = scale(cross(n, v), s);           // <-- correct order: cross(n, v)
  const term3 = scale(n, dot(n, v) * (1 - c));
  return add(add(term1, term2), term3);
}

// --- tiny vector helpers (if you don't already have them) ---
function scaleV(v: {x:number;y:number;z:number}, k: number) {
  return { x: v.x * k, y: v.y * k, z: v.z * k };
}
function addV(a: {x:number;y:number;z:number}, b: {x:number;y:number;z:number}) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function signedAngleAroundNormal(
  aIn: VecLike,
  bIn: VecLike,
  nIn: VecLike
): number {
  const a = normalizeV(resolveXYZ(aIn)).vector;
  const b = normalizeV(resolveXYZ(bIn)).vector;
  const n = normalizeV(resolveXYZ(nIn)).vector;

  const d = clamp(dot_product(a, b), -1, 1);         // cos(theta)
  const c = dot_product(n, cross_product(a, b));             // sin(theta) * |n|
  const rad = Math.atan2(c, d);               // signed
  const deg = (rad * 180) / Math.PI;
  return deg;
}

export function signedAngleXZ(aIn: VecLike, bIn: VecLike): number {
  return signedAngleAroundNormal(aIn, bIn, { x: 0, y: 1, z: 0 });
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
  return {vector:{x:Round(x/norm,6), y:Round(y/norm,6), z:Round(z/norm,6)},norm:norm};
}

function normalizeV(v:{x:number,y:number,z:number}){
  let norm = norm_function(v.x,v.y,v.z);
  //  console.log(norm);
  return {vector:{x:Round(v.x/norm,6), y:Round(v.y/norm,6), z:Round(v.z/norm,6)},norm:norm};
}

function normalizeVec(obj:{x:number,y:number,z:number}){
    return normalize(obj.x,obj.y,obj.z)
}

function Round(n:number,d:number){
    return Math.round(n*Math.pow(10,d))/Math.pow(10,d)
}

function vectorizeLine(a:{x:number,y:number,z:number},b:{x:number,y:number,z:number}){
    const delta_x = b.x - a.x
    const delta_y = b.y - a.y
    const delta_z = b.z - a.z

    const v_x = normalize(delta_x,delta_y,delta_z).vector
    const v_z = normalizeVec({x:delta_y,y:0,z:-delta_x}).vector
    const v_y = normalizeVec(cross_product(v_x,v_z))

    return({origin:{x:a.x,y:a.y,z:a.z},ref:{x:b.x,y:b.y,z:b.z},x_axis:v_x,y_axis:v_y,z_axis:v_z})
}

function fold0_180(deg: number) {
  let a = deg % 360;
  if (a < 0) a += 360;
  if (a > 180) a = 360 - a;
  return a;
}

export function solveL(t: number, thetaDeg: number, g = 10): number {
  // fold into [0, 180]
  let theta = Math.abs(thetaDeg) % 360;
  if (theta > 180) theta = 360 - theta;

  // exact parallel case
  if (theta === 180) return g / 2;

  const half = (theta * 0.5) * Math.PI / 180;
  const s = Math.sin(half);
  const c = Math.cos(half);

  // if theta ~ 0, L blows up (geometry degenerates)
  if (Math.abs(s) < 1e-9) return Number.POSITIVE_INFINITY;

  console.log( Math.sqrt(2*Math.pow((g + t * c) / (2 * s)-6,2)))
  return (g + t * c) / (2 * s);
}
