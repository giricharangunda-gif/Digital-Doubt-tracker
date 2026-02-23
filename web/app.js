/**
 * Digital Doubt Tracker — Frontend Application
 * Handles all UI interactions, API calls, and state management.
 */

// ==========================================
// State
// ==========================================
let currentUser = null; // { id, name, role }
let selectedRole = 'student';

// ==========================================
// Page Navigation
// ==========================================
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
        page.classList.add('animate-fade');
    }
}

// ==========================================
// Role Selection (Login Page)
// ==========================================
function selectRole(el, role) {
    selectedRole = role;
    document.querySelectorAll('.role-option').forEach(r => r.classList.remove('active'));
    el.classList.add('active');
}

// ==========================================
// Authentication
// ==========================================
async function performLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showToast('Please fill in all fields.', 'error');
        return;
    }

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role: selectedRole })
        });
        const data = await res.json();


        if (data.success) {
            currentUser = { id: data.id, name: data.name, role: data.role };
            showToast(`Welcome, ${data.name}!`, 'success');
            openDashboard(data.role);
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (e) {
        showToast('Connection error. Is the server running?', 'error');
    }
}

async function performRegister() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;

    if (!name || !email || !password || !confirm) {
        showToast('Please fill in all fields.', 'error');
        return;
    }
    if (!email.includes('@') || !email.includes('.')) {
        showToast('Please enter a valid email.', 'error');
        return;
    }
    if (password.length < 4) {
        showToast('Password must be at least 4 characters.', 'error');
        return;
    }
    if (password !== confirm) {
        showToast('Passwords do not match.', 'error');
        return;
    }

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();

        if (data.success) {
            showToast('Account created! You can now sign in.', 'success');
            showPage('loginPage');
            document.getElementById('regName').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
            document.getElementById('regConfirm').value = '';
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (e) {
        showToast('Connection error.', 'error');
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser = null;
        showPage('loginPage');
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    }
}

// ==========================================
// Dashboard Navigation
// ==========================================
function openDashboard(role) {
    if (role === 'student') {
        document.getElementById('studentNameDisplay').textContent = currentUser.name;
        showPage('studentPage');
        loadStudentOverview();
    } else if (role === 'teacher') {
        document.getElementById('teacherNameDisplay').textContent = currentUser.name;
        showPage('teacherPage');
        loadTeacherOverview();
    } else if (role === 'admin') {
        document.getElementById('adminNameDisplay').textContent = currentUser.name;
        showPage('adminPage');
        loadAdminOverview();
    }
}

function switchSection(dashboard, section, navEl) {
    // Update nav
    const page = document.getElementById(dashboard + 'Page');
    page.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    navEl.classList.add('active');

    // Switch content section
    const content = page.querySelector('.content');
    content.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(dashboard + '-' + section);
    if (target) {
        target.classList.add('active');
        target.classList.add('animate-fade');
    }

    // Load data for section
    if (dashboard === 'student') {
        if (section === 'overview') loadStudentOverview();
        else if (section === 'myDoubts') loadStudentDoubts();
    } else if (dashboard === 'teacher') {
        if (section === 'overview') loadTeacherOverview();
        else if (section === 'pending') loadTeacherDoubts('Pending');
        else if (section === 'allDoubts') loadTeacherAllDoubts();
    } else if (dashboard === 'admin') {
        if (section === 'overview') loadAdminOverview();
        else if (section === 'doubts') loadAdminDoubts();
        else if (section === 'teachers') loadAdminTeachers();
        else if (section === 'students') loadAdminStudents();
    }
}

