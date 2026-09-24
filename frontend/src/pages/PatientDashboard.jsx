import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import PatientDoctorChat from "../components/PatientDoctorChat.jsx";
import {
  getPatientDocuments,
  uploadPatientDocument,
  viewPatientDocument,
  getPatientAppointments,
} from "../services/api";

function statusBadge(status) {
  const value = (status || "").toLowerCase();

  if (value === "processed" || value === "completed") {
    return <span className="badge badge-success">Processed</span>;
  }

  if (value === "processing") {
    return <span className="badge badge-warning">Processing</span>;
  }

  if (value === "error" || value === "failed") {
    return <span className="badge badge-danger">Error</span>;
  }

  if (value === "uploaded") {
    return <span className="badge badge-accent">Uploaded</span>;
  }

  return <span className="badge badge-neutral">{status || "Unknown"}</span>;
}

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString(undefined, {
      dateStyle: "medium",
    });
  } catch {
    return value;
  }
}

function documentName(document) {
  return (
    document.file_name ||
    document.filename ||
    document.name ||
    "Untitled document"
  );
}

function documentStatus(document) {
  return (
    document.processing_status ||
    document.status ||
    "Unknown"
  );
}

function documentDate(document) {
  return (
    document.uploaded_at ||
    document.upload_date ||
    document.created_at ||
    null
  );
}

function fileExtension(fileName) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "FILE";
}

