// setup.js — Run once: node setup.js
require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setup() {
  console.log('\n🚂  Ease My Concession — Setup\n');
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  const dbName = process.env.DB_NAME || 'ease_my_concession';
  await db.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await db.query(`USE \`${dbName}\``);
  console.log('✅ Database ready');

  await db.query(`
    CREATE TABLE IF NOT EXISTS admin (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    );
    CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      college_id VARCHAR(50) NOT NULL UNIQUE,
      branch VARCHAR(100) NOT NULL,
      year INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      source_station VARCHAR(100) NOT NULL,
      destination_station VARCHAR(100) NOT NULL,
      duration ENUM('Monthly','Quarterly') NOT NULL,
      status ENUM('Pending','Under Verification','Approved','Rejected') DEFAULT 'Pending',
      applied_date DATE NOT NULL,
      expiry_date DATE DEFAULT NULL,
      pass_id VARCHAR(50) DEFAULT NULL,
      rejection_reason TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      application_id INT NOT NULL,
      document_type ENUM('bonafide','college_id','photo') NOT NULL,
      file_path VARCHAR(255) NOT NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );
  `);
  console.log('✅ Tables created');

  const hash = await bcrypt.hash('admin123', 10);
  await db.query('INSERT IGNORE INTO admin (username, password) VALUES (?, ?)', ['admin', hash]);
  console.log('✅ Admin seeded  (username: admin | password: admin123)');

  await db.end();
  console.log('\n🎉 Setup complete! Run: node server.js\n');
}

setup().catch(e => { console.error('❌ Setup failed:', e.message); process.exit(1); });
