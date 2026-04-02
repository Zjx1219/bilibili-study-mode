# B站沉浸式学习模式

一个 Tampermonkey 用户脚本，帮助你打造专属的B站学习空间。

---

## 功能特性

### 1. 自定义首页

- 访问 B站首页时，自动替换为你的学习视频列表
- 马卡龙色系界面，清新淡雅
- 支持自定义背景图片或选择预设渐变色

### 2. 视频管理

- **添加视频**：输入BV号或视频链接即可添加
- **重新分类**：鼠标悬停视频卡片，点击「🏷️ 重新分类」可修改标签
- **刷新信息**：自动从B站API获取视频标题、封面、时长、作者
- **删除视频**：鼠标悬停视频卡片，点击「🗑️ 删除」

### 3. 标签分类

- 添加视频时可设置标签（用逗号分隔）
- 首页显示所有标签，点击可快速筛选
- 支持重新编辑已添加视频的标签

### 4. 学习督促模式

- 在视频页时，右侧推荐列表会被替换为学习提醒
- 提醒语：「已为您屏蔽推荐列表，别让推荐视频打断了你的学习节奏~」

### 5. 背景设置

- 点击左上角「🎨」按钮打开设置
- 8种预设马卡龙渐变背景
- 支持上传本地图片作为背景（自动压缩）
- 可恢复默认背景
<img width="2501" height="1533" alt="1775117168798" src="https://github.com/user-attachments/assets/a9c1efed-5045-43a4-abf6-48031ad57a34" />
<img width="2501" height="1529" alt="1775119236616" src="https://github.com/user-attachments/assets/9e59b65c-d37c-4e9c-a822-e3a3a4541de0" />
<img width="2501" height="1529" alt="1775117727919" src="https://github.com/user-attachments/assets/4495d653-f3d7-4a20-b68d-4b7244aedb33" />
<img width="637" height="606" alt="1775119286389" src="https://github.com/user-attachments/assets/2262cb59-17c7-4061-9d67-9e88ac43d15e" />
<img width="573" height="758" alt="1775119517741" src="https://github.com/user-attachments/assets/dc20d524-8dd8-4394-8499-466071b87769" />


---

## 安装步骤
###快速开始：https://raw.githubusercontent.com/Zjx1219/bilibili-study-mode/main/bilibili-study-mode.user.js

### 第一步：安装 Tampermonkey 扩展

| 浏览器  | 安装地址                                                                                                    |
| ------- | ----------------------------------------------------------------------------------------------------------- |
| Chrome  | [Chrome 应用商店](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)     |
| Firefox | [Firefox 附加组件](https://addons.mozilla.org/zh-CN/firefox/addon/tampermonkey/)                               |
| Edge    | [Edge 加载项](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/gjegajbgjgajcbjicjdfhpnpphoeijih) |

### 第二步：安装脚本

1. 点击 Tampermonkey 图标 → **管理面板**
2. 左侧选择 **"工具"**
3. 点击 **"从文件安装..."**
4. 选择 `bilibili-study-mode.user.js` 文件
5. 点击 **"安装"**

### 第三步：开始使用

1. 打开 [www.bilibili.com](https://www.bilibili.com)
2. 自动进入沉浸式学习模式首页
3. 点击「添加视频」开始添加学习内容

---

## 使用说明

### 添加视频

首页点击右上角「添加视频」按钮

- 输入视频链接或BV号（如 `BV1xx411c7XZ`）
- 可同时输入标签，用逗号分隔

### 管理视频

- **查看视频**：点击视频卡片会在新标签页打开视频
- **重新分类**：悬停卡片 → 点击「🏷️ 重新分类」
- **刷新信息**：悬停卡片 → 点击「🔄 刷新」（更新标题、封面等）
- **删除视频**：悬停卡片 → 点击「🗑️ 删除」

### 标签筛选

添加多个标签后，首页会显示标签栏

- 点击「全部」显示所有视频
- 点击具体标签筛选对应视频

### 设置背景

1. 点击左上角「🎨」按钮
2. 选择预设渐变或点击「📷」上传本地图片
3. 点击「恢复默认」可还原

---

## 数据存储

- 所有数据存储在浏览器 `localStorage` 中
- 更换浏览器或清除缓存会导致数据丢失
- 背景图片以 Base64 格式存储，受 5MB 限制
- 视频封面等信息会占用存储空间，建议定期清理不常用的视频

---

## 快捷操作

| 场景         | 操作                          |
| ------------ | ----------------------------- |
| 首页添加视频 | 点击「添加视频」按钮          |
| 筛选标签     | 点击标签栏的标签              |
| 修改标签     | 悬停卡片 → 「🏷️ 重新分类」 |
| 刷新信息     | 悬停卡片 → 「🔄 刷新」       |
| 删除视频     | 悬停卡片 → 「🗑️ 删除」     |
| 设置背景     | 点击左上角「🎨」              |

---

## 版本历史

### v1.1

- 新增马卡龙色系界面
- 新增自定义背景功能（支持预设+图片上传）
- 新增视频页推荐列表替换为学习提醒
- 新增视频重新分类功能
- 优化整体UI设计

### v1.0

- 初始版本
- 基本视频收藏功能
- 标签分类
- 首页自定义展示

---

## 注意事项

1. 本脚本仅在 `www.bilibili.com` 域名下生效
2. 视频信息从B站官方API获取，需要网络连接
3. 上传图片过大会自动压缩，但受 localStorage 限制，最大约 3.5MB
4. 如遇问题，可尝试在 Tampermonkey 中禁用后重新启用脚本

---

## 反馈与建议

如有问题或建议，请联系开发者。
