import React, { useEffect, useState } from "react";
import axios from "axios";
import { Mail, Users, UserPlus, AlertCircle } from "lucide-react";
import { useParams } from "react-router-dom";

const API_BASE = "http://localhost:5000/api";

export default function WorkspaceSettings() {
  const { workspaceId } = useParams();

  const [activeTab, setActiveTab] = useState("members");

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const token = localStorage.getItem("nexus_token");

  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);
      const res = await axios.get(`${API_BASE}/workspaces/${workspaceId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMembers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [workspaceId]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");

    if (!inviteEmail.trim()) return;

    try {
      setInviteLoading(true);

      const res = await axios.post(
        `${API_BASE}/workspaces/${workspaceId}/invite`,
        { email: inviteEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setInviteSuccess(res.data.message || "Invitation sent successfully.");
      setInviteEmail("");
      fetchMembers();
    } catch (err) {
      console.error(err);

      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to invite member.";

      setInviteError(msg);
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h2>Workspace Settings</h2>
          <p className="text-muted">Manage members and permissions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === "members" ? "active" : ""}`}
          onClick={() => setActiveTab("members")}
        >
          <Users size={16} /> Members
        </button>
      </div>

      {/* Members Tab */}
      {activeTab === "members" && (
        <div className="glass settings-panel">
          <h3 style={{ marginBottom: "1rem" }}>Invite Member</h3>

          <form onSubmit={handleInvite} className="invite-form">
            <div className="input-with-icon">
              <Mail size={18} className="text-muted" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter user email"
                required
              />
            </div>

            <button className="btn-primary" type="submit" disabled={inviteLoading}>
              <UserPlus size={18} />
              {inviteLoading ? "Inviting..." : "Invite"}
            </button>
          </form>

          {inviteError && (
            <div className="alert alert-error">
              <AlertCircle size={16} />
              {inviteError}
            </div>
          )}

          {inviteSuccess && (
            <div className="alert alert-success">
              {inviteSuccess}
            </div>
          )}

          <hr style={{ margin: "1.5rem 0", opacity: 0.2 }} />

          <h3 style={{ marginBottom: "1rem" }}>Current Members</h3>

          {loadingMembers ? (
            <p className="text-muted">Loading members...</p>
          ) : members.length === 0 ? (
            <p className="text-muted">No members found.</p>
          ) : (
            <div className="member-list">
              {members.map((m) => (
                <div key={m.id} className="member-row">
                  <div>
                    <strong>{m.name || "Unnamed"}</strong>
                    <p className="text-muted">{m.email}</p>
                  </div>
                  <span className="badge">{m.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}