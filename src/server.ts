import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import registerGameSocket from "./sockets/gameSocket";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.use(cors());

app.get("/", (_, res) => {
  res.send("Server running");
});

registerGameSocket(io);

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log("Server running");
});