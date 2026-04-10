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
        // Auto-refresh disabled - manual refresh only
        log('✅ تم تهيئة التطبيق بنجاح');
    } catch (error) {
        showError('فشل تهيئة التطبيق: ' + error.message);
        log('❌ Init Error: ' + error.message, 'error');
    }
});

/* =====================================================
   🔧 HELPER FUNCTIONS
   ===================================================== */

// SVG Icon Generator
function getSvgIcon(type, size = 24) {
    const icons = {
        gift: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: middle;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15h4v-4h4v-4h-4V7h-4v2H8v4h2v4zm6-9h-2v2h2v-2zm-8 0H6v2h2v-2z" fill="none"/><rect x="8" y="6" width="8" height="12" fill="none" stroke="currentColor" stroke-width="1.5" rx="1"/><path d="M12 2V6M8 6V2M16 6V2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
        users: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: middle;"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
        people: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: middle;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
        check: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: middle;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`,
        coin: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: middle;"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 6v12M8 10c0-1.1 1.8-2 4-2s4 .9 4 2M8 14c0 1.1 1.8 2 4 2s4-.9 4-2" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
        medal1: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: middle;"><circle cx="12" cy="8" r="5" fill="#FFD700"/><path d="M12 13v8M8 21h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="10" y="14" width="4" height="3" fill="currentColor"/></svg>`,
        medal2: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: middle;"><circle cx="12" cy="8" r="5" fill="#C0C0C0"/><path d="M12 13v8M8 21h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="10" y="14" width="4" height="3" fill="currentColor"/></svg>`,
        medal3: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: middle;"><circle cx="12" cy="8" r="5" fill="#CD7F32"/><path d="M12 13v8M8 21h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="10" y="14" width="4" height="3" fill="currentColor"/></svg>`,
        winner: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: middle;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#FFD700"/></svg>`,
        target: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: middle;"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`,
        refresh: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display: inline-block; vertical-align: middle;"><path d="M1 4v6h6M23 20v-6h-6" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64M3.51 15A9 9 0 0 0 18.36 18.36" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    };
    return icons[type] || '';
}

// Generate a fallback avatar SVG based on channel name
// =====================================================
// 🔍 EXTRACT TELEGRAM USERNAME
// =====================================================

function extractTelegramUsername(input) {
    if (!input) return null;
    
    input = String(input).trim();
    
    // إذا كان يبدأ بـ @، نزيله
    if (input.startsWith('@')) {
        return input.substring(1);
    }
    
    // استخراجه من رابط t.me
    const tmeLinkMatch = input.match(/t\.me\/([a-zA-Z0-9_]+)/);
    if (tmeLinkMatch) {
        return tmeLinkMatch[1];
    }
    
    // استخراجه من رابط telegram.me
    const telegramMeMatch = input.match(/telegram\.me\/([a-zA-Z0-9_]+)/);
    if (telegramMeMatch) {
        return telegramMeMatch[1];
    }
    
    // إذا كان اسم مستخدم بدون @
    if (/^[a-zA-Z0-9_]{4,}$/.test(input)) {
        return input;
    }
    
    return null;
}

// =====================================================
// 🎁 CREATE CHANNEL PHOTO HTML
// =====================================================

function createChannelPhotoHTML(input, fallbackEmoji = '📢', size = '56px') {
    const username = extractTelegramUsername(input);
    
    if (!username) {
        return `<span class="channel-icon" style="font-size: ${size}">${fallbackEmoji}</span>`;
    }
    
    const photoUrl = `https://t.me/i/userpic/320/${username}.jpg`;
    
    return `
        <img class="channel-photo" 
             src="${photoUrl}" 
             alt="${username}"
             style="width: ${size}; height: ${size}; border-radius: 50%; object-fit: cover; display: inline-block;"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
        <span class="channel-icon-fallback" 
              style="font-size: ${size}; display: none;">${fallbackEmoji}</span>
    `;
}

// =====================================================
// 📸 CHANNEL INFO FETCHING
// =====================================================

