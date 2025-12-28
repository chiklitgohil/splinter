"""
Nested To-Do App - CS50 Final Project
A task manager with infinite nesting using recursive algorithms
"""

import os
import sqlite3
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
DB = "tasks.db"


# ============ Database Setup ============

def get_db_connection():
    """Open a connection to the SQLite database."""
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the database with the simplified schema."""
    conn = get_db_connection()
    conn.executescript("""
    DROP TABLE IF EXISTS tasks;
    CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        is_done INTEGER DEFAULT 0,
        parent_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES tasks(id)
    );
    CREATE INDEX IF NOT EXISTS idx_parent ON tasks(parent_id);
    """)
    conn.commit()
    conn.close()
    print("Database initialized successfully!")


# ============ Helper Functions ============

def row_to_dict(row):
    """Convert SQLite Row object to dictionary."""
    if row is None:
        return None
    return dict(row)


def get_all_tasks(parent_id=None):
    """
    Recursively retrieve all tasks with their nested children.
    
    Args:
        parent_id: ID of parent task, or None for top-level tasks
        
    Returns:
        List of task dictionaries with 'children' key containing nested tasks
    """
    conn = get_db_connection()
    try:
        if parent_id is None:
            rows = conn.execute(
                "SELECT * FROM tasks WHERE parent_id IS NULL ORDER BY created_at",
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM tasks WHERE parent_id = ? ORDER BY created_at",
                (parent_id,)
            ).fetchall()
        
        tasks = []
        for row in rows:
            task = row_to_dict(row)
            # Recursively get children
            task['children'] = get_all_tasks(task['id'])
            tasks.append(task)
        
        return tasks
    finally:
        conn.close()


def get_task_by_id(task_id):
    """
    Get a single task with its immediate children.
    
    Args:
        task_id: ID of the task to retrieve
        
    Returns:
        Task dictionary with 'children' list, or None if not found
    """
    conn = get_db_connection()
    try:
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not row:
            return None
        
        task = row_to_dict(row)
        
        # Get immediate children only (not recursive for detail view)
        children_rows = conn.execute(
            "SELECT * FROM tasks WHERE parent_id = ? ORDER BY created_at",
            (task_id,)
        ).fetchall()
        task['children'] = [row_to_dict(r) for r in children_rows]
        
        return task
    finally:
        conn.close()


def delete_task_recursive(task_id):
    """
    Recursively delete a task and all its descendants.
    
    Args:
        task_id: ID of the task to delete
    """
    conn = get_db_connection()
    try:
        # First, find all children
        children = conn.execute(
            "SELECT id FROM tasks WHERE parent_id = ?",
            (task_id,)
        ).fetchall()
        
        # Recursively delete each child
        for child in children:
            delete_task_recursive(child['id'])
        
        # Finally, delete the task itself
        conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        conn.commit()
    finally:
        conn.close()


# ============ Routes ============

@app.route("/")
def index():
    """Render the main interface with all tasks."""
    tasks = get_all_tasks()
    return render_template("index.html", tasks=tasks)


# ============ API Endpoints ============

@app.route("/api/tasks", methods=["GET"])
def api_get_all_tasks():
    """Get all top-level tasks with their nested children."""
    tasks = get_all_tasks()
    return jsonify({"tasks": tasks})


@app.route("/api/task/<int:task_id>", methods=["GET"])
def api_get_task(task_id):
    """Get a single task with its immediate children."""
    task = get_task_by_id(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    return jsonify(task)


@app.route("/api/task/add", methods=["POST"])
def api_add_task():
    """Add a new task (top-level or subtask)."""
    data = request.get_json() or request.form
    title = data.get("title", "").strip()
    
    if not title:
        return jsonify({"error": "Title cannot be empty"}), 400
    
    parent_id = data.get("parent_id")
    description = data.get("description", "")
    
    conn = get_db_connection()
    try:
        if parent_id:
            conn.execute(
                "INSERT INTO tasks (title, description, parent_id) VALUES (?, ?, ?)",
                (title, description, parent_id)
            )
        else:
            conn.execute(
                "INSERT INTO tasks (title, description) VALUES (?, ?)",
                (title, description)
            )
        conn.commit()
        
        # Get the ID of the newly created task
        task_id = conn.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]
        return jsonify({"success": True, "id": task_id})
    finally:
        conn.close()


@app.route("/api/task/<int:task_id>/update", methods=["POST"])
def api_update_task(task_id):
    """Update task title and/or description."""
    data = request.get_json() or request.form
    title = data.get("title")
    description = data.get("description")
    
    if not title and description is None:
        return jsonify({"error": "Nothing to update"}), 400
    
    conn = get_db_connection()
    try:
        if title is not None and description is not None:
            conn.execute(
                "UPDATE tasks SET title = ?, description = ? WHERE id = ?",
                (title, description, task_id)
            )
        elif title is not None:
            conn.execute(
                "UPDATE tasks SET title = ? WHERE id = ?",
                (title, task_id)
            )
        elif description is not None:
            conn.execute(
                "UPDATE tasks SET description = ? WHERE id = ?",
                (description, task_id)
            )
        
        conn.commit()
        return jsonify({"success": True})
    finally:
        conn.close()


@app.route("/api/task/<int:task_id>/toggle", methods=["POST"])
def api_toggle_task(task_id):
    """Toggle task completion status."""
    conn = get_db_connection()
    try:
        row = conn.execute("SELECT is_done FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not row:
            return jsonify({"error": "Task not found"}), 404
        
        new_status = 0 if int(row["is_done"]) else 1
        conn.execute("UPDATE tasks SET is_done = ? WHERE id = ?", (new_status, task_id))
        conn.commit()
        
        return jsonify({"success": True, "is_done": new_status})
    finally:
        conn.close()


@app.route("/api/task/<int:task_id>/delete", methods=["POST"])
def api_delete_task(task_id):
    """Delete a task and all its subtasks recursively."""
    delete_task_recursive(task_id)
    return jsonify({"success": True})


# ============ Run Application ============

if __name__ == "__main__":
    # Initialize database if it doesn't exist
    if not os.path.exists(DB):
        init_db()
    
    app.run(debug=True)
