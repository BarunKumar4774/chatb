const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

// Enable CORS globally for Express
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // Replace with frontend URL if needed
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true
    }
});

io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Listen for messages
    socket.on("sendMessage", (data) => {
        console.log("Message received on server:", data);
        io.emit("receiveMessage", data);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
