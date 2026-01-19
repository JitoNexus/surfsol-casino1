import sqlite3
import uvicorn
from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from database import get_pending_withdrawals, approve_withdrawal, reject_withdrawal
from config import BOT_TOKEN
import hmac
import hashlib
from urllib.parse import parse_qs

app = FastAPI()
templates = Jinja2Templates(directory="admin_templates")

DB_NAME = "zolt.db"

def verify_admin_password(password: str) -> bool:
    """Simple password verification (in production, use proper auth)"""
    # Use bot token as a simple password check (you should change this)
    return password == BOT_TOKEN

@app.get("/", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.post("/login")
async def login(request: Request, password: str = Form(...)):
    if verify_admin_password(password):
        return templates.TemplateResponse("dashboard.html", {
            "request": request,
            "pending_withdrawals": get_pending_withdrawals()
        })
    else:
        return templates.TemplateResponse("login.html", {
            "request": request,
            "error": "Invalid password"
        })

@app.post("/approve/{withdrawal_id}")
async def approve(withdrawal_id: int, request: Request):
    approve_withdrawal(withdrawal_id)
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "pending_withdrawals": get_pending_withdrawals(),
        "message": f"Withdrawal {withdrawal_id} approved"
    })

@app.post("/reject/{withdrawal_id}")
async def reject(withdrawal_id: int, request: Request):
    reject_withdrawal(withdrawal_id)
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "pending_withdrawals": get_pending_withdrawals(),
        "message": f"Withdrawal {withdrawal_id} rejected"
    })

if __name__ == "__main__":
    import os
    import webbrowser
    
    # Create admin_templates directory if it doesn't exist
    os.makedirs("admin_templates", exist_ok=True)
    
    # Create HTML templates
    login_html = """<!DOCTYPE html>
<html>
<head>
    <title>SurfSol Admin Login</title>
    <style>
        body { font-family: Arial, sans-serif; background: #0a0a0f; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .login-box { background: #1a1a2e; padding: 2rem; border-radius: 10px; border: 1px solid #333; width: 300px; }
        h2 { text-align: center; color: #64ffda; }
        input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #333; background: #0a0a0f; color: white; border-radius: 5px; }
        button { width: 100%; padding: 10px; background: #64ffda; color: #0a0a0f; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
        button:hover { background: #4fb3a9; }
        .error { color: #ff4444; text-align: center; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="login-box">
        <h2>Admin Login</h2>
        <form method="post" action="/login">
            <input type="password" name="password" placeholder="Enter admin password" required>
            <button type="submit">Login</button>
        </form>
        {% if error %}
        <div class="error">{{ error }}</div>
        {% endif %}
    </div>
</body>
</html>"""
    
    dashboard_html = """<!DOCTYPE html>
<html>
<head>
    <title>SurfSol Admin Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; background: #0a0a0f; color: white; margin: 0; padding: 20px; }
        h1 { color: #64ffda; text-align: center; }
        .message { background: #4caf50; color: white; padding: 10px; text-align: center; margin-bottom: 20px; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #333; }
        th { background: #1a1a2e; color: #64ffda; }
        tr:hover { background: #1a1a2e; }
        .actions { display: flex; gap: 10px; }
        button { padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
        .approve { background: #4caf50; color: white; }
        .approve:hover { background: #45a049; }
        .reject { background: #f44336; color: white; }
        .reject:hover { background: #da190b; }
        .empty { text-align: center; padding: 40px; color: #888; }
    </style>
</head>
<body>
    <h1>SurfSol Admin Dashboard</h1>
    
    {% if message %}
    <div class="message">{{ message }}</div>
    {% endif %}
    
    <h2>Pending Withdrawals</h2>
    
    {% if pending_withdrawals %}
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>User ID</th>
                <th>Amount (SOL)</th>
                <th>Address</th>
                <th>Reason</th>
                <th>Date</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            {% for w in pending_withdrawals %}
            <tr>
                <td>{{ w.id }}</td>
                <td>{{ w.user_id }}</td>
                <td>{{ "%.4f"|format(w.amount) }}</td>
                <td style="font-family: monospace; font-size: 12px;">{{ w.address[:8] }}...{{ w.address[-8:] }}</td>
                <td>{{ w.reason }}</td>
                <td>{{ w.created_at }}</td>
                <td>
                    <div class="actions">
                        <form method="post" action="/approve/{{ w.id }}" style="display: inline;">
                            <button type="submit" class="approve">Approve</button>
                        </form>
                        <form method="post" action="/reject/{{ w.id }}" style="display: inline;">
                            <button type="submit" class="reject">Reject</button>
                        </form>
                    </div>
                </td>
            </tr>
            {% endfor %}
        </tbody>
    </table>
    {% else %}
    <div class="empty">No pending withdrawals</div>
    {% endif %}
</body>
</html>"""
    
    with open("admin_templates/login.html", "w") as f:
        f.write(login_html)
    
    with open("admin_templates/dashboard.html", "w") as f:
        f.write(dashboard_html)
    
    # Start server and open browser
    port = 8888
    print(f"Admin Dashboard starting on http://localhost:{port}")
    print(f"Login with your bot token as password")
    webbrowser.open(f"http://localhost:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
