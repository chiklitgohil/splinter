# Splinter ⚡

> An AI-powered, infinitely nestable task management application designed for deep focus and breaking down complex projects.

## Overview

Splinter is a full-stack web application built to solve a common productivity problems.

## Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript, CSS.
- **Backend**: Python, Flask, Google GenAI SDK.
- **Database**: SQLite.

## Installation & Local Development

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/splinter.git
   cd splinter
   ```

2. **Set up a Virtual Environment:**

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```

3. **Install Dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Google Gemini API key:

   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

5. **Run the Application:**
   ```bash
   python app.py
   ```
   The app will automatically initialize the `tasks.db` SQLite database and start a local server at `http://127.0.0.1:5000`.
