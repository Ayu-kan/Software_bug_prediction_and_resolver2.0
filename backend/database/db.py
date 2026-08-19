"""
backend/database/db.py
----------------------
Database initialization and connection management using SQLite.
"""

import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "app.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # User table with authentication and persistent LLM API configuration
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            llm_provider TEXT DEFAULT 'openai',
            llm_api_key TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # User Analyses Table (Full Isolated Analysis Records)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            repo_name TEXT NOT NULL,
            repo_url TEXT DEFAULT '',
            total_files INTEGER NOT NULL,
            high_risk_count INTEGER NOT NULL,
            analysis_mode TEXT DEFAULT 'Normal Mode (All Files)',
            full_results_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    # AI Solutions Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ai_solutions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            analysis_id INTEGER,
            file_path TEXT NOT NULL,
            generated_solution TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    conn.commit()
    conn.close()

def save_analysis_record(user_id: int, repo_name: str, total_files: int, high_risk_count: int, analysis_mode: str, full_results_json: str) -> int:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO analyses (user_id, repo_name, total_files, high_risk_count, analysis_mode, full_results_json) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, repo_name, total_files, high_risk_count, analysis_mode, full_results_json)
    )
    analysis_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return analysis_id

def get_latest_user_analysis(user_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, repo_name, total_files, high_risk_count, analysis_mode, full_results_json, created_at FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        (user_id,)
    )
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_analyses_list(user_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, repo_name, total_files, high_risk_count, analysis_mode, created_at FROM analyses WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_analysis_by_id(analysis_id: int, user_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, repo_name, total_files, high_risk_count, analysis_mode, full_results_json, created_at FROM analyses WHERE id = ? AND user_id = ?",
        (analysis_id, user_id)
    )
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_user_analysis(analysis_id: int, user_id: int) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM analyses WHERE id = ? AND user_id = ?", (analysis_id, user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

import json

def save_ai_solution(user_id, file_path, generated_solution):
    conn = get_db()
    cursor = conn.cursor()

    analysis_id = None  # keep your existing logic for obtaining this

    if isinstance(generated_solution, dict):
        generated_solution = json.dumps(generated_solution, ensure_ascii=False)

    cursor.execute(
        """
        INSERT INTO ai_solutions
        (user_id, analysis_id, file_path, generated_solution)
        VALUES (?, ?, ?, ?)
        """,
        (user_id, analysis_id, file_path, generated_solution)
    )

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
