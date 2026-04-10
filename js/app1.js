/**
 * 🎁 Panda Store - Rewards Mini App
 * 🔧 Main Application JavaScript v2.0
 */

/* =====================================================
   ⚙️ CONFIGURATION
   ===================================================== */

const CONFIG = {
    DEBUG: false,
    API_BASE_URL: 'https://api.pandastore.store',
    REFRESH_INTERVAL: 15000,
    ALERT_DURATION: 3500
};

/* =====================================================
   🌐 GLOBAL VARIABLES
   ===================================================== */

let telegramWebApp = null;
let userData = {
    id: null,
    username: null,
    first_name: null,
    last_name: null,
    photo_url: null
};

let appState = {
    currentRound: null,
    currentTasks: [],
    userProgress: null,
    roundHistory: [],
    inviterCode: null,
    completedTaskIds: [],
    currentTab: 'tasks'
};

/* =====================================================
   🚀 INITIALIZATION
   ===================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        initTelegramWebApp();
        await loadData();
        setupEventListeners();
        startAutoRefresh();
        log('✅ تم تهيئة التطبيق بنجاح');
    } catch (error) {
        showError('فشل تهيئة التطبيق: ' + error.message);
        log('❌ Init Error: ' + error.message, 'error');
    }
});

/* =====================================================
   🔧 HELPER FUNCTIONS
   ===================================================== */

function log(msg, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('ar-EG');
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
    if (CONFIG.DEBUG || type === 'error') {
        console.log(`[${timestamp}] ${prefix} ${msg}`);
    }
}

function normalizeBotLang(languageCode) {
    const code = String(languageCode || '').toLowerCase();
    const supported = ['ar', 'en', 'de', 'es', 'fr', 'it', 'ru'];
    const exact = supported.find((lang) => code === lang || code.startsWith(`${lang}-`) || code.startsWith(`${lang}_`));
    return exact || 'ar';
}

function hideAllSections() {
    document.querySelectorAll('[id$="State"]').forEach(el => {
        if (el.classList) {
            el.classList.remove('active');
            el.style.display = 'none';
        }
    });
}

function showSection(sectionId) {
    hideAllSections();
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = '';
    }
}

function showAlert(message, type = 'success') {
    const alertId = type === 'success' ? 'alertSuccess' : 'alertError';
    const alert = document.getElementById(alertId);
    if (alert) {
        alert.textContent = message;
        alert.classList.add('active');
        setTimeout(() => {
            alert.classList.remove('active');
        }, CONFIG.ALERT_DURATION);
    }
}

function showError(message) {
    showAlert(message, 'error');
}

