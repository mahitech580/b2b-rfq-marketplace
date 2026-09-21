
// ============================================================
// RFQ MARKETPLACE - API / DATA SERVICE
// ============================================================
// Supports two modes:
//
// 1. GitHub Pages / Demo Mode
//    - VITE_API_BASE_URL is empty
//    - Uses localStorage for browser persistence
//
// 2. Real Backend Mode
//    - VITE_API_BASE_URL points to Flask API
//    - Uses REST endpoints + JWT authentication
//
// NOTE:
// Demo mode is intended for portfolio/assignment demonstration.
// It is NOT a replacement for server-side authentication/database
// security in a production application.
// ============================================================

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/+$/, "");

const REQUEST_TIMEOUT = 10000;

const KEYS = Object.freeze({
  token: "rfq_access_token",
  users: "rfq_users",
  rfqs: "rfq_items",
  quotations: "rfq_quotations",
  session: "rfq_session"
});

// ============================================================
// GENERAL HELPERS
// ============================================================

const hasBackend = () => Boolean(API_BASE_URL);

const toJson = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

const readStorage = (key, fallback = null) => {
  try {
    const value = localStorage.getItem(key);

    if (value === null) {
      return fallback;
    }

    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  localStorage.setItem(key, toJson(value));
};

const removeStorage = (key) => {
  localStorage.removeItem(key);
};

const getCollection = (key) => {
  const value = readStorage(key, []);
  return Array.isArray(value) ? value : [];
};

const getSession = () => readStorage(KEYS.session, null);

const getToken = () => localStorage.getItem(KEYS.token);

const todayISO = () => {
  const now = new Date();
  return now.toISOString().slice(0, 10);
};

const futureDate = (daysFromNow) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
};

const mockDelay = (value, ms = 300) =>
  new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });

// ============================================================
// ERROR HANDLING
// ============================================================

class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const getErrorMessage = (error, fallback = "Something went wrong") => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

// ============================================================
// CLIENT-SIDE PASSWORD HASH
// ============================================================
// Demo mode should not store plaintext passwords.
// Web Crypto SHA-256 is used only to avoid storing raw passwords.
// Real security must still be handled by the backend.
// ============================================================

const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

// ============================================================
// DEMO USER SEED
// ============================================================

const seedUsers = () => {
  const existingUsers = getCollection(KEYS.users);

  if (existingUsers.length > 0) {
    return;
  }

  writeStorage(KEYS.users, [
    {
      id: 1,
      name: "Demo Buyer",
      email: "buyer@demo.com",
      passwordHash:
        "396fcdf7cfc32eebcd16361352a2a5d2aedeaf76b1be9a15a7d2a7d4fd69f257",
      role: "BUYER",
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      name: "Demo Supplier",
      email: "supplier@demo.com",
      passwordHash:
        "a71141e9e7ccb69fe7292053f6bfdbe05f55312953f9118a9461567de03c8ae9",
      role: "SUPPLIER",
      created_at: new Date().toISOString()
    }
  ]);
};

const seedRFQs = () => {
  const existingRFQs = getCollection(KEYS.rfqs);

  if (existingRFQs.length > 0) {
    return;
  }

  writeStorage(KEYS.rfqs, [
    {
      id: 1001,
      buyer_id: 1,
      buyer_name: "Demo Buyer",
      product_name: "Business Laptops",
      description:
        "Need business-grade laptops for a growing software team.",
      quantity: 50,
      delivery_location: "Hyderabad, Telangana",
      deadline: futureDate(7),
      status: "OPEN",
      created_at: new Date().toISOString()
    },
    {
      id: 1002,
      buyer_id: 1,
      buyer_name: "Demo Buyer",
      product_name: "Office Chairs",
      description:
        "Ergonomic office chairs with adjustable lumbar support.",
      quantity: 100,
      delivery_location: "Bengaluru, Karnataka",
      deadline: futureDate(12),
      status: "OPEN",
      created_at: new Date().toISOString()
    },
    {
      id: 1003,
      buyer_id: 1,
      buyer_name: "Demo Buyer",
      product_name: "Network Switches",
      description:
        "Managed Gigabit switches required for enterprise office networking.",
      quantity: 20,
      delivery_location: "Hyderabad, Telangana",
      deadline: futureDate(15),
      status: "OPEN",
      created_at: new Date().toISOString()
    }
  ]);
};

