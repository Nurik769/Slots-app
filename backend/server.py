from fastapi import FastAPI, APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import random
import string
import time
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone
import jwt
import bcrypt
import asyncio
import requests as sync_requests
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback-secret-change-me')
JWT_ALGORITHM = "HS256"
JWT_EXPIRY = 86400 * 7

# Constants
DEPOSIT_ADDRESS = "TTHqZYyEvMSCH1LsPGCQkpdcncp3iiGC4F"
MIN_BET = 5.0
DICE_WIN_CHANCE = 0.48  # 48% win chance (casino-like, ~4% house edge)
REFERRAL_BONUS = 1.0

# TronGrid Config
TRONGRID_API = "https://api.trongrid.io"
USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
PVP_DISCONNECT_TIMEOUT = 30

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ========== RATE LIMITING ==========
rate_limit_store = defaultdict(list)
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 300

# ========== PVP GAME MANAGER ==========
class PvpGameManager:
    def __init__(self):
        self.connections: Dict[str, Dict[str, dict]] = {}
        self.game_tasks: Dict[str, asyncio.Task] = {}

    async def connect(self, lobby_id: str, user_id: str, username: str, websocket: WebSocket):
        await websocket.accept()
        if lobby_id not in self.connections:
            self.connections[lobby_id] = {}
        self.connections[lobby_id][user_id] = {"ws": websocket, "username": username}

        await self.broadcast(lobby_id, {
            "type": "player_joined",
            "user_id": user_id,
            "username": username,
            "player_count": len(self.connections[lobby_id])
        })

        lobby = await db.pvp_lobbies.find_one({"id": lobby_id}, {"_id": 0})
        if lobby and lobby["status"] == "active" and len(self.connections[lobby_id]) >= 2:
            if lobby_id not in self.game_tasks:
                task = asyncio.create_task(self.run_game(lobby_id))
                self.game_tasks[lobby_id] = task

    async def broadcast(self, lobby_id: str, message: dict):
        if lobby_id not in self.connections:
            return
        dead = []
        for uid, info in self.connections[lobby_id].items():
            try:
                await info["ws"].send_json(message)
            except Exception:
                dead.append(uid)
        for uid in dead:
            self.connections[lobby_id].pop(uid, None)

    async def run_game(self, lobby_id: str):
        try:
            lobby = await db.pvp_lobbies.find_one({"id": lobby_id}, {"_id": 0})
            if not lobby or lobby["status"] != "active":
                return

            players = lobby["players"]
            if len(players) < 2:
                return

            for i in range(3, 0, -1):
                await self.broadcast(lobby_id, {"type": "countdown", "seconds": i})
                await asyncio.sleep(1)

            card_names = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
            suits = ["hearts", "diamonds", "clubs", "spades"]

            c1_val = random.randint(0, 12)
            c2_val = random.randint(0, 12)
            while c1_val == c2_val:
                c2_val = random.randint(0, 12)

            c1 = {"value": c1_val, "name": card_names[c1_val], "suit": random.choice(suits)}
            c2 = {"value": c2_val, "name": card_names[c2_val], "suit": random.choice(suits)}

            p1, p2 = players[0], players[1]
            winner_id = p1["id"] if c1_val > c2_val else p2["id"]
            winner_username = p1["username"] if c1_val > c2_val else p2["username"]
            total_pot = lobby["bet_amount"] * 2

            await self.broadcast(lobby_id, {
                "type": "cards_dealt",
                "players": {
                    p1["id"]: {"username": p1["username"], "card": c1},
                    p2["id"]: {"username": p2["username"], "card": c2}
                }
            })

            await asyncio.sleep(2)

            await db.users.update_one({"id": winner_id}, {"$inc": {"balance": total_pot}})

            game_result = {
                "creator": {"username": p1["username"], "card": c1},
                "joiner": {"username": p2["username"], "card": c2},
                "winner_id": winner_id,
                "winner_username": winner_username,
                "total_pot": total_pot
            }

            await db.pvp_lobbies.update_one(
                {"id": lobby_id},
                {"$set": {"status": "finished", "winner_id": winner_id, "result": game_result}}
            )

            await db.transactions.insert_one({
                "id": str(uuid.uuid4()), "user_id": winner_id, "type": "win",
                "amount": total_pot, "status": "completed",
                "details": {"game_id": lobby_id, "game": "pvp_cards"},
                "created_at": datetime.now(timezone.utc).isoformat()
            })

            await db.games.insert_one({
                "id": lobby_id, "type": "pvp_cards",
                "players": [p1["id"], p2["id"]],
                "usernames": [p1["username"], p2["username"]],
                "bet_amount": lobby["bet_amount"],
                "winner_id": winner_id, "winner_username": winner_username,
                "result": game_result, "is_win": True, "win_amount": total_pot,
                "username": winner_username,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

            await self.broadcast(lobby_id, {"type": "game_result", "result": game_result})

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"PVP game error for lobby {lobby_id}: {e}")
        finally:
            self.game_tasks.pop(lobby_id, None)

    async def handle_disconnect(self, lobby_id: str, user_id: str):
        if lobby_id in self.connections:
            self.connections[lobby_id].pop(user_id, None)

        lobby = await db.pvp_lobbies.find_one({"id": lobby_id}, {"_id": 0})
        if not lobby or lobby["status"] != "active":
            await self.broadcast(lobby_id, {"type": "player_disconnected", "user_id": user_id})
            return

        if lobby_id in self.game_tasks:
            self.game_tasks[lobby_id].cancel()
            self.game_tasks.pop(lobby_id, None)

        remaining = self.connections.get(lobby_id, {})
        if remaining:
            winner_id = list(remaining.keys())[0]
            winner_info = list(remaining.values())[0]
            total_pot = lobby["bet_amount"] * 2

            await db.users.update_one({"id": winner_id}, {"$inc": {"balance": total_pot}})

            result = {
                "winner_id": winner_id,
                "winner_username": winner_info["username"],
                "total_pot": total_pot,
                "reason": "opponent_disconnected"
            }

            await db.pvp_lobbies.update_one(
                {"id": lobby_id},
                {"$set": {"status": "finished", "winner_id": winner_id, "result": result}}
            )

            await db.transactions.insert_one({
                "id": str(uuid.uuid4()), "user_id": winner_id, "type": "win",
                "amount": total_pot, "status": "completed",
                "details": {"game_id": lobby_id, "game": "pvp_cards", "reason": "opponent_disconnected"},
                "created_at": datetime.now(timezone.utc).isoformat()
            })

            await self.broadcast(lobby_id, {
                "type": "game_result", "result": result, "reason": "opponent_disconnected"
            })
        else:
            await db.pvp_lobbies.update_one(
                {"id": lobby_id}, {"$set": {"status": "cancelled"}}
            )
            for p in lobby["players"]:
                await db.users.update_one({"id": p["id"]}, {"$inc": {"balance": lobby["bet_amount"]}})

pvp_manager = PvpGameManager()

# ========== PYDANTIC MODELS ==========
class RegisterInput(BaseModel):
    email: str
    username: str
    password: str
    referral_code: Optional[str] = None

class LoginInput(BaseModel):
    email: str
    password: str

class DepositInput(BaseModel):
    amount: float
    tx_hash: Optional[str] = None

class WithdrawInput(BaseModel):
    amount: float
    address: str

class DicePlayInput(BaseModel):
    bet_amount: float

class PvpCreateInput(BaseModel):
    bet_amount: float

# ========== HELPERS ==========
def generate_referral_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": int(time.time()) + JWT_EXPIRY,
        "iat": int(time.time())
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ========== AUTH DEPENDENCY ==========
async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.split(" ")[1]
    payload = decode_token(token)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_admin_user(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ========== MIDDLEWARE ==========
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path.startswith("/api"):
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()
        rate_limit_store[client_ip] = [
            t for t in rate_limit_store[client_ip]
            if current_time - t < RATE_LIMIT_WINDOW
        ]
        if len(rate_limit_store[client_ip]) >= RATE_LIMIT_MAX:
            return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})
        rate_limit_store[client_ip].append(current_time)
    response = await call_next(request)
    return response

