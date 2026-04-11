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
    ALERT_DURATION: 3500,
    PRIMARY_COLOR: '#F8B12D'
};

// ✅ بيانات الكابتشا
const CAPTCHA_CONFIG = {
    SITE_KEY: 'YOUR_HCAPTCHA_SITE_KEY'
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

// 🎯 نموذج بيانات الإحالات والمهام المكملة
let referralData = {
    currentRoundId: null,
    referredUsers: [],
    tasksCompletedByReferrals: {}
};

let appState = {
    currentRound: null,
    currentTasks: [],
    userProgress: null,
    roundHistory: [],
    inviterCode: null,
    completedTaskIds: [],
    currentTab: 'tasks',
    cachedReferralLink: null,
    cachedReferralRoundId: null,
    deviceFingerprint: null
};

/* =====================================================
   🚀 INITIALIZATION
   ===================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        initTelegramWebApp();
        showVerificationScreen();
        setupEventListeners();
        
        // ✅ Get initial round info, then verify device, then load full data
        const roundInfo = await getInitialRoundInfo();
        
        if (!roundInfo || !roundInfo.round) {
            hideVerificationScreen();
            await loadData();
            log('✅ تم تهيئة التطبيق بنجاح (بدون جولة نشطة)');
            return;
        }
        
        log(`🔐 بدء التحقق من الجهاز للجولة ${roundInfo.round.id}...`);
        
        // Verify device for this specific round - with detailed error capture
        const verified = await verifyDeviceFingerprint(roundInfo.round.id);
        
        if (!verified) {
            // Get block reason from appState which was set in verifyDeviceFingerprint
            const blockReason = appState.blockReason || 'جهازك محظور - تم اكتشاف محاولة تعدد حسابات';
            log(`⛔ حجب المستخدم: ${blockReason}`, 'error');
            hideVerificationScreen();
            // Small delay to ensure verification screen is removed before showing blocked screen
            await new Promise(resolve => setTimeout(resolve, 100));
            showBlockedScreen(blockReason);
            return;
        }
        
        hideVerificationScreen();
        await loadData();
        log('✅ تم تهيئة التطبيق بنجاح - جهاز موثوق');
    } catch (error) {
        hideVerificationScreen();
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

/* =====================================================
   🔐 DEVICE FINGERPRINTING (مانع التعدد)
   ===================================================== */

async function generateDeviceFingerprint() {
    try {
        // ✅ الحصول على Device ID ثابت جداً (مستقل عن نسخة التطبيق/المتصفح)
        const stableDeviceId = getStableDeviceId();
        
        const fpData = {
            // معرف الجهاز الثابت (استخدام localStorage + معلومات الجهاز الثابتة)
            stableDeviceId: stableDeviceId,
            // معرف محلي فريد (backup)
            localId: getOrCreateLocalDeviceId(),
            // معلومات الجهاز المادية الثابتة جداً
            hardwareId: getHardwareId(),
            // معلومات المتصفح
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            // معرف الشاشة (ثابت تقريباً)
            screenResolution: `${screen.width}x${screen.height}x${screen.colorDepth}`,
            screenOrientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
            // معلومات الوقت المنطقة
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            // بيانات Canvas Fingerprint
            canvasHash: await getCanvasFingerprint(),
            // بيانات WebGL
            webglHash: await getWebGLFingerprint()
        };
        
        // دمج البيانات وإنشاء hash
        const fpString = JSON.stringify(fpData);
        const fpHash = await hashString(fpString);
        
        log(`🔐 تم إنشاء بصمة الجهاز: ${fpHash.substring(0, 16)}... (Device ID: ${stableDeviceId.substring(0, 16)}...)`);
        appState.deviceFingerprint = {hash: fpHash, data: fpData, stableDeviceId: stableDeviceId};
        return fpHash;
    } catch (error) {
        log(`⚠️ خطأ في إنشاء البصمة: ${error.message}`, 'error');
        return null;
    }
}

function getOrCreateLocalDeviceId() {
    const key = '__device_id_rewards';
    let id = localStorage.getItem(key);
    if (!id) {
        id = generateUUID();
        localStorage.setItem(key, id);
    }
    return id;
}

// ✅ Stable Device ID - يبقى ثابت حتى لو غيرت نسخة التطبيق/المتصفح
function getStableDeviceId() {
    const key = '__stable_device_id';
    let id = localStorage.getItem(key);
    if (!id) {
        // إنشاء Device ID ثابت جداً من معلومات الجهاز
        const hardwareData = {
            timestamp: new Date().getTime(),
            random: Math.random(),
            screen: `${screen.width}${screen.height}${screen.colorDepth}`,
            platform: navigator.platform,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        id = generateUUID() + '_' + hashStringSync(JSON.stringify(hardwareData)).substring(0, 16);
        localStorage.setItem(key, id);
        log(`🆔 تم إنشاء معرف جهاز ثابت: ${id}`);
    }
    return id;
}

// ✅ Hardware ID - معلومات الجهاز المادية الثابتة
function getHardwareId() {
    try {
        const hwData = {
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            screenWidth: screen.width,
            screenHeight: screen.height,
            colorDepth: screen.colorDepth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            languages: navigator.languages ? navigator.languages.slice(0, 3).join(',') : navigator.language
        };
        return hashStringSync(JSON.stringify(hwData));
    } catch (e) {
        log(`⚠️ Hardware ID failed: ${e.message}`, 'warn');
        return 'UNKNOWN_HW';
    }
}

// ✅ Synchronous Hash (للاستخدام في البيانات الثابتة)
function hashStringSync(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getCanvasFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.fillRect(125, 1, 62, 20);
        ctx.font = '20px Courier';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = 'rgb(102, 102, 102)';
        ctx.fillText('🔐FP Canvas', 2, 15);
        const signature = canvas.toDataURL();
        return await hashString(signature);
    } catch (e) {
        log(`⚠️ Canvas FP failed: ${e.message}`, 'warn');
        return 'NA';
    }
}

async function getWebGLFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'NO_WEBGL';
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        const fpString = `${vendor}|${renderer}`;
        return await hashString(fpString);
    } catch (e) {
        log(`⚠️ WebGL FP failed: ${e.message}`, 'warn');
        return 'NO_WEBGL';
    }
}

