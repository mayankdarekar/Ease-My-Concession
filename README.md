# Ease My Concession

Ease My Concession is a web-based system designed to digitize the railway concession process for students. It replaces manual paperwork and register-based tracking with a streamlined digital workflow for both students and college administration.

## Features

- Student registration and login
- Online concession application form
- Storage of student details including personal and academic information
- MySQL-based structured data management
- Integration with Google Sheets for real-time, Excel-like data access
- Admin-side access to manage and review applications

## Tech Stack

Frontend:
- HTML
- CSS
- JavaScript

Backend:
- Node.js
- Express.js

Database:
- MySQL

Additional:
- Google Sheets API

## How It Works

1. Student fills form
2. Data goes to backend
3. Stored in MySQL
4. Synced to Google Sheets
5. Admin can view/manage data

## Why Google Sheets Instead of Excel

- Real-time updates
- Cloud access
- Easy sharing
- Works better on macOS
- No manual export needed

## Setup

git clone https://github.com/mayankdarekar/Ease-My-Concession.git  
cd Ease-My-Concession  
npm install  
node server.js  

Open: http://localhost:3000

## Future Scope

- Railway format PDF pass
- Admin dashboard improvements
- Deployment
