# EVENTARA - Setup Guide

## Prerequisites
- Node.js 18+
- XAMPP (Apache + MySQL running)

## Setup Steps
1. git clone / download project
2. cd eventara && npm install
3. Open XAMPP -> Start Apache + MySQL
4. Open phpMyAdmin -> Import database/schema.sql
5. cp .env.example .env (fill in values if needed - defaults work for XAMPP)
6. npm run dev
7. Open http://localhost:3000

## Default Accounts
| Role       | Email                      | Password  |
|------------|----------------------------|-----------|
| Admin      | admin@eventara.com         | password  |
| Organizer  | organizer@eventara.com     | password  |
| Attendee   | attendee@eventara.com      | password  |

## User Flows
- Attendee: Register -> Browse Events -> Book Tickets -> Download PDF -> Check Notifications
- Organizer: Login -> Create Event -> Add Ticket Types -> Publish -> View Analytics -> Scan Tickets at Door
- Admin: Manage all users, feature events, view platform analytics, manage coupons

## Common Issues
- Port in use: change PORT in .env
- DB connection failed: ensure XAMPP MySQL is running, check DB_USER/DB_PASSWORD
- Cookie not sent: ensure credentials:'include' in all fetch calls (already in utils.js)
