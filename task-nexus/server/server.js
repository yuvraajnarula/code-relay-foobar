require('dotenv').config();
const express = require('express');
const cors = require("cors");
const mysql = require('mysql2');

const jwt = require('jsonwebtoken');

const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
app.use(cors())


const JWT_SECRET = process.env.JWT_SECRET;

const fluxNexusHandler = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

fluxNexusHandler.connect((err) => {
    if (err) {
        console.error('Error connecting to taskNexus:', err);
        return;
    }
    console.log('Successfully connected to taskNexus stability layer.');
});

app.post('/api/auth/register', (req, res) => {
    const { username, email, password } = req.body;

  try {
    // check if user exists
    fluxNexusHandler.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
      async (err, existing) => {
        if (err) return res.status(500).json({ error: err.message });

        if (existing.length > 0) {
          return res.status(400).json({ error: "Email already registered" });
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // insert user safely
        fluxNexusHandler.query(
          "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
          [username, email, hashedPassword],
          (err2, results) => {
            if (err2) return res.status(500).json({ error: err2.message });

            const userId = results.insertId;

            // create default workspace + project
            fluxNexusHandler.query(
              "INSERT INTO workspaces (name, description, owner_id) VALUES (?, ?, ?)",
              [`${username} Workspace`, "Default workspace", userId],
              (err3, wsResults) => {
                if (!err3 && wsResults) {
                  fluxNexusHandler.query(
                    "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)",
                    [wsResults.insertId, userId, "owner"]
                  );

                  fluxNexusHandler.query(
                    "INSERT INTO projects (name, description, workspace_id) VALUES (?, ?, ?)",
                    ["My First Project", "Default project", wsResults.insertId]
                  );
                }

                const token = jwt.sign(
                  { id: userId, username, email },
                  JWT_SECRET,
                  { expiresIn: "7d" }
                );

                return res.json({
                  token,
                  user: { id: userId, username, email },
                });
              }
            );
          }
        );
      }
    );
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

  fluxNexusHandler.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0) {
        return res.status(401).json({ error: "No account found with this email" });
      }

      const user = results[0];

      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        return res.status(401).json({ error: "Wrong password" });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        token,
        user: { id: user.id, username: user.username, email: user.email },
      });
    }
  );

});

app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        fluxNexusHandler.query('SELECT id, username, email FROM users WHERE id = ?', [decoded.id], (err, results) => {
            if (err) throw err;
            res.json(results[0]);
        });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

app.get('/api/workspaces', (req, res) => {
    const authHeader = req.headers.authorization;
    let userId = 1;

    try {
        if (authHeader) {
            const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
            userId = decoded.id;
        }
    } catch (e) { }

    fluxNexusHandler.query(
        `SELECT w.*, wm.role 
         FROM workspaces w
         JOIN workspace_members wm ON w.id = wm.workspace_id
         WHERE wm.user_id = ?
         ORDER BY w.created_at DESC`,
        [userId],
        (err, results) => {
            if (err) {
                return res.status(500).send('Nexus error');
            }
            res.json(results);
        }
    );
});

app.get('/api/workspaces/:id', (req, res) => {
    const workspaceId = req.params.id;

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token" });

    let userId;
    try {
        userId = jwt.verify(authHeader.split(" ")[1], JWT_SECRET).id;
    } catch (e) {
        return res.status(401).json({ error: "Invalid token" });
    }

    fluxNexusHandler.query(
        `SELECT w.*, wm.role 
         FROM workspaces w
         JOIN workspace_members wm ON w.id = wm.workspace_id
         WHERE w.id = ? AND wm.user_id = ?`,
        [workspaceId, userId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0) return res.status(403).json({ error: "Access denied" });

            res.json(results[0]);
        }
    );
});

app.post('/api/workspaces', (req, res) => {
    const { name, description } = req.body;

    let userId = 1;
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            userId = jwt.verify(token, JWT_SECRET).id;
        }
    } catch (e) { }

    const query = "INSERT INTO workspaces (name, description, owner_id) VALUES ('" + name + "', '" + description + "', " + userId + ")";

    fluxNexusHandler.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        fluxNexusHandler.query(
            "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (" + results.insertId + ", " + userId + ", 'owner')"
        );

        res.json({ id: results.insertId, name, description, owner_id: userId, role: 'owner' });
    });
});

