import * as http from "node:http";
import { Pool } from "pg";
import { parse } from "url";

const PORT = 3000;

const pool = new Pool();

await pool.query(`
  CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
  );
`);

const server = http.createServer(async (req, res) => {
    const { pathname, query } = parse(req.url, true);
    res.setHeader("Content-Type", "application/json");

    try {
        if (req.method === "GET" && pathname === "/items") {
            try {
                const { rows } = await pool.query("SELECT * FROM items ORDER BY id");
                res.writeHead(200);
                res.end(JSON.stringify(rows));
            } catch (dbError) {
                console.error("DB Error (GET):", dbError);
                res.writeHead(500);
                res.end(JSON.stringify({ error: "Database error" }));
            }
        }

        else if (req.method === "POST" && pathname === "/items") {
            let body = "";
            req.on("data", chunk => (body += chunk));
            req.on("end", async () => {
                try {
                    const data = JSON.parse(body);
                    const result = await pool.query(
                        "INSERT INTO items (name) VALUES ($1) RETURNING *",
                        [data.name]
                    );
                    res.writeHead(201);
                    res.end(JSON.stringify(result.rows[0]));
                } catch (err) {
                    console.error("POST Error:", err);
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: "Invalid JSON or database error" }));
                }
            });
        }

        else if (req.method === "PUT" && pathname === "/items") {
            const id = query.id;
            if (!id) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Missing id" }));
                return;
            }

            let body = "";
            req.on("data", chunk => (body += chunk));
            req.on("end", async () => {
                try {
                    const data = JSON.parse(body);
                    const result = await pool.query(
                        "UPDATE items SET name=$1 WHERE id=$2 RETURNING *",
                        [data.name, id]
                    );
                    if (result.rows.length === 0) {
                        res.writeHead(404);
                        res.end(JSON.stringify({ error: "Item not found" }));
                        return;
                    }
                    res.writeHead(200);
                    res.end(JSON.stringify(result.rows[0]));
                } catch (err) {
                    console.error("PUT Error:", err);
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: "Invalid JSON or database error" }));
                }
            });
        }

        else if (req.method === "DELETE" && pathname === "/items") {
            const id = query.id;
            if (!id) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Missing id" }));
                return;
            }

            try {
                const result = await pool.query("DELETE FROM items WHERE id=$1", [id]);
                if (result.rowCount === 0) {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: "Item not found" }));
                    return;
                }
                res.writeHead(204);
                res.end();
            } catch (err) {
                console.error("DELETE Error:", err);
                res.writeHead(500);
                res.end(JSON.stringify({ error: "Database error" }));
            }
        }

        else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: "Route not found" }));
        }
    } catch (err) {
        console.error("General Error:", err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: "Internal server error" }));
    }
});

server.listen(PORT, () =>
    console.log(`Server running at http://127.0.0.1:${PORT}/`)
);