async function fetchApi(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Origin': window.location.origin
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

/* =====================================================
   🌐 TELEGRAM INTEGRATION
   ===================================================== */

function initTelegramWebApp() {
    telegramWebApp = window.Telegram?.WebApp;
    
    if (!telegramWebApp) {
        throw new Error('Telegram WebApp SDK not available');
    }

    telegramWebApp.ready();
    telegramWebApp.expand();

    const user = telegramWebApp.initDataUnsafe?.user;
    if (user) {
        userData = {
            id: user.id,
            username: user.username || null,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            photo_url: user.photo_url || null
        };
        
        updateUserHeader();
    }

    const hash = new URL(window.location.href).searchParams.get('tgWebAppStartParam');
    if (hash) {
        appState.inviterCode = hash;
    }
}

function updateUserHeader() {
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');

    const displayName = userData.first_name || userData.username || 'المستخدم';
    if (userName) {
        userName.textContent = displayName;
    }

    if (userData.photo_url && userAvatar) {
        userAvatar.src = userData.photo_url;
        userAvatar.onerror = () => {
            userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;
        };
    } else if (userAvatar) {
        userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;
    }
}

/* =====================================================
   📊 DATA LOADING
   ===================================================== */

async function loadData() {
    try {
        // إظهار حالة التحميل
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.classList.add('active');
        }

        hideAllSections();

        const requestBody = {
            userTelegramId: String(userData.id || 123456),
            username: userData.username || null,
            fullName: (userData.first_name || '') + ' ' + (userData.last_name || ''),
            photoUrl: userData.photo_url || null,
            inviterCode: appState.inviterCode || null
        };

        const response = await fetchApi('/api/rewards/state', 'POST', requestBody);

        if (!response.success) {
            throw new Error('فشل تحميل حالة الجوائز');
        }

        // إخفاء حالة التحميل
        if (loadingState) {
            loadingState.classList.remove('active');
        }

        // معالجة حالات النظام
        if (!response.systemEnabled) {
            showSection('systemDisabledState');
            return;
        }

        if (!response.round) {
            showSection('noRoundState');
            appState.roundHistory = response.history || [];
            renderEndedRound();
            return;
        }

        // معالجة الجولة النشطة
        appState.currentRound = response.round;
        appState.currentTasks = response.tasks || [];
        appState.userProgress = response.userProgress || {};
        appState.roundHistory = response.history || [];

        // جلب المهام المكملة
        if (response.round.status === 'active' || response.round.status === 'paused') {
            const completedRes = await fetchApi('/api/mini-app/user/completed-tasks', 'POST', {
                userTelegramId: String(userData.id)
            });
            appState.completedTaskIds = completedRes.completed_task_ids || [];
        }

        if (response.round.status === 'active' || response.round.status === 'paused') {
            showSection('activeRoundState');
            renderActiveRound();
        } else {
            showSection('endedRoundState');
            renderEndedRound();
        }
    } catch (error) {
        showError('خطأ في تحميل البيانات: ' + error.message);
        log('❌ loadData error:', error);
    }
}

/* =====================================================
   🎨 RENDERING FUNCTIONS
   ===================================================== */

function renderActiveRound() {
    const round = appState.currentRound;
    if (!round) return;

    // تحديث حالة الجولة
    const roundStatusText = document.getElementById('roundStatusText');
    if (roundStatusText) {
        const status = round.status === 'active' ? '🟢 جولة نشطة' : '🟡 موقوفة مؤقتاً';
        roundStatusText.textContent = status;
    }

    // تحديث الجائزة
    const prizeText = document.getElementById('prizeText');
    const prizeMeta = document.getElementById('prizeMeta');
    
    if (prizeText) {
        let prizeDisplay = 'جائزة مميزة';
        
        if (round.prize_type === 'nft') {
            prizeDisplay = `NFT ${round.prize_value || ''}`;
        } else if (round.prize_type === 'ton') {
            prizeDisplay = `${round.prize_value || '0'} TON 💎`;
        } else if (round.prize_type === 'custom') {
            prizeDisplay = round.prize_value || 'جائزة خاصة';
        }
        
        prizeText.textContent = prizeDisplay;
    }

    // تحديث عدد المشاركين
    const currentParticipants = appState.userProgress?.participants_count || 0;
    const targetParticipants = round.target_participants || 0;

    if (prizeMeta) {
        prizeMeta.innerHTML = `<span class="participants">👥 ${currentParticipants} / ${targetParticipants} مشارِك</span>`;
    }

    // تحديث التقدم
    const progressPercent = targetParticipants > 0 ? Math.round((currentParticipants / targetParticipants) * 100) : 0;
    const progressFill = document.getElementById('progressFill');
    const progressPercentEl = document.getElementById('progressPercent');

    if (progressFill) {
        progressFill.style.width = progressPercent + '%';
    }
    if (progressPercentEl) {
        progressPercentEl.textContent = progressPercent + '%';
    }

    // رسم المهام
    renderTasks();

    // رسم الإحالات
    renderReferrals();
}