# ========== AUTH ROUTES ==========
@api_router.post("/auth/register")
async def register(input: RegisterInput, request: Request):
    existing = await db.users.find_one(
        {"$or": [{"email": input.email}, {"username": input.username}]}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email or username already exists")

    client_ip = request.client.host if request.client else "unknown"
    existing_ip = await db.users.find_one({"ip_addresses": client_ip})
    flagged = existing_ip is not None

    user_id = str(uuid.uuid4())
    referral_code = generate_referral_code()

    user = {
        "id": user_id,
        "email": input.email,
        "username": input.username,
        "password_hash": hash_password(input.password),
        "balance": 0.0,
        "role": "user",
        "referral_code": referral_code,
        "referred_by": None,
        "ip_addresses": [client_ip],
        "flagged": flagged,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    if input.referral_code:
        referrer = await db.users.find_one({"referral_code": input.referral_code})
        if referrer and client_ip not in referrer.get("ip_addresses", []):
            user["referred_by"] = input.referral_code
            await db.users.update_one(
                {"id": referrer["id"]},
                {"$inc": {"balance": REFERRAL_BONUS}}
            )
            await db.transactions.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": referrer["id"],
                "type": "referral_bonus",
                "amount": REFERRAL_BONUS,
                "status": "completed",
                "details": {"referred_user": input.username},
                "created_at": datetime.now(timezone.utc).isoformat()
            })

    await db.users.insert_one(user)
    token = create_token(user_id, "user")

    return {
        "token": token,
        "user": {
            "id": user_id, "email": input.email, "username": input.username,
            "balance": 0.0, "role": "user", "referral_code": referral_code
        }
    }