// ==========================================
// Student Functions
// ==========================================
async function loadStudentOverview() {
    if (!currentUser) return;
    try {
        // Stats
        const statsRes = await fetch(`/api/student/stats?student_id=${currentUser.id}`);
        const stats = await statsRes.json();
        document.getElementById('studentStats').innerHTML = `
            <div class="stat-card indigo animate-fade">
                <div class="stat-label">Total Doubts</div>
                <div class="stat-value">${stats.total}</div>
            </div>
            <div class="stat-card amber animate-fade" style="animation-delay:0.1s">
                <div class="stat-label">Pending</div>
                <div class="stat-value">${stats.pending}</div>
            </div>
            <div class="stat-card green animate-fade" style="animation-delay:0.2s">
                <div class="stat-label">Resolved</div>
                <div class="stat-value">${stats.resolved}</div>
            </div>
        `;

        // Recent doubts
        const doubtsRes = await fetch(`/api/student/doubts?student_id=${currentUser.id}&status=All`);
        const doubts = await doubtsRes.json();
        const recent = doubts.slice(0, 5);

        if (recent.length === 0) {
            document.getElementById('studentRecentTable').innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <p>No doubts submitted yet. Click "Add Doubt" to get started!</p>
                </div>
            `;
        } else {
            document.getElementById('studentRecentTable').innerHTML = renderDoubtsTable(recent, false);
        }
    } catch (e) {
        showToast('Failed to load data.', 'error');
    }
}

async function loadStudentDoubts() {
    if (!currentUser) return;
    const filter = document.getElementById('studentFilterStatus').value;
    try {
        const res = await fetch(`/api/student/doubts?student_id=${currentUser.id}&status=${filter}`);
        const doubts = await res.json();

        if (doubts.length === 0) {
            document.getElementById('studentDoubtsTable').innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>No doubts found for this filter.</p>
                </div>
            `;
        } else {
            document.getElementById('studentDoubtsTable').innerHTML = renderDoubtsTable(doubts, true);
        }
    } catch (e) {
        showToast('Failed to load doubts.', 'error');
    }
}

async function submitDoubt() {
    const subject = document.getElementById('doubtSubject').value;
    const text = document.getElementById('doubtText').value.trim();

    if (!subject) { showToast('Please select a subject.', 'error'); return; }
    if (!text) { showToast('Please describe your doubt.', 'error'); return; }
    if (text.length < 10) { showToast('Please provide more detail (at least 10 characters).', 'error'); return; }

    try {
        const res = await fetch('/api/doubt/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: currentUser.id, subject, doubt_text: text })
        });
        const data = await res.json();

        if (data.success) {
            showToast('Doubt submitted successfully!', 'success');
            document.getElementById('doubtSubject').value = '';
            document.getElementById('doubtText').value = '';
            loadStudentOverview();
        } else {
            showToast(data.error || 'Failed to submit.', 'error');
        }
    } catch (e) {
        showToast('Connection error.', 'error');
    }
}

// ==========================================
// Teacher Functions
// ==========================================
async function loadTeacherOverview() {
    if (!currentUser) return;
    try {
        const res = await fetch(`/api/teacher/stats?teacher_id=${currentUser.id}`);
        const stats = await res.json();
        document.getElementById('teacherStats').innerHTML = `
            <div class="stat-card amber animate-fade">
                <div class="stat-label">Pending</div>
                <div class="stat-value">${stats.pending}</div>
            </div>
            <div class="stat-card blue animate-fade" style="animation-delay:0.1s">
                <div class="stat-label">In Progress</div>
                <div class="stat-value">${stats.in_progress}</div>
            </div>
            <div class="stat-card green animate-fade" style="animation-delay:0.2s">
                <div class="stat-label">Resolved</div>
                <div class="stat-value">${stats.resolved}</div>
            </div>
            <div class="stat-card indigo animate-fade" style="animation-delay:0.3s">
                <div class="stat-label">My Responses</div>
                <div class="stat-value">${stats.my_responses}</div>
            </div>
        `;
    } catch (e) { showToast('Failed to load stats.', 'error'); }
}

