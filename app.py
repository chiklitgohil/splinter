from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import os
import database
from google import genai

load_dotenv()

app = Flask(__name__)


database.init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    tasks = database.get_all_tasks()
    return jsonify(tasks)

@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.json
    title = data.get('title')
    if not title:
        return jsonify({"error": "Title is required"}), 400
        
    parent_id = data.get('parent_id')
    position = data.get('position', 0)
    
    task = database.create_task(title, parent_id, position)
    return jsonify(task), 201

@app.route('/api/tasks/<task_id>', methods=['PATCH'])
def update_task(task_id):
    data = request.json
    task = database.update_task(task_id, data)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    return jsonify(task)

@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    database.delete_task(task_id)
    return jsonify({"success": True})

@app.route('/api/tasks/reorder', methods=['POST'])
def reorder_tasks():
    data = request.json
    ordered_ids = data.get('ordered_ids', [])
    database.reorder_tasks(ordered_ids)
    return jsonify({"success": True})

@app.route('/api/ai/breakdown', methods=['POST'])
def breakdown_task():
    data = request.json
    task_id = data.get('task_id')
    title = data.get('title')
    existing_children = data.get('existing_children', [])
    
    if not title:
        return jsonify({"error": "Task title is required"}), 400

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"error": "Valid Gemini API Key is missing"}), 500

    try:
        client = genai.Client()
        
        prompt = f"""
        Break down the following task into smaller, actionable subtasks.
        Task title: "{title}"
        """
        if existing_children:
            prompt += f"\nThese subtasks already exist (do not suggest them again): {', '.join(existing_children)}"
            
        prompt += """
        Return ONLY a JSON array of string titles for the suggested subtasks.
        Do not include markdown formatting like ```json or any other text/explanation.
        Example output: ["Subtask 1", "Subtask 2"]
        """
        
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
        )
        
        text_response = response.text.strip()
        

        if text_response.startswith('```json'):
            text_response = text_response[7:]
        if text_response.startswith('```'):
            text_response = text_response[3:]
        if text_response.endswith('```'):
            text_response = text_response[:-3]
            
        text_response = text_response.strip()
        
        import json
        suggestions = json.loads(text_response)
        
        if not isinstance(suggestions, list):
            raise ValueError("Response is not a JSON array")
            
        return jsonify({"suggestions": suggestions})
        
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
