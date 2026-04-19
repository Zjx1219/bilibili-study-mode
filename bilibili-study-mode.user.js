// ==UserScript==
// @name         B站沉浸式学习模式
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  自定义B站首页，展示学习视频收藏，支持马卡龙配色、自定义背景、学习督促模式
// @author       Zjx1219
// @match        https://www.bilibili.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Zjx1219/bili-study-mode/main/bilibili-study-mode.user.js
// @downloadURL  https://raw.githubusercontent.com/Zjx1219/bili-study-mode/main/bilibili-study-mode.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 配置 ====================
    const CONFIG = {
        storageKey: 'bilibili_study_mode',
        bgStorageKey: 'bilibili_study_mode_bg',
        defaultCover: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect fill="%23FFB6C1" width="16" height="9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="2">B站学习</text></svg>',
        defaultBg: 'linear-gradient(135deg, #FFE5EC 0%, #E5F0FF 50%, #FFF0E5 100%)'
    };

    // ==================== 存储管理 ====================
    const Storage = {
        getData() {
            try {
                const data = localStorage.getItem(CONFIG.storageKey);
                return data ? JSON.parse(data) : { videos: [], settings: { enabled: true, sortBy: 'addedAt' } };
            } catch {
                return { videos: [], settings: { enabled: true, sortBy: 'addedAt' } };
            }
        },

        saveData(data) {
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
        },

        getVideos() {
            return this.getData().videos;
        },

        addVideo(bv, title = '', tags = []) {
            const data = this.getData();
            if (data.videos.some(v => v.bv === bv)) {
                return false;
            }
            data.videos.push({
                bv,
                title: title || `视频 ${bv}`,
                tags,
                addedAt: Date.now()
            });
            this.saveData(data);
            return true;
        },

        removeVideo(bv) {
            const data = this.getData();
            data.videos = data.videos.filter(v => v.bv !== bv);
            this.saveData(data);
        },

        updateVideo(bv, updates) {
            const data = this.getData();
            const video = data.videos.find(v => v.bv === bv);
            if (video) {
                Object.assign(video, updates);
                this.saveData(data);
            }
        },

        getSetting(key) {
            return this.getData().settings[key];
        },

        setSetting(key, value) {
            const data = this.getData();
            data.settings[key] = value;
            this.saveData(data);
        },

        getBackground() {
            return localStorage.getItem(CONFIG.bgStorageKey) || CONFIG.defaultBg;
        },

        setBackground(bg) {
            try {
                localStorage.setItem(CONFIG.bgStorageKey, bg);
                return true;
            } catch (e) {
                console.error('存储背景失败:', e);
                return false;
            }
        },

        clearBackground() {
            localStorage.removeItem(CONFIG.bgStorageKey);
        }
    };

    // ==================== 工具函数 ====================
    function getBVFromUrl(url) {
        const match = url.match(/BV\w+/);
        return match ? match[0] : null;
    }

    function getVideoPageUrl(bv) {
        return `https://www.bilibili.com/video/${bv}`;
    }

    async function fetchVideoInfo(bv) {
        try {
            const response = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bv}`);
            const data = await response.json();
            if (data.code === 0 && data.data) {
                return {
                    title: data.data.title,
                    cover: data.data.pic,
                    duration: data.data.duration,
                    author: data.data.owner.name
                };
            }
        } catch (e) {
            console.error('获取视频信息失败:', e);
        }
        return null;
    }

    // ==================== UI 组件 ====================
    const Style = `
        .bsm-container {
            font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, sans-serif;
            position: relative;
            min-height: 100vh;
            background: #FFE5EC;
            color: #5a5a6e;
            padding: 40px 50px;
        }

        .bsm-settings-btn {
            position: fixed;
            top: 24px;
            left: 24px;
            width: 52px;
            height: 52px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(12px);
            border: 3px solid rgba(255, 182, 193, 0.4);
            border-radius: 50%;
            cursor: pointer;
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 6px 25px rgba(255, 182, 193, 0.5);
            transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 100;
        }

        .bsm-settings-btn:hover {
            transform: rotate(90deg) scale(1.12);
            box-shadow: 0 10px 35px rgba(255, 182, 193, 0.6);
            border-color: #ffb6c1;
        }

        .bsm-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 24px;
            border-bottom: 3px dashed rgba(255, 182, 193, 0.5);
        }

        .bsm-title {
            font-size: 34px;
            font-weight: 800;
            background: linear-gradient(135deg, #ff8fab 0%, #c9b1ff 50%, #a8edea 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            display: flex;
            align-items: center;
            gap: 14px;
            letter-spacing: 2px;
        }

        .bsm-title::before {
            content: '🧁';
        }

        .bsm-controls {
            display: flex;
            gap: 16px;
        }

        .bsm-btn {
            padding: 14px 28px;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 700;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
            letter-spacing: 0.5px;
        }

        .bsm-btn-primary {
            background: linear-gradient(135deg, #ffb6c1 0%, #ffc0cb 50%, #ffd1dc 100%);
            color: #d63384;
        }

        .bsm-btn-primary:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 12px 35px rgba(255, 143, 171, 0.5);
        }

        .bsm-btn-secondary {
            background: linear-gradient(135deg, #e0c3fc 0%, #c9b1ff 100%);
            color: #7c3aed;
        }

        .bsm-btn-secondary:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 12px 35px rgba(201, 177, 255, 0.5);
        }

        .bsm-btn-danger {
            background: linear-gradient(135deg, #ff8a80 0%, #ff5252 100%);
            color: #fff;
        }

        .bsm-btn-danger:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 12px 35px rgba(255, 82, 82, 0.5);
        }

        .bsm-btn-success {
            background: linear-gradient(135deg, #a8edea 0%, #7fdbda 100%);
            color: #059669;
        }

        .bsm-btn-success:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 12px 35px rgba(127, 219, 218, 0.5);
        }

        .bsm-btn-warning {
            background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
            color: #d68910;
        }

        .bsm-btn-warning:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 12px 35px rgba(253, 203, 110, 0.5);
        }

        .bsm-stats {
            display: flex;
            gap: 20px;
            margin-bottom: 24px;
        }

        .bsm-stat {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(12px);
            padding: 18px 36px;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 8px 30px rgba(255, 182, 193, 0.2);
            border: 3px solid rgba(255, 255, 255, 0.9);
        }

        .bsm-stat:first-child {
            border-color: rgba(255, 143, 171, 0.4);
        }

        .bsm-stat:last-child {
            border-color: rgba(168, 237, 234, 0.4);
        }

        .bsm-stat-value {
            font-size: 32px;
            font-weight: 900;
            color: #ff8fab;
        }

        .bsm-stat:last-child .bsm-stat-value {
            color: #7fdbda;
        }

        .bsm-stat-label {
            font-size: 13px;
            color: #999;
            margin-top: 6px;
            font-weight: 600;
        }

        .bsm-filters {
            display: flex;
            gap: 10px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }

        .bsm-filter-tag {
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.85);
            border: 2px solid rgba(224, 195, 252, 0.6);
            border-radius: 22px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            color: #9c7cd8;
            transition: all 0.3s ease;
        }

        .bsm-filter-tag:hover,
        .bsm-filter-tag.active {
            background: linear-gradient(135deg, #e0c3fc 0%, #c9b1ff 100%);
            border-color: transparent;
            color: #7c3aed;
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(201, 177, 255, 0.4);
        }

        .bsm-video-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 28px;
        }

        .bsm-video-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(12px);
            border-radius: 20px;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            position: relative;
            border: 3px solid rgba(255, 255, 255, 0.95);
            box-shadow: 0 8px 30px rgba(255, 182, 193, 0.15);
        }

        .bsm-video-card:nth-child(7n+1) { border-top: 4px solid #ffb6c1; }
        .bsm-video-card:nth-child(7n+2) { border-top: 4px solid #c9b1ff; }
        .bsm-video-card:nth-child(7n+3) { border-top: 4px solid #a8edea; }
        .bsm-video-card:nth-child(7n+4) { border-top: 4px solid #ffeaa7; }
        .bsm-video-card:nth-child(7n+5) { border-top: 4px solid #ffd1dc; }
        .bsm-video-card:nth-child(7n+6) { border-top: 4px solid #b8e0ff; }
        .bsm-video-card:nth-child(7n+7) { border-top: 4px solid #ffe0b2; }

        .bsm-video-card:hover {
            transform: translateY(-10px) scale(1.02);
            box-shadow: 0 20px 50px rgba(255, 143, 171, 0.25);
        }

        .bsm-video-cover {
            position: relative;
            aspect-ratio: 16/10;
            overflow: hidden;
        }

        .bsm-video-cover img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.5s ease;
        }

        .bsm-video-card:hover .bsm-video-cover img {
            transform: scale(1.1);
        }

        .bsm-video-duration {
            position: absolute;
            bottom: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(6px);
            padding: 5px 12px;
            border-radius: 8px;
            font-size: 13px;
            color: #fff;
            font-weight: 600;
        }

        .bsm-video-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(255, 143, 171, 0.92) 0%, rgba(201, 177, 255, 0.92) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .bsm-video-card:hover .bsm-video-overlay {
            opacity: 1;
        }

        .bsm-overlay-btn {
            padding: 12px 24px;
            background: #fff;
            color: #ff8fab;
            border: none;
            border-radius: 22px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 700;
            transition: all 0.25s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
        }

        .bsm-overlay-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }

        .bsm-overlay-btn.delete {
            background: rgba(255, 138, 128, 0.95);
            color: #fff;
        }

        .bsm-overlay-btn.edit {
            background: rgba(168, 237, 234, 0.95);
            color: #059669;
        }

        .bsm-video-overlay-buttons {
            display: flex;
            flex-direction: column;
            gap: 10px;
            align-items: center;
        }

        .bsm-video-overlay-buttons .bsm-overlay-btn {
            width: 120px;
        }

        /* 督促学习弹窗 */
        .bsm-study-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.4s ease;
        }

        .bsm-study-modal.active {
            opacity: 1;
            visibility: visible;
        }

        .bsm-study-modal-content {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 32px;
            padding: 48px 40px;
            width: 90%;
            max-width: 360px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(168, 237, 234, 0.3);
            border: 2px solid rgba(168, 237, 234, 0.5);
            transform: scale(0.9) translateY(20px);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .bsm-study-modal.active .bsm-study-modal-content {
            transform: scale(1) translateY(0);
        }

        .bsm-study-modal-icon {
            font-size: 64px;
            margin-bottom: 24px;
        }

        .bsm-study-modal-text {
            font-size: 17px;
            color: #6b7b8a;
            margin-bottom: 32px;
            line-height: 1.8;
            font-weight: 500;
        }

        .bsm-study-btn {
            padding: 16px 36px;
            border: none;
            border-radius: 30px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 700;
            transition: all 0.3s ease;
            letter-spacing: 1px;
        }

        .bsm-study-btn-primary {
            background: linear-gradient(135deg, #a8edea 0%, #c9b1ff 100%);
            color: #5a5a7a;
            box-shadow: 0 8px 30px rgba(168, 237, 234, 0.4);
        }

        .bsm-study-btn-primary:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 40px rgba(168, 237, 234, 0.5);
        }

        .bsm-video-info {
            padding: 20px;
        }

        .bsm-video-title {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 10px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            line-height: 1.5;
            color: #4a4a5e;
        }

        .bsm-video-meta {
            display: flex;
            gap: 12px;
            font-size: 12px;
            color: #b0b0c0;
        }

        .bsm-video-tags {
            display: flex;
            gap: 8px;
            margin-top: 12px;
            flex-wrap: wrap;
        }

        .bsm-tag {
            padding: 5px 14px;
            background: linear-gradient(135deg, rgba(255, 182, 193, 0.3) 0%, rgba(201, 177, 255, 0.3) 100%);
            color: #d63384;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }

        .bsm-empty {
            text-align: center;
            padding: 100px 20px;
            color: #999;
        }

        .bsm-empty-icon {
            font-size: 90px;
            margin-bottom: 24px;
        }

        .bsm-empty-text {
            font-size: 22px;
            margin-bottom: 10px;
            color: #b0b0c0;
            font-weight: 600;
        }

        .bsm-empty-hint {
            font-size: 14px;
            color: #ccc;
        }

        /* 模态框 */
        .bsm-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.35);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }

        .bsm-modal.active {
            opacity: 1;
            visibility: visible;
        }

        .bsm-modal-content {
            background: #fff;
            border-radius: 28px;
            padding: 40px;
            width: 90%;
            max-width: 480px;
            box-shadow: 0 30px 60px rgba(255, 143, 171, 0.3);
            border: 3px solid rgba(255, 182, 193, 0.3);
        }

        .bsm-modal-title {
            font-size: 24px;
            font-weight: 800;
            background: linear-gradient(135deg, #ff8fab 0%, #c9b1ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 28px;
            text-align: center;
            letter-spacing: 1px;
        }

        .bsm-form-group {
            margin-bottom: 24px;
        }

        .bsm-form-label {
            display: block;
            font-size: 14px;
            color: #888;
            margin-bottom: 10px;
            font-weight: 600;
        }

        .bsm-form-input {
            width: 100%;
            padding: 16px 20px;
            background: #fef7f9;
            border: 3px solid rgba(255, 182, 193, 0.35);
            border-radius: 16px;
            color: #5a5a6e;
            font-size: 15px;
            box-sizing: border-box;
            transition: all 0.25s ease;
        }

        .bsm-form-input:focus {
            outline: none;
            border-color: #ffb6c1;
            background: #fff;
            box-shadow: 0 0 0 5px rgba(255, 182, 193, 0.2);
        }

        .bsm-form-input::placeholder {
            color: #ccc;
        }

        .bsm-modal-actions {
            display: flex;
            gap: 16px;
            justify-content: flex-end;
            margin-top: 32px;
        }

        /* 背景设置面板 */
        .bsm-bg-panel {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: center;
        }

        .bsm-bg-option {
            width: 80px;
            height: 58px;
            border-radius: 14px;
            cursor: pointer;
            border: 4px solid transparent;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12);
        }

        .bsm-bg-option:hover {
            transform: scale(1.12);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.18);
        }

        .bsm-bg-option.selected {
            border-color: #ff8fab;
            transform: scale(1.1);
        }

        .bsm-bg-custom {
            width: 80px;
            height: 58px;
            border-radius: 14px;
            border: 3px dashed rgba(255, 182, 193, 0.6);
            background: #fef7f9;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            transition: all 0.25s ease;
        }

        .bsm-bg-custom:hover {
            transform: scale(1.12);
            border-color: #ffb6c1;
            box-shadow: 0 6px 20px rgba(255, 182, 193, 0.4);
        }

        /* 浮动按钮 */
        .bsm-fab {
            position: fixed;
            bottom: 40px;
            right: 40px;
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #ffb6c1 0%, #ffc0cb 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 8px 30px rgba(255, 143, 171, 0.5);
            transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 9999;
            font-size: 28px;
        }

        .bsm-fab:hover {
            transform: scale(1.15) rotate(90deg);
            box-shadow: 0 14px 45px rgba(255, 143, 171, 0.6);
        }

        .bsm-toast {
            position: fixed;
            bottom: 120px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: linear-gradient(135deg, #ffb6c1 0%, #ffc0cb 100%);
            color: #d63384;
            padding: 16px 32px;
            border-radius: 25px;
            font-size: 13px;
            font-weight: 600;
            opacity: 0;
            visibility: hidden;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 10001;
            box-shadow: 0 8px 25px rgba(255, 143, 171, 0.35);
        }

        .bsm-toast.active {
            opacity: 1;
            visibility: visible;
            transform: translateX(-50%) translateY(0);
        }

        /* 隐藏文件输入 */
        .bsm-file-input {
            display: none;
        }
    `;

    // ==================== 主应用类 ====================
    class BilibiliStudyMode {
        constructor() {
            this.container = null;
            this.init();
        }

        init() {
            this.injectStyles();
            this.render();
            this.bindEvents();
        }

        injectStyles() {
            const styleEl = document.createElement('style');
            styleEl.textContent = Style;
            document.head.appendChild(styleEl);
        }

        render() {
            // 创建主容器
            this.container = document.createElement('div');
            this.container.className = 'bsm-container';
            this.container.innerHTML = this.getTemplate();
            this.container.style.background = Storage.getBackground();

            // 替换页面内容
            document.body.innerHTML = '';
            document.body.appendChild(this.container);

            // 确保页面可以滚动
            document.documentElement.style.overflow = 'auto';
            document.documentElement.style.height = 'auto';
            document.body.style.overflow = 'auto';
            document.body.style.height = 'auto';
            document.body.style.overflowX = 'hidden';
            document.body.style.overflowY = 'auto';
        }

        getTemplate() {
            const videos = Storage.getVideos();
            const allTags = this.getAllTags(videos);

            return `
                <button class="bsm-settings-btn" id="bsm-settings-btn">🎨</button>

                <div class="bsm-header">
                    <div class="bsm-title">沉浸式学习模式</div>
                    <div class="bsm-controls">
                        <button class="bsm-btn bsm-btn-secondary" id="bsm-refresh-btn">刷新信息</button>
                        <button class="bsm-btn bsm-btn-primary" id="bsm-add-btn">添加视频</button>
                    </div>
                </div>

                <div class="bsm-stats">
                    <div class="bsm-stat">
                        <div class="bsm-stat-value">${videos.length}</div>
                        <div class="bsm-stat-label">学习视频</div>
                    </div>
                    <div class="bsm-stat">
                        <div class="bsm-stat-value">${allTags.length}</div>
                        <div class="bsm-stat-label">标签分类</div>
                    </div>
                </div>

                ${allTags.length > 0 ? `
                <div class="bsm-filters">
                    <span class="bsm-filter-tag active" data-tag="all">全部</span>
                    ${allTags.map(tag => `<span class="bsm-filter-tag" data-tag="${tag}">${tag}</span>`).join('')}
                </div>
                ` : ''}

                ${videos.length === 0 ? this.getEmptyState() : this.getVideoGrid(videos)}
            `;
        }

        getEmptyState() {
            return `
                <div class="bsm-empty">
                    <div class="bsm-empty-icon">📖</div>
                    <div class="bsm-empty-text">还没有添加学习视频</div>
                    <div class="bsm-empty-hint">点击右上角「添加视频」开始打造你的学习空间</div>
                </div>
            `;
        }

        getVideoGrid(videos) {
            return `
                <div class="bsm-video-grid">
                    ${videos.map(video => `
                        <div class="bsm-video-card" data-bv="${video.bv}">
                            <div class="bsm-video-cover">
                                <img src="${video.cover || CONFIG.defaultCover}" alt="${video.title}" onerror="this.src='${CONFIG.defaultCover}'">
                                ${video.duration ? `<span class="bsm-video-duration">${this.formatDuration(video.duration)}</span>` : ''}
                                <div class="bsm-video-overlay">
                                    <div class="bsm-video-overlay-buttons">
                                        <button class="bsm-overlay-btn edit" data-bv="${video.bv}">🏷️ 重新分类</button>
                                        <button class="bsm-overlay-btn refresh" data-bv="${video.bv}">🔄 刷新</button>
                                        <button class="bsm-overlay-btn delete" data-bv="${video.bv}">🗑️ 删除</button>
                                    </div>
                                </div>
                            </div>
                            <div class="bsm-video-info">
                                <div class="bsm-video-title">${video.title || video.bv}</div>
                                <div class="bsm-video-meta">
                                    <span>BV号: ${video.bv}</span>
                                    ${video.author ? `<span>${video.author}</span>` : ''}
                                </div>
                                ${video.tags && video.tags.length > 0 ? `
                                    <div class="bsm-video-tags">
                                        ${video.tags.map(tag => `<span class="bsm-tag">${tag}</span>`).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        getAllTags(videos) {
            const tagSet = new Set();
            videos.forEach(v => {
                (v.tags || []).forEach(tag => tagSet.add(tag));
            });
            return Array.from(tagSet);
        }

        formatDuration(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        bindEvents() {
            // 设置按钮
            document.getElementById('bsm-settings-btn').addEventListener('click', () => this.showBgModal());

            // 添加视频按钮
            document.getElementById('bsm-add-btn').addEventListener('click', () => this.showAddModal());

            // 刷新按钮
            document.getElementById('bsm-refresh-btn').addEventListener('click', () => this.refreshAllVideos());

            // 事件委托 - 卡片点击、删除、刷新、编辑
            this.container.addEventListener('click', (e) => {
                const card = e.target.closest('.bsm-video-card');
                const deleteBtn = e.target.closest('.bsm-overlay-btn.delete');
                const refreshBtn = e.target.closest('.bsm-overlay-btn.refresh');
                const editBtn = e.target.closest('.bsm-overlay-btn.edit');
                const filterTag = e.target.closest('.bsm-filter-tag');

                if (deleteBtn) {
                    e.stopPropagation();
                    this.deleteVideo(deleteBtn.dataset.bv);
                } else if (refreshBtn) {
                    e.stopPropagation();
                    this.refreshVideo(refreshBtn.dataset.bv);
                } else if (editBtn) {
                    e.stopPropagation();
                    this.showEditTagsModal(editBtn.dataset.bv);
                } else if (card) {
                    window.open(getVideoPageUrl(card.dataset.bv), '_blank');
                } else if (filterTag) {
                    this.filterByTag(filterTag.dataset.tag);
                }
            });

            // 确保鼠标滚轮可以滚动页面
            this.container.addEventListener('wheel', (e) => {
                const delta = e.deltaY || e.wheelDeltaY || -e.detail;
                if (delta) {
                    document.body.scrollTop += delta * 0.5;
                    document.documentElement.scrollTop += delta * 0.5;
                }
            }, { passive: true });
        }

        showEditTagsModal(bv) {
            // 移除已存在的模态框，防止重复创建
            document.querySelectorAll('.bsm-modal').forEach(m => m.remove());

            const video = Storage.getVideos().find(v => v.bv === bv);
            if (!video) return;

            const modal = document.createElement('div');
            modal.className = 'bsm-modal active';
            modal.innerHTML = `
                <div class="bsm-modal-content">
                    <div class="bsm-modal-title">🏷️ 重新分类</div>
                    <div class="bsm-form-group">
                        <label class="bsm-form-label">视频标题</label>
                        <div style="font-size: 14px; color: #666; margin-bottom: 10px;">${video.title || video.bv}</div>
                    </div>
                    <div class="bsm-form-group">
                        <label class="bsm-form-label">标签（用逗号分隔）</label>
                        <input type="text" class="bsm-form-input" id="bsm-edit-tags-input"
                            placeholder="例如: 高数, 编程, 英语" value="${(video.tags || []).join(', ')}">
                    </div>
                    <div class="bsm-modal-actions">
                        <button class="bsm-btn bsm-btn-secondary" id="bsm-edit-cancel">取消</button>
                        <button class="bsm-btn bsm-btn-primary" id="bsm-edit-confirm">保存</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.querySelector('#bsm-edit-cancel').addEventListener('click', () => modal.remove());
            modal.querySelector('#bsm-edit-confirm').addEventListener('click', () => {
                const tagsInput = modal.querySelector('#bsm-edit-tags-input');
                const tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
                Storage.updateVideo(bv, { tags });
                this.showToast('分类已更新');
                modal.remove();
                this.refresh();
            });

            modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        }

        showBgModal() {
            // 移除已存在的模态框，防止重复创建
            document.querySelectorAll('.bsm-modal').forEach(m => m.remove());

            const currentBg = Storage.getBackground();
            const modal = document.createElement('div');
            modal.className = 'bsm-modal active';

            const presets = [
                { name: '樱花粉', bg: 'linear-gradient(135deg, #FFE5EC 0%, #FFF0E5 50%, #FFE5EC 100%)' },
                { name: '梦幻紫', bg: 'linear-gradient(135deg, #E8D5F5 0%, #D4B8E8 50%, #E8D5F5 100%)' },
                { name: '薄荷绿', bg: 'linear-gradient(135deg, #E8F8F5 0%, #A8EDEA 50%, #E8F8F5 100%)' },
                { name: '柠檬黄', bg: 'linear-gradient(135deg, #FFFDE8 0%, #FFF8B8 50%, #FFFDE8 100%)' },
                { name: '蜜桃粉', bg: 'linear-gradient(135deg, #FFE8F0 0%, #FFD1DC 50%, #FFE8F0 100%)' },
                { name: '天空蓝', bg: 'linear-gradient(135deg, #E5F0FF 0%, #B8E0FF 50%, #E5F0FF 100%)' },
                { name: '奶油白', bg: 'linear-gradient(135deg, #FFFEF5 0%, #FFF8E8 50%, #FFFEF5 100%)' },
                { name: '糖果橙', bg: 'linear-gradient(135deg, #FFF3E8 0%, #FFDAB9 50%, #FFF3E8 100%)' }
            ];

            // 创建文件输入元素
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.id = 'bsm-bg-file-input';
            fileInput.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none;';

            modal.innerHTML = `
                <div class="bsm-modal-content">
                    <div class="bsm-modal-title">设置背景</div>
                    <div class="bsm-bg-panel">
                        ${presets.map((p) => `
                            <div class="bsm-bg-option ${currentBg === p.bg ? 'selected' : ''}"
                                 style="background: ${p.bg};"
                                 data-bg="${p.bg}"
                                 title="${p.name}">
                            </div>
                        `).join('')}
                        <label for="bsm-bg-file-input" class="bsm-bg-custom" title="自定义图片">📷</label>
                    </div>
                    <div class="bsm-modal-actions" style="margin-top: 24px;">
                        <button class="bsm-btn bsm-btn-danger" id="bsm-reset-bg">恢复默认</button>
                        <button class="bsm-btn bsm-btn-secondary" id="bsm-close-bg">关闭</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            modal.appendChild(fileInput);

            // 预设背景点击
            modal.querySelectorAll('.bsm-bg-option').forEach(el => {
                el.addEventListener('click', () => {
                    Storage.setBackground(el.dataset.bg);
                    this.container.style.background = el.dataset.bg;
                    modal.querySelectorAll('.bsm-bg-option').forEach(opt => opt.classList.remove('selected'));
                    el.classList.add('selected');
                    this.showToast('背景已更换');
                });
            });

            // 自定义图片 - 使用 label 触发文件选择，带压缩功能
            const self = this;
            fileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    self.showToast('正在处理图片...');
                    compressImage(file, function(dataUrl, sizeInfo) {
                        if (!dataUrl) {
                            self.showToast('❌ 图片处理失败，请重试');
                            return;
                        }

                        // 尝试保存
                        const success = Storage.setBackground(`url(${dataUrl})`);
                        if (success) {
                            self.container.style.background = `url(${dataUrl}) center/cover no-repeat fixed`;
                            self.showToast(`✅ 上传成功！(${sizeInfo})`);
                            modal.remove();
                        } else {
                            self.showToast(`❌ 存储失败！图片太大(${sizeInfo})，请使用更小的图片`);
                        }
                    });
                }
            });

            // 图片压缩函数
            function compressImage(file, callback) {
                const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        // 最大尺寸限制
                        const MAX_WIDTH = 1920;
                        const MAX_HEIGHT = 1080;
                        let width = img.width;
                        let height = img.height;

                        // 等比缩放
                        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                            const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
                            width = Math.round(width * ratio);
                            height = Math.round(height * ratio);
                        }

                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);

                        // 初始质量
                        let quality = 0.85;
                        const tryCompress = function() {
                            const dataUrl = canvas.toDataURL('image/jpeg', quality);
                            const base64SizeMB = (dataUrl.length * 0.75 / (1024 * 1024)).toFixed(2);
                            const sizeInfo = `${fileSizeMB}MB→${base64SizeMB}MB`;

                            // 检查是否超过 localStorage 限制（约 3.5MB 安全值）
                            if (base64SizeMB > 3.5 && quality > 0.2) {
                                quality -= 0.1;
                                tryCompress();
                            } else if (base64SizeMB > 3.5) {
                                // 实在压不动了
                                callback(null, sizeInfo);
                            } else {
                                callback(dataUrl, sizeInfo);
                            }
                        };
                        tryCompress();
                    };
                    img.onerror = function() {
                        callback(null);
                    };
                    img.src = evt.target.result;
                };
                reader.onerror = function() {
                    callback(null);
                };
                reader.readAsDataURL(file);
            }

            // 恢复默认
            modal.querySelector('#bsm-reset-bg').addEventListener('click', () => {
                Storage.clearBackground();
                this.container.style.background = CONFIG.defaultBg;
                this.showToast('已恢复默认背景');
                modal.remove();
            });

            // 关闭
            modal.querySelector('#bsm-close-bg').addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        }

        filterByTag(tag) {
            document.querySelectorAll('.bsm-filter-tag').forEach(el => {
                el.classList.toggle('active', el.dataset.tag === tag);
            });

            const cards = document.querySelectorAll('.bsm-video-card');
            cards.forEach(card => {
                const video = Storage.getVideos().find(v => v.bv === card.dataset.bv);
                if (tag === 'all' || (video.tags && video.tags.includes(tag))) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        showAddModal() {
            // 移除已存在的模态框，防止重复创建
            document.querySelectorAll('.bsm-modal').forEach(m => m.remove());

            const modal = document.createElement('div');
            modal.className = 'bsm-modal active';
            modal.innerHTML = `
                <div class="bsm-modal-content">
                    <div class="bsm-modal-title">添加学习视频</div>
                    <div class="bsm-form-group">
                        <label class="bsm-form-label">B站视频链接或BV号</label>
                        <input type="text" class="bsm-form-input" id="bsm-video-input"
                            placeholder="例如: BV1xx411c7XZ 或 https://www.bilibili.com/video/BV1xx411c7XZ">
                    </div>
                    <div class="bsm-form-group">
                        <label class="bsm-form-label">标签（用逗号分隔，可选）</label>
                        <input type="text" class="bsm-form-input" id="bsm-tags-input"
                            placeholder="例如: 高数, 编程, 英语">
                    </div>
                    <div class="bsm-modal-actions">
                        <button class="bsm-btn bsm-btn-secondary" id="bsm-modal-cancel">取消</button>
                        <button class="bsm-btn bsm-btn-primary" id="bsm-modal-confirm">添加</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const input = modal.querySelector('#bsm-video-input');
            input.focus();

            modal.querySelector('#bsm-modal-cancel').addEventListener('click', () => modal.remove());
            modal.querySelector('#bsm-modal-confirm').addEventListener('click', () => {
                const value = input.value.trim();
                if (value) {
                    this.addVideo(value);
                }
                modal.remove();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const value = input.value.trim();
                    if (value) {
                        this.addVideo(value);
                        modal.remove();
                    }
                }
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        }

        async addVideo(input) {
            // 从输入中提取BV号
            let bv = getBVFromUrl(input);
            if (!bv) {
                bv = input.startsWith('BV') ? input : null;
            }

            if (!bv) {
                this.showToast('请输入有效的BV号或视频链接');
                return;
            }

            // 检查是否已存在
            if (Storage.getVideos().some(v => v.bv === bv)) {
                this.showToast('该视频已添加');
                return;
            }

            // 获取视频信息
            const tagsInput = document.querySelector('#bsm-tags-input');
            const tags = tagsInput ? tagsInput.value.split(',').map(t => t.trim()).filter(Boolean) : [];

            this.showToast('正在获取视频信息...');

            const info = await fetchVideoInfo(bv);

            if (info) {
                Storage.addVideo(bv, info.title, tags);
                Storage.updateVideo(bv, {
                    cover: info.cover,
                    duration: info.duration,
                    author: info.author
                });
                this.showToast(`已添加: ${info.title}`);
            } else {
                Storage.addVideo(bv, `视频 ${bv}`, tags);
                this.showToast('已添加，视频信息稍后可通过刷新获取');
            }

            this.refresh();
        }

        deleteVideo(bv) {
            const video = Storage.getVideos().find(v => v.bv === bv);
            if (video && confirm(`确定要删除「${video.title}」吗？`)) {
                Storage.removeVideo(bv);
                this.showToast('已删除');
                this.refresh();
            }
        }

        async refreshVideo(bv) {
            this.showToast('正在刷新...');
            const info = await fetchVideoInfo(bv);
            if (info) {
                Storage.updateVideo(bv, {
                    title: info.title,
                    cover: info.cover,
                    duration: info.duration,
                    author: info.author
                });
                this.showToast('已刷新');
                this.refresh();
            } else {
                this.showToast('刷新失败');
            }
        }

        async refreshAllVideos() {
            const videos = Storage.getVideos();
            if (videos.length === 0) {
                this.showToast('没有视频可刷新');
                return;
            }

            this.showToast(`正在刷新 ${videos.length} 个视频...`);

            for (const video of videos) {
                const info = await fetchVideoInfo(video.bv);
                if (info) {
                    Storage.updateVideo(video.bv, {
                        title: info.title,
                        cover: info.cover,
                        duration: info.duration,
                        author: info.author
                    });
                }
                await new Promise(r => setTimeout(r, 200));
            }

            this.showToast('全部刷新完成');
            this.refresh();
        }

        refresh() {
            this.container.innerHTML = this.getTemplate();
            this.bindEvents();
        }

        showToast(message) {
            let toast = document.querySelector('.bsm-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.className = 'bsm-toast';
                document.body.appendChild(toast);
            }
            toast.textContent = message;
            toast.classList.add('active');
            setTimeout(() => toast.classList.remove('active'), 2500);
        }
    }

    // ==================== 启动 ====================
    function isBilibiliHome() {
        return window.location.hostname === 'www.bilibili.com' &&
               (window.location.pathname === '/' || window.location.pathname === '');
    }

    function init() {
        // 仅在B站首页激活
        if (isBilibiliHome()) {
            new BilibiliStudyMode();
        }

        // 在视频页屏蔽推荐列表
        if (window.location.pathname.startsWith('/video/')) {
            hideRecommendedVideos();
        }
    }

    function hideRecommendedVideos() {
        // 用学习提醒替换推荐列表，并隐藏展开按钮
        setTimeout(() => {
            // 替换推荐列表内容
            document.querySelectorAll('.rec-list').forEach(el => {
                el.style.cssText = 'display: block !important;';
                el.innerHTML = `
                    <div style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100%;
                        min-height: 400px;
                        padding: 40px 20px;
                        text-align: center;
                        background: linear-gradient(135deg, rgba(168, 237, 234, 0.15) 0%, rgba(201, 177, 255, 0.15) 100%);
                        border-radius: 16px;
                        margin: 10px;
                    ">
                        <div style="font-size: 48px; margin-bottom: 20px;">🌿</div>
                        <div style="
                            font-size: 16px;
                            color: #6b7b8a;
                            line-height: 1.8;
                            font-weight: 500;
                        ">
                            已为您屏蔽推荐列表<br>
                            别让推荐视频打断了你的学习节奏~
                        </div>
                    </div>
                `;
            });

            // 隐藏展开按钮
            document.querySelectorAll('.rec-footer').forEach(el => {
                el.style.cssText = 'display: none !important;';
            });
        }, 1000);
    }

    // 等待页面加载完成
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 100);
    } else {
        window.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
    }
})();
