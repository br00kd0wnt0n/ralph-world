// Minimal static server with CORS for the synthetic HLS fixtures — hls.js on the
// Next dev server (:3000) fetches these cross-origin, like it does from Bunny.
//   node e2e/fixtures/synth-hls/serve.mjs <dir> [port]
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || '.')
const port = Number(process.argv[3]) || 8099
const types = { '.m3u8': 'application/vnd.apple.mpegurl', '.ts': 'video/mp2t' }

http
  .createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
    const p = path.join(root, rel)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'no-cache')
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
      res.writeHead(404)
      res.end()
      return
    }
    res.setHeader('Content-Type', types[path.extname(p)] ?? 'application/octet-stream')
    fs.createReadStream(p).pipe(res)
  })
  .listen(port, () => console.log(`synthetic HLS: serving ${root} on http://localhost:${port}`))
