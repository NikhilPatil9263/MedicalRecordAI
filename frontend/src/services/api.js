// Centralized API helper.
// All requests go through here so components never duplicate fetch/auth logic.

const BASE_URL = "http://127.0.0.1:8000";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function getToken() {
  return localStorage.getItem("access_token");
}

function getRole() {
  return localStorage.getItem("role");
}

function clearSession() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("role");
}

/**
 * Core request helper.
 * - Attaches Authorization header automatically when a token exists.
 * - Never logs the token.
 * - On 401, clears the session.
 */
async function request(
  path,
  { method = "GET", body, isFormData = false } = {}
) {
  const headers = {};
  const token = getToken();

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!isFormData && body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: isFormData
        ? body
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
    });
  } catch (networkErr) {
    throw new ApiError(
      "Unable to reach the server. Please check your connection and that the backend is running.",
      0,
      null
    );
  }

  let data = null;

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => null);
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }

    const message =
      (data && (data.detail || data.message)) ||
      `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data;
}

// ============================================================
// AUTH
// ============================================================

export async function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: {
      email,
      password,
    },
  });
}

// ============================================================
// PATIENT
// ============================================================

export async function getPatientDocuments() {
  return request("/patient/documents");
}

export async function uploadPatientDocument(file, onProgress) {
  const token = getToken();

  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(
      "POST",
      `${BASE_URL}/patient/documents/upload`
    );

    if (token) {
      xhr.setRequestHeader(
        "Authorization",
        `Bearer ${token}`
      );
    }

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(
          Math.round(
            (event.loaded / event.total) * 100
          )
        );
      }
    };

    xhr.onload = () => {
      let data = null;

      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        data = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
        return;
      }

      if (xhr.status === 401) {
        clearSession();
      }

      reject(
        new ApiError(
          (data && (data.detail || data.message)) ||
            `Upload failed with status ${xhr.status}`,
          xhr.status,
          data
        )
      );
    };

    xhr.onerror = () => {
      reject(
        new ApiError(
          "Network error during upload.",
          0,
          null
        )
      );
    };

    xhr.send(formData);
  });
}

// ============================================================
// PATIENT DOCUMENT VIEWING
// ============================================================

export async function viewPatientDocument(documentId) {
  const token = getToken();

  const response = await fetch(
    `${BASE_URL}/patient/documents/${documentId}/view`,
    {
      method: "GET",
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    }
  );

  if (!response.ok) {
    let data = null;

    const contentType =
      response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      data = await response.json().catch(() => null);
    }

    if (response.status === 401) {
      clearSession();
    }

    throw new ApiError(
      (data && (data.detail || data.message)) ||
        `Unable to open document (${response.status})`,
      response.status,
      data
    );
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  const newWindow = window.open(
    blobUrl,
    "_blank",
    "noopener,noreferrer"
  );

  if (!newWindow) {
    URL.revokeObjectURL(blobUrl);

    throw new ApiError(
      "Please allow pop-ups to view this document.",
      0,
      null
    );
  }

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60000);

  return true;
}

// ============================================================
// DOCTOR
// ============================================================

export async function getDoctorAppointments() {
  return request("/doctor/appointments");
}

export async function askDoctorQuery(
  appointmentId,
  query
) {
  // patient_id is intentionally NOT sent.
  // Backend derives it from the verified appointment.
  return request("/doctor/query", {
    method: "POST",
    body: {
      appointment_id: appointmentId,
      query,
    },
  });
}

// ============================================================
// ADMIN
// ============================================================

export async function getAdminUsers() {
  return request("/admin/users");
}

export async function getAdminDoctors() {
  return request("/admin/doctors");
}

export async function createAdminDoctor(payload) {
  return request("/admin/doctors", {
    method: "POST",
    body: payload,
  });
}

export async function getAdminPatients() {
  return request("/admin/patients");
}

export async function createAdminPatient(payload) {
  return request("/admin/patients", {
    method: "POST",
    body: payload,
  });
}

export async function getAdminAppointments() {
  return request("/admin/appointments");
}

export async function createAdminAppointment(payload) {
  return request("/admin/appointments", {
    method: "POST",
    body: payload,
  });
}

export async function getAdminAuditLogs() {
  return request("/admin/audit-logs");
}

// ============================================================
// ADMIN DOCUMENTS
// ============================================================

export async function getAdminDocuments() {
  return request("/admin/documents");
}

// ============================================================
// EXPORTS
// ============================================================

export {
  getToken,
  getRole,
  clearSession,
  ApiError,
  BASE_URL,
};