async function verifyDeviceFingerprint(roundId = 0) {
    try {
        log(`🔍 جاري التحقق من بصمة الجهاز للجولة ${roundId}...`);
        
        const fpHash = await generateDeviceFingerprint();
        if (!fpHash) {
            log('❌ فشل توليد بصمة الجهاز', 'error');
            return false;
        }
        
        const stableDeviceId = appState.deviceFingerprint?.stableDeviceId || '';
        
        // إرسال البصمة للسيرفر للتحقق - خاص بالجولة المحددة
        const response = await fetchApi('/api/rewards/fingerprint-check', 'POST', {
            userTelegramId: String(userData.id),
            username: userData.username,
            fingerprint: fpHash,
            stableDeviceId: stableDeviceId,
            roundId: roundId > 0 ? roundId : 0,
            user_agent: navigator.userAgent
        });
        
        if (!response.success) {
            log(`❌ استدعاء API فشل: ${response.error}`, 'error');
            return false;
        }
        
        if (!response.allowed) {
            const reason = response.details || response.reason || 'جهازك محظور';
            log(`❌ الجهاز مرفوق: ${reason}`, 'error');
            // Store reason for display
            appState.blockReason = reason;
            return false;
        }
        
        if (response.duplicate) {
            log('⚠️ تحذير: هذا الجهاز قد استُخدم سابقاً في جولة أخرى', 'warn');
        } else {
            log(`✅ بصمة الجهاز معتمدة للجولة ${roundId}`, 'success');
        }
        
        appState.fingerprintVerified = true;
        return true;
    } catch (error) {
        log(`❌ خطأ في التحقق من الجهاز: ${error.message}`, 'error');
        appState.blockReason = error.message;
        return false;
    }
}

/* =====================================================
   🤖 CAPTCHA VERIFICATION
   ===================================================== */

