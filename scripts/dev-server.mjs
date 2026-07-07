import http from 'node:http';
import next from 'next';

const dev = true;
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || '0.0.0.0';

const app = next({ dev, hostname, port, webpack: true });
const handle = app.getRequestHandler();

await app.prepare();

const server = http.createServer((req, res) => {
  void handle(req, res);
});

server.listen(port, hostname, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
});
