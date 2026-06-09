

function getUserLists() {
    try {
        const lists = localStorage.getItem('userLists');
        return lists ? JSON.parse(lists) : [];
    } catch (e) {
        return [];
    }
}

function saveUserLists(lists) {
    localStorage.setItem('userLists', JSON.stringify(lists));
}

function renderSidebar() {
    checkMidnightReset();


    const smartLists = document.getElementById('smart-lists');
    if (smartLists) {
        Array.from(smartLists.children).forEach(li => {
            if (li.dataset.id === window.activeListId) {
                li.classList.add('active');
            } else {
                li.classList.remove('active');
            }
        });
    }


    const userListsContainer = document.getElementById('user-lists');
    if (userListsContainer) {
        userListsContainer.innerHTML = '';
        const lists = getUserLists();
        
        lists.forEach(listName => {
            const li = document.createElement('li');
            li.className = 'list-item' + (window.activeListId === listName ? ' active' : '');
            li.dataset.id = listName;
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = listName;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-list-btn';
            deleteBtn.textContent = '×';
            deleteBtn.title = 'Delete list';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteUserList(listName);
            };
            
            li.appendChild(nameSpan);
            li.appendChild(deleteBtn);
            
            li.onclick = () => {
                setActiveList(listName);
            };
            
            userListsContainer.appendChild(li);
        });
    }

    setupSidebarEventListeners();
}

function deleteUserList(listName) {
    if (confirm(`Are you sure you want to delete the list "${listName}"?`)) {
        let lists = getUserLists();
        lists = lists.filter(n => n !== listName);
        saveUserLists(lists);
        
        if (window.activeListId === listName) {
            setActiveList('all');
        } else {
            renderSidebar();
        }
    }
}

let sidebarEventsAttached = false;
function setupSidebarEventListeners() {
    if (sidebarEventsAttached) return;
    

    const smartLists = document.getElementById('smart-lists');
    if (smartLists) {
        smartLists.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (li && li.dataset.id) {
                setActiveList(li.dataset.id);
            }
        });
    }


    const addBtn = document.getElementById('add-list-btn');
    const addInput = document.getElementById('add-list-input');
    
    if (addBtn && addInput) {
        addBtn.addEventListener('click', () => {
            addBtn.classList.add('hidden');
            addInput.classList.remove('hidden');
            addInput.focus();
        });
        
        addInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const name = addInput.value.trim();
                if (name) {
                    const lists = getUserLists();
                    if (!lists.includes(name)) {
                        lists.push(name);
                        saveUserLists(lists);
                    }
                    addInput.value = '';
                    addInput.classList.add('hidden');
                    addBtn.classList.remove('hidden');
                    setActiveList(name);
                } else {

                    addInput.classList.add('hidden');
                    addBtn.classList.remove('hidden');
                }
            } else if (e.key === 'Escape') {
                addInput.value = '';
                addInput.classList.add('hidden');
                addBtn.classList.remove('hidden');
            }
        });
        
        addInput.addEventListener('blur', () => {
            addInput.value = '';
            addInput.classList.add('hidden');
            addBtn.classList.remove('hidden');
        });
    }
    
    sidebarEventsAttached = true;
}

async function checkMidnightReset() {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastReset = localStorage.getItem('lastResetDate');
    
    if (lastReset !== todayStr) {

        const tasksToUpdate = Object.values(window.store).filter(t => t.labels && t.labels.includes('today'));
        
        if (tasksToUpdate.length > 0) {
            console.log(`Midnight reset: Removing 'today' label from ${tasksToUpdate.length} tasks.`);
            for (const task of tasksToUpdate) {
                const newLabels = task.labels.filter(l => l !== 'today');
                try {
                    const updatedTask = await API.updateTask(task.id, { labels: newLabels });
                    window.store[task.id] = updatedTask;
                } catch (e) {
                    console.error("Failed to clear today label for task", task.id, e);
                }
            }

            if (window.activeListId === 'today') {
                if (typeof renderTaskList === 'function') renderTaskList();
                if (typeof renderDetailView === 'function') renderDetailView();
            }
        }
        
        localStorage.setItem('lastResetDate', todayStr);
    }
}


window.renderSidebar = renderSidebar;
