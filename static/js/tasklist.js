// tasklist.js

function renderTaskList() {
    const container = document.getElementById('root-tasks-container');
    if (!container) return;

    container.innerHTML = '';
    
    // Filter root tasks
    let rootTasks = [];
    const allTasks = Object.values(window.store);
    
    if (window.activeListId === 'all') {
        rootTasks = allTasks.filter(t => !t.parent_id);
    } else if (window.activeListId === 'today') {
        rootTasks = allTasks.filter(t => t.labels && t.labels.includes('today'));
    } else if (window.activeListId === 'upcoming') {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];
        
        rootTasks = allTasks.filter(t => 
            t.status === 'open' && 
            t.due_date && 
            t.due_date >= todayStr && 
            t.due_date <= nextWeekStr
        );
    } else {
        // Custom user list
        rootTasks = allTasks.filter(t => t.labels && t.labels.includes(window.activeListId));
    }
    
    // Sort by position
    rootTasks.sort((a, b) => a.position - b.position);
    
    // Render each root task and its descendants recursively
    rootTasks.forEach(task => {
        const node = renderTaskNode(task.id, 0);
        if (node) container.appendChild(node);
    });

    setupTaskListEventListeners();
}

function renderTaskNode(taskId, depth) {
    const task = window.store[taskId];
    if (!task) return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'task-node';
    
    // Create the row
    const row = document.createElement('div');
    row.className = 'task-row' + (task.status === 'done' ? ' done' : '') + (window.selectedTaskId === taskId ? ' selected' : '');
    // Indent left side. 1rem = 16px
    row.style.paddingLeft = `calc(var(--spacing-md) + ${depth}rem)`;
    
    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.status === 'done';
    checkbox.onclick = async (e) => {
        e.stopPropagation(); // prevent selecting row
        const newStatus = checkbox.checked ? 'done' : 'open';
        try {
            const updated = await API.updateTask(taskId, { status: newStatus });
            window.store[taskId] = updated;
            renderTaskList();
            if (window.selectedTaskId === taskId) renderDetailView();
        } catch (error) {
            console.error("Update failed", error);
            checkbox.checked = !checkbox.checked; // revert UI
        }
    };
    
    // Title
    const titleSpan = document.createElement('span');
    titleSpan.className = 'task-title';
    titleSpan.textContent = task.title;
    
    // Row click to select
    row.onclick = () => {
        window.selectTask(taskId);
    };

    // Actions
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'task-actions';
    
    // AI Button
    const aiBtn = document.createElement('button');
    aiBtn.className = 'ai-btn';
    aiBtn.textContent = '✦';
    aiBtn.title = 'Breakdown task with AI';
    aiBtn.onclick = (e) => {
        e.stopPropagation();
        openAIPopover(taskId, aiBtn);
    };
    
    // Add subtask inline button
    const addSubBtn = document.createElement('button');
    addSubBtn.className = 'add-subtask-btn';
    addSubBtn.textContent = '+';
    addSubBtn.title = 'Add subtask';
    addSubBtn.onclick = (e) => {
        e.stopPropagation();
        toggleInlineAddSubtask(taskId, wrapper, depth + 1);
    };

    actionsDiv.appendChild(aiBtn);
    actionsDiv.appendChild(addSubBtn);

    row.appendChild(checkbox);
    row.appendChild(titleSpan);
    row.appendChild(actionsDiv);
    wrapper.appendChild(row);

    // Children container
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'children-container';
    childrenContainer.id = `children-${taskId}`;
    
    const children = Object.values(window.store).filter(t => t.parent_id === taskId);
    children.sort((a, b) => a.position - b.position);
    
    children.forEach(child => {
        const childNode = renderTaskNode(child.id, depth + 1);
        if (childNode) childrenContainer.appendChild(childNode);
    });
    
    wrapper.appendChild(childrenContainer);

    return wrapper;
}

function toggleInlineAddSubtask(parentId, wrapper, depth) {
    let addInputDiv = document.getElementById(`inline-add-${parentId}`);
    
    if (addInputDiv) {
        // Toggle visibility
        addInputDiv.classList.toggle('hidden');
        if (!addInputDiv.classList.contains('hidden')) {
            addInputDiv.querySelector('input').focus();
        }
    } else {
        // Create it
        addInputDiv = document.createElement('div');
        addInputDiv.id = `inline-add-${parentId}`;
        addInputDiv.className = 'inline-add-subtask';
        addInputDiv.style.paddingLeft = `calc(var(--spacing-md) + ${depth}rem)`;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'New subtask (Enter to save)';
        
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                input.disabled = true;
                try {
                    // Position at end
                    const siblings = Object.values(window.store).filter(t => t.parent_id === parentId);
                    const pos = siblings.length > 0 ? Math.max(...siblings.map(s => s.position)) + 1 : 0;
                    
                    const newTask = await API.createTask(input.value.trim(), parentId, pos);
                    window.store[newTask.id] = newTask;
                    input.value = '';
                    input.disabled = false;
                    renderTaskList();
                    if (window.selectedTaskId === parentId) renderDetailView();
                    // Don't close input, user might want to add another
                    setTimeout(() => {
                        const newInput = document.querySelector(`#inline-add-${parentId} input`);
                        if (newInput) newInput.focus();
                    }, 0);
                } catch (error) {
                    console.error("Create failed", error);
                    input.disabled = false;
                }
            } else if (e.key === 'Escape') {
                addInputDiv.classList.add('hidden');
            }
        });
        
        addInputDiv.appendChild(input);
        
        // Insert after row, before children
        const row = wrapper.querySelector('.task-row');
        wrapper.insertBefore(addInputDiv, row.nextSibling);
        input.focus();
    }
}