async function loadTeacherDoubts(status) {
    try {
        const res = await fetch(`/api/teacher/doubts?status=${status}`);
        const doubts = await res.json();
        const tableId = 'teacherPendingTable';
        if (doubts.length === 0) {
            document.getElementById(tableId).innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">✅</div>
                    <p>No pending doubts! All caught up.</p>
                </div>
            `;
        } else {
            document.getElementById(tableId).innerHTML = renderDoubtsTable(doubts, true, true);
        }
    } catch (e) { showToast('Failed to load doubts.', 'error'); }
}

async function loadTeacherAllDoubts() {
    const filter = document.getElementById('teacherFilterStatus').value;
    try {
        const res = await fetch(`/api/teacher/doubts?status=${filter}`);
        const doubts = await res.json();
        if (doubts.length === 0) {
            document.getElementById('teacherAllTable').innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>No doubts found.</p>
                </div>
            `;
        } else {
            document.getElementById('teacherAllTable').innerHTML = renderDoubtsTable(doubts, true, true);
        }
    } catch (e) { showToast('Failed to load doubts.', 'error'); }
}

// ==========================================
// Admin Functions
// ==========================================
async function loadAdminOverview() {
    try {
        const res = await fetch('/api/admin/stats');
        const stats = await res.json();
        document.getElementById('adminStats').innerHTML = `
            <div class="stat-card blue animate-fade">
                <div class="stat-label">Students</div>
                <div class="stat-value">${stats.students}</div>
            </div>
            <div class="stat-card green animate-fade" style="animation-delay:0.1s">
                <div class="stat-label">Teachers</div>
                <div class="stat-value">${stats.teachers}</div>
            </div>
            <div class="stat-card indigo animate-fade" style="animation-delay:0.2s">
                <div class="stat-label">Total Doubts</div>
                <div class="stat-value">${stats.total_doubts}</div>
            </div>
            <div class="stat-card amber animate-fade" style="animation-delay:0.3s">
                <div class="stat-label">Resolved</div>
                <div class="stat-value">${stats.resolved}</div>
            </div>
            <div class="stat-card red animate-fade" style="animation-delay:0.4s">
                <div class="stat-label">Resolution %</div>
                <div class="stat-value">${stats.resolution_pct}%</div>
            </div>
        `;
    } catch (e) { showToast('Failed to load stats.', 'error'); }
}

async function loadAdminDoubts() {
    const filter = document.getElementById('adminFilterStatus').value;
    try {
        const res = await fetch(`/api/teacher/doubts?status=${filter}`);
        const doubts = await res.json();
        document.getElementById('adminDoubtsTable').innerHTML = doubts.length
            ? renderDoubtsTable(doubts, true, true)
            : '<div class="empty-state"><div class="empty-icon">📭</div><p>No doubts found.</p></div>';
    } catch (e) { showToast('Error loading doubts.', 'error'); }
}

