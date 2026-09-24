import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar.jsx";

import {
  getDoctorAppointments,
  askDoctorQuery,
  getDoctorPatients,
  createDoctorConversation,
  getDoctorConversation,
  askDoctorConversation,
  deleteDoctorConversation,
  getDoctorPatientSummary,
  createLiveChatSession,
  getLiveChatMessages,
  getDoctorProfile,
  updateDoctorProfile,
  getToken,
} from "../services/api";

import { decodeJwt } from "../utils/auth";

const EXAMPLE_QUERY =
  "Show me the patient's previous blood test results.";

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function formatRelativeTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  const now = new Date();

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const diff = Math.max(0, now.getTime() - date.getTime());
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function getInitials(name) {
  const value = String(name || "Patient").trim();

  if (!value) return "P";

  return value
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function badge(status) {
  const s = String(status || "").toLowerCase();

  const cls =
    s === "completed" || s === "scheduled"
      ? "status-pill success"
      : s === "cancelled"
      ? "status-pill danger"
      : "status-pill neutral";

  return (
    <span className={cls}>
      {status || "Unknown"}
    </span>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="redesign-empty">
      <div className="redesign-empty-icon">□</div>

      <strong>{title}</strong>

      <span>{text}</span>
    </div>
  );
}

export default function DoctorDashboard() {
  const [active, setActive] = useState("dashboard");
  const [historyFocus, setHistoryFocus] = useState("patients");

  // ---------------------------------------------------------
  // APPOINTMENTS
  // ---------------------------------------------------------

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selected, setSelected] = useState(null);

  const [query, setQuery] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");
  const [result, setResult] = useState(null);

  // ---------------------------------------------------------
  // MEDICAL INTELLIGENCE
  // ---------------------------------------------------------

  const [doctorPatients, setDoctorPatients] = useState([]);

  const [selectedPatient, setSelectedPatient] = useState(null);

  const [selectedConversation, setSelectedConversation] =
    useState(null);

  const [conversationLoading, setConversationLoading] =
    useState(false);

  const [conversationQuery, setConversationQuery] =
    useState("");

  const [conversationAsking, setConversationAsking] =
    useState(false);

  const [conversationCreating, setConversationCreating] =
    useState(false);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [historyError, setHistoryError] = useState("");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [deletingConversation, setDeletingConversation] =
    useState(false);

  const doctorPayload = decodeJwt(getToken() || "");

  // ---------------------------------------------------------
  // PATIENT SUMMARY / REPORTS
  // ---------------------------------------------------------

  const [patientSummary, setPatientSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);

  // ---------------------------------------------------------
  // DOCTOR PROFILE
  // ---------------------------------------------------------

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profile, setProfile] = useState({
    id: "",
    name: "",
    email: "",
    specialization: "",
  });

  // ---------------------------------------------------------
  // DOCTOR <-> PATIENT LIVE CHAT
  // ---------------------------------------------------------

  const [liveChatOpen, setLiveChatOpen] = useState(false);
  const [liveChatAppointment, setLiveChatAppointment] = useState(null);
  const [liveChatSession, setLiveChatSession] = useState(null);
  const [liveChatMessages, setLiveChatMessages] = useState([]);
  const [liveChatInput, setLiveChatInput] = useState("");
  const [liveChatLoading, setLiveChatLoading] = useState(false);
  const [liveChatSending, setLiveChatSending] = useState(false);
  const [liveChatError, setLiveChatError] = useState("");
  const [liveChatConnected, setLiveChatConnected] = useState(false);
  const [liveChatTyping, setLiveChatTyping] = useState(false);
  const liveChatSocketRef = useRef(null);
  const liveChatMessagesEndRef = useRef(null);

  function normalizeLiveChatMessage(message, index = 0) {
    const role = String(
      message?.role || message?.sender_role || message?.sender || "patient"
    ).toLowerCase();
    const isDoctor =
      role === "doctor" ||
      role === "user" ||
      role === "staff";

    return {
      id: message?.id ?? message?.message_id ?? `live-${index}-${Date.now()}`,
      content: message?.content ?? message?.message ?? message?.text ?? "",
      role: isDoctor ? "doctor" : "patient",
      created_at: message?.created_at ?? message?.timestamp ?? new Date().toISOString(),
      sender_name: message?.sender_name ?? (isDoctor ? "You" : liveChatAppointment?.patient_name || "Patient"),
    };
  }

  function mergeLiveChatMessages(incoming) {
    const list = Array.isArray(incoming)
      ? incoming
      : Array.isArray(incoming?.messages)
      ? incoming.messages
      : incoming
      ? [incoming]
      : [];

    if (!list.length) return;

    setLiveChatMessages((previous) => {
      const map = new Map(previous.map((item) => [String(item.id), item]));
      list.forEach((item, index) => {
        const normalized = normalizeLiveChatMessage(item, index);
        if (normalized.content) {
          map.set(String(normalized.id), normalized);
        }
      });
      return Array.from(map.values()).sort(
        (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
      );
    });
  }

  async function loadLiveChatMessages(appointmentId) {
    if (!appointmentId) return;

    try {
      const data = await getLiveChatMessages(appointmentId);
      mergeLiveChatMessages(data);
    } catch (error) {
      setLiveChatError(
        error?.message || "Unable to load live chat messages."
      );
    }
  }

  async function handleOpenLiveChat(appointment) {
    if (!appointment) return;

    setLiveChatAppointment(appointment);
    setLiveChatOpen(true);
    setLiveChatLoading(true);
    setLiveChatError("");
    setLiveChatConnected(false);
    setLiveChatMessages([]);

    try {
      const session = await createLiveChatSession(appointment.id);
      setLiveChatSession(session || {});
      await loadLiveChatMessages(appointment.id);
    } catch (error) {
      setLiveChatError(
        error?.message || "Unable to start the patient chat."
      );
    } finally {
      setLiveChatLoading(false);
    }
  }

  function closeLiveChat() {
    if (liveChatSocketRef.current) {
      liveChatSocketRef.current.close();
      liveChatSocketRef.current = null;
    }
    setLiveChatConnected(false);
    setLiveChatOpen(false);
    setLiveChatAppointment(null);
    setLiveChatSession(null);
    setLiveChatInput("");
    setLiveChatTyping(false);
  }

  useEffect(() => {
    if (!liveChatOpen || !liveChatAppointment) return undefined;

    let socket;
    let cancelled = false;
    const token = getToken();
    const appointmentId = liveChatAppointment.id;

    const sessionUrl =
      liveChatSession?.websocket_url ||
      liveChatSession?.ws_url ||
      liveChatSession?.websocketUrl ||
      liveChatSession?.socket_url;

    const fallbackUrl = `ws://127.0.0.1:8000/chat/ws/${appointmentId}`;
    let socketUrl = sessionUrl || fallbackUrl;

    if (token && !socketUrl.includes("token=")) {
      socketUrl += `${socketUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
    }

    try {
      socket = new WebSocket(socketUrl);
      liveChatSocketRef.current = socket;

      socket.onopen = () => {
        if (!cancelled) {
          setLiveChatConnected(true);
          setLiveChatError("");
        }
      };

      socket.onmessage = (event) => {
        if (cancelled) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === "typing") {
            setLiveChatTyping(Boolean(payload.value ?? payload.typing));
            return;
          }
          mergeLiveChatMessages(payload);
        } catch {
          mergeLiveChatMessages({ content: event.data, role: "patient" });
        }
      };

      socket.onerror = () => {
        if (!cancelled) {
          setLiveChatConnected(false);
          setLiveChatError(
            "Live connection is unavailable. The message history can still be refreshed."
          );
        }
      };

      socket.onclose = () => {
        if (!cancelled) setLiveChatConnected(false);
      };
    } catch (error) {
      setLiveChatError(error?.message || "Unable to connect to live chat.");
    }

    const poller = window.setInterval(() => {
      loadLiveChatMessages(appointmentId);
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(poller);
      if (socket) socket.close();
      if (liveChatSocketRef.current === socket) {
        liveChatSocketRef.current = null;
      }
      setLiveChatConnected(false);
    };
  }, [liveChatOpen, liveChatAppointment, liveChatSession]);

  useEffect(() => {
    if (!liveChatOpen) return;
    liveChatMessagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [liveChatMessages, liveChatOpen]);

  async function handleLiveChatSubmit(event) {
    event.preventDefault();

    const message = liveChatInput.trim();
    const socket = liveChatSocketRef.current;

    if (!message || !liveChatAppointment || liveChatSending) return;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setLiveChatError(
        "The live chat connection is not ready. Please wait a moment and try again."
      );
      return;
    }

    setLiveChatSending(true);
    setLiveChatError("");

    try {
      socket.send(
        JSON.stringify({
          message,
          appointment_id: liveChatAppointment.id,
        })
      );

      setLiveChatInput("");
    } catch (error) {
      setLiveChatError(error?.message || "Failed to send message.");
    } finally {
      setLiveChatSending(false);
    }
  }


  // ---------------------------------------------------------
  // LOAD APPOINTMENTS
  // ---------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadAppointments() {
      setLoading(true);
      setLoadError("");

      try {
        const data = await getDoctorAppointments();

        if (!cancelled) {
          setAppointments(
            Array.isArray(data) ? data : []
          );
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error?.message ||
              "Failed to load appointments."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAppointments();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------
  // LOAD MEDICAL INTELLIGENCE HISTORY
  // ---------------------------------------------------------

  async function loadPatientsHistory(
    preservePatientId = null
  ) {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const data = await getDoctorPatients();

      const patients = Array.isArray(data)
        ? data
        : [];

      setDoctorPatients(patients);

      if (patients.length === 0) {
        setSelectedPatient(null);
        setSelectedConversation(null);
        return;
      }

      const patientToSelect =
        patients.find(
          (patient) =>
            patient.patient_id === preservePatientId
        ) || patients[0];

      setSelectedPatient(patientToSelect);
    } catch (error) {
      setHistoryError(
        error?.message ||
          "Failed to load patient history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadPatientsHistory();
  }, []);

  useEffect(() => {
    if (active === "intelligence") {
      loadPatientsHistory(
        selectedPatient?.patient_id || null
      );
    }
  }, [active]);

  // ---------------------------------------------------------
  // PATIENT SELECTION
  // ---------------------------------------------------------

  function handleSelectPatient(patient) {
    setSelectedPatient(patient);
    setSelectedConversation(null);
    setConversationQuery("");
  }

  // ---------------------------------------------------------
  // SELECT CONVERSATION
  // ---------------------------------------------------------

  async function handleSelectConversation(
    conversationId
  ) {
    setConversationLoading(true);

    try {
      const data =
        await getDoctorConversation(
          conversationId
        );

      setSelectedConversation(data);
      setConversationQuery("");
    } catch (error) {
      console.error(
        "Failed to load conversation:",
        error
      );
    } finally {
      setConversationLoading(false);
    }
  }

  // ---------------------------------------------------------
  // FIND APPOINTMENT FOR PATIENT
  // ---------------------------------------------------------

  function findAppointmentForPatient(patientId) {
    const patientAppointments =
      appointments
        .filter(
          (appointment) =>
            appointment.patient_id === patientId
        )
        .sort(
          (a, b) =>
            new Date(
              b.appointment_date || 0
            ) -
            new Date(
              a.appointment_date || 0
            )
        );

    return patientAppointments[0] || null;
  }

  // ---------------------------------------------------------
  // CREATE NEW CONVERSATION
  // ---------------------------------------------------------

  async function handleCreateConversation() {
    if (!selectedPatient) {
      return;
    }

    const appointment =
      findAppointmentForPatient(
        selectedPatient.patient_id
      );

    if (!appointment) {
      alert(
        "No appointment found for this patient."
      );
      return;
    }

    setConversationCreating(true);

    try {
      const created =
        await createDoctorConversation(
          appointment.id,
          "New Conversation"
        );

      const conversation =
        await getDoctorConversation(
          created.id
        );

      setSelectedConversation(
        conversation
      );

      setConversationQuery("");

      await loadPatientsHistory(
        selectedPatient.patient_id
      );
    } catch (error) {
      console.error(
        "Failed to create conversation:",
        error
      );

      alert(
        error?.message ||
          "Failed to create conversation."
      );
    } finally {
      setConversationCreating(false);
    }
  }

  // ---------------------------------------------------------
  // SEND MESSAGE
  // ---------------------------------------------------------

  async function handleConversationQuery(
    event
  ) {
    event.preventDefault();

    if (
      !selectedConversation ||
      !conversationQuery.trim()
    ) {
      return;
    }

    setConversationAsking(true);

    try {
      await askDoctorConversation(
        selectedConversation.id,
        conversationQuery.trim()
      );

      setConversationQuery("");

      const updated =
        await getDoctorConversation(
          selectedConversation.id
        );

      setSelectedConversation(updated);

      await loadPatientsHistory(
        selectedPatient?.patient_id || null
      );
    } catch (error) {
      console.error(
        "Failed to send conversation query:",
        error
      );

      alert(
        error?.message ||
          "Failed to retrieve historical records."
      );
    } finally {
      setConversationAsking(false);
    }
  }

  // ---------------------------------------------------------
  // DELETE CONVERSATION
  // ---------------------------------------------------------

  async function handleDeleteConversation() {
    if (!deleteTarget) {
      return;
    }

    setDeletingConversation(true);

    try {
      await deleteDoctorConversation(
        deleteTarget.id
      );

      const deletedId = deleteTarget.id;

      setDeleteTarget(null);

      if (
        selectedConversation?.id ===
        deletedId
      ) {
        setSelectedConversation(null);
        setConversationQuery("");
      }

      await loadPatientsHistory(
        selectedPatient?.patient_id || null
      );
    } catch (error) {
      console.error(
        "Failed to delete conversation:",
        error
      );

      alert(
        error?.message ||
          "Failed to delete conversation."
      );
    } finally {
      setDeletingConversation(false);
    }
  }

  // ---------------------------------------------------------
  // PATIENT SUMMARY
  // ---------------------------------------------------------

  async function handleOpenPatientSummary(appointment = selected) {
    if (!appointment) {
      return;
    }

    setSummaryOpen(true);
    setSummaryLoading(true);
    setSummaryError("");

    try {
      const data = await getDoctorPatientSummary(
        appointment.id
      );

      setPatientSummary(data);
    } catch (error) {
      setPatientSummary(null);
      setSummaryError(
        error?.message ||
          "Failed to load patient summary."
      );
    } finally {
      setSummaryLoading(false);
    }
  }

  function closePatientSummary() {
    if (summaryLoading) {
      return;
    }

    setSummaryOpen(false);
  }

  // ---------------------------------------------------------
  // DOCTOR PROFILE
  // ---------------------------------------------------------

  async function handleOpenProfile() {
    setProfileOpen(true);
    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const data = await getDoctorProfile();

      setProfile({
        id: data?.id ?? "",
        name: data?.name ?? "",
        email: data?.email ?? "",
        specialization: data?.specialization ?? "",
      });
    } catch (error) {
      setProfileError(
        error?.message ||
          "Failed to load doctor profile."
      );
    } finally {
      setProfileLoading(false);
    }
  }

  function handleProfileChange(event) {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();

    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const updated = await updateDoctorProfile({
        name: profile.name.trim(),
        email: profile.email.trim(),
        specialization:
          profile.specialization.trim(),
      });

      setProfile({
        id: updated?.id ?? profile.id,
        name: updated?.name ?? profile.name,
        email: updated?.email ?? profile.email,
        specialization:
          updated?.specialization ??
          profile.specialization,
      });

      setProfileSuccess(
        "Profile updated successfully."
      );
    } catch (error) {
      setProfileError(
        error?.message ||
          "Failed to update doctor profile."
      );
    } finally {
      setProfileSaving(false);
    }
  }

  // ---------------------------------------------------------
  // OLD APPOINTMENT QUERY
  // ---------------------------------------------------------

  const upcoming = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          appointment.appointment_date &&
          new Date(
            appointment.appointment_date
          ) >= new Date()
      ),
    [appointments]
  );

  const history = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          !appointment.appointment_date ||
          new Date(
            appointment.appointment_date
          ) < new Date()
      ),
    [appointments]
  );

  function selectAppointment(appointment) {
    setSelected(appointment);
    setQuery("");
    setResult(null);
    setAskError("");
    setActive("appointments");
  }

  async function handleAsk(event) {
    event.preventDefault();

    if (!selected || !query.trim()) {
      return;
    }

    setAsking(true);
    setAskError("");
    setResult(null);

    try {
      const response =
        await askDoctorQuery(
          selected.id,
          query.trim()
        );

      setResult(response);
    } catch (error) {
      setAskError(
        error?.message ||
          "Failed to retrieve historical records."
      );
    } finally {
      setAsking(false);
    }
  }

  // ---------------------------------------------------------
  // SIDEBAR
  // ---------------------------------------------------------

  const links = [
    {
      label: "Dashboard",
      icon: "⌂",
      active: active === "dashboard",
      onClick: () => setActive("dashboard"),
    },
    {
      label: "Appointments",
      icon: "□",
      active: active === "appointments",
      onClick: () => setActive("appointments"),
    },
    {
      label: "Medical Intelligence",
      icon: "✦",
      active: active === "intelligence",
      onClick: () => setActive("intelligence"),
    },
  ];

  const historyLinks = [
    {
      label: "Patient History",
      icon: "◷",
      active:
        active === "intelligence" &&
        historyFocus === "patients",
      onClick: () => {
        setHistoryFocus("patients");
        setActive("intelligence");
      },
    },
    {
      label: "Conversations",
      icon: "○",
      active:
        active === "intelligence" &&
        historyFocus === "conversations",
      onClick: () => {
        setHistoryFocus("conversations");
        setActive("intelligence");
      },
    },
  ];

  // ---------------------------------------------------------
  // CURRENT PATIENT CONVERSATIONS
  // ---------------------------------------------------------

  const patientConversations =
    selectedPatient?.conversations || [];

  const dashboardPatients = doctorPatients.length;

  function goToIntelligence(focus = "patients") {
    setHistoryFocus(focus);
    setActive("intelligence");
  }

  function goToAppointments() {
    setActive("appointments");
  }

  return (
    <div className="app-shell doctor-app-shell">
      <Sidebar
        links={links}
        roleLabel="Doctor"
        historyLinks={historyLinks}
      />

      <main className="main-content doctor-main-content">
        <header className="doctor-topbar">
          <div className="doctor-topbar-left">
            <div className="doctor-breadcrumb">CLINICAL WORKSPACE</div>
            <h1>
              {active === "dashboard"
                ? "Good morning, Doctor"
                : active === "appointments"
                ? "Appointments"
                : "Medical Intelligence"}
            </h1>
            <p>
              {active === "dashboard"
                ? "A focused workspace for appointments, patient history, and clinical record retrieval."
                : active === "appointments"
                ? "Review assigned visits and retrieve verified historical records."
                : historyFocus === "conversations"
                ? "Review your previous patient record conversations."
                : "Explore assigned patients and their historical medical records."}
            </p>
          </div>

          <div className="doctor-topbar-right">
            <button
              type="button"
              className="doctor-topbar-action"
              onClick={() => goToAppointments()}
              title="Open appointments"
            >
              <span>□</span>
              <span>Appointments</span>
            </button>
            <button
              type="button"
              className="doctor-profile-chip"
              onClick={handleOpenProfile}
              title="Edit doctor profile"
            >
              <span className="doctor-profile-avatar">DR</span>
              <span className="doctor-profile-copy">
                <strong>Doctor</strong>
                <small>ID {doctorPayload?.doctor_id || 2}</small>
              </span>
            </button>
          </div>
        </header>

        {active === "dashboard" && (
          <section className="doctor-page doctor-dashboard-page">
            <div className="doctor-welcome-row">
              <div>
                <span className="doctor-eyebrow">OVERVIEW</span>
                <h2>Doctor Dashboard</h2>
                <p>Everything you need for today's clinical workflow.</p>
              </div>
              <button
                type="button"
                className="doctor-primary-button"
                onClick={() => goToAppointments()}
              >
                <span>View appointments</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>

            <div className="doctor-stat-grid">
              <button type="button" className="doctor-stat-card" onClick={goToAppointments}>
                <span className="doctor-stat-icon">□</span>
                <span className="doctor-stat-copy">
                  <small>Total appointments</small>
                  <strong>{appointments.length}</strong>
                  <span>Assigned to you</span>
                </span>
                <span className="doctor-stat-arrow">→</span>
              </button>

              <button type="button" className="doctor-stat-card" onClick={goToAppointments}>
                <span className="doctor-stat-icon doctor-stat-icon-blue">◷</span>
                <span className="doctor-stat-copy">
                  <small>Upcoming visits</small>
                  <strong>{upcoming.length}</strong>
                  <span>Scheduled appointments</span>
                </span>
                <span className="doctor-stat-arrow">→</span>
              </button>

              <button type="button" className="doctor-stat-card" onClick={() => goToIntelligence("patients")}>
                <span className="doctor-stat-icon doctor-stat-icon-purple">♙</span>
                <span className="doctor-stat-copy">
                  <small>Assigned patients</small>
                  <strong>{dashboardPatients}</strong>
                  <span>Patient history available</span>
                </span>
                <span className="doctor-stat-arrow">→</span>
              </button>
            </div>

            <div className="doctor-dashboard-grid">
              <section className="doctor-card doctor-appointments-card">
                <div className="doctor-card-header">
                  <div>
                    <span className="doctor-card-kicker">SCHEDULE</span>
                    <h3>Upcoming appointments</h3>
                    <p>Your next assigned patient visits.</p>
                  </div>
                  <button type="button" className="doctor-text-button" onClick={goToAppointments}>
                    View all <span>→</span>
                  </button>
                </div>

                {loading ? (
                  <div className="doctor-loading">Loading appointments...</div>
                ) : loadError ? (
                  <div className="doctor-inline-error">{loadError}</div>
                ) : upcoming.length === 0 ? (
                  <div className="doctor-empty-card">
                    <div className="doctor-empty-icon">□</div>
                    <strong>No upcoming appointments</strong>
                    <span>There are currently no upcoming visits assigned to you.</span>
                    <button type="button" onClick={goToAppointments}>Open appointments</button>
                  </div>
                ) : (
                  <div className="doctor-appointment-list">
                    {upcoming.slice(0, 5).map((appointment) => (
                      <div key={appointment.id} className="doctor-appointment-row doctor-appointment-row-rich">
                        <button type="button" className="doctor-appointment-main-button" onClick={() => selectAppointment(appointment)}>
                          <span className="doctor-patient-avatar">
                            {getInitials(appointment.patient_name || `Patient ${appointment.patient_id}`)}
                          </span>
                          <span className="doctor-appointment-main">
                            <strong>{appointment.patient_name || `Patient ${appointment.patient_id}`}</strong>
                            <small>{formatDate(appointment.appointment_date)}</small>
                          </span>
                        </button>
                        <span className="doctor-appointment-status">{appointment.status || "Scheduled"}</span>
                        <div className="doctor-appointment-actions">
                          <button type="button" className="doctor-row-action" onClick={() => handleOpenPatientSummary(appointment)} title="Patient summary">Summary</button>
                          <button type="button" className="doctor-row-action doctor-row-action-primary" onClick={() => handleOpenLiveChat(appointment)} title="Chat with patient">Chat</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="doctor-card doctor-quick-card">
                <div className="doctor-card-header">
                  <div>
                    <span className="doctor-card-kicker">QUICK ACTIONS</span>
                    <h3>Clinical workspace</h3>
                    <p>Jump directly into the task you need.</p>
                  </div>
                </div>

                <button type="button" className="doctor-quick-action" onClick={goToAppointments}>
                  <span className="doctor-quick-icon">□</span>
                  <span><strong>Review appointments</strong><small>Open assigned visits and patient queries</small></span>
                  <span>→</span>
                </button>
                <button type="button" className="doctor-quick-action" onClick={() => goToIntelligence("patients")}>
                  <span className="doctor-quick-icon doctor-quick-icon-teal">◷</span>
                  <span><strong>Patient history</strong><small>Review verified historical records</small></span>
                  <span>→</span>
                </button>
                <button type="button" className="doctor-quick-action" onClick={() => goToIntelligence("conversations")}>
                  <span className="doctor-quick-icon doctor-quick-icon-purple">○</span>
                  <span><strong>Conversations</strong><small>Continue a saved medical-record conversation</small></span>
                  <span>→</span>
                </button>
                {upcoming[0] && (
                  <button type="button" className="doctor-quick-action doctor-quick-action-live" onClick={() => handleOpenLiveChat(upcoming[0])}>
                    <span className="doctor-quick-icon doctor-quick-icon-live">◉</span>
                    <span><strong>Live patient chat</strong><small>Message your next patient securely</small></span>
                    <span>→</span>
                  </button>
                )}
              </section>
            </div>
          </section>
        )}

        {active === "appointments" && (
          <section className="doctor-page">
            <div className="doctor-section-heading">
              <div>
                <span className="doctor-eyebrow">CLINICAL SCHEDULE</span>
                <h2>Appointments</h2>
                <p>Select an appointment to retrieve source-backed historical records.</p>
              </div>
              <span className="doctor-count-badge">{appointments.length} total</span>
            </div>

            {loadError && <div className="doctor-inline-error doctor-page-error">{loadError}</div>}

            <div className="doctor-appointment-columns">
              <section className="doctor-card">
                <div className="doctor-card-header compact">
                  <div><h3>Upcoming</h3><p>{upcoming.length} scheduled visit{upcoming.length === 1 ? "" : "s"}</p></div>
                </div>
                {loading ? (
                  <div className="doctor-loading">Loading appointments...</div>
                ) : upcoming.length === 0 ? (
                  <div className="doctor-empty-card small"><strong>No upcoming appointments</strong><span>No scheduled visits were found.</span></div>
                ) : (
                  <div className="doctor-appointment-list">
                    {upcoming.map((appointment) => (
                      <div key={appointment.id} className={`doctor-appointment-row doctor-appointment-row-rich ${selected?.id === appointment.id ? "selected" : ""}`}>
                        <button type="button" className="doctor-appointment-main-button" onClick={() => selectAppointment(appointment)}>
                          <span className="doctor-patient-avatar">{getInitials(appointment.patient_name || `Patient ${appointment.patient_id}`)}</span>
                          <span className="doctor-appointment-main"><strong>{appointment.patient_name || `Patient ${appointment.patient_id}`}</strong><small>{formatDate(appointment.appointment_date)}</small></span>
                        </button>
                        <span className="doctor-appointment-status">{appointment.status || "Scheduled"}</span>
                        <div className="doctor-appointment-actions">
                          <button type="button" className="doctor-row-action" onClick={() => handleOpenPatientSummary(appointment)}>Summary</button>
                          <button type="button" className="doctor-row-action doctor-row-action-primary" onClick={() => handleOpenLiveChat(appointment)}>Chat</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="doctor-card doctor-query-card">
                {!selected ? (
                  <div className="doctor-query-empty">
                    <div className="doctor-query-icon">✦</div>
                    <h3>Select an appointment</h3>
                    <p>Choose a patient from the left to query their verified historical medical records.</p>
                  </div>
                ) : (
                  <>
                    <div className="doctor-card-header">
                      <div>
                        <span className="doctor-card-kicker">HISTORICAL RECORD QUERY</span>
                        <h3>{selected.patient_name || `Patient ${selected.patient_id}`}</h3>
                        <p>Patient ID {selected.patient_id} · Appointment {selected.id}</p>
                      </div>
                      <div className="doctor-query-header-actions">
                        <span className="doctor-secure-badge">
                          Verified appointment
                        </span>
                        <button
                          type="button"
                          className="doctor-secondary-button"
                          onClick={() =>
                            handleOpenPatientSummary(selected)
                          }
                        >
                          Patient summary
                        </button>
                      </div>
                    </div>
                    <form className="doctor-query-form" onSubmit={handleAsk}>
                      <label htmlFor="doctor-history-query">What historical information do you need?</label>
                      <textarea id="doctor-history-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={EXAMPLE_QUERY} rows={5} />
                      <div className="doctor-query-footer">
                        <span>AI retrieves historical records only. Clinical decisions remain with the doctor.</span>
                        <button type="submit" className="doctor-primary-button" disabled={asking || !query.trim()}>{asking ? "Retrieving…" : "Retrieve history →"}</button>
                      </div>
                    </form>
                    {askError && <div className="doctor-inline-error">{askError}</div>}
                    {result?.response && (
                      <div className="doctor-result-card">
                        <div className="doctor-result-header"><span>MEDICAL INTELLIGENCE</span><span>Source-backed</span></div>
                        <p>{result.response.summary}</p>
                        {result.response.sources?.length > 0 && <div className="doctor-sources"><strong>Sources</strong>{result.response.sources.map((source) => <span key={source}>{source}</span>)}</div>}
                        {result.response.limitations?.length > 0 && <div className="doctor-limitations">{result.response.limitations.join(" ")}</div>}
                      </div>
                    )}

                    <button
                      type="button"
                      className="doctor-summary-inline-button"
                      onClick={() =>
                        handleOpenPatientSummary(selected)
                      }
                    >
                      View patient summary →
                    </button>
                  </>
                )}
              </section>
            </div>

            {history.length > 0 && (
              <section className="doctor-card doctor-history-table-card">
                <div className="doctor-card-header compact"><div><h3>Appointment history</h3><p>Previously recorded appointments.</p></div></div>
                <div className="doctor-history-table">
                  {history.map((appointment) => (
                    <button type="button" key={appointment.id} onClick={() => selectAppointment(appointment)} className="doctor-history-row">
                      <span>{appointment.patient_name || `Patient ${appointment.patient_id}`}</span><span>{formatDate(appointment.appointment_date)}</span><span>{appointment.status || "Completed"}</span><span>View →</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </section>
        )}

        {active === "intelligence" && (
          <section className="doctor-page doctor-intelligence-page">
            <div className="doctor-section-heading">
              <div>
                <span className="doctor-eyebrow">MEDICAL INTELLIGENCE</span>
                <h2>{historyFocus === "conversations" ? "Conversations" : "Patient History"}</h2>
                <p>{historyFocus === "conversations" ? "Continue previous source-backed record conversations." : "Select an assigned patient to review historical records."}</p>
              </div>
              <button type="button" className="doctor-secondary-button" onClick={() => loadPatientsHistory(selectedPatient?.patient_id || null)} disabled={historyLoading}>{historyLoading ? "Refreshing…" : "↻ Refresh"}</button>
            </div>

            {historyError && <div className="doctor-inline-error doctor-page-error">{historyError}</div>}

            <div className="doctor-intelligence-layout">
              <aside className="doctor-patient-panel">
                <div className="doctor-panel-header"><div><strong>Assigned patients</strong><small>{doctorPatients.length} patients</small></div><span>●</span></div>
                <div className="doctor-patient-list">
                  {historyLoading ? <div className="doctor-panel-empty">Loading patients…</div> : doctorPatients.length === 0 ? <div className="doctor-panel-empty">No assigned patients found.</div> : doctorPatients.map((patient) => {
                    const isSelected = selectedPatient?.patient_id === patient.patient_id;
                    return (
                      <button type="button" key={patient.patient_id} className={`doctor-patient-item ${isSelected ? "active" : ""}`} onClick={() => handleSelectPatient(patient)}>
                        <span className="doctor-patient-avatar">{getInitials(patient.patient_name)}</span>
                        <span><strong>{patient.patient_name || `Patient ${patient.patient_id}`}</strong><small>{(patient.conversations || []).length} conversation{(patient.conversations || []).length === 1 ? "" : "s"}</small></span>
                        <span>›</span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="doctor-conversation-panel">
                {!selectedPatient ? (
                  <div className="doctor-query-empty"><div className="doctor-query-icon">✦</div><h3>Select a patient</h3><p>Choose an assigned patient to view or create a historical record conversation.</p></div>
                ) : (
                  <>
                    <div className="doctor-conversation-header">
                      <div className="doctor-conversation-patient"><span className="doctor-patient-avatar large">{getInitials(selectedPatient.patient_name)}</span><div><strong>{selectedPatient.patient_name || `Patient ${selectedPatient.patient_id}`}</strong><small>Patient ID {selectedPatient.patient_id}</small></div></div>
                      <button type="button" className="doctor-primary-button" onClick={handleCreateConversation} disabled={conversationCreating}>{conversationCreating ? "Creating…" : "+ New conversation"}</button>
                    </div>

                    <div className="doctor-conversation-body">
                      <div className="doctor-conversation-sidebar">
                        <div className="doctor-mini-heading">CONVERSATIONS</div>
                        {patientConversations.length === 0 ? <div className="doctor-mini-empty">No saved conversations yet.</div> : patientConversations.map((conversation) => (
                          <div key={conversation.id} className="doctor-conversation-item-wrap">
                            <button type="button" className={`doctor-conversation-item ${selectedConversation?.id === conversation.id ? "active" : ""}`} onClick={() => handleSelectConversation(conversation.id)}>
                              <span>{conversation.title}</span><small>{formatRelativeTime(conversation.updated_at)}</small>
                            </button>
                            <button type="button" className="doctor-delete-mini" title="Delete conversation" onClick={() => setDeleteTarget(conversation)}>⋮</button>
                          </div>
                        ))}
                      </div>

                      <div className="doctor-chat-panel">
                        {!selectedConversation ? (
                          <div className="doctor-query-empty compact"><div className="doctor-query-icon">○</div><h3>Choose a conversation</h3><p>Open an existing conversation or create a new one.</p></div>
                        ) : (
                          <>
                            <div className="doctor-chat-header"><div><strong>{selectedConversation.title}</strong><small>{selectedPatient.patient_name} · Historical records</small></div><span className="doctor-secure-badge">Source-backed</span></div>
                            <div className="doctor-chat-messages">
                              {conversationLoading ? <div className="doctor-panel-empty">Loading conversation…</div> : selectedConversation.messages?.length ? selectedConversation.messages.map((message) => {
                                const isDoctorMessage = message.role === "doctor" || message.role === "user";
                                return (
                                  <div key={message.id} className={`doctor-message-row ${isDoctorMessage ? "doctor" : "ai"}`}>
                                    <span className="doctor-message-label">{isDoctorMessage ? "You" : "Medical Intelligence"}</span>
                                    <div className="doctor-message-bubble">{message.content}</div>
                                    {message.sources?.length > 0 && <div className="doctor-message-source">Source: {message.sources.join(", ")}</div>}
                                    <small>{formatDate(message.created_at)}</small>
                                  </div>
                                );
                              }) : <div className="doctor-panel-empty">No messages yet. Ask about this patient's historical medical records.</div>}
                            </div>
                            <form className="doctor-chat-input" onSubmit={handleConversationQuery}>
                              <textarea value={conversationQuery} onChange={(event) => setConversationQuery(event.target.value)} placeholder="Ask about this patient's medical history…" rows={2} disabled={conversationAsking} />
                              <button type="submit" className="doctor-primary-button" disabled={conversationAsking || !conversationQuery.trim()}>{conversationAsking ? "Sending…" : "Send →"}</button>
                            </form>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </section>
            </div>
          </section>
        )}

        {liveChatOpen && liveChatAppointment && (
          <div className="doctor-modal-backdrop doctor-live-chat-backdrop" onMouseDown={closeLiveChat}>
            <section className="doctor-live-chat-modal" onMouseDown={(event) => event.stopPropagation()}>
              <header className="doctor-live-chat-header">
                <div className="doctor-live-chat-person">
                  <span className="doctor-live-chat-avatar">{getInitials(liveChatAppointment.patient_name || `Patient ${liveChatAppointment.patient_id}`)}</span>
                  <div>
                    <strong>{liveChatAppointment.patient_name || `Patient ${liveChatAppointment.patient_id}`}</strong>
                    <span>Patient ID {liveChatAppointment.patient_id} · Appointment #{liveChatAppointment.id}</span>
                  </div>
                </div>
                <div className="doctor-live-chat-header-actions">
                  <span className={`doctor-live-status ${liveChatConnected ? "online" : "offline"}`}>
                    <i /> {liveChatConnected ? "Live" : "Connecting"}
                  </span>
                  <button type="button" className="doctor-modal-close" onClick={closeLiveChat} aria-label="Close chat">×</button>
                </div>
              </header>

              <div className="doctor-live-chat-toolbar">
                <div><strong>Patient communication</strong><span>Secure doctor ↔ patient conversation</span></div>
                <button type="button" className="doctor-row-action" onClick={() => handleOpenPatientSummary(liveChatAppointment)}>View summary</button>
              </div>

              {liveChatError && <div className="doctor-live-chat-error">{liveChatError}</div>}

              <div className="doctor-live-chat-messages">
                {liveChatLoading ? (
                  <div className="doctor-live-chat-empty"><span className="doctor-live-chat-loader" /><strong>Opening secure conversation…</strong><span>Loading the latest messages.</span></div>
                ) : liveChatMessages.length === 0 ? (
                  <div className="doctor-live-chat-empty"><div className="doctor-live-empty-icon">✦</div><strong>Start the conversation</strong><span>Send a message to {liveChatAppointment.patient_name || "your patient"}.</span></div>
                ) : (
                  liveChatMessages.map((message, index) => {
                    const isDoctor = message.role === "doctor";
                    return (
                      <div key={message.id || index} className={`doctor-live-message ${isDoctor ? "doctor" : "patient"}`}>
                        {!isDoctor && <span className="doctor-live-message-avatar">{getInitials(liveChatAppointment.patient_name)}</span>}
                        <div className="doctor-live-message-content">
                          <div className="doctor-live-message-meta"><strong>{isDoctor ? "You" : liveChatAppointment.patient_name || "Patient"}</strong><span>{formatDate(message.created_at)}</span></div>
                          <div className="doctor-live-message-bubble">{message.content}</div>
                        </div>
                      </div>
                    );
                  })
                )}
                {liveChatTyping && <div className="doctor-live-typing"><span /><span /><span /> Patient is typing…</div>}
                <div ref={liveChatMessagesEndRef} />
              </div>

              <form className="doctor-live-chat-composer" onSubmit={handleLiveChatSubmit}>
                <textarea value={liveChatInput} onChange={(event) => setLiveChatInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleLiveChatSubmit(event); } }} placeholder="Write a secure message…" rows={2} disabled={!liveChatConnected || liveChatSending} />
                <div className="doctor-live-chat-composer-footer">
                  <span>Enter to send · Shift + Enter for a new line</span>
                  <button type="submit" className="doctor-primary-button" disabled={!liveChatConnected || liveChatSending || !liveChatInput.trim()}>{liveChatSending ? "Sending…" : "Send message →"}</button>
                </div>
              </form>
            </section>
          </div>
        )}

        {summaryOpen && (
          <div
            className="doctor-modal-backdrop"
            onMouseDown={closePatientSummary}
          >
            <div
              className="doctor-modal doctor-summary-modal"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >
              <div className="doctor-modal-header-row">
                <div>
                  <span className="doctor-eyebrow">
                    PATIENT SUMMARY
                  </span>
                  <h3>
                    {patientSummary?.patient?.name ||
                      selected?.patient_name ||
                      "Patient"}
                  </h3>
                  <p>
                    Appointment{" "}
                    {selected?.id ?? "—"} · Patient ID{" "}
                    {patientSummary?.patient?.id ??
                      selected?.patient_id ??
                      "—"}
                  </p>
                </div>

                <button
                  type="button"
                  className="doctor-modal-close"
                  onClick={closePatientSummary}
                  aria-label="Close patient summary"
                >
                  ×
                </button>
              </div>

              {summaryLoading ? (
                <div className="doctor-loading">
                  Loading patient summary…
                </div>
              ) : summaryError ? (
                <div className="doctor-inline-error">
                  {summaryError}
                </div>
              ) : patientSummary ? (
                <div className="doctor-summary-content">
                  <div className="doctor-summary-demographics">
                    <div>
                      <small>Patient</small>
                      <strong>
                        {patientSummary.patient?.name || "—"}
                      </strong>
                    </div>
                    <div>
                      <small>Age</small>
                      <strong>
                        {patientSummary.patient?.age ?? "—"}
                      </strong>
                    </div>
                    <div>
                      <small>Gender</small>
                      <strong>
                        {patientSummary.patient?.gender || "—"}
                      </strong>
                    </div>
                    <div>
                      <small>Documents</small>
                      <strong>
                        {patientSummary.recent_reports
                          ?.length ?? 0}
                      </strong>
                    </div>
                  </div>

                  <div className="doctor-summary-grid">
                    <div className="doctor-summary-section">
                      <h4>Conditions / history</h4>
                      {patientSummary.medical_history?.length ? (
                        patientSummary.medical_history.map(
                          (item, index) => (
                            <div
                              className="doctor-summary-item"
                              key={`history-${index}`}
                            >
                              <strong>
                                {item.parameter || "History"}
                              </strong>
                              <span>
                                {item.value || "—"}
                                {item.unit
                                  ? ` ${item.unit}`
                                  : ""}
                              </span>
                            </div>
                          )
                        )
                      ) : (
                        <span className="doctor-summary-empty">
                          No structured history found.
                        </span>
                      )}
                    </div>

                    <div className="doctor-summary-section">
                      <h4>Medications</h4>
                      {patientSummary.medications?.length ? (
                        patientSummary.medications.map(
                          (item, index) => (
                            <div
                              className="doctor-summary-item"
                              key={`medication-${index}`}
                            >
                              <strong>
                                {item.parameter ||
                                  "Medication"}
                              </strong>
                              <span>
                                {item.value || "—"}
                                {item.unit
                                  ? ` ${item.unit}`
                                  : ""}
                              </span>
                            </div>
                          )
                        )
                      ) : (
                        <span className="doctor-summary-empty">
                          No structured medications found.
                        </span>
                      )}
                    </div>

                    <div className="doctor-summary-section">
                      <h4>Allergies</h4>
                      {patientSummary.allergies?.length ? (
                        patientSummary.allergies.map(
                          (item, index) => (
                            <div
                              className="doctor-summary-item"
                              key={`allergy-${index}`}
                            >
                              <strong>
                                {item.parameter || "Allergy"}
                              </strong>
                              <span>
                                {item.value || "—"}
                              </span>
                            </div>
                          )
                        )
                      ) : (
                        <span className="doctor-summary-empty">
                          No structured allergies found.
                        </span>
                      )}
                    </div>

                    <div className="doctor-summary-section">
                      <h4>Investigations</h4>
                      {patientSummary.investigations?.length ? (
                        patientSummary.investigations.map(
                          (item, index) => (
                            <div
                              className="doctor-summary-item"
                              key={`investigation-${index}`}
                            >
                              <strong>
                                {item.parameter ||
                                  "Investigation"}
                              </strong>
                              <span>
                                {item.value || "—"}
                              </span>
                            </div>
                          )
                        )
                      ) : (
                        <span className="doctor-summary-empty">
                          No structured investigations found.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="doctor-summary-section doctor-summary-reports">
                    <div className="doctor-summary-section-heading">
                      <div>
                        <h4>Recent medical reports</h4>
                        <span>
                          Historical documents associated with
                          this patient.
                        </span>
                      </div>
                    </div>

                    {patientSummary.recent_reports?.length ? (
                      <div className="doctor-report-list">
                        {patientSummary.recent_reports.map(
                          (report) => (
                            <div
                              className="doctor-report-row"
                              key={report.id}
                            >
                              <span className="doctor-report-icon">
                                PDF
                              </span>
                              <span>
                                <strong>
                                  {report.file_name || "Medical report"}
                                </strong>
                                <small>
                                  {report.uploaded_at
                                    ? formatDate(
                                        report.uploaded_at
                                      )
                                    : "Date unavailable"}
                                </small>
                              </span>
                              <span className="doctor-report-status">
                                {report.document_type ||
                                  "Medical document"}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <span className="doctor-summary-empty">
                        No recent reports found.
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="doctor-summary-empty">
                  No patient summary available.
                </div>
              )}

              <div className="doctor-modal-actions">
                <button
                  type="button"
                  className="doctor-secondary-button"
                  onClick={closePatientSummary}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {profileOpen && (
          <div
            className="doctor-modal-backdrop"
            onMouseDown={() =>
              !profileSaving && setProfileOpen(false)
            }
          >
            <div
              className="doctor-modal doctor-profile-modal"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >
              <div className="doctor-modal-header-row">
                <div>
                  <span className="doctor-eyebrow">
                    DOCTOR PROFILE
                  </span>
                  <h3>Edit profile</h3>
                  <p>
                    Update the information shown for your
                    clinical workspace.
                  </p>
                </div>

                <button
                  type="button"
                  className="doctor-modal-close"
                  onClick={() =>
                    !profileSaving &&
                    setProfileOpen(false)
                  }
                  aria-label="Close profile"
                >
                  ×
                </button>
              </div>

              {profileLoading ? (
                <div className="doctor-loading">
                  Loading profile…
                </div>
              ) : (
                <form
                  className="doctor-profile-form"
                  onSubmit={handleProfileSubmit}
                >
                  <label>
                    Full name
                    <input
                      name="name"
                      value={profile.name}
                      onChange={handleProfileChange}
                      required
                    />
                  </label>

                  <label>
                    Email
                    <input
                      type="email"
                      name="email"
                      value={profile.email}
                      onChange={handleProfileChange}
                      required
                    />
                  </label>

                  <label>
                    Specialization
                    <input
                      name="specialization"
                      value={profile.specialization}
                      onChange={handleProfileChange}
                      placeholder="e.g. Cardiology"
                      required
                    />
                  </label>

                  {profileError && (
                    <div className="doctor-inline-error">
                      {profileError}
                    </div>
                  )}

                  {profileSuccess && (
                    <div className="doctor-inline-success">
                      {profileSuccess}
                    </div>
                  )}

                  <div className="doctor-modal-actions">
                    <button
                      type="button"
                      className="doctor-secondary-button"
                      onClick={() =>
                        !profileSaving &&
                        setProfileOpen(false)
                      }
                      disabled={profileSaving}
                    >
                      Close
                    </button>

                    <button
                      type="submit"
                      className="doctor-primary-button"
                      disabled={profileSaving}
                    >
                      {profileSaving
                        ? "Saving…"
                        : "Save profile"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {deleteTarget && (
          <div className="doctor-modal-backdrop" onMouseDown={() => !deletingConversation && setDeleteTarget(null)}>
            <div className="doctor-modal" onMouseDown={(event) => event.stopPropagation()}>
              <span className="doctor-modal-icon">!</span>
              <h3>Delete conversation?</h3>
              <p>This permanently deletes the conversation and its messages. Patient documents and medical records are not deleted.</p>
              <div className="doctor-modal-actions">
                <button type="button" className="doctor-secondary-button" onClick={() => setDeleteTarget(null)} disabled={deletingConversation}>Cancel</button>
                <button type="button" className="doctor-danger-button" onClick={handleDeleteConversation} disabled={deletingConversation}>{deletingConversation ? "Deleting…" : "Delete conversation"}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
