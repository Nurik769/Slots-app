# CryptoPlay - Crypto Gaming Platform PRD

## Original Problem Statement
Production-grade крипто-ігрова платформа з USDT TRC-20, PVP механіками, ботами, реферальною системою та фінансовими операціями.

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn UI + Framer Motion
- **Backend**: FastAPI (Python) + Motor (async MongoDB)
- **Database**: MongoDB
- **Auth**: JWT (bcrypt password hashing)
- **Real-time**: FastAPI WebSockets (PVP lobbies)

## User Personas
1. **Player** - Грає в Dice/PVP, депозитить/виводить USDT
2. **Admin** - Підтверджує депозити/виводи, переглядає статистику

## Core Requirements
- JWT auth (email/password, bcrypt)
- Dice game (10% win, server-authoritative)
- PVP Card game (lobby system, WebSocket)
- Wallet (USDT TRC-20 deposit/withdraw)
- Referral system (+1 USDT bonus)
- Admin panel (role-based access)
- Dark theme, glow effects, crypto/gambling UI
- Rate limiting, anti-cheat, fraud detection

## What's Been Implemented (2026-03-22)
- Full backend API (28 endpoints tested, 100% pass)
- Landing page with hero, CTA, live activity
- Auth (login/register with JWT)
- Dashboard (balance, transactions, quick actions)
- Dice Game with animated dice and history
- PVP Cards with lobby create/join/cancel
- Wallet (deposit/withdraw/transaction history)
- Referral system with code + link
- Admin panel (users, transactions, deposits, withdrawals, stats)
- Live activity ticker, toast notifications, skeleton loaders
- Rate limiting, multi-account detection, IP tracking

## Seed Data
- Admin: admin@cryptoplay.io / admin123 (10000 USDT)
- Demo: demo@cryptoplay.io / demo123 (100 USDT)

## P0 Remaining
- None (core MVP complete)

## P1 Backlog
- PWA support (manifest.json, service worker)
- WebSocket real-time PVP game flow (currently REST-based auto-play)
- Anti-disconnect timeout for PVP
- More detailed fraud detection

## P2 Backlog
- QR code for deposit address
- Email notifications
- More game types
- Leaderboard
- Mobile responsive polish
- Docker setup files

## Next Tasks
- Add PWA manifest and service worker
- Enhance PVP with full WebSocket game flow
- Add leaderboard page
