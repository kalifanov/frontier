import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const allowed=new Set(['/index.html','/frontier.html','/styles.css','/app.js','/game.js']);
createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const route=pathname==='/'?'/index.html':pathname;if(!allowed.has(route)){res.writeHead(404);return res.end('Not found');}const path=resolve(root,'.'+route);if(!path.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403);return res.end();}const body=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]??'application/octet-stream','Cache-Control':'no-cache'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}}).listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('Frontier: http://127.0.0.1:4173'));
