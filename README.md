# Nested To-Do App

> **CS50 Final Project** - A minimalist task manager with infinite nesting capabilities

## 🎥 Video Demo

*[Add your YouTube URL here]*

## 📖 Description

Nested To-Do is a web-based task management application that allows users to create tasks with **infinite levels of nesting**. Unlike traditional to-do apps that limit nesting to 1-2 levels, this project uses recursive algorithms to support unlimited depth, making it perfect for breaking down complex projects into manageable subtasks.

### Why This Project?

Most task management apps treat subtasks as an afterthought, limiting you to one or two levels of hierarchy. This project demonstrates how **recursion** - a fundamental computer science concept - can create a more flexible and powerful organizational tool.

## ✨ Core Features

- **Infinite Nesting**: Add subtasks to any task, recursively, without depth limits
- **Visual Hierarchy**: Connector lines and indentation clearly show parent-child relationships
- **Three-Pane Interface**: Browse (sidebar) → Select (task list) → Edit (detail pane)
- **Auto-Save**: Description changes save automatically after 1 second
- **Recursive Deletion**: Deleting a parent removes all descendants in one operation
- **Clean UI**: Bootstrap 5 with custom CSS, no clutter or complexity

## 🛠️ Technologies

- **Backend**: Python 3 with Flask
- **Database**: SQLite with self-referencing foreign keys
- **Frontend**: HTML5, CSS3, JavaScript (ES6)
- **Styling**: Bootstrap 5 + Custom CSS
- **Icons**: Font Awesome 6

## 📂 Project Structure

```
nested-todo/
├── app.py                 # Flask backend with all routes
├── requirements.txt       # Python dependencies
├── static/
│   └── styles.css        # Custom CSS
├── templates/
│   ├── layout.html       # Base HTML template
│   ├── index.html        # Main interface
│   └── tasks.html        # Recursive task rendering macro
└── README.md             # This file
```

## 🗄️ Database Schema

```sql
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    is_done INTEGER DEFAULT 0,
    parent_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES tasks(id)
);
```

The `parent_id` self-referencing foreign key enables the recursive tree structure.

## 🚀 How to Run

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

```bash
# Clone the repository
git clone https://github.com/chiklitgohil/nested-todo.git
cd nested-todo

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize database (optional - auto-creates on first run)
python
>>> from app import init_db
>>> init_db()
>>> exit()

# Run the application
python app.py
```

Visit **http://127.0.0.1:5000** in your browser.

## 💡 How to Use

1. **Add a Task**: Type in the input at the top and press Enter
2. **Add a Subtask**: Hover over any task and click the + button
3. **Complete a Task**: Click the checkbox next to the task
4. **View Details**: Click on any task title to see full details in the right pane
5. **Edit Task**: Click the title in the detail pane to edit; description auto-saves
6. **Delete Task**: Hover over a task and click the trash icon (deletes all subtasks too)

## 🧠 Design Decisions

### Why Recursion?

The core technical challenge was rendering tasks with unlimited nesting depth. Traditional iteration would require complex tracking of depth levels. Instead, I used:

1. **Recursive Python Function** (`get_all_tasks()`): Builds a nested dictionary structure by calling itself for each task's children
2. **Recursive Jinja2 Macro** (`render_task()`): Renders HTML by calling itself for each level of nesting
3. **Recursive Deletion** (`delete_task_recursive()`): Removes a task and all descendants by traversing the tree

This approach elegantly mirrors the hierarchical nature of tasks.

### Why SQLite?

- **Simplicity**: Single-file database, no server setup required
- **Self-Referencing FKs**: Perfect for tree structures via `parent_id`
- **CS50 Integration**: Familiar from CS50 problem sets
- **Portability**: Easy to share and demonstrate

### Why Three-Pane Layout?

The interface is inspired by email clients (Gmail, Outlook):
- **Left**: High-level overview (currently just "All Tasks")
- **Center**: Interactive list with the actual content
- **Right**: Detailed view of selected item

This reduces cognitive load by separating browsing from editing.

## 🎓 What I Learned

This project taught me:

1. **Recursive Algorithms**: Implementing recursion in both Python and template rendering
2. **Database Relationships**: Using self-referencing foreign keys to model hierarchical data
3. **Full-Stack Development**: Connecting Flask backend with dynamic frontend
4. **CSS Grid**: Creating responsive multi-column layouts
5. **API Design**: Building RESTful endpoints for CRUD operations
6. **Auto-Save UX**: Implementing debounced saving for better user experience

## 🔮 Future Enhancements

Potential features to add (not in current version):

- **Categories**: Organize tasks into "Work", "Personal", etc.
- **My Day**: Mark important tasks for today with auto-midnight reset
- **Drag & Drop**: Reorder tasks or move subtasks between parents
- **Progress Tracking**: Show completion percentage for parent tasks
- **Due Dates**: Add deadlines with visual indicators
- **Search**: Full-text search across all tasks
- **Dark Mode**: Theme toggle for reduced eye strain
- **Export**: Download tasks as JSON or CSV

## 📄 License

This project was created for educational purposes as part of CS50's final project requirement.

## 🙏 Acknowledgments

- **CS50 Team**: For an incredible introduction to computer science
- **Bootstrap Team**: For the excellent CSS framework
- **Flask Community**: For comprehensive documentation

---

**Chiklit Gohil** - CS50 2024