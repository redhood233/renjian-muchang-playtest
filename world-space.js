// One affine map for authored scenery, simulation anchors and navigation.
export function mapPoint(p,g){return {...p,x:g.pivotX+(p.x-g.pivotX)*g.scale,y:g.pivotY+(p.y-g.pivotY)*g.scale};}
export function mapArea(a,g,building=false){const min=mapPoint({x:a.minX,y:a.minY},g),max=mapPoint({x:a.maxX,y:a.maxY},g);return {...a,minX:min.x,minY:min.y,maxX:max.x,maxY:max.y,spacing:a.spacing*g.scale,size:a.size*g.scale*(building?g.buildingScale:1)};}
