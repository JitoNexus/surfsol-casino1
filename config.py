import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
HOUSE_WALLET_ADDRESS = os.getenv("HOUSE_WALLET_ADDRESS", "GTZkkfszq8sLsqsdWNfjuMyAuvsiGT3yyftaPtWUJRsc")
FERNET_KEY = os.getenv("FERNET_KEY")
LOG_CHAT_ID = os.getenv("LOG_CHAT_ID")
RPC_URL = os.getenv("RPC_URL", "https://api.mainnet-beta.solana.com")
MINI_APP_URL = os.getenv("MINI_APP_URL", "https://surfsol-casino1.vercel.app/")

if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN not found in environment variables")
if not FERNET_KEY:
    raise ValueError("FERNET_KEY not found in environment variables")
