import hmac
import hashlib
import json
import time
from urllib.parse import parse_qs
from fastapi import FastAPI, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from config import BOT_TOKEN
from database import get_user
from solana_utils import get_balance

app = FastAPI()

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
