
window.store = {};
window.selectedTaskId = null;
window.activeListId = 'all';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initApp();
    setupMobileNavigation();
});

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            setTheme(newTheme);
        });
    }
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.innerHTML = theme === 'dark' 
            ? '<i data-lucide="sun" id="theme-icon"></i>' 
            : '<i data-lucide="moon" id="theme-icon"></i>';
        if (window.refreshIcons) window.refreshIcons();
    }
    
    const appLogo = document.getElementById('app-logo');
    if (appLogo) {
        appLogo.src = theme === 'dark' ? '/static/img/logo-dark.svg' : '/static/img/logo-light.svg';
    }
    
    const favicon = document.getElementById('favicon');
    if (favicon) {
        favicon.href = theme === 'dark' ? '/static/img/logo-dark.svg' : '/static/img/logo-light.svg';
    }
}

let audioCtx = null;
function playDoneSound() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
        console.log("Audio play failed", e);
    }
}
window.playDoneSound = playDoneSound;

async function initApp() {
    await refreshAll();
}

async function refreshAll() {
    try {
        const tasks = await API.getTasks();
        

        window.store = {};
        tasks.forEach(task => {
            window.store[task.id] = task;
        });


        if (typeof renderSidebar === 'function') renderSidebar();
        if (typeof renderTaskList === 'function') renderTaskList();
        if (typeof renderDetailView === 'function') renderDetailView();
        
        updateMobileTopBar();
        refreshIcons();
    } catch (error) {
        console.error("Failed to load tasks:", error);
        alert("Failed to load tasks. Please check the console.");
    }
}

function selectTask(id) {
    window.selectedTaskId = id;
    

    if (window.innerWidth < 768 && id) {
        document.body.classList.add('detail-active');
    }
    
    if (typeof renderTaskList === 'function') renderTaskList();
    if (typeof renderDetailView === 'function') renderDetailView();
}

function setActiveList(listId) {
    window.activeListId = listId;
    window.selectedTaskId = null;
    
    if (typeof renderSidebar === 'function') renderSidebar();
    if (typeof renderTaskList === 'function') renderTaskList();
    if (typeof renderDetailView === 'function') renderDetailView();
    
    updateMobileTopBar();
    

    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth < 1024 && sidebar) {
        sidebar.classList.remove('open');
    }
}

function updateMobileTopBar() {
    const titleEl = document.getElementById('current-list-title');
    if (!titleEl) return;
    
    let title = window.activeListId;
    if (title === 'all') title = 'Inbox';
    if (title === 'today') title = 'Today';
    if (title === 'upcoming') title = 'Upcoming';
    

    if (title !== 'Inbox' && title !== 'Today' && title !== 'Upcoming') {
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
    

    document.addEventListener('click', (e) => {
        if (window.innerWidth < 1024 && sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
}

function refreshIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}
window.refreshIcons = refreshIcons;
