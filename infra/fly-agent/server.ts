import { createServer, IncomingMessage, ServerResponse } from "http";
import { spawn } from "child_process";
import { writeFileSync, existsSync, unlinkSync, readFileSync, watch, mkdirSync } from "fs";
import { join } from "path";

const WORKSPACE = "/app/workspace";
const OUTPUT_FILE = join(WORKSPACE, "generated/live.html");
const PORT = process.env.PORT || 8080;
const API_KEY = process.env.CURSOR_API_KEY;

interface SSEResponse extends ServerResponse {
  send: (data: object) => void;
}

function setupSSE(res: ServerResponse): SSEResponse {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  
  const sseRes = res as SSEResponse;
  sseRes.send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  return sseRes;
}

function getBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
  });
}

async function handleGenerate(req: IncomingMessage, res: ServerResponse) {
  const sse = setupSSE(res);
  
  try {
    const body = await getBody(req);
    const { prompt } = JSON.parse(body);
    
    if (!prompt) {
      sse.send({ type: "error", message: "No prompt provided" });
      res.end();
      return;
    }

    if (!API_KEY) {
      sse.send({ type: "error", message: "CURSOR_API_KEY not configured" });
      res.end();
      return;
    }

    // Stream command to client
    res.write(`data: $ cursor-agent -p --force --model composer-1 --output-format stream-json\n\n`);
    res.write(`data: Starting in ${WORKSPACE}...\n\n`);

    // Clean previous output
    if (existsSync(OUTPUT_FILE)) {
      unlinkSync(OUTPUT_FILE);
    }

    // Ensure generated directory exists
    mkdirSync(join(WORKSPACE, "generated"), { recursive: true });

    // Write prompt to file
    const promptFile = "/tmp/prompt.txt";
    writeFileSync(promptFile, prompt);
    
    const cursorAgentPath = "/root/.local/bin/cursor-agent";
    const shellCmd = `${cursorAgentPath} -p --force --model composer-1 --output-format stream-json "$(cat /tmp/prompt.txt)"`;
    
    const agent = spawn("/bin/bash", ["-c", shellCmd], {
      cwd: WORKSPACE,
      env: { 
        ...process.env, 
        CURSOR_API_KEY: API_KEY,
        PATH: `/root/.local/bin:${process.env.PATH || ""}`
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    console.log(`Agent spawned with PID: ${agent.pid}`);
    res.write(`data: [pid ${agent.pid}]\n\n`);
    
    agent.on('spawn', () => {
      res.write(`data: Connecting to Cursor API...\n\n`);
    });
    
    if (agent.stdin) {
      agent.stdin.end();
    }
    
    // Stream stderr
    agent.stderr?.on('data', (data: Buffer) => {
      const text = data.toString().trim();
      if (text) {
        res.write(`data: [stderr] ${text}\n\n`);
      }
    });

    let completed = false;

    // Stream stdout directly - raw 1:1
    agent.stdout.on("data", (data) => {
      const text = data.toString();
      const lines = text.split("\n");
      
      for (const line of lines) {
        if (line.trim()) {
          res.write(`data: ${line}\n\n`);
        }
      }
    });

    // Watch for output file
    const generatedDir = join(WORKSPACE, "generated");
    let watcher: ReturnType<typeof watch> | null = null;
    
    try {
      watcher = watch(generatedDir, (event, filename) => {
        if (filename === "live.html" && !completed) {
          setTimeout(() => {
            if (existsSync(OUTPUT_FILE) && !completed) {
              completed = true;
              const html = readFileSync(OUTPUT_FILE, "utf-8");
              sse.send({ type: "complete", html, message: "Generation complete!" });
              watcher?.close();
              agent.kill();
              res.end();
            }
          }, 200);
        }
      });
    } catch (watchError) {
      console.error("Watch error:", watchError);
    }

    // Handle agent completion
    agent.on("close", (code) => {
      if (!completed) {
        completed = true;
        watcher?.close();
        
        if (existsSync(OUTPUT_FILE)) {
          const html = readFileSync(OUTPUT_FILE, "utf-8");
          sse.send({ type: "complete", html, message: "Generation complete!" });
        } else {
          sse.send({ 
            type: "error", 
            message: `Agent exited with code ${code}, no HTML generated` 
          });
        }
        res.end();
      }
    });

    // Handle agent error
    agent.on("error", (err) => {
      if (!completed) {
        completed = true;
        watcher?.close();
        sse.send({ type: "error", message: `Agent error: ${err.message}` });
        res.end();
      }
    });

    // Timeout after 120 seconds
    setTimeout(() => {
      if (!completed) {
        completed = true;
        watcher?.close();
        agent.kill();
        
        if (existsSync(OUTPUT_FILE)) {
          const html = readFileSync(OUTPUT_FILE, "utf-8");
          sse.send({ type: "complete", html, message: "Generation complete!" });
        } else {
          sse.send({ type: "error", message: "Timeout after 120 seconds" });
        }
        res.end();
      }
    }, 120000);

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    sse.send({ type: "error", message });
    res.end();
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify({ 
      status: "ready", 
      hasApiKey: !!API_KEY,
      workspace: WORKSPACE
    }));
    return;
  }

  if (req.method === "POST") {
    await handleGenerate(req, res);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Agent runner listening on 0.0.0.0:${PORT}`);
  console.log(`Workspace: ${WORKSPACE}`);
  console.log(`API key configured: ${!!API_KEY}`);
});
