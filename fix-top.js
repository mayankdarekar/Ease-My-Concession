const fs = require('fs');

const file = '/Users/mayank/Downloads/final-project/server.js';
let content = fs.readFileSync(file, 'utf8');

// Remove broken top requires (optional cleanup)
content = content.replace(/^.*require.*express.*$/m, '');

// Add clean requires at top
const cleanTop = `
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const PDFDoc = require("pdfkit");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
`;

fs.writeFileSync(file, cleanTop + content);

console.log("✅ Fixed requires at top");
