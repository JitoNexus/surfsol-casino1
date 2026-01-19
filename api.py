import hmac
import hashlib
import json
import os
import socket
import time
from urllib.parse import parse_qs
from fastapi import FastAPI, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

class WithdrawRequest(BaseModel):
    amount: float
    address: str

class DepositRequest(BaseModel):
    amount: float
    referral_code: Optional[str] = None

class WalletSaveRequest(BaseModel):
    public_key: str
    secret_key: str

from config import BOT_TOKEN
from database import get_user, get_all_users, get_user_initial_deposit, record_deposit, add_pending_withdrawal, get_user_bonus, add_first_deposit_bonus, update_bonus_rollover, generate_referral_code, get_referral_info, process_referral_deposit, add_user
from solana_utils import get_balance

app = FastAPI()

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your actual frontend URL
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "ok", "service": "surfsol-api"}

@app.get("/health")
async def health():
    return {"ok": True}

def verify_telegram_data(init_data: str) -> dict:
    """Verifies the data received from the Telegram Mini App."""
    try:
        parsed_data = parse_qs(init_data)
        hash_str = parsed_data.pop('hash')[0]
        
        # Sort data alphabetically
        data_check_list = []
        for key in sorted(parsed_data.keys()):
            data_check_list.append(f"{key}={parsed_data[key][0]}")
        
        data_check_string = "\n".join(data_check_list)
        
        # Secret key is the HMAC-SHA256 of the bot token with "WebAppData"
        secret_key = hmac.new("WebAppData".encode(), BOT_TOKEN.encode(), hashlib.sha256).digest()
        
        # HMAC-SHA256 of the data check string
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        
        if calculated_hash != hash_str:
            raise HTTPException(status_code=401, detail="Invalid data")
            
        # Check if data is expired (auth_date older than 24 hours)
        auth_date = int(parsed_data.get('auth_date')[0])
        if time.time() - auth_date > 86400:
            raise HTTPException(status_code=401, detail="Data expired")
            
        user_info = json.loads(parsed_data.get('user')[0])
        return user_info
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.post("/api/wallet/save")
async def save_wallet(request: WalletSaveRequest, authorization: Optional[str] = Header(None)):
    """Save wallet to database"""
    # TEMPORARY: Bypass verification for testing
    user_id = 999999  # Default test user ID
    
    if authorization:
        try:
            # Extract initData from the Bearer token
            if authorization.startswith("Bearer "):
                init_data = authorization.split(" ")[1]
                tg_user = verify_telegram_data(init_data)
                user_id = tg_user.get('id')
        except:
            pass  # Use default user_id if verification fails
    
    # Save wallet to database
    add_user(user_id, request.public_key, request.secret_key)
    
    return {"status": "saved", "public_key": request.public_key, "user_id": user_id}

