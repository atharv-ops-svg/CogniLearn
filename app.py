import os
import sqlite3
from functools import wraps
from datetime import datetime, timezone

from flask import (
    Flask,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)

from werkzeug.security import (
    check_password_hash,
    generate_password_hash,
)

from groq import Groq


# =========================================================
# APP CONFIGURATION
# =========================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

# Main KnowVia database
DATABASE = os.path.join(
    BASE_DIR,
    "knowvia.db"
)

# Separate KV AI database
AI_DATABASE = os.path.join(
    BASE_DIR,
    "ai_chats.db"
)

app = Flask(__name__)

app.secret_key = os.environ.get(
    "SECRET_KEY",
    "knowvia-development-secret-change-this"
)

app.config["JSON_SORT_KEYS"] = False


# =========================================================
# GROQ CONFIGURATION
# =========================================================

GROQ_API_KEY = os.environ.get(
    "GROQ_API_KEY"
)

GROQ_MODEL = "openai/gpt-oss-120b"

groq_client = None

if GROQ_API_KEY:
    groq_client = Groq(
        api_key=GROQ_API_KEY
    )


# =========================================================
# TIME
# =========================================================

def current_time():
    """
    Return a UTC timestamp for database storage.
    """
    return datetime.now(
        timezone.utc
    ).isoformat()


# =========================================================
# MAIN KNOWVIA DATABASE
# =========================================================

def get_db():
    db = sqlite3.connect(
        DATABASE
    )

    db.row_factory = sqlite3.Row

    return db


def init_db():

    db = get_db()

    db.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            name TEXT NOT NULL,

            username TEXT NOT NULL UNIQUE,

            email TEXT NOT NULL UNIQUE,

            password TEXT NOT NULL,

            knows TEXT DEFAULT '',

            wants_to_learn TEXT DEFAULT '',

            about TEXT DEFAULT '',

            created_at TEXT NOT NULL
        )
        """
    )

    db.execute(
        """
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (sender_id) REFERENCES users(id),
            FOREIGN KEY (receiver_id) REFERENCES users(id)
        )
        """
    )

    db.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_chat_messages_pair
        ON chat_messages(sender_id, receiver_id, id)
        """
    )

    db.commit()

    db.close()


# =========================================================
# KV AI DATABASE
# =========================================================

def get_ai_db():

    db = sqlite3.connect(
        AI_DATABASE
    )

    db.row_factory = sqlite3.Row

    return db