async function loadAdminTeachers() {
    try {
        const res = await fetch('/api/admin/teachers');
        const teachers = await res.json();
        let html = `<table><thead><tr>
            <th>ID</th><th>Name</th><th>Subject</th><th>Email</th><th>Admin</th><th>Actions</th>
        </tr></thead><tbody>`;
        teachers.forEach(t => {
            html += `<tr>
                <td>${t.teacher_id}</td>
                <td>${escapeHtml(t.name)}</td>
                <td>${escapeHtml(t.subject)}</td>
                <td>${escapeHtml(t.email)}</td>
                <td>${t.is_admin ? '<span style="color:var(--danger);font-weight:600;">Yes</span>' : 'No'}</td>
                <td>${t.is_admin ? '-' : `<button class="btn btn-danger btn-sm" onclick="deleteTeacher(${t.teacher_id},'${escapeHtml(t.name)}')">Delete</button>`}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        document.getElementById('adminTeachersTable').innerHTML = html;
    } catch (e) { showToast('Error loading teachers.', 'error'); }
}

async function loadAdminStudents() {
    try {
        const res = await fetch('/api/admin/students');
        const students = await res.json();
        let html = `<table><thead><tr>
            <th>ID</th><th>Name</th><th>Email</th><th>Registered</th><th>Doubts</th>
        </tr></thead><tbody>`;
        students.forEach(s => {
            html += `<tr>
                <td>${s.student_id}</td>
                <td>${escapeHtml(s.name)}</td>
                <td>${escapeHtml(s.email)}</td>
                <td>${(s.created_at || '').substring(0, 16)}</td>
                <td><span style="font-weight:700;color:var(--primary-light);">${s.doubt_count}</span></td>
            </tr>`;
        });
        html += '</tbody></table>';
        document.getElementById('adminStudentsTable').innerHTML = html;
    } catch (e) { showToast('Error loading students.', 'error'); }
}

// ==========================================
// Add / Delete Teacher
// ==========================================
function showAddTeacherModal() {
    document.getElementById('addTeacherModal').classList.add('active');
}

function closeTeacherModal() {
    document.getElementById('addTeacherModal').classList.remove('active');
    document.getElementById('newTeacherName').value = '';
    document.getElementById('newTeacherSubject').value = '';
    document.getElementById('newTeacherEmail').value = '';
    document.getElementById('newTeacherPassword').value = '';
}

async function addTeacher() {
    const name = document.getElementById('newTeacherName').value.trim();
    const subject = document.getElementById('newTeacherSubject').value.trim();
    const email = document.getElementById('newTeacherEmail').value.trim();
    const password = document.getElementById('newTeacherPassword').value;

    if (!name || !subject || !email || !password) {
        showToast('All fields are required.', 'error');
        return;
    }

    try {
        const res = await fetch('/api/admin/teacher/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, subject, email, password })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Teacher added!', 'success');
            closeTeacherModal();
            loadAdminTeachers();
        } else {
            showToast(data.error, 'error');
        }
    } catch (e) { showToast('Error adding teacher.', 'error'); }
}

async function deleteTeacher(id, name) {
    if (!confirm(`Delete teacher "${name}"?`)) return;
    try {
        const res = await fetch('/api/admin/teacher/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teacher_id: id })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Teacher deleted.', 'success');
            loadAdminTeachers();
        } else {
            showToast(data.error, 'error');
        }
    } catch (e) { showToast('Error deleting teacher.', 'error'); }
}

// ==========================================
// Doubt Detail Modal
// ==========================================
async function showDoubtDetail(doubtId) {
    try {
        const res = await fetch(`/api/doubt/details?doubt_id=${doubtId}`);
        const data = await res.json();
        const d = data.doubt;
        const responses = data.responses || [];

        const statusClass = d.status.toLowerCase().replace(' ', '-');

        let html = `
            <div class="doubt-detail">
                <div class="doubt-meta">
                    <div class="doubt-meta-item"><span class="meta-label">Student:</span> ${escapeHtml(d.student_name)}</div>
                    <div class="doubt-meta-item"><span class="meta-label">Subject:</span> ${escapeHtml(d.subject)}</div>
                    <div class="doubt-meta-item"><span class="meta-label">Date:</span> ${(d.created_at || '').substring(0, 16)}</div>
                    <div class="doubt-meta-item"><span class="meta-label">Status:</span> <span class="status-badge ${statusClass}"><span class="status-dot ${statusClass}"></span>${d.status}</span></div>
                </div>
                <div class="doubt-text-display">${escapeHtml(d.doubt_text)}</div>
            </div>
        `;

        // Show existing responses
        if (responses.length > 0) {
            responses.forEach(r => {
                html += `
                    <div class="response-card">
                        <h4>✅ Teacher Response</h4>
                        <p>${escapeHtml(r.response_text)}</p>
                        <div class="response-meta">By ${escapeHtml(r.teacher_name)} • ${(r.response_date || '').substring(0, 16)}</div>
                    </div>
                `;
            });
        }

        // If teacher/admin and doubt not resolved, show response form
        if (currentUser && (currentUser.role === 'teacher' || currentUser.role === 'admin') && d.status !== 'Resolved') {
            html += `
                <div style="margin-top:20px;">
                    <div class="form-group">
                        <label style="font-weight:700;color:var(--text-secondary);">Your Response</label>
                        <textarea id="responseText" class="form-control" rows="4" placeholder="Type your response..."></textarea>
                    </div>
                    <div class="form-group">
                        <label style="font-weight:700;color:var(--text-secondary);">Update Status</label>
                        <select id="responseStatus" class="form-control" style="max-width:200px;">
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved" selected>Resolved</option>
                        </select>
                    </div>
                    <button class="btn btn-accent" onclick="submitResponse(${doubtId})">✅ Submit Response</button>
                </div>
            `;
        } else if (responses.length === 0) {
            html += '<div class="no-response">⏳ No response yet. Please wait for a teacher to review your doubt.</div>';
        }

        document.getElementById('modalTitle').textContent = `📝 Doubt #${doubtId}`;
        document.getElementById('modalBody').innerHTML = html;
        document.getElementById('doubtModal').classList.add('active');

    } catch (e) {
        showToast('Failed to load doubt details.', 'error');
    }
}

async function submitResponse(doubtId) {
    const text = document.getElementById('responseText').value.trim();
    const status = document.getElementById('responseStatus').value;

    if (!text) { showToast('Please type your response.', 'error'); return; }

    try {
        const res = await fetch('/api/doubt/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                doubt_id: doubtId,
                teacher_id: currentUser.id,
                response_text: text,
                status: status
            })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Response submitted!', 'success');
            closeModal();
            // Refresh current view
            if (currentUser.role === 'teacher') {
                loadTeacherOverview();
                loadTeacherDoubts('Pending');
            } else if (currentUser.role === 'admin') {
                loadAdminOverview();
                loadAdminDoubts();
            }
        } else {
            showToast(data.error, 'error');
        }
    } catch (e) { showToast('Error submitting response.', 'error'); }
}

