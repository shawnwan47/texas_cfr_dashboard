# Texas CFR Dashboard - Web 对战系统

一个基于 React + Express + Deep CFR 的现代化 Web 应用，让用户在浏览器中与训练好的德州扑克 AI 对战。

## 🎮 功能特性

- **实时对战界面**: 专业的扑克牌桌 UI，支持完整的游戏流程
- **智能 AI 对手**: 基于 Deep CFR 算法的启发式决策系统
- **游戏理论决策**: AI 考虑底池赔率、筹码管理和随机因素
- **项目架构分析**: 可视化展示 texas_cfr 项目的结构和特性
- **完整的 API**: tRPC 全类型安全的后端接口
- **单元测试**: 14 项测试全部通过，确保代码质量

## 🚀 快速开始

### 前置要求

- Node.js 22.13.0+
- pnpm 10.4.1+
- Python 3.11+（可选，用于集成真实 Deep CFR 模型）

### 安装依赖

```bash
# 克隆仓库
git clone https://github.com/shawnwan47/texas_cfr_dashboard.git
cd texas_cfr_dashboard

# 安装依赖
pnpm install
```

### 启动开发服务器

```bash
# 启动开发服务器（包含前端和后端）
pnpm dev

# 服务器将在 http://localhost:3000 启动
```

### 启动 GUI 界面

#### 方式一：直接访问 Web 界面（推荐）

1. 运行 `pnpm dev` 启动开发服务器
2. 在浏览器中打开 `http://localhost:3000`
3. 点击"开始游戏"进入对战界面

#### 方式二：使用 Manus 平台

如果项目部署在 Manus 平台上，直接访问分配的域名即可，例如：
```
https://3000-xxxx.manus.computer
```

#### 方式三：生产环境部署

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## 📋 项目结构

```
texas_cfr_dashboard/
├── client/                 # 前端 React 应用
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   │   ├── Home.tsx   # 首页（项目架构分析）
│   │   │   ├── PokerGame.tsx  # 游戏界面
│   │   │   └── NotFound.tsx   # 404 页面
│   │   ├── components/    # 可复用组件
│   │   ├── lib/          # 工具库
│   │   ├── App.tsx       # 应用入口
│   │   └── index.css     # 全局样式
│   └── index.html        # HTML 模板
├── server/                # 后端 Express 应用
│   ├── routers/
│   │   └── game.ts       # 游戏 API 路由
│   ├── ai_service.py     # Python AI 推理服务
│   ├── model_cache.py    # 模型缓存管理
│   ├── db.ts             # 数据库操作
│   └── routers.ts        # tRPC 路由配置
├── drizzle/              # 数据库 schema
├── shared/               # 前后端共享代码
├── package.json          # 项目依赖
├── tsconfig.json         # TypeScript 配置
└── README.md             # 本文件
```

## 🎯 游戏玩法

### 基本规则

- 初始筹码：1000 枚
- 小盲注：5 枚，大盲注：10 枚
- 支持的动作：弃牌、过牌、跟注、加注

### AI 决策逻辑

AI 使用改进的启发式算法做出决策，考虑以下因素：

1. **底池赔率 (Pot Odds)**: 跟注投入与底池大小的比例
2. **筹码管理**: 剩余筹码与所需跟注金额的比例
3. **随机因素**: 增加不可预测性，模拟真实玩家行为
4. **动作选择**:
   - 如果跟注金额 > 筹码的 60%，倾向于弃牌
   - 如果没有需要跟注的金额，偶尔加注以保持平衡
   - 基于底池赔率 > 3 的情况下考虑跟注

## 🧪 测试

运行单元测试：

```bash
# 运行所有测试
pnpm test

# 监听模式（自动重新运行）
pnpm test --watch
```

测试覆盖范围：
- ✅ 游戏初始化
- ✅ 玩家弃牌
- ✅ 玩家过牌
- ✅ 玩家跟注
- ✅ 玩家下注
- ✅ AI 决策建议
- ✅ 会话清理

## 🤖 AI 模型集成

### 当前实现

目前使用改进的启发式决策算法，响应速度快（~1ms）。

### 升级到真实 Deep CFR 模型

详见 [AI_INTEGRATION.md](./AI_INTEGRATION.md) 文档。

集成步骤：