function renderTasks() {
    const tasksContainer = document.getElementById('tasksContainer');
    const taskCount = document.getElementById('taskCount');
    
    if (!tasksContainer) return;

    tasksContainer.innerHTML = '';
    
    if (!appState.currentTasks || appState.currentTasks.length === 0) {
        tasksContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle empty-icon"></i>
                <h3>لا توجد مهام حالياً</h3>
            </div>
        `;
        if (taskCount) taskCount.textContent = '0';
        return;
    }

    if (taskCount) taskCount.textContent = appState.currentTasks.length;

    appState.currentTasks.forEach(task => {
        const isCompleted = appState.completedTaskIds.includes(task.id);
        
        const taskEl = document.createElement('div');
        taskEl.className = `task-card ${isCompleted ? 'completed' : 'uncompleted'}`;
        taskEl.innerHTML = `
            <div class="task-content">
                <img src="${task.channel_photo_url || 'https://via.placeholder.com/56'}" 
                     class="task-avatar" alt="${task.channel_title}">
                <div class="task-info">
                    <div class="task-title">${task.channel_title}</div>
                    <div class="task-channel">
                        <i class="fas fa-hashtag"></i> ${task.channel_username}
                    </div>
                </div>
                <div class="task-status">
                    <i class="fas ${isCompleted ? 'fa-check-circle' : 'fa-arrow-right'}"></i>
                </div>
            </div>
        `;
        
        if (!isCompleted) {
            taskEl.addEventListener('click', () => verifyTask(task.id, task.channel_username));
        }
        
        tasksContainer.appendChild(taskEl);
    });
}

function renderReferrals() {
    const progress = appState.userProgress || {};
    const requiredReferrals = appState.currentRound?.required_referrals || 0;
    const countedReferrals = progress.counted_referrals || 0;

    // تحديث عدد الإحالات
    const referralCount = document.getElementById('referralCount');
    if (referralCount) {
        referralCount.textContent = `${countedReferrals} / ${requiredReferrals}`;
    }

    // تحديث حالة المستخدم
    const userStatus = document.getElementById('userStatus');
    if (userStatus) {
        if (countedReferrals >= requiredReferrals) {
            userStatus.textContent = '✅ مؤهل';
            userStatus.style.color = 'var(--success-color)';
        } else {
            userStatus.textContent = `⏳ ${requiredReferrals - countedReferrals} نقص`;
            userStatus.style.color = 'var(--warning-color)';
        }
    }

    // تحديث كود الإحالة
    const referralCode = document.getElementById('referralCode');
    if (referralCode) {
        const code = userData.username || `user_${userData.id}`;
        referralCode.value = code;
    }

    // تحديث رابط الإحالة
    const referralLink = document.getElementById('referralLink');
    if (referralLink) {
        const startParam = userData.username || `ref_${userData.id}`;
        const botUsername = 'PandaStores_bot'; // يجب أن تأخذ من البوت
        referralLink.value = `https://t.me/${botUsername}?startapp=${startParam}`;
    }
}

function renderEndedRound() {
    const endedRoundState = document.getElementById('endedRoundState');
    if (!endedRoundState) return;

    // إذا كانت هناك جولة منتهية
    if (appState.currentRound && appState.currentRound.status === 'ended') {
        const winner = appState.currentRound;
        const winnerCard = document.getElementById('winnerCard');
        const winnerStatus = document.getElementById('winnerStatus');

        if (winner.winner_user_id && winnerCard) {
            winnerCard.style.display = 'block';
            document.getElementById('winnerAvatar').src = winner.winner_photo_url || 'https://via.placeholder.com/80';
            document.getElementById('winnerName').textContent = winner.winner_full_name || 'الفائز';
            document.getElementById('winnerUsername').textContent = `@${winner.winner_username}`;
            
            let prizeDisplay = 'جائزة';
            if (winner.prize_type === 'ton') {
                prizeDisplay = `${winner.prize_value} TON 💎`;
            } else if (winner.prize_value) {
                prizeDisplay = winner.prize_value;
            }
            document.getElementById('winnerPrize').textContent = prizeDisplay;
        }

        if (winner.winner_user_id === String(userData.id)) {
            if (winnerStatus) {
                winnerStatus.innerHTML = `<div style="color: var(--success-color); font-weight: 700;">🎉 أنت الفائز!</div>`;
            }
        } else {
            if (winnerStatus) {
                winnerStatus.innerHTML = `<div style="color: var(--text-secondary);">بحث عن جولة جديدة...</div>`;
            }
        }
    }

    // رسم السجل السابق
    renderHistory();
}

