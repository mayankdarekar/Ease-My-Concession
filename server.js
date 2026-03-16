// ═══════════════════════════════════════════════════════════
//  Ease My Concession — Complete Server (single file)
//  Run: node server.js
// ═══════════════════════════════════════════════════════════

require('dotenv').config();
const express  = require('express');
const mysql    = require('mysql2/promise');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const multer   = require('multer');
const PDFDoc   = require('pdfkit');
const QRCode   = require('qrcode');
const path     = require('path');
const fs       = require('fs');

const app     = express();
const PORT    = process.env.PORT        || 3000;
const SECRET  = process.env.JWT_SECRET  || 'ease_my_concession_secret';
const COLLEGE = process.env.COLLEGE_NAME || 'ABC Engineering College';
const APP_URL = process.env.APP_URL     || `http://localhost:${process.env.PORT || 3000}`;

// ── Middleware ────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Database ──────────────────────────────────────────────
const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  waitForConnections: true,
  connectionLimit: 10
});

db.getConnection()
  .then(c => { console.log('✅ MySQL connected'); c.release(); })
  .catch(e => console.error('❌ DB Error:', e.message));

// ── Multer (file uploads) ─────────────────────────────────
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadDir, `student_${req.user?.id || 'tmp'}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) =>
    cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── Auth Middleware ───────────────────────────────────────
const auth = (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token.' });
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { return res.status(401).json({ message: 'Invalid token.' }); }
};

const adminAuth = (req, res, next) => {
  auth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only.' });
    next();
  });
};

// ── Helpers ───────────────────────────────────────────────
const signToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: '7d' });

const makePassId = () =>
  `RCP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