def init_ai_db():

    db = get_ai_db()

    # -----------------------------------------------------
    # CONVERSATIONS
    # -----------------------------------------------------

    db.execute(
        """
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            username TEXT NOT NULL,

            title TEXT NOT NULL DEFAULT 'New Chat',

            created_at TEXT NOT NULL,

            updated_at TEXT NOT NULL
        )
        """
    )

    # -----------------------------------------------------
    # MESSAGES
    # -----------------------------------------------------

    db.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            conversation_id INTEGER NOT NULL,

            role TEXT NOT NULL,

            content TEXT NOT NULL,

            created_at TEXT NOT NULL,

            FOREIGN KEY (
                conversation_id
            )
            REFERENCES conversations(id)
            ON DELETE CASCADE
        )
        """
    )

    # -----------------------------------------------------
    # INDEXES
    # -----------------------------------------------------

    db.execute(
        """
        CREATE INDEX IF NOT EXISTS
        idx_conversations_username
        ON conversations(username)
        """
    )

    db.execute(
        """
        CREATE INDEX IF NOT EXISTS
        idx_messages_conversation
        ON messages(conversation_id)
        """
    )

    db.commit()

    db.close()

    print(
        "AI database ready:",
        AI_DATABASE
    )


# =========================================================
# USER HELPERS
# =========================================================

def get_current_user():

    user_id = session.get(
        "user_id"
    )

    if not user_id:
        return None

    db = get_db()

    user = db.execute(
        """
        SELECT *
        FROM users
        WHERE id = ?
        """,
        (user_id,)
    ).fetchone()

    db.close()

    return user


def parse_skills(value):

    if not value:
        return []

    if isinstance(
        value,
        list
    ):
        return value

    skills = []

    for item in value.split(","):

        item = item.strip()

        if item:
            skills.append(
                item
            )

    return skills


def user_for_template(user):

    if not user:
        return None

    data = dict(user)

    data["knows"] = parse_skills(
        data.get(
            "knows",
            ""
        )
    )

    data["wants_to_learn"] = parse_skills(
        data.get(
            "wants_to_learn",
            ""
        )
    )

    return data


def login_required(function):

    @wraps(function)
    def decorated(
        *args,
        **kwargs
    ):

        if "user_id" not in session:

            return redirect(
                url_for("login")
            )

        return function(
            *args,
            **kwargs
        )

    return decorated


# =========================================================
# PUBLIC
# =========================================================

@app.route("/")
def index():

    return render_template(
        "public/index.html"
    )


@app.route("/start")
def start():

    return render_template(
        "auth/start.html"
    )


# =========================================================
# SIGNUP
# =========================================================

@app.route(
    "/signup",
    methods=["GET", "POST"]
)
def signup():

    if request.method == "GET":

        return render_template(
            "auth/signup.html"
        )

    name = request.form.get(
        "name",
        ""
    ).strip()

    username = request.form.get(
        "username",
        ""
    ).strip().lower()

    email = request.form.get(
        "email",
        ""
    ).strip().lower()

    password = request.form.get(
        "password",
        ""
    )

    confirm_password = request.form.get(
        "confirm_password",
        ""
    )

    # -----------------------------------------------------
    # VALIDATION
    # -----------------------------------------------------

    if not name:

        return render_template(
            "auth/signup.html",
            error="Please enter your name."
        )

    if not username:

        return render_template(
            "auth/signup.html",
            error="Please enter a username."
        )

    if not email:

        return render_template(
            "auth/signup.html",
            error="Please enter your email."
        )

    if not password:

        return render_template(
            "auth/signup.html",
            error="Please enter a password."
        )

    if password != confirm_password:

        return render_template(
            "auth/signup.html",
            error="Passwords do not match."
        )

    if len(password) < 6:

        return render_template(
            "auth/signup.html",
            error="Password must contain at least 6 characters."
        )

    db = get_db()

    # -----------------------------------------------------
    # DUPLICATE USERNAME
    # -----------------------------------------------------

    existing_username = db.execute(
        """
        SELECT id
        FROM users
        WHERE username = ?
        """,
        (username,)
    ).fetchone()

    if existing_username:

        db.close()

        return render_template(
            "auth/signup.html",
            error="That username is already taken."
        )

    # -----------------------------------------------------
    # DUPLICATE EMAIL
    # -----------------------------------------------------

    existing_email = db.execute(
        """
        SELECT id
        FROM users
        WHERE email = ?
        """,
        (email,)
    ).fetchone()

    if existing_email:

        db.close()

        return render_template(
            "auth/signup.html",
            error="An account with that email already exists."
        )

    # -----------------------------------------------------
    # CREATE USER
    # -----------------------------------------------------

    password_hash = generate_password_hash(
        password
    )

    created_at = current_time()

    cursor = db.execute(
        """
        INSERT INTO users (
            name,
            username,
            email,
            password,
            knows,
            wants_to_learn,
            about,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            name,
            username,
            email,
            password_hash,
            "",
            "",
            "",
            created_at,
        )
    )

    db.commit()

    user_id = cursor.lastrowid

    db.close()

    session.clear()

    session["user_id"] = user_id

    return redirect(
        url_for("dashboard")
    )


# =========================================================
# LOGIN
# =========================================================

@app.route(
    "/login",
    methods=["GET", "POST"]
)
def login():

    if request.method == "GET":

        return render_template(
            "auth/login.html"
        )

    username = request.form.get(
        "username",
        ""
    ).strip().lower()

    password = request.form.get(
        "password",
        ""
    )

    if not username or not password:

        return render_template(
            "auth/login.html",
            error="Enter your username and password."
        )

    db = get_db()

    user = db.execute(
        """
        SELECT *
        FROM users
        WHERE username = ?
        """,
        (username,)
    ).fetchone()

    db.close()

    if not user:

        return render_template(
            "auth/login.html",
            error="Invalid username or password."
        )

    if not check_password_hash(
        user["password"],
        password
    ):

        return render_template(
            "auth/login.html",
            error="Invalid username or password."
        )

    session.clear()

    session["user_id"] = user["id"]

    return redirect(
        url_for("dashboard")
    )


