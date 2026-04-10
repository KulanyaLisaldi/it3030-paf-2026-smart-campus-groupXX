import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, LineChart, Line, PieChart, Pie, Cell, Legend, ReferenceArea } from "recharts";
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

function normalizeTypeLabel(value) {
  const normalized = String(value || "").toUpperCase().replace(/\s+/g, "_").trim();
  if (!normalized) return "UNKNOWN";
  return normalized;
}

function displayTypeLabel(value) {
  const normalized = normalizeTypeLabel(value);
  if (normalized === "LECTURE_HALL") return "Lecture Hall";
  if (normalized === "MEETING_ROOM") return "Meeting Room";
  if (normalized === "LAB") return "Lab";
  if (normalized === "EQUIPMENT") return "Equipment";
  return normalized.replaceAll("_", " ");
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

  const smartAvailabilityChartData = useMemo(() => {
    const hourDemand = new Map();
    bookings.forEach((booking) => {
      const hourLabel = toDisplayHour(booking?.startTime);
      if (!hourLabel) return;
      hourDemand.set(hourLabel, (hourDemand.get(hourLabel) || 0) + 1);
    });
    return Array.from(hourDemand.entries())
      .map(([hour, count]) => ({ hour, count, sort: toSortHour(hour) }))
      .sort((a, b) => a.count - b.count || a.sort - b.sort)
      .slice(0, 8)
      .map(({ hour, count }) => ({ hour, count }));
  }, [bookings]);

  const demandPredictionChartData = useMemo(() => {
    const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const rows = weekdays.map((day) => ({ day }));

    const resourceCounts = new Map();
    bookings.forEach((b) => {
      const resource = String(b?.resourceName || "Unknown").trim() || "Unknown";
      resourceCounts.set(resource, (resourceCounts.get(resource) || 0) + 1);
    });
    const topResources = Array.from(resourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name]) => name);

    const weeksCovered = new Set();
    bookings.forEach((b) => {
      const date = new Date(`${b?.bookingDate || ""}T00:00:00`);
      if (Number.isNaN(date.getTime())) return;
      const oneJan = new Date(date.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((date - oneJan) / 86400000);
      const week = Math.ceil((dayOfYear + oneJan.getDay() + 1) / 7);
      weeksCovered.add(`${date.getFullYear()}-${week}`);
    });
    const divisor = Math.max(1, weeksCovered.size);

    rows.forEach((row) => {
      topResources.forEach((name) => {
        row[name] = 0;
      });
    });
    bookings.forEach((b) => {
      const date = new Date(`${b?.bookingDate || ""}T00:00:00`);
      if (Number.isNaN(date.getTime())) return;
      const resource = String(b?.resourceName || "Unknown").trim() || "Unknown";
      if (!topResources.includes(resource)) return;
      const weekday = (date.getDay() + 6) % 7;
      rows[weekday][resource] += 1;
    });
    const normalizedRows = rows.map((row) => {
      const next = { day: row.day };
      topResources.forEach((name) => {
        next[name] = Number((row[name] / divisor).toFixed(2));
      });
      return next;
    });

    const maxValue = Math.max(
      1,
      ...normalizedRows.flatMap((row) => topResources.map((name) => Number(row[name]) || 0))
    );

    return {
      rows: normalizedRows.map((row) => {
        const next = { day: row.day };
        topResources.forEach((name) => {
          next[name] = Number((((Number(row[name]) || 0) / maxValue) * 100).toFixed(1));
        });
        return next;
      }),
      resources: topResources,
    };
  }, [bookings]);

  const peakUsagePredictionChartData = useMemo(() => {
    const map = new Map();
    const uniqueDays = new Set();
    bookings.forEach((b) => {
      if (b?.bookingDate) uniqueDays.add(String(b.bookingDate));
      const hourLabel = toDisplayHour(b?.startTime);
      if (!hourLabel) return;
      map.set(hourLabel, (map.get(hourLabel) || 0) + 1);
    });
    const daysDivisor = Math.max(1, uniqueDays.size);
    const normalizedRows = Array.from(map.entries())
      .map(([hour, count]) => ({
        hour,
        avgBookings: Number((count / daysDivisor).toFixed(2)),
        sort: toSortHour(hour),
      }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ hour, avgBookings }) => ({ hour, avgBookings }));
    const maxValue = Math.max(1, ...normalizedRows.map((row) => Number(row.avgBookings) || 0));
    return normalizedRows.map((row) => ({
      hour: row.hour,
      usagePercent: Number((((Number(row.avgBookings) || 0) / maxValue) * 100).toFixed(1)),
    }));
  }, [bookings]);

  const peakUsageBands = useMemo(() => {
    const max = 100;
    const lowMax = 40;
    const mediumMax = 75;
    return { max, lowMax, mediumMax };
  }, [peakUsagePredictionChartData]);

  const peakUsageChartWithLevels = useMemo(
    () =>
      peakUsagePredictionChartData.map((item) => {
        const value = Number(item.usagePercent) || 0;
        let level = "Low";
        if (value > peakUsageBands.mediumMax) level = "Very High";
        else if (value > peakUsageBands.lowMax) level = "Medium";
        return { ...item, level };
      }),
    [peakUsagePredictionChartData, peakUsageBands]
  );

  const smartAvailabilitySlotChartData = useMemo(() => {
    const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const knownTypes = Array.from(
      new Set(resources.map((resource) => normalizeTypeLabel(resource?.type)).filter((type) => type && type !== "UNKNOWN"))
    );
    const slotDemand = new Map();
    const slotTypeDemand = new Map();

    const ensureSlotTypeMap = (slot) => {
      if (!slotTypeDemand.has(slot)) {
        const seed = new Map();
        knownTypes.forEach((type) => seed.set(type, 0));
        slotTypeDemand.set(slot, seed);
      }
      return slotTypeDemand.get(slot);
    };

    bookings.forEach((b) => {
      const date = new Date(`${b?.bookingDate || ""}T00:00:00`);
      if (Number.isNaN(date.getTime())) return;
      const weekday = weekdayNames[(date.getDay() + 6) % 7];
      const hourLabel = toDisplayHour(b?.startTime);
      if (!hourLabel) return;
      const slot = `${weekday} ${hourLabel}`;
      slotDemand.set(slot, (slotDemand.get(slot) || 0) + 1);

      const type = normalizeTypeLabel(b?.resourceType);
      const byType = ensureSlotTypeMap(slot);
      byType.set(type, (byType.get(type) || 0) + 1);
    });

    return Array.from(slotDemand.entries())
      .map(([slot, demand]) => {
        const byType = ensureSlotTypeMap(slot);
        const typeRows = Array.from(byType.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => a.count - b.count);
        const bestTypes = typeRows
          .slice(0, 2)
          .map((row) => displayTypeLabel(row.type))
          .join(", ");
        return { slot, demand, resourceTypes: bestTypes || "General" };
      })
      .sort((a, b) => a.demand - b.demand)
      .slice(0, 8);
  }, [bookings, resources]);

  return (
    <AdminLayout activeSection="resources" pageTitle={null} description={null}>
      <div style={{ fontFamily: appFontFamily }}>
        <h1 style={{ margin: "0 0 28px 0", fontSize: "26px", fontWeight: 800, color: "#14213D" }}>Resource Management</h1>
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

            <div
              style={{
                marginTop: 12,
                border: "1px solid #FFDDB8",
                borderRadius: 12,
                padding: 14,
                backgroundColor: "#fff",
                boxShadow: "0 8px 18px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.05)",
              }}
            >
              <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 900, color: "#0f172a" }}>Prediction-Based Decision Support</h2>
              <p style={{ margin: "0 0 14px", color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
                Time-based forecasts from historical bookings for demand planning, peak-hour management, and smart slot suggestions.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, alignItems: "stretch" }}>
                <div style={chartCardStyle}>
                  <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Resource Demand Prediction (Next Week)</h3>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={demandPredictionChartData.rows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#FFDDB8" />
                        <XAxis dataKey="day" />
                        <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                        <Tooltip formatter={(value) => `${value}% demand`} />
                        <Legend />
                        {demandPredictionChartData.resources.map((resourceName, index) => {
                          const lineColors = ["#14213D", "#FCA311", "#16a34a", "#7c3aed"];
                          return <Line key={resourceName} type="monotone" dataKey={resourceName} stroke={lineColors[index % lineColors.length]} strokeWidth={2.5} dot={{ r: 2 }} />;
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={chartCardStyle}>
                  <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Peak Usage Time Prediction</h3>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    {[
                      { label: "Low Usage", color: "#22c55e" },
                      { label: "Medium Usage", color: "#f59e0b" },
                      { label: "Very High Usage", color: "#ef4444" },
                    ].map((item) => (
                      <span
                        key={item.label}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "3px 8px",
                          borderRadius: 999,
                          border: "1px solid #F5E7C6",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#334155",
                          backgroundColor: "#fff",
                        }}
                      >
                        <span style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: item.color }} />
                        {item.label}
                      </span>
                    ))}
                  </div>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={peakUsageChartWithLevels}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#FFDDB8" />
                        <ReferenceArea y1={0} y2={peakUsageBands.lowMax} fill="#22c55e" fillOpacity={0.08} />
                        <ReferenceArea y1={peakUsageBands.lowMax} y2={peakUsageBands.mediumMax} fill="#f59e0b" fillOpacity={0.08} />
                        <ReferenceArea y1={peakUsageBands.mediumMax} y2={peakUsageBands.max} fill="#ef4444" fillOpacity={0.08} />
                        <XAxis dataKey="hour" />
                        <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                        <Tooltip formatter={(value) => `${value}% usage`} />
                        <Bar dataKey="usagePercent" radius={[6, 6, 0, 0]}>
                          {peakUsageChartWithLevels.map((entry) => (
                            <Cell
                              key={entry.hour}
                              fill={entry.level === "Very High" ? "#ef4444" : entry.level === "Medium" ? "#f59e0b" : "#22c55e"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 12 }}>
                    Color bands indicate predicted demand ranges across hours, helping with staffing, cleaning, and energy optimization.
                  </p>
                </div>

              </div>
            </div>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}