const computeExpiry = (duration) => {
  const d = new Date();
  duration === 'Monthly' ? d.setMonth(d.getMonth() + 1) : d.setMonth(d.getMonth() + 3);
  return d.toISOString().split('T')[0];
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

// ── PDF Generator ─────────────────────────────────────────
async function generatePDF(data) {
  // Build a scannable verification URL
  const verifyUrl = `${APP_URL}/verify?pass_id=${encodeURIComponent(data.passId)}&student=${encodeURIComponent(data.name)}&route=${encodeURIComponent(data.source + ' to ' + data.dest)}&expiry=${encodeURIComponent(data.expiry)}`;

  const qrImg = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: 'M',
    width: 140,
    margin: 1,
  });
  const qrBuf = Buffer.from(qrImg.replace(/^data:image\/png;base64,/, ''), 'base64');

  return new Promise((resolve, reject) => {
    const doc    = new PDFDoc({ size: [620, 440], margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    const chunks = [];
    doc.on('data',  c => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = 620;
    const H = 440;

    // ── Background ──────────────────────────────────────
    doc.rect(0, 0, W, H).fill('#f0f4ff');

    // ── Header band ─────────────────────────────────────
    doc.rect(0, 0, W, 100).fill('#0f2d5e');

    // Orange accent stripe
    doc.rect(0, 98, W, 5).fill('#f97316');

    // ── Emblem circle ───────────────────────────────────
    doc.circle(60, 50, 36).fill('#ffffff');
    doc.fontSize(8).fillColor('#0f2d5e').font('Helvetica-Bold')
      .text('INDIAN', 26, 36, { width: 68, align: 'center' });
    doc.fontSize(8).text('RAILWAYS', 26, 47, { width: 68, align: 'center' });
    doc.fontSize(9).fillColor('#f97316').text('===', 36, 58, { width: 48, align: 'center' });

    // ── Header text ──────────────────────────────────────
    doc.fontSize(20).fillColor('#ffffff').font('Helvetica-Bold')
      .text('RAILWAY CONCESSION PASS', 110, 22, { width: W - 130, align: 'center' });

    doc.fontSize(10).fillColor('#93c5fd').font('Helvetica')
      .text(COLLEGE.toUpperCase(), 110, 50, { width: W - 130, align: 'center' });

    doc.fontSize(9).fillColor('#f97316').font('Helvetica-Bold')
      .text('PASS ID:  ' + data.passId, 110, 70, { width: W - 130, align: 'center' });

    // ── Body layout ──────────────────────────────────────
    const bodyY  = 118;
    const colL   = 44;
    const colM   = 310;
    const colR   = 480;
    const lh     = 38;

    // Helper: label + value pair
    const field = (label, value, x, y, opts = {}) => {
      doc.fontSize(7.5).fillColor('#6b7280').font('Helvetica')
        .text(label, x, y, { width: opts.width || 200 });
      doc.fontSize(11).fillColor('#111827').font('Helvetica-Bold')
        .text(value || '-', x, y + 11, { width: opts.width || 200 });
    };

    // Left column
    field('STUDENT NAME',   data.name,              colL,     bodyY);
    field('COLLEGE ID',     data.collegeId,          colL,     bodyY + lh);
    field('BRANCH & YEAR',  data.branch + '  -  Year ' + data.year, colL, bodyY + lh * 2);
    field('DURATION',       data.duration,           colL,     bodyY + lh * 3);

    // Middle column
    field('ISSUE DATE',     fmtDate(data.issued),    colM,     bodyY);

    // Expiry date — highlighted box
    doc.fontSize(7.5).fillColor('#6b7280').font('Helvetica')
      .text('EXPIRY DATE', colM, bodyY + lh);
    doc.roundedRect(colM, bodyY + lh + 12, 145, 22, 4).fill('#fef3c7').stroke('#f59e0b');
    doc.fontSize(11).fillColor('#92400e').font('Helvetica-Bold')
      .text(fmtDate(data.expiry), colM + 8, bodyY + lh + 16, { width: 130 });

    // ── Route box ────────────────────────────────────────
    const routeY = bodyY + lh * 4 + 6;
    doc.roundedRect(colL, routeY, 260, 48, 7).fill('#0f2d5e');
    doc.fontSize(7.5).fillColor('#93c5fd').font('Helvetica')
      .text('VALID ROUTE', colL + 12, routeY + 9);
    doc.fontSize(13).fillColor('#ffffff').font('Helvetica-Bold')
      .text(data.source + '  >>  ' + data.dest, colL + 12, routeY + 21, { width: 236 });

    // ── QR Code ──────────────────────────────────────────
    doc.image(qrBuf, colR, bodyY, { width: 115, height: 115 });
    doc.fontSize(7).fillColor('#6b7280').font('Helvetica')
      .text('Scan to verify pass', colR, bodyY + 118, { width: 115, align: 'center' });

    // ── Divider ──────────────────────────────────────────
    doc.moveTo(colL, routeY + 58).lineTo(W - colL, routeY + 58).stroke('#d1d5db');

    // ── Footer note ──────────────────────────────────────
    doc.roundedRect(colL, routeY + 66, W - colL * 2, 20, 4).fill('#dbeafe');
    doc.fontSize(8).fillColor('#1e40af').font('Helvetica')
      .text(
        'This pass is valid for local train travel only on the mentioned route. Subject to verification by railway staff.',
        colL + 8, routeY + 72, { width: W - colL * 2 - 16 }
      );

    // ── Bottom bar ───────────────────────────────────────
    doc.rect(0, H - 28, W, 28).fill('#0f2d5e');
    doc.fontSize(8).fillColor('#93c5fd').font('Helvetica')
      .text(
        'Digitally generated by Ease My Concession System  |  ' + COLLEGE,
        0, H - 17, { width: W, align: 'center' }
      );

    doc.end();
  });
}

// ── Pass Verification Page ────────────────────────────────
app.get('/verify', async (req, res) => {
  const { pass_id, student, route, expiry } = req.query;
  if (!pass_id) return res.status(400).send('Invalid verification link.');

  // Check DB
  const [rows] = await db.query(
    "SELECT a.*,s.name,s.college_id FROM applications a JOIN students s ON s.id=a.student_id WHERE a.pass_id=? AND a.status='Approved'",
    [pass_id]
  );

  if (!rows.length) {
    return res.send(`<!DOCTYPE html><html><head><title>Pass Verification</title>
      <script src="https://cdn.tailwindcss.com"></script></head>
      <body class="min-h-screen bg-red-50 flex items-center justify-center">
        <div class="bg-white rounded-2xl p-10 text-center shadow-xl max-w-md">
          <div class="text-6xl mb-4">❌</div>
          <h1 class="text-2xl font-bold text-red-600 mb-2">Pass Not Valid</h1>
          <p class="text-slate-500">This pass ID could not be verified.</p>
        </div>
      </body></html>`);
  }

  const a = rows[0];
  return res.send(`<!DOCTYPE html><html><head><title>Pass Verification</title>
    <script src="https://cdn.tailwindcss.com"></script></head>
    <body class="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl p-10 text-center shadow-xl max-w-md w-full">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h1 class="text-2xl font-bold text-green-700 mb-1">Pass Verified</h1>
        <p class="text-slate-400 text-sm mb-6">This railway concession pass is authentic and valid.</p>
        <div class="text-left space-y-3">
          <div class="bg-slate-50 rounded-xl p-3 border border-slate-100"><p class="text-xs font-bold uppercase text-slate-400 mb-1">Pass ID</p><p class="font-bold text-slate-800">${a.pass_id}</p></div>
          <div class="bg-slate-50 rounded-xl p-3 border border-slate-100"><p class="text-xs font-bold uppercase text-slate-400 mb-1">Student</p><p class="font-bold text-slate-800">${a.name}</p></div>
          <div class="bg-slate-50 rounded-xl p-3 border border-slate-100"><p class="text-xs font-bold uppercase text-slate-400 mb-1">Route</p><p class="font-bold text-slate-800">${a.source_station} to ${a.destination_station}</p></div>
          <div class="bg-${new Date(a.expiry_date) > new Date() ? 'green' : 'red'}-50 rounded-xl p-3 border border-${new Date(a.expiry_date) > new Date() ? 'green' : 'red'}-100"><p class="text-xs font-bold uppercase text-slate-400 mb-1">Expiry Date</p><p class="font-bold text-${new Date(a.expiry_date) > new Date() ? 'green' : 'red'}-700">${fmtDate(a.expiry_date)} ${new Date(a.expiry_date) > new Date() ? '(Active)' : '(Expired)'}</p></div>
        </div>
        <p class="text-xs text-slate-300 mt-6">Verified by Ease My Concession System</p>
      </div>
    </body></html>`);
});

// ══════════════════════════════════════════════════════════
//  PAGE ROUTES
// ══════════════════════════════════════════════════════════
const page = (f) => (_, res) => res.sendFile(path.join(__dirname, 'public', f));

app.get('/',                page('index.html'));
app.get('/login',           page('login.html'));
app.get('/signup',          page('signup.html'));
app.get('/dashboard',       page('dashboard.html'));
app.get('/apply',           page('apply.html'));
app.get('/status',          page('status.html'));
app.get('/admin-login',     page('admin-login.html'));
app.get('/admin-dashboard', page('admin-dashboard.html'));

// ══════════════════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════════════════
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, college_id, branch, year } = req.body;
    if (!name || !email || !password || !college_id || !branch || !year)
      return res.status(400).json({ message: 'All fields are required.' });
    const [exists] = await db.query('SELECT id FROM students WHERE email=? OR college_id=?', [email, college_id]);
    if (exists.length) return res.status(409).json({ message: 'Email or College ID already registered.' });
    const hash = await bcrypt.hash(password, 10);
    const [r]  = await db.query(
      'INSERT INTO students (name,email,password,college_id,branch,year) VALUES (?,?,?,?,?,?)',
      [name, email, hash, college_id, branch, parseInt(year)]
    );
    const token = signToken({ id: r.insertId, role: 'student', name, email });
    res.status(201).json({ token, user: { id: r.insertId, name, email, college_id, branch, year } });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query('SELECT * FROM students WHERE email=?', [email]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password)))
      return res.status(401).json({ message: 'Invalid email or password.' });
    const s = rows[0];
    const token = signToken({ id: s.id, role: 'student', name: s.name, email: s.email });
    res.json({ token, user: { id: s.id, name: s.name, email: s.email, college_id: s.college_id, branch: s.branch, year: s.year } });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await db.query('SELECT * FROM admin WHERE username=?', [username]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password)))
      return res.status(401).json({ message: 'Invalid credentials.' });
    const token = signToken({ id: rows[0].id, role: 'admin', username });
    res.json({ token, user: { id: rows[0].id, username, role: 'admin' } });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ══════════════════════════════════════════════════════════
