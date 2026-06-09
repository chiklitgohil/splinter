const API = {
    async request(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }
        
        return data;
    },

    async getTasks() {
        return this.request('/api/tasks');
    },

    async createTask(title, parentId = null, position = 0) {
        return this.request('/api/tasks', {
            method: 'POST',
            body: JSON.stringify({ title, parent_id: parentId, position })
        });
    },

    async updateTask(id, fields) {
        return this.request(`/api/tasks/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(fields)
        });
    },

    async deleteTask(id) {
        return this.request(`/api/tasks/${id}`, {
            method: 'DELETE'
        });
    },



    async breakdownTask(taskId, title, existingChildren = []) {
        return this.request('/api/ai/breakdown', {
            method: 'POST',
            body: JSON.stringify({ 
                task_id: taskId, 
                title: title, 
                existing_children: existingChildren 
            })
        });
    }
};

window.API = API;