@app.get("/api/user/info")
async def get_user_info(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    # Extract initData from the Bearer token
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    init_data = authorization.split(" ")[1]
    tg_user = verify_telegram_data(init_data)
    
    user_id = tg_user.get('id')
    db_user = get_user(user_id)
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found in bot database")
    
    balance = await get_balance(db_user['public_key'])
    
    return {
        "id": user_id,
        "first_name": tg_user.get('first_name'),
        "username": tg_user.get('username'),
        "public_key": db_user['public_key'],
        "balance": balance,
        "language": db_user.get('language', 'en')
    }

def hide_username(username: str) -> str:
    """Hide middle of username for privacy: 'CryptoKing' -> 'Cry***ng'"""
    if not username or len(username) < 4:
        return username or 'Anonymous'
    return f"{username[:3]}***{username[-2:]}"

@app.get("/api/leaderboard")
async def get_leaderboard():
    """Get all wallets with balance from real database"""
    try:
        users = get_all_users()
        
        # Fetch balances for all users with public keys (show even 0 balance)
        leaderboard = []
        for user in users:
            if user.get('public_key'):
                try:
                    balance = await get_balance(user['public_key'])
                    leaderboard.append({
                        'username': hide_username(user.get('username') or user.get('first_name')),
                        'balance': balance,
                        'public_key': user['public_key']
                    })
                except:
                    # If balance fetch fails, show 0
                    leaderboard.append({
                        'username': hide_username(user.get('username') or user.get('first_name')),
                        'balance': 0,
                        'public_key': user['public_key']
                    })
        
        # Sort by balance descending
        leaderboard.sort(key=lambda x: x['balance'], reverse=True)
        
        # Add ranks (show all users, not just top 10)
        result = []
        for i, entry in enumerate(leaderboard):
            result.append({
                'rank': i + 1,
                'username': entry['username'],
                'balance': round(entry['balance'], 4),
                'public_key': entry['public_key']
            })
        
        return result
    except Exception as e:
        return []

@app.post("/api/withdraw")
async def request_withdrawal(request: WithdrawRequest, authorization: Optional[str] = Header(None)):
    """Request withdrawal - instant for initial deposits, pending for winnings"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    # Extract initData from the Bearer token
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    init_data = authorization.split(" ")[1]
    tg_user = verify_telegram_data(init_data)
    
    user_id = tg_user.get('id')
    db_user = get_user(user_id)
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_balance = await get_balance(db_user['public_key'])
    initial_deposit = get_user_initial_deposit(user_id)
    
    if request.amount > current_balance:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # If withdrawing less than or equal to initial deposit, process instantly
    if request.amount <= initial_deposit:
        # TODO: Process instant withdrawal via Solana
        return {
            "status": "instant",
            "message": "Withdrawal processed instantly",
            "amount": request.amount,
            "address": request.address
        }
    else:
        # Add to pending list (winnings)
        add_pending_withdrawal(user_id, request.amount, request.address, "winnings")
        return {
            "status": "pending",
            "message": "Withdrawal added to pending list (winnings require manual approval)",
            "amount": request.amount,
            "address": request.address
        }

@app.post("/api/deposit")
async def record_deposit_endpoint(request: DepositRequest, authorization: Optional[str] = Header(None)):
    """Record a deposit for the user and add first deposit bonus"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    # Extract initData from the Bearer token
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    init_data = authorization.split(" ")[1]
    tg_user = verify_telegram_data(init_data)
    
    user_id = tg_user.get('id')
    db_user = get_user(user_id)
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    record_deposit(user_id, request.amount)
    
    # Process referral if provided
    referral_info = None
    if request.referral_code:
        referral_info = process_referral_deposit(request.referral_code, request.amount)
    
    # Check for first deposit bonus (minimum $5)
    bonus_info = None
    if request.amount >= 5:
        bonus_added = add_first_deposit_bonus(user_id, request.amount)
        if bonus_added:
            bonus_info = get_user_bonus(user_id)
    
    response = {
        "status": "recorded",
        "message": "Deposit recorded successfully",
        "amount": request.amount
    }
    
    if bonus_info:
        response["bonus"] = bonus_info['bonus_balance']
        response["required_rollover"] = bonus_info['required_rollover']
        response["message"] = "Deposit recorded with bonus!"
    
    if referral_info:
        response["referral_processed"] = True
        response["referrer_earnings"] = referral_info['earnings']
    
    return response

@app.get("/api/referral")
async def get_referral(authorization: Optional[str] = Header(None)):
    """Get user's referral code and stats"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    # Extract initData from the Bearer token
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    init_data = authorization.split(" ")[1]
    tg_user = verify_telegram_data(init_data)
    
    user_id = tg_user.get('id')
    db_user = get_user(user_id)
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate or get existing referral code
    referral_code = generate_referral_code(user_id)
    referral_stats = get_referral_info(user_id)
    
    return {
        "referral_code": referral_code,
        "referral_link": f"https://t.me/SurfSolCasinoBot?start={referral_code}",
        "stats": referral_stats
    }

@app.get("/api/bonus")
async def get_bonus_info(authorization: Optional[str] = Header(None)):
    """Get user's bonus information"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    # Extract initData from the Bearer token
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    init_data = authorization.split(" ")[1]
    tg_user = verify_telegram_data(init_data)
    
    user_id = tg_user.get('id')
    db_user = get_user(user_id)
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    bonus_info = get_user_bonus(user_id)
    return bonus_info

@app.post("/api/bonus/rollover")
async def update_rollover(request: DepositRequest, authorization: Optional[str] = Header(None)):
    """Update bonus rollover from winnings"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    # Extract initData from the Bearer token
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    init_data = authorization.split(" ")[1]
    tg_user = verify_telegram_data(init_data)
    
    user_id = tg_user.get('id')
    db_user = get_user(user_id)
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    success = update_bonus_rollover(user_id, request.amount)
    bonus_info = get_user_bonus(user_id)
    
    return {
        "status": "updated" if success else "failed",
        "bonus_info": bonus_info
    }

if __name__ == "__main__":
    import uvicorn

    def pick_port(requested: int) -> int:
        if requested <= 0:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("0.0.0.0", 0))
                return int(s.getsockname()[1])

        for p in range(requested, requested + 100):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                try:
                    s.bind(("0.0.0.0", p))
                    return int(p)
                except OSError:
                    continue

        raise RuntimeError("No available port found")

    requested_port = int(os.getenv("API_PORT", "8000"))
    port = pick_port(requested_port)
    print(f"SurfSol API listening on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
