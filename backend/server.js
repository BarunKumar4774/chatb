require("dotenv").config(); // Load .env file

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid"); // Generate unique IDs

const app = express();

// Serve static files
app.use(express.static("public"));

// Enable CORS with specific frontend URL (change to your frontend domain)
app.use(cors({
    origin: "*",  // Change "*" to "https://your-frontend-url.com" for security
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // Change "*" to your frontend domain if needed
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true
    },
    transports: ["websocket", "polling"] // Ensure WebSocket connection stability
});

let messages = []; // Store messages in memory (use DB for persistence)
let typingUsers = new Map(); // Track users who are typing (Map for better management)

io.on("connection", (socket) => {
    console.log(`🟢 New client connected: ${socket.id}`);

    // Send previous messages to the new client
    socket.emit("loadMessages", messages);

    // Handle new messages
    socket.on("sendMessage", (data) => {
        if (!data.message.trim()) return; // Ignore empty messages

        const messageData = { id: uuidv4(), sender: data.sender, message: data.message };
        messages.push(messageData);
        io.emit("receiveMessage", messageData);

        // Ensure user is removed from typing list after sending
        typingUsers.delete(socket.id);
        io.emit("userTyping", Array.from(typingUsers.values())); // Send updated typing list
    });

    // Handle message editing
    socket.on("editMessage", ({ id, newMessage }) => {
        messages = messages.map(msg => 
            msg.id === id ? { ...msg, message: newMessage } : msg
        );
        io.emit("messageEdited", { id, newMessage });
    });

    // Handle message deletion
    socket.on("deleteMessage", (id) => {
        messages = messages.filter(msg => msg.id !== id);
        io.emit("messageDeleted", id);
    });

    // Handle typing events
    socket.on("typing", (username) => {
        if (!typingUsers.has(socket.id)) {
            typingUsers.set(socket.id, username);
            io.emit("userTyping", Array.from(typingUsers.values())); // Send updated typing list
        }
    });

    // Handle stop typing event
    socket.on("stopTyping", () => {
        typingUsers.delete(socket.id);
        io.emit("userTyping", Array.from(typingUsers.values())); // Send updated typing list
    });

    socket.on("disconnect", () => {
        console.log(`🔴 Client disconnected: ${socket.id}`);

        // Remove user from typing list on disconnect
        typingUsers.delete(socket.id);
        io.emit("userTyping", Array.from(typingUsers.values())); // Update clients
    });
});

// Set port from .env or use 5000
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