# =========================================================
# LOGOUT
# =========================================================

@app.route("/logout")
def logout():

    session.clear()

    return redirect(
        url_for("index")
    )


# =========================================================
# DASHBOARD
# =========================================================

@app.route("/dashboard")
@login_required
def dashboard():

    user = get_current_user()

    if not user:

        session.clear()

        return redirect(
            url_for("login")
        )

    return render_template(
        "private/dashboard.html",
        user=user_for_template(user)
    )


# =========================================================
# CHAT
# =========================================================

@app.route("/chat")
@login_required
def chat():

    user = get_current_user()

    return render_template(
        "private/chat.html",
        user=user_for_template(user)
    )


# =========================================================
# KV AI PAGE
# =========================================================

@app.route("/ai")
@login_required
def ai():

    user = get_current_user()

    return render_template(
        "private/ai.html",
        user=user_for_template(user)
    )


# =========================================================
# PROFILE
# =========================================================

@app.route("/profile")
@login_required
def profile():

    user = get_current_user()

    return render_template(
        "private/profile.html",
        user=user_for_template(user)
    )


# =========================================================
# KV AI DATABASE HELPERS
# =========================================================

def get_username():

    user = get_current_user()

    if not user:
        return None

    return user["username"]


def get_conversation(
    conversation_id
):

    username = get_username()

    if not username:
        return None

    db = get_ai_db()

    conversation = db.execute(
        """
        SELECT *
        FROM conversations
        WHERE id = ?
        AND username = ?
        """,
        (
            conversation_id,
            username
        )
    ).fetchone()

    db.close()

    return conversation


# =========================================================
# CREATE NEW AI CONVERSATION
# =========================================================

@app.route(
    "/api/ai/conversations",
    methods=["POST"]
)
@login_required
def create_ai_conversation():

    username = get_username()

    if not username:

        return jsonify({
            "error": "User not found."
        }), 404

    now = current_time()

    db = get_ai_db()

    cursor = db.execute(
        """
        INSERT INTO conversations (
            username,
            title,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?)
        """,
        (
            username,
            "New Chat",
            now,
            now
        )
    )

    db.commit()

    conversation_id = cursor.lastrowid

    db.close()

    return jsonify({
        "success": True,
        "conversation_id": conversation_id,
        "title": "New Chat"
    })


# =========================================================
# GET AI CONVERSATIONS
# =========================================================

