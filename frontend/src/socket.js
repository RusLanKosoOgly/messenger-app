import { io } from "socket.io-client";

// ❌ Было:
const socket = io("http://localhost:5000");

// ✅ Стало:
//const socket = io("http://192.168.88.147:5000");

export default socket;
