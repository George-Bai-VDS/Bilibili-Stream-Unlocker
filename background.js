// ========== 2. 增强版 background.js (Service Worker) ==========
// 使用 declarativeNetRequest API 进行网络层拦截

console.log('🚀 B站直播助手 Service Worker 启动');

// 动态规则ID
const RULE_ID_REQUEST = 1;
const RULE_ID_RESPONSE = 2;

// 初始化状态
let isEnabled = true;

// 初始化存储
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ isEnabled: true });
    updateRules(true);
});

// 更新规则函数
async function updateRules(enabled) {
    if (enabled) {
        // 设置拦截规则
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [RULE_ID_REQUEST],
            addRules: [
                {
                    id: RULE_ID_REQUEST,
                    priority: 1,
                    action: {
                        type: 'modifyHeaders',
                        requestHeaders: [{
                            header: 'X-Platform-Override',
                            operation: 'set',
                            value: 'pc_link'
                        }]
                    },
                    condition: {
                        urlFilter: '*://api.live.bilibili.com/*startLive*',
                        resourceTypes: ['xmlhttprequest', 'other']
                    }
                }
            ]
        });
        console.log('✅ 网络拦截规则已启用');
    } else {
        // 移除规则
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [RULE_ID_REQUEST],
            addRules: []
        });
        console.log('❌ 网络拦截规则已禁用');
    }
}

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'toggleInterceptor') {
        isEnabled = request.enabled;
        updateRules(isEnabled);
    } else if (request.type === 'interceptLog') {
        console.log('📊 拦截统计:', request.data);
    }
});

// 监听网络请求（用于日志记录）
chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        if (isEnabled && details.method === 'POST' && details.url.includes('startLive')) {
            console.log('🎯 检测到开播请求:', details);
            
            // 尝试解析请求体
            if (details.requestBody) {
                console.log('📦 请求体:', details.requestBody);
            }
        }
    },
    {
        urls: ['*://api.live.bilibili.com/*'],
        types: ['xmlhttprequest', 'other']
    },
    ['requestBody']
);