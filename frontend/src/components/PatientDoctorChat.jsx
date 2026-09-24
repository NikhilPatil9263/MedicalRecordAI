import { useCallback, useEffect, useRef, useState } from "react";
import {
  createLiveChatSession,
  getLiveChatMessages,
} from "../services/api";

const WS_BASE_URL = "ws://127.0.0.1:8000";

function formatTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function initials(name = "User") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";
}

export default function PatientDoctorChat({
  appointmentId,
  currentRole,
  peerName,
  appointmentLabel,
}) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  const isDoctor = currentRole === "doctor";

  const appendMessage = useCallback((message) => {
    setMessages((current) => {
      if (current.some((item) => item.id === message.id)) {
        return current;
      }
      return [...current, message];
    });
  }, []);

  const connect = useCallback(async () => {
    if (!appointmentId) return;

    setConnecting(true);
    setError("");

    try {
      const [history, session] = await Promise.all([
        getLiveChatMessages(appointmentId),
        createLiveChatSession(appointmentId),
      ]);

      setMessages(Array.isArray(history) ? history : []);

      const socket = new WebSocket(
        `${WS_BASE_URL}/ws/chat/${appointmentId}?ticket=${encodeURIComponent(session.ticket)}`
      );

      socketRef.current = socket;

      socket.onopen = () => {
        setConnected(true);
        setConnecting(false);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "message" && payload.message) {
            appendMessage(payload.message);
          }
          if (payload.type === "error") {
            setError(payload.message || "Chat error.");
          }
        } catch {
          setError("Received an invalid chat message.");
        }
      };

      socket.onerror = () => {
        setError("Live chat connection failed.");
      };

      socket.onclose = () => {
        setConnected(false);
        setConnecting(false);
      };
    } catch (err) {
      setConnecting(false);
      setConnected(false);
      setError(err?.message || "Unable to connect to live chat.");
    }
  }, [appointmentId, appendMessage]);

  useEffect(() => {
    setMessages([]);
    setDraft("");
    setConnected(false);
    setError("");

    if (!appointmentId) return undefined;

    connect();

    return () => {
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [appointmentId, connect]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(event) {
    event.preventDefault();

    const content = draft.trim();
    const socket = socketRef.current;

    if (!content || !socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify({
      type: "message",
      content,
    }));
    setDraft("");
  }

  if (!appointmentId) {
    return (
      <section className="live-chat-empty">
        <div className="live-chat-empty-icon">◌</div>
        <h3>Select an appointment</h3>
        <p>
          Choose an appointment to open the secure doctor-patient conversation.
        </p>
      </section>
    );
  }

  return (
    <section className="live-chat-shell">
      <header className="live-chat-header">
        <div className="live-chat-peer">
          <div className="live-chat-avatar">{initials(peerName)}</div>
          <div>
            <strong>{peerName || (isDoctor ? "Patient" : "Doctor")}</strong>
            <span>{appointmentLabel || `Appointment #${appointmentId}`}</span>
          </div>
        </div>

        <div className={`live-chat-status ${connected ? "online" : "offline"}`}>
          <span />
          {connecting ? "Connecting" : connected ? "Live" : "Offline"}
        </div>
      </header>

      <div className="live-chat-notice">
        <span>🔒</span>
        Secure appointment-scoped conversation. Messages are visible only to the assigned doctor and patient.
      </div>

      <div className="live-chat-messages">
        {loading ? (
          <div className="live-chat-placeholder">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="live-chat-placeholder">
            <div className="live-chat-placeholder-icon">✦</div>
            <strong>Start the conversation</strong>
            <span>Send a message to your {isDoctor ? "patient" : "doctor"}.</span>
          </div>
        ) : (
          messages.map((message) => {
            const mine = message.sender_role === currentRole;
            return (
              <div
                key={message.id}
                className={`live-chat-message-row ${mine ? "mine" : "theirs"}`}
              >
                <div className={`live-chat-bubble ${mine ? "mine" : "theirs"}`}>
                  <div className="live-chat-bubble-author">
                    {mine ? "You" : isDoctor ? "Patient" : "Doctor"}
                  </div>
                  <div className="live-chat-bubble-text">{message.content}</div>
                  <div className="live-chat-bubble-time">
                    {formatTime(message.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <div className="live-chat-error">{error}</div>}

      <form className="live-chat-composer" onSubmit={sendMessage}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Message ${isDoctor ? "patient" : "doctor"}...`}
          rows={1}
          maxLength={2000}
          disabled={!connected}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendMessage(event);
            }
          }}
        />
        <button type="submit" disabled={!connected || !draft.trim()}>
          <span>Send</span>
          <b>↑</b>
        </button>
      </form>
    </section>
  );
}
