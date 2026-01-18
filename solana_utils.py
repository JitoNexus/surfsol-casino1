from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solana.rpc.async_api import AsyncClient
from cryptography.fernet import Fernet
import base58
from config import FERNET_KEY, RPC_URL, HOUSE_WALLET_ADDRESS

cipher_suite = Fernet(FERNET_KEY.encode())

def generate_keypair():
    kp = Keypair()
    return kp

def encrypt_key(private_key_bytes: bytes) -> str:
    return cipher_suite.encrypt(private_key_bytes).decode()

def decrypt_key(encrypted_str: str) -> bytes:
    return cipher_suite.decrypt(encrypted_str.encode())

async def get_balance(public_key_str: str) -> float:
    async with AsyncClient(RPC_URL) as client:
        try:
            pubkey = Pubkey.from_string(public_key_str)
            response = await client.get_balance(pubkey)
            return response.value / 10**9
        except Exception as e:
            print(f"Error fetching balance: {e}")
            return 0.0

def create_transfer_transaction(user_private_key_bytes: bytes, amount_sol: float):
    # Placeholder for transaction logic
    # In a real implementation, this would use solders.transaction
    return {
        "status": "prepared",
        "to": HOUSE_WALLET_ADDRESS,
        "amount": amount_sol
    }
