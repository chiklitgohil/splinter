
function getCollapsedTasks() {
    try {
        const stored = localStorage.getItem('collapsedTasks');
        return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (e) {
        return new Set();
    }
}

function saveCollapsedTasks() {
    localStorage.setItem('collapsedTasks', JSON.stringify(Array.from(window.collapsedTasks)));
}

window.collapsedTasks = getCollapsedTasks();
function renderTaskList() {
    const container = document.getElementById('root-tasks-container');
    if (!container) return;

    container.innerHTML = '';
    

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

        rootTasks = allTasks.filter(t => t.labels && t.labels.includes(window.activeListId));
    }
    

    const openTasks = rootTasks.filter(t => t.status !== 'done');
    const doneTasks = rootTasks.filter(t => t.status === 'done');

    openTasks.sort((a, b) => a.position - b.position);
    doneTasks.sort((a, b) => a.position - b.position);
    
    if (rootTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="check-circle" style="width: 48px; height: 48px; opacity: 0.2; margin-bottom: 1rem;"></i>
                <h3>All caught up!</h3>
                <p>Enjoy your day or add a new task below.</p>
            </div>
        `;
    } else {
        openTasks.forEach(task => {
            const node = renderTaskNode(task.id, 0);
            if (node) container.appendChild(node);
        });

        if (doneTasks.length > 0) {
            const doneHeader = document.createElement('div');
            doneHeader.className = 'done-header';
            doneHeader.innerHTML = `<i data-lucide="chevron-down" class="done-chevron"></i> <span>Completed (${doneTasks.length})</span>`;
            
            const doneContainer = document.createElement('div');
            doneContainer.className = 'done-container';
            
            if (window.collapsedDoneSection) {
                doneContainer.classList.add('hidden');
                doneHeader.querySelector('.done-chevron').style.transform = 'rotate(-90deg)';
            }
            
            doneHeader.onclick = () => {
                window.collapsedDoneSection = !window.collapsedDoneSection;
                if (window.collapsedDoneSection) {
                    doneContainer.classList.add('hidden');
                    doneHeader.querySelector('.done-chevron').style.transform = 'rotate(-90deg)';
                } else {
                    doneContainer.classList.remove('hidden');
                    doneHeader.querySelector('.done-chevron').style.transform = 'rotate(0deg)';
                }
            };
            
            doneTasks.forEach(task => {
                const node = renderTaskNode(task.id, 0);
                if (node) doneContainer.appendChild(node);
            });
            
            container.appendChild(doneHeader);
            container.appendChild(doneContainer);
        }
    }

    setupTaskListEventListeners();
    if (window.refreshIcons) window.refreshIcons();
}

function renderTaskNode(taskId, depth) {
    const task = window.store[taskId];
    if (!task) return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'task-node';
    

    const row = document.createElement('div');
    row.className = 'task-row' + (task.status === 'done' ? ' done' : '') + (window.selectedTaskId === taskId ? ' selected' : '');

    row.style.paddingLeft = `calc(var(--spacing-md) + ${depth}rem)`;
    

    row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        window.contextMenuTaskId = taskId;
        const menu = document.getElementById('context-menu');
        menu.classList.remove('hidden');
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        
        const closeMenu = () => {
            menu.classList.add('hidden');
            document.removeEventListener('click', closeMenu);
            document.removeEventListener('scroll', closeMenu, true);
        };
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
            document.addEventListener('scroll', closeMenu, true);
        }, 10);
    });
    
    const children = Object.values(window.store).filter(t => t.parent_id === taskId);
    children.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'done' ? 1 : -1;
        return a.position - b.position;
    });


    if (children.length > 0) {
        const chevron = document.createElement('div');
        chevron.className = 'task-chevron' + (window.collapsedTasks.has(taskId) ? ' collapsed' : '');
        chevron.innerHTML = '<i data-lucide="chevron-down"></i>';
        chevron.onclick = (e) => {
            e.stopPropagation();
            if (window.collapsedTasks.has(taskId)) {
                window.collapsedTasks.delete(taskId);
            } else {
                window.collapsedTasks.add(taskId);
            }
            saveCollapsedTasks();
            if (typeof renderTaskList === 'function') renderTaskList();
        };
        row.appendChild(chevron);
    } else {

        const spacer = document.createElement('div');
        spacer.style.width = '1.5rem';
        spacer.style.height = '1.5rem';
        spacer.style.flexShrink = '0';
        row.appendChild(spacer);
    }
    

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.status === 'done';
    checkbox.onclick = async (e) => {
        e.stopPropagation();
        const newStatus = checkbox.checked ? 'done' : 'open';
        if (newStatus === 'done' && window.playDoneSound) {
            window.playDoneSound();
        }
        try {
            const updated = await API.updateTask(taskId, { status: newStatus });
            window.store[taskId] = updated;
            renderTaskList();
            if (window.selectedTaskId === taskId) renderDetailView();
        } catch (error) {
            console.error("Update failed", error);
            checkbox.checked = !checkbox.checked;
        }
    };
    

    const titleSpan = document.createElement('span');
    titleSpan.className = 'task-title';
    titleSpan.textContent = task.title;
    

    row.onclick = () => {
        window.selectTask(taskId);
    };


    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'task-actions';
    

    const aiBtn = document.createElement('button');
    aiBtn.className = 'ai-btn';
    aiBtn.innerHTML = '<i data-lucide="sparkles"></i>';
    aiBtn.title = 'Breakdown task with AI';
    aiBtn.onclick = (e) => {
        e.stopPropagation();
        openAIPopover(taskId, aiBtn);
    };
    

    const addSubBtn = document.createElement('button');
    addSubBtn.className = 'add-subtask-btn';
    addSubBtn.innerHTML = '<i data-lucide="plus"></i>';
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


    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'children-container';
    childrenContainer.id = `children-${taskId}`;
    
    if (window.collapsedTasks.has(taskId)) {
        childrenContainer.classList.add('hidden');
    }
    
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

        addInputDiv.classList.toggle('hidden');
        if (!addInputDiv.classList.contains('hidden')) {
            addInputDiv.querySelector('input').focus();
        }
    } else {

        addInputDiv = document.createElement('div');
        addInputDiv.id = `inline-add-${parentId}`;
        addInputDiv.className = 'inline-add-subtask';
        addInputDiv.style.paddingLeft = `calc(var(--spacing-md) + ${depth}rem)`;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'New subtask';
        
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                input.disabled = true;
                try {

                    const siblings = Object.values(window.store).filter(t => t.parent_id === parentId);
                    const pos = siblings.length > 0 ? Math.max(...siblings.map(s => s.position)) + 1 : 0;
                    
                    const newTask = await API.createTask(input.value.trim(), parentId, pos);
                    window.store[newTask.id] = newTask;
                    input.value = '';
                    input.disabled = false;
                    renderTaskList();
                    if (window.selectedTaskId === parentId) renderDetailView();

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
        

        const row = wrapper.querySelector('.task-row');
        wrapper.insertBefore(addInputDiv, row.nextSibling);
        input.focus();
    }
}


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
    

    const rect = btnEl.getBoundingClientRect();
    popover.style.top = `${rect.bottom + window.scrollY + 5}px`;

    let leftPos = rect.right - 256;
    if (leftPos < 10) leftPos = 10;
    popover.style.left = `${leftPos}px`;
    
    popover.innerHTML = `<div class="ai-popover-loading">Generating suggestions...</div>`;
    document.body.appendChild(popover);
    activePopover = popover;


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
    

    const deleteBtn = document.getElementById('ctx-delete-btn');
    if (deleteBtn && !deleteBtn.dataset.bound) {
        deleteBtn.dataset.bound = "true";
        deleteBtn.addEventListener('click', async () => {
            if (window.contextMenuTaskId) {
                try {
                    await API.deleteTask(window.contextMenuTaskId);
                    delete window.store[window.contextMenuTaskId];
                    if (window.selectedTaskId === window.contextMenuTaskId) {
                        window.selectedTaskId = null;
                        if (typeof renderDetailView === 'function') renderDetailView();
                    }
                    if (typeof refreshAll === 'function') refreshAll();
                } catch(e) {
                    console.error("Failed to delete", e);
                }
            }
        });
    }
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


window.renderTaskList = renderTaskList;
