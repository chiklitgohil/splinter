// Global State
window.store = {}; // flat map of all tasks by id
window.selectedTaskId = null;
window.activeListId = 'all'; // 'all', 'today', 'upcoming', or custom name

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupMobileNavigation();
});

async function initApp() {
    await refreshAll();
}

async function refreshAll() {
    try {
        const tasks = await API.getTasks();
        
        // Rebuild store
        window.store = {};
        tasks.forEach(task => {
            window.store[task.id] = task;
        });

        // Trigger renders
        if (typeof renderSidebar === 'function') renderSidebar();
        if (typeof renderTaskList === 'function') renderTaskList();
        if (typeof renderDetailView === 'function') renderDetailView();
        
        updateMobileTopBar();
    } catch (error) {
        console.error("Failed to load tasks:", error);
        alert("Failed to load tasks. Please check the console.");
    }
}

function selectTask(id) {
    window.selectedTaskId = id;
    
    // On mobile, show detail view
    if (window.innerWidth < 768 && id) {
        document.body.classList.add('detail-active');
    }
    
    if (typeof renderTaskList === 'function') renderTaskList(); // to update highlights
    if (typeof renderDetailView === 'function') renderDetailView();
}

function setActiveList(listId) {
    window.activeListId = listId;
    window.selectedTaskId = null; // Clear selection when switching lists
    
    if (typeof renderSidebar === 'function') renderSidebar();
    if (typeof renderTaskList === 'function') renderTaskList();
    if (typeof renderDetailView === 'function') renderDetailView();
    
    updateMobileTopBar();
    
    // Close sidebar on mobile after selection
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth < 1024 && sidebar) {
        sidebar.classList.remove('open');
    }
}

function updateMobileTopBar() {
    const titleEl = document.getElementById('current-list-title');
    if (!titleEl) return;
    
    let title = window.activeListId;
    if (title === 'all') title = 'All Tasks';
    if (title === 'today') title = 'Today';
    if (title === 'upcoming') title = 'Upcoming';
    
    // Capitalize custom list names
    if (title !== 'All Tasks' && title !== 'Today' && title !== 'Upcoming') {
        title = title.charAt(0).toUpperCase() + title.slice(1);
    }
    
    titleEl.textContent = title;
}

function setupMobileNavigation() {
    const menuBtn = document.getElementById('menu-toggle');
    const backBtn = document.getElementById('back-btn');
    const sidebar = document.getElementById('sidebar');
    
    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
    
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.body.classList.remove('detail-active');
            window.selectedTaskId = null;
            if (typeof renderTaskList === 'function') renderTaskList();
            if (typeof renderDetailView === 'function') renderDetailView();
        });
    }
    
    // Close sidebar if clicking outside on tablet
    document.addEventListener('click', (e) => {
        if (window.innerWidth < 1024 && sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && e.target !== menuBtn) {
                sidebar.classList.remove('open');
            }
        }
    });
}