async function showCaptchaVerification() {
    try {
        log('🤖 جاري عرض التحقق من الكابتشا...');
        
        // إذا تم التحقق بالفعل، تخطّى
        if (sessionStorage.getItem('captcha_verified')) {
            log('✅ الكابتشا تم التحقق منه بالفعل');
            return;
        }
        
        // عرض modal الكابتشا
        await displayCaptchaModal();
        
        sessionStorage.setItem('captcha_verified', 'true');
        log('✅ تم التحقق من الكابتشا بنجاح');
    } catch (error) {
        log(`⚠️ خطأ في الكابتشا: ${error.message}`, 'warn');
        // لا نرفع الخطأ - الكابتشا اختيارية
    }
}

async function displayCaptchaModal() {
    return new Promise((resolve, reject) => {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); display: flex; align-items: center;
            justify-content: center; z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="
                background: #1a1a1a; padding: 30px; border-radius: 12px;
                text-align: center; color: #fff; max-width: 400px;
            ">
                <h2 style="color: ${CONFIG.PRIMARY_COLOR}">🤖 تحقق أنك لست برنامج</h2>
                <p>يرجى حل اللغز البسيط أدناه:</p>
                <div id="captcha-container" style="margin: 20px 0;"></div>
                <button id="captcha-btn" style="
                    background: ${CONFIG.PRIMARY_COLOR}; color: #000; border: none;
                    padding: 10px 30px; border-radius: 6px; cursor: pointer;
                    font-weight: bold; font-size: 16px;
                ">تحقق</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const btn = modal.querySelector('#captcha-btn');
        btn.addEventListener('click', () => {
            modal.remove();
            resolve();
        });
    });
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

/* =====================================================
   🔒 VERIFICATION SCREENS
   ===================================================== */

function showVerificationScreen() {
    const screen = document.getElementById('verificationScreen');
    if (!screen) {
        const html = `
            <div id="verificationScreen" style="
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: linear-gradient(135deg, #1a1a1a 0%, #0d0f13 100%);
                display: flex; flex-direction: column; align-items: center;
                justify-content: center; z-index: 9999; gap: 30px;
            ">
                <div style="text-align: center;">
                    <div style="font-size: 64px; margin-bottom: 20px; animation: spin 2s linear infinite;">🔍</div>
                    <h1 style="color: #fff; font-size: 24px; margin-bottom: 10px;">جاري التحقق من جهازك</h1>
                    <p style="color: #888; font-size: 14px;">الرجاء الانتظار، نتحقق من آمان الجهاز...</p>
                </div>
                <div style="
                    width: 200px; height: 4px; background: #333;
                    border-radius: 2px; overflow: hidden;
                ">
                    <div style="
                        height: 100%; background: linear-gradient(90deg, #F8B12D, transparent);
                        animation: loading 1.5s ease-in-out infinite;
                    "></div>
                </div>
            </div>
            <style>
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes loading {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(0); }
                    100% { transform: translateX(100%); }
                }
            </style>
        `;
        document.body.insertAdjacentHTML('afterbegin', html);
    }
    const screen2 = document.getElementById('verificationScreen');
    if (screen2) screen2.style.display = 'flex';
}

function hideVerificationScreen() {
    const screen = document.getElementById('verificationScreen');
    if (screen) screen.style.display = 'none';
}

