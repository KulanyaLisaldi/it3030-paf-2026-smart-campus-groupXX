import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getResources } from "../api/resources";
import { getAuthToken } from "../api/http";

const pageStyle = { width: "100%", margin: 0, padding: 0, boxSizing: "border-box", overflowX: "hidden" };
const contentWrapStyle = { width: "100%", margin: 0, padding: "24px 24px 44px", boxSizing: "border-box" };
const panelStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
  padding: 16,
};
const inputStyle = {
  width: "100%",
  height: 44,
  padding: "0 12px",
  borderRadius: 10,
  border: "1px solid #dbe4ee",
  boxSizing: "border-box",
  outline: "none",
  background: "#fff",
  color: "#0f172a",
  fontSize: 14,
};
const cardGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16, marginTop: 16 };
const cardStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  background: "#fff",
  padding: 16,
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
  display: "flex",
  flexDirection: "column",
  minHeight: 240,
};
const quickTypeCardsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginTop: 14,
};
const heroWrapStyle = {
  position: "relative",
  width: "100%",
  minHeight: "min(52vh, 560px)",
  maxHeight: "70vh",
};
const heroImgStyle = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center",
  display: "block",
};
const heroOverlayStyle = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(to top, rgba(15, 23, 42, 0.75) 0%, rgba(15, 23, 42, 0.35) 45%, rgba(15, 23, 42, 0.2) 100%)",
  display: "flex",
  alignItems: "flex-end",
  padding: "clamp(20px, 4vw, 48px)",
  boxSizing: "border-box",
};

function statusBadge(status) {
  const s = String(status || "").toUpperCase();
  const active = s === "ACTIVE";
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    border: active ? "1px solid #86efac" : "1px solid #fecaca",
    background: active ? "#f0fdf4" : "#fef2f2",
    color: active ? "#166534" : "#991b1b",
    fontSize: 11,
    fontWeight: 900,
  };
}

function normalizeResources(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.resources)) return payload.resources;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

