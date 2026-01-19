import sqlite3
from datetime import datetime

DB_NAME = "zolt.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    # Create table if not exists
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            public_key TEXT,
            encrypted_private_key TEXT,
            language TEXT DEFAULT 'en',
            is_verified INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Migration: Add missing columns if table already existed
    cursor.execute("PRAGMA table_info(users)")
    columns = [column[1] for column in cursor.fetchall()]
    
    if 'language' not in columns:
        cursor.execute('ALTER TABLE users ADD COLUMN language TEXT DEFAULT "en"')
    if 'is_verified' not in columns:
        cursor.execute('ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0')
        
    conn.commit()
    conn.close()

def add_user(user_id, public_key=None, encrypted_private_key=None, language='en'):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO users (user_id, public_key, encrypted_private_key, language)
            VALUES (?, ?, ?, ?)
        ''', (user_id, public_key, encrypted_private_key, language))
        conn.commit()
    except sqlite3.IntegrityError:
        pass  # User already exists
    finally:
        conn.close()

def get_user_initial_deposit(user_id: int) -> float:
    """Get user's initial deposit amount (for withdrawal logic)"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS deposits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            amount REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        SELECT MIN(amount) FROM deposits WHERE user_id = ?
    ''', (user_id,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result and result[0] else 0

def record_deposit(user_id: int, amount: float):
    """Record a deposit for the user"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS deposits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            amount REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        INSERT INTO deposits (user_id, amount)
        VALUES (?, ?)
    ''', (user_id, amount))
    conn.commit()
    conn.close()

def update_user_language(user_id, language):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('UPDATE users SET language = ? WHERE user_id = ?', (language, user_id))
    conn.commit()
    conn.close()

def verify_user(user_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('UPDATE users SET is_verified = 1 WHERE user_id = ?', (user_id,))
    conn.commit()
    conn.close()

def get_user(user_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT public_key, encrypted_private_key, language, is_verified FROM users WHERE user_id = ?', (user_id,))
    user = cursor.fetchone()
    conn.close()
    if user:
        return {
            "public_key": user[0],
            "encrypted_private_key": user[1],
            "language": user[2],
            "is_verified": bool(user[3])
        }
    return None

def get_all_users():
    """Get all users from database for leaderboard"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT user_id, public_key, language FROM users WHERE public_key IS NOT NULL')
    users = cursor.fetchall()
    conn.close()
    return [
        {
            "user_id": u[0],
            "public_key": u[1],
            "username": f"User{u[0]}",  # Default username
            "first_name": f"Player{u[0]}"
        }
        for u in users
    ]

def add_pending_withdrawal(user_id: int, amount: float, address: str, reason: str):
    """Add withdrawal to pending list"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pending_withdrawals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            amount REAL,
            address TEXT,
            reason TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP NULL
        )
    ''')
    cursor.execute('''
        INSERT INTO pending_withdrawals (user_id, amount, address, reason)
        VALUES (?, ?, ?, ?)
    ''', (user_id, amount, address, reason))
    conn.commit()
    conn.close()

def get_pending_withdrawals():
    """Get all pending withdrawals for admin dashboard"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, user_id, amount, address, reason, created_at
        FROM pending_withdrawals
        WHERE status = 'pending'
        ORDER BY created_at DESC
    ''')
    withdrawals = cursor.fetchall()
    conn.close()
    return [
        {
            "id": w[0],
            "user_id": w[1],
            "amount": w[2],
            "address": w[3],
            "reason": w[4],
            "created_at": w[5]
        }
        for w in withdrawals
    ]

def approve_withdrawal(withdrawal_id: int):
    """Approve a pending withdrawal"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE pending_withdrawals
        SET status = 'approved', processed_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (withdrawal_id,))
    conn.commit()
    conn.close()

def reject_withdrawal(withdrawal_id: int):
    """Reject a pending withdrawal"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE pending_withdrawals
        SET status = 'rejected', processed_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (withdrawal_id,))
    conn.commit()
    conn.close()
