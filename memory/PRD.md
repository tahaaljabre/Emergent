# Office Services Manager (Arabic RTL)

Mobile app to run a security & cleaning services office. Track contracts, clients, employees, and revenue. Every entity supports edit / delete / archive with a dedicated Archive screen. Arabic + English, Light/Dark, full CRUD, statements, reports, and backup.

## Stack
- Expo Router mobile app (React Native)
- FastAPI + MongoDB backend, seeded on startup

## Key Screens
- Dashboard: KPIs, service breakdown, expiring contracts (auto-flagged within 30 days)
- Clients: Cleaning/Security segmented, search, CRUD, archive
- Employees: Search, CRUD, archive
- Statement: Client/employee statement with add/delete transactions and running balance
- Settings: Office info, Archive, Reports, Backup, Theme (Light/Dark/System), Language (AR/EN)
- Archive: Restore or hard-delete archived clients/employees
- Reports: Monthly/Yearly revenue and by-service breakdown

## Backend Endpoints (all under /api)
- GET/POST /clients, GET/PUT/DELETE /clients/{id}, POST /clients/{id}/archive
- GET/POST /employees, GET/PUT/DELETE /employees/{id}, POST /employees/{id}/archive
- GET /transactions/{type}/{id}, POST /transactions, DELETE /transactions/{id}
- GET /dashboard, GET/PUT /settings, GET /backup
