// ========== 1. 增强版 content.js ==========
// 采用多层防护，确保百分百拦截请求和响应

console.log('🎬 B站直播助手启动 - 终极拦截模式');

if (window.location.hostname.includes('link.bilibili.com')) {
    // 1. 尽早注入拦截脚本
    const script = document.createElement('script');
    script.textContent = `
        (function() {
            console.log('🔧 B站直播终极拦截器已注入');
            
            // ===== 核心拦截逻辑 =====
            const interceptConfig = {
                targetUrls: ['startLive', 'start-live', 'start_live'],
                permissionUrl: 'GetWebLivePermission',
                targetPlatform: 'pc_link',
                interceptCount: 0,
                responseInterceptCount: 0
            };
            
            // 深度对象修改函数
            function deepModifyPlatform(obj) {
                if (!obj || typeof obj !== 'object') return obj;
                
                // 递归遍历所有属性
                for (let key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        if (key === 'platform' && obj[key] !== 'pc_link') {
                            console.log('🔄 修改platform:', obj[key], '->', 'pc_link');
                            obj[key] = 'pc_link';
                            interceptConfig.interceptCount++;
                        } else if (typeof obj[key] === 'object') {
                            deepModifyPlatform(obj[key]);
                        }
                    }
                }
                return obj;
            }
            
            // ===== 1. 最底层：代理构造函数 =====
            // 拦截所有可能的HTTP请求构造函数
            const originalXHR = window.XMLHttpRequest;
            const originalFetch = window.fetch;
            const originalRequest = window.Request;
            const originalHeaders = window.Headers;
            
            // 代理 XMLHttpRequest
            window.XMLHttpRequest = new Proxy(originalXHR, {
                construct(target, args) {
                    const xhr = new target(...args);
                    
                    // 保存原始方法
                    const originalOpen = xhr.open;
                    const originalSend = xhr.send;
                    const originalSetRequestHeader = xhr.setRequestHeader;
                    
                    // 用于存储请求信息
                    xhr._requestInfo = {};
                    
                    xhr.open = function(method, url, ...args) {
                        xhr._requestInfo.method = method;
                        xhr._requestInfo.url = url;
                        return originalOpen.call(this, method, url, ...args);
                    };
                    
                    xhr.setRequestHeader = function(name, value) {
                        xhr._requestInfo.headers = xhr._requestInfo.headers || {};
                        xhr._requestInfo.headers[name] = value;
                        return originalSetRequestHeader.call(this, name, value);
                    };
                    
                    xhr.send = function(data) {
                        // 拦截POST请求
                        if (xhr._requestInfo.method === 'POST' && xhr._requestInfo.url && 
                            interceptConfig.targetUrls.some(u => xhr._requestInfo.url.includes(u))) {
                            
                            console.log('🎯 XHR拦截到开播请求');
                            
                            // 处理各种数据格式
                            if (typeof data === 'string') {
                                try {
                                    // 尝试作为JSON解析
                                    let jsonData = JSON.parse(data);
                                    jsonData = deepModifyPlatform(jsonData);
                                    data = JSON.stringify(jsonData);
                                } catch (e) {
                                    // 作为URL参数处理
                                    const params = new URLSearchParams(data);
                                    if (params.has('platform')) {
                                        params.set('platform', 'pc_link');
                                        data = params.toString();
                                    }
                                }
                            } else if (data instanceof FormData) {
                                if (data.has('platform')) {
                                    data.set('platform', 'pc_link');
                                }
                            } else if (data && typeof data === 'object') {
                                data = deepModifyPlatform(data);
                            }
                        }
                        
                        // 为响应拦截做准备
                        if (xhr._requestInfo.url && xhr._requestInfo.url.includes(interceptConfig.permissionUrl)) {
                            console.log('🔍 检测到权限请求:', xhr._requestInfo.url);
                            
                            // 监听响应
                            const originalListener = xhr.onreadystatechange;
                            xhr.onreadystatechange = function() {
                                if (xhr.readyState === 4 && xhr.status === 200) {
                                    try {
                                        // 尝试解析并修改响应
                                        let responseData = JSON.parse(xhr.responseText);
                                        console.log('📥 原始权限响应:', responseData);
                                        
                                        if (responseData.data) {
                                            responseData.data.allow_live = true;
                                            responseData.data.fans_threshold = 0;
                                            interceptConfig.responseInterceptCount++;
                                            
                                            // 重写响应
                                            Object.defineProperty(xhr, 'responseText', {
                                                value: JSON.stringify(responseData)
                                            });
                                            Object.defineProperty(xhr, 'response', {
                                                value: JSON.stringify(responseData)
                                            });
                                            
                                            console.log('✅ 权限响应已修改:', responseData);
                                        }
                                    } catch (e) {
                                        console.error('❌ 修改响应失败:', e);
                                    }
                                }
                                
                                if (originalListener) {
                                    originalListener.call(this);
                                }
                            };
                        }
                        
                        return originalSend.call(this, data);
                    };
                    
                    return xhr;
                }
            });
            
            // 代理 fetch - 包含响应拦截
            window.fetch = new Proxy(originalFetch, {
                apply(target, thisArg, args) {
                    let [input, init = {}] = args;
                    
                    // 检查URL
                    const url = typeof input === 'string' ? input : input.url;
                    
                    // 拦截POST请求
                    if (init.method === 'POST' && interceptConfig.targetUrls.some(u => url.includes(u))) {
                        console.log('🎯 Fetch拦截到开播请求');
                        
                        // 处理body
                        if (init.body) {
                            if (typeof init.body === 'string') {
                                try {
                                    let jsonData = JSON.parse(init.body);
                                    jsonData = deepModifyPlatform(jsonData);
                                    init.body = JSON.stringify(jsonData);
                                } catch (e) {
                                    const params = new URLSearchParams(init.body);
                                    if (params.has('platform')) {
                                        params.set('platform', 'pc_link');
                                        init.body = params.toString();
                                    }
                                }
                            } else if (init.body instanceof FormData) {
                                if (init.body.has('platform')) {
                                    init.body.set('platform', 'pc_link');
                                }
                            } else if (init.body instanceof URLSearchParams) {
                                if (init.body.has('platform')) {
                                    init.body.set('platform', 'pc_link');
                                }
                            }
                        }
                    }
                    
                    // 执行原始fetch并拦截响应
                    const promise = target.apply(thisArg, [input, init]);
                    
                    // 如果是权限请求，拦截响应
                    if (url.includes(interceptConfig.permissionUrl)) {
                        console.log('🔍 Fetch检测到权限请求:', url);
                        
                        return promise.then(response => {
                            // 克隆响应以便修改
                            const clonedResponse = response.clone();
                            
                            return clonedResponse.json().then(data => {
                                console.log('📥 原始权限响应:', data);
                                
                                if (data.data) {
                                    data.data.allow_live = true;
                                    data.data.fans_threshold = 0;
                                    interceptConfig.responseInterceptCount++;
                                    console.log('✅ 权限响应已修改:', data);
                                }
                                
                                // 创建新的响应
                                const modifiedResponse = new Response(JSON.stringify(data), {
                                    status: response.status,
                                    statusText: response.statusText,
                                    headers: response.headers
                                });
                                
                                // 复制原响应的属性
                                Object.defineProperties(modifiedResponse, {
                                    url: { value: response.url },
                                    redirected: { value: response.redirected },
                                    type: { value: response.type },
                                    ok: { value: response.ok }
                                });
                                
                                return modifiedResponse;
                            }).catch(() => {
                                // 如果不是JSON响应，返回原始响应
                                return response;
                            });
                        });
                    }
                    
                    return promise;
                }
            });
            
            // ===== 2. 拦截第三方库 =====
            // 监控全局对象的变化
            const libraryInterceptor = {
                axios: false,
                jquery: false
            };
            
            // 使用 Object.defineProperty 监控库的加载
            Object.defineProperty(window, 'axios', {
                get() {
                    return this._axios;
                },
                set(value) {
                    console.log('🔍 检测到axios加载');
                    this._axios = value;
                    
                    if (value && value.interceptors && !libraryInterceptor.axios) {
                        libraryInterceptor.axios = true;
                        
                        // 添加请求拦截器
                        value.interceptors.request.use(config => {
                            if (config.method === 'post' && config.url && 
                                interceptConfig.targetUrls.some(u => config.url.includes(u))) {
                                console.log('🎯 Axios拦截到开播请求');
                                config.data = deepModifyPlatform(config.data);
                            }
                            return config;
                        });
                        
                        // 添加响应拦截器
                        value.interceptors.response.use(response => {
                            if (response.config.url && response.config.url.includes(interceptConfig.permissionUrl)) {
                                console.log('🎯 Axios拦截到权限响应');
                                if (response.data && response.data.data) {
                                    response.data.data.allow_live = true;
                                    response.data.data.fans_threshold = 0;
                                    interceptConfig.responseInterceptCount++;
                                }
                            }
                            return response;
                        });
                    }
                }
            });
            
            // jQuery拦截
            Object.defineProperty(window, '$', {
                get() {
                    return this._$;
                },
                set(value) {
                    console.log('🔍 检测到jQuery加载');
                    this._$ = value;
                    
                    if (value && value.ajax && !libraryInterceptor.jquery) {
                        libraryInterceptor.jquery = true;
                        
                        const originalAjax = value.ajax;
                        value.ajax = function(options) {
                            // 请求拦截
                            if (options.type === 'POST' && options.url && 
                                interceptConfig.targetUrls.some(u => options.url.includes(u))) {
                                console.log('🎯 jQuery拦截到开播请求');
                                
                                if (typeof options.data === 'string') {
                                    try {
                                        let jsonData = JSON.parse(options.data);
                                        jsonData = deepModifyPlatform(jsonData);
                                        options.data = JSON.stringify(jsonData);
                                    } catch (e) {
                                        const params = new URLSearchParams(options.data);
                                        if (params.has('platform')) {
                                            params.set('platform', 'pc_link');
                                            options.data = params.toString();
                                        }
                                    }
                                } else if (options.data) {
                                    options.data = deepModifyPlatform(options.data);
                                }
                            }
                            
                            // 响应拦截
                            if (options.url && options.url.includes(interceptConfig.permissionUrl)) {
                                const originalSuccess = options.success;
                                options.success = function(data, textStatus, jqXHR) {
                                    console.log('🎯 jQuery拦截到权限响应');
                                    if (data && data.data) {
                                        data.data.allow_live = true;
                                        data.data.fans_threshold = 0;
                                        interceptConfig.responseInterceptCount++;
                                    }
                                    if (originalSuccess) {
                                        originalSuccess.call(this, data, textStatus, jqXHR);
                                    }
                                };
                            }
                            
                            return originalAjax.call(this, options);
                        };
                    }
                }
            });
            
            // ===== 3. WebSocket拦截（如果B站使用WebSocket） =====
            const originalWebSocket = window.WebSocket;
            window.WebSocket = new Proxy(originalWebSocket, {
                construct(target, args) {
                    const ws = new target(...args);
                    
                    // 保存原始send方法
                    const originalSend = ws.send;
                    
                    ws.send = function(data) {
                        // 检查是否是开播相关的WebSocket消息
                        if (typeof data === 'string' && data.includes('platform')) {
                            try {
                                let jsonData = JSON.parse(data);
                                jsonData = deepModifyPlatform(jsonData);
                                data = JSON.stringify(jsonData);
                                console.log('🎯 WebSocket拦截到platform参数');
                            } catch (e) {}
                        }
                        return originalSend.call(this, data);
                    };
                    
                    return ws;
                }
            });
            
            // ===== 4. MutationObserver监控DOM变化 =====
            // 监控动态加载的脚本和iframe
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.tagName === 'SCRIPT') {
                            // 监控新加载的脚本
                            console.log('🔍 检测到新脚本加载:', node.src || '内联脚本');
                        } else if (node.tagName === 'IFRAME') {
                            // 尝试注入到iframe中
                            try {
                                if (node.contentWindow) {
                                    injectToFrame(node.contentWindow);
                                }
                            } catch (e) {
                                console.log('⚠️ 无法访问iframe:', e);
                            }
                        }
                    });
                });
            });
            
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
            
            // ===== 5. 定时检查和修复 =====
            setInterval(() => {
                // 重新检查并修复可能被覆盖的方法
                if (window.XMLHttpRequest !== XMLHttpRequest) {
                    console.log('⚠️ XMLHttpRequest被覆盖，重新注入');
                    window.XMLHttpRequest = XMLHttpRequest;
                }
                
                if (window.fetch !== fetch) {
                    console.log('⚠️ fetch被覆盖，重新注入');
                    window.fetch = fetch;
                }
                
                // 检查第三方库
                if (window.axios && !libraryInterceptor.axios) {
                    console.log('🔍 发现新的axios实例');
                    // 触发setter重新拦截
                    window.axios = window.axios;
                }
            }, 2000);
            
            // ===== 6. 状态显示UI =====
            function createStatusUI() {
                const ui = document.createElement('div');
                
                // 更新计数器
                setInterval(() => {
                    const counter = document.getElementById('intercept-count');
                    const responseCounter = document.getElementById('response-intercept-count');
                    if (counter) {
                        counter.textContent = interceptConfig.interceptCount;
                    }
                    if (responseCounter) {
                        responseCounter.textContent = interceptConfig.responseInterceptCount;
                    }
                }, 1000);
            }
            
            // 等待DOM加载完成
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', createStatusUI);
            } else {
                createStatusUI();
            }
            
            console.log('✅ 终极拦截器初始化完成 - 支持响应拦截');
        })();
    `;
    
    // 确保最早执行
    if (document.documentElement) {
        document.documentElement.appendChild(script);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.documentElement.appendChild(script);
        });
    }
    script.remove();
}

// ========== 2. 增强版 background.js (Service Worker) ==========
// 使用 declarativeNetRequest API 进行网络层拦截

console.log('🚀 B站直播助手 Service Worker 启动');

// 动态规则ID
const RULE_ID_REQUEST = 1;
const RULE_ID_RESPONSE = 2;

// 设置拦截规则
chrome.runtime.onInstalled.addListener(() => {
    // 使用 declarativeNetRequest 设置规则
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [RULE_ID_REQUEST, RULE_ID_RESPONSE],
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
    
    console.log('✅ 网络拦截规则已设置');
});

// 监听网络请求（用于日志记录和响应修改）
chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        if (details.method === 'POST' && details.url.includes('startLive')) {
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

// 添加消息监听器，用于和content script通信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'interceptLog') {
        console.log('📊 拦截统计:', request.data);
    }
});