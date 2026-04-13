'use client'

import { FC, useRef, useState, useEffect } from "react"
import type { PostsType, FoundationType } from "@/app/(rs)/drawingtool/canvas/DropAnalyser"
import * as THREE from 'three'

// type PostProp = PostsType

type CanvasProps = {
    onDataSend:(v: {x:number,y:number}) => void ,
    width:number,
    height:number,
    scale:number,
    foundation_array:FoundationType[],
    posts_array:PostsType[],
    allowed_length:number,
}

// type Vector3 = {
//     x:number,
//     y:number,
//     z:number
// }

export const Canvas2D: FC<CanvasProps> = ({onDataSend, width=1500, height=1500, scale=10, foundation_array =[{id:1, type:'W', length:1000, angle:180, sections:1, offset:0, height:0, x:0, z:90, y:1020},{id:2, type:'W', length:0, angle:180, sections:0, offset:0, height:0, x:1000, z:90, y:1020,}] ,posts_array=[{id:1, post_id:1, type:'BP', length:1000, angle:180, reversed:false, height:0, x:0, z:0, y_ref1:1020, y_ref2:989, y_ref3:80},{id:2, post_id:2, type:'BP', length:1000, angle:180, reversed:false, height:0, x:1000, z:0, y_ref1:1020, y_ref2:989, y_ref3:80}], allowed_length=1280 }) => {

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // const [ xy, setXY ] = useState({x:0, y:0})

    //   const dataToSend = 'Hello from the child!';

    //   const handleClick = () => {
    //     onDataSend(xy);
    //   };

    // const onClick = useState({ name: "click" });

    function addPost(x:number,y:number,o:number, label = "", color = "green"){
        const canvas = canvasRef.current;
        if (!canvas) return; // not mounted yet
        const ctx = canvas.getContext('2d');
        if (!ctx) return; // context not available
        ctx.save();
        
        
        ctx.fillStyle = color;
        ctx.translate( x, y );
        ctx.rotate( o * Math.PI / 180 );
        ctx.fillRect(80/(scale*2), 110/(scale*2), -80/scale, -110/scale);
        ctx.beginPath();
        ctx.moveTo(0/(scale*2),-65/(scale*2));
        ctx.strokeStyle = "black";
        
        ctx.lineTo(0,65/(scale*2));
        ctx.stroke();
        
        ctx.fillStyle = "black";
        ctx.textAlign = "center";
        ctx.font = "12px serif";

        if((o+560)%360 > 90 && (o+560)%360 < 270){
            ctx.translate(0,5+120/scale);
        }
        else{
            ctx.translate(0,-5-120/scale);
        }
        ctx.rotate( -o * Math.PI / 180 );
        ctx.fillText(label, 0,0);
        ctx.restore();

        
    }

    function addLine(x:number,y:number,x2:number, y2:number, o:number, color = "black", label="Label"){
        const canvas = canvasRef.current;
        if (!canvas) return; // not mounted yet
        const ctx = canvas.getContext('2d');
        if (!ctx) return; // context not available
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.strokeStyle = color;
        ctx.lineTo(x2,y2);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.font = "12px serif";
        ctx.translate((x+x2)/2,(y+y2)/2);
        if((o+560)%360 > 90 && (o+560)%360 < 270){
            ctx.rotate( (o) * Math.PI / 180 );
        }
        else{
            ctx.rotate( (o+180) * Math.PI / 180 );
        }
        ctx.fillText(label, 0, (-100/scale));
        ctx.restore();
        
    }

    function adddottedLine(x:number,y:number,x2:number, y2:number, o:number, color = "black", label=""){
        const canvas = canvasRef.current;
        if (!canvas) return; // not mounted yet
        const ctx = canvas.getContext('2d');
        if (!ctx) return; // context not available
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([2, 16]);          // dashed only for this stroke
        ctx.lineWidth = 1;
        ctx.lineCap = 'butt';
        ctx.strokeStyle = color;

        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // reset dash so future strokes elsewhere aren't dashed
        ctx.setLineDash([]);
        ctx.restore();

        // --- draw the label (no effect on strokes) ---
        ctx.save();
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.font = "12px serif";
        ctx.translate((x+x2)/2,(y+y2)/2);
        if((o+560)%360 > 90 && (o+560)%360 < 270){
            ctx.rotate( (o) * Math.PI / 180 );
        }
        else{
            ctx.rotate( (o+180) * Math.PI / 180 );
        }
        ctx.fillText(label, 0, (-100/scale));
        ctx.restore();
        
    }

    function addAngleDimension(x:number,y:number, o:number, o2:number, color = "black", label=""){
        const canvas = canvasRef.current;
        if (!canvas) return; // not mounted yet
        const ctx = canvas.getContext('2d');
        if (!ctx) return; // context not available
        ctx.save();
        ctx.translate(x,y);
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.font = "12px serif";
        
        if(o > 0){
            ctx.translate(0,15+120/scale);
        }
        else{
            ctx.translate(0,-15-120/scale);
        }
        
        ctx.rotate( (180+o2) * Math.PI / 180 );
        // ctx.rotate( -(o2+o) * Math.PI / 360 );
        ctx.fillText(label, 0,0);
        ctx.restore();
        // console.log(o2);
    }

    function getSpan(){
        const xyo = [];
        let o = 180;
        for (let index = 0; index < posts_array.length; index++) {
            o += Number(posts_array[index].angle);
            o = (o+180)%360 ;
            xyo[index]  = {"x":Number(posts_array[index].x), "y":Number(posts_array[index].z), "o":-o};
        }
        return xyo;
    }

    function getSpanFoundation(){
        const xyo = [];
        let o = 180;
        for (let index = 0; index < foundation_array.length; index++) {
            o += Number(foundation_array[index].angle);
            o = (o+180)%360 ;
            xyo[index]  = {"x":Number(foundation_array[index].x), "y":Number(foundation_array[index].z), "o":-o};
        }
        return xyo;
    }

    function xy_Boundaries(){
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

    function toPlane(point:THREE.Vector3|{x:number,y:number,z:number}, dir:THREE.Vector3|{x:number,y:number,z:number}, coor:THREE.Vector3|{x:number,y:number,z:number}, normal:THREE.Vector3|{x:number,y:number,z:number}){
        let d = normal.x*coor.x + normal.y*coor.y + normal.z*coor.z;

        let dist = (d - normal.x*point.x - normal.y*point.y - normal.z*point.z)/(normal.x*dir.x + normal.y*dir.y + normal.z*dir.z);

        let x = point.x + dist*dir.x
        let y = point.y + dist*dir.y
        let z = point.z + dist*dir.z

        return {x:x, y:y, z:z};
    }

    function disttoPlane(point:THREE.Vector3|{x:number,y:number,z:number}, dir:THREE.Vector3|{x:number,y:number,z:number}, coor:THREE.Vector3|{x:number,y:number,z:number}, normal:THREE.Vector3|{x:number,y:number,z:number}){
        let d = normal.x*coor.x + normal.y*coor.y + normal.z*coor.z;

        let dist = (d - normal.x*point.x - normal.y*point.y - normal.z*point.z)/(normal.x*dir.x + normal.y*dir.y + normal.z*dir.z);

        // let x = point.x + dist*dir.x
        // let y = point.y + dist*dir.y
        // let z = point.z + dist*dir.z

        return dist;
    }

    function distToPointXYZ (a:THREE.Vector3|{x:number,y:number,z:number}, b:THREE.Vector3|{x:number,y:number,z:number}){
        let dist = Math.sqrt(Math.pow(a.x-b.x,2) + Math.pow(a.y-b.y,2) + Math.pow(a.z-b.z,2))
        return dist
    }

    useEffect(() => {
        // console.log("Render 2D")
        const canvas = canvasRef.current;
        if (!canvas) return; // not mounted yet

        const ctx = canvas.getContext('2d');
        if (!ctx) return; // context not available

        // ✅ TypeScript knows canvas and ctx are non-null here

        // const resize = () => {
        // const dpr = window.devicePixelRatio || 1;
        // const { width, height } = canvas.getBoundingClientRect();
        // canvas.width = Math.max(1, Math.floor(width * dpr));
        // canvas.height = Math.max(1, Math.floor(height * dpr));
        // ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale once

        const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const nextW = Math.max(1, Math.floor(rect.width * dpr));
        const nextH = Math.max(1, Math.floor(rect.height * dpr));

        // 2) only touch width/height if they actually changed
        const wasFocused = document.activeElement === canvas;
        let resized = false;
        if (canvas.width !== nextW) { canvas.width = nextW; resized = true; }
        if (canvas.height !== nextH) { canvas.height = nextH; resized = true; }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale once
        draw();

        // 3) restore focus if we had it before (especially after a resize)
        if (wasFocused && resized) {
        canvas.focus({ preventScroll: true });
        }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (foundation_array.length > 1 && Number(foundation_array[0].x) != null){
                
                // console.log("f", foundation_array)
                const xyo = getSpanFoundation();
                const xy_bounds = xy_Boundaries();

                for (let index = 0; index < foundation_array.length; index++) {
                    xyo[index].o = xyo[index].o%360;            
                }

                for(let index = 0; index < foundation_array.length; index++){
                //    ctx.save();
                //     ctx.fillStyle = 'red';
                //     ctx.translate(  width/2 + (foundation_array[i].x - xy_bounds.center.x)/scale, height/2 + (foundation_array[i].z - xy_bounds.center.y)/scale);
                //     ctx.fillRect(80/(scale*2), 110/(scale*2), -80/(scale*2), -110/(scale*2));
                //     ctx.restore();
                // addPost(width/2 + (foundation_array[index].x - xy_bounds.center.x)/scale, height/2 + (foundation_array[index].z - xy_bounds.center.y)/scale, xyo[index].o, foundation_array[index].id.toString())
                    let post_color = 'green';    
                    if (foundation_array[index].type == 'F' || foundation_array[index].type == 'S' || foundation_array[index].type == 'W'){
                            post_color = 'white';
                    }    


                    if (foundation_array[index].type == 'F' || foundation_array[index].type == 'S' || foundation_array[index].type == 'W') {
                        if (index > 0){
                            // console.log(Math.abs(xyo[index].o - xyo[index-1].o));
                            // if (Math.abs(xyo[index].o - xyo[index-1].o) < 60){
                                addPost(width/2 + (Number(foundation_array[index].x) - xy_bounds.center.x)/scale, height/2 + (Number(foundation_array[index].z) - xy_bounds.center.y)/scale, (xyo[index].o + xyo[index-1].o)/2, String.fromCharCode("A".charCodeAt(0) + foundation_array[index].id-1) , post_color);


                            // }
                        }
                        else {
                            addPost(width/2 + (Number(foundation_array[index].x) - xy_bounds.center.x)/scale, height/2 + (Number(foundation_array[index].z) - xy_bounds.center.y)/scale, xyo[index].o, String.fromCharCode("A".charCodeAt(0) + foundation_array[index].id-1) , post_color);
                        }
                    }
                    else{
                        if (index > 0){
                            // console.log(Math.abs(xyo[index].o - xyo[index-1].o));
                            // if (Math.abs(xyo[index].o - xyo[index-1].o) < 60){
                                addPost(width/2 + (Number(foundation_array[index].x) - xy_bounds.center.x)/scale, height/2 + (Number(foundation_array[index].z) - xy_bounds.center.y)/scale, (xyo[index].o + xyo[index-1].o)/2, foundation_array[index].id > 0 ? foundation_array[index].id.toString() : foundation_array[index].type , post_color);
                            // }
                        }
                        else {
                            addPost(width/2 + (Number(foundation_array[index].x) - xy_bounds.center.x)/scale, height/2 + (Number(foundation_array[index].z) - xy_bounds.center.y)/scale, xyo[index].o, foundation_array[index].id > 0 ? foundation_array[index].id.toString() : foundation_array[index].type , post_color);
                        }
                    }
                    // console.log("Post added", index)

                    if(index > 0){
                        
                        if (foundation_array[index-1].type == 'F') {
                            // adddottedLine(width/2 + (Number(foundation_array[index-1].x) - xy_bounds.center.x)/scale, height/2 + (Number(foundation_array[index-1].z) - xy_bounds.center.y)/scale, width/2 + (Number(foundation_array[index].x) - xy_bounds.center.x)/scale, height/2 + (Number(foundation_array[index].z) - xy_bounds.center.y)/scale, xyo[index-1].o, foundation_array[index-1].length <= allowed_length ? "grey" : "grey", (foundation_array[index-1].length).toString());

                            
                            const left = new THREE.Vector3(Number(foundation_array[index-1].x),Number(foundation_array[index-1].y),Number(foundation_array[index-1].z))
                            const right = new THREE.Vector3(Number(foundation_array[index].x),Number(foundation_array[index].y),Number(foundation_array[index].z))

                            
                            const dir = direction_vector(right,left).vector
                            
                            const dir2 = index < foundation_array.length-1 ? direction_vector(new THREE.Vector3(Number(foundation_array[index+1].x),Number(foundation_array[index+1].y),Number(foundation_array[index+1].z)),right).vector : dir

                            const dir0 = index>1 ? direction_vector(left,{x:foundation_array[index-2].x,y:foundation_array[index-2].y,z:foundation_array[index-2].z}).vector : {x:-dir.x,y:-dir.y,z:-dir.z}
                            
                            
                            adddottedLine(width/2 + (Number(left.x) - xy_bounds.center.x)/scale, height/2 + (Number(left.z) - xy_bounds.center.y)/scale, width/2 + (Number(right.x) - xy_bounds.center.x)/scale, height/2 + (Number(right.z) - xy_bounds.center.y)/scale, xyo[index-1].o, "grey", (foundation_array[index-1].length).toString());



                            const left_Vec = index===1 || (Math.round(dir.x*100)=== -Math.round(dir0.x*100) && Math.round(dir.y*100)=== -Math.round(dir0.y*100) && Math.round(dir.z*100)=== -Math.round(dir0.z*100)) ? {x:Math.round(dir.x*1000)/1000,y:Math.round(dir.y*1000)/1000,z:Math.round(dir.z*1000)/1000} : angleDegToXZVector((360+xzVectorToAngleDeg(dir)+xzVectorToAngleDeg(dir0))/2)
                            
                            const right_Vec = index===foundation_array.length-1  || (Math.round(dir.x*100)===Math.round(dir2.x*100) && Math.round(dir.y*100)=== Math.round(dir2.y*100) && Math.round(dir.z*100)=== Math.round(dir2.z*100)) ? {x:-Math.round(dir.x*1000)/1000,y:-Math.round(dir.y*1000)/1000,z:-Math.round(dir.z*1000)/1000} : angleDegToXZVector(-90+(180+xzVectorToAngleDeg(dir)+xzVectorToAngleDeg(dir2))/2)

                            // console.log(index,left_Vec,right_Vec)



                            

                            const orientaiton = xzVectorToAngleDeg(dir)

                            // addPost(width/2 + (Number(midpoint.x) - xy_bounds.center.x)/scale, height/2 + (Number(midpoint.z) - xy_bounds.center.y)/scale, orientaiton, orientaiton.toString() , 'grey');

                            let offset = foundation_array[index-1].offset

                            const left_Offset = {x:left.x+offset*Math.sin((orientaiton)*Math.PI/180),y:left.y,z:left.z+offset*Math.sin((-90+orientaiton)*Math.PI/180)}
                            const right_Offset = {x:right.x+offset*Math.sin((orientaiton)*Math.PI/180),y:right.y,z:right.z+offset*Math.sin((-90+orientaiton)*Math.PI/180)}

                            // console.log(index, left_Offset, right_Offset)
                            const midpoint = new THREE.Vector3((left_Offset.x+right_Offset.x)/2,(left_Offset.y+right_Offset.y)/2,(left_Offset.z+right_Offset.z)/2)
                            
                            const corner_1 = toPlane({x:midpoint.x,y:midpoint.y,z:midpoint.z},{x:-dir.x,y:-dir.y,z:-dir.z},left,left_Vec);
                            
                            // const corner_1 = toPlane({x:midpoint.x,y:midpoint.y,z:midpoint.z},{x:-dir.x,y:-dir.y,z:-dir.z},toPlane(left_Offset,{x:-dir.x,y:-dir.y,z:-dir.z},corner_1_T,angleDegToXZVector(-90+xzVectorToAngleDeg(dir))),left_Vec);

                            const corner_2 = toPlane({x:midpoint.x,y:midpoint.y,z:midpoint.z},dir,right,right_Vec);

                            // addLine(width/2 + (Number(corner_1.x) - xy_bounds.center.x)/scale, height/2 + (Number(corner_1.z) - xy_bounds.center.y)/scale, width/2 + (Number(corner_2.x) - xy_bounds.center.x)/scale, height/2 + (Number(corner_2.z) - xy_bounds.center.y)/scale, xyo[index-1].o, foundation_array[index-1].length <= allowed_length ? "grey" : "grey", (Math.round(distToPointXYZ(corner_1,corner_2)*10)/10).toString());

                        }
                        
                        else{
                            addLine(width/2 + (Number(foundation_array[index-1].x) - xy_bounds.center.x)/scale, height/2 + (Number(foundation_array[index-1].z) - xy_bounds.center.y)/scale, width/2 + (Number(foundation_array[index].x) - xy_bounds.center.x)/scale, height/2 + (Number(foundation_array[index].z) - xy_bounds.center.y)/scale, xyo[index-1].o, foundation_array[index-1].length <= allowed_length ? "black" : "red", (foundation_array[index-1].length).toString());
                        }

                    
                        if(Math.abs(Number(foundation_array[index].angle))%90 !== 0){
                            addAngleDimension(width/2 + (Number(foundation_array[index].x) - xy_bounds.center.x)/scale, height/2 + (Number(foundation_array[index].z) - xy_bounds.center.y)/scale, Number(foundation_array[index].angle), xyo[index].o, "black", (Number(foundation_array[index].angle) < 0 ? -Number(foundation_array[index].angle)  : Number(foundation_array[index].angle) ).toString()+String.fromCharCode(176));
                        }
                    
                    }
                }
                // adddottedLine(width/2 + (Number(foundation_array[0].x) - xy_bounds.center.x)/scale, height/2 + (Number(foundation_array[0].z) - xy_bounds.center.y)/scale, width/2 + (Number(foundation_array[foundation_array.length-1].x) - xy_bounds.center.x)/scale, height/2 + (Number(foundation_array[foundation_array.length-1].z) - xy_bounds.center.y)/scale, xyo[0].o, "grey", '');

            }
            if (posts_array.length > 1 && Number(posts_array[0].x) != null){
                
                // console.log(posts_array)
                const xyo = getSpan();
                const xy_bounds = xy_Boundaries();

                for (let index = 0; index < posts_array.length; index++) {
                    xyo[index].o = xyo[index].o%360;            
                }

                for(let index = 0; index < posts_array.length; index++){
                //    ctx.save();
                //     ctx.fillStyle = 'red';
                //     ctx.translate(  width/2 + (posts_array[i].x - xy_bounds.center.x)/scale, height/2 + (posts_array[i].z - xy_bounds.center.y)/scale);
                //     ctx.fillRect(80/(scale*2), 110/(scale*2), -80/(scale*2), -110/(scale*2));
                //     ctx.restore();
                // addPost(width/2 + (posts_array[index].x - xy_bounds.center.x)/scale, height/2 + (posts_array[index].z - xy_bounds.center.y)/scale, xyo[index].o, posts_array[index].id.toString())
                    let post_color = 'green';    
                    if (posts_array[index].type == 'NP' || posts_array[index].type == 'G'){
                            post_color = 'grey';
                    } else if (posts_array[index].type == 'S' || posts_array[index].type == 'EC' || posts_array[index].type == 'WC'){
                            post_color = 'white';
                    }    

                    if (index > 0){
                        // console.log(Math.abs(xyo[index].o - xyo[index-1].o));
                        if (Math.abs(xyo[index].o - xyo[index-1].o) < 60){
                            addPost(width/2 + (Number(posts_array[index].x) - xy_bounds.center.x)/scale, height/2 + (Number(posts_array[index].z) - xy_bounds.center.y)/scale, (xyo[index].o + xyo[index-1].o)/2, posts_array[index].post_id > 0 ? posts_array[index].post_id.toString() : posts_array[index].type , post_color);
                        }
                        else{ 
                            addPost(width/2 + (Number(posts_array[index].x) - xy_bounds.center.x)/scale, height/2 + (Number(posts_array[index].z) - xy_bounds.center.y)/scale, posts_array[index].reversed ? xyo[index-1].o : xyo[index].o, posts_array[index].post_id > 0 ? posts_array[index].post_id.toString() : posts_array[index].type , post_color);
                        }
                    }
                    else {
                        addPost(width/2 + (Number(posts_array[index].x) - xy_bounds.center.x)/scale, height/2 + (Number(posts_array[index].z) - xy_bounds.center.y)/scale, xyo[index].o, posts_array[index].post_id > 0 ? posts_array[index].post_id.toString() : posts_array[index].type , post_color);
                    }
                    
                    // console.log("Post added", index)

                    if(index > 0){
                        
                        if (posts_array[index].type == 'S' || (posts_array[index-1].type == 'S' ) || ((posts_array[index].type == 'EC' || posts_array[index].type == 'WC') && (posts_array[index-1].type == 'EC' || posts_array[index-1].type == 'WC'))) {
                            adddottedLine(width/2 + (Number(posts_array[index-1].x) - xy_bounds.center.x)/scale, height/2 + (Number(posts_array[index-1].z) - xy_bounds.center.y)/scale, width/2 + (Number(posts_array[index].x) - xy_bounds.center.x)/scale, height/2 + (Number(posts_array[index].z) - xy_bounds.center.y)/scale, xyo[index-1].o, posts_array[index-1].length <= allowed_length ? "grey" : "red", (posts_array[index-1].length).toString());
                            // console.log("Space", index)
                        }
                        
                        else{
                            addLine(width/2 + (Number(posts_array[index-1].x) - xy_bounds.center.x)/scale, height/2 + (Number(posts_array[index-1].z) - xy_bounds.center.y)/scale, width/2 + (Number(posts_array[index].x) - xy_bounds.center.x)/scale, height/2 + (Number(posts_array[index].z) - xy_bounds.center.y)/scale, xyo[index-1].o, posts_array[index-1].length <= allowed_length ? "black" : "red", (posts_array[index-1].length).toString());
                        }

                    
                        if(Math.abs(Number(posts_array[index].angle))%90 !== 0){
                            addAngleDimension(width/2 + (Number(posts_array[index].x) - xy_bounds.center.x)/scale, height/2 + (Number(posts_array[index].z) - xy_bounds.center.y)/scale, Number(posts_array[index].angle), xyo[index].o, "black", (Number(posts_array[index].angle) < 0 ? -Number(posts_array[index].angle)  : Number(posts_array[index].angle) ).toString()+String.fromCharCode(176));
                        }
                    
                    }
                }
            }
            //  addPost(width/2 + (0)/scale, height/2 + (0)/scale, 0, "post", "black");
        }

        // ctx.clearRect(0, 0, width, height);
        
        

        resize();
        window.addEventListener('resize', resize);

        return () => {
        window.removeEventListener('resize', resize);
        // no other cleanup needed for 2D context
        };
        // resizeAndDraw();
        // window.addEventListener('resize', resizeAndDraw);
        // return () => window.removeEventListener('resize', resizeAndDraw);


        // eslint-disable-next-line react-hooks/exhaustive-deps     
    }, [width, height, scale, posts_array, foundation_array]);

    return (
    <canvas ref={canvasRef} className="border border-black" style={{ width: width, height: height }} onMouseDown={() => canvasRef.current?.focus({ preventScroll: true })} onClick={ (event)=> {
        const canvas = canvasRef.current;
        if (!canvas) return; // not mounted yet

        const ctx = canvas.getContext('2d');
        if (!ctx) return; // context not available

        // ✅ TypeScript knows canvas and ctx are non-null here

        // ctx.clearRect(0, 0, width, height);
        getSpan();
        const xy_bounds = xy_Boundaries();
        let rect = canvas.getBoundingClientRect();
        let x = ((event.clientX - rect.left)-width/2)*scale + xy_bounds.center.x;
        let y = ((event.clientY - rect.top)-height/2)*scale + xy_bounds.center.y;
        // console.log('x_o: ' + (event.clientX - rect.left) + ', y_o:' + (event.clientY - rect.top))
        // console.log('x: ' + x + ', y:' + y)
        // setXY({x:x, y: y})
        onDataSend({x:x, y: y})
        // handleClick()

        // onDataSend({x:x, y: y});
        
    }}>
        
    </canvas>
  )
}

