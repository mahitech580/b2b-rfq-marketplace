
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Routes,
  Route,
  Link,
  useNavigate,
  Navigate,
  useParams
} from "react-router-dom";

import {
  currentUser,
  login,
  register,
  logout,
  listRFQs,
  getRFQ,
  createRFQ,
  updateRFQ,
  deleteRFQ,
  listBuyerRFQs,
  submitQuotation,
  listRFQQuotations,
  listSupplierQuotations,
  updateExpiredRFQs
} from "./api";

// ============================================================
// GLOBAL CONSTANTS
// ============================================================

const ROLES = {
  BUYER: "BUYER",
  SUPPLIER: "SUPPLIER"
};

// ============================================================
// GENERAL HELPERS
// ============================================================

function getHomePath(user) {
  if (!user) {
    return "/login";
  }

  return user.role === ROLES.BUYER
    ? "/buyer"
    : "/supplier";
}

function todayPlusOne() {
  const date = new Date();

  date.setDate(date.getDate() + 1);

  return date.toISOString().slice(0, 10);
}

function formatDate(date) {
  if (!date) {
    return "—";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2
  })}`;
}

// ============================================================
// LAYOUT
// ============================================================

function Layout({
  user,
  onLogout,
  children
}) {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] =
    useState(false);

  if (!user) {
    return children;
  }

  const isBuyer =
    user.role === ROLES.BUYER;

  const handleLogout = () => {
    logout();
    onLogout?.();
    setMenuOpen(false);
    navigate("/login", {
      replace: true
    });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link
          className="brand"
          to={
            isBuyer
              ? "/buyer"
              : "/supplier"
          }
          onClick={() =>
            setMenuOpen(false)
          }
        >
          <span className="brand-mark">
            R
          </span>

          <span>
            RFQ Marketplace
          </span>
        </Link>

        <button
          type="button"
          className="mobile-menu-button"
          onClick={() =>
            setMenuOpen(
              (current) => !current
            )
          }
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          ☰
        </button>

        <nav
          className={`nav-links ${
            menuOpen ? "open" : ""
          }`}
          aria-label="Primary navigation"
        >
          {isBuyer ? (
            <>
              <Link
                to="/buyer"
                onClick={() =>
                  setMenuOpen(false)
                }
              >
                Dashboard
              </Link>

              <Link
                to="/buyer/rfqs/new"
                onClick={() =>
                  setMenuOpen(false)
                }
              >
                Create RFQ
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/supplier"
                onClick={() =>
                  setMenuOpen(false)
                }
              >
                Browse RFQs
              </Link>

              <Link
                to="/supplier/quotations"
                onClick={() =>
                  setMenuOpen(false)
                }
              >
                My Quotations
              </Link>
            </>
          )}
        </nav>

        <div className="user-menu">
          <div
            className="avatar"
            aria-hidden="true"
          >
            {user.name
              ?.charAt(0)
              ?.toUpperCase() || "U"}
          </div>

          <div className="user-summary">
            <span>
              {user.name}
            </span>

            <span className="role-pill">
              {user.role}
            </span>
          </div>

          <button
            type="button"
            className="ghost-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="page">
        {children}
      </main>
    </div>
  );
}

// ============================================================
// PROTECTED ROUTE
// ============================================================

function Protected({
  role,
  children
}) {
  const user = currentUser();

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (
    role &&
    user.role !== role
  ) {
    return (
      <Navigate
        to={getHomePath(user)}
        replace
      />
    );
  }

  return children;
}

// ============================================================
// AUTH PAGE
// ============================================================

function AuthPage({
  mode,
  onAuth
}) {
  const navigate = useNavigate();

  const isRegister =
    mode === "register";

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [form, setForm] =
    useState({
      name: "",
      email: "",
      password: "",
      role: ROLES.BUYER
    });

  const updateField = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = isRegister
        ? await register(form)
        : await login({
            email: form.email,
            password: form.password
          });

      if (!data?.user) {
        throw new Error(
          "Authentication response is invalid."
        );
      }

      onAuth(data.user);

      navigate(
        getHomePath(data.user),
        { replace: true }
      );
    } catch (error) {
      setError(
        error?.message ||
          "Authentication failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark large">
            R
          </span>

          <div>
            <div className="eyebrow">
              B2B PROCUREMENT
            </div>

            <h1>
              RFQ Marketplace
            </h1>
          </div>
        </div>

        <p className="muted">
          {isRegister
            ? "Create your account to post RFQs or submit supplier quotations."
            : "Sign in to manage RFQs and supplier quotations."}
        </p>

        {error && (
          <div
            className="alert error"
            role="alert"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={submit}
          className="form-grid"
          noValidate
        >
          {isRegister && (
            <Field label="Full name">
              <input
                required
                autoComplete="name"
                value={form.name}
                onChange={(event) =>
                  updateField(
                    "name",
                    event.target.value
                  )
                }
                placeholder="Kondaveeti Sai Mahendra"
              />
            </Field>
          )}

          <Field label="Email">
            <input
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) =>
                updateField(
                  "email",
                  event.target.value
                )
              }
              placeholder="you@company.com"
            />
          </Field>

          <Field label="Password">
            <input
              required
              type="password"
              minLength={8}
              autoComplete={
                isRegister
                  ? "new-password"
                  : "current-password"
              }
              value={form.password}
              onChange={(event) =>
                updateField(
                  "password",
                  event.target.value
                )
              }
              placeholder="Minimum 8 characters"
            />
          </Field>

          {isRegister && (
            <Field label="Account role">
              <select
                value={form.role}
                onChange={(event) =>
                  updateField(
                    "role",
                    event.target.value
                  )
                }
              >
                <option value="BUYER">
                  Buyer
                </option>

                <option value="SUPPLIER">
                  Supplier
                </option>
              </select>
            </Field>
          )}

          <button
            className="primary full"
            disabled={loading}
            type="submit"
          >
            {loading
              ? "Please wait…"
              : isRegister
              ? "Create account"
              : "Sign in"}
          </button>
        </form>

        <div className="auth-switch">
          {isRegister
            ? "Already have an account?"
            : "New to the marketplace?"}{" "}
          <Link
            to={
              isRegister
                ? "/login"
                : "/register"
            }
          >
            {isRegister
              ? "Sign in"
              : "Create account"}
          </Link>
        </div>

        <div className="demo-box">
          <b>
            Demo accounts
          </b>

          <span>
            Buyer: buyer@demo.com /
            Buyer@123
          </span>

          <span>
            Supplier: supplier@demo.com /
            Supplier@123
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// REUSABLE UI
// ============================================================

function Field({
  label,
  children
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function PageTitle({
  title,
  subtitle,
  action
}) {
  return (
    <div className="page-title">
      <div>
        <h2>{title}</h2>

        {subtitle && (
          <p>{subtitle}</p>
        )}
      </div>

      {action}
    </div>
  );
}

function Stat({
  label,
  value
}) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Empty({
  title,
  body,
  action
}) {
  return (
    <div className="empty">
      <div
        className="empty-icon"
        aria-hidden="true"
      >
        ∅
      </div>

      <h3>{title}</h3>

      <p>{body}</p>

      {action}
    </div>
  );
}

function Loading({
  message = "Loading…"
}) {
  return (
    <div
      className="loading"
      role="status"
      aria-live="polite"
    >
      <span
        className="spinner"
        aria-hidden="true"
      />

      {message}
    </div>
  );
}

function Info({
  label,
  value
}) {
  return (
    <div className="info">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

// ============================================================
// BUYER DASHBOARD
// ============================================================

function BuyerDashboard() {
  const navigate = useNavigate();

  const [rfqs, setRfqs] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const user = currentUser();

  const load = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        await updateExpiredRFQs();

        const data =
          await listBuyerRFQs();

        setRfqs(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        setError(
          error?.message ||
            "Unable to load your RFQs."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const openRFQs =
    rfqs.filter(
      (rfq) =>
        rfq.status === "OPEN"
    ).length;

  const closedRFQs =
    rfqs.length - openRFQs;

  return (
    <Layout
      user={user}
      onLogout={() =>
        navigate("/login", {
          replace: true
        })
      }
    >
      <PageTitle
        title="Buyer dashboard"
        subtitle="Create and manage requests for quotation."
        action={
          <Link
            className="primary"
            to="/buyer/rfqs/new"
          >
            + Create RFQ
          </Link>
        }
      />

      <div className="stats">
        <Stat
          label="Total RFQs"
          value={rfqs.length}
        />

        <Stat
          label="Open RFQs"
          value={openRFQs}
        />

        <Stat
          label="Closed RFQs"
          value={closedRFQs}
        />
      </div>

      {error && (
        <div
          className="alert error"
          role="alert"
        >
          {error}
        </div>
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>My RFQs</h3>
            <p>
              Requests you have posted.
            </p>
          </div>

          <button
            type="button"
            className="secondary"
            onClick={load}
            disabled={loading}
          >
            {loading
              ? "Refreshing…"
              : "Refresh"}
          </button>
        </div>

        {loading ? (
          <Loading />
        ) : rfqs.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    Product / service
                  </th>
                  <th>
                    Quantity
                  </th>
                  <th>
                    Location
                  </th>
                  <th>
                    Deadline
                  </th>
                  <th>
                    Status
                  </th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {rfqs.map((rfq) => (
                  <tr key={rfq.id}>
                    <td>
                      <b>
                        {rfq.product_name}
                      </b>

                      <small>
                        {rfq.description}
                      </small>
                    </td>

                    <td>
                      {rfq.quantity}
                    </td>

                    <td>
                      {rfq.delivery_location}
                    </td>

                    <td>
                      {formatDate(
                        rfq.deadline
                      )}
                    </td>

                    <td>
                      <span
                        className={`status ${
                          rfq.status.toLowerCase()
                        }`}
                      >
                        {rfq.status}
                      </span>
                    </td>

                    <td>
                      <Link
                        className="text-link"
                        to={`/buyer/rfqs/${rfq.id}`}
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No RFQs yet"
            body="Create your first RFQ and start collecting supplier quotations."
            action={
              <Link
                className="primary"
                to="/buyer/rfqs/new"
              >
                Create your first RFQ
              </Link>
            }
          />
        )}
      </section>
    </Layout>
  );
}

// ============================================================
// BUYER RFQ FORM
// ============================================================

function RFQForm({
  edit = false
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] =
    useState(edit);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [form, setForm] =
    useState({
      product_name: "",
      description: "",
      quantity: "",
      delivery_location: "",
      deadline: ""
    });

  const user = currentUser();

  useEffect(() => {
    if (!edit) {
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const rfq =
          await getRFQ(id);

        if (!mounted) {
          return;
        }

        setForm({
          product_name:
            rfq.product_name || "",
          description:
            rfq.description || "",
          quantity:
            rfq.quantity || "",
          delivery_location:
            rfq.delivery_location ||
            "",
          deadline:
            rfq.deadline || ""
        });
      } catch (error) {
        if (mounted) {
          setError(
            error?.message ||
              "Unable to load RFQ."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [edit, id]);

  const updateField = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const submit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setSaving(true);

    try {
      if (edit) {
        await updateRFQ(
          id,
          form
        );
      } else {
        await createRFQ(form);
      }

      navigate("/buyer", {
        replace: true
      });
    } catch (error) {
      setError(
        error?.message ||
          "Unable to save RFQ."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout
        user={user}
        onLogout={() =>
          navigate("/login")
        }
      >
        <Loading />
      </Layout>
    );
  }

  return (
    <Layout
      user={user}
      onLogout={() =>
        navigate("/login")
      }
    >
      <PageTitle
        title={
          edit
            ? "Edit RFQ"
            : "Create RFQ"
        }
        subtitle="Give suppliers the information they need to respond accurately."
      />

      <section className="panel narrow">
        <div className="panel-head">
          <div>
            <h3>
              Requirement details
            </h3>
          </div>
        </div>

        {error && (
          <div
            className="alert error"
            role="alert"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={submit}
          className="form-grid two-col"
          noValidate
        >
          <Field label="Product / service name">
            <input
              required
              maxLength={150}
              value={form.product_name}
              onChange={(event) =>
                updateField(
                  "product_name",
                  event.target.value
                )
              }
              placeholder="e.g. Business laptops"
            />
          </Field>

          <Field label="Quantity">
            <input
              required
              type="number"
              min="1"
              step="1"
              value={form.quantity}
              onChange={(event) =>
                updateField(
                  "quantity",
                  event.target.value
                )
              }
              placeholder="50"
            />
          </Field>

          <Field label="Delivery location">
            <input
              required
              maxLength={255}
              value={
                form.delivery_location
              }
              onChange={(event) =>
                updateField(
                  "delivery_location",
                  event.target.value
                )
              }
              placeholder="Hyderabad, Telangana"
            />
          </Field>

          <Field label="RFQ deadline">
            <input
              required
              type="date"
              min={todayPlusOne()}
              value={form.deadline}
              onChange={(event) =>
                updateField(
                  "deadline",
                  event.target.value
                )
              }
            />
          </Field>

          <div className="field full-span">
            <span>Description</span>

            <textarea
              required
              minLength={10}
              maxLength={5000}
              rows={6}
              value={
                form.description
              }
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value
                )
              }
              placeholder="Describe the specification, quality, packaging or service requirements."
            />

            <small>
              {form.description.length}
              /5000 characters
            </small>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="secondary"
              onClick={() =>
                navigate("/buyer")
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary"
              disabled={saving}
            >
              {saving
                ? "Saving…"
                : edit
                ? "Save changes"
                : "Publish RFQ"}
            </button>
          </div>
        </form>
      </section>
    </Layout>
  );
}

// ============================================================
// BUYER RFQ DETAILS
// ============================================================

function BuyerRFQDetails() {
  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const [rfq, setRfq] =
    useState(null);

  const [quotes, setQuotes] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const user = currentUser();

  const load =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const [rfqData, quotesData] =
          await Promise.all([
            getRFQ(id),
            listRFQQuotations(id)
          ]);

        setRfq(rfqData);

        setQuotes(
          Array.isArray(quotesData)
            ? quotesData
            : []
        );
      } catch (error) {
        setError(
          error?.message ||
            "Unable to load RFQ."
        );
      } finally {
        setLoading(false);
      }
    }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async () => {
    const confirmed =
      window.confirm(
        "Delete this RFQ? This will also remove its quotations."
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteRFQ(id);

      navigate("/buyer", {
        replace: true
      });
    } catch (error) {
      setError(
        error?.message ||
          "Unable to delete RFQ."
      );
    }
  };

  if (loading) {
    return (
      <Layout
        user={user}
        onLogout={() =>
          navigate("/login")
        }
      >
        <Loading />
      </Layout>
    );
  }

  if (!rfq) {
    return (
      <Layout
        user={user}
        onLogout={() =>
          navigate("/login")
        }
      >
        <div
          className="alert error"
          role="alert"
        >
          {error ||
            "RFQ not found."}
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      user={user}
      onLogout={() =>
        navigate("/login")
      }
    >
      <PageTitle
        title={rfq.product_name}
        subtitle={`Posted ${formatDate(
          rfq.created_at
        )}`}
        action={
          <div className="button-row">
            <Link
              className="secondary"
              to={`/buyer/rfqs/${id}/edit`}
            >
              Edit
            </Link>

            <button
              type="button"
              className="danger"
              onClick={remove}
            >
              Delete
            </button>
          </div>
        }
      />

      {error && (
        <div
          className="alert error"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="detail-grid">
        <section className="panel">
          <div className="detail-top">
            <span
              className={`status ${
                rfq.status.toLowerCase()
              }`}
            >
              {rfq.status}
            </span>

            <span>
              Deadline:{" "}
              <b>
                {formatDate(
                  rfq.deadline
                )}
              </b>
            </span>
          </div>

          <p className="detail-description">
            {rfq.description}
          </p>

          <div className="info-grid">
            <Info
              label="Quantity"
              value={rfq.quantity}
            />

            <Info
              label="Delivery location"
              value={
                rfq.delivery_location
              }
            />
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>
                Received quotations
              </h3>

              <p>
                {quotes.length} supplier
                {quotes.length === 1
                  ? ""
                  : "s"} response
                {quotes.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            <button
              type="button"
              className="secondary"
              onClick={load}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          {quotes.length ? (
            <div className="quote-list">
              {quotes.map(
                (quote) => (
                  <div
                    className="quote-card"
                    key={quote.id}
                  >
                    <div className="quote-head">
                      <b>
                        {
                          quote.supplier_name
                        }
                      </b>

                      <strong>
                        {formatCurrency(
                          quote.quoted_price
                        )}
                      </strong>
                    </div>

                    <div className="quote-meta">
                      Delivery in{" "}
                      {
                        quote.estimated_delivery_days
                      }{" "}
                      days
                    </div>

                    <p>
                      {quote.message ||
                        "No notes provided."}
                    </p>
                  </div>
                )
              )}
            </div>
          ) : (
            <Empty
              title="No quotations yet"
              body="Supplier responses will appear here after they quote on this RFQ."
            />
          )}
        </section>
      </div>
    </Layout>
  );
}

// ============================================================
// SUPPLIER DASHBOARD
// ============================================================

function SupplierDashboard() {
  const navigate =
    useNavigate();

  const [rfqs, setRfqs] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [locationFilter, setLocationFilter] =
    useState("");

  const user = currentUser();

  const load = useCallback(
    async (
      overrideSearch = search,
      overrideLocation =
        locationFilter
    ) => {
      setLoading(true);
      setError("");

      try {
        await updateExpiredRFQs();

        const data =
          await listRFQs({
            search:
              overrideSearch.trim(),
            location:
              overrideLocation.trim(),
            status: "OPEN"
          });

        setRfqs(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        setError(
          error?.message ||
            "Unable to load RFQs."
        );
      } finally {
        setLoading(false);
      }
    },
    [search, locationFilter]
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => {
    load(search, locationFilter);
  };

  const handleClearFilters =
    () => {
      setSearch("");
      setLocationFilter("");
      load("", "");
    };

  return (
    <Layout
      user={user}
      onLogout={() =>
        navigate("/login", {
          replace: true
        })
      }
    >
      <PageTitle
        title="Browse RFQs"
        subtitle="Discover open business requirements and submit quotations."
      />

      <section className="filterbar">
        <div className="field">
          <span>Search</span>

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter"
              ) {
                handleSearch();
              }
            }}
            placeholder="Laptop, packaging, software…"
          />
        </div>

        <div className="field">
          <span>Location</span>

          <input
            value={locationFilter}
            onChange={(event) =>
              setLocationFilter(
                event.target.value
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter"
              ) {
                handleSearch();
              }
            }}
            placeholder="Hyderabad"
          />
        </div>

        <button
          type="button"
          className="primary align-end"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading
            ? "Searching…"
            : "Search"}
        </button>

        <button
          type="button"
          className="secondary align-end"
          onClick={
            handleClearFilters
          }
          disabled={
            loading &&
            !search &&
            !locationFilter
          }
        >
          Clear
        </button>
      </section>

      {error && (
        <div
          className="alert error"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading ? (
        <Loading />
      ) : rfqs.length ? (
        <div className="rfq-grid">
          {rfqs.map((rfq) => (
            <article
              className="rfq-card"
              key={rfq.id}
            >
              <div className="card-row">
                <span className="status open">
                  OPEN
                </span>

                <span className="deadline">
                  Due{" "}
                  {formatDate(
                    rfq.deadline
                  )}
                </span>
              </div>

              <h3>
                {rfq.product_name}
              </h3>

              <p>
                {rfq.description}
              </p>

              <div className="rfq-meta">
                <span>
                  <b>Qty</b>
                  {rfq.quantity}
                </span>

                <span>
                  <b>Location</b>
                  {
                    rfq.delivery_location
                  }
                </span>
              </div>

              <Link
                className="primary full"
                to={`/supplier/rfqs/${rfq.id}`}
              >
                View RFQ
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel">
          <Empty
            title="No matching RFQs"
            body="Try a different keyword or location."
            action={
              <button
                type="button"
                className="secondary"
                onClick={
                  handleClearFilters
                }
              >
                Clear filters
              </button>
            }
          />
        </div>
      )}
    </Layout>
  );
}

// ============================================================
// SUPPLIER RFQ DETAILS
// ============================================================

function SupplierRFQDetails() {
  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const [rfq, setRfq] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [form, setForm] =
    useState({
      quoted_price: "",
      estimated_delivery_days:
        "",
      message: ""
    });

  const user = currentUser();

  const load =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const data =
          await getRFQ(id);

        setRfq(data);
      } catch (error) {
        setError(
          error?.message ||
            "Unable to load RFQ."
        );
      } finally {
        setLoading(false);
      }
    }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const updateField = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const submit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setSaving(true);

    try {
      await submitQuotation(
        id,
        form
      );

      navigate(
        "/supplier/quotations",
        { replace: true }
      );
    } catch (error) {
      setError(
        error?.message ||
          "Unable to submit quotation."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout
        user={user}
        onLogout={() =>
          navigate("/login")
        }
      >
        <Loading />
      </Layout>
    );
  }

  if (!rfq) {
    return (
      <Layout
        user={user}
        onLogout={() =>
          navigate("/login")
        }
      >
        <div
          className="alert error"
          role="alert"
        >
          {error ||
            "RFQ not found."}
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      user={user}
      onLogout={() =>
        navigate("/login")
      }
    >
      <Link
        className="back-link"
        to="/supplier"
      >
        ← Back to RFQs
      </Link>

      <div className="detail-grid supplier-detail">
        <section className="panel">
          <div className="detail-top">
            <span
              className={`status ${
                rfq.status.toLowerCase()
              }`}
            >
              {rfq.status}
            </span>

            <span>
              Deadline:{" "}
              <b>
                {formatDate(
                  rfq.deadline
                )}
              </b>
            </span>
          </div>

          <h2>
            {rfq.product_name}
          </h2>

          <p className="detail-description">
            {rfq.description}
          </p>

          <div className="info-grid">
            <Info
              label="Quantity"
              value={rfq.quantity}
            />

            <Info
              label="Delivery location"
              value={
                rfq.delivery_location
              }
            />

            <Info
              label="Deadline"
              value={formatDate(
                rfq.deadline
              )}
            />

            <Info
              label="Buyer"
              value={
                rfq.buyer_name ||
                "Business buyer"
              }
            />
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>
                Submit quotation
              </h3>

              <p>
                Provide a clear commercial response.
              </p>
            </div>
          </div>

          {error && (
            <div
              className="alert error"
              role="alert"
            >
              {error}
            </div>
          )}

          <form
            onSubmit={submit}
            className="form-grid"
            noValidate
          >
            <Field label="Quoted price (₹)">
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={
                  form.quoted_price
                }
                onChange={(event) =>
                  updateField(
                    "quoted_price",
                    event.target.value
                  )
                }
                placeholder="250000"
              />
            </Field>

            <Field label="Estimated delivery (days)">
              <input
                required
                type="number"
                min="1"
                step="1"
                value={
                  form.estimated_delivery_days
                }
                onChange={(event) =>
                  updateField(
                    "estimated_delivery_days",
                    event.target.value
                  )
                }
                placeholder="7"
              />
            </Field>

            <div className="field full-span">
              <span>
                Message / notes
              </span>

              <textarea
                rows={6}
                maxLength={2000}
                value={form.message}
                onChange={(event) =>
                  updateField(
                    "message",
                    event.target.value
                  )
                }
                placeholder="Include lead-time, warranty, commercial notes or assumptions."
              />

              <small>
                {form.message.length}
                /2000 characters
              </small>
            </div>

            <button
              type="submit"
              className="primary full"
              disabled={
                saving ||
                rfq.status !== "OPEN"
              }
            >
              {saving
                ? "Submitting…"
                : rfq.status !== "OPEN"
                ? "RFQ closed"
                : "Submit quotation"}
            </button>
          </form>
        </section>
      </div>
    </Layout>
  );
}

// ============================================================
// SUPPLIER QUOTATIONS
// ============================================================

function SupplierQuotations() {
  const navigate =
    useNavigate();

  const [quotes, setQuotes] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const user = currentUser();

  const load =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const data =
          await listSupplierQuotations();

        setQuotes(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        setError(
          error?.message ||
            "Unable to load your quotations."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Layout
      user={user}
      onLogout={() =>
        navigate("/login", {
          replace: true
        })
      }
    >
      <PageTitle
        title="My quotations"
        subtitle="Track the quotations you have submitted."
        action={
          <button
            type="button"
            className="secondary"
            onClick={load}
            disabled={loading}
          >
            {loading
              ? "Refreshing…"
              : "Refresh"}
          </button>
        }
      />

      {error && (
        <div
          className="alert error"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading ? (
        <Loading />
      ) : quotes.length ? (
        <div className="quote-table">
          {quotes.map((quote) => (
            <div
              className="panel quote-row"
              key={quote.id}
            >
              <div>
                <span className="eyebrow">
                  RFQ
                </span>

                <h3>
                  {quote.rfq?.product_name ||
                    `RFQ #${quote.rfq_id}`}
                </h3>

                <span className="muted">
                  {quote.rfq
                    ?.delivery_location ||
                    ""}
                </span>
              </div>

              <div>
                <span className="eyebrow">
                  PRICE
                </span>

                <strong>
                  {formatCurrency(
                    quote.quoted_price
                  )}
                </strong>
              </div>

              <div>
                <span className="eyebrow">
                  DELIVERY
                </span>

                <b>
                  {
                    quote.estimated_delivery_days
                  }{" "}
                  days
                </b>
              </div>

              <div>
                <span className="eyebrow">
                  SUBMITTED
                </span>

                <span>
                  {formatDate(
                    quote.created_at
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel">
          <Empty
            title="No quotations submitted"
            body="Open an RFQ and submit your first supplier quotation."
            action={
              <Link
                className="primary"
                to="/supplier"
              >
                Browse RFQs
              </Link>
            }
          />
        </div>
      )}
    </Layout>
  );
}

