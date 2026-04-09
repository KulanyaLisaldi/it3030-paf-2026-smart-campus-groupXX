import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import AdminLayout from "../components/admin/AdminLayout.jsx";
import AdminResourcesTable from "../components/admin/AdminResourcesTable.jsx";
import { getAdminResources } from "../api/adminResources";
import { getAdminBookings } from "../api/bookings";
import { getTopUsedResources } from "../api/resources";
import { appFontFamily } from "../utils/appFont";

const statCardBaseStyle = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #F5E7C6",
  borderRadius: "12px",
  padding: "12px",
  minHeight: 76,
  boxShadow: "0 6px 14px rgba(20, 33, 61, 0.05)",
};

const panelStyle = {
  backgroundColor: "#FFFFFF",
  borderRadius: "14px",
  border: "1px solid #FFDDB8",
  boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
  padding: "14px",
};

const dashboardChartsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  columnGap: 12,
  rowGap: 36,
};

const chartCardStyle = {
  border: "1px solid #FFDDB8",
  borderRadius: 12,
  padding: 12,
  background: "#fff",
  minHeight: 300,
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.05)",
};

function toIsoDate(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function toDisplayHour(startTime) {
  const [rawHour] = String(startTime || "").split(":");
  const hour = Number(rawHour);
  if (!Number.isFinite(hour)) return null;
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 || 12;
  return `${normalized}:00 ${suffix}`;
}

function toSortHour(label) {
  const match = String(label).match(/^(\d+):00\s(AM|PM)$/);
  if (!match) return 999;
  let hour = Number(match[1]);
  if (match[2] === "PM" && hour !== 12) hour += 12;
  if (match[2] === "AM" && hour === 12) hour = 0;
  return hour;
}

export default function AdminResourcesPage() {
  const location = useLocation();
  const tab = new URLSearchParams(location.search).get("tab") || "overview";
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [topUsedRows, setTopUsedRows] = useState([]);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState("");

  useEffect(() => {
    if (tab !== "overview") return;
    let mounted = true;

    const loadOverview = async () => {
      setLoadingOverview(true);
      setOverviewError("");
      try {
        const [resourcesData, bookingsData, topUsedData] = await Promise.all([
          getAdminResources({}),
          getAdminBookings({}),
          getTopUsedResources(7).catch(() => []),
        ]);
        if (!mounted) return;
        setResources(Array.isArray(resourcesData) ? resourcesData : []);
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        setTopUsedRows(Array.isArray(topUsedData) ? topUsedData : []);
      } catch (err) {
        if (!mounted) return;
        setResources([]);
        setBookings([]);
        setTopUsedRows([]);
        setOverviewError(err?.message || "Could not load overview data.");
      } finally {
        if (mounted) setLoadingOverview(false);
      }
    };

    void loadOverview();
    return () => {
      mounted = false;
    };
  }, [tab]);

  const stats = useMemo(() => {
    const totalResources = resources.length;
    const activeResources = resources.filter((r) => String(r?.status || "").toUpperCase() === "ACTIVE").length;
    const outOfServiceResources = resources.filter((r) => String(r?.status || "").toUpperCase() === "OUT_OF_SERVICE").length;

    return {
      totalResources,
      activeResources,
      outOfServiceResources,
    };
  }, [resources]);

  const topResourcesChartData = useMemo(() => {
    if (topUsedRows.length > 0) {
      return topUsedRows
        .map((item) => ({
          name: String(item?.name || item?.code || "Unknown"),
          count: Number(item?.usageCount || 0),
        }))
        .filter((item) => item.count > 0)
        .slice(0, 7);
    }
    const map = new Map();
    bookings.forEach((b) => {
      const name = String(b?.resourceName || "Unknown").trim() || "Unknown";
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [topUsedRows, bookings]);

  const peakBookingHoursData = useMemo(() => {
    const map = new Map();
    bookings.forEach((b) => {
      const label = toDisplayHour(b?.startTime);
      if (!label) return;
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([hour, bookingsCount]) => ({ hour, bookingsCount, sort: toSortHour(hour) }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ hour, bookingsCount }) => ({ hour, bookingsCount }));
  }, [bookings]);

  const resourceTypeDistributionData = useMemo(() => {
    const tracked = [
      { key: "LECTURE_HALL", label: "Lecture Halls" },
      { key: "LAB", label: "Labs" },
      { key: "MEETING_ROOM", label: "Meeting Rooms" },
      { key: "EQUIPMENT", label: "Equipment" },
    ];
    const counts = new Map(tracked.map((item) => [item.key, 0]));
    bookings.forEach((b) => {
      const normalized = String(b?.resourceType || "")
        .toUpperCase()
        .replace(/\s+/g, "_")
        .trim();
      if (counts.has(normalized)) {
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
      }
    });
    return tracked
      .map((item) => ({
        name: item.label,
        count: counts.get(item.key) || 0,
      }))
      .filter((item) => item.count > 0);
  }, [bookings]);

  const underutilizedResources = useMemo(() => {
    const usageByResourceId = new Map();
    bookings.forEach((b) => {
      const id = String(b?.resourceId || b?.resourceCode || b?.resourceName || "");
      if (!id) return;
      usageByResourceId.set(id, (usageByResourceId.get(id) || 0) + 1);
    });

    return resources
      .map((resource) => {
        const id = String(resource?.id || resource?.code || resource?.name || "");
        const usage = usageByResourceId.get(id) || 0;
        return {
          id,
          code: resource?.code || "—",
          name: resource?.name || "Unnamed Resource",
          type: String(resource?.type || "UNKNOWN").replaceAll("_", " "),
          usage,
        };
      })
      .filter((item) => item.usage <= 2)
      .sort((a, b) => a.usage - b.usage || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [resources, bookings]);

  return (
    <AdminLayout activeSection="resources" pageTitle={null} description={null}>
      <div style={{ fontFamily: appFontFamily }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "26px", fontWeight: 800, color: "#14213D" }}>Resource Management</h1>
        <p style={{ margin: "0 0 28px 0", fontSize: "14px", color: "#64748b", maxWidth: "640px", lineHeight: 1.5 }}>
          Maintain facilities and assets catalogue with quick actions and filtering.
        </p>
        {tab === "details" ? (
          <AdminResourcesTable />
        ) : (
          <section style={panelStyle}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 18 }}>
                {[
                  { label: "Total Resources", value: stats.totalResources, accent: "#14213D" },
                  { label: "Active Resources", value: stats.activeResources, accent: "#16a34a" },
                  { label: "Out of Service", value: stats.outOfServiceResources, accent: "#dc2626" },
                  { label: "Top Resources", value: topResourcesChartData.length, accent: "#9333ea" },
                ].map((card) => (
                  <div key={card.label} style={{ ...statCardBaseStyle, borderLeft: `6px solid ${card.accent}` }}>
                    <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{card.label}</p>
                    <p style={{ margin: "8px 0 0", fontSize: "26px", fontWeight: 800, color: "#14213D", lineHeight: 1 }}>{card.value}</p>
                  </div>
                ))}
              </div>

              {loadingOverview ? <p style={{ margin: 0, color: "#64748b", fontWeight: 600 }}>Loading overview...</p> : null}
              {overviewError ? <p style={{ margin: 0, color: "#b91c1c", fontWeight: 700 }}>{overviewError}</p> : null}

              <div style={dashboardChartsGridStyle}>
              <div style={chartCardStyle}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Top Resources (Most Used)</h3>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topResourcesChartData} layout="vertical" margin={{ left: 28 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#FFDDB8" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={130} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#FCA311" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={chartCardStyle}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Peak Booking Hours</h3>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={peakBookingHoursData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#FFDDB8" />
                      <XAxis dataKey="hour" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="bookingsCount" stroke="#14213D" strokeWidth={3} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={chartCardStyle}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Resource Type Distribution</h3>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={resourceTypeDistributionData}
                        dataKey="count"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={98}
                        paddingAngle={2}
                        label={({ name, percent }) => `${name}: ${Math.round((percent || 0) * 100)}%`}
                      >
                        {resourceTypeDistributionData.map((entry, idx) => {
                          const colors = ["#14213D", "#FCA311", "#16a34a", "#7c3aed"];
                          return <Cell key={entry.name} fill={colors[idx % colors.length]} />;
                        })}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={chartCardStyle}>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Underutilized Resources (Smart Insight)</h3>
                <p style={{ margin: "0 0 10px", color: "#64748b", fontSize: 13 }}>
                  Resources with very low booking activity (2 or fewer bookings) to help improve utilization planning.
                </p>
                {underutilizedResources.length === 0 ? (
                  <p style={{ margin: 0, color: "#334155", fontWeight: 600 }}>No underutilized resources found from current booking history.</p>
                ) : (
                  <div style={{ display: "grid", gap: 8, maxHeight: 228, overflowY: "auto", paddingRight: 2 }}>
                    {underutilizedResources.map((item) => (
                      <div
                        key={item.id || `${item.code}-${item.name}`}
                        style={{
                          border: "1px solid #F5E7C6",
                          borderRadius: 10,
                          padding: "10px 12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          background: "#fffdf9",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                          <div style={{ color: "#64748b", fontSize: 12 }}>Code: {item.code} - {item.type}</div>
                        </div>
                        <div style={{ whiteSpace: "nowrap", fontWeight: 800, color: "#dc2626", fontSize: 13 }}>
                          {item.usage} booking{item.usage === 1 ? "" : "s"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            </div>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}
