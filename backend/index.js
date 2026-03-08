import express from "express";
import { Server } from "socket.io";
import http from "http";

import { addUser, getUser, getUsersInRoom, removeUser } from "./users/users.js";

import router from "./routes/router.js";

const PORT = process.env.PORT || 5000;

const app = express();

app.use("/", router);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  // console.log("a user connected:");

  socket.on("join", ({ name, room }, callback) => {
    // console.log(name, room);
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);

    socket.emit("message", {
      user: "admin",
      text: `${user.name}, welcome to room ${user.room}.`,
    });
    socket.broadcast
      .to(user.room)
      .emit("message", { user: "admin", text: `${user.name} has joined!` });

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    if (callback) callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);

    if (user) {
      io.to(user.room).emit("message", {
        user: user.name,
        text: message,
      });
    }

    if (callback) callback();
  });

  socket.on("disconnect", () => {
    // console.log("user disconnected");

    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit("message", {
        user: "admin",
        text: `${user.name} has left.`,
      });

      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at PORT ${PORT}`);
});