export function angleDegToXZVector(angleDeg: number, length = 1): THREE.Vector3 {
  const rad = THREE.MathUtils.degToRad(angleDeg);
  const x = -Math.cos(rad) * length;
  const z = -Math.sin(rad) * length;
  return new THREE.Vector3(x, 0, z);
}

export function xzVectorToAngleDeg(vector: THREE.Vector3|{x:number,y:number,z:number}): number {
  const angleRad = Math.atan2(vector.z, vector.x);
  return THREE.MathUtils.radToDeg(angleRad);
}

function direction_vector (point0:THREE.Vector3|{x:number,y:number,z:number}, point1:THREE.Vector3|{x:number,y:number,z:number}){
  
  const d_vector = normalize(point1.x-point0.x,point1.y-point0.y,point1.z-point0.z);

  return d_vector;
}

function norm_function(x:number,y:number,z:number){
  return Math.sqrt(Math.pow(x,2)+Math.pow(y,2)+Math.pow(z,2));
}

function norm_vector(a:THREE.Vector3|{x:number,y:number,z:number}){
  return norm_function(a.x,a.y,a.z);
}

function normalize(x:number,y:number,z:number){
  let norm = norm_function(x,y,z);
  //  console.log(norm);
  return {vector:{x:Math.round(1000*x/norm)/1000, y:Math.round(1000*y/norm)/1000, z:Math.round(1000*z/norm)/1000},norm:norm};
}