"""
Digital Doubt Tracker — Web Application Server
Runs on localhost:5000
Uses SQLite for database (no MySQL needed)
"""

import http.server
import json
import sqlite3
import os
import urllib.parse
from datetime import datetime
import hashlib

# Configuration
PORT = 5000
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "doubt_tracker.db")
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")


def get_db():
    """Get a database connection."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Initialize the database with tables and default data."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS students (
            student_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS teachers (
            teacher_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            subject TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS doubts (
            doubt_id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            subject TEXT NOT NULL,
            doubt_text TEXT NOT NULL,
            status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending','In Progress','Resolved')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS responses (
            response_id INTEGER PRIMARY KEY AUTOINCREMENT,
            doubt_id INTEGER NOT NULL,
            teacher_id INTEGER NOT NULL,
            response_text TEXT NOT NULL,
            response_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (doubt_id) REFERENCES doubts(doubt_id) ON DELETE CASCADE,
            FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE
        );
    """)

    # Insert default admin if not exists
    cursor.execute("SELECT COUNT(*) FROM teachers WHERE email = ?", ("admin@doubttracker.com",))
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            "INSERT INTO teachers (name, subject, email, password, is_admin) VALUES (?, ?, ?, ?, ?)",
            ("Admin", "All Subjects", "admin@doubttracker.com", "admin123", 1)
        )

    # Insert default teacher if not exists
    cursor.execute("SELECT COUNT(*) FROM teachers WHERE email = ?", ("sharma@doubttracker.com",))
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            "INSERT INTO teachers (name, subject, email, password, is_admin) VALUES (?, ?, ?, ?, ?)",
            ("Dr. Sharma", "Mathematics", "sharma@doubttracker.com", "teacher123", 0)
        )

    conn.commit()
    conn.close()
    print("Database initialized successfully.")


class DoubtTrackerHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP request handler for the Doubt Tracker API."""

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # API routes
        if path.startswith("/api/"):
            self.handle_api_get(path, query)
        elif path == "/" or path == "":
            self.serve_file("index.html", "text/html")
        elif path.endswith(".html"):
            self.serve_file(path.lstrip("/"), "text/html")
        elif path.endswith(".css"):
            self.serve_file(path.lstrip("/"), "text/css")
        elif path.endswith(".js"):
            self.serve_file(path.lstrip("/"), "application/javascript")
        elif path.endswith(".png") or path.endswith(".jpg") or path.endswith(".ico"):
            content_type = "image/png" if path.endswith(".png") else "image/jpeg"
            self.serve_file(path.lstrip("/"), content_type)
        else:
            self.serve_file("index.html", "text/html")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8")

        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON"}, 400)
            return

        self.handle_api_post(path, data)

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode("utf-8"))

    def serve_file(self, filename, content_type):
        filepath = os.path.join(STATIC_DIR, filename)
        if os.path.exists(filepath):
            self.send_response(200)
            self.send_header("Content-Type", content_type + "; charset=utf-8")
            self.end_headers()
            with open(filepath, "rb") as f:
                self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"File not found")

    # ==================== API GET Routes ====================

    def handle_api_get(self, path, query):
        conn = get_db()
        try:
            if path == "/api/student/doubts":
                student_id = query.get("student_id", [None])[0]
                status_filter = query.get("status", ["All"])[0]
                if not student_id:
                    self.send_json({"error": "student_id required"}, 400)
                    return
                sql = "SELECT d.*, s.name as student_name FROM doubts d JOIN students s ON d.student_id = s.student_id WHERE d.student_id = ?"
                params = [student_id]
                if status_filter != "All":
                    sql += " AND d.status = ?"
                    params.append(status_filter)
                sql += " ORDER BY d.created_at DESC"
                rows = conn.execute(sql, params).fetchall()
                self.send_json([dict(r) for r in rows])

            elif path == "/api/student/stats":
                student_id = query.get("student_id", [None])[0]
                if not student_id:
                    self.send_json({"error": "student_id required"}, 400)
                    return
                total = conn.execute("SELECT COUNT(*) as c FROM doubts WHERE student_id = ?", (student_id,)).fetchone()["c"]
                pending = conn.execute("SELECT COUNT(*) as c FROM doubts WHERE student_id = ? AND status = 'Pending'", (student_id,)).fetchone()["c"]
                resolved = conn.execute("SELECT COUNT(*) as c FROM doubts WHERE student_id = ? AND status = 'Resolved'", (student_id,)).fetchone()["c"]
                self.send_json({"total": total, "pending": pending, "resolved": resolved})

            elif path == "/api/teacher/doubts":
                status_filter = query.get("status", ["All"])[0]
                sql = "SELECT d.*, s.name as student_name FROM doubts d JOIN students s ON d.student_id = s.student_id"
                params = []
                if status_filter != "All":
                    sql += " WHERE d.status = ?"
                    params.append(status_filter)
                sql += " ORDER BY d.created_at DESC"
                rows = conn.execute(sql, params).fetchall()
                self.send_json([dict(r) for r in rows])

            elif path == "/api/teacher/stats":
                teacher_id = query.get("teacher_id", [None])[0]
                pending = conn.execute("SELECT COUNT(*) as c FROM doubts WHERE status = 'Pending'").fetchone()["c"]
                in_progress = conn.execute("SELECT COUNT(*) as c FROM doubts WHERE status = 'In Progress'").fetchone()["c"]
                resolved = conn.execute("SELECT COUNT(*) as c FROM doubts WHERE status = 'Resolved'").fetchone()["c"]
                my_responses = 0
                if teacher_id:
                    my_responses = conn.execute("SELECT COUNT(*) as c FROM responses WHERE teacher_id = ?", (teacher_id,)).fetchone()["c"]
                self.send_json({"pending": pending, "in_progress": in_progress, "resolved": resolved, "my_responses": my_responses})

            elif path == "/api/doubt/details":
                doubt_id = query.get("doubt_id", [None])[0]
                if not doubt_id:
                    self.send_json({"error": "doubt_id required"}, 400)
                    return
                doubt = conn.execute(
                    "SELECT d.*, s.name as student_name FROM doubts d JOIN students s ON d.student_id = s.student_id WHERE d.doubt_id = ?",
                    (doubt_id,)
                ).fetchone()
                if not doubt:
                    self.send_json({"error": "Doubt not found"}, 404)
                    return
                responses = conn.execute(
                    "SELECT r.*, t.name as teacher_name FROM responses r JOIN teachers t ON r.teacher_id = t.teacher_id WHERE r.doubt_id = ? ORDER BY r.response_date DESC",
                    (doubt_id,)
                ).fetchall()
                self.send_json({"doubt": dict(doubt), "responses": [dict(r) for r in responses]})

            elif path == "/api/admin/stats":
                students = conn.execute("SELECT COUNT(*) as c FROM students").fetchone()["c"]
                teachers = conn.execute("SELECT COUNT(*) as c FROM teachers").fetchone()["c"]
                total_doubts = conn.execute("SELECT COUNT(*) as c FROM doubts").fetchone()["c"]
                resolved = conn.execute("SELECT COUNT(*) as c FROM doubts WHERE status = 'Resolved'").fetchone()["c"]
                pending = conn.execute("SELECT COUNT(*) as c FROM doubts WHERE status = 'Pending'").fetchone()["c"]
                self.send_json({
                    "students": students, "teachers": teachers,
                    "total_doubts": total_doubts, "resolved": resolved, "pending": pending,
                    "resolution_pct": round((resolved / total_doubts * 100) if total_doubts > 0 else 0)
                })

            elif path == "/api/admin/teachers":
                rows = conn.execute("SELECT teacher_id, name, subject, email, is_admin FROM teachers ORDER BY teacher_id").fetchall()
                self.send_json([dict(r) for r in rows])

            elif path == "/api/admin/students":
                rows = conn.execute(
                    "SELECT s.*, (SELECT COUNT(*) FROM doubts d WHERE d.student_id = s.student_id) as doubt_count FROM students s ORDER BY s.student_id"
                ).fetchall()
                self.send_json([dict(r) for r in rows])

            else:
                self.send_json({"error": "Unknown API endpoint"}, 404)

        except Exception as e:
            self.send_json({"error": str(e)}, 500)
        finally:
            conn.close()

    # ==================== API POST Routes ====================

    def handle_api_post(self, path, data):
        conn = get_db()
        try:
            if path == "/api/auth/login":
                email = data.get("email", "").strip()
                password = data.get("password", "")
                role = data.get("role", "student")

                if not email or not password:
                    self.send_json({"error": "Email and password required"}, 400)
                    return

                if role == "student":
                    user = conn.execute("SELECT student_id as id, name FROM students WHERE email = ? AND password = ?",
                                       (email, password)).fetchone()
                    if user:
                        self.send_json({"success": True, "id": user["id"], "name": user["name"], "role": "student"})
                    else:
                        self.send_json({"error": "Invalid email or password"}, 401)
                else:
                    user = conn.execute("SELECT teacher_id as id, name, is_admin FROM teachers WHERE email = ? AND password = ?",
                                       (email, password)).fetchone()
                    if user:
                        role_name = "admin" if user["is_admin"] else "teacher"
                        self.send_json({"success": True, "id": user["id"], "name": user["name"], "role": role_name})
                    else:
                        self.send_json({"error": "Invalid email or password"}, 401)

            elif path == "/api/auth/register":
                name = data.get("name", "").strip()
                email = data.get("email", "").strip()
                password = data.get("password", "")

                if not name or not email or not password:
                    self.send_json({"error": "All fields are required"}, 400)
                    return

                existing = conn.execute("SELECT student_id FROM students WHERE email = ?", (email,)).fetchone()
                if existing:
                    self.send_json({"error": "An account with this email already exists"}, 409)
                    return

                conn.execute("INSERT INTO students (name, email, password) VALUES (?, ?, ?)",
                             (name, email, password))
                conn.commit()
                self.send_json({"success": True, "message": "Account created successfully!"})

            elif path == "/api/doubt/add":
                student_id = data.get("student_id")
                subject = data.get("subject", "").strip()
                doubt_text = data.get("doubt_text", "").strip()

                if not student_id or not subject or not doubt_text:
                    self.send_json({"error": "All fields are required"}, 400)
                    return

                conn.execute("INSERT INTO doubts (student_id, subject, doubt_text) VALUES (?, ?, ?)",
                             (student_id, subject, doubt_text))
                conn.commit()
                self.send_json({"success": True, "message": "Doubt submitted successfully!"})

            elif path == "/api/doubt/respond":
                doubt_id = data.get("doubt_id")
                teacher_id = data.get("teacher_id")
                response_text = data.get("response_text", "").strip()
                new_status = data.get("status", "Resolved")

                if not doubt_id or not teacher_id or not response_text:
                    self.send_json({"error": "All fields are required"}, 400)
                    return

                conn.execute("INSERT INTO responses (doubt_id, teacher_id, response_text) VALUES (?, ?, ?)",
                             (doubt_id, teacher_id, response_text))
                conn.execute("UPDATE doubts SET status = ? WHERE doubt_id = ?", (new_status, doubt_id))
                conn.commit()
                self.send_json({"success": True, "message": "Response submitted!"})

            elif path == "/api/admin/teacher/add":
                name = data.get("name", "").strip()
                subject = data.get("subject", "").strip()
                email = data.get("email", "").strip()
                password = data.get("password", "")

                if not name or not subject or not email or not password:
                    self.send_json({"error": "All fields are required"}, 400)
                    return

                existing = conn.execute("SELECT teacher_id FROM teachers WHERE email = ?", (email,)).fetchone()
                if existing:
                    self.send_json({"error": "Email already exists"}, 409)
                    return

                conn.execute("INSERT INTO teachers (name, subject, email, password) VALUES (?, ?, ?, ?)",
                             (name, subject, email, password))
                conn.commit()
                self.send_json({"success": True, "message": "Teacher added!"})

            elif path == "/api/admin/teacher/delete":
                teacher_id = data.get("teacher_id")
                if not teacher_id:
                    self.send_json({"error": "teacher_id required"}, 400)
                    return
                teacher = conn.execute("SELECT is_admin FROM teachers WHERE teacher_id = ?", (teacher_id,)).fetchone()
                if teacher and teacher["is_admin"]:
                    self.send_json({"error": "Cannot delete admin account"}, 403)
                    return
                conn.execute("DELETE FROM teachers WHERE teacher_id = ? AND is_admin = 0", (teacher_id,))
                conn.commit()
                self.send_json({"success": True, "message": "Teacher deleted!"})

            else:
                self.send_json({"error": "Unknown API endpoint"}, 404)

        except Exception as e:
            self.send_json({"error": str(e)}, 500)
        finally:
            conn.close()

    def log_message(self, format, *args):
        """Custom log to show clean output."""
        if "/api/" in str(args[0]):
            print(f"  API: {args[0]}")


def main():
    init_db()

    os.makedirs(STATIC_DIR, exist_ok=True)

    server = http.server.HTTPServer(("", PORT), DoubtTrackerHandler)
    print(f"\n{'='*52}")
    print(f"  Digital Doubt Tracker - Web Application")
    print(f"{'='*52}")
    print(f"  Server running at: http://localhost:{PORT}")
    print(f"  Database: {DB_FILE}")
    print(f"{'='*52}")
    print(f"\n  Default Logins:")
    print(f"    Admin:   admin@doubttracker.com / admin123")
    print(f"    Teacher: sharma@doubttracker.com / teacher123")
    print(f"    Student: Register on the website")
    print(f"\n  Press Ctrl+C to stop the server.\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped.")
        server.server_close()


if __name__ == "__main__":
    main()
