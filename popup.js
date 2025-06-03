// popup.js - Popup页面控制脚本

// DOM元素
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const toggleBtn = document.getElementById('toggleBtn');
const btnText = document.getElementById('btnText');
const loading = document.getElementById('loading');
const requestCount = document.getElementById('requestCount');
const responseCount = document.getElementById('responseCount');
const workStatus = document.getElementById('workStatus');
const refreshNotice = document.getElementById('refreshNotice');

// 状态管理
let isEnabled = true;
let currentTab = null;

// 初始化
async function init() {
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    
    // 从存储中获取状态
    const result = await chrome.storage.local.get(['isEnabled', 'interceptStats']);
    if (result.isEnabled !== undefined) {
        isEnabled = result.isEnabled;
    }
    
    // 更新UI
    updateUI();
    
    // 如果是B站直播页面，获取统计数据
    if (currentTab && currentTab.url && currentTab.url.includes('link.bilibili.com')) {
        // 发送消息获取当前页面的统计数据
        chrome.tabs.sendMessage(currentTab.id, { type: 'getStats' }, (response) => {
            if (response && response.stats) {
                updateStats(response.stats);
            }
        });
        
        // 设置定时更新统计数据
        setInterval(() => {
            chrome.tabs.sendMessage(currentTab.id, { type: 'getStats' }, (response) => {
                if (response && response.stats) {
                    updateStats(response.stats);
                }
            });
        }, 1000);
    }
}

// 更新UI状态
function updateUI() {
    if (isEnabled) {
        statusDot.classList.remove('disabled');
        statusText.classList.remove('disabled');
        statusText.textContent = '终极拦截已激活';
        toggleBtn.classList.remove('disabled');
        btnText.textContent = '禁用拦截';
        workStatus.textContent = '运行中';
    } else {
        statusDot.classList.add('disabled');
        statusText.classList.add('disabled');
        statusText.textContent = '拦截已禁用';
        toggleBtn.classList.add('disabled');
        btnText.textContent = '启用拦截';
        workStatus.textContent = '已停止';
    }
}

// 更新统计数据
function updateStats(stats) {
    requestCount.textContent = stats.requestCount || 0;
    responseCount.textContent = stats.responseCount || 0;
}

// 切换按钮点击事件
toggleBtn.addEventListener('click', async () => {
    // 显示加载状态
    btnText.style.display = 'none';
    loading.style.display = 'inline-block';
    toggleBtn.disabled = true;
    
    // 切换状态
    isEnabled = !isEnabled;
    
    // 保存状态到存储
    await chrome.storage.local.set({ isEnabled });
    
    // 发送消息到background script
    chrome.runtime.sendMessage({ 
        type: 'toggleInterceptor', 
        enabled: isEnabled 
    });
    
    // 如果当前在B站直播页面，发送消息给content script
    if (currentTab && currentTab.url && currentTab.url.includes('link.bilibili.com')) {
        chrome.tabs.sendMessage(currentTab.id, { 
            type: 'toggleInterceptor', 
            enabled: isEnabled 
        });
        
        // 显示刷新提示
        refreshNotice.classList.add('show');
        
        // 延迟后刷新页面
        setTimeout(() => {
            chrome.tabs.reload(currentTab.id);
            // 关闭popup
            window.close();
        }, 1500);
    } else {
        // 不在B站页面，直接更新UI
        setTimeout(() => {
            btnText.style.display = 'inline';
            loading.style.display = 'none';
            toggleBtn.disabled = false;
            updateUI();
        }, 500);
    }
});

// 监听来自background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'statsUpdate') {
        updateStats(request.stats);
    }
});

// 初始化
init();