const seedQuotations = () => {
  const existingQuotations = getCollection(KEYS.quotations);

  if (existingQuotations.length > 0) {
    return;
  }

  writeStorage(KEYS.quotations, [
    {
      id: 5001,
      rfq_id: 1001,
      supplier_id: 2,
      supplier_name: "Demo Supplier",
      quoted_price: 4250000,
      estimated_delivery_days: 7,
      message:
        "We can supply the requested laptops with business warranty and doorstep delivery.",
      created_at: new Date().toISOString()
    }
  ]);
};

const initializeDemoData = () => {
  seedUsers();
  seedRFQs();
  seedQuotations();
};

initializeDemoData();

// ============================================================
// DEMO AUTHORIZATION
// ============================================================

const requireSession = () => {
  const user = getSession();

  if (!user) {
    throw new ApiError(
      "You must be logged in to perform this action.",
      401
    );
  }

  return user;
};

const requireRole = (role) => {
  const user = requireSession();

  if (user.role !== role) {
    throw new ApiError(
      `This action requires ${role.toLowerCase()} access.`,
      403
    );
  }

  return user;
};

// ============================================================
// API REQUEST
// ============================================================

async function request(path, options = {}) {
  if (!hasBackend()) {
    return null;
  }

  const controller = new AbortController();

  const timeoutId = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  try {
    const token = getToken();

    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`
          }
        : {}),
      ...(options.headers || {})
    };

    const response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...options,
        headers,
        signal: controller.signal
      }
    );

    const contentType =
      response.headers.get("content-type") || "";

    let data = {};

    if (contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        data = {};
      }
    } else {
      const text = await response.text();

      data = text
        ? {
            message: text
          }
        : {};
    }

    if (!response.ok) {
      throw new ApiError(
        data?.message ||
          data?.error ||
          `Request failed with status ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new ApiError(
        "The server took too long to respond.",
        408
      );
    }

    if (error instanceof ApiError) {
      if (error.status === 401) {
        logout();
      }

      throw error;
    }

    throw new ApiError(
      "Unable to connect to the API. Please try again."
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================
// AUTHENTICATION
// ============================================================

export async function register(payload) {
  const name = payload?.name?.trim();
  const email = payload?.email?.trim().toLowerCase();
  const password = payload?.password || "";
  const role = payload?.role;

  if (!name || name.length < 2) {
    throw new ApiError(
      "Name must contain at least 2 characters.",
      400
    );
  }

  if (!email || !email.includes("@")) {
    throw new ApiError(
      "Please enter a valid email address.",
      400
    );
  }

  if (password.length < 8) {
    throw new ApiError(
      "Password must contain at least 8 characters.",
      400
    );
  }

  if (!["BUYER", "SUPPLIER"].includes(role)) {
    throw new ApiError(
      "Please select a valid user role.",
      400
    );
  }

  if (hasBackend()) {
    const data = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        password,
        role
      })
    });

    if (data?.access_token) {
      localStorage.setItem(
        KEYS.token,
        data.access_token
      );
    }

    if (data?.user) {
      writeStorage(KEYS.session, data.user);
    }

    return data;
  }

  const users = getCollection(KEYS.users);

  const duplicate = users.some(
    (user) =>
      user.email.toLowerCase() === email
  );

  if (duplicate) {
    throw new ApiError(
      "Email is already registered.",
      409
    );
  }

  const passwordHash = await hashPassword(password);

  const user = {
    id: Date.now(),
    name,
    email,
    passwordHash,
    role,
    created_at: new Date().toISOString()
  };

  users.push(user);

  writeStorage(KEYS.users, users);

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at
  };

  writeStorage(KEYS.session, safeUser);

  return mockDelay({
    user: safeUser
  });
}

export async function login(payload) {
  const email = payload?.email?.trim().toLowerCase();
  const password = payload?.password || "";

  if (!email || !password) {
    throw new ApiError(
      "Email and password are required.",
      400
    );
  }

  if (hasBackend()) {
    const data = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password
      })
    });

    if (data?.access_token) {
      localStorage.setItem(
        KEYS.token,
        data.access_token
      );
    }

    if (data?.user) {
      writeStorage(KEYS.session, data.user);
    }

    return data;
  }

  const passwordHash = await hashPassword(password);

  const user = getCollection(KEYS.users).find(
    (item) =>
      item.email.toLowerCase() === email &&
      item.passwordHash === passwordHash
  );

  if (!user) {
    throw new ApiError(
      "Invalid email or password.",
      401
    );
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at
  };

  writeStorage(KEYS.session, safeUser);

  return mockDelay({
    user: safeUser
  });
}