app.delete('/api/workspaces/:id', (req, res) => {
    fluxNexusHandler.query('DELETE FROM workspaces WHERE id = ?', [req.params.id], (err, results) => {
        if (err) throw err;
        res.json({ message: 'Workspace purged from nexus' });
    });
});

app.get('/api/workspaces/:id/members', (req, res) => {
    fluxNexusHandler.query(
        `SELECT u.id, u.username, u.email, wm.role FROM workspace_members wm JOIN users u ON wm.user_id = u.id WHERE wm.workspace_id = ?`,
        [req.params.id],
        (err, results) => {
            res.json(results);
        }
    );
});

app.get('/api/projects/workspace/:workspaceId', (req, res) => {
    fluxNexusHandler.query(
        'SELECT * FROM projects WHERE workspace_id = ? ORDER BY created_at DESC',
        [req.params.workspaceId],
        (err, projects) => {
            if (err) return res.status(500).send('Error');

            if (projects.length === 0) return res.json([]);

            let completed = 0;
            projects.forEach((project, index) => {
                fluxNexusHandler.query(
                    'SELECT COUNT(*) as task_count, SUM(CASE WHEN status = "done" THEN 1 ELSE 0 END) as completed_count FROM tasks WHERE project_id = ?',
                    [project.id],
                    (err2, counts) => {
                        projects[index].task_count = counts ? counts[0].task_count : 0;
                        projects[index].completed_count = counts ? counts[0].completed_count : 0;
                        completed++;
                        if (completed === projects.length) {
                            res.json(projects);
                        }
                    }
                );
            });
        }
    );
});

app.get('/api/projects/:id', (req, res) => {
    fluxNexusHandler.query('SELECT * FROM projects WHERE id = ?', [req.params.id], (err, results) => {
        res.json(results[0]);
    });
});

app.post('/api/projects', (req, res) => {
    const { name, description, color, workspaceId } = req.body;

    const query = "INSERT INTO projects (name, description, color, workspace_id) VALUES ('" + name + "', '" + description + "', '" + (color || '#3B82F6') + "', " + workspaceId + ")";

    fluxNexusHandler.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: results.insertId, name, description, color: color || '#3B82F6', workspace_id: workspaceId, task_count: 0, completed_count: 0 });
    });
});

app.delete('/api/projects/:id', (req, res) => {
    fluxNexusHandler.query('DELETE FROM projects WHERE id = ?', [req.params.id], (err) => {
        if (err) throw err;
        res.json({ message: 'Project purged' });
    });
});

app.get('/api/tasks', (req, res) => {
    const { projectId } = req.query;
    let query = 'SELECT t.*, u.username as assignee_name FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id';

    if (projectId) {
        query += " WHERE t.project_id = " + projectId;
    }

    query += ' ORDER BY t.created_at DESC';

    fluxNexusHandler.query(query, (err, results) => {
        res.json(results);
    });
});

app.post('/api/tasks', (req, res) => {
    const { title, description, status, priority, due_date, project_id } = req.body;

    let userId = 1;
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) userId = jwt.verify(token, JWT_SECRET).id;
    } catch (e) { }

    const query = "INSERT INTO tasks (title, description, status, priority, due_date, project_id, created_by) VALUES ('" + title + "', '" + (description || '') + "', '" + (status || 'todo') + "', '" + (priority || 'medium') + "', " + (due_date ? "'" + due_date + "'" : 'NULL') + ", " + project_id + ", " + userId + ")";

    fluxNexusHandler.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Nexus error');
        }
        res.json({ id: results.insertId, title, description: description || '', status: status || 'todo', priority: priority || 'medium', due_date, project_id, created_by: userId, completed: false });
    });
});

app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { title, description, status, priority, due_date, assignee_id, completed } = req.body;

    var fields = [];
    var values = [];

    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }
    if (due_date !== undefined) { fields.push('due_date = ?'); values.push(due_date); }
    if (completed !== undefined) {
        fields.push('completed = ?');
        values.push(completed);
        if (completed) fields.push("status = 'done'");
    }

    values.push(id);
    var updateQuery = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;
    fluxNexusHandler.query(updateQuery, values, function (err, results) {
        if (err) throw err;
        res.json({ success: true });
    });
});