// ============================================================
// APPLICATION
// ============================================================

export default function App() {
  const [user, setUser] =
    useState(
      currentUser()
    );

  const homePath = useMemo(
    () => getHomePath(user),
    [user]
  );

  const handleAuth = (
    authenticatedUser
  ) => {
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to={homePath}
            replace
          />
        }
      />

      <Route
        path="/login"
        element={
          user ? (
            <Navigate
              to={homePath}
              replace
            />
          ) : (
            <AuthPage
              mode="login"
              onAuth={
                handleAuth
              }
            />
          )
        }
      />

      <Route
        path="/register"
        element={
          user ? (
            <Navigate
              to={homePath}
              replace
            />
          ) : (
            <AuthPage
              mode="register"
              onAuth={
                handleAuth
              }
            />
          )
        }
      />

      <Route
        path="/buyer"
        element={
          <Protected
            role={ROLES.BUYER}
          >
            <BuyerDashboard />
          </Protected>
        }
      />

      <Route
        path="/buyer/rfqs/new"
        element={
          <Protected
            role={ROLES.BUYER}
          >
            <RFQForm />
          </Protected>
        }
      />

      <Route
        path="/buyer/rfqs/:id"
        element={
          <Protected
            role={ROLES.BUYER}
          >
            <BuyerRFQDetails />
          </Protected>
        }
      />

      <Route
        path="/buyer/rfqs/:id/edit"
        element={
          <Protected
            role={ROLES.BUYER}
          >
            <RFQForm edit />
          </Protected>
        }
      />

      <Route
        path="/supplier"
        element={
          <Protected
            role={ROLES.SUPPLIER}
          >
            <SupplierDashboard />
          </Protected>
        }
      />

      <Route
        path="/supplier/rfqs/:id"
        element={
          <Protected
            role={ROLES.SUPPLIER}
          >
            <SupplierRFQDetails />
          </Protected>
        }
      />

      <Route
        path="/supplier/quotations"
        element={
          <Protected
            role={ROLES.SUPPLIER}
          >
            <SupplierQuotations />
          </Protected>
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to={homePath}
            replace
          />
        }
      />
    </Routes>
  );
}