@api_router.post("/auth/login")
async def login(input: LoginInput, request: Request):
    user = await db.users.find_one({"email": input.email}, {"_id": 0})
    if not user or not verify_password(input.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    client_ip = request.client.host if request.client else "unknown"
    if client_ip not in user.get("ip_addresses", []):
        await db.users.update_one(
            {"id": user["id"]},
            {"$addToSet": {"ip_addresses": client_ip}}
        )

    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"], "email": user["email"], "username": user["username"],
            "balance": user["balance"], "role": user["role"],
            "referral_code": user["referral_code"]
        }
    }

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {
        "id": user["id"], "email": user["email"], "username": user["username"],
        "balance": user["balance"], "role": user["role"],
        "referral_code": user["referral_code"],
        "referred_by": user.get("referred_by")
    }

# ========== WALLET ROUTES ==========
@api_router.get("/wallet/balance")
async def get_balance(user=Depends(get_current_user)):
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "balance": 1})
    return {"balance": fresh["balance"]}

@api_router.post("/wallet/deposit")
async def create_deposit(input: DepositInput, user=Depends(get_current_user)):
    if input.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    deposit_id = str(uuid.uuid4())
    deposit = {
        "id": deposit_id,
        "user_id": user["id"],
        "username": user["username"],
        "amount": input.amount,
        "tx_hash": input.tx_hash or "",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.deposits.insert_one(deposit)

    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "deposit",
        "amount": input.amount,
        "status": "pending",
        "details": {"deposit_id": deposit_id, "tx_hash": input.tx_hash or ""},
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"deposit_id": deposit_id, "status": "pending", "deposit_address": DEPOSIT_ADDRESS}

@api_router.post("/wallet/withdraw")
async def create_withdrawal(input: WithdrawInput, user=Depends(get_current_user)):
    if input.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if fresh["balance"] < input.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    result = await db.users.find_one_and_update(
        {"id": user["id"], "balance": {"$gte": input.amount}},
        {"$inc": {"balance": -input.amount}}
    )
    if not result:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    withdrawal_id = str(uuid.uuid4())
    await db.withdrawals.insert_one({
        "id": withdrawal_id,
        "user_id": user["id"],
        "username": user["username"],
        "amount": input.amount,
        "address": input.address,
        "status": "pending",
        "reviewed_by": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "withdrawal",
        "amount": input.amount,
        "status": "pending",
        "details": {"withdrawal_id": withdrawal_id, "address": input.address},
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"withdrawal_id": withdrawal_id, "status": "pending"}

@api_router.get("/wallet/transactions")
async def get_transactions(user=Depends(get_current_user)):
    txs = await db.transactions.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"transactions": txs}