function showBlockedScreen(reason = 'جهازك محظور') {
    // ✅ Remove verification screen completely
    const verificationScreen = document.getElementById('verificationScreen');
    if (verificationScreen) verificationScreen.remove();
    
    const screen = document.getElementById('blockedScreen');
    if (!screen) {
        const html = `
            <div id="blockedScreen" style="
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: linear-gradient(135deg, #1a1a1a 0%, #0d0f13 100%);
                display: flex; flex-direction: column; align-items: center;
                justify-content: center; z-index: 99999; gap: 30px; padding: 20px;
            ">
                <div style="text-align: center;">
                    <div style="font-size: 80px; margin-bottom: 20px;">🚫</div>
                    <h1 style="color: #e74c3c; font-size: 24px; margin-bottom: 15px; font-weight: bold;">حسابك محظور</h1>
                    <p id="blockedReason" style="color: #ff9999; font-size: 16px; line-height: 1.6; max-width: 300px; margin-bottom: 10px; font-weight: 500;"></p>
                </div>
                <div style="
                    background: rgba(231, 76, 60, 0.1); border: 1px solid rgba(231, 76, 60, 0.3);
                    border-radius: 8px; padding: 15px; max-width: 300px; text-align: center;
                ">
                    <p style="color: #bbb; font-size: 12px; margin: 0; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span>ℹ️</span>
                        <span>لا يمكن استخدام جهاز واحد لحسابات متعددة في نفس الجولة</span>
                    </p>
                </div>
                <button onclick="location.reload()" style="
                    background: #F8B12D; color: #000; border: none;
                    padding: 12px 30px; border-radius: 6px; font-weight: bold;
                    font-size: 14px; cursor: pointer;
                ">إعادة المحاولة</button>
            </div>
        `;
        document.body.insertAdjacentHTML('afterbegin', html);
    }
    const screen2 = document.getElementById('blockedScreen');
    if (screen2) {
        screen2.style.display = 'flex';
        const reasonEl = document.getElementById('blockedReason');
        if (reasonEl) {
            reasonEl.textContent = reason;
            console.log('📢 عرض سبب الحجب:', reason);
        }
    }
}

