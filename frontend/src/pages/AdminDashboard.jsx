import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import {
  getAdminUsers,
  getAdminDoctors,
  createAdminDoctor,
  getAdminPatients,
  createAdminPatient,
  getAdminAppointments,
  getAdminAuditLogs,
} from "../services/api";

const SECTIONS = [
  { key: "dashboard", label: "Dashboard", icon: "⌂", group: "OVERVIEW" },
  { key: "users", label: "Users", icon: "♙", group: "PEOPLE" },
  { key: "doctors", label: "Doctors", icon: "⚕", group: "PEOPLE" },
  { key: "patients", label: "Patients", icon: "♧", group: "PEOPLE" },
  {
    key: "appointments",
    label: "Appointments",
    icon: "□",
    group: "SCHEDULING",
  },
  {
    key: "audit-logs",
    label: "Audit Logs",
    icon: "≡",
    group: "SECURITY",
  },
];

function formatDate(iso) {
  if (!iso) return "—";

  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function Loading() {
  return (
    <div className="empty-state">
      <span className="spinner spinner-dark" />
      Loading...
    </div>
  );
}

function ErrorBox({ message }) {
  return <div className="login-error">{message}</div>;
}

function GenericTable({ rows, columns }) {
  if (!rows || rows.length === 0) {
    return <div className="empty-state">No records found.</div>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id ?? index}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render
                    ? column.render(row)
                    : row[column.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionButton({ children, onClick }) {
  return (
    <button type="button" className="btn btn-primary" onClick={onClick}>
      {children}
    </button>
  );
}

export default function AdminDashboard() {
  const [active, setActive] = useState("dashboard");

  const [users, setUsers] = useState(null);
  const [doctors, setDoctors] = useState(null);
  const [patients, setPatients] = useState(null);
  const [appointments, setAppointments] = useState(null);
  const [auditLogs, setAuditLogs] = useState(null);

  const [errors, setErrors] = useState({});
  const [loadingAll, setLoadingAll] = useState(true);

  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [showCreateDoctor, setShowCreateDoctor] = useState(false);

  const [patientForm, setPatientForm] = useState({
    name: "",
    email: "",
    password: "",
    date_of_birth: "",
    gender: "",
  });

  const [doctorForm, setDoctorForm] = useState({
    name: "",
    email: "",
    password: "",
    specialization: "",
  });

  const [patientCreateLoading, setPatientCreateLoading] = useState(false);
  const [doctorCreateLoading, setDoctorCreateLoading] = useState(false);

  const [patientCreateMessage, setPatientCreateMessage] = useState("");
  const [patientCreateError, setPatientCreateError] = useState("");

  const [doctorCreateMessage, setDoctorCreateMessage] = useState("");
  const [doctorCreateError, setDoctorCreateError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoadingAll(true);

      const results = await Promise.allSettled([
        getAdminUsers(),
        getAdminDoctors(),
        getAdminPatients(),
        getAdminAppointments(),
        getAdminAuditLogs(),
      ]);

      if (cancelled) return;

      const [usersResult, doctorsResult, patientsResult, appointmentsResult, logsResult] =
        results;

      const nextErrors = {};

      if (usersResult.status === "fulfilled") {
        setUsers(usersResult.value);
      } else {
        nextErrors.users = usersResult.reason?.message;
      }

      if (doctorsResult.status === "fulfilled") {
        setDoctors(doctorsResult.value);
      } else {
        nextErrors.doctors = doctorsResult.reason?.message;
      }

      if (patientsResult.status === "fulfilled") {
        setPatients(patientsResult.value);
      } else {
        nextErrors.patients = patientsResult.reason?.message;
      }

      if (appointmentsResult.status === "fulfilled") {
        setAppointments(appointmentsResult.value);
      } else {
        nextErrors.appointments = appointmentsResult.reason?.message;
      }

      if (logsResult.status === "fulfilled") {
        setAuditLogs(logsResult.value);
      } else {
        nextErrors.auditLogs = logsResult.reason?.message;
      }

      setErrors(nextErrors);
      setLoadingAll(false);
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreatePatient(event) {
    event.preventDefault();

    setPatientCreateLoading(true);
    setPatientCreateMessage("");
    setPatientCreateError("");

    try {
      const payload = {
        name: patientForm.name.trim(),
        email: patientForm.email.trim(),
        password: patientForm.password,
        date_of_birth: patientForm.date_of_birth || null,
        gender: patientForm.gender || null,
      };

      await createAdminPatient(payload);

      setPatientCreateMessage("Patient created successfully.");

      setPatientForm({
        name: "",
        email: "",
        password: "",
        date_of_birth: "",
        gender: "",
      });

      const updatedPatients = await getAdminPatients();
      setPatients(updatedPatients);
    } catch (error) {
      setPatientCreateError(
        error?.message || "Failed to create patient."
      );
    } finally {
      setPatientCreateLoading(false);
    }
  }

  async function handleCreateDoctor(event) {
    event.preventDefault();

    setDoctorCreateLoading(true);
    setDoctorCreateMessage("");
    setDoctorCreateError("");

    try {
      const payload = {
        name: doctorForm.name.trim(),
        email: doctorForm.email.trim(),
        password: doctorForm.password,
        specialization: doctorForm.specialization.trim(),
      };

      await createAdminDoctor(payload);

      setDoctorCreateMessage("Doctor created successfully.");

      setDoctorForm({
        name: "",
        email: "",
        password: "",
        specialization: "",
      });

      const updatedDoctors = await getAdminDoctors();
      setDoctors(updatedDoctors);
    } catch (error) {
      setDoctorCreateError(
        error?.message || "Failed to create doctor."
      );
    } finally {
      setDoctorCreateLoading(false);
    }
  }

  const links = [];
  let previousGroup = null;

  SECTIONS.forEach((section) => {
    if (section.group !== previousGroup) {
      links.push({
        type: "section",
        label: section.group,
      });

      previousGroup = section.group;
    }

    links.push({
      label: section.label,
      icon: section.icon,
      active: active === section.key,
      onClick: () => setActive(section.key),
    });
  });

  const upcomingAppointments = (appointments || [])
    .filter((appointment) => {
      if (!appointment.appointment_date) return false;
      return new Date(appointment.appointment_date) >= new Date();
    })
    .slice(0, 5);

  const recentLogs = (auditLogs || []).slice(0, 6);

  return (
    <div className="app-shell">
      <Sidebar links={links} />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="page-eyebrow">ADMINISTRATION</div>

            <h1 className="page-title">
              {active === "dashboard"
                ? "Admin Console"
                : SECTIONS.find((section) => section.key === active)?.label}
            </h1>

            <p className="page-subtitle">
              Manage users, clinical staff, patients, appointments, and
              system activity.
            </p>
          </div>

          <span className="secure-badge">Secure session</span>
        </div>

        {/* Dashboard */}
        {active === "dashboard" && (
          <>
            <div className="welcome-banner">
              <div>
                <div className="welcome-label">WORKSPACE OVERVIEW</div>
                <h2>Clinical administration at a glance</h2>
                <p>
                  Monitor the medical record workspace and manage clinical
                  operations from one place.
                </p>
              </div>

              <div className="welcome-mark">+</div>
            </div>

            <div className="stat-grid">
              <div className="card stat-card">
                <div className="stat-label">Total Users</div>
                <div className="stat-value">
                  {loadingAll || errors.users ? "—" : users?.length ?? 0}
                </div>
                <div className="stat-hint">Registered accounts</div>
              </div>

              <div className="card stat-card">
                <div className="stat-label">Doctors</div>
                <div className="stat-value">
                  {loadingAll || errors.doctors
                    ? "—"
                    : doctors?.length ?? 0}
                </div>
                <div className="stat-hint">Clinical staff</div>
              </div>

              <div className="card stat-card">
                <div className="stat-label">Patients</div>
                <div className="stat-value">
                  {loadingAll || errors.patients
                    ? "—"
                    : patients?.length ?? 0}
                </div>
                <div className="stat-hint">Registered patients</div>
              </div>

              <div className="card stat-card">
                <div className="stat-label">Appointments</div>
                <div className="stat-value">
                  {loadingAll || errors.appointments
                    ? "—"
                    : appointments?.length ?? 0}
                </div>
                <div className="stat-hint">Scheduled records</div>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="card card-padded">
                <div className="section-header-row">
                  <div>
                    <div className="section-heading">
                      Upcoming Appointments
                    </div>
                    <div className="section-description">
                      Scheduled clinical appointments
                    </div>
                  </div>

                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setActive("appointments")}
                  >
                    View all →
                  </button>
                </div>

                {loadingAll ? (
                  <Loading />
                ) : errors.appointments ? (
                  <ErrorBox message={errors.appointments} />
                ) : upcomingAppointments.length === 0 ? (
                  <div className="empty-state compact">
                    No upcoming appointments.
                  </div>
                ) : (
                  <div>
                    {upcomingAppointments.map((appointment) => (
                      <div
                        className="dashboard-list-item"
                        key={appointment.id}
                      >
                        <div className="dashboard-list-icon">□</div>

                        <div className="dashboard-list-content">
                          <strong>
                            {appointment.patient_name ||
                              `Patient #${appointment.patient_id}`}
                          </strong>

                          <span>
                            {appointment.doctor_name ||
                              `Doctor #${appointment.doctor_id}`}
                          </span>
                        </div>

                        <div className="dashboard-list-meta">
                          {formatDate(appointment.appointment_date)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card card-padded">
                <div className="section-header-row">
                  <div>
                    <div className="section-heading">
                      Recent Activity
                    </div>
                    <div className="section-description">
                      Latest system audit events
                    </div>
                  </div>

                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setActive("audit-logs")}
                  >
                    View logs →
                  </button>
                </div>

                {loadingAll ? (
                  <Loading />
                ) : errors.auditLogs ? (
                  <ErrorBox message={errors.auditLogs} />
                ) : recentLogs.length === 0 ? (
                  <div className="empty-state compact">
                    No recent activity.
                  </div>
                ) : (
                  <div>
                    {recentLogs.map((log, index) => (
                      <div
                        className="activity-item"
                        key={log.id ?? index}
                      >
                        <div className="activity-dot" />

                        <div>
                          <strong>
                            {log.action || log.event || "System activity"}
                          </strong>

                          <span>
                            {log.actor ||
                              log.user ||
                              log.performed_by ||
                              "System"}
                          </span>
                        </div>

                        <time>
                          {formatDate(
                            log.timestamp || log.created_at
                          )}
                        </time>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Users */}
        {active === "users" && (
          <div className="card card-padded">
            <div className="section-header-row">
              <div>
                <div className="section-heading">All Users</div>
                <div className="section-description">
                  System accounts and assigned roles
                </div>
              </div>

              <span className="count-badge">
                {users?.length ?? 0} accounts
              </span>
            </div>

            {loadingAll ? (
              <Loading />
            ) : errors.users ? (
              <ErrorBox message={errors.users} />
            ) : (
              <GenericTable
                rows={users}
                columns={[
                  {
                    key: "patient_id",
                    label: "Patient ID",
                    render: (row) =>
                      row.id ?? row.patient_id ?? row.patient?.id ?? "—",
                  },
                  {
                    key: "name",
                    label: "Name",
                    render: (row) =>
                      row.name || row.full_name || "—",
                  },
                  { key: "email", label: "Email" },
                  {
                    key: "role",
                    label: "Role",
                    render: (row) => (
                      <span className="badge badge-neutral">
                        {row.role}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </div>
        )}

        {/* Doctors */}
        {active === "doctors" && (
          <div className="card card-padded">
            <div className="section-header-row">
              <div>
                <div className="section-heading">Doctors</div>
                <div className="section-description">
                  Manage registered clinical staff
                </div>
              </div>

              <ActionButton
                onClick={() => {
                  setShowCreateDoctor((value) => !value);
                  setDoctorCreateMessage("");
                  setDoctorCreateError("");
                }}
              >
                {showCreateDoctor ? "Cancel" : "+ Create Doctor"}
              </ActionButton>
            </div>

            {showCreateDoctor && (
              <div className="form-panel">
                <div className="form-panel-header">
                  <div>
                    <h3>Create Doctor</h3>
                    <p>
                      Register a doctor and create their secure workspace
                      account.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateDoctor}>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="doctor-name">Full Name</label>
                      <input
                        id="doctor-name"
                        className="input"
                        type="text"
                        placeholder="Dr. Jane Smith"
                        value={doctorForm.name}
                        onChange={(event) =>
                          setDoctorForm({
                            ...doctorForm,
                            name: event.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="doctor-email">Email</label>
                      <input
                        id="doctor-email"
                        className="input"
                        type="email"
                        placeholder="doctor@hospital.com"
                        value={doctorForm.email}
                        onChange={(event) =>
                          setDoctorForm({
                            ...doctorForm,
                            email: event.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="doctor-password">Password</label>
                      <input
                        id="doctor-password"
                        className="input"
                        type="password"
                        placeholder="Create temporary password"
                        value={doctorForm.password}
                        onChange={(event) =>
                          setDoctorForm({
                            ...doctorForm,
                            password: event.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="doctor-specialization">
                        Specialization
                      </label>
                      <input
                        id="doctor-specialization"
                        className="input"
                        type="text"
                        placeholder="e.g. Cardiology"
                        value={doctorForm.specialization}
                        onChange={(event) =>
                          setDoctorForm({
                            ...doctorForm,
                            specialization: event.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  {doctorCreateError && (
                    <div className="login-error">
                      {doctorCreateError}
                    </div>
                  )}

                  {doctorCreateMessage && (
                    <div className="success-message">
                      {doctorCreateMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={doctorCreateLoading}
                  >
                    {doctorCreateLoading
                      ? "Creating..."
                      : "Create Doctor"}
                  </button>
                </form>
              </div>
            )}

            {loadingAll ? (
              <Loading />
            ) : errors.doctors ? (
              <ErrorBox message={errors.doctors} />
            ) : (
              <GenericTable
                rows={doctors}
                columns={[
                  {
                    key: "patient_id",
                    label: "Patient ID",
                    render: (row) =>
                      row.id ?? row.patient_id ?? row.patient?.id ?? "—",
                  },
                  {
                    key: "name",
                    label: "Name",
                    render: (row) =>
                      row.name || row.full_name || "—",
                  },
                  { key: "email", label: "Email" },
                  {
                    key: "specialty",
                    label: "Specialization",
                    render: (row) =>
                      row.specialization ||
                      row.specialty ||
                      row.department ||
                      "—",
                  },
                ]}
              />
            )}
          </div>
        )}

        {/* Patients */}
        {active === "patients" && (
          <div className="card card-padded">
            <div className="section-header-row">
              <div>
                <div className="section-heading">Patients</div>
                <div className="section-description">
                  Manage registered patient accounts
                </div>
              </div>

              <ActionButton
                onClick={() => {
                  setShowCreatePatient((value) => !value);
                  setPatientCreateMessage("");
                  setPatientCreateError("");
                }}
              >
                {showCreatePatient ? "Cancel" : "+ Create Patient"}
              </ActionButton>
            </div>

            {showCreatePatient && (
              <div className="form-panel">
                <div className="form-panel-header">
                  <div>
                    <h3>Create Patient</h3>
                    <p>
                      Register a patient account for clinical
                      administration.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreatePatient}>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="patient-name">Full Name</label>
                      <input
                        id="patient-name"
                        className="input"
                        type="text"
                        placeholder="Patient full name"
                        value={patientForm.name}
                        onChange={(event) =>
                          setPatientForm({
                            ...patientForm,
                            name: event.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="patient-email">Email</label>
                      <input
                        id="patient-email"
                        className="input"
                        type="email"
                        placeholder="patient@example.com"
                        value={patientForm.email}
                        onChange={(event) =>
                          setPatientForm({
                            ...patientForm,
                            email: event.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="patient-password">
                        Password
                      </label>
                      <input
                        id="patient-password"
                        className="input"
                        type="password"
                        placeholder="Create temporary password"
                        value={patientForm.password}
                        onChange={(event) =>
                          setPatientForm({
                            ...patientForm,
                            password: event.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="patient-dob">
                        Date of Birth
                      </label>
                      <input
                        id="patient-dob"
                        className="input"
                        type="date"
                        value={patientForm.date_of_birth}
                        onChange={(event) =>
                          setPatientForm({
                            ...patientForm,
                            date_of_birth: event.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="patient-gender">Gender</label>
                      <select
                        id="patient-gender"
                        className="input"
                        value={patientForm.gender}
                        onChange={(event) =>
                          setPatientForm({
                            ...patientForm,
                            gender: event.target.value,
                          })
                        }
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {patientCreateError && (
                    <div className="login-error">
                      {patientCreateError}
                    </div>
                  )}

                  {patientCreateMessage && (
                    <div className="success-message">
                      {patientCreateMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={patientCreateLoading}
                  >
                    {patientCreateLoading
                      ? "Creating..."
                      : "Create Patient"}
                  </button>
                </form>
              </div>
            )}

            {loadingAll ? (
              <Loading />
            ) : errors.patients ? (
              <ErrorBox message={errors.patients} />
            ) : (
              <GenericTable
                rows={patients}
                columns={[
                  {
                    key: "patient_id",
                    label: "Patient ID",
                    render: (row) =>
                      row.id ?? row.patient_id ?? row.patient?.id ?? "—",
                  },
                  {
                    key: "name",
                    label: "Name",
                    render: (row) =>
                      row.name || row.full_name || "—",
                  },
                  { key: "email", label: "Email" },
                  {
                    key: "age",
                    label: "Age / Sex",
                    render: (row) =>
                      `${row.age ?? "—"} / ${
                        row.sex || row.gender || "—"
                      }`,
                  },
                ]}
              />
            )}
          </div>
        )}

        {/* Appointments */}
        {active === "appointments" && (
          <div className="card card-padded">
            <div className="section-header-row">
              <div>
                <div className="section-heading">
                  Appointments
                </div>
                <div className="section-description">
                  Patient and doctor scheduling
                </div>
              </div>

              <span className="count-badge">
                {appointments?.length ?? 0} appointments
              </span>
            </div>

            {loadingAll ? (
              <Loading />
            ) : errors.appointments ? (
              <ErrorBox message={errors.appointments} />
            ) : (
              <GenericTable
                rows={appointments}
                columns={[
                  { key: "id", label: "ID" },
                  {
                    key: "patient_name",
                    label: "Patient",
                    render: (row) =>
                      row.patient_name || row.patient_id,
                  },
                  {
                    key: "doctor_name",
                    label: "Doctor",
                    render: (row) =>
                      row.doctor_name || row.doctor_id,
                  },
                  {
                    key: "appointment_date",
                    label: "Date / Time",
                    render: (row) =>
                      formatDate(row.appointment_date),
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (row) => (
                      <span className="badge badge-accent">
                        {row.status}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </div>
        )}

        {/* Audit Logs */}
        {active === "audit-logs" && (
          <div className="card card-padded">
            <div className="section-header-row">
              <div>
                <div className="section-heading">
                  Audit Logs
                </div>
                <div className="section-description">
                  Security and system activity history
                </div>
              </div>

              <span className="count-badge">
                {auditLogs?.length ?? 0} events
              </span>
            </div>

            {loadingAll ? (
              <Loading />
            ) : errors.auditLogs ? (
              <ErrorBox message={errors.auditLogs} />
            ) : (
              <GenericTable
                rows={auditLogs}
                columns={[
                  {
                    key: "actor",
                    label: "Actor",
                    render: (row) =>
                      row.actor ||
                      row.user ||
                      row.performed_by ||
                      "—",
                  },
                  {
                    key: "action",
                    label: "Action",
                    render: (row) =>
                      row.action || row.event || "—",
                  },
                  {
                    key: "details",
                    label: "Details",
                    render: (row) =>
                      row.details ||
                      row.description ||
                      "—",
                  },
                  {
                    key: "timestamp",
                    label: "Timestamp",
                    render: (row) =>
                      formatDate(
                        row.timestamp || row.created_at
                      ),
                  },
                ]}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}