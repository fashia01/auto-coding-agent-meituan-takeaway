# 美团外卖项目登录问题修复文档

## 一、登录流程设计

### 1.1 整体架构

本项目采用前后端分离架构：
- **前端**: Vue 2 + Vue Router + Axios
- **后端**: Express.js + MongoDB + express-session

### 1.2 登录流程

```
用户输入账号密码
       ↓
前端调用 /admin/user_login API
       ↓
后端验证并创建 session (存储在 MongoDB)
       ↓
后端返回 200 状态码
       ↓
前端保存用户名到 localStorage
       ↓
跳转到首页显示用户名
```

### 1.3 核心技术点

1. **Session 管理**: 使用 express-session + MongoDB 存储，中间件配置如下：
   - Cookie 名称: `mt-session`
   - 存储方式: MongoDB (connect-mongo)
   - MongoDB 地址: `mongodb://127.0.0.1:27017/session`
   - httpOnly: false (允许前端访问)
   - secure: false (非 HTTPS)
   - sameSite: 'lax'

2. **CORS 配置**: 后端允许前端域名携带 cookie

3. **用户识别**: 使用 localStorage 存储用户名

---

## 二、发现的问题

### 2.1 问题一：变量名冲突

**位置**: `vue-meituan-master/src/views/login/login.vue`

**现象**: 点击登录按钮后没有任何反应

**原因**:
```javascript
import {login} from '@/api/user'  // 导入登录 API 函数

export default {
  methods: {
    login() {  // 这里的 login 方法覆盖了导入的 login 函数
      login({username: this.username, password: this.password})  // 调用的是自己，不是 API
    }
  }
}
```

导入的 `login` 函数被同名的 `login()` 方法覆盖，导致登录 API 永远不会被调用。

### 2.2 问题二：登录后跳转错误

**位置**: `vue-meituan-master/src/views/login/login.vue:68`

**现象**: 登录成功后页面没有跳转到首页

**原因**:
```javascript
this.$router.go(-1);  // 返回上一页，而不是跳转到首页
```

`$router.go(-1)` 会返回到上一个页面，而不是跳转到首页。

### 2.3 问题三：Session 无法跨请求保持

**位置**: `vue-meituan-master/src/api/index.js` 和 `meituan-backend-master/app.js`

**现象**: 登录成功后，首页仍然显示"登录/注册"而不是用户名

**原因**:
1. 后端使用内存存储 session，服务器重启后 session 丢失
2. `/admin/user_info` API 返回 403 错误，导致全局 axios 拦截器调用 `removeInfo()` 清除 localStorage

---

## 三、解决方案

### 3.1 修复变量名冲突

**文件**: `vue-meituan-master/src/views/login/login.vue`

**修改**:
```javascript
// 修改前
import {login} from '@/api/user'

// 修改后
import {login as loginAPI} from '@/api/user'
```

同时修改方法内的调用：
```javascript
// 修改前
login({username: this.username, password: this.password})

// 修改后
loginAPI({username: this.username, password: this.password})
```

### 3.2 修复登录后跳转

**文件**: `vue-meituan-master/src/views/login/login.vue`

**修改**:
```javascript
// 修改前
this.$router.go(-1);

// 修改后
this.$router.push('/home');
```

### 3.3 修复 Session 问题

#### 3.3.1 使用 MongoDB 存储 Session

**文件**: `meituan-backend-master/app.js`

**修改**:
```javascript
// 添加 import
import MongoStore from 'connect-mongo';

// 修改 session 配置
app.use(session({
  name: 'mt-session',
  secret: 'meituan',
  resave: true,
  saveUninitialized: false,
  rolling: false,
  store: MongoStore.create({
    mongoUrl: config.sessionStorageURL,  // mongodb://127.0.0.1:27017/session
    touchAfter: 24 * 3600  // 24小时内只更新一次
  }),
  cookie: {
    httpOnly: false,
    secure: false,
    maxAge: 365 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));
```

#### 3.3.2 移除全局 403 处理

**文件**: `vue-meituan-master/src/api/index.js`

**修改**:
```javascript
// 修改前
transformResponse: [function (data) {
  try {
    data = JSON.parse(data);
  } catch (e) {
    data = {};
  }
  if (data.status === 403) {
    removeInfo();
    router.push('/login');
  }
  return data;
}]

// 修改后
transformResponse: [function (data) {
  try {
    data = JSON.parse(data);
  } catch (e) {
    data = {};
  }
  return data;
}]
```

---

## 四、修改的文件清单

| 文件路径 | 修改内容 |
|---------|---------|
| `vue-meituan-master/src/views/login/login.vue` | 1. 导入重命名: `login` → `login as loginAPI`<br>2. 修改跳转: `$router.go(-1)` → `$router.push('/home')` |
| `vue-meituan-master/src/api/index.js` | 移除 transformResponse 中的 403 自动处理逻辑 |
| `meituan-backend-master/app.js` | 1. 添加 `import MongoStore from 'connect-mongo'`<br>2. 配置 session 使用 MongoDB 存储 |

---

## 五、测试验证

1. 打开登录页面 `http://localhost:8080/#/login`
2. 输入账号密码
3. 点击登录按钮
4. 验证成功跳转到首页，且显示用户名
5. 刷新页面，用户名仍然显示（session 保持）
6. 查看 MongoDB 中的 session 数据：
   ```bash
   mongosh --quiet --eval "db = db.getSiblingDB('session'); db.sessions.find().sort({_id: -1}).limit(1).pretty()"
   ```

---

## 六、注意事项

1. **MongoDB 必须运行**: 确保 MongoDB 服务正在运行，监听 `27017` 端口
2. **session 数据库**: session 数据存储在 MongoDB 的 `session` 数据库中
3. **依赖安装**: 项目已包含 `connect-mongo` 依赖（通过 `babel-register` 运行）
4. **配置说明**: MongoDB session 存储地址在 `config.js` 中配置：
   ```javascript
   sessionStorageURL: 'mongodb://127.0.0.1:27017/session'
   ```
