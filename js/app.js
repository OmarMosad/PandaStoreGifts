/**
 * 🎁 متجر الباندا - Rewards Store
 * 🔧 Main Application JavaScript
 * 📝 Version 1.0.0
 */

/* =====================================================
   ⚙️ Configuration
   ===================================================== */

const CONFIG = {
    DEBUG: false,
    API_BASE_URL: 'https://api.pandastore.store',
    REFRESH_INTERVAL: 15000, // عدل هنا لتحديث أسرع/أبطأ
    ALERT_DURATION: 3500
};

/* =====================================================
   🌐 Global Variables
   ===================================================== */

let telegramWebApp = null;
let userData = {
    id: null,
    username: null,
    first_name: null,
    last_name: null
};
let appState = {
    currentRound: null,
    currentTasks: [],
    userProgress: null,
    roundHistory: [],
    inviterCode: null
};

/* =====================================================
   🚀 Initialization
   ===================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // تهيئة Telegram Web App
        initTelegramWebApp();
        
        // تحميل البيانات الأولية
        await loadData();
        
        // إضافة Event Listeners
        setupEventListeners();
        
        // بدء التحديث الدوري
        startAutoRefresh();
        
        log('✅ تم تهيئة التطبيق بنجاح');
    } catch (error) {
        showError('فشل تهيئة التطبيق: ' + error.message);
        log('❌ Init Error: ' + error.message, 'error');
    }
});

function initTelegramWebApp() {
    if (window.Telegram?.WebApp) {
        telegramWebApp = window.Telegram.WebApp;
        telegramWebApp.ready();
        telegramWebApp.expand();
        
        const user = telegramWebApp.initDataUnsafe?.user;
        if (user) {
            userData = {
                id: user.id,
                username: user.username || null,
                first_name: user.first_name || null,
                last_name: user.last_name || null
            };
        }
    }
    
    // استخراج كود الإحالة من URL
    const urlParams = new URLSearchParams(window.location.search);
    appState.inviterCode = urlParams.get('start');
    
    log('👤 User Data: ' + JSON.stringify(userData));
}

/* =====================================================
   📡 API Functions
   ===================================================== */

async function fetchApi(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        log(`📡 Request: ${method} ${endpoint}`);
        
        const response = await fetch(CONFIG.API_BASE_URL + endpoint, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        log(`✅ Response: ${endpoint}`, data);
        return data;
    } catch (error) {
        log(`❌ API Error (${endpoint}): ${error.message}`, 'error');
        throw error;
    }
}

async function loadData() {
    try {
        // إظهار حالة التحميل
        document.getElementById('loadingState').classList.add('active');
        hideAllSections();

        const requestBody = {
            userTelegramId: String(userData.id || 123456),
            username: userData.username || null,
            fullName: (userData.first_name || '') + ' ' + (userData.last_name || ''),
            photoUrl: null,
            inviterCode: appState.inviterCode || null
        };

        const response = await fetchApi('/api/rewards/state', 'POST', requestBody);

        if (!response.success) {
            throw new Error('فشل تحميل حالة الجوائز');
        }

        // إخفاء حالة التحميل بعد التحميل
        document.getElementById('loadingState').classList.remove('active');

        // معالجة حالات النظام
        if (!response.systemEnabled) {
            showSection('systemDisabledState');
            return;
        }

        if (!response.round) {
            showSection('noRoundState');
            return;
        }

        // تخزين البيانات
        appState.currentRound = response.round;
        appState.currentTasks = response.tasks || [];
        appState.userProgress = response.userProgress || {};

        // تحميل السجل
        await loadHistory();

        // عرض الجولة المناسبة
        if (response.round.status === 'ended') {
            renderEndedRound();
            showSection('endedRoundState');
        } else {
            renderActiveRound();
            showSection('activeRoundState');
        }

    } catch (error) {
        showError('خطأ: ' + error.message);
        log('Data Loading Error: ' + error.message, 'error');
    }
}