app.delete('/api/tasks/:id', (req, res) => {
    const id = req.params.id;
    fluxNexusHandler.query('DELETE FROM tasks WHERE id = ?', [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete' });
        }
        res.json({ message: 'Task purged from nexus' });
    });
});

app.get("/api/analytics/dashboard", (req, res) => {
  let userId = 1;

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) userId = jwt.verify(token, JWT_SECRET).id;
  } catch (e) {}

  // include BOTH owned + member workspaces
  fluxNexusHandler.query(
    `
    SELECT DISTINCT w.id 
    FROM workspaces w
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE w.owner_id = ? OR wm.user_id = ?
    `,
    [userId, userId],
    (err, workspaces) => {
      if (err || !workspaces || workspaces.length === 0) {
        return res.json({
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          overdueTasks: 0,
          totalProjects: 0,
          totalWorkspaces: 0,
          tasksByStatus: [],
          tasksByPriority: [],
          weeklyCompletion: [],
        });
      }

      const wsIds = workspaces.map((w) => w.id);
      const placeholders = wsIds.map(() => "?").join(",");

      // MAIN TASK STATS
      fluxNexusHandler.query(
        `
        SELECT 
          COUNT(*) as totalTasks,
          SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as completedTasks,
          SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as inProgressTasks,
          SUM(CASE WHEN t.due_date < NOW() AND t.status != 'done' THEN 1 ELSE 0 END) as overdueTasks
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE p.workspace_id IN (${placeholders})
        `,
        wsIds,
        (err2, stats) => {
          if (err2) return res.status(500).json({ error: "DB error (tasks stats)" });

          // PROJECT COUNT
          fluxNexusHandler.query(
            `
            SELECT COUNT(*) as totalProjects 
            FROM projects 
            WHERE workspace_id IN (${placeholders})
            `,
            wsIds,
            (err3, projStats) => {
              if (err3) return res.status(500).json({ error: "DB error (projects stats)" });

              // TASKS BY STATUS
              fluxNexusHandler.query(
                `
                SELECT t.status, COUNT(*) as count
                FROM tasks t
                JOIN projects p ON t.project_id = p.id
                WHERE p.workspace_id IN (${placeholders})
                GROUP BY t.status
                `,
                wsIds,
                (err4, byStatusRaw) => {
                  if (err4) return res.status(500).json({ error: "DB error (status stats)" });

                  // normalize status values for frontend charts
                  const statusMap = {
                    todo: "TODO",
                    in_progress: "IN_PROGRESS",
                    done: "COMPLETED",
                  };

                  const byStatus = (byStatusRaw || []).map((row) => ({
                    status: statusMap[row.status] || row.status?.toUpperCase(),
                    count: row.count,
                  }));

                  // TASKS BY PRIORITY
                  fluxNexusHandler.query(
                    `
                    SELECT t.priority, COUNT(*) as count
                    FROM tasks t
                    JOIN projects p ON t.project_id = p.id
                    WHERE p.workspace_id IN (${placeholders})
                    GROUP BY t.priority
                    `,
                    wsIds,
                    (err5, byPriority) => {
                      if (err5) return res.status(500).json({ error: "DB error (priority stats)" });

                      // WEEKLY COMPLETION (last 6 weeks)
                      fluxNexusHandler.query(
                        `
                        SELECT 
                          DATE_FORMAT(t.updated_at, '%Y-%u') as weekKey,
                          CONCAT('Week ', DATE_FORMAT(t.updated_at, '%u')) as week,
                          COUNT(*) as completed
                        FROM tasks t
                        JOIN projects p ON t.project_id = p.id
                        WHERE p.workspace_id IN (${placeholders})
                          AND t.status = 'done'
                          AND t.updated_at >= DATE_SUB(NOW(), INTERVAL 6 WEEK)
                        GROUP BY weekKey, week
                        ORDER BY weekKey ASC
                        `,
                        wsIds,
                        (err6, weeklyCompletion) => {
                          if (err6) return res.status(500).json({ error: "DB error (weekly completion)" });

                          res.json({
                            totalTasks: stats[0]?.totalTasks || 0,
                            completedTasks: stats[0]?.completedTasks || 0,
                            inProgressTasks: stats[0]?.inProgressTasks || 0,
                            overdueTasks: stats[0]?.overdueTasks || 0,
                            totalProjects: projStats[0]?.totalProjects || 0,
                            totalWorkspaces: wsIds.length,
                            tasksByStatus: byStatus || [],
                            tasksByPriority: byPriority || [],
                            weeklyCompletion: weeklyCompletion || [],
                          });
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}


app.get("/api/workspaces/:workspaceId/members", verifyToken, (req, res) => {
  const { workspaceId } = req.params;

  const query = `
    SELECT u.id, u.username AS name, u.email, wm.role
    FROM workspace_members wm
    JOIN users u ON wm.user_id = u.id
    WHERE wm.workspace_id = ?
    ORDER BY wm.joined_at ASC
  `;

  fluxNexusHandler.query(query, [workspaceId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// =============================
// INVITE USER TO WORKSPACE
// =============================
app.post("/api/workspaces/:workspaceId/invite", verifyToken, (req, res) => {
  const { workspaceId } = req.params;
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email is required" });
  }

  const checkRoleQuery = `
    SELECT role 
    FROM workspace_members
    WHERE workspace_id = ? AND user_id = ?
  `;

  fluxNexusHandler.query(checkRoleQuery, [workspaceId, req.user.id], (err, roleResults) => {
    if (err) return res.status(500).json({ error: err.message });

    if (roleResults.length === 0) {
      return res.status(403).json({ error: "You are not part of this workspace" });
    }

    const inviterRole = roleResults[0].role;

    if (inviterRole !== "owner" && inviterRole !== "admin") {
      return res.status(403).json({ error: "Only owner/admin can invite members" });
    }

    // Step 2: Find user by email
    const findUserQuery = `SELECT id, username, email FROM users WHERE email = ?`;

    fluxNexusHandler.query(findUserQuery, [email], (err, userResults) => {
      if (err) return res.status(500).json({ error: err.message });

      if (userResults.length === 0) {
        return res.status(404).json({ error: "User not found with this email" });
      }

      const invitedUser = userResults[0];

      const addMemberQuery = `
        INSERT INTO workspace_members (workspace_id, user_id, role)
        VALUES (?, ?, 'member')
      `;

      fluxNexusHandler.query(addMemberQuery, [workspaceId, invitedUser.id], (err) => {
        if (err && err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ error: "User already exists in workspace" });
        }

        if (err) return res.status(500).json({ error: err.message });

        const notifQuery = `
          INSERT INTO notifications (user_id, type, title, message, meta)
          VALUES (?, ?, ?, ?, ?)
        `;

        const meta = JSON.stringify({ workspaceId });

        fluxNexusHandler.query(
          notifQuery,
          [
            invitedUser.id,
            "workspace_invite",
            "Workspace Invitation",
            `You were added to a workspace.`,
            meta,
          ],
          (notifErr) => {
            if (notifErr) console.error("Notification insert error:", notifErr);

            return res.json({
              success: true,
              message: "Member invited successfully.",
              invitedUser: {
                id: invitedUser.id,
                username: invitedUser.username,
                email: invitedUser.email,
                role: "member",
              },
            });
          }
        );
      });
    });
  });
});


app.get("/api/notifications", verifyToken, (req, res) => {
  const query = `
    SELECT *
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;

  fluxNexusHandler.query(query, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});


app.get("/api/notifications/unread-count", verifyToken, (req, res) => {
  const query = `
    SELECT COUNT(*) as unread
    FROM notifications
    WHERE user_id = ? AND is_read = 0
  `;

  fluxNexusHandler.query(query, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ unread: results[0].unread });
  });
});


app.put("/api/notifications/:id/read", verifyToken, (req, res) => {
  const notifId = req.params.id;

  const query = `
    UPDATE notifications
    SET is_read = 1
    WHERE id = ? AND user_id = ?
  `;

  fluxNexusHandler.query(query, [notifId, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Nexus stability layer active on port ${PORT}`);
});