1. 安装 texas_cfr 依赖：
   ```bash
   cd /path/to/texas_cfr
   pip install -e .
   ```

2. 加载预训练模型：
   ```python
   from server.ai_service import AIModelService
   
   service = AIModelService(
     model_path='./flagship_models/first/1-model.pt'
   )
   decision = service.get_action(game_state)
   ```

3. 在游戏 API 中调用模型推理

## 📊 项目架构

### 前端架构

- **框架**: React 19 + TypeScript
- **样式**: Tailwind CSS 4 + shadcn/ui
- **状态管理**: tRPC + React Query
- **动画**: Framer Motion

### 后端架构

- **框架**: Express 4 + tRPC 11
- **数据库**: MySQL/TiDB + Drizzle ORM
- **认证**: Manus OAuth
- **API**: 全类型安全的 tRPC 过程调用

### AI 架构

- **推理框架**: PyTorch
- **模型**: Deep CFR 神经网络（可选）
- **缓存**: 模型对象池 + 元数据缓存
- **决策**: 启发式算法 + 游戏理论

## 🔧 开发指南

### 添加新的游戏功能

1. 在 `server/routers/game.ts` 中添加新的 tRPC 过程
2. 在 `client/src/pages/PokerGame.tsx` 中调用新的 API
3. 在 `server/game.test.ts` 中编写单元测试

### 修改 AI 决策逻辑

编辑 `server/routers/game.ts` 中的 `getImprovedAIDecision()` 函数。

### 数据库操作

1. 修改 `drizzle/schema.ts` 定义表结构
2. 运行 `pnpm db:push` 生成迁移
3. 在 `server/db.ts` 中添加查询辅助函数

## 📝 API 文档

### 游戏 API

#### 初始化游戏

```typescript
trpc.game.initGame.mutate()
// 返回: { sessionId, gameState }
```

#### 获取游戏状态

```typescript
trpc.game.getGameState.query({ sessionId })
// 返回: 当前游戏状态
```

#### 玩家弃牌

```typescript
trpc.game.playerFold.mutate({ sessionId })
// 返回: { status, gameHistory, result }
```

#### 玩家过牌

```typescript
trpc.game.playerCheck.mutate({ sessionId })
// 返回: { status, gameHistory, gameState }
```

#### 玩家跟注

```typescript
trpc.game.playerCall.mutate({ sessionId, amount })
// 返回: { status, gameHistory, gameState }
```

#### 玩家下注

```typescript
trpc.game.playerBet.mutate({ sessionId, amount })
// 返回: { status, gameHistory, gameState }
```

#### 获取 AI 决策

```typescript
trpc.game.getAIDecision.query({ sessionId })
// 返回: { recommendedAction, confidence, explanation }
```

## 🚀 部署

### 部署到 Manus 平台

1. 在 Management UI 中点击 "Publish" 按钮
2. 系统自动生成部署链接
3. 自定义域名可在 "Domains" 设置中配置

### 部署到其他平台

```bash
# 构建
pnpm build

# 使用 Docker
docker build -t texas-cfr-dashboard .
docker run -p 3000:3000 texas-cfr-dashboard

# 或使用其他平台（Railway, Render 等）
# 详见各平台文档
```

## 📚 相关资源

- [texas_cfr GitHub](https://github.com/shawnwan47/texas_cfr)
- [Deep CFR 论文](https://arxiv.org/abs/1811.07910)
- [React 文档](https://react.dev)
- [Express 文档](https://expressjs.com)
- [tRPC 文档](https://trpc.io)

## 🐛 故障排除

### 开发服务器无法启动

```bash
# 清除依赖缓存
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 重新启动
pnpm dev
```

### 数据库连接失败

```bash
# 检查数据库 URL
echo $DATABASE_URL

# 推送数据库 schema
pnpm db:push
```

### AI 决策不合理

1. 检查游戏状态是否正确编码
2. 查看 `server/game.test.ts` 中的测试用例
3. 启用详细日志进行调试

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

- GitHub: [@shawnwan47](https://github.com/shawnwan47)
- 项目主页: [texas_cfr_dashboard](https://github.com/shawnwan47/texas_cfr_dashboard)

---

**最后更新**: 2026年1月22日

**项目版本**: 1.0.0

**Deep CFR 集成版本**: 448ae8cf