async function loadHistory() {
    try {
        const response = await fetchApi('/api/rewards/history', 'GET');
        if (response.success && Array.isArray(response.history)) {
            appState.roundHistory = response.history;
        }
    } catch (error) {
        log('History Loading Error: ' + error.message, 'warn');
    }
}

async function verifyTask(taskId) {
    try {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.add('loading');
        }

        const requestBody = {
            userTelegramId: String(userData.id || 123456),
            username: userData.username || null,
            fullName: (userData.first_name || '') + ' ' + (userData.last_name || ''),
            photoUrl: null,
            taskId: taskId
        };

        const response = await fetchApi('/api/rewards/tasks/verify', 'POST', requestBody);

        if (!response.success) {
            showError('فشل التحقق من المهمة: ' + (response.error || 'خطأ'));
            if (taskElement) {
                taskElement.classList.remove('loading');
            }
            return;
        }

        showSuccess('✅ تم التحقق من المهمة بنجاح!');

        // إعادة تحميل البيانات
        await loadData();

    } catch (error) {
        showError('خطأ: ' + error.message);
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.remove('loading');
        }
    }
}

/* =====================================================
   🎨 Rendering Functions
   ===================================================== */

function renderActiveRound() {
    const round = appState.currentRound;
    const tasks = appState.currentTasks;
    const progress = appState.userProgress;

    // تحديث حالة الجولة
    const participantsPercent = (round.currentParticipants / round.targetParticipants) * 100;
    document.getElementById('currentParticipants').textContent = round.currentParticipants;
    document.getElementById('targetParticipants').textContent = round.targetParticipants;
    document.getElementById('participantsProgress').style.width = Math.min(participantsPercent, 100) + '%';

    // تحديث الجائزة
    let prizeText = round.prizeType || 'جائزة';
    if (round.prizeValue) prizeText += ' - ' + round.prizeValue;
    document.getElementById('prizeDisplay').textContent = prizeText;

    // تحديث المهام
    const tasksContainer = document.getElementById('tasksContainer');
    tasksContainer.innerHTML = '';

    if (tasks.length === 0) {
        tasksContainer.innerHTML = `
            <div class="empty-state" style="padding: 30px 20px;">
                <i class="fas fa-check empty-icon"></i>
                <p>لا توجد مهام حالياً</p>
            </div>
        `;
    } else {
        tasks.forEach(task => {
            const isCompleted = task.completed;
            const taskCard = document.createElement('div');
            taskCard.className = 'task-card' + (isCompleted ? ' completed' : '');
            taskCard.setAttribute('data-task-id', task.id);
            
            taskCard.innerHTML = `
                <div class="task-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="task-content">
                    <div class="task-title">${escapeHtml(task.channelTitle)}</div>
                    <div class="task-channel">@${escapeHtml(task.channelUsername)}</div>
                </div>
                <div class="task-status">
                    ${isCompleted ? '<i class="fas fa-check"></i>' : ''}
                </div>
            `;
            
            if (!isCompleted) {
                taskCard.addEventListener('click', () => verifyTask(task.id));
                taskCard.style.cursor = 'pointer';
            } else {
                taskCard.style.cursor = 'default';
            }
            
            tasksContainer.appendChild(taskCard);
        });
    }

    document.getElementById('taskCount').textContent = tasks.length;

    // تحديث الإحالات
    document.getElementById('referralCount').textContent = 
        progress.countedReferrals + ' / ' + round.requiredReferrals;

    let statusText = '❌ لم تتأهل بعد';
    if (progress.isParticipant) {
        statusText = '✅ متأهل للجائزة';
    } else if (progress.hasInviter) {
        if (progress.inviteCounted) {
            statusText = '⏳ تم احتساب إحالتك';
        } else {
            statusText = '⏳ أكمل المهام';
        }
    }
    document.getElementById('userStatus').textContent = statusText;

    // تحديث كود الإحالة
    const refCode = userData.username || ('user_' + userData.id);
    document.getElementById('referralCode').value = refCode;
}

