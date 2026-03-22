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
- Dice Game with animated dice and history (48% win chance, ~4% house edge)
- PVP Cards with FULL WEBSOCKET flow (lobby → join → countdown → cards → result)
- PVP disconnect handling (auto-lose for disconnected player)
- Wallet (deposit/withdraw/transaction history)
- Referral system with code + link
- Admin panel (users, transactions, deposits, withdrawals, stats)
- TronGrid API integration (background worker, auto-confirm USDT TRC-20 deposits)
- PWA support (manifest.json, service worker, offline fallback)
- Legal disclaimers (responsible gambling, 18+, no license notice)
- Live activity ticker, toast notifications, skeleton loaders
- Rate limiting, multi-account detection, IP tracking

## Seed Data
- Admin: admin@cryptoplay.io / admin123 (10000 USDT)
- Demo: demo@cryptoplay.io / demo123 (balance varies after games)

## P0 Remaining
- None (all requested features implemented)

## P1 Backlog
- QR code for deposit address
- Leaderboard page
- Email notifications for deposits/withdrawals
- TronGrid API key for higher rate limits

## P2 Backlog
- More game types (slots, roulette)
- Mobile responsive fine-tuning
- Docker setup files
- Detailed fraud detection dashboard

## Next Tasks
- Add leaderboard page
- Integrate QR code generator for deposit address
- Add email notifications