export function logout() {
  removeStorage(KEYS.session);
  removeStorage(KEYS.token);
}

export function currentUser() {
  return getSession();
}

// ============================================================
// RFQ VALIDATION
// ============================================================

function validateRFQ(payload) {
  const productName =
    payload?.product_name?.trim();

  const description =
    payload?.description?.trim();

  const location =
    payload?.delivery_location?.trim();

  const quantity = Number(payload?.quantity);

  const deadline = payload?.deadline;

  if (!productName || productName.length < 2) {
    throw new ApiError(
      "Product/service name must contain at least 2 characters.",
      400
    );
  }

  if (productName.length > 150) {
    throw new ApiError(
      "Product/service name cannot exceed 150 characters.",
      400
    );
  }

  if (!description || description.length < 10) {
    throw new ApiError(
      "Description must contain at least 10 characters.",
      400
    );
  }

  if (description.length > 5000) {
    throw new ApiError(
      "Description cannot exceed 5000 characters.",
      400
    );
  }

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw new ApiError(
      "Quantity must be greater than 0.",
      400
    );
  }

  if (!location) {
    throw new ApiError(
      "Delivery location is required.",
      400
    );
  }

  if (location.length > 255) {
    throw new ApiError(
      "Delivery location cannot exceed 255 characters.",
      400
    );
  }

  if (!deadline) {
    throw new ApiError(
      "RFQ deadline is required.",
      400
    );
  }

  if (deadline <= todayISO()) {
    throw new ApiError(
      "Deadline must be in the future.",
      400
    );
  }

  return true;
}

// ============================================================
// RFQ NORMALIZATION
// ============================================================

function normalizeRFQ(rfq) {
  if (!rfq) {
    return null;
  }

  const isExpired =
    rfq.deadline < todayISO();

  return {
    ...rfq,
    quantity: Number(rfq.quantity),
    status:
      rfq.status === "OPEN" && isExpired
        ? "CLOSED"
        : rfq.status
  };
}

// ============================================================
// RFQ LISTING
// ============================================================

