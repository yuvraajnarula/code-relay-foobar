import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bell, CheckCircle } from "lucide-react";

const API_BASE = "http://localhost:5000/api";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const token = localStorage.getItem("nexus_token");

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications(res.data);

      const unread = res.data.filter((n) => n.is_read === 0).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.put(
        `${API_BASE}/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );

      setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
    } catch (err) {
      console.error("Mark as read error:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll every 5 seconds
    const interval = setInterval(fetchNotifications, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="notif-wrapper">
      <button className="notif-btn" onClick={() => setOpen(!open)}>
        <Bell size={20} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-dropdown fade-in">
          <h4 style={{ marginBottom: "0.8rem" }}>Notifications</h4>

          {notifications.length === 0 ? (
            <p className="text-muted">No notifications yet.</p>
          ) : (
            <div className="notif-list">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${n.is_read ? "read" : "unread"}`}
                >
                  <div style={{ flex: 1 }}>
                    <strong>{n.title}</strong>
                    <p className="text-muted">{n.message}</p>
                    <small className="text-muted">
                      {new Date(n.created_at).toLocaleString()}
                    </small>
                  </div>

                  {!n.is_read && (
                    <button
                      className="btn-icon"
                      onClick={() => markAsRead(n.id)}
                      title="Mark as read"
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}