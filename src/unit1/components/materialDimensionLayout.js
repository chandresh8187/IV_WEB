export function dimensionOutline(points) {
  const sorted=[...points].sort((a,b)=>a.x-b.x||a.y-b.y);
  const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const half=values=>{const hull=[];for(const point of values){while(hull.length>1&&cross(hull.at(-2),hull.at(-1),point)<=0)hull.pop();hull.push(point);}return hull;};
  const lower=half(sorted),upper=half([...sorted].reverse());
  return [...lower.slice(0,-1),...upper.slice(0,-1)];
}

function coversMaterial(rect,outline,clearance) {
  if(!outline?.length)return false;
  const corners=[{x:rect.left-clearance,y:rect.top-clearance},{x:rect.left+rect.width+clearance,y:rect.top-clearance},{x:rect.left+rect.width+clearance,y:rect.top+rect.height+clearance},{x:rect.left-clearance,y:rect.top+rect.height+clearance}];
  const axes=[{x:1,y:0},{x:0,y:1},...outline.map((point,index)=>{const next=outline[(index+1)%outline.length];return {x:point.y-next.y,y:next.x-point.x};})];
  return !axes.some(axis=>{
    const a=corners.map(point=>point.x*axis.x+point.y*axis.y),b=outline.map(point=>point.x*axis.x+point.y*axis.y);
    return Math.max(...a)<Math.min(...b)||Math.max(...b)<Math.min(...a);
  });
}

// Keep callouts outside the projected material, as well as away from each other.
export function layoutDimensionLabels(items, width, height, {padding=8,gap=6,outline=[],placement='any',clearance=12}={}) {
  const placed=[],cells=new Map(),cellSize=64;
  const bounds=outline.length?{left:Math.min(...outline.map(point=>point.x)),right:Math.max(...outline.map(point=>point.x)),top:Math.min(...outline.map(point=>point.y)),bottom:Math.max(...outline.map(point=>point.y))}:null;
  const keys=rect=>{
    const result=[];
    for(let x=Math.floor((rect.left-gap)/cellSize);x<=Math.floor((rect.left+rect.width+gap)/cellSize);x++) {
      for(let y=Math.floor((rect.top-gap)/cellSize);y<=Math.floor((rect.top+rect.height+gap)/cellSize);y++)result.push(x+':'+y);
    }
    return result;
  };
  const free=(rect,item)=>{
    const separation=clearance+(item.outset||0);
    if(bounds&&placement==='left-right'&&rect.left+rect.width>bounds.left-separation&&rect.left<bounds.right+separation)return false;
    if(bounds&&placement==='above-below'&&rect.top+rect.height>bounds.top-separation&&rect.top<bounds.bottom+separation)return false;
    if(coversMaterial(rect,outline,separation))return false;
    return keys(rect).every(key=>(cells.get(key)||[]).every(other=>
    rect.left+rect.width+gap<=other.left||other.left+other.width+gap<=rect.left||
    rect.top+rect.height+gap<=other.top||other.top+other.height+gap<=rect.top));
  };
  const ordered=items.map((item,index)=>({...item,index})).sort((a,b)=>(a.priority||0)-(b.priority||0)||a.index-b.index);
  for(const item of ordered) {
    const separation=clearance+(item.outset||0);
    const maxX=width-padding-item.width,maxY=height-padding-item.height;
    if(item.width<=0||item.height<=0||maxX<padding||maxY<padding){placed.push({...item,visible:false});continue;}
    const clamp=(value,max)=>Math.min(max,Math.max(padding,value));
    const preferredX=clamp(item.x-item.width/2,maxX),preferredY=clamp(item.y-item.height/2,maxY);
    const xs=new Set([preferredX,padding,maxX,(padding+maxX)/2]);
    if(bounds){xs.add(clamp(bounds.left-separation-item.width,maxX));xs.add(clamp(bounds.right+separation,maxX));}
    for(let offset=item.width+gap;offset<width;offset+=item.width+gap){xs.add(clamp(preferredX-offset,maxX));xs.add(clamp(preferredX+offset,maxX));}
    const ys=new Set([preferredY,padding,maxY]);
    if(bounds){ys.add(clamp(bounds.top-separation-item.height,maxY));ys.add(clamp(bounds.bottom+separation,maxY));}
    for(let offset=item.height+gap;offset<height;offset+=item.height+gap){ys.add(clamp(preferredY-offset,maxY));ys.add(clamp(preferredY+offset,maxY));}
    const candidates=[];
    for(const left of xs)for(const top of ys)candidates.push({left,top,width:item.width,height:item.height,score:(left-preferredX)**2+(top-preferredY)**2});
    candidates.sort((a,b)=>a.score-b.score);
    const position=candidates.find(candidate=>free(candidate,item));
    if(!position){placed.push({...item,visible:false});continue;}
    for(const key of keys(position)){if(!cells.has(key))cells.set(key,[]);cells.get(key).push(position);}
    placed.push({...item,...position,visible:true});
  }
  return placed.sort((a,b)=>a.index-b.index);
}
