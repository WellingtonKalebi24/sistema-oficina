# Research Summary: JO.IA

## Stack

React, Vite and TypeScript for the frontend; Node.js, Express and TypeScript for the API; PostgreSQL and Prisma for persistence; Docker Compose for local orchestration; migrations, environment variables, backup and restore strategy as first-class production concerns.

## Table Stakes

- Multiempresa with tenant isolation enforced by backend and data access.
- Authentication, refresh tokens, roles, permissions and audit.
- Customer, vehicle, services, products, stock, appointment, check-in, diagnosis, quote, secure public approval, work order, production, finance, dashboard, history, portal, reports and production readiness.
- Executable validation for every phase.

## Watch Out For

- Do not add automatic notifications, message integrations or notification entities.
- Bind approvals to exact quote versions.
- Use snapshots when converting approved quotes into work orders.
- Use transactions for stock, quote, work order and financial operations.
- Validate tenant isolation wherever operational records are introduced.
- Define JO.IA visual contract before major UI implementation.

## Suggested Project Mode

Use vertical MVP phases. Each phase should deliver an end-to-end, verifiable slice, while respecting dependencies such as foundation before auth, auth before tenant-scoped records, stock before quote item reservation, and quote approval before work order conversion.
