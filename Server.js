
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'charity-complex-secret-key',
    resave: false,
    saveUninitialized: true
}));

// Mock Database Storage
let data = {
    announcements: [
        { id: 1, title: "Admission In Progress", content: "Enroll your child today at Charity Educational Complex, Nalerigu!", date: "2026-05-28" }
    ],
    fridayActivities: ["Morning Devotion", "Spelling Bee Competition", "Inter-class Football Match", "Closing Prayers"],
    teachers: [
        { id: 1, name: "Mr. Simon", role: "Headmaster" }
    ],
    students: [
        { id: "CEC001", name: "John Doe", password: "password123", gradesPublished: false, score: null }
    ],
    inquiries: [],
    quizSubmissions: []
};

// Admin Auth Middleware
function checkAdminAuth(req, res, next) {
    if (req.session.isAdmin) return next();
    res.status(401).json({ error: "Unauthorized access" });
}

// --- API ROUTES ---

// Public Info
app.get('/api/info', (req, res) => {
    res.json({
        announcements: data.announcements,
        fridayActivities: data.fridayActivities,
        teachers: data.teachers
    });
});

// Parent DM Route
app.post('/api/inquire', (req, res) => {
    const { name, phone, message } = req.body;
    data.inquiries.push({ name, phone, message, timestamp: new Date() });
    res.json({ success: true, msg: "Message sent directly to management successfully!" });
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === 'Imhere$$$') {
        req.session.isAdmin = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: "Invalid credentials" });
    }
});

// Teacher Management (CRUD)
app.post('/api/admin/teachers', checkAdminAuth, (req, res) => {
    const { name, role } = req.body;
    const newTeacher = { id: Date.now(), name, role };
    data.teachers.push(newTeacher);
    res.json({ success: true, teachers: data.teachers });
});

app.put('/api/admin/teachers/:id', checkAdminAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const { name, role } = req.body;
    let teacher = data.teachers.find(t => t.id === id);
    if (teacher) {
        teacher.name = name;
        teacher.role = role;
    }
    res.json({ success: true, teachers: data.teachers });
});

app.delete('/api/admin/teachers/:id', checkAdminAuth, (req, res) => {
    const id = parseInt(req.params.id);
    data.teachers = data.teachers.filter(t => t.id !== id);
    res.json({ success: true, teachers: data.teachers });
});

// Student Account Provisioning
app.post('/api/admin/students', checkAdminAuth, (req, res) => {
    const { studentId, name, password } = req.body;
    data.students.push({ id: studentId, name, password, gradesPublished: false, score: null });
    res.json({ success: true, msg: "Student account generated." });
});

// Quiz Submission Endpoint
app.post('/api/student/submit-quiz', (req, res) => {
    const { studentId, answers, cheatingViolations } = req.body;
    
    // Evaluate score (Mock logic: 10 marks total)
    let finalScore = 10; 
    if (cheatingViolations > 0) finalScore = Math.max(0, finalScore - (cheatingViolations * 2)); 

    const submission = { studentId, answers, cheatingViolations, calculatedScore: finalScore, timestamp: new Date() };
    data.quizSubmissions.push(submission);
    
    // Save to student ledger but don't publish yet
    let student = data.students.find(s => s.id === studentId);
    if (student) {
        student.score = finalScore;
    }
    
    res.json({ success: true, msg: "Quiz locked and submitted. Grades will be accessible upon official publication." });
});

// Admin grade management & publication toggle
app.get('/api/admin/submissions', checkAdminAuth, (req, res) => {
    res.json({ submissions: data.quizSubmissions, students: data.students });
});

app.post('/api/admin/publish-grades', checkAdminAuth, (req, res) => {
    const { studentId, finalScore, publish } = req.body;
    let student = data.students.find(s => s.id === studentId);
    if (student) {
        student.score = finalScore;
        student.gradesPublished = publish;
    }
    res.json({ success: true });
});

// Student Portal Authentication & Grade Pull
app.post('/api/student/login', (req, res) => {
    const { studentId, password } = req.body;
    const student = data.students.find(s => s.id === studentId && s.password === password);
    if (!student) return res.status(401).json({ error: "Access Denied: Invalid Student ID or Password." });
    
    res.json({
        authenticated: true,
        name: student.name,
        id: student.id,
        score: student.gradesPublished ? student.score : "Not Yet Published"
    });
});

app.listen(PORT, () => console.log(`Charity Educational Complex server running on port ${PORT}`));
