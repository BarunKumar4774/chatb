require("dotenv").config(); // Load .env file

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid"); // Generate unique IDs

const app = express();

// Serve static files
app.use(express.static("public"));

// Enable CORS
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true
    }
});

let messages = []; // Store messages in memory (replace with DB for persistence)
let typingUsers = new Set(); // Track users who are typing

io.on("connection", (socket) => {
    console.log(`🟢 New client connected: ${socket.id}`);

    // Send previous messages to the new client
    socket.emit("loadMessages", messages);

    // Handle typing events
    socket.on("typing", (username) => {
        if (!typingUsers.has(username)) {
            typingUsers.add(username);
            io.emit("userTyping", Array.from(typingUsers)); // Broadcast updated list
        }
    });

    // Handle stop typing event
    socket.on("stopTyping", (username) => {
        typingUsers.delete(username);
        io.emit("userTyping", Array.from(typingUsers)); // Update all clients
    });

    // Handle new messages
    socket.on("sendMessage", (data) => {
        if (!data.message.trim()) return; // Ignore empty messages

        const messageData = { id: uuidv4(), ...data };
        messages.push(messageData);
        io.emit("receiveMessage", messageData);

        // Ensure user is removed from typing list after sending
        typingUsers.delete(data.sender);
        io.emit("userTyping", Array.from(typingUsers));
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

    socket.on("disconnect", () => {
        console.log(`🔴 Client disconnected: ${socket.id}`);

        // Remove user from typing list on disconnect
        typingUsers.forEach((user) => {
            if (user.socketId === socket.id) {
                typingUsers.delete(user);
            }
        });
        io.emit("userTyping", Array.from(typingUsers)); // Update clients
    });
});

// Set port from .env or use 5000
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
