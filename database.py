import sqlite3
import uuid
import json
from datetime import datetime

DB_FILE = 'tasks.db'

def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            due_date TEXT,
            notes TEXT DEFAULT '',
            parent_id TEXT,
            position INTEGER NOT NULL DEFAULT 0,
            labels TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL,
            FOREIGN KEY (parent_id) REFERENCES tasks(id)
        )
    ''')
    conn.commit()
    conn.close()

def _task_to_dict(row):
    task = dict(row)
    task['labels'] = json.loads(task['labels'])
    return task

def get_all_tasks():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tasks')
    rows = cursor.fetchall()
    conn.close()
    return [_task_to_dict(row) for row in rows]

def create_task(title, parent_id=None, position=0):
    task_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat() + 'Z'
    labels = '[]'
    status = 'open'
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO tasks (id, title, status, parent_id, position, labels, created_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (task_id, title, status, parent_id, position, labels, created_at, ''))
    conn.commit()
    
    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    row = cursor.fetchone()
    conn.close()
    return _task_to_dict(row)

def update_task(task_id, fields):
    allowed_fields = ['title', 'status', 'due_date', 'notes', 'parent_id', 'position', 'labels']
    updates = []
    values = []
    
    for key, value in fields.items():
        if key in allowed_fields:
            updates.append(f"{key} = ?")
            if key == 'labels':
                values.append(json.dumps(value))
            else:
                values.append(value)
                
    if not updates:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
        row = cursor.fetchone()
        conn.close()
        return _task_to_dict(row) if row else None

    values.append(task_id)
    query = f"UPDATE tasks SET {', '.join(updates)} WHERE id = ?"
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(query, tuple(values))
    conn.commit()
    
    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    row = cursor.fetchone()
    conn.close()
    return _task_to_dict(row) if row else None

def delete_task(task_id):
    conn = get_connection()
    cursor = conn.cursor()
    

    cursor.execute('''
        WITH RECURSIVE descendants AS (
            SELECT id FROM tasks WHERE id = ?
            UNION ALL
            SELECT t.id FROM tasks t
            INNER JOIN descendants d ON t.parent_id = d.id
        )
        DELETE FROM tasks WHERE id IN descendants
    ''', (task_id,))
    
    conn.commit()
    conn.close()


