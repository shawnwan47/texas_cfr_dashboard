# Deep CFR AI 集成指南

## 概述

本文档说明如何将真实的 Deep CFR 模型集成到 Web 对战系统中。目前系统使用改进的启发式决策算法，可以进一步升级为使用真实的 Deep CFR 神经网络模型。

## 当前实现

### 改进的启发式决策算法

当前的 AI 决策基于以下因素：

1. **底池赔率 (Pot Odds)**: 计算跟注所需的投入与底池大小的比例
2. **筹码管理**: 考虑 AI 剩余筹码与所需跟注金额的比例
3. **随机因素**: 添加随机性使 AI 的行为更难预测
4. **动作选择**:
   - 如果跟注金额 > 筹码的 60%，倾向于弃牌
   - 如果没有需要跟注的金额，偶尔加注以保持平衡
   - 基于底池赔率 > 3 的情况下考虑跟注

### 代码位置

- **游戏路由**: `server/routers/game.ts`
- **AI 决策函数**: `getImprovedAIDecision()` 函数
- **单元测试**: `server/game.test.ts`

## 升级到真实 Deep CFR 模型

### 第一步：安装依赖

```bash
# 安装 PyTorch（如果尚未安装）
pip install torch torchvision torchaudio

# 安装 texas_cfr 项目依赖
cd /home/ubuntu/texas_cfr
pip install -e .
```

### 第二步：使用 Python AI 服务

已创建 `server/ai_service.py` 文件，包含以下功能：

```python
from server.ai_service import AIModelService, get_ai_service

# 获取 AI 服务实例
service = get_ai_service()

# 获取 AI 决策
decision = service.get_action(game_state)
# 返回: {
#   'action': 'fold' | 'check' | 'raise',
#   'amount': int,
#   'confidence': float (0-1),
#   'explanation': str,
#   'all_action_probs': dict
# }
```

### 第三步：集成到 tRPC 路由

修改 `server/routers/game.ts` 中的 `playerBet` 和 `playerCheck` 方法：

```typescript
import { spawn } from 'child_process';

async function getAIDecisionFromPython(gameState: any): Promise<any> {
  // 调用 Python 服务获取 AI 决策
  const pythonProcess = spawn('python3', [
    'server/ai_service_wrapper.py',
    JSON.stringify(gameState)
  ]);
  
  return new Promise((resolve, reject) => {
    let output = '';
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve(JSON.parse(output));
      } else {
        reject(new Error('Python service failed'));
      }
    });
  });
}
```

### 第四步：模型缓存管理

使用 `server/model_cache.py` 中的缓存机制：

```python
from server.model_cache import get_model_cache, get_model_pool

# 获取缓存实例
cache = get_model_cache()

# 注册模型
model_name = cache.register_model(
  '/home/ubuntu/texas_cfr/flagship_models/first/1-model.pt',
  'deep_cfr_v1'
)

# 获取缓存统计
stats = cache.get_cache_stats()
print(f"缓存中有 {stats['loaded_models']} 个已加载的模型")
```

## 模型文件位置

预训练的 Deep CFR 模型位于：

- `./flagship_models/first/1-model.pt` - 基础模型
- `./flagship_models/first/mixed_checkpoint_iter_11200.pt` - 混合训练检查点

## 性能考虑

### 推理延迟

- **启发式决策**: ~1ms（当前实现）
- **Deep CFR 模型推理**: ~50-200ms（取决于硬件）
- **模型缓存**: 减少重复加载时间

### 优化建议

1. **批量推理**: 将多个游戏状态合并为一个批次进行推理
2. **模型量化**: 使用 ONNX 或 TorchScript 优化模型
3. **GPU 加速**: 如果可用，使用 GPU 进行推理
4. **异步处理**: 在后台线程中进行 AI 决策

## 测试

运行单元测试：

```bash
pnpm test
```

测试覆盖：

- ✅ 游戏初始化
- ✅ 玩家弃牌
- ✅ 玩家过牌
- ✅ 玩家跟注
- ✅ 玩家下注
- ✅ AI 决策建议
- ✅ 会话清理

## 故障排除

### 模型加载失败

```python
# 检查模型文件是否存在
import os
model_path = './flagship_models/first/1-model.pt'
if os.path.exists(model_path):
    print("模型文件存在")
else:
    print("模型文件不存在")
```

### 推理性能不佳

1. 检查是否使用了 GPU
2. 考虑使用模型量化
3. 实现批量推理

### AI 决策不合理

1. 检查输入状态编码是否正确
2. 验证模型权重是否正确加载
3. 比较与原始 texas_cfr 项目的输出

## 下一步

1. **实现完整的 Python 包装器**: 创建 `server/ai_service_wrapper.py` 作为 Python 进程
2. **性能优化**: 使用 ONNX 或 TorchScript 导出模型
3. **多模型支持**: 支持加载不同训练阶段的模型
4. **模型版本管理**: 实现模型版本控制和 A/B 测试
5. **监控和分析**: 记录 AI 决策统计和性能指标

## 参考资源

- [texas_cfr GitHub 仓库](https://github.com/shawnwan47/texas_cfr)
- [Deep CFR 论文](https://arxiv.org/abs/1811.07910)
- [PyTorch 文档](https://pytorch.org/docs/)
