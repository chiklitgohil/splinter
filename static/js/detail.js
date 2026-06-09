

function renderDetailView() {
    const placeholder = document.getElementById('detail-placeholder');
    const content = document.getElementById('detail-content');
    
    if (!window.selectedTaskId) {
        placeholder.classList.remove('hidden');
        content.classList.add('hidden');
        return;
    }
    
    const task = window.store[window.selectedTaskId];
    if (!task) {
        window.selectedTaskId = null;
        renderDetailView();
        return;
    }
    
    placeholder.classList.add('hidden');
    content.classList.remove('hidden');
    
    if (typeof currentDetailTaskId !== 'undefined' && currentDetailTaskId !== window.selectedTaskId) {
        content.style.animation = 'none';
        content.offsetHeight;
        content.style.animation = null;
    }
    

    const titleInput = document.getElementById('detail-title');
    titleInput.value = task.title;
    

    const statusBtn = document.getElementById('detail-status-btn');
    if (task.status === 'done') {
        statusBtn.textContent = 'Mark open';
        statusBtn.className = 'btn outline-btn';
    } else {
        statusBtn.textContent = 'Mark done';
        statusBtn.className = 'btn outline-btn';
        statusBtn.style.color = 'var(--success-color)';
        statusBtn.style.borderColor = 'var(--success-color)';
    }
    

    const dueDateInput = document.getElementById('detail-due-date');
    dueDateInput.value = task.due_date || '';
    

    renderLabels(task);
    

    const notesTextarea = document.getElementById('detail-notes');
    notesTextarea.value = task.notes || '';
    

    renderDirectSubtasks(task.id);
    
    setupDetailEventListeners(task.id);
    if (window.refreshIcons) window.refreshIcons();
}

function renderLabels(task) {
    const container = document.getElementById('detail-labels-container');
    container.innerHTML = '';
    
    const labels = task.labels || [];
    labels.forEach(label => {
        const pill = document.createElement('div');
        pill.className = 'label-pill';
        
        const text = document.createElement('span');
        text.textContent = label;
        
        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-label';
        removeBtn.innerHTML = '<i data-lucide="x" style="width: 14px; height: 14px;"></i>';
        removeBtn.onclick = async () => {
            const newLabels = labels.filter(l => l !== label);
            await updateDetailField('labels', newLabels);
        };
        
        pill.appendChild(text);
        pill.appendChild(removeBtn);
        container.appendChild(pill);
    });
}

function renderDirectSubtasks(parentId) {
    const container = document.getElementById('detail-subtasks-container');
    container.innerHTML = '';
    
    const children = Object.values(window.store).filter(t => t.parent_id === parentId);
    children.sort((a, b) => a.position - b.position);
    
    children.forEach(child => {
        const row = document.createElement('div');
        row.className = 'task-row' + (child.status === 'done' ? ' done' : '');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = child.status === 'done';
        checkbox.onclick = async (e) => {
            e.stopPropagation();
            const newStatus = checkbox.checked ? 'done' : 'open';
            if (newStatus === 'done' && window.playDoneSound) {
                window.playDoneSound();
            }
            try {
                const updated = await API.updateTask(child.id, { status: newStatus });
                window.store[child.id] = updated;
                renderDirectSubtasks(parentId);
                renderTaskList();
            } catch (error) {
                console.error("Update failed", error);
            }
        };
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'task-title';
        titleSpan.textContent = child.title;
        
        row.onclick = () => {
            window.selectTask(child.id);
        };
        
        row.appendChild(checkbox);
        row.appendChild(titleSpan);
        container.appendChild(row);
    });
}


let currentDetailTaskId = null;

function setupDetailEventListeners(taskId) {
    if (currentDetailTaskId === taskId) return;
    

    const titleInput = document.getElementById('detail-title');
    const titleClone = titleInput.cloneNode(true);
    titleInput.parentNode.replaceChild(titleClone, titleInput);
    
    const dueDateInput = document.getElementById('detail-due-date');
    const dueDateClone = dueDateInput.cloneNode(true);
    dueDateInput.parentNode.replaceChild(dueDateClone, dueDateInput);
    
    const notesTextarea = document.getElementById('detail-notes');
    const notesClone = notesTextarea.cloneNode(true);
    notesTextarea.parentNode.replaceChild(notesClone, notesTextarea);
    
    const labelInput = document.getElementById('detail-add-label');
    const labelClone = labelInput.cloneNode(true);
    labelInput.parentNode.replaceChild(labelClone, labelInput);
    
    const subtaskInput = document.getElementById('detail-add-subtask');
    const subtaskClone = subtaskInput.cloneNode(true);
    subtaskInput.parentNode.replaceChild(subtaskClone, subtaskInput);
    
    const statusBtn = document.getElementById('detail-status-btn');
    const statusBtnClone = statusBtn.cloneNode(true);
    statusBtn.parentNode.replaceChild(statusBtnClone, statusBtn);

    currentDetailTaskId = taskId;
    

    titleClone.addEventListener('blur', () => {
        if (titleClone.value.trim() !== window.store[taskId].title) {
            updateDetailField('title', titleClone.value.trim());
        }
    });
    titleClone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') titleClone.blur();
    });
    
    dueDateClone.addEventListener('change', () => {
        updateDetailField('due_date', dueDateClone.value);
    });
    
    notesClone.addEventListener('blur', () => {
        if (notesClone.value !== window.store[taskId].notes) {
            updateDetailField('notes', notesClone.value);
        }
    });
    
    labelClone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && labelClone.value.trim()) {
            const newLabel = labelClone.value.trim();
            const currentLabels = window.store[taskId].labels || [];
            if (!currentLabels.includes(newLabel)) {
                updateDetailField('labels', [...currentLabels, newLabel]);
            }
            labelClone.value = '';
        }
    });
    
    subtaskClone.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter' && subtaskClone.value.trim()) {
            subtaskClone.disabled = true;
            try {
                const siblings = Object.values(window.store).filter(t => t.parent_id === taskId);
                const pos = siblings.length > 0 ? Math.max(...siblings.map(s => s.position)) + 1 : 0;
                
                const newTask = await API.createTask(subtaskClone.value.trim(), taskId, pos);
                window.store[newTask.id] = newTask;
                subtaskClone.value = '';
                subtaskClone.disabled = false;
                renderDirectSubtasks(taskId);
                renderTaskList();
                subtaskClone.focus();
            } catch (error) {
                console.error("Create failed", error);
                subtaskClone.disabled = false;
            }
        }
    });
    
    statusBtnClone.addEventListener('click', () => {
        const currentStatus = window.store[taskId].status;
        const newStatus = currentStatus === 'done' ? 'open' : 'done';
        if (newStatus === 'done' && window.playDoneSound) {
            window.playDoneSound();
        }
        updateDetailField('status', newStatus);
    });
}

async function updateDetailField(field, value) {
    if (!window.selectedTaskId) return;
    const taskId = window.selectedTaskId;
    
    try {
        const updated = await API.updateTask(taskId, { [field]: value });
        window.store[taskId] = updated;
        

        renderDetailView();
        renderTaskList();
    } catch (error) {
        console.error(`Failed to update ${field}`, error);
    }
}


window.renderDetailView = renderDetailView;
