# 项目启动指南

本项目包含三个子项目：

| 目录 | 说明 | 端口 |
|------|------|------|
| `meituan-backend-master` | Node.js + Express + MongoDB 后端服务 | 3000 |
| `vue-meituan-master` | **Vue 2** 原始前端（Options API + Vuex + Mint-UI） | 8080 |
| `vue3-meituan` | **Vue 3** 升级版前端（Composition API + Pinia + Vant 4） | 8080 |

> ⚠️ Vue 2 和 Vue 3 前端**共用同一套后端**，同时只能运行一个前端（端口相同）。

---

## 环境要求

| 工具 | 版本要求 | 安装方式 |
|------|----------|----------|
| Node.js | ≥ 14 | https://nodejs.org |
| npm | ≥ 6 | 随 Node.js 一同安装 |
| MongoDB | 7.0 | `brew install mongodb/brew/mongodb-community@7.0` |

**MongoDB 安装（首次）：**
```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
```

---

## 首次初始化（后端 + 数据库，两个前端共用）

### 1. 导入数据库数据

```bash
# 启动 MongoDB
brew services start mongodb/brew/mongodb-community@7.0

# 进入后端目录
cd meituan-backend-master

# 导入原始 BSON 数据
mongorestore --db takeaway ./db/meituan/

# 安装后端依赖
npm install

# 写入基础种子数据（AI 推荐所需的菜品描述、价格字段）
npx babel-node seed.js

# 写入全国城市菜品数据（可选，丰富测试数据）
npx babel-node seed-cities.js
```

### 2. 配置 AI API Key

编辑 `meituan-backend-master/.env`，填入 DeepSeek API Key：

```env
OPENAI_API_KEY=你的API Key
OPENAI_BASE_URL=https://api.deepseek.com/v1
```

> DeepSeek API Key 申请：https://platform.deepseek.com/api_keys
> 也支持其他兼容 OpenAI 格式的接口，修改 `OPENAI_BASE_URL` 即可。

---

## 启动后端（两个前端版本共用此步骤）

```bash
# 第一步：启动 MongoDB（每次重启电脑后需要）
brew services start mongodb/brew/mongodb-community@7.0

# 第二步：启动后端服务
cd meituan-backend-master
npm run dev
```

**成功标志：**
```
*********************************
service start on 3000
*********************************
```

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 🟡 Vue 2 前端（vue-meituan-master）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**技术栈**：Vue 2.6 · Vue CLI 3 · Vuex 3 · Vue Router 3 · Mint-UI 2 · SCSS · better-scroll

### 首次安装依赖

```bash
cd vue-meituan-master
npm install
```

### 启动前端

```bash
cd vue-meituan-master
npm run serve
```

**成功标志：**
```
App running at:
- Local:   http://localhost:8080/
```

### 访问地址

| 页面 | 地址 |
|------|------|
| 首页 | http://localhost:8080 |
| AI 智能推荐 | http://localhost:8080/#/ai_chat |
| 登录 / 注册 | http://localhost:8080/#/login |
| 搜索餐馆 | http://localhost:8080/#/search |
| 我的订单 | http://localhost:8080/#/order |

### 项目结构

```
vue-meituan-master/src/
├── api/                  # Axios 请求封装
├── stores/               # Vuex 状态管理（cart / address / restaurant）
├── router/index.js       # 路由配置（require.ensure 懒加载）
├── components/           # 全局公共组件
├── views/
│   ├── ai_chat/          # AI 对话推荐页
│   │   ├── ai_chat.vue
│   │   └── components/   # ChatBubble / FoodCard / ChatInput
│   ├── Index/            # 首页
│   ├── store/            # 餐馆菜单页
│   ├── cart/             # 购物车
│   ├── confirm_order/    # 确认订单
│   ├── pay/              # 支付页
│   └── order/            # 订单列表 / 详情
└── style/
    └── mixin.scss        # rem 工具函数（基于 lib-flexible）
```

### 常见问题

**Q：启动时大量 `Deprecation Warning [import]` SCSS 警告？**
> 正常现象，项目使用旧版 Sass `@import` 语法，不影响运行。

**Q：页面显示但样式比例错乱？**
> Vue 2 版本依赖 `lib-flexible.js`（已在 `public/index.html` 中引入），确认网络可访问 `g.tbcdn.cn`。

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 🟢 Vue 3 前端（vue3-meituan）【推荐使用】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**技术栈**：Vue 3.4 · Vite 5 · Pinia · Vue Router 4 · Vant 4 · SCSS · CSS 变量主题

### 首次安装依赖

```bash
cd vue3-meituan
npm install
```

### 启动前端

```bash
cd vue3-meituan
npm run dev
```

