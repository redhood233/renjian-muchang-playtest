// Supports both raw gzip files and hosts that already decode Content-Encoding.
export async function decodeModelPayload(payload){
 let bytes=payload;
 const head=new Uint8Array(payload,0,Math.min(2,payload.byteLength));
 if(head[0]===31&&head[1]===139){
  if(typeof DecompressionStream!=='undefined'){
   bytes=await new Response(new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }else{
   await import('./vendor/pako-inflate.min.js');
   const unpacked=globalThis.pako.ungzip(new Uint8Array(payload));
   bytes=unpacked.buffer.slice(unpacked.byteOffset,unpacked.byteOffset+unpacked.byteLength);
  }
 }
 if(bytes.byteLength<12||new DataView(bytes).getUint32(0,true)!==0x46546c67)throw Error('场景资源格式不正确，请刷新重试');
 return bytes;
}
