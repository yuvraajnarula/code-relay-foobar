import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  Building2,
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const STATUS_COLORS = {
  TODO: "#3B82F6",
  IN_PROGRESS: "#F59E0B",
  COMPLETED: "#10B981",
  OVERDUE: "#EF4444",
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("nexus_token");

    axios
      .get(`${API_BASE}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => setStats(response.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const statCards = [
    { label: "Total Tasks", value: stats?.totalTasks || 0, icon: BarChart3, color: "#3B82F6" },
    { label: "Completed", value: stats?.completedTasks || 0, icon: CheckCircle2, color: "#10B981" },
    { label: "In Progress", value: stats?.inProgressTasks || 0, icon: Clock, color: "#F59E0B" },
    { label: "Overdue", value: stats?.overdueTasks || 0, icon: AlertTriangle, color: "#EF4444" },
    { label: "Projects", value: stats?.totalProjects || 0, icon: FolderKanban, color: "#8B5CF6" },
    { label: "Workspaces", value: stats?.totalWorkspaces || 0, icon: Building2, color: "#06B6D4" },
  ];

  // PIE DATA
  const taskStatusData =
    stats?.tasksByStatus?.map((item) => ({
      name: item.status?.replace("_", " "),
      value: item.count,
      rawStatus: item.status,
    })) || [];

  // LINE DATA (weekly completion)
  // Expected backend format: stats.weeklyCompletion = [{ week: "2026-W05", completed: 12 }, ...]
  const weeklyCompletionData = stats?.weeklyCompletion || [];

  return (
    <div className="dashboard-page fade-in">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p className="text-muted">Overview of your task management</p>
      </div>

      <div className="stats-grid">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card glass">
            <div
              className="stat-icon"
              style={{ backgroundColor: `${card.color}20`, color: card.color }}
            >
              <card.icon size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{card.value}</span>
              <span className="stat-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-charts">
        {/* PIE CHART */}
        <div className="chart-card glass">
          <h3>Task Distribution by Status</h3>

          {taskStatusData.length === 0 ? (
            <p className="text-muted" style={{ textAlign: "center", padding: "2rem" }}>
              No tasks yet
            </p>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.rawStatus] || "#3B82F6"}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* LINE CHART */}
        <div className="chart-card glass">
          <h3>Weekly Task Completion</h3>

          {weeklyCompletionData.length === 0 ? (
            <p className="text-muted" style={{ textAlign: "center", padding: "2rem" }}>
              No weekly data available
            </p>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={weeklyCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}