function renderHistory() {
    const historyContainer = document.getElementById('historyContainer');
    if (!historyContainer || !appState.roundHistory || appState.roundHistory.length === 0) {
        if (historyContainer) {
            historyContainer.innerHTML = '<p style="color: var(--text-tertiary); text-align: center;">لا توجد سحوبات سابقة</p>';
        }
        return;
    }

    historyContainer.innerHTML = '';
    
    appState.roundHistory.forEach((item, index) => {
        const historyEl = document.createElement('div');
        historyEl.className = 'history-item';
        
        const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index + 1);
        
        historyEl.innerHTML = `
            <div class="history-rank">${rankIcon}</div>
            <div class="history-info">
                <div class="history-name">${item.winner_full_name || 'مستخدم'}</div>
                <div class="history-prize">${item.prize_value || 'جائزة'}</div>
            </div>
        `;
        
        historyContainer.appendChild(historyEl);
    });
}

/* =====================================================
   ✔️ TASK VERIFICATION
   ===================================================== */

async function verifyTask(taskId, channelUsername) {
    try {
        log(`🔍 التحقق من المهمة: ${taskId}`);
        
        const response = await fetchApi('/api/rewards/tasks/verify', 'POST', {
            userTelegramId: String(userData.id),
            username: userData.username || null,
            fullName: (userData.first_name || '') + ' ' + (userData.last_name || ''),
            photoUrl: userData.photo_url || null,
            taskId: taskId
        });

        if (response.success && response.verified) {
            showAlert('✅ تم التحقق من المهمة بنجاح!');
            appState.completedTaskIds.push(taskId);
            renderTasks();
            renderReferrals();
            
            if (response.roundFinished) {
                showAlert('🎉 اكتملت الجولة!');
                await loadData();
            }
        } else {
            showError('❌ فشل التحقق: ' + (response.error || 'خطأ غير معروف'));
        }
    } catch (error) {
        showError('❌ خطأ في التحقق: ' + error.message);
        log('verifyTask error:', error);
    }
}

/* =====================================================
   🎛️ UI EVENTS
   ===================================================== */

function setupEventListeners() {
    // زر التحديث
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await loadData();
        });
    }

    // أزرار التابس
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', switchTab);
    });

    // زر نسخ الكود
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', copyToClipboard);
    }

    // زر نسخ الرابط
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', copyLinkToClipboard);
    }
}

function switchTab(e) {
    const tabBtn = e.target.closest('.tab-btn');
    if (!tabBtn) return;

    const tabName = tabBtn.dataset.tab;
    
    // تحديث الأزرار
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    tabBtn.classList.add('active');

    // تحديث المحتوى
    document.querySelectorAll('.tab-content-area').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    const targetTab = document.getElementById(tabName + 'Tab');
    if (targetTab) {
        targetTab.classList.remove('hidden');
    }

    appState.currentTab = tabName;
}

function copyToClipboard() {
    const input = document.getElementById('referralCode');
    if (input) {
        input.select();
        document.execCommand('copy');
        
        const btn = document.getElementById('copyCodeBtn');
        if (btn) {
            btn.classList.add('copied');
            btn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = '<i class="fas fa-copy"></i>';
            }, 2000);
        }
    }
}

function copyLinkToClipboard() {
    const input = document.getElementById('referralLink');
    if (input) {
        input.select();
        document.execCommand('copy');
        
        const btn = document.getElementById('copyLinkBtn');
        if (btn) {
            btn.classList.add('copied');
            btn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = '<i class="fas fa-copy"></i>';
            }, 2000);
        }
    }
}

/* =====================================================
   🔄 AUTO REFRESH
   ===================================================== */

let autoRefreshInterval = null;

function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    
    autoRefreshInterval = setInterval(async () => {
        log('🔄 Auto-refreshing data...');
        try {
            await loadData();
        } catch (error) {
            log('⚠️ Auto-refresh failed: ' + error.message, 'warning');
        }
    }, CONFIG.REFRESH_INTERVAL);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Stop refresh when app loses focus
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        startAutoRefresh();
    }
});
