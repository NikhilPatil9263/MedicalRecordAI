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
  } catch {
    throw new ApiError(
      "Unable to reach the server. Please check your connection and that the backend is running.",
      0,
      null
    );
  }

  let data = null;
  const contentType =
    response.headers.get("content-type") || "";

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


// =========================================================
// AUTH
// =========================================================

export async function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}


// =========================================================
// PATIENT
// =========================================================

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
      } catch {
        data = null;
      }

      if (
        xhr.status >= 200 &&
        xhr.status < 300
      ) {
        resolve(data);
      } else {
        if (xhr.status === 401) {
          clearSession();
        }

        reject(
          new ApiError(
            (data &&
              (data.detail || data.message)) ||
              `Upload failed with status ${xhr.status}`,
            xhr.status,
            data
          )
        );
      }
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

export async function getPatientAppointments() {
  return request("/patient/appointments");
}

export async function viewPatientDocument(documentId) {
  const token = getToken();

  const response = await fetch(
    `${BASE_URL}/patient/documents/${documentId}/view`,
    {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }

    throw new ApiError(
      `Unable to open document (${response.status})`,
      response.status
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );

  setTimeout(
    () => URL.revokeObjectURL(url),
    60000
  );
}


// =========================================================
// ADMIN DOCUMENTS
// =========================================================

export async function getAdminDocuments() {
  return request("/admin/documents");
}

export async function viewAdminDocument(documentId) {
  const token = getToken();

  const response = await fetch(
    `${BASE_URL}/admin/documents/${documentId}/view`,
    {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }

    throw new ApiError(
      `Unable to open document (${response.status})`,
      response.status
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );

  setTimeout(
    () => URL.revokeObjectURL(url),
    60000
  );
}


// =========================================================
// DOCTOR
// =========================================================

export async function getDoctorAppointments() {
  return request("/doctor/appointments");
}

export async function askDoctorQuery(
  appointmentId,
  query
) {
  // Only appointment_id and query are sent.
  // The backend derives patient_id from the
  // verified appointment.
  return request("/doctor/query", {
    method: "POST",
    body: {
      appointment_id: appointmentId,
      query,
    },
  });
}


// =========================================================
// DOCTOR PROFILE
// =========================================================

export async function getDoctorProfile() {
  return request("/doctor/profile");
}

export async function updateDoctorProfile(payload) {
  return request("/doctor/profile", {
    method: "PUT",
    body: payload,
  });
}


// =========================================================
// DOCTOR PATIENT SUMMARY
// =========================================================

export async function getDoctorPatientSummary(
  appointmentId
) {
  return request(
    `/doctor/appointments/${appointmentId}/summary`
  );
}


// =========================================================
// DOCTOR CONVERSATIONS
// =========================================================

export async function getDoctorPatients() {
  return request("/doctor/patients");
}

export async function createDoctorConversation(
  appointmentId,
  title = "New Conversation"
) {
  return request("/doctor/conversations", {
    method: "POST",
    body: {
      appointment_id: appointmentId,
      title,
    },
  });
}

export async function getDoctorConversation(
  conversationId
) {
  return request(
    `/doctor/conversations/${conversationId}`
  );
}

export async function askDoctorConversation(
  conversationId,
  query
) {
  return request(
    `/doctor/conversations/${conversationId}/query`,
    {
      method: "POST",
      body: {
        query,
      },
    }
  );
}

export async function deleteDoctorConversation(
  conversationId
) {
  return request(
    `/doctor/conversations/${conversationId}`,
    {
      method: "DELETE",
    }
  );
}

// =========================================================
// DOCTOR <-> PATIENT LIVE CHAT
// =========================================================

export async function createLiveChatSession(appointmentId) {
  return request("/chat/session", {
    method: "POST",
    body: {
      appointment_id: appointmentId,
    },
  });
}

export async function getLiveChatMessages(appointmentId) {
  return request(
    `/chat/${appointmentId}/messages`
  );
}


// =========================================================
// ADMIN
// =========================================================

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


// =========================================================
// EXPORTS
// =========================================================

export {
  getToken,
  getRole,
  clearSession,
  ApiError,
  BASE_URL,
};