// Global active popover to clean up clicks outside
let activePopover = null;

async function openAIPopover(taskId, btnEl) {
    if (activePopover) {
        document.body.removeChild(activePopover);
        activePopover = null;
    }

    const task = window.store[taskId];
    if (!task) return;

    const existingChildren = Object.values(window.store)
        .filter(t => t.parent_id === taskId)
        .map(t => t.title);

    const popover = document.createElement('div');
    popover.className = 'ai-popover';
    
    // Position below button
    const rect = btnEl.getBoundingClientRect();
    popover.style.top = `${rect.bottom + window.scrollY + 5}px`;
    // Try to align right edge with button, but keep in viewport
    let leftPos = rect.right - 256; // 16rem = 256px
    if (leftPos < 10) leftPos = 10;
    popover.style.left = `${leftPos}px`;
    
    popover.innerHTML = `<div class="ai-popover-loading">Generating suggestions...</div>`;
    document.body.appendChild(popover);
    activePopover = popover;

    // Click outside to dismiss
    const clickOutside = (e) => {
        if (activePopover && !activePopover.contains(e.target) && e.target !== btnEl) {
            document.body.removeChild(activePopover);
            activePopover = null;
            document.removeEventListener('click', clickOutside);
        }
    };
    setTimeout(() => document.addEventListener('click', clickOutside), 10);

    try {
        const response = await API.breakdownTask(taskId, task.title, existingChildren);
        const suggestions = response.suggestions || [];
        
        if (suggestions.length === 0) {
            popover.innerHTML = `<div class="ai-popover-loading">No new suggestions.</div>`;
            return;
        }

        let html = `<div class="ai-suggestion-list">`;
        suggestions.forEach((sug, i) => {
            html += `
                <label class="ai-suggestion-item">
                    <input type="checkbox" checked value="${i}">
                    <span>${escapeHTML(sug)}</span>
                </label>
            `;
        });
        html += `</div>
            <div class="ai-popover-actions">
                <button id="ai-cancel-btn" class="btn text-btn">Cancel</button>
                <button id="ai-add-btn" class="btn outline-btn" style="color: var(--accent-color); border-color: var(--accent-color);">Add selected</button>
            </div>
        `;
        
        popover.innerHTML = html;
        
        // Setup buttons
        const cancelBtn = popover.querySelector('#ai-cancel-btn');
        cancelBtn.onclick = () => {
            if (activePopover) {
                document.body.removeChild(activePopover);
                activePopover = null;
            }
        };
        
        const addBtn = popover.querySelector('#ai-add-btn');
        addBtn.onclick = async () => {
            const checkedInputs = Array.from(popover.querySelectorAll('input[type="checkbox"]:checked'));
            const selectedSuggestions = checkedInputs.map(input => suggestions[input.value]);
            
            if (selectedSuggestions.length === 0) return;
            
            addBtn.textContent = 'Adding...';
            addBtn.disabled = true;
            
            const siblings = Object.values(window.store).filter(t => t.parent_id === taskId);
            let pos = siblings.length > 0 ? Math.max(...siblings.map(s => s.position)) + 1 : 0;
            
            try {
                for (const sug of selectedSuggestions) {
                    await API.createTask(sug, taskId, pos++);
                }
                await refreshAll();
            } catch (error) {
                console.error("Failed to add AI tasks", error);
                alert("Failed to add some tasks.");
            }
            
            if (activePopover) {
                document.body.removeChild(activePopover);
                activePopover = null;
            }
        };

    } catch (error) {
        popover.innerHTML = `<div class="ai-popover-loading" style="color: var(--danger-color)">Error generating tasks.</div>`;
        console.error(error);
    }
}

let taskListEventsAttached = false;
function setupTaskListEventListeners() {
    if (taskListEventsAttached) return;
    
    const addInput = document.getElementById('add-root-task-input');
    if (addInput) {
        addInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && addInput.value.trim()) {
                addInput.disabled = true;
                try {
                    const siblings = Object.values(window.store).filter(t => !t.parent_id);
                    const pos = siblings.length > 0 ? Math.max(...siblings.map(s => s.position)) + 1 : 0;
                    
                    const newTask = await API.createTask(addInput.value.trim(), null, pos);
                    
                    // If we are in a custom list or today, add that label automatically
                    if (window.activeListId !== 'all' && window.activeListId !== 'upcoming') {
                        const updated = await API.updateTask(newTask.id, { labels: [window.activeListId] });
                        window.store[newTask.id] = updated;
                    } else {
                        window.store[newTask.id] = newTask;
                    }
                    
                    addInput.value = '';
                    addInput.disabled = false;
                    renderTaskList();
                } catch (error) {
                    console.error("Create failed", error);
                    addInput.disabled = false;
                }
            }
        });
    }
    
    taskListEventsAttached = true;
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
}

// Expose to window
window.renderTaskList = renderTaskList;