async function getInitialRoundInfo() {
    try {
        log('📋 جاري استخراج معلومات الجولة الأساسية...');
        const response = await fetchApi('/api/rewards/state', 'POST', {
            userTelegramId: String(userData.id || 123456),
            username: userData.username || null,
            fullName: (userData.first_name || '') + ' ' + (userData.last_name || ''),
            photoUrl: userData.photo_url || null,
            inviterCode: appState.inviterCode || null,
            infoOnly: true
        });
        
        if (response.success && response.round) {
            return { round: response.round, blockReason: response.blockReason || null };
        }
        return null;
    } catch (error) {
        log('⚠️ خطأ في استخراج معلومات الجولة: ' + error.message, 'warn');
        return null;
    }
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
        // عرض preview مثل Google Search Preview مع نفس ستايل المهام
        const urlDisplay = prizeLink.replace(/^https?:\/\/(www\.)?/, '').substring(0, 50);
        return `
            <div style="
                background: var(--bg-card);
                border-radius: 12px;
                overflow: hidden;
                border: 1px solid rgba(102, 126, 234, 0.3);
                margin-top: 0;
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
                        🎨 ${prizeValue || 'NFT Collectible'}
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
                margin-top: 0;
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

    // استخراج بارامتر البداية الذي يحتوي على كود الإحالة
    // ✅ النقطة الحرجة: محاولة استخراج من عدة مصادر، وحفظ في localStorage للاستخدام في جلسات لاحقة
    let startParam = telegramWebApp?.initDataUnsafe?.start_param || 
                    new URL(window.location.href).searchParams.get('start') || 
                    new URL(window.location.href).searchParams.get('tgWebAppStartParam');
    
    // ✅ إذا لم نجد في URL، حاول استرجاع من localStorage
    if (!startParam) {
        startParam = localStorage.getItem('lastReferralCode');
        if (startParam) {
            log(`📍 استخدام كود إحالة محفوظ: ${startParam}`);
        }
    }
    
    log(`🔍 مصادر بارامتر البداية:`);
    log(`  - initDataUnsafe.start_param: ${telegramWebApp?.initDataUnsafe?.start_param}`);
    log(`  - URL ?start: ${new URL(window.location.href).searchParams.get('start')}`);
    log(`  - URL ?tgWebAppStartParam: ${new URL(window.location.href).searchParams.get('tgWebAppStartParam')}`);
    log(`  - localStorage: ${localStorage.getItem('lastReferralCode')}`);
    log(`  - النتيجة النهائية: ${startParam}`);
    
    if (startParam) {
        appState.inviterCode = startParam;
        // ✅ حفظ الكود في localStorage للاستخدام في جلسات لاحقة
        localStorage.setItem('lastReferralCode', startParam);
        log(`📞 الإحالة المكتشفة والمحفوظة: ${startParam}`);
    } else {
        log(`⚠️ لم يتم العثور على كود إحالة`);
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
            // ✅ بدلاً من عرض "لا توجد جولات نشطة"، عرض الجولات الماضية
            appState.currentRound = null;  // مسح الجولة الحالية
            appState.roundHistory = response.history || [];
            appState.currentTasks = [];
            appState.userProgress = {};
            showSection('endedRoundState');
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
            await renderActiveRound();
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

async function renderActiveRound() {
    const round = appState.currentRound;
    if (!round) return;

    // تحديث حالة الجولة
    const roundStatusText = document.getElementById('roundStatusText');
    if (roundStatusText) {
        const status = round.status === 'active' ? '🟢 جولة نشطة' : '🟡 موقوفة مؤقتاً';
        roundStatusText.textContent = status;
    }

    // إخفاء الجزء العلوي من الجائزة - نعرض فقط gift preview
    const prizeText = document.getElementById('prizeText');
    const prizeMeta = document.getElementById('prizeMeta');
    
    if (prizeText) {
        prizeText.style.display = 'none';
    }
    if (prizeMeta) {
        prizeMeta.style.display = 'none';
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
        prizeMeta.innerHTML = '';
    }

    // تحديث التقدم
    const progressPercent = targetParticipants > 0 ? Math.round((currentParticipants / targetParticipants) * 100) : 0;
    const progressFill = document.getElementById('progressFill');
    const progressPercentEl = document.getElementById('progressPercent');
    const participantsCountEl = document.getElementById('participantsCount');

    if (progressFill) {
        progressFill.style.width = progressPercent + '%';
    }
    if (progressPercentEl) {
        progressPercentEl.textContent = progressPercent + '%';
    }
    if (participantsCountEl) {
        participantsCountEl.textContent = `${currentParticipants} / ${targetParticipants}`;
    }

    // رسم المهام
    renderTasks();

    await renderReferrals();
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
            
            // جلب معلومات القناة الحقيقية من Telegram
            let channelTitle = task.channelTitle || task.channelUsername || 'قناة';
            const channelUsername = task.channelUsername;
            
            try {
                const channelInfo = await fetchChannelInfo(channelUsername);
                if (channelInfo && channelInfo.title) {
                    channelTitle = channelInfo.title;
                }
            } catch (error) {
                log(`⚠️ Could not fetch channel info for ${channelUsername}: ${error.message}`);
            }
            
            // استخدام createChannelPhotoHTML لجلب صورة القناة من Telegram مباشرة
            const channelPhotoHTML = createChannelPhotoHTML(channelUsername, '📢', '56px');
            
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

async function renderReferrals() {
    const progress = appState.userProgress || {};
    const requiredReferrals = appState.currentRound?.requiredReferrals || 0;
    const countedReferrals = progress.countedReferrals || 0;
    const currentRoundId = appState.currentRound?.id || 0;

    const referralCount = document.getElementById('referralCount');
    if (referralCount) {
        referralCount.textContent = `${countedReferrals} / ${requiredReferrals}`;
    }

    const userStatus = document.getElementById('userStatus');
    if (userStatus) {
        if (requiredReferrals > 0 && countedReferrals >= requiredReferrals) {
            userStatus.textContent = 'مؤهل للسحب';
            userStatus.style.color = 'var(--success-color)';
        } else {
            const remaining = Math.max(0, requiredReferrals - countedReferrals);
            userStatus.innerHTML = `<span>${getSvgIcon('target', 18)} ${remaining} متبقي</span>`;
            userStatus.style.color = 'var(--warning-color)';
        }
    }

    try {
        let referralUrl = null;

        if (appState.cachedReferralRoundId === currentRoundId && appState.cachedReferralLink) {
            referralUrl = appState.cachedReferralLink;
            log(`📢 استعمال رابط مخزن للجولة ${currentRoundId}`);
        } else {
            const referralResponse = await fetchApi('/api/rewards/generate-referral', 'POST', {
                userTelegramId: String(userData.id),
                username: userData.username || null,
                roundId: currentRoundId
            });

            if (referralResponse.success) {
                referralUrl = referralResponse.referralUrl;
                appState.cachedReferralLink = referralUrl;
                appState.cachedReferralRoundId = currentRoundId;
                log(`📢 رابط جديد: ${referralResponse.referralCode}`);
            }
        }

        const referralLink = document.getElementById('referralLink');
        if (referralLink && referralUrl) {
            referralLink.value = referralUrl;
        }
    } catch (error) {
        log('⚠️ خطأ في الحصول على رابط الإحالة: ' + error.message);
    }

    const requiredTasksCount = document.getElementById('requiredTasksCount');
    if (requiredTasksCount) {
        const requiredTasks = appState.currentRound?.requiredTasks || 0;
        requiredTasksCount.textContent = requiredTasks;
    }
}

function renderEndedRound() {
    const endedRoundState = document.getElementById('endedRoundState');
    if (!endedRoundState) return;

    // ✅ إذا كانت هناك جولة منتهية حالياً
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
    } else {
        // ✅ إذا كانت نهاية جولة أو لا توجد جولة نشطة - إخفاء بطاقة الفائز
        const winnerCard = document.getElementById('winnerCard');
        if (winnerCard) {
            winnerCard.style.display = 'none';
        }
    }

    // ✅ رسم السجل السابق (الجولات الماضية)
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

    // ✅ Filter: Only show ended rounds with winners (exclude cancelled/empty rounds)
    const endedRounds = appState.roundHistory.filter(item => 
        item.winner_user_id && String(item.winner_user_id).trim() !== ''
    );

    historyContainer.innerHTML = '';
    
    if (endedRounds.length === 0) {
        historyContainer.innerHTML = `<p style="color: var(--text-tertiary); text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px;"><span>${getSvgIcon('refresh', 20)}</span> لا توجد سحوبات منتهية بعد</p>`;
        return;
    }
    
    endedRounds.forEach((item, index) => {
        const historyEl = document.createElement('div');
        historyEl.className = 'history-item';
        historyEl.style.cursor = 'pointer';
        
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
                <div class="history-round">رقم السحب #${item.round_id}</div>
                <div class="history-name">${item.winner_full_name || item.winner_username || 'مستخدم'}</div>
                <div class="history-prize">${item.prize_value || 'جائزة'}</div>
            </div>
        `;
        
        // إضافة معالج نقر لعرض تفاصيل الفائز
        historyEl.addEventListener('click', () => {
            showWinnerDetails(item);
        });
        
        historyContainer.appendChild(historyEl);
    });
}