@app.route(
    "/api/ai/conversations",
    methods=["GET"]
)
@login_required
def get_ai_conversations():

    username = get_username()

    if not username:

        return jsonify({
            "error": "User not found."
        }), 404

    db = get_ai_db()

    conversations = db.execute(
        """
        SELECT
            id,
            title,
            created_at,
            updated_at
        FROM conversations
        WHERE username = ?
        ORDER BY updated_at DESC
        """,
        (username,)
    ).fetchall()

    db.close()

    return jsonify({
        "success": True,
        "conversations": [
            {
                "id": row["id"],
                "title": row["title"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"]
            }
            for row in conversations
        ]
    })


# =========================================================
# GET ONE AI CONVERSATION
# =========================================================

@app.route(
    "/api/ai/conversations/<int:conversation_id>",
    methods=["GET"]
)
@login_required
def get_ai_conversation(
    conversation_id
):

    conversation = get_conversation(
        conversation_id
    )

    if not conversation:

        return jsonify({
            "error": "Conversation not found."
        }), 404

    db = get_ai_db()

    messages = db.execute(
        """
        SELECT
            id,
            role,
            content,
            created_at
        FROM messages
        WHERE conversation_id = ?
        ORDER BY id ASC
        """,
        (conversation_id,)
    ).fetchall()

    db.close()

    return jsonify({
        "success": True,

        "conversation": {
            "id": conversation["id"],
            "title": conversation["title"],
            "created_at": conversation["created_at"],
            "updated_at": conversation["updated_at"],
        },

        "messages": [
            {
                "id": row["id"],
                "role": row["role"],
                "content": row["content"],
                "created_at": row["created_at"]
            }
            for row in messages
        ]
    })


# =========================================================
# DELETE AI CONVERSATION
# =========================================================

@app.route(
    "/api/ai/conversations/<int:conversation_id>",
    methods=["DELETE"]
)
@login_required
def delete_ai_conversation(
    conversation_id
):

    conversation = get_conversation(
        conversation_id
    )

    if not conversation:

        return jsonify({
            "error": "Conversation not found."
        }), 404

    db = get_ai_db()

    db.execute(
        """
        DELETE FROM messages
        WHERE conversation_id = ?
        """,
        (conversation_id,)
    )

    db.execute(
        """
        DELETE FROM conversations
        WHERE id = ?
        AND username = ?
        """,
        (
            conversation_id,
            get_username()
        )
    )

    db.commit()

    db.close()

    return jsonify({
        "success": True
    })

    
@app.route("/settings")
def settings():
    if "user_id" not in session:
        return redirect(url_for("login"))

    return render_template("private/settings.html")



# =========================================================
# GENERATE AI CHAT TITLE
# =========================================================

def generate_chat_title(
    first_message
):

    if not groq_client:

        return "New Chat"

    try:

        response = groq_client.chat.completions.create(

            model=GROQ_MODEL,

            messages=[
                {
                    "role": "system",

                    "content": (
                        "You create short titles for AI conversations. "
                        "Create a clear title based ONLY on the user's "
                        "first message. "
                        "Return ONLY the title. "
                        "Do not use quotation marks. "
                        "Do not add punctuation at the end. "
                        "Keep it between 2 and 7 words."
                    )
                },

                {
                    "role": "user",

                    "content": first_message
                }
            ],

            temperature=0.3,

            max_tokens=30
        )

        title = (
            response
            .choices[0]
            .message
            .content
            .strip()
        )

        # -------------------------------------------------
        # CLEAN AI-GENERATED TITLE
        # -------------------------------------------------

        title = title.strip(
            "\"'`"
        )

        title = " ".join(
            title.split()
        )

        if not title:

            return "New Chat"

        # Keep titles reasonably short
        if len(title) > 80:

            title = title[:80].rsplit(
                " ",
                1
            )[0]

        return title

    except Exception as error:

        print(
            "KV AI title generation error:",
            error
        )

        return "New Chat"


# =========================================================
# KV AI API
# =========================================================

@app.route(
    "/api/ai",
    methods=["POST"]
)
@login_required
def api_ai():

    data = request.get_json(
        silent=True
    ) or {}

    message = str(
        data.get(
            "message",
            ""
        )
    ).strip()

    conversation_id = data.get(
        "conversation_id"
    )

    # -----------------------------------------------------
    # VALIDATION
    # -----------------------------------------------------

    if not message:

        return jsonify({
            "error": "Message cannot be empty."
        }), 400

    if len(message) > 4000:

        return jsonify({
            "error": "Message is too long."
        }), 400

    username = get_username()

    if not username:

        return jsonify({
            "error": "User not found."
        }), 404

    # -----------------------------------------------------
    # CREATE CONVERSATION IF NEEDED
    # -----------------------------------------------------

    if conversation_id is None:

        now = current_time()

        db = get_ai_db()

        cursor = db.execute(
            """
            INSERT INTO conversations (
                username,
                title,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                username,
                "New Chat",
                now,
                now
            )
        )

        conversation_id = cursor.lastrowid

        db.commit()

        db.close()

    else:

        try:

            conversation_id = int(
                conversation_id
            )

        except (
            TypeError,
            ValueError
        ):

            return jsonify({
                "error": "Invalid conversation ID."
            }), 400

        conversation = get_conversation(
            conversation_id
        )

        if not conversation:

            return jsonify({
                "error": "Conversation not found."
            }), 404

    # -----------------------------------------------------
    # SAVE USER MESSAGE
    # -----------------------------------------------------

    db = get_ai_db()

    existing_message_count = db.execute(
        """
        SELECT COUNT(*)
        AS count
        FROM messages
        WHERE conversation_id = ?
        """,
        (conversation_id,)
    ).fetchone()["count"]

    now = current_time()

    db.execute(
        """
        INSERT INTO messages (
            conversation_id,
            role,
            content,
            created_at
        )
        VALUES (?, ?, ?, ?)
        """,
        (
            conversation_id,
            "user",
            message,
            now
        )
    )

    db.execute(
        """
        UPDATE conversations
        SET updated_at = ?
        WHERE id = ?
        AND username = ?
        """,
        (
            now,
            conversation_id,
            username
        )
    )

    db.commit()

    db.close()

    # -----------------------------------------------------
    # CHECK GROQ
    # -----------------------------------------------------

    if not groq_client:

        return jsonify({
            "error": (
                "KV AI is not configured. "
                "Please set GROQ_API_KEY."
            ),
            "conversation_id": conversation_id
        }), 500

    # -----------------------------------------------------
    # USER PROFILE
    # -----------------------------------------------------

    user = get_current_user()

    user_data = user_for_template(
        user
    )

    knows = user_data.get(
        "knows",
        []
    )

    wants_to_learn = user_data.get(
        "wants_to_learn",
        []
    )

    about = user_data.get(
        "about",
        ""
    )

    # -----------------------------------------------------
    # LOAD PREVIOUS MESSAGES
    # -----------------------------------------------------

    db = get_ai_db()

    history_rows = db.execute(
        """
        SELECT
            role,
            content
        FROM messages
        WHERE conversation_id = ?
        ORDER BY id ASC
        """,
        (conversation_id,)
    ).fetchall()

    db.close()

    # -----------------------------------------------------
    # BUILD AI HISTORY
    # -----------------------------------------------------

    ai_messages = [

        {
            "role": "system",

            "content": (
                "You are KV AI, the learning assistant "
                "inside KnowVia.\n\n"

                "Your purpose is to help the user learn, "
                "understand concepts, connect skills, "
                "and make progress toward what they want "
                "to learn.\n\n"

                "USER PROFILE:\n"
                f"Name: {user_data.get('name', '')}\n"
                f"Username: {user_data.get('username', '')}\n"
                f"KNOWS: {', '.join(knows) if knows else 'None specified'}\n"
                f"WANTS TO LEARN: "
                f"{', '.join(wants_to_learn) if wants_to_learn else 'None specified'}\n"
                f"ABOUT: {about or 'None specified'}\n\n"

                "Use the user's KNOWS and WANTS TO LEARN "
                "when relevant. Explain things clearly "
                "and at an appropriate level.\n\n"

                "You may use Markdown in your responses."
            )
        }
    ]

    for row in history_rows:

        role = row["role"]

        if role not in (
            "user",
            "assistant"
        ):
            continue

        ai_messages.append({
            "role": role,
            "content": row["content"]
        })

    # -----------------------------------------------------
    # ASK GROQ
    # -----------------------------------------------------

    try:

        response = groq_client.chat.completions.create(

            model=GROQ_MODEL,

            messages=ai_messages,

            temperature=0.7,

            max_tokens=2000
        )

        reply = (
            response
            .choices[0]
            .message
            .content
            .strip()
        )

        if not reply:

            reply = (
                "I couldn't generate a response "
                "right now. Please try again."
            )

    except Exception as error:

        print(
            "KV AI error:",
            error
        )

        return jsonify({
            "error": (
                "KV AI could not generate a response "
                "right now."
            ),
            "conversation_id": conversation_id
        }), 500

    # -----------------------------------------------------
    # SAVE AI RESPONSE
    # -----------------------------------------------------

    now = current_time()

    db = get_ai_db()

    db.execute(
        """
        INSERT INTO messages (
            conversation_id,
            role,
            content,
            created_at
        )
        VALUES (?, ?, ?, ?)
        """,
        (
            conversation_id,
            "assistant",
            reply,
            now
        )
    )

    # -----------------------------------------------------
    # GENERATE TITLE ONLY FOR FIRST MESSAGE
    # -----------------------------------------------------

    title = None

    if existing_message_count == 0:

        title = generate_chat_title(
            message
        )

        db.execute(
            """
            UPDATE conversations
            SET title = ?,
                updated_at = ?
            WHERE id = ?
            AND username = ?
            """,
            (
                title,
                now,
                conversation_id,
                username
            )
        )

    else:

        db.execute(
            """
            UPDATE conversations
            SET updated_at = ?
            WHERE id = ?
            AND username = ?
            """,
            (
                now,
                conversation_id,
                username
            )
        )

        conversation = db.execute(
            """
            SELECT title
            FROM conversations
            WHERE id = ?
            AND username = ?
            """,
            (
                conversation_id,
                username
            )
        ).fetchone()

        if conversation:

            title = conversation["title"]

    db.commit()

    db.close()

    # -----------------------------------------------------
    # RETURN RESPONSE
    # -----------------------------------------------------

    return jsonify({
        "success": True,

        "reply": reply,

        "conversation_id": conversation_id,

        "title": title or "New Chat"
    })


# =========================================================
# CHAT API
# =========================================================

@app.route(
    "/api/chat",
    methods=["POST"]
)
@login_required
def api_chat():
    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()
    receiver_id = data.get("receiver_id")

    if not message:
        return jsonify({"error": "Message cannot be empty."}), 400

    if len(message) > 2000:
        return jsonify({"error": "Message is too long."}), 400

    try:
        receiver_id = int(receiver_id)
    except (TypeError, ValueError):
        return jsonify({"error": "A valid receiver is required."}), 400

    sender_id = session["user_id"]

    if receiver_id == sender_id:
        return jsonify({"error": "You cannot message yourself."}), 400

    db = get_db()
    receiver = db.execute(
        "SELECT id, name, username FROM users WHERE id = ?",
        (receiver_id,)
    ).fetchone()

    if not receiver:
        db.close()
        return jsonify({"error": "Receiver not found."}), 404

    created_at = current_time()
    cursor = db.execute(
        """
        INSERT INTO chat_messages (
            sender_id, receiver_id, message, created_at
        ) VALUES (?, ?, ?, ?)
        """,
        (sender_id, receiver_id, message, created_at)
    )
    db.commit()
    message_id = cursor.lastrowid
    db.close()

    return jsonify({
        "success": True,
        "message": {
            "id": message_id,
            "sender_id": sender_id,
            "receiver_id": receiver_id,
            "message": message,
            "created_at": created_at
        }
    })


@app.route(
    "/api/chat/<int:partner_id>",
    methods=["GET"]
)
@login_required
def get_chat_messages(partner_id):
    current_user_id = session["user_id"]

    if partner_id == current_user_id:
        return jsonify({"error": "Invalid chat partner."}), 400

    db = get_db()
    partner = db.execute(
        "SELECT id, name, username FROM users WHERE id = ?",
        (partner_id,)
    ).fetchone()

    if not partner:
        db.close()
        return jsonify({"error": "Chat partner not found."}), 404

    rows = db.execute(
        """
        SELECT id, sender_id, receiver_id, message, created_at
        FROM chat_messages
        WHERE (sender_id = ? AND receiver_id = ?)
           OR (sender_id = ? AND receiver_id = ?)
        ORDER BY id ASC
        """,
        (current_user_id, partner_id, partner_id, current_user_id)
    ).fetchall()
    db.close()

    return jsonify({
        "success": True,
        "partner": {
            "id": partner["id"],
            "name": partner["name"],
            "username": partner["username"]
        },
        "messages": [
            {
                "id": row["id"],
                "sender_id": row["sender_id"],
                "receiver_id": row["receiver_id"],
                "message": row["message"],
                "created_at": row["created_at"]
            }
            for row in rows
        ]
    })


# =========================================================
# USER MATCHING API
# =========================================================

@app.route("/api/matches")
@login_required
def api_matches():
    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "error": "User not found."
        }), 404

    current_knows = parse_skills(current_user["knows"])
    current_wants = parse_skills(current_user["wants_to_learn"])

    # Case-insensitive lookup sets while preserving the original
    # spelling for display in the response.
    current_knows_map = {
        skill.casefold(): skill
        for skill in current_knows
    }

    current_wants_map = {
        skill.casefold(): skill
        for skill in current_wants
    }

    db = get_db()

    users = db.execute(
        """
        SELECT
            id,
            name,
            username,
            knows,
            wants_to_learn
        FROM users
        WHERE id != ?
        """,
        (current_user["id"],)
    ).fetchall()

    db.close()

    matches = []

    for user in users:
        other_knows = parse_skills(user["knows"])
        other_wants = parse_skills(user["wants_to_learn"])

        other_knows_map = {
            skill.casefold(): skill
            for skill in other_knows
        }

        other_wants_map = {
            skill.casefold(): skill
            for skill in other_wants
        }

        # Skills the other person can teach the current user.
        can_teach = [
            other_knows_map[key]
            for key in current_wants_map
            if key in other_knows_map
        ]

        # Skills the current user can teach the other person.
        can_learn = [
            current_knows_map[key]
            for key in other_wants_map
            if key in current_knows_map
        ]

        if not can_teach and not can_learn:
            continue

        if can_teach and can_learn:
            match_type = "perfect"
            score = 2
        else:
            match_type = "learning"
            score = 1

        matches.append({
            "id": user["id"],
            "name": user["name"],
            "username": user["username"],
            "can_teach": can_teach,
            "can_learn": can_learn,
            "match_type": match_type,
            "score": score
        })

    # Two-way matches first. For equal scores, keep a stable
    # alphabetical order by name.
    matches.sort(
        key=lambda match: (
            -match["score"],
            match["name"].casefold()
        )
    )

    return jsonify({
        "success": True,
        "matches": matches
    })


# =========================================================
# PROFILE SKILLS API
# =========================================================

@app.route(
    "/api/profile/skills",
    methods=["POST"]
)
@login_required
def update_profile_skills():

    data = request.get_json(
        silent=True
    ) or {}

    knows = data.get(
        "knows",
        []
    )

    wants_to_learn = data.get(
        "wants_to_learn",
        []
    )

    if not isinstance(
        knows,
        list
    ):

        return jsonify({
            "error": "KNOWS must be a list."
        }), 400

    if not isinstance(
        wants_to_learn,
        list
    ):

        return jsonify({
            "error": "WANTS TO LEARN must be a list."
        }), 400

    def clean_skills(skills):

        cleaned = []

        for skill in skills:

            skill = str(
                skill
            ).strip()

            if (
                skill
                and skill not in cleaned
            ):

                cleaned.append(
                    skill
                )

        return cleaned

    knows = clean_skills(
        knows
    )

    wants_to_learn = clean_skills(
        wants_to_learn
    )

    db = get_db()

    db.execute(
        """
        UPDATE users
        SET knows = ?,
            wants_to_learn = ?
        WHERE id = ?
        """,
        (
            ", ".join(knows),
            ", ".join(wants_to_learn),
            session["user_id"],
        )
    )

    db.commit()

    db.close()

    return jsonify({
        "success": True,
        "knows": knows,
        "wants_to_learn": wants_to_learn,
    })


# =========================================================
# PROFILE ABOUT API
# =========================================================

@app.route(
    "/api/profile/about",
    methods=["POST"]
)
@login_required
def update_profile_about():

    data = request.get_json(
        silent=True
    ) or {}

    about = str(
        data.get(
            "about",
            ""
        )
    ).strip()

    if len(about) > 1000:

        return jsonify({
            "error": "About section is too long."
        }), 400

    db = get_db()

    db.execute(
        """
        UPDATE users
        SET about = ?
        WHERE id = ?
        """,
        (
            about,
            session["user_id"],
        )
    )

    db.commit()

    db.close()

    return jsonify({
        "success": True,
        "about": about,
    })


# =========================================================
# CURRENT USER API
# =========================================================

@app.route("/api/me")
@login_required
def api_me():

    user = get_current_user()

    if not user:

        return jsonify({
            "error": "User not found."
        }), 404

    user = user_for_template(
        user
    )

    return jsonify({
        "id": user["id"],
        "name": user["name"],
        "username": user["username"],
        "email": user["email"],
        "knows": user["knows"],
        "wants_to_learn": user["wants_to_learn"],
        "about": user["about"],
    })


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/health")
def health():

    return jsonify({
        "status": "ok",
        "service": "KnowVia",
        "phase": 10,
        "ai": "groq",
        "ai_model": GROQ_MODEL
    })


# =========================================================
# ERROR HANDLERS
# =========================================================

@app.errorhandler(404)
def page_not_found(error):

    if request.path.startswith(
        "/api/"
    ):

        return jsonify({
            "error": "API endpoint not found."
        }), 404

    return render_template(
        "public/index.html"
    ), 404


@app.errorhandler(500)
def internal_server_error(error):

    if request.path.startswith(
        "/api/"
    ):

        return jsonify({
            "error": "Internal server error."
        }), 500

    return (
        "KnowVia encountered an internal error.",
        500
    )


# =========================================================
# DATABASE INITIALIZATION
# =========================================================

init_db()

init_ai_db()


# =========================================================
# DEVELOPMENT SERVER
# =========================================================

if __name__ == "__main__":

    port = int(
        os.environ.get(
            "PORT",
            5000
        )
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )