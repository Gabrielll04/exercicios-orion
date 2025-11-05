import * as http from "node:http"

const PORT = 3000

http
    .createServer(async (req, res) => {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Hello from Docker!");
    })
    .listen(PORT, () => {
        console.log(`Server running at http://127.0.0.1:${PORT}/`);
    });