export async function listRFQs({
  search = "",
  location = "",
  status = "OPEN"
} = {}) {
  if (hasBackend()) {
    const params = new URLSearchParams();

    if (search.trim()) {
      params.set("search", search.trim());
    }

    if (location.trim()) {
      params.set("location", location.trim());
    }

    if (status) {
      params.set("status", status);
    }

    const query = params.toString();

    const result = await request(
      `/api/rfqs${query ? `?${query}` : ""}`
    );

    return Array.isArray(result)
      ? result.map(normalizeRFQ)
      : result;
  }

  updateExpiredRFQs();

  let rfqs = getCollection(KEYS.rfqs)
    .map(normalizeRFQ);

  if (status) {
    rfqs = rfqs.filter(
      (item) => item.status === status
    );
  }

  const normalizedSearch =
    search.trim().toLowerCase();

  if (normalizedSearch) {
    rfqs = rfqs.filter((rfq) =>
      [
        rfq.product_name,
        rfq.description,
        rfq.delivery_location,
        rfq.buyer_name
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }

  const normalizedLocation =
    location.trim().toLowerCase();

  if (normalizedLocation) {
    rfqs = rfqs.filter((rfq) =>
      rfq.delivery_location
        .toLowerCase()
        .includes(normalizedLocation)
    );
  }

  return mockDelay(rfqs);
}

// ============================================================
// GET SINGLE RFQ
// ============================================================

export async function getRFQ(id) {
  if (hasBackend()) {
    return normalizeRFQ(
      await request(`/api/rfqs/${id}`)
    );
  }

  updateExpiredRFQs();

  const rfq = getCollection(KEYS.rfqs).find(
    (item) =>
      String(item.id) === String(id)
  );

  if (!rfq) {
    throw new ApiError(
      "RFQ not found.",
      404
    );
  }

  return mockDelay(
    normalizeRFQ(rfq)
  );
}

// ============================================================
// CREATE RFQ
// ============================================================

export async function createRFQ(payload) {
  const user = requireRole("BUYER");

  validateRFQ(payload);

  if (hasBackend()) {
    return request("/api/rfqs", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  const rfq = {
    id: Date.now(),
    buyer_id: user.id,
    buyer_name: user.name,
    product_name: payload.product_name.trim(),
    description: payload.description.trim(),
    quantity: Number(payload.quantity),
    delivery_location:
      payload.delivery_location.trim(),
    deadline: payload.deadline,
    status: "OPEN",
    created_at: new Date().toISOString()
  };

  const rfqs = getCollection(KEYS.rfqs);

  rfqs.unshift(rfq);

  writeStorage(KEYS.rfqs, rfqs);

  return mockDelay(
    normalizeRFQ(rfq)
  );
}

// ============================================================
// UPDATE RFQ
// ============================================================

export async function updateRFQ(id, payload) {
  const user = requireRole("BUYER");

  validateRFQ(payload);

  if (hasBackend()) {
    return request(`/api/rfqs/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  const rfqs = getCollection(KEYS.rfqs);

  const index = rfqs.findIndex(
    (item) =>
      String(item.id) === String(id)
  );

  if (index === -1) {
    throw new ApiError(
      "RFQ not found.",
      404
    );
  }

  if (rfqs[index].buyer_id !== user.id) {
    throw new ApiError(
      "You can only edit your own RFQs.",
      403
    );
  }

  if (rfqs[index].status === "CLOSED") {
    throw new ApiError(
      "Closed RFQs cannot be edited.",
      400
    );
  }

  rfqs[index] = {
    ...rfqs[index],
    product_name:
      payload.product_name.trim(),
    description:
      payload.description.trim(),
    quantity:
      Number(payload.quantity),
    delivery_location:
      payload.delivery_location.trim(),
    deadline: payload.deadline,
    updated_at:
      new Date().toISOString()
  };

  writeStorage(KEYS.rfqs, rfqs);

  return mockDelay(
    normalizeRFQ(rfqs[index])
  );
}

// ============================================================
// DELETE RFQ
// ============================================================

export async function deleteRFQ(id) {
  const user = requireRole("BUYER");

  if (hasBackend()) {
    return request(`/api/rfqs/${id}`, {
      method: "DELETE"
    });
  }

  const rfqs = getCollection(KEYS.rfqs);

  const rfq = rfqs.find(
    (item) =>
      String(item.id) === String(id)
  );

  if (!rfq) {
    throw new ApiError(
      "RFQ not found.",
      404
    );
  }

  if (rfq.buyer_id !== user.id) {
    throw new ApiError(
      "You can only delete your own RFQs.",
      403
    );
  }

  writeStorage(
    KEYS.rfqs,
    rfqs.filter(
      (item) =>
        String(item.id) !== String(id)
    )
  );

  writeStorage(
    KEYS.quotations,
    getCollection(
      KEYS.quotations
    ).filter(
      (quote) =>
        String(quote.rfq_id) !== String(id)
    )
  );

  return mockDelay({
    success: true
  });
}

// ============================================================
// BUYER RFQS
// ============================================================

export async function listBuyerRFQs() {
  const user = requireRole("BUYER");

  if (hasBackend()) {
    const result =
      await request("/api/buyer/rfqs");

    return Array.isArray(result)
      ? result.map(normalizeRFQ)
      : result;
  }

  updateExpiredRFQs();

  return mockDelay(
    getCollection(KEYS.rfqs)
      .filter(
        (rfq) =>
          rfq.buyer_id === user.id
      )
      .map(normalizeRFQ)
  );
}

// ============================================================
// QUOTATION VALIDATION
// ============================================================

function validateQuotation(payload) {
  const price =
    Number(payload?.quoted_price);

  const deliveryDays =
    Number(
      payload?.estimated_delivery_days
    );

  const message =
    payload?.message?.trim() || "";

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    throw new ApiError(
      "Quoted price must be a valid non-negative number.",
      400
    );
  }

  if (
    !Number.isInteger(deliveryDays) ||
    deliveryDays <= 0
  ) {
    throw new ApiError(
      "Estimated delivery time must be a positive number of days.",
      400
    );
  }

  if (message.length > 2000) {
    throw new ApiError(
      "Quotation message cannot exceed 2000 characters.",
      400
    );
  }
}

// ============================================================
// SUBMIT QUOTATION
// ============================================================

export async function submitQuotation(
  rfqId,
  payload
) {
  const user = requireRole("SUPPLIER");

  validateQuotation(payload);

  if (hasBackend()) {
    return request(
      `/api/rfqs/${rfqId}/quotations`,
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );
  }

  updateExpiredRFQs();

  const rfqs = getCollection(KEYS.rfqs);

  const rfq = rfqs.find(
    (item) =>
      String(item.id) === String(rfqId)
  );

  if (!rfq) {
    throw new ApiError(
      "RFQ not found.",
      404
    );
  }

  if (rfq.buyer_id === user.id) {
    throw new ApiError(
      "You cannot submit a quotation for your own RFQ.",
      403
    );
  }

  if (rfq.status !== "OPEN") {
    throw new ApiError(
      "This RFQ is closed.",
      400
    );
  }

  if (rfq.deadline < todayISO()) {
    throw new ApiError(
      "This RFQ deadline has expired.",
      400
    );
  }

  const quotations =
    getCollection(KEYS.quotations);

  const duplicate =
    quotations.some(
      (quote) =>
        Number(quote.rfq_id) ===
          Number(rfqId) &&
        Number(quote.supplier_id) ===
          Number(user.id)
    );

  if (duplicate) {
    throw new ApiError(
      "You already submitted a quotation for this RFQ.",
      409
    );
  }

  const quotation = {
    id: Date.now(),
    rfq_id: Number(rfqId),
    supplier_id: user.id,
    supplier_name: user.name,
    quoted_price:
      Number(payload.quoted_price),
    estimated_delivery_days:
      Number(
        payload.estimated_delivery_days
      ),
    message:
      payload.message?.trim() || "",
    created_at:
      new Date().toISOString()
  };

  quotations.unshift(quotation);

  writeStorage(
    KEYS.quotations,
    quotations
  );

  return mockDelay(quotation);
}

// ============================================================
// BUYER: VIEW RFQ QUOTATIONS
// ============================================================

export async function listRFQQuotations(
  rfqId
) {
  if (hasBackend()) {
    return request(
      `/api/rfqs/${rfqId}/quotations`
    );
  }

  const user = requireRole("BUYER");

  const rfq = getCollection(KEYS.rfqs).find(
    (item) =>
      String(item.id) === String(rfqId)
  );

  if (!rfq) {
    throw new ApiError(
      "RFQ not found.",
      404
    );
  }

  if (rfq.buyer_id !== user.id) {
    throw new ApiError(
      "You are not allowed to view these quotations.",
      403
    );
  }

  return mockDelay(
    getCollection(
      KEYS.quotations
    ).filter(
      (quote) =>
        Number(quote.rfq_id) ===
        Number(rfqId)
    )
  );
}

// ============================================================
// SUPPLIER: MY QUOTATIONS
// ============================================================

export async function listSupplierQuotations() {
  if (hasBackend()) {
    return request(
      "/api/supplier/quotations"
    );
  }

  const user =
    requireRole("SUPPLIER");

  const rfqs =
    getCollection(KEYS.rfqs);

  return mockDelay(
    getCollection(
      KEYS.quotations
    )
      .filter(
        (quote) =>
          Number(quote.supplier_id) ===
          Number(user.id)
      )
      .map((quote) => ({
        ...quote,
        rfq:
          rfqs.find(
            (rfq) =>
              Number(rfq.id) ===
              Number(quote.rfq_id)
          ) || null
      }))
  );
}

// ============================================================
// RFQ EXPIRY
// ============================================================

export async function updateExpiredRFQs() {
  if (hasBackend()) {
    return request(
      "/api/rfqs/expire",
      {
        method: "POST"
      }
    );
  }

  const rfqs =
    getCollection(KEYS.rfqs);

  let changed = false;

  const updatedRFQs = rfqs.map(
    (rfq) => {
      if (
        rfq.status === "OPEN" &&
        rfq.deadline < todayISO()
      ) {
        changed = true;

        return {
          ...rfq,
          status: "CLOSED",
          updated_at:
            new Date().toISOString()
        };
      }

      return rfq;
    }
  );

  if (changed) {
    writeStorage(
      KEYS.rfqs,
      updatedRFQs
    );
  }

  return {
    success: true,
    changed
  };
}

// ============================================================
// OPTIONAL UTILITY FUNCTIONS
// ============================================================

export function isAuthenticated() {
  return Boolean(getSession());
}

export function isBuyer() {
  return getSession()?.role === "BUYER";
}

export function isSupplier() {
  return getSession()?.role === "SUPPLIER";
}

export function getApiMode() {
  return hasBackend()
    ? "BACKEND"
    : "DEMO";
}

export function resetDemoData() {
  if (hasBackend()) {
    throw new ApiError(
      "Demo data reset is only available in GitHub Pages demo mode."
    );
  }

  removeStorage(KEYS.users);
  removeStorage(KEYS.rfqs);
  removeStorage(KEYS.quotations);
  removeStorage(KEYS.session);
  removeStorage(KEYS.token);

  initializeDemoData();
}

export {
  ApiError,
  getErrorMessage
};