function renderEndedRound() {
    const round = appState.currentRound;
    const history = appState.roundHistory;

    // عرض بطاقة الفائز
    const winnerContent = document.getElementById('winnerCardContent');
    if (round.winnerUserId) {
        winnerContent.innerHTML = `
            <div class="winner-card">
                <div class="winner-avatar" style="background: linear-gradient(135deg, #4ecdc4 0%, #5DD9D2 100%);">
                    <i class="fas fa-trophy"></i>
                </div>
                <div class="winner-info">
                    <div class="winner-name">${escapeHtml(round.winnerFullName || round.winnerUsername || 'مستخدم')}</div>
                    <div class="winner-prize">${escapeHtml(round.prizeType)} ${round.prizeValue ? '- ' + escapeHtml(round.prizeValue) : ''}</div>
                </div>
            </div>
        `;
    } else {
        winnerContent.innerHTML = `
            <div class="empty-state" style="padding: 30px 20px;">
                <i class="fas fa-hourglass empty-icon"></i>
                <p>لم يتم اختيار الفائز بعد</p>
            </div>
        `;
    }

    // عرض السجل السابق
    const winnersHistory = document.getElementById('winnersHistory');
    if (history.length === 0) {
        winnersHistory.innerHTML = `
            <div class="empty-state" style="padding: 30px 20px;">
                <i class="fas fa-scroll empty-icon"></i>
                <p>لا يوجد سجل سابق</p>
            </div>
        `;
    } else {
        winnersHistory.innerHTML = history.slice(0, 5).map(winner => `
            <div class="winner-card">
                <div class="winner-avatar" style="background: linear-gradient(135deg, #ffc861 0%, #ffd584 100%);">
                    <i class="fas fa-award"></i>
                </div>
                <div class="winner-info">
                    <div class="winner-name">${escapeHtml(winner.winner_full_name || winner.winner_username || 'مستخدم')}</div>
                    <div class="winner-prize">${escapeHtml(winner.prize_type)} ${winner.prize_value ? '- ' + escapeHtml(winner.prize_value) : ''}</div>
                </div>
            </div>
        `).join('');
    }
}

/* =====================================================
   🎛️ UI Helpers
   ===================================================== */

function showSection(sectionId) {
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
    });
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
}

function hideAllSections() {
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
    });
}

function showAlert(message, type = 'success') {
    const alertId = type === 'success' ? 'alertSuccess' : 'alertError';
    const alertEl = document.getElementById(alertId);
    
    alertEl.textContent = message;
    alertEl.classList.add('show');
    
    setTimeout(() => {
        alertEl.classList.remove('show');
    }, CONFIG.ALERT_DURATION);
}

function showSuccess(message) {
    showAlert(message, 'success');
}

function showError(message) {
    showAlert(message, 'error');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function log(message, type = 'log') {
    if (CONFIG.DEBUG) {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

/* =====================================================
   🔄 Event Listeners
   ===================================================== */

function setupEventListeners() {
    // زر التحديث
    document.getElementById('refreshBtn').addEventListener('click', async () => {
        showSuccess('جارِ التحديث...');
        await loadData();
    });

    // نسخ كود الإحالة
    document.getElementById('copyCodeBtn')?.addEventListener('click', () => {
        const codeInput = document.getElementById('referralCode');
        const code = codeInput.value;
        
        navigator.clipboard.writeText(code).then(() => {
            codeInput.classList.add('copied');
            showSuccess('✅ تم نسخ الكود');
            
            setTimeout(() => {
                codeInput.classList.remove('copied');
            }, 1500);
        }).catch(() => {
            showError('فشل النسخ');
        });
    });

    // الضغط على حقل الكود لنسخه
    document.getElementById('referralCode')?.addEventListener('click', function() {
        this.select();
    });
}

function startAutoRefresh() {
    setInterval(async () => {
        log('🔄 Auto-refreshing data...', 'log');
        await loadData();
    }, CONFIG.REFRESH_INTERVAL);
}

/* =====================================================
   🌍 Export for Console Debugging
   ===================================================== */

window.app = {
    loadData,
    userData,
    appState,
    verifyTask,
    log
};
