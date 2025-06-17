import socket from "./socket";
import "./App.css";
import { useEffect, useState, useRef } from "react";

function App() {
  const [username, setUsername] = useState("");
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("");
  const [chatMap, setChatMap] = useState({});
  const [userList, setUserList] = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const peerConnection = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    const handleReceive = ({ from, message }) => {
      setChatMap((prev) => ({
        ...prev,
        [from]: [...(prev[from] || []), `${from}: ${message}`],
      }));
    };

    const handleUserList = (list) => {
      setUserList(list.filter((name) => name !== username));
    };

    socket.on("incoming-call", async ({ from, offer }) => {
      console.log(`📲 Входящий звонок от ${from}`);
      setTarget(from);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteAudioRef.current && remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
      };

      peerConnection.current = pc;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer-call", { target: from, answer });
    });

    socket.on("call-answered", async ({ answer }) => {
      console.log("📞 Звонок принят");
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("receiveMessage", handleReceive);
    socket.on("userList", handleUserList);

    return () => {
      socket.off("receiveMessage", handleReceive);
      socket.off("userList", handleUserList);
      socket.off("incoming-call");
      socket.off("call-answered");
    };
  }, [username]);

  const handleCall = async () => {
    if (!target) return;

    console.log(`📞 Вызываем ${target}...`);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteAudioRef.current && remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
      };

      peerConnection.current = pc;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call-user", { target, offer, from: username });
    } catch (err) {
      console.error("❌ Ошибка при доступе к микрофону", err);
    }
  };

  const handleRegister = () => {
    if (username.trim()) {
      console.log("📨 Регистрируем пользователя:", username); // <-- проверь что выводит
      socket.emit("register", username);
      setIsRegistered(true);
    }
  };

  const handleSend = () => {
    socket.emit("sendMessage", { to: target, message, from: username });
    setChatMap((prev) => ({
      ...prev,
      [target]: [...(prev[target] || []), `Вы: ${message}`],
    }));
    setMessage("");
  };

  if (!isRegistered) {
    return (
      <div className="container">
        <h2>💬 Войти в чат</h2>
        <div className="form-group">
          <input placeholder="ваше имя" value={username} onChange={(e) => setUsername(e.target.value)} />
          <button onClick={handleRegister}>Войти</button>
        </div>
      </div>
    );
  }

  return (
    <div className="messenger">
      <div className="sidebar">
        <h3>Пользователи</h3>
        {userList.map((user) => (
          <div key={user} className={`user-item ${target === user ? "active" : ""}`} onClick={() => setTarget(user)}>
            {user}
          </div>
        ))}
      </div>

      <div className="chat">
        <h3>Чат с: {target || "..."}</h3>
        {target && (
          <button onClick={handleCall} style={{ marginBottom: "12px" }}>
            📞 Позвонить
          </button>
        )}
        <div className="form-group">
          <input placeholder="Сообщение" value={message} onChange={(e) => setMessage(e.target.value)} />
          <button onClick={handleSend}>Отправить</button>
        </div>

        <div className="chat-box">
          {(chatMap[target] || []).map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>

        <audio ref={remoteAudioRef} autoPlay />
      </div>
    </div>
  );
}

export default App;