function closeModal() {
    document.getElementById('doubtModal').classList.remove('active');
}

// ==========================================
// Table Rendering Helper
// ==========================================
function renderDoubtsTable(doubts, clickable = false, showStudent = false) {
    let html = '<table><thead><tr>';
    html += '<th>ID</th>';
    if (showStudent) html += '<th>Student</th>';
    html += '<th>Subject</th><th>Doubt</th><th>Status</th><th>Date</th>';
    html += '</tr></thead><tbody>';

    doubts.forEach(d => {
        const statusClass = d.status.toLowerCase().replace(' ', '-');
        const rowClass = clickable ? 'clickable-row' : '';
        const onclick = clickable ? `onclick="showDoubtDetail(${d.doubt_id})"` : '';
        const text = d.doubt_text.length > 70 ? d.doubt_text.substring(0, 70) + '...' : d.doubt_text;

        html += `<tr class="${rowClass}" ${onclick}>`;
        html += `<td>${d.doubt_id}</td>`;
        if (showStudent) html += `<td>${escapeHtml(d.student_name || '')}</td>`;
        html += `<td>${escapeHtml(d.subject)}</td>`;
        html += `<td>${escapeHtml(text)}</td>`;
        html += `<td><span class="status-badge ${statusClass}"><span class="status-dot ${statusClass}"></span>${d.status}</span></td>`;
        html += `<td>${(d.created_at || '').substring(0, 16)}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
}

// ==========================================
// Utilities
// ==========================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// Enter key login
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const loginPage = document.getElementById('loginPage');
        const registerPage = document.getElementById('registerPage');
        if (loginPage.classList.contains('active')) {
            performLogin();
        } else if (registerPage.classList.contains('active')) {
            performRegister();
        }
    }
});

console.log('Digital Doubt Tracker loaded successfully.');