/* =====================================================
   ✔️ TASK VERIFICATION
   ===================================================== */

async function verifyTask(taskId, channelUsername, skipSubscriptionCheck = false) {
    try {
        log(`🔍 التحقق من المهمة: ${taskId}`);
        
        if (!skipSubscriptionCheck) {
            const subscriptionCheck = await checkChannelSubscription(channelUsername);
            
            if (!subscriptionCheck.isSubscribed) {
                showChannelModal(channelUsername, taskId);
                return;
            }
            log(`✅ مبچهر بالفعل في ${channelUsername}`);
        }
        
        const response = await fetchApi('/api/rewards/tasks/verify', 'POST', {
            userTelegramId: String(userData.id),
            username: userData.username || null,
            fullName: (userData.first_name || '') + ' ' + (userData.last_name || ''),
            photoUrl: userData.photo_url || null,
            taskId: taskId,
            roundId: appState.currentRound?.id,
            channelUsername: channelUsername
        });

        if (response.success && response.verified) {
            showAlert('تم التحقق من المهمة بنجاح!');
            appState.completedTaskIds.push(taskId);
            renderTasks();
            await renderReferrals();
            
            // تحديث رابط الإحالة الفريد
            updateReferralCode();
            
            if (response.roundFinished) {
                showAlert('🎉 اكتملت الجولة!');
                await loadData();
            }
        } else if (response.error === 'channel_membership_required' || response.error === 'NOT_SUBSCRIBED') {
            if (skipSubscriptionCheck) {
                showError('❌ لم يتم التعرف على الاشتراك بعد. يرجى الانتظار قليلاً ومحاولة التحقق مجدداً');
            } else {
                showChannelModal(channelUsername, taskId);
            }
        } else {
            showError('❌ فشل التحقق: ' + (response.error || 'يرجى التأكد من الاشتراك في القناة'));
        }
    } catch (error) {
        showError('❌ خطأ في التحقق: ' + error.message);
        log('verifyTask error:', error);
    }
}