**成功标志：**
```
  VITE v8.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8080/
```

### 访问地址

| 页面 | 地址 |
|------|------|
| 首页 | http://localhost:8080 |
| AI 智能推荐 | http://localhost:8080/#/ai_chat |
| 登录 / 注册 | http://localhost:8080/#/login |
| 搜索餐馆 | http://localhost:8080/#/search |
| 我的订单 | http://localhost:8080/#/order |

### 项目结构

```
vue3-meituan/src/
├── api/                  # Axios 请求封装（读取 VITE_API_BASE 环境变量）
├── stores/               # Pinia 状态管理（cart / address / restaurant）
│   ├── cart.js           # 购物车（含 localStorage 持久化）
│   ├── address.js        # 定位地址
│   └── restaurant.js     # 当前餐馆信息
├── router/index.js       # 路由配置（动态 import() 懒加载）
├── components/           # 全局公共组件
│   ├── AppHead.vue       # 顶部导航（封装 van-nav-bar）→ 全局注册为 v-head
│   ├── AppBottom.vue     # 底部导航（封装 van-tabbar）→ 全局注册为 v-bottom
│   ├── StarRating.vue    # 星级评分（封装 van-rate）→ 全局注册为 v-star
│   ├── FoodSelector.vue  # 加减步进器（封装 van-stepper）
│   └── AlertTip.vue      # 提示弹窗（封装 van-toast）
├── views/
│   ├── ai_chat/          # AI 对话推荐页（script setup 重写）
│   ├── Index/            # 首页（van-list 无限滚动 + van-skeleton 骨架屏）
│   ├── store/            # 餐馆菜单页（CSS sticky 双栏布局）
│   ├── cart/             # 购物车（van-swipe-cell 左滑删除）
│   ├── confirm_order/    # 确认订单
│   ├── pay/              # 支付页（保留模拟支付逻辑）
│   └── order/            # 订单列表 / 详情
├── styles/
│   └── var.css           # 美团黄主题 CSS 变量（覆盖 Vant 默认主题）
└── config.js             # API 地址等配置
```

### 环境变量

`.env.development`（已内置）：
```env
VITE_API_BASE=http://localhost:3000
```

### 常见问题

**Q：页面尺寸比例正常吗？**
> Vue 3 版本在 `index.html` 内联了 rem 适配脚本（等效 lib-flexible），在 375px 宽度下 `1rem = 37.5px`，与 Vue 2 版本完全一致。用移动端模拟器（Chrome DevTools → 375px）查看效果最佳。

**Q：商家图片全部显示空白？**
> 已修复。确保 `main.js` 中已注册 `app.use(Lazyload)`，van-image 的 `lazy-load` 属性依赖此插件。

**Q：首页商家全部显示「超出配送范围」？**
> 已修复（后端 `.lean()` 查询 + 前端 firstFetch 竞争逻辑）。若仍出现，请重启后端服务后刷新页面。

---

## 两种前端版本对比

| 对比项 | Vue 2（vue-meituan-master） | Vue 3（vue3-meituan）|
|--------|----------------------------|----------------------|
| 启动命令 | `npm run serve` | `npm run dev` |
| 构建工具 | Vue CLI（Webpack） | Vite 5 |
| 状态管理 | Vuex 3 | Pinia |
| UI 组件库 | Mint-UI 2（已停止维护） | Vant 4 |
| 编码风格 | Options API | `<script setup>` Composition API |
| 开发启动速度 | ~8s | <1s |
| 热更新速度 | 慢（Webpack HMR） | 极快（Vite HMR） |
| 推荐程度 | 仅用于参考对比 | ✅ 推荐日常开发使用 |

---

## 完整启动速览（推荐：Vue 3 版本）

```
终端 1（MongoDB + 后端）                终端 2（Vue 3 前端）
──────────────────────────────────     ──────────────────────────────
brew services start mongodb/...        cd vue3-meituan
cd meituan-backend-master              npm run dev
npm run dev
          ↓                                      ↓
  http://localhost:3000              http://localhost:8080
```

---

## 常用管理命令

```bash
# 查看 MongoDB 运行状态
brew services list | grep mongo

# 停止 MongoDB
brew services stop mongodb/brew/mongodb-community@7.0

# 重启 MongoDB
brew services restart mongodb/brew/mongodb-community@7.0

# 连接 MongoDB Shell
mongosh takeaway

# 查看菜品总数
mongosh takeaway --eval "db.foods.countDocuments()"

# 查看餐馆总数
mongosh takeaway --eval "db.restaurants.countDocuments()"

# 重新写入基础种子数据
cd meituan-backend-master && npx babel-node seed.js

# 重新写入城市菜品数据
cd meituan-backend-master && npx babel-node seed-cities.js
```