export default function PatientDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [chatAppointments, setChatAppointments] = useState([]);
  const [selectedChatAppointment, setSelectedChatAppointment] = useState(null);
  const [chatAppointmentsLoading, setChatAppointmentsLoading] = useState(false);
  const [chatAppointmentsError, setChatAppointmentsError] = useState("");

  const fileInputRef = useRef(null);

  async function loadDocuments() {
    setLoading(true);
    setLoadError("");

    try {
      const data = await getPatientDocuments();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      setLoadError(error.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadError("");

    try {
      await uploadPatientDocument(file, setUploadProgress);
      await loadDocuments();
    } catch (error) {
      setUploadError(error.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleView(document) {
    if (!document?.document_id) return;

    try {
      await viewPatientDocument(document.document_id);
    } catch (error) {
      window.alert(error.message || "Unable to open document.");
    }
  }

  async function loadChatAppointments() {
    setChatAppointmentsLoading(true);
    setChatAppointmentsError("");

    try {
      const data = await getPatientAppointments();
      const items = Array.isArray(data) ? data : [];
      setChatAppointments(items);
      setSelectedChatAppointment((current) =>
        current && items.some((item) => item.id === current.id)
          ? current
          : items[0] || null
      );
    } catch (error) {
      setChatAppointmentsError(
        error?.message || "Unable to load appointments."
      );
    } finally {
      setChatAppointmentsLoading(false);
    }
  }

  useEffect(() => {
    if (activeSection === "chat") {
      loadChatAppointments();
    }
  }, [activeSection]);

  const processedDocuments = documents.filter((document) => {
    const status = documentStatus(document).toLowerCase();
    return status === "processed" || status === "completed";
  });

  const recentDocuments = documents.slice(0, 5);

  const links = [
    {
      label: "Dashboard",
      icon: "⌂",
      active: activeSection === "dashboard",
      onClick: () => setActiveSection("dashboard"),
    },
    {
      label: "Medical Documents",
      icon: "▣",
      active: activeSection === "documents",
      onClick: () => setActiveSection("documents"),
    },
    {
      label: "Appointments",
      icon: "◷",
      active: activeSection === "appointments",
      onClick: () => setActiveSection("appointments"),
    },
    {
      label: "Chat with Doctor",
      icon: "◉",
      active: activeSection === "chat",
      onClick: () => setActiveSection("chat"),
    },
  ];

  return (
    <div className="app-shell patient-app">
      <Sidebar links={links} />

      <main className="main-content patient-main-content">
        {activeSection === "dashboard" && (
          <>
            <div className="topbar patient-topbar">
              <div>
                <div className="page-eyebrow">PATIENT PORTAL</div>
                <h1 className="page-title">Welcome back</h1>
                <p className="page-subtitle">
                  Manage your medical records and appointments from one secure workspace.
                </p>
              </div>

              <span className="secure-badge">Secure session</span>
            </div>

            <div className="patient-welcome">
              <div>
                <div className="patient-welcome-label">YOUR HEALTH RECORDS</div>
                <h2>Your medical information is securely stored.</h2>
                <p>
                  Upload previous medical records before your appointments so your care team can review relevant history.
                </p>
              </div>
              <div className="patient-welcome-icon">+</div>
            </div>

            <div className="stat-grid patient-stat-grid">
              <div className="card stat-card">
                <div className="stat-label">Total Documents</div>
                <div className="stat-value">{loading ? "—" : documents.length}</div>
                <div className="stat-hint">Uploaded medical records</div>
              </div>

              <div className="card stat-card">
                <div className="stat-label">Processed</div>
                <div className="stat-value">{loading ? "—" : processedDocuments.length}</div>
                <div className="stat-hint">Ready for clinical review</div>
              </div>

              <div className="card stat-card">
                <div className="stat-label">Recent Documents</div>
                <div className="stat-value">{loading ? "—" : recentDocuments.length}</div>
                <div className="stat-hint">Latest uploaded records</div>
              </div>
            </div>

            <div className="card card-padded patient-dashboard-card">
              <div className="section-header-row">
                <div>
                  <div className="section-heading">Recent Documents</div>
                  <div className="section-description">
                    Latest records uploaded to your account
                  </div>
                </div>

                <button
                  type="button"
                  className="text-button"
                  onClick={() => setActiveSection("documents")}
                >
                  View all →
                </button>
              </div>

              {loading ? (
                <div className="empty-state">
                  <span className="spinner spinner-dark" /> Loading documents...
                </div>
              ) : loadError ? (
                <div className="login-error">{loadError}</div>
              ) : recentDocuments.length === 0 ? (
                <div className="upload-dropzone">
                  No medical documents uploaded yet.
                </div>
              ) : (
                <div className="patient-recent-documents">
                  {recentDocuments.map((document, index) => (
                    <div className="patient-recent-document" key={document.document_id ?? index}>
                      <div className="document-type">
                        {fileExtension(documentName(document))}
                      </div>

                      <div className="patient-document-info">
                        <strong>{documentName(document)}</strong>
                        <span>Uploaded {formatDate(documentDate(document))}</span>
                      </div>

                      {statusBadge(documentStatus(document))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="patient-quick-actions">
              <button
                type="button"
                className="patient-quick-card"
                onClick={() => setActiveSection("documents")}
              >
                <div className="patient-quick-icon">▣</div>
                <div>
                  <strong>Medical Documents</strong>
                  <span>View and manage your uploaded records.</span>
                </div>
                <span className="patient-quick-arrow">→</span>
              </button>

              <button
                type="button"
                className="patient-quick-card"
                onClick={() => setActiveSection("appointments")}
              >
                <div className="patient-quick-icon">◷</div>
                <div>
                  <strong>Appointments</strong>
                  <span>View your consultation schedule.</span>
                </div>
                <span className="patient-quick-arrow">→</span>
              </button>
            </div>
          </>
        )}

        {activeSection === "documents" && (
          <>
            <div className="topbar patient-topbar">
              <div>
                <div className="page-eyebrow">PATIENT PORTAL</div>
                <h1 className="page-title">Medical Documents</h1>
                <p className="page-subtitle">
                  View and manage your uploaded medical records.
                </p>
              </div>

              <span className="secure-badge">Secure session</span>
            </div>

            <div className="card card-padded">
              <div className="section-header-row">
                <div>
                  <div className="section-heading">Your Documents</div>
                  <div className="section-description">
                    PDF files and medical images uploaded to your record.
                  </div>
                </div>

                <div className="patient-document-header-actions">
                  <span className="count-badge">{documents.length} documents</span>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />

                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <>
                        <span className="spinner" /> Uploading...
                      </>
                    ) : (
                      "+ Upload document"
                    )}
                  </button>
                </div>
              </div>

              {uploading && (
                <div className="patient-upload-progress">
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <span>Uploading {uploadProgress}%...</span>
                </div>
              )}

              {uploadError && <div className="login-error">{uploadError}</div>}

              {loading ? (
                <div className="empty-state">
                  <span className="spinner spinner-dark" /> Loading documents...
                </div>
              ) : loadError ? (
                <div className="login-error">{loadError}</div>
              ) : documents.length === 0 ? (
                <div className="upload-dropzone">
                  No medical documents uploaded yet. Upload a PDF or medical image to get started.
                </div>
              ) : (
                <div className="patient-documents-table">
                  <div className="patient-documents-table-header">
                    <span>DOCUMENT</span>
                    <span>UPLOADED</span>
                    <span>STATUS</span>
                    <span>ACTION</span>
                  </div>

                  {documents.map((document, index) => (
                    <div className="patient-document-row" key={document.document_id ?? index}>
                      <div className="patient-document-file">
                        <div className="document-type">
                          {fileExtension(documentName(document))}
                        </div>
                        <div className="patient-document-info">
                          <strong>{documentName(document)}</strong>
                          <span>{document.file_type || "Medical document"}</span>
                        </div>
                      </div>

                      <div className="patient-document-date">
                        {formatDate(documentDate(document))}
                      </div>

                      <div>{statusBadge(documentStatus(document))}</div>

                      <div className="document-actions">
                        <button
                          type="button"
                          className="document-view-button"
                          onClick={() => handleView(document)}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeSection === "chat" && (
          <>
            <div className="topbar patient-topbar">
              <div>
                <div className="page-eyebrow">SECURE MESSAGING</div>
                <h1 className="page-title">Chat with your doctor</h1>
                <p className="page-subtitle">
                  Communicate directly with the doctor assigned to your appointment.
                </p>
              </div>
              <span className="secure-badge">Private chat</span>
            </div>

            {chatAppointmentsError && (
              <div className="redesign-error">{chatAppointmentsError}</div>
            )}

            <div className="live-chat-layout">
              <aside className="live-chat-appointments">
                <div className="live-chat-list-title">Your appointments</div>
                <div className="live-chat-list-subtitle">Select an appointment to message your doctor.</div>

                {chatAppointmentsLoading ? (
                  <div className="live-chat-list-empty">Loading appointments...</div>
                ) : chatAppointments.length === 0 ? (
                  <div className="live-chat-list-empty">No appointments available for chat.</div>
                ) : (
                  chatAppointments.map((appointment) => (
                    <button
                      type="button"
                      key={appointment.id}
                      className={`live-chat-appointment ${
                        selectedChatAppointment?.id === appointment.id ? "active" : ""
                      }`}
                      onClick={() => setSelectedChatAppointment(appointment)}
                    >
                      <span className="live-chat-list-avatar">DR</span>
                      <span>
                        <strong>Doctor</strong>
                        <small>Appointment #{appointment.id}</small>
                      </span>
                    </button>
                  ))
                )}
              </aside>

              <PatientDoctorChat
                appointmentId={selectedChatAppointment?.id}
                currentRole="patient"
                peerName="Assigned Doctor"
                appointmentLabel={
                  selectedChatAppointment
                    ? `Appointment #${selectedChatAppointment.id}`
                    : undefined
                }
              />
            </div>
          </>
        )}

        {activeSection === "appointments" && (
          <>
            <div className="topbar patient-topbar">
              <div>
                <div className="page-eyebrow">PATIENT PORTAL</div>
                <h1 className="page-title">Appointments</h1>
                <p className="page-subtitle">
                  View your scheduled consultations.
                </p>
              </div>

              <span className="secure-badge">Secure session</span>
            </div>

            <div className="card card-padded">
              <div className="section-header-row">
                <div>
                  <div className="section-heading">Appointment Schedule</div>
                  <div className="section-description">
                    Appointments are managed by your care team.
                  </div>
                </div>
              </div>

              <div className="patient-appointment-placeholder">
                <div className="patient-placeholder-icon">◷</div>
                <h3>Appointment schedule</h3>
                <p>Your assigned appointments will appear here.</p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