// التحقق من الاشتراك في القناة
async function checkChannelSubscription(channelUsername) {
    try {
        const response = await fetchApi('/api/mini-app/check-subscription', 'POST', {
            userTelegramId: String(userData.id),
            channelUsername: channelUsername
        });
        return response;
    } catch (error) {
        log('Subscription check error:', error);
        return { isSubscribed: false };
    }
}

// عرض تفاصيل الفائز
function showWinnerDetails(winner) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
            <div class="modal-header">
                <img src="${winner.winner_photo_url || getChannelAvatarUrl(winner.winner_full_name || 'الفائز')}" 
                     class="modal-avatar" 
                     alt="Winner"
                     onerror="this.src='${getChannelAvatarUrl(winner.winner_full_name || 'الفائز')}'">
                <h2>الفائز - رقم السحب #${winner.round_id}</h2>
            </div>
            <div class="modal-body">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h3 style="margin: 10px 0; color: var(--text-primary);">${winner.winner_full_name || 'الفائز'}</h3>
                    <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">@${winner.winner_username || 'twitter'}</p>
                </div>
                <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <p style="font-size: 12px; color: var(--text-tertiary); margin: 0 0 8px 0;">الجائزة</p>
                    <p style="font-size: 18px; font-weight: 600; color: var(--success-color); margin: 0;">${winner.prize_value || 'جائزة'}</p>
                </div>
                ${winner.prize_link ? `
                    <button class="btn btn-primary" onclick="window.open('${winner.prize_link}', '_blank')">
                        <i class="fas fa-external-link-alt"></i> الحصول على الجائزة
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// عرض مودال الاشتراك في القناة
function showChannelModal(channelUsername, taskId) {
    const modal = document.getElementById('channelModal');
    const title = document.getElementById('channelModalTitle');
    const desc = document.getElementById('channelModalDesc');
    const avatar = document.getElementById('channelModalAvatar');
    
    if (!modal) return;
    
    title.textContent = `اشترك في القناة`;
    desc.textContent = `يجب عليك الاشتراك في هذه القناة أولاً للتحقق من المهمة`;
    avatar.innerHTML = '📢';
    
    document.getElementById('subscribeChannelBtn').onclick = () => {
        const cleanUsername = String(channelUsername || '').trim().replace('@', '');
        const url = `https://t.me/${cleanUsername}`;
        window.open(url, '_blank');
    };
    
    document.getElementById('verifyChannelBtn').onclick = async () => {
        modal.classList.add('hidden');
        await new Promise(r => setTimeout(r, 500));
        await verifyTask(taskId, channelUsername, true);
    };
    
    document.getElementById('closeChannelModal').onclick = () => {
        modal.classList.add('hidden');
    };
    
    modal.classList.remove('hidden');
}

// إغلاق المودال عند النقر خارجها
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('channelModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }
});

// تحديث رابط الإحالة الفريد
function updateReferralCode() {
    const roundId = appState.currentRound?.id || 'default';
    const referralCode = `${userData.username || userData.id}_${roundId}_${Date.now()}`;
    
    const referralLink = document.getElementById('referralLink');
    if (referralLink) {
        const botUsername = 'PandaStores_bot';
        referralLink.value = `https://t.me/${botUsername}?start=${referralCode}`;
    }
}

// توليد معرف عشوائي
function randomId() {
    return Math.random().toString(36).substring(2, 11);
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

// Auto-refresh completely disabled
// document.addEventListener('visibilitychange', () => {
//     if (document.hidden) {
//         stopAutoRefresh();
//     } else {
//         startAutoRefresh();
//     }
// });
