// Only source scenery is clipped near the observation camera. Terrain, actors
// and gameplay collisions stay intact, including shared/batched tree meshes.
export function installFollowVisibility(root){
 const radius={value:0},seen=new Set();root.traverse(o=>{if(!o.isMesh||['terrain','bridge'].includes(o.userData.role)||o.geometry.hasAttribute('_meadow'))return;
  for(const m of Array.isArray(o.material)?o.material:[o.material]){if(seen.has(m)||!m.isMeshStandardMaterial&&!m.isMeshLambertMaterial&&!m.isMeshPhongMaterial)continue;seen.add(m);const before=m.onBeforeCompile,key=m.customProgramCacheKey();m.onBeforeCompile=(s,r)=>{before.call(m,s,r);s.uniforms.followRadius=radius;s.vertexShader='varying vec3 followWorld;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
vec4 followVertex=vec4(transformed,1.);
#ifdef USE_INSTANCING
followVertex=instanceMatrix*followVertex;
#endif
followWorld=(modelMatrix*followVertex).xyz;`);s.fragmentShader='uniform float followRadius;varying vec3 followWorld;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(followRadius>0.&&distance(followWorld,cameraPosition)<followRadius)discard;');};m.customProgramCacheKey=()=>key+'|follow-visibility';m.needsUpdate=true;}
 });return radius;
}
