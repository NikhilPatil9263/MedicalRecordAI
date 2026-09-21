import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import { getDoctorAppointments, askDoctorQuery } from "../services/api";
import { getToken } from "../services/api";
import { decodeJwt } from "../utils/auth";

const EXAMPLE_QUERY = "Show me the patient's previous blood test results.";

function statusBadge(status) {
  const s = (status || "").toLowerCase();
  if (s === "completed") return <span className="badge badge-success">Completed</span>;
  if (s === "cancelled") return <span className="badge badge-danger">Cancelled</span>;
  if (s === "scheduled") return <span className="badge badge-accent">Scheduled</span>;
  return <span className="badge badge-neutral">{status || "Unknown"}</span>;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [query, setQuery] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");
  const [result, setResult] = useState(null);

  const doctorPayload = decodeJwt(getToken() || "");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingAppointments(true);
      setLoadError("");
      try {
        const data = await getDoctorAppointments();
        if (!cancelled) setAppointments(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Failed to load appointments.");
      } finally {
        if (!cancelled) setLoadingAppointments(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function selectAppointment(appt) {
    setSelectedAppointment(appt);
    setQuery("");
    setResult(null);
    setAskError("");
  }

  async function handleAsk(e) {
    e.preventDefault();
    if (!selectedAppointment || !query.trim()) return;

    setAsking(true);
    setAskError("");
    setResult(null);
    try {
      // Frontend only ever sends appointment_id + query. The backend derives
      // patient_id from the verified appointment — never sent from here.
      const data = await askDoctorQuery(selectedAppointment.id, query.trim());
      setResult(data);
    } catch (err) {
      setAskError(err.message || "Failed to retrieve historical records.");
    } finally {
      setAsking(false);
    }
  }

  function handleClear() {
    setQuery("");
    setResult(null);
    setAskError("");
  }

  return (
    <div className="app-shell">
      <Sidebar
        links={[
          { label: "Dashboard", icon: "🏠", active: true, onClick: () => {} },
          {
            label: "Appointments",
            icon: "📅",
            onClick: () =>
              document
                .getElementById("appointments-section")
                ?.scrollIntoView({ behavior: "smooth" }),
          },
        ]}
      />

      <div className="main-content">
        <div className="topbar">
          <div>
            <h1 className="page-title">
              Welcome{doctorPayload?.sub ? `, Dr. ${doctorPayload.sub}` : ""}
            </h1>
            <p className="page-subtitle">
              Review assigned appointments and retrieve source-backed historical
              records.
            </p>
          </div>
          <span className="secure-badge">Secure session</span>
        </div>

        <div className="two-col">
          <div id="appointments-section" className="card card-padded">
            <div className="section-heading">Your appointments</div>

            {loadingAppointments && (
              <div className="empty-state">
                <span className="spinner spinner-dark" /> Loading appointments...
              </div>
            )}

            {!loadingAppointments && loadError && (
              <div className="login-error">{loadError}</div>
            )}

            {!loadingAppointments && !loadError && appointments.length === 0 && (
              <div className="empty-state">No appointments assigned yet.</div>
            )}

            {!loadingAppointments &&
              appointments.map((appt) => (
                <div
                  key={appt.id}
                  className={`appointment-item${
                    selectedAppointment?.id === appt.id ? " selected" : ""
                  }`}
                  onClick={() => selectAppointment(appt)}
                >
                  <div className="flex justify-between items-center">
                    <strong>{appt.patient_name || `Patient #${appt.patient_id}`}</strong>
                    {statusBadge(appt.status)}
                  </div>
                  <div className="muted mt-8" style={{ fontSize: 13.5 }}>
                    Patient ID: {appt.patient_id}
                  </div>
                  <div className="faint" style={{ fontSize: 13 }}>
                    {formatDateTime(appt.appointment_date)}
                  </div>
                </div>
              ))}
          </div>

          <div className="card card-padded">
            {!selectedAppointment && (
              <div className="empty-state">
                Select an appointment to open the Medical Record Intelligence
                panel.
              </div>
            )}

            {selectedAppointment && (
              <>
                <div className="section-heading">Medical Record Intelligence</div>

                <div className="stat-grid" style={{ marginBottom: 20 }}>
                  <div className="card stat-card" style={{ boxShadow: "none" }}>
                    <div className="stat-label">Patient</div>
                    <div style={{ fontWeight: 600, marginTop: 6 }}>
                      {selectedAppointment.patient_name ||
                        `Patient #${selectedAppointment.patient_id}`}
                    </div>
                    <div className="faint" style={{ fontSize: 13, marginTop: 2 }}>
                      ID: {selectedAppointment.patient_id}
                    </div>
                  </div>
                  <div className="card stat-card" style={{ boxShadow: "none" }}>
                    <div className="stat-label">Appointment</div>
                    <div style={{ fontWeight: 600, marginTop: 6 }}>
                      {formatDateTime(selectedAppointment.appointment_date)}
                    </div>
                    <div className="mt-8">{statusBadge(selectedAppointment.status)}</div>
                  </div>
                </div>

                <form onSubmit={handleAsk}>
                  <div className="field">
                    <label htmlFor="query">Ask about this patient's history</label>
                    <textarea
                      id="query"
                      className="input"
                      placeholder={EXAMPLE_QUERY}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      disabled={asking}
                    />
                  </div>
                  <div className="flex gap-12">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={asking || !query.trim()}
                    >
                      {asking ? (
                        <>
                          <span className="spinner" /> Analyzing...
                        </>
                      ) : (
                        "Ask AI"
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleClear}
                      disabled={asking}
                    >
                      Clear
                    </button>
                  </div>
                </form>

                {asking && (
                  <div className="empty-state">
                    <span className="spinner spinner-dark" /> Analyzing medical
                    records...
                  </div>
                )}

                {!asking && askError && (
                  <div className="login-error mt-16">{askError}</div>
                )}

                {!asking && result && (
                  <div className="mt-24">
                    <div className="section-heading">Historical Record Summary</div>
                    <div className="card card-padded" style={{ boxShadow: "none" }}>
                      <p style={{ lineHeight: 1.6 }}>
                        {result.response?.summary || "No summary available."}
                      </p>
                    </div>

                    {result.response?.sources?.length > 0 && (
                      <div className="mt-16">
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                          Source Documents
                        </div>
                        <div className="mt-8">
                          {result.response.sources.map((src, i) => (
                            <span className="source-chip" key={i}>
                              📄 {src}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.response?.limitations?.length > 0 && (
                      <div className="mt-16">
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                          Limitations
                        </div>
                        <ul style={{ margin: "8px 0 0 18px", fontSize: 13.5, color: "var(--color-text-muted)" }}>
                          {result.response.limitations.map((lim, i) => (
                            <li key={i}>{lim}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="disclaimer-box mt-16">
                      <span aria-hidden="true">ℹ️</span>
                      <span>
                        This summary reflects retrieved historical records only.
                        It is not a diagnosis or treatment recommendation. All
                        clinical decisions remain the responsibility of the
                        treating healthcare professional.
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