//  STUDENT ROUTES
// ══════════════════════════════════════════════════════════
app.get('/api/student/profile', auth, async (req, res) => {
  const [r] = await db.query('SELECT id,name,email,college_id,branch,year FROM students WHERE id=?', [req.user.id]);
  r.length ? res.json({ student: r[0] }) : res.status(404).json({ message: 'Not found.' });
});

app.post('/api/student/apply-pass', auth, upload.fields([
  { name: 'bonafide', maxCount: 1 },
  { name: 'college_id', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
]), async (req, res) => {
  try {
    const { source_station, destination_station, duration } = req.body;
    if (!source_station || !destination_station || !duration)
      return res.status(400).json({ message: 'All fields required.' });
    const [existing] = await db.query(
      "SELECT id FROM applications WHERE student_id=? AND status IN ('Pending','Under Verification','Approved')",
      [req.user.id]
    );
    if (existing.length) return res.status(409).json({ message: 'You already have an active application.' });
    const today = new Date().toISOString().split('T')[0];
    const [r] = await db.query(
      "INSERT INTO applications (student_id,source_station,destination_station,duration,status,applied_date) VALUES (?,?,?,?,'Pending',?)",
      [req.user.id, source_station, destination_station, duration, today]
    );
    if (req.files) {
      for (const [type, files] of Object.entries(req.files)) {
        await db.query('INSERT INTO documents (application_id,document_type,file_path) VALUES (?,?,?)',
          [r.insertId, type, files[0].path.replace(/\\/g, '/')]);
      }
    }
    res.status(201).json({ message: 'Application submitted!', applicationId: r.insertId });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/student/applications', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id,source_station,destination_station,duration,status,applied_date,expiry_date,pass_id,rejection_reason FROM applications WHERE student_id=? ORDER BY applied_date DESC',
      [req.user.id]
    );
    res.json({ applications: rows });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/student/application/:id', auth, async (req, res) => {
  try {
    const [apps] = await db.query(
      'SELECT a.*,s.name,s.college_id,s.branch,s.year FROM applications a JOIN students s ON s.id=a.student_id WHERE a.id=? AND a.student_id=?',
      [req.params.id, req.user.id]
    );
    if (!apps.length) return res.status(404).json({ message: 'Not found.' });
    const [docs] = await db.query('SELECT document_type,file_path FROM documents WHERE application_id=?', [req.params.id]);
    res.json({ application: apps[0], documents: docs });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/student/download-pass/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT a.*,s.name,s.college_id,s.branch,s.year FROM applications a JOIN students s ON s.id=a.student_id WHERE a.id=? AND a.student_id=? AND a.status='Approved'",
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Approved pass not found.' });
    const a   = rows[0];
    const pdf = await generatePDF({ passId: a.pass_id, name: a.name, collegeId: a.college_id, branch: a.branch, year: a.year, source: a.source_station, dest: a.destination_station, duration: a.duration, issued: a.applied_date, expiry: a.expiry_date });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="pass_${a.pass_id}.pdf"`);
    res.send(pdf);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ══════════════════════════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════════════════════════
app.get('/api/admin/dashboard', adminAuth, async (req, res) => {
  try {
    const [[{ total }]]              = await db.query('SELECT COUNT(*) AS total FROM applications');
    const [[{ pending }]]            = await db.query("SELECT COUNT(*) AS pending FROM applications WHERE status='Pending'");
    const [[{ under_verification }]] = await db.query("SELECT COUNT(*) AS under_verification FROM applications WHERE status='Under Verification'");
    const [[{ approved }]]           = await db.query("SELECT COUNT(*) AS approved FROM applications WHERE status='Approved'");
    const [[{ rejected }]]           = await db.query("SELECT COUNT(*) AS rejected FROM applications WHERE status='Rejected'");
    res.json({ stats: { total, pending, under_verification, approved, rejected } });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/applications', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let q = 'SELECT a.*,s.name AS student_name,s.email,s.college_id,s.branch,s.year FROM applications a JOIN students s ON s.id=a.student_id';
    const params = [];
    if (status) { q += ' WHERE a.status=?'; params.push(status); }
    q += ' ORDER BY a.applied_date DESC';
    const [rows] = await db.query(q, params);
    res.json({ applications: rows });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/application/:id', adminAuth, async (req, res) => {
  try {
    const [apps] = await db.query(
      'SELECT a.*,s.name AS student_name,s.email,s.college_id,s.branch,s.year FROM applications a JOIN students s ON s.id=a.student_id WHERE a.id=?',
      [req.params.id]
    );
    if (!apps.length) return res.status(404).json({ message: 'Not found.' });
    const [docs] = await db.query('SELECT id,document_type,file_path FROM documents WHERE application_id=?', [req.params.id]);
    res.json({ application: apps[0], documents: docs });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/admin/approve/:id', adminAuth, async (req, res) => {
  try {
    const [apps] = await db.query("SELECT * FROM applications WHERE id=? AND status!='Approved'", [req.params.id]);
    if (!apps.length) return res.status(404).json({ message: 'Not found or already approved.' });
    const pid = makePassId();
    const exp = computeExpiry(apps[0].duration);
    await db.query("UPDATE applications SET status='Approved',pass_id=?,expiry_date=? WHERE id=?", [pid, exp, req.params.id]);
    res.json({ message: 'Approved!', passId: pid, expiryDate: exp });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/admin/reject/:id', adminAuth, async (req, res) => {
  try {
    await db.query("UPDATE applications SET status='Rejected',rejection_reason=? WHERE id=?",
      [req.body.reason || 'Documents not valid.', req.params.id]);
    res.json({ message: 'Rejected.' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/admin/set-verification/:id', adminAuth, async (req, res) => {
  try {
    await db.query("UPDATE applications SET status='Under Verification' WHERE id=?", [req.params.id]);
    res.json({ message: 'Status updated.' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/download-pass/:id', adminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT a.*,s.name,s.college_id,s.branch,s.year FROM applications a JOIN students s ON s.id=a.student_id WHERE a.id=? AND a.status='Approved'",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found.' });
    const a   = rows[0];
    const pdf = await generatePDF({ passId: a.pass_id, name: a.name, collegeId: a.college_id, branch: a.branch, year: a.year, source: a.source_station, dest: a.destination_station, duration: a.duration, issued: a.applied_date, expiry: a.expiry_date });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="pass_${a.pass_id}.pdf"`);
    res.send(pdf);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/document', adminAuth, (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ message: 'No path.' });
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(__dirname, 'uploads')))
    return res.status(403).json({ message: 'Access denied.' });
  res.sendFile(resolved);
});

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚂  Ease My Concession is running!`);
  console.log(`📡  http://localhost:${PORT}\n`);
  console.log(`🔍  QR Code verification: ${APP_URL}/verify?pass_id=PASS_ID\n`);
});
