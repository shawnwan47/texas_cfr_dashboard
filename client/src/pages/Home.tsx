/*
Design Philosophy: Swiss International Style + Data Visualization Modernism
- Asymmetric grid layout with fixed sidebar navigation
- Deep blue-gray theme for professional tech atmosphere
- Clear information hierarchy through typography and spacing
- Data-driven aesthetics with interactive visualizations
*/

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  FileCode2, 
  Network, 
  Database, 
  Lightbulb, 
  GitBranch, 
  Package,
  TrendingUp,
  Layers,
  Code2,
  Brain,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  };

  const projectStats = [
    { label: "代码行数", value: "4,224", icon: Code2, color: "text-chart-1" },
    { label: "Python 文件", value: "19", icon: FileCode2, color: "text-chart-2" },
    { label: "核心模块", value: "4", icon: Layers, color: "text-chart-3" },
    { label: "依赖包", value: "12", icon: Package, color: "text-chart-4" },
  ];

  const modules = [
    {
      name: "核心模块 (Core)",
      files: ["model.py", "deep_cfr.py", "memory.py", "cfr_self.py"],
      description: "实现 Deep CFR 算法的核心逻辑，包括神经网络模型、CFR 遍历和经验回放机制",
      icon: Brain,
      color: "bg-chart-1/10 border-chart-1/30"
    },
    {
      name: "对手建模 (Opponent Modeling)",
      files: ["opponent_model.py", "deep_cfr_with_opponent_modeling.py"],
      description: "基于 RNN 的对手行为预测系统，动态适应不同对手的策略",
      icon: Network,
      color: "bg-chart-2/10 border-chart-2/30"
    },
    {
      name: "训练流程 (Training)",
      files: ["train.py", "train_with_opponent_modeling.py", "train_mixed_with_opponent_modeling.py"],
      description: "多种训练模式：随机对战、自我对弈、混合训练",
      icon: TrendingUp,
      color: "bg-chart-3/10 border-chart-3/30"
    },
    {
      name: "工具与代理 (Utils & Agents)",
      files: ["random_agent.py", "state_control.py", "logging.py", "settings.py"],
      description: "辅助工具和随机智能体实现",
      icon: Zap,
      color: "bg-chart-4/10 border-chart-4/30"
    }
  ];

  const optimizations = [
    {
      category: "模型架构",
      items: [
        {
          title: "引入注意力机制",
          description: "在 PokerNetwork 中加入自注意力层，提升对关键信息的捕捉能力",
          impact: "高",
          difficulty: "中"
        },
        {
          title: "代码重构与配置管理",
          description: "将超参数外部化到配置文件，提取基类减少代码冗余",
          impact: "中",
          difficulty: "低"
        }
      ]
    },
    {
      category: "训练与评估",
      items: [
        {
          title: "增强评估体系",
          description: "引入标准基准对比，开发策略可视化工具",
          impact: "高",
          difficulty: "中"
        },
        {
          title: "自动化测试",
          description: "为核心模块编写单元测试和集成测试",
          impact: "中",
          difficulty: "中"
        }
      ]
    },
    {
      category: "部署与应用",
      items: [
        {
          title: "构建交互式 Web 界面",
          description: "开发基于 Web 的对战界面，降低使用门槛",
          impact: "高",
          difficulty: "高"
        }
      ]
    }
  ];

  const keyFeatures = [
    {
      title: "数值稳定性优化",
      description: "通过 LayerNorm、定制化权重初始化和输出裁剪，确保训练过程的稳定性",
      highlight: true
    },
    {
      title: "优先经验回放 (PER)",
      description: "智能地从高信息量的经验中学习，提高训练效率",
      highlight: true
    },
    {
      title: "连续下注大小预测",
      description: "使用神经网络预测连续的下注倍数，而非离散的动作空间",
      highlight: false
    },
    {
      title: "对手建模系统",
      description: "基于 GRU 的循环神经网络编码对手历史动作，预测行为倾向",
      highlight: true
    }
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar Navigation - 20% width */}
      <aside className="w-64 border-r border-border bg-sidebar fixed h-screen">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <GitBranch className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Texas CFR</h1>
              <p className="text-xs text-muted-foreground">架构分析</p>
            </div>
          </div>
          
          <nav className="space-y-2">
            <a href="#overview" className="block px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors text-sm">
              项目概览
            </a>
            <a href="#architecture" className="block px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors text-sm">
              核心架构
            </a>
            <a href="#modules" className="block px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors text-sm">
              模块详解
            </a>
            <a href="#features" className="block px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors text-sm">
              关键特性
            </a>
            <a href="#optimization" className="block px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors text-sm">
              优化建议
            </a>
          </nav>
        </div>
      </aside>

      {/* Main Content - 80% width with left offset */}
      <main className="flex-1 ml-64">
        <ScrollArea className="h-screen">
          <div className="container py-12 space-y-16">
            {/* Hero Section */}
            <motion.section id="overview" {...fadeInUp}>
              <div className="space-y-4 mb-8">
                <Badge variant="outline" className="text-accent border-accent/30">
                  Deep CFR Poker AI
                </Badge>
                <h1 className="text-5xl font-bold tracking-tight">
                  Texas CFR 项目架构分析
                </h1>
                <p className="text-xl text-muted-foreground max-w-3xl">
                  基于深度学习的德州扑克 AI 项目，实现了深度反事实遗憾最小化 (Deep CFR) 算法，
                  并引入对手建模机制，在六人无限制德州扑克中达到高水平竞技能力。
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-6 mt-8">
                {projectStats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className="border-border/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <stat.icon className={`w-5 h-5 ${stat.color}`} />
                          <span className="text-3xl font-bold font-mono">{stat.value}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            <Separator />

            {/* Architecture Section */}
            <motion.section 
              id="architecture"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Network className="w-8 h-8 text-primary" />
                核心架构
              </h2>
              
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>架构层次</CardTitle>
                  <CardDescription>
                    项目采用模块化设计，分为四个主要部分，各司其职，协同工作
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-card border border-border/50">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Brain className="w-4 h-4 text-chart-1" />
                          模型定义层
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          PokerNetwork 神经网络，包含共享特征提取、动作预测和下注大小预测
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-card border border-border/50">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-chart-2" />
                          核心算法层
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          DeepCFRAgent 实现，包含 CFR 遍历、遗憾网络和策略网络
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-card border border-border/50">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Network className="w-4 h-4 text-chart-3" />
                          对手建模层
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          基于 GRU 的对手行为预测，动态适应不同策略
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-card border border-border/50">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-chart-4" />
                          训练流程层
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          多种训练模式：随机对战、自我对弈、混合训练
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.section>

            {/* Modules Section */}
            <motion.section 
              id="modules"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Layers className="w-8 h-8 text-primary" />
                模块详解
              </h2>
              
              <div className="grid grid-cols-2 gap-6">
                {modules.map((module, index) => (
                  <motion.div
                    key={module.name}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className={`border ${module.color} h-full`}>
                      <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                          <module.icon className="w-6 h-6 text-primary" />
                          <CardTitle className="text-lg">{module.name}</CardTitle>
                        </div>
                        <CardDescription>{module.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">关键文件：</p>
                          <div className="flex flex-wrap gap-2">
                            {module.files.map((file) => (
                              <Badge key={file} variant="secondary" className="font-mono text-xs">
                                {file}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* Key Features Section */}
            <motion.section 
              id="features"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Zap className="w-8 h-8 text-primary" />
                关键特性
              </h2>
              
              <div className="grid grid-cols-2 gap-6">
                {keyFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className={`border-border/50 h-full ${feature.highlight ? 'border-l-4 border-l-accent' : ''}`}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          {feature.highlight && (
                            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                          )}
                          {feature.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* Optimization Section */}
            <motion.section 
              id="optimization"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Lightbulb className="w-8 h-8 text-primary" />
                优化建议
              </h2>
              
              <Tabs defaultValue="模型架构" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  {optimizations.map((opt) => (
                    <TabsTrigger key={opt.category} value={opt.category}>
                      {opt.category}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {optimizations.map((opt) => (
                  <TabsContent key={opt.category} value={opt.category} className="space-y-4 mt-6">
                    {opt.items.map((item, index) => (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <Card className="border-border/50">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-lg">{item.title}</CardTitle>
                              <div className="flex gap-2">
                                <Badge 
                                  variant={item.impact === "高" ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  影响: {item.impact}
                                </Badge>
                                <Badge 
                                  variant="outline"
                                  className="text-xs"
                                >
                                  难度: {item.difficulty}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </motion.section>

            {/* Footer */}
            <div className="pt-8 pb-4 text-center text-sm text-muted-foreground">
              <p>基于 texas_cfr 项目的深度分析 · 生成于 2026年1月22日</p>
            </div>
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
