const express = require("express");
const http = require("http");
const cors = require("cors");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
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

  // Отправка звонка
  socket.on("call-user", ({ target, offer, from }) => {
    const targetSocket = users[target];
    if (targetSocket) {
      io.to(targetSocket).emit("incoming-call", { from, offer });
      console.log(`📨 Offer отправлен от ${from} к ${target}`);
    }
  });

  // Ответ на звонок
  socket.on("answer-call", ({ target, answer }) => {
    const targetSocket = users[target];
    if (targetSocket) {
      io.to(targetSocket).emit("call-answered", { answer });
      console.log(`✅ Answer отправлен обратно`);
    }
  });

  // ICE-кандидаты
  socket.on("ice-candidate", ({ target, candidate }) => {
    const targetSocket = users[target];
    if (targetSocket) {
      io.to(targetSocket).emit("ice-candidate", { candidate });
      console.log(`📨 ICE-кандидат отправлен от ${socket.id} к ${target}`);
    }
  });

  // Завершение звонка
  socket.on("end-call", ({ target }) => {
    const targetSocket = users[target];
    if (targetSocket) {
      io.to(targetSocket).emit("call-ended");
      console.log(`🔴 Звонок завершён пользователем ${socket.id}`);
    }
  });

  // Отключение пользователя
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
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

// Рассылка списка всех онлайн-пользователей
function broadcastUserList() {
  io.emit("userList", Object.keys(users));
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