# ========== DICE GAME ==========
@api_router.post("/games/dice/play")
async def play_dice(input: DicePlayInput, user=Depends(get_current_user)):
    if input.bet_amount < MIN_BET:
        raise HTTPException(status_code=400, detail=f"Minimum bet is {MIN_BET} USDT")

    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if fresh["balance"] < input.bet_amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    game_id = str(uuid.uuid4())

    # Server-authoritative: determine outcome first (10% win)
    is_win = random.random() < DICE_WIN_CHANCE

    if is_win:
        player_dice = random.randint(4, 6)
        bot_dice = random.randint(1, player_dice - 1) if player_dice > 1 else 1
    else:
        bot_dice = random.randint(4, 6)
        player_dice = random.randint(1, bot_dice - 1) if bot_dice > 1 else 1

    win_amount = input.bet_amount * 2 if is_win else 0
    balance_change = win_amount - input.bet_amount

    result = await db.users.find_one_and_update(
        {"id": user["id"], "balance": {"$gte": input.bet_amount}},
        {"$inc": {"balance": balance_change}},
        return_document=True,
        projection={"_id": 0}
    )
    if not result:
        raise HTTPException(status_code=400, detail="Insufficient balance or concurrent bet")

    new_balance = result["balance"]

    await db.transactions.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "type": "bet",
        "amount": input.bet_amount, "status": "completed",
        "details": {"game_id": game_id, "game": "dice"},
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    if is_win:
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()), "user_id": user["id"], "type": "win",
            "amount": win_amount, "status": "completed",
            "details": {"game_id": game_id, "game": "dice"},
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    await db.games.insert_one({
        "id": game_id, "type": "dice", "user_id": user["id"],
        "username": user["username"], "bet_amount": input.bet_amount,
        "player_dice": player_dice, "bot_dice": bot_dice,
        "is_win": is_win, "win_amount": win_amount,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {
        "game_id": game_id, "player_dice": player_dice, "bot_dice": bot_dice,
        "is_win": is_win, "bet_amount": input.bet_amount,
        "win_amount": win_amount, "new_balance": new_balance
    }

@api_router.get("/games/dice/history")
async def dice_history(user=Depends(get_current_user)):
    games = await db.games.find(
        {"type": "dice", "user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"games": games}

@api_router.get("/games/recent")
async def recent_games():
    games = await db.games.find({}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return {"games": games}

# ========== PVP CARD GAME ==========
@api_router.post("/games/pvp/create")
async def create_pvp_lobby(input: PvpCreateInput, user=Depends(get_current_user)):
    if input.bet_amount < MIN_BET:
        raise HTTPException(status_code=400, detail=f"Minimum bet is {MIN_BET} USDT")

    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if fresh["balance"] < input.bet_amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    await db.users.update_one({"id": user["id"]}, {"$inc": {"balance": -input.bet_amount}})

    lobby_id = str(uuid.uuid4())
    lobby = {
        "id": lobby_id,
        "creator_id": user["id"],
        "creator_username": user["username"],
        "bet_amount": input.bet_amount,
        "status": "waiting",
        "players": [{"id": user["id"], "username": user["username"]}],
        "winner_id": None,
        "result": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.pvp_lobbies.insert_one(lobby)

    await db.transactions.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "type": "bet",
        "amount": input.bet_amount, "status": "completed",
        "details": {"game_id": lobby_id, "game": "pvp_cards"},
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"lobby_id": lobby_id, "status": "waiting", "bet_amount": input.bet_amount}

@api_router.get("/games/pvp/lobbies")
async def get_pvp_lobbies(user=Depends(get_current_user)):
    lobbies = await db.pvp_lobbies.find(
        {"status": {"$in": ["waiting", "active"]}}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"lobbies": lobbies}

@api_router.get("/games/pvp/history")
async def pvp_history(user=Depends(get_current_user)):
    lobbies = await db.pvp_lobbies.find(
        {"players.id": user["id"], "status": "finished"}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"games": lobbies}

@api_router.post("/games/pvp/join/{lobby_id}")
async def join_pvp_lobby(lobby_id: str, user=Depends(get_current_user)):
    lobby = await db.pvp_lobbies.find_one({"id": lobby_id}, {"_id": 0})
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found")
    if lobby["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Lobby is not available")
    if lobby["creator_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot join your own lobby")

    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if fresh["balance"] < lobby["bet_amount"]:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    await db.users.update_one({"id": user["id"]}, {"$inc": {"balance": -lobby["bet_amount"]}})

    await db.transactions.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "type": "bet",
        "amount": lobby["bet_amount"], "status": "completed",
        "details": {"game_id": lobby_id, "game": "pvp_cards"},
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    await db.pvp_lobbies.update_one(
        {"id": lobby_id},
        {"$set": {
            "status": "active",
            "players": lobby["players"] + [{"id": user["id"], "username": user["username"]}]
        }}
    )

    return {"lobby_id": lobby_id, "status": "active", "bet_amount": lobby["bet_amount"]}

@api_router.get("/games/pvp/{lobby_id}")
async def get_pvp_game(lobby_id: str, user=Depends(get_current_user)):
    lobby = await db.pvp_lobbies.find_one({"id": lobby_id}, {"_id": 0})
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found")
    return lobby

@api_router.post("/games/pvp/cancel/{lobby_id}")
async def cancel_pvp_lobby(lobby_id: str, user=Depends(get_current_user)):
    lobby = await db.pvp_lobbies.find_one({"id": lobby_id}, {"_id": 0})
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found")
    if lobby["creator_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the creator can cancel")
    if lobby["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Cannot cancel active lobby")

    await db.users.update_one({"id": user["id"]}, {"$inc": {"balance": lobby["bet_amount"]}})
    await db.pvp_lobbies.update_one({"id": lobby_id}, {"$set": {"status": "cancelled"}})

    return {"status": "cancelled"}

# ========== REFERRALS ==========
@api_router.get("/referrals")
async def get_referrals(user=Depends(get_current_user)):
    referred = await db.users.find(
        {"referred_by": user["referral_code"]},
        {"_id": 0, "username": 1, "created_at": 1}
    ).to_list(100)

    total_bonus = len(referred) * REFERRAL_BONUS
    return {
        "referral_code": user["referral_code"],
        "total_referred": len(referred),
        "total_bonus": total_bonus,
        "referred_users": referred
    }

# ========== ADMIN ROUTES ==========
@api_router.get("/admin/users")
async def admin_get_users(user=Depends(get_admin_user)):
    users = await db.users.find(
        {}, {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).to_list(200)
    return {"users": users}

@api_router.get("/admin/transactions")
async def admin_get_transactions(user=Depends(get_admin_user)):
    txs = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"transactions": txs}

@api_router.get("/admin/withdrawals")
async def admin_get_withdrawals(user=Depends(get_admin_user)):
    withdrawals = await db.withdrawals.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"withdrawals": withdrawals}

@api_router.post("/admin/withdrawals/{withdrawal_id}/approve")
async def admin_approve_withdrawal(withdrawal_id: str, user=Depends(get_admin_user)):
    withdrawal = await db.withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    if withdrawal["status"] != "pending":
        raise HTTPException(status_code=400, detail="Already processed")

    await db.withdrawals.update_one(
        {"id": withdrawal_id},
        {"$set": {"status": "approved", "reviewed_by": user["id"]}}
    )
    await db.transactions.update_one(
        {"details.withdrawal_id": withdrawal_id},
        {"$set": {"status": "approved"}}
    )
    return {"status": "approved"}

@api_router.post("/admin/withdrawals/{withdrawal_id}/reject")
async def admin_reject_withdrawal(withdrawal_id: str, user=Depends(get_admin_user)):
    withdrawal = await db.withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    if withdrawal["status"] != "pending":
        raise HTTPException(status_code=400, detail="Already processed")

    await db.users.update_one(
        {"id": withdrawal["user_id"]},
        {"$inc": {"balance": withdrawal["amount"]}}
    )
    await db.withdrawals.update_one(
        {"id": withdrawal_id},
        {"$set": {"status": "rejected", "reviewed_by": user["id"]}}
    )
    await db.transactions.update_one(
        {"details.withdrawal_id": withdrawal_id},
        {"$set": {"status": "rejected"}}
    )
    return {"status": "rejected"}

@api_router.get("/admin/deposits")
async def admin_get_deposits(user=Depends(get_admin_user)):
    deposits = await db.deposits.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"deposits": deposits}

@api_router.post("/admin/deposits/{deposit_id}/confirm")
async def admin_confirm_deposit(deposit_id: str, user=Depends(get_admin_user)):
    deposit = await db.deposits.find_one({"id": deposit_id}, {"_id": 0})
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    if deposit["status"] != "pending":
        raise HTTPException(status_code=400, detail="Already processed")

    await db.users.update_one(
        {"id": deposit["user_id"]},
        {"$inc": {"balance": deposit["amount"]}}
    )
    await db.deposits.update_one({"id": deposit_id}, {"$set": {"status": "confirmed"}})
    await db.transactions.update_one(
        {"details.deposit_id": deposit_id},
        {"$set": {"status": "confirmed"}}
    )
    return {"status": "confirmed"}

@api_router.get("/admin/stats")
async def admin_get_stats(user=Depends(get_admin_user)):
    pipeline_deposits = [
        {"$match": {"type": "deposit", "status": "confirmed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    pipeline_bets = [
        {"$match": {"type": "bet"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    pipeline_wins = [
        {"$match": {"type": "win"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]

    dep_res = await db.transactions.aggregate(pipeline_deposits).to_list(1)
    bet_res = await db.transactions.aggregate(pipeline_bets).to_list(1)
    win_res = await db.transactions.aggregate(pipeline_wins).to_list(1)

    total_deposits = dep_res[0]["total"] if dep_res else 0
    total_bets = bet_res[0]["total"] if bet_res else 0
    total_wins = win_res[0]["total"] if win_res else 0

    total_users = await db.users.count_documents({})
    total_games = await db.games.count_documents({})
    pending_withdrawals = await db.withdrawals.count_documents({"status": "pending"})

    return {
        "total_deposits": total_deposits,
        "total_bets": total_bets,
        "total_wins": total_wins,
        "profit": total_bets - total_wins,
        "total_users": total_users,
        "total_games": total_games,
        "pending_withdrawals": pending_withdrawals
    }

# ========== SEED ==========
@api_router.post("/seed")
async def seed_data():
    admin_exists = await db.users.find_one({"email": "admin@cryptoplay.io"})
    if not admin_exists:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": "admin@cryptoplay.io",
            "username": "admin", "password_hash": hash_password("admin123"),
            "balance": 10000.0, "role": "admin",
            "referral_code": generate_referral_code(),
            "referred_by": None, "ip_addresses": [], "flagged": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    demo_exists = await db.users.find_one({"email": "demo@cryptoplay.io"})
    if not demo_exists:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": "demo@cryptoplay.io",
            "username": "Player1", "password_hash": hash_password("demo123"),
            "balance": 100.0, "role": "user",
            "referral_code": generate_referral_code(),
            "referred_by": None, "ip_addresses": [], "flagged": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    usernames = ["CryptoKing", "LuckyAce", "DiamondHands", "MoonShot",
                  "WhaleHunter", "SatoshiFan", "BlockMaster", "TokenLord",
                  "NeonTrader", "PixelBet"]
    for _ in range(15):
        is_win = random.random() < 0.3
        bet = random.choice([5, 10, 25, 50, 100])
        await db.games.insert_one({
            "id": str(uuid.uuid4()),
            "type": random.choice(["dice", "pvp_cards"]),
            "username": random.choice(usernames),
            "user_id": "seed",
            "bet_amount": bet,
            "is_win": is_win,
            "win_amount": bet * 2 if is_win else 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    return {
        "message": "Seed data created",
        "admin": {"email": "admin@cryptoplay.io", "password": "admin123"},
        "demo": {"email": "demo@cryptoplay.io", "password": "demo123"}
    }

# ========== TRONGRID WORKER ==========
async def trongrid_worker():
    """Background task to monitor TRC-20 USDT transactions on deposit address"""
    processed_txs = set()

    existing = await db.processed_txs.find({}, {"_id": 0, "tx_id": 1}).to_list(10000)
    for tx in existing:
        processed_txs.add(tx["tx_id"])

    logger.info(f"TronGrid worker started. Monitoring {DEPOSIT_ADDRESS}. {len(processed_txs)} txs already processed.")

    while True:
        try:
            url = f"{TRONGRID_API}/v1/accounts/{DEPOSIT_ADDRESS}/transactions/trc20"
            params = {"only_to": "true", "only_confirmed": "true", "limit": 50}

            def _fetch():
                return sync_requests.get(url, params=params, timeout=15)

            response = await asyncio.to_thread(_fetch)

            if response.status_code == 200:
                data = response.json()
                for tx in data.get("data", []):
                    tx_id = tx.get("transaction_id")
                    if not tx_id or tx_id in processed_txs:
                        continue

                    token_info = tx.get("token_info", {})
                    if token_info.get("symbol") != "USDT":
                        continue

                    decimals = int(token_info.get("decimals", 6))
                    value = int(tx.get("value", 0)) / (10 ** decimals)
                    if value <= 0:
                        continue

                    deposit = await db.deposits.find_one(
                        {"status": "pending", "amount": value},
                        {"_id": 0},
                        sort=[("created_at", 1)]
                    )

                    if deposit:
                        await db.deposits.update_one(
                            {"id": deposit["id"]},
                            {"$set": {"status": "confirmed", "tx_hash": tx_id}}
                        )
                        await db.users.update_one(
                            {"id": deposit["user_id"]},
                            {"$inc": {"balance": value}}
                        )
                        await db.transactions.update_one(
                            {"details.deposit_id": deposit["id"]},
                            {"$set": {"status": "confirmed"}}
                        )
                        logger.info(f"TronGrid: Auto-confirmed deposit {deposit['id']} for {value} USDT (tx: {tx_id})")

                    processed_txs.add(tx_id)
                    await db.processed_txs.insert_one({
                        "tx_id": tx_id,
                        "amount": value,
                        "from": tx.get("from", ""),
                        "matched_deposit": deposit["id"] if deposit else None,
                        "processed_at": datetime.now(timezone.utc).isoformat()
                    })
            else:
                logger.warning(f"TronGrid API returned {response.status_code}")

        except Exception as e:
            logger.error(f"TronGrid worker error: {e}")

        await asyncio.sleep(30)

# ========== WEBSOCKET ==========
@app.websocket("/api/ws/pvp/{lobby_id}")
async def websocket_pvp(websocket: WebSocket, lobby_id: str):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="No token")
        return

    try:
        payload = decode_token(token)
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            await websocket.close(code=4001, reason="Invalid user")
            return
    except Exception:
        await websocket.close(code=4001, reason="Invalid token")
        return

    lobby = await db.pvp_lobbies.find_one({"id": lobby_id}, {"_id": 0})
    if not lobby or lobby["status"] not in ("waiting", "active"):
        await websocket.close(code=4002, reason="Invalid lobby")
        return

    if user["id"] not in [p["id"] for p in lobby["players"]]:
        await websocket.close(code=4003, reason="Not a player in this lobby")
        return

    await pvp_manager.connect(lobby_id, user["id"], user["username"], websocket)

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        await pvp_manager.handle_disconnect(lobby_id, user["id"])

# ========== SETUP ==========
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(trongrid_worker())
    logger.info("TronGrid background worker started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
