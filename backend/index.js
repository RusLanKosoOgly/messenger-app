const express = require("express");
const http = require("http");
const cors = require("cors");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
  origin: ["http://localhost:5173", "http://192.168.88.147:5173"],
  methods: ["GET", "POST"]
}
});


app.use(cors());
app.use(express.json());

let users = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("register", (username) => {
    users[username] = socket.id;
    console.log(`✅ ${username} зарегистрирован как ${socket.id}`);
    console.log("👥 Все пользователи:", users);
    broadcastUserList();
  });

  socket.on("sendMessage", ({ to, message, from }) => {
    const targetSocket = users[to];
    if (targetSocket) {
      io.to(targetSocket).emit("receiveMessage", { message, from });
      console.log(`📤 ${from} отправил "${message}" → ${to}`);
    } else {
      console.log(`⚠️ Не удалось отправить — ${to} не в сети`);
    }
  });
  socket.on("call-user", ({ target, offer, from }) => {
  const targetSocket = users[target];
  if (targetSocket) {
    io.to(targetSocket).emit("incoming-call", { from, offer });
    console.log(`📨 Offer отправлен от ${from} к ${target}`);
  }
});

// 2. Передача answer
socket.on("answer-call", ({ target, answer }) => {
  const targetSocket = users[target];
  if (targetSocket) {
    io.to(targetSocket).emit("call-answered", { answer });
    console.log(`✅ Answer отправлен обратно`);
  }
});

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // Удалим пользователя из списка
    for (const name in users) {
      if (users[name] === socket.id) {
        delete users[name];
        console.log(`❌ ${name} удалён из users`);
        break;

      }
    }
        broadcastUserList();
  });
});
function broadcastUserList(){
 io.emit("userList",Object.keys(users));
}

server.listen(5000, "0.0.0.0", () => {
  console.log("✅ Server running on http://0.0.0.0:5000 (доступен по IP)");
});

