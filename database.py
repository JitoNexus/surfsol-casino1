import sqlite3
from datetime import datetime

DB_NAME = "zolt.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Create all tables
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
    
    # Create deposits table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS deposits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            amount REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create pending_withdrawals table
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
    
    # Create user_bonuses table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_bonuses (
            user_id INTEGER PRIMARY KEY,
            bonus_balance REAL DEFAULT 0,
            total_rolled REAL DEFAULT 0,
            required_rollover REAL DEFAULT 0,
            is_converted INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create referrals table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS referrals (
            user_id INTEGER PRIMARY KEY,
            referral_code TEXT UNIQUE,
            referred_by INTEGER NULL,
            total_deposits REAL DEFAULT 0,
            referral_earnings REAL DEFAULT 0,
            referral_count INTEGER DEFAULT 0,
            tier_level INTEGER DEFAULT 1,
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

def get_user_bonus(user_id: int):
    """Get user's bonus balance and rollover info"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_bonuses (
            user_id INTEGER PRIMARY KEY,
            bonus_balance REAL DEFAULT 0,
            total_rolled REAL DEFAULT 0,
            required_rollover REAL DEFAULT 0,
            is_converted INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        SELECT bonus_balance, total_rolled, required_rollover, is_converted
        FROM user_bonuses
        WHERE user_id = ?
    ''', (user_id,))
    result = cursor.fetchone()
    conn.close()
    
    if result:
        return {
            'bonus_balance': result[0],
            'total_rolled': result[1],
            'required_rollover': result[2],
            'is_converted': bool(result[3])
        }
    return {
        'bonus_balance': 0,
        'total_rolled': 0,
        'required_rollover': 0,
        'is_converted': False
    }

def add_first_deposit_bonus(user_id: int, deposit_amount: float):
    """Add first deposit bonus (40% of deposit, max $2)"""
    # Check if user already has bonus
    bonus_info = get_user_bonus(user_id)
    if bonus_info['bonus_balance'] > 0:
        return False  # Already received bonus
    
    # Calculate bonus (40% of deposit, max $2)
    bonus_amount = min(deposit_amount * 0.4, 2.0)
    
    # Required rollover is 60x the bonus amount
    required_rollover = bonus_amount * 60
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_bonuses (
            user_id INTEGER PRIMARY KEY,
            bonus_balance REAL DEFAULT 0,
            total_rolled REAL DEFAULT 0,
            required_rollover REAL DEFAULT 0,
            is_converted INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        INSERT OR REPLACE INTO user_bonuses (user_id, bonus_balance, required_rollover)
        VALUES (?, ?, ?)
    ''', (user_id, bonus_amount, required_rollover))
    conn.commit()
    conn.close()
    
    return True

def update_bonus_rollover(user_id: int, amount_rolled: float):
    """Update bonus rollover amount"""
    bonus_info = get_user_bonus(user_id)
    if bonus_info['is_converted']:
        return False  # Already converted
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE user_bonuses
        SET total_rolled = total_rolled + ?,
            bonus_balance = bonus_balance - ?
        WHERE user_id = ? AND is_converted = 0
    ''', (amount_rolled, amount_rolled, user_id))
    conn.commit()
    conn.close()
    
    # Check if rollover is complete
    updated_bonus = get_user_bonus(user_id)
    if updated_bonus['total_rolled'] >= updated_bonus['required_rollover']:
        convert_bonus_to_crypto(user_id)
    
    return True

def convert_bonus_to_crypto(user_id: int):
    """Convert completed bonus to crypto"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE user_bonuses
        SET is_converted = 1, bonus_balance = 0
        WHERE user_id = ?
    ''', (user_id,))
    conn.commit()
    conn.close()

def generate_referral_code(user_id: int):
    """Generate unique referral code for user"""
    import random
    import string
    
    # Generate 8-character code
    chars = string.ascii_uppercase + string.digits
    code = ''.join(random.choices(chars, k=8))
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS referrals (
            user_id INTEGER PRIMARY KEY,
            referral_code TEXT UNIQUE,
            referred_by INTEGER NULL,
            total_deposits REAL DEFAULT 0,
            referral_earnings REAL DEFAULT 0,
            referral_count INTEGER DEFAULT 0,
            tier_level INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Check if user already has a code
    cursor.execute('SELECT referral_code FROM referrals WHERE user_id = ?', (user_id,))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        return existing[0]
    
    # Generate unique code
    while True:
        cursor.execute('SELECT referral_code FROM referrals WHERE referral_code = ?', (code,))
        if not cursor.fetchone():
            break
        code = ''.join(random.choices(chars, k=8))
    
    cursor.execute('INSERT INTO referrals (user_id, referral_code) VALUES (?, ?)', (user_id, code))
    conn.commit()
    conn.close()
    return code

def get_referral_info(user_id: int):
    """Get user's referral information"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT referral_code, referred_by, total_deposits, referral_earnings, referral_count, tier_level
        FROM referrals
        WHERE user_id = ?
    ''', (user_id,))
    result = cursor.fetchone()
    conn.close()
    
    if result:
        return {
            'referral_code': result[0],
            'referred_by': result[1],
            'total_deposits': result[2],
            'referral_earnings': result[3],
            'referral_count': result[4],
            'tier_level': result[5]
        }
    return None

def process_referral_deposit(referral_code: str, deposit_amount: float):
    """Process deposit from referred user"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Find referrer
    cursor.execute('SELECT user_id, referral_count FROM referrals WHERE referral_code = ?', (referral_code,))
    referrer = cursor.fetchone()
    
    if not referrer:
        conn.close()
        return None
    
    referrer_id, referral_count = referrer
    
    # Calculate referral earnings (10% of deposit, max $5 per $50)
    # For every $50 deposited, referrer gets $5
    deposit_chunks = int(deposit_amount / 50)
    earnings = deposit_chunks * 5
    
    # Check for tier upgrade (10 referrals -> tier 2 -> $5.5 per $50)
    tier_level = 2 if referral_count >= 10 else 1
    if tier_level == 2:
        earnings = deposit_chunks * 5.5
    
    if earnings > 0:
        # Update referrer stats
        cursor.execute('''
            UPDATE referrals
            SET total_deposits = total_deposits + ?,
                referral_earnings = referral_earnings + ?,
                referral_count = referral_count + 1,
                tier_level = ?
            WHERE user_id = ?
        ''', (deposit_amount, earnings, tier_level, referrer_id))
        
        conn.commit()
    
    conn.close()
    return {
        'referrer_id': referrer_id,
        'earnings': earnings,
        'tier_level': tier_level
    }