function getChannelAvatarUrl(channelName) {
    const safeName = String(channelName || 'Channel');
    const initial = safeName[0].toUpperCase();
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    const hash = (safeName.charCodeAt(0) || 67) + safeName.length; // 67 = 'C'.charCodeAt(0)
    const bgColor = colors[hash % colors.length];
    
    const svg = `<svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
        <rect width="56" height="56" fill="${bgColor}" rx="8"/>
        <text x="28" y="32" font-size="28" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif">${initial}</text>
    </svg>`;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

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

// =====================================================
// 📸 CHANNEL INFO FETCHING
// =====================================================

const channelInfoCache = new Map();

async function fetchChannelInfo(channelUsername) {
    const username = String(channelUsername || '').toLowerCase().replace('@', '');
    if (!username) return null;
    
    // Check cache first
    if (channelInfoCache.has(username)) {
        return channelInfoCache.get(username);
    }
    
    try {
        const data = await fetchApi('/api/mini-app/channel-info', 'POST', {
            channelUsername: `@${username}`
        });
        
        if (data.success && data.channel) {
            const channelInfo = {
                title: data.channel.title || username,
                photoUrl: data.channel.photo_url || null,
                description: data.channel.description || ''
            };
            channelInfoCache.set(username, channelInfo);
            return channelInfo;
        }
    } catch (error) {
        log(`⚠️ Could not fetch channel info for @${username}: ${error.message}`);
    }
    
    return null;
}

// =====================================================
// 🎁 GIFT PREVIEW RENDERING
// =====================================================

function renderGiftPreview(prizeType, prizeValue, prizeLink) {
    if (!prizeType || !prizeLink) return '';
    
    if (prizeType === 'nft') {
        // عرض preview مثل Google Search Preview
        const urlDisplay = prizeLink.replace(/^https?:\/\/(www\.)?/, '').substring(0, 50);
        const titleText = prizeValue || 'NFT Collectible';
        
        return `
            <div style="
                background: var(--bg-card);
                border-radius: 12px;
                overflow: hidden;
                border: 1px solid rgba(102, 126, 234, 0.3);
                margin-top: 8px;
                transition: all 0.2s ease;
            ">
                <a href="${prizeLink}" target="_blank" style="
                    text-decoration: none;
                    color: inherit;
                    display: block;
                    padding: 12px;
                ">
                    <div style="font-size: 11px; color: rgba(102, 126, 234, 0.7); margin-bottom: 6px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                        🔗 ${urlDisplay}
                    </div>
                    <div style="
                        font-weight: 600;
                        font-size: 15px;
                        margin-bottom: 6px;
                        color: #fff;
                        line-height: 1.3;
                    ">
                        🎨 ${titleText}
                    </div>
                    <div style="
                        font-size: 13px;
                        color: rgba(255,255,255,0.5);
                        line-height: 1.4;
                    ">
                        NFT Prize • Click to view collectible
                    </div>
                </a>
            </div>
        `;
    } else if (prizeType === 'ton') {
        return `
            <div style="
                background: var(--bg-card);
                border-radius: 12px;
                padding: 16px;
                margin-top: 8px;
                text-align: center;
                border: 1px solid rgba(0, 136, 204, 0.3);
            ">
                <div style="font-size: 12px; color: rgba(0, 136, 204, 0.8); margin-bottom: 8px; font-weight: 600;">
                    💎 TON REWARD
                </div>
                <div style="font-size: 32px; font-weight: bold; color: rgba(0, 136, 204, 1); margin-bottom: 4px;">
                    ${prizeValue}
                </div>
                <div style="font-size: 12px; color: rgba(0, 136, 204, 0.8);">
                    Ton Blockchain Prize
                </div>
            </div>
        `;
    }
    
    return '';
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

    // تحديث الجائزة - إزالة النص، سيتم عرض الهديه في الـ preview فقط
    const prizeText = document.getElementById('prizeText');
    const prizeMeta = document.getElementById('prizeMeta');
    
    if (prizeText) {
        prizeText.style.display = 'none';
    }
    
    // إضافة gift preview تحت prizeMeta
    const prizeCard = document.querySelector('.prize-card');
    if (prizeCard) {
        // إزالة أي preview قديم
        const oldPreview = prizeCard.querySelector('.gift-preview');
        if (oldPreview) oldPreview.remove();
        
        const previewHTML = renderGiftPreview(round.prizeType, round.prizeValue, round.prizeLink);
        if (previewHTML) {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'gift-preview';
            previewDiv.innerHTML = previewHTML;
            prizeCard.appendChild(previewDiv);
        }
    }

    // تحديث عدد المشاركين
    const currentParticipants = round.currentParticipants || 0;
    const targetParticipants = round.targetParticipants || 0;

    if (prizeMeta) {
        prizeMeta.innerHTML = `<span class="participants" style="display: flex; align-items: center; gap: 6px;">${getSvgIcon('users', 20)} ${currentParticipants} / ${targetParticipants} مشارِك</span>`;
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
                <div class="empty-icon" style="font-size: 48px; margin-bottom: 16px; color: var(--success-color);">${getSvgIcon('check', 48)}</div>
                <h3>لا توجد مهام حالياً</h3>
            </div>
        `;
        if (taskCount) taskCount.textContent = '0';
        return;
    }

    if (taskCount) taskCount.textContent = appState.currentTasks.length;

    // جلب معلومات القنوات من Telegram API ثم عرضها
    (async () => {
        for (const task of appState.currentTasks) {
            const isCompleted = appState.completedTaskIds.includes(task.id);
            const channelUsername = task.channelUsername;
            
            // جلب معلومات القناة الحقيقية من API (اسم + صورة)
            let channelTitle = task.channelTitle || channelUsername || 'قناة';
            let channelPhotoHTML = `<span class="channel-icon" style="font-size: 56px">📢</span>`;
            
            try {
                const channelInfo = await fetchChannelInfo(channelUsername);
                if (channelInfo) {
                    channelTitle = channelInfo.title || channelTitle;
                    
                    // إذا كان هناك صورة من API، استخدمها
                    if (channelInfo.photoUrl) {
                        channelPhotoHTML = `
                            <img class="channel-photo" 
                                 src="${channelInfo.photoUrl}" 
                                 alt="${channelUsername}"
                                 style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; display: inline-block;"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                            <span class="channel-icon-fallback" 
                                  style="font-size: 56px; display: none;">📢</span>
                        `;
                    }
                }
            } catch (error) {
                log(`⚠️ Could not fetch channel info for ${channelUsername}: ${error.message}`);
            }
            
            const taskEl = document.createElement('div');
            taskEl.className = `task-card ${isCompleted ? 'completed' : 'uncompleted'}`;
            
            taskEl.innerHTML = `
                <div class="task-content">
                    <div class="task-avatar" style="display: flex; align-items: center; justify-content: center;">
                        ${channelPhotoHTML}
                    </div>
                    <div class="task-info">
                        <div class="task-title">${channelTitle}</div>
                        <div class="task-channel">
                            # ${channelUsername}
                        </div>
                    </div>
                    <div class="task-status">
                        ${isCompleted ? '✓' : '→'}
                    </div>
                </div>
            `;
            
            if (!isCompleted) {
                taskEl.addEventListener('click', () => verifyTask(task.id, channelUsername));
            }
            
            tasksContainer.appendChild(taskEl);
        }
    })();
}

function renderReferrals() {
    const progress = appState.userProgress || {};
    const requiredReferrals = appState.currentRound?.requiredReferrals || 0;
    const countedReferrals = progress.countedReferrals || 0;

    // تحديث عدد الإحالات
    const referralCount = document.getElementById('referralCount');
    if (referralCount) {
        referralCount.textContent = `${countedReferrals} / ${requiredReferrals}`;
    }

    // تحديث حالة المستخدم - فقط مؤهل إذا تم تحقق العدد المطلوب تماماً
    const userStatus = document.getElementById('userStatus');
    if (userStatus) {
        if (requiredReferrals > 0 && countedReferrals >= requiredReferrals) {
            userStatus.textContent = '✅ مؤهل';
            userStatus.style.color = 'var(--success-color)';
        } else {
            const remaining = Math.max(0, requiredReferrals - countedReferrals);
            if (remaining === 0 && requiredReferrals === 0) {
                userStatus.textContent = '✅ مؤهل';
                userStatus.style.color = 'var(--success-color)';
            } else {
                userStatus.innerHTML = `<span>${getSvgIcon('target', 18)} ${remaining} متبقي</span>`;
                userStatus.style.color = 'var(--warning-color)';
            }
        }
    }

    // تحديث كود الإحالة
    const referralCode = document.getElementById('referralCode');
    if (referralCode) {
        const code = userData.username || `user_${userData.id}`;
        referralCode.value = code;
    }

    // تحديث رابط الإحالة - استخدام ?start= بدلاً من ?startapp=
    const referralLink = document.getElementById('referralLink');
    if (referralLink) {
        const startParam = userData.username || `ref_${userData.id}`;
        const botUsername = 'PandaStores_bot';
        referralLink.value = `https://t.me/${botUsername}?start=${startParam}`;
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

        if (winner.winnerUserId && winnerCard) {
            winnerCard.style.display = 'block';
            const winnerAvatar = document.getElementById('winnerAvatar');
            const winnerPhotoUrl = winner.winnerPhotoUrl || getChannelAvatarUrl(winner.winnerFullName || 'الفائز');
            winnerAvatar.src = winnerPhotoUrl;
            winnerAvatar.onerror = () => {
                winnerAvatar.src = getChannelAvatarUrl(winner.winnerFullName || 'الفائز');
            };
            
            document.getElementById('winnerName').textContent = winner.winnerFullName || 'الفائز';
            document.getElementById('winnerUsername').textContent = `@${winner.winnerUsername}`;
            
            let prizeDisplay = 'جائزة';
            if (winner.prizeType === 'ton') {
                prizeDisplay = `${winner.prizeValue} TON ${getSvgIcon('coin', 20)}`;
            } else if (winner.prizeValue) {
                prizeDisplay = winner.prizeValue;
            }
            document.getElementById('winnerPrize').textContent = prizeDisplay;
        }

        if (winner.winnerUserId === String(userData.id)) {
            if (winnerStatus) {
                winnerStatus.innerHTML = `<div style="color: var(--success-color); font-weight: 700; display: flex; align-items: center; gap: 8px;">${getSvgIcon('winner', 24)} أنت الفائز!</div>`;
            }
        } else {
            if (winnerStatus) {
                winnerStatus.innerHTML = `<div style="color: var(--text-secondary); display: flex; align-items: center; gap: 8px;"><span>${getSvgIcon('refresh', 20)}</span> بحث عن جولة جديدة...</div>`;
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
            historyContainer.innerHTML = `<p style="color: var(--text-tertiary); text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px;"><span>${getSvgIcon('refresh', 20)}</span> سحوبات سابقة</p>`;
        }
        return;
    }

    historyContainer.innerHTML = '';
    
    appState.roundHistory.forEach((item, index) => {
        const historyEl = document.createElement('div');
        historyEl.className = 'history-item';
        
        let rankIcon = '';
        if (index === 0) {
            rankIcon = getSvgIcon('medal1', 28);
        } else if (index === 1) {
            rankIcon = getSvgIcon('medal2', 28);
        } else if (index === 2) {
            rankIcon = getSvgIcon('medal3', 28);
        } else {
            rankIcon = `<span style="font-size: 24px; font-weight: bold;">#${index + 1}</span>`;
        }
        
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
// Auto-refresh disabled - manual refresh only
// document.addEventListener('visibilitychange', () => {
//     if (document.hidden) {
//         stopAutoRefresh();
//     } else {
//         startAutoRefresh();
//     }
// });