function formatResourceType(type) {
  if (!type) return "Uncategorized";
  return String(type)
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ResourcesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resources, setResources] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [minCapacity, setMinCapacity] = useState("");
  const [location, setLocation] = useState("");
  const resultsAnchorRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getResources({
          type: typeFilter,
          status: statusFilter,
          minCapacity: minCapacity === "" ? undefined : Number(minCapacity),
          location,
        });
        setResources(normalizeResources(data));
      } catch (e) {
        setResources([]);
        setError(e?.message || "Could not load resources.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [typeFilter, statusFilter, minCapacity, location]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resources.filter((r) => {
      if (!q) return true;
      const hay = `${r.name || ""} ${r.resourceName || ""} ${r.code || ""} ${r.resourceCode || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [resources, search]);

  const resourcesByType = useMemo(() => {
    return filtered.reduce((acc, resource) => {
      const typeKey = resource?.type || "UNSPECIFIED";
      if (!acc[typeKey]) acc[typeKey] = [];
      acc[typeKey].push(resource);
      return acc;
    }, {});
  }, [filtered]);

  const orderedTypeKeys = useMemo(() => {
    return Object.keys(resourcesByType).sort((a, b) => formatResourceType(a).localeCompare(formatResourceType(b)));
  }, [resourcesByType]);

  const quickTypeCards = [
    { key: "LAB", title: "Lab", subtitle: "Hands-on learning spaces", image: "/resource lab.jpeg" },
    { key: "LECTURE_HALL", title: "Lecture Hall", subtitle: "Large-capacity teaching halls", image: "/resource lec.jpeg" },
    { key: "MEETING_ROOM", title: "Meeting Room", subtitle: "Discussion and teamwork rooms", image: "/resource meeting.jpg" },
    { key: "EQUIPMENT", title: "Projector", subtitle: "Projectors and related equipment", image: "/resource proj.jpeg" },
  ];

  const handleQuickTypeSelect = (type) => {
    setTypeFilter(type);
    resultsAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleBook = (resource) => {
    if (!getAuthToken()) {
      navigate("/signin");
      return;
    }
    navigate(`/book-resource?resourceId=${encodeURIComponent(resource.id || "")}`);
  };

  return (
    <main style={{ flex: 1, background: "#f8fafc" }}>
      <div style={pageStyle}>
        <section style={heroWrapStyle} aria-label="Campus resources">
          <img src="/resource hero.jpeg" alt="Campus resources overview" style={heroImgStyle} />
          <div style={heroOverlayStyle}>
            <div style={{ width: "100%", maxWidth: 1240, margin: "0 auto" }}>
              <h1 style={{ margin: 0, color: "#FFFFFF", fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 900, lineHeight: 1.15 }}>
                Discover <span style={{ color: "#FA8112" }}>Campus Resources</span>
              </h1>
              <p style={{ margin: "12px 0 0", color: "rgba(255,255,255,0.95)", fontSize: "clamp(14px, 2vw, 17px)", maxWidth: 760, lineHeight: 1.6 }}>
                "Great campuses are not built only with buildings, but with spaces that empower ideas, collaboration, and discovery."
              </p>
              <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.9)", fontSize: 14, maxWidth: 680 }}>
                Choose a category below to instantly filter resources and find what you need.
              </p>
            </div>
          </div>
        </section>

        <div style={contentWrapStyle}>
          <section style={panelStyle}>
          <div style={quickTypeCardsStyle}>
            {quickTypeCards.map((item) => {
              const active = typeFilter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleQuickTypeSelect(item.key)}
                  style={{
                    position: "relative",
                    textAlign: "center",
                    borderRadius: 12,
                    border: active ? "2px solid #fb923c" : "1px solid #e2e8f0",
                    background: "#ffffff",
                    padding: 0,
                    cursor: "pointer",
                    boxShadow: active ? "0 10px 26px rgba(251, 146, 60, 0.28)" : "0 8px 20px rgba(15, 23, 42, 0.06)",
                    overflow: "hidden",
                    minHeight: 150,
                  }}
                >
                  <div style={{ position: "absolute", inset: 0 }}>
                    <img src={item.image} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: active
                        ? "linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.28))"
                        : "linear-gradient(to top, rgba(0,0,0,0.64), rgba(0,0,0,0.22))",
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "10px",
                    }}
                  >
                    <div style={{ color: "#ffffff", fontSize: 18, fontWeight: 900, textAlign: "center", textShadow: "0 2px 10px rgba(0,0,0,0.45)" }}>{item.title}</div>
                    <div style={{ color: "rgba(255,255,255,0.95)", fontSize: 12, fontWeight: 600, textAlign: "center", textShadow: "0 1px 8px rgba(0,0,0,0.45)" }}>{item.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>
          </section>

          <div ref={resultsAnchorRef} style={{ ...panelStyle, marginTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <input style={{ ...inputStyle, gridColumn: "span 2" }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by resource name or code" />
            <select style={inputStyle} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="ALL">All Types</option>
              <option value="LECTURE_HALL">Lecture Hall</option>
              <option value="LAB">Lab</option>
              <option value="MEETING_ROOM">Meeting Room</option>
              <option value="EQUIPMENT">Equipment</option>
            </select>
            <input style={inputStyle} value={minCapacity} onChange={(e) => setMinCapacity(e.target.value.replace(/[^\d]/g, ""))} placeholder="Capacity >=" />
            <select style={inputStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
            </select>
            <input style={inputStyle} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Filter by location" />
          </div>
          </div>

          {loading && <p style={{ color: "#64748b", fontWeight: 700 }}>Loading resources...</p>}
          {!loading && error && <p style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</p>}

          {!loading && filtered.length === 0 && (
            <div style={{ ...cardStyle, marginTop: 16 }}>No resources found.</div>
          )}

          {!loading && filtered.length > 0 && (
            <div style={{ marginTop: 16, display: "grid", gap: 18 }}>
              {orderedTypeKeys.map((typeKey) => (
                <section key={typeKey} aria-label={`${formatResourceType(typeKey)} resources`}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <h2 style={{ margin: 0, color: "#14213D", fontSize: 18, fontWeight: 900 }}>{formatResourceType(typeKey)}</h2>
                    <span style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>{resourcesByType[typeKey].length} item(s)</span>
                  </div>
                  <div style={{ ...cardGridStyle, marginTop: 0 }}>
                    {resourcesByType[typeKey].map((r) => (
                      <article key={r.id || r.code} style={cardStyle}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                          <div>
                            <h3 style={{ margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 900 }}>{r.name || r.resourceName || "—"}</h3>
                            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12, fontWeight: 700 }}>{r.code || r.resourceCode || "—"}</p>
                          </div>
                          <span style={statusBadge(r.status)}>{r.status || "—"}</span>
                        </div>

                        <div style={{ display: "grid", gap: 8, fontSize: 13, color: "#334155", marginTop: 12 }}>
                          <div><strong>Type:</strong> {r.type || "—"}</div>
                          <div><strong>Capacity:</strong> {r.capacity ?? "—"}</div>
                          <div><strong>Location:</strong> {r.location || "—"}</div>
                          <div><strong>Availability:</strong> {r.availability || r.availabilityText || "—"}</div>
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: "auto", paddingTop: 14 }}>
                          <button
                            type="button"
                            style={{ flex: 1, height: 42, padding: "0 12px", borderRadius: 10, border: "1px solid #dbe4ee", background: "#fff", fontWeight: 800, cursor: "pointer", color: "#0f172a" }}
                            onClick={() => navigate(`/resources/${encodeURIComponent(r.id || "")}`)}
                            disabled={!r.id}
                          >
                            View Details
                          </button>
                          <button
                            type="button"
                            style={{ flex: 1, height: 42, padding: "0 12px", borderRadius: 10, border: "none", background: "#FA8112", color: "#fff", fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 20px rgba(250,129,18,0.28)" }}
                            onClick={() => handleBook(r)}
                          >
                            Book Now
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
                </div>
      </div>
    </main>
  );
}
