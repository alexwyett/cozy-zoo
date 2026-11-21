import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve,extname,sep } from 'node:path';

const root=fileURLToPath(new URL('../dist/',import.meta.url)),port=4173;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.webp':'image/webp','.txt':'text/plain; charset=utf-8'};
const server=createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!path.startsWith(resolve(root)+sep)){res.writeHead(403);res.end();return;}
    const info=await stat(path);if(!info.isFile()){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':types[extname(path)]??'application/octet-stream','Content-Length':info.size,'Cache-Control':/[-][a-zA-Z0-9]{8,12}\.(js|css|webp|glb)$/.test(path)?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD'){res.end();return;}createReadStream(path).on('error',()=>res.destroy()).pipe(res);
  }catch(error){res.writeHead(error.code==='ENOENT'?404:400);res.end();}
});
server.on('error',error=>{console.error(`Preview could not start: ${error.message}`);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Pocket Zoo preview: http://127.0.0.1:${port} (serves only dist/; Ctrl+C to stop)`));
