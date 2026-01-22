import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spade, Heart, Diamond, Club, Loader2, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";

type GameStatus = "waiting" | "playing" | "betting" | "showdown" | "finished";
type Suit = "♠" | "♥" | "♦" | "♣";

interface Card {
  rank: string;
  suit: Suit;
}

interface GameState {
  status: GameStatus;
  currentPlayer: number;
  pot: number;
  communityCards: Card[];
  playerHand: Card[];
  playerChips: number;
  playerBet: number;
  aiChips: number;
  aiBet: number;
  gameHistory: string[];
}

const SUITS: Record<Suit, React.ReactNode> = {
  "♠": <Spade className="w-4 h-4" />,
  "♥": <Heart className="w-4 h-4 text-red-500" />,
  "♦": <Diamond className="w-4 h-4 text-red-500" />,
  "♣": <Club className="w-4 h-4" />,
};

const CardDisplay = ({ card, faceDown = false }: { card?: Card; faceDown?: boolean }) => {
  if (faceDown || !card) {
    return (
      <div className="w-16 h-24 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-400 flex items-center justify-center">
        <div className="text-white text-xs font-bold">♠♥♦♣</div>
      </div>
    );
  }

  const isRed = card.suit === "♥" || card.suit === "♦";

  return (
    <div className={`w-16 h-24 rounded-lg border-2 flex flex-col items-center justify-center font-bold ${
      isRed ? "bg-white border-red-500 text-red-500" : "bg-white border-black text-black"
    }`}>
      <div className="text-lg">{card.rank}</div>
      <div className="text-xl">{card.suit}</div>
    </div>
  );
};

export default function PokerGame() {
  const [gameState, setGameState] = useState<GameState>({
    status: "waiting",
    currentPlayer: 0,
    pot: 0,
    communityCards: [],
    playerHand: [],
    playerChips: 1000,
    playerBet: 0,
    aiChips: 1000,
    aiBet: 0,
    gameHistory: [],
  });

  const [betAmount, setBetAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // 游戏初始化
  const startGame = async () => {
    setIsLoading(true);
    try {
      // 这里会调用后端 API 初始化游戏
      setGameState((prev) => ({
        ...prev,
        status: "playing",
        playerHand: [
          { rank: "K", suit: "♠" },
          { rank: "Q", suit: "♥" },
        ],
        communityCards: [],
        pot: 20,
        playerBet: 10,
        aiBet: 10,
        gameHistory: ["游戏开始"],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFold = () => {
    setGameState((prev) => ({
      ...prev,
      status: "finished",
      gameHistory: [...prev.gameHistory, "你选择弃牌。AI 赢得底池。"],
    }));
  };

  const handleCheck = () => {
    setGameState((prev) => ({
      ...prev,
      status: "betting",
      gameHistory: [...prev.gameHistory, "你选择过牌。"],
    }));
  };

  const handleBet = () => {
    if (betAmount <= 0 || betAmount > gameState.playerChips) return;
    
    setGameState((prev) => ({
      ...prev,
      playerChips: prev.playerChips - betAmount,
      playerBet: prev.playerBet + betAmount,
      pot: prev.pot + betAmount,
      gameHistory: [...prev.gameHistory, `你下注 ${betAmount} 筹码。`],
    }));
    setBetAmount(0);
  };

  const handleCall = () => {
    const callAmount = gameState.aiBet - gameState.playerBet;
    if (callAmount <= 0 || callAmount > gameState.playerChips) return;

    setGameState((prev) => ({
      ...prev,
      playerChips: prev.playerChips - callAmount,
      playerBet: prev.aiBet,
      pot: prev.pot + callAmount,
      gameHistory: [...prev.gameHistory, `你跟注 ${callAmount} 筹码。`],
    }));
  };

  const handleRaise = () => {
    const raiseAmount = gameState.aiBet - gameState.playerBet + betAmount;
    if (raiseAmount <= 0 || raiseAmount > gameState.playerChips) return;

    setGameState((prev) => ({
      ...prev,
      playerChips: prev.playerChips - raiseAmount,
      playerBet: gameState.aiBet + betAmount,
      pot: prev.pot + raiseAmount,
      gameHistory: [...prev.gameHistory, `你加注 ${betAmount} 筹码。`],
    }));
    setBetAmount(0);
  };

  const resetGame = () => {
    setGameState({
      status: "waiting",
      currentPlayer: 0,
      pot: 0,
      communityCards: [],
      playerHand: [],
      playerChips: 1000,
      playerBet: 0,
      aiChips: 1000,
      aiBet: 0,
      gameHistory: [],
    });
    setBetAmount(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">德州扑克 vs AI</h1>
          <p className="text-green-200">与 Deep CFR AI 对战</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 主游戏区域 */}
          <div className="lg:col-span-2">
            {/* 牌桌 */}
            <Card className="bg-green-800/50 border-green-600 mb-6">
              <CardContent className="p-8">
                {/* AI 玩家区域 */}
                <div className="flex justify-between items-start mb-12">
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mx-auto mb-2">
                      <span className="text-white font-bold text-2xl">AI</span>
                    </div>
                    <p className="text-white font-semibold">Deep CFR</p>
                    <p className="text-green-300">${gameState.aiChips}</p>
                    {gameState.aiBet > 0 && (
                      <Badge className="mt-2 bg-red-600">下注: ${gameState.aiBet}</Badge>
                    )}
                  </motion.div>

                  {/* AI 的牌（背面） */}
                  <div className="flex gap-2">
                    <CardDisplay faceDown />
                    <CardDisplay faceDown />
                  </div>
                </div>

                {/* 社区牌 */}
                <div className="text-center mb-12">
                  <p className="text-green-300 text-sm mb-3">社区牌</p>
                  <div className="flex justify-center gap-2 mb-4">
                    {gameState.communityCards.length === 0 ? (
                      <>
                        <CardDisplay faceDown />
                        <CardDisplay faceDown />
                        <CardDisplay faceDown />
                        <CardDisplay faceDown />
                        <CardDisplay faceDown />
                      </>
                    ) : (
                      gameState.communityCards.map((card, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.5, rotateY: 180 }}
                          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          <CardDisplay card={card} />
                        </motion.div>
                      ))
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-green-300 text-sm">底池</p>
                    <p className="text-white text-2xl font-bold">${gameState.pot}</p>
                  </div>
                </div>

                {/* 玩家区域 */}
                <div className="flex justify-between items-start">
                  {/* 玩家的牌 */}
                  <div className="flex gap-2">
                    {gameState.playerHand.map((card, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <CardDisplay card={card} />
                      </motion.div>
                    ))}
                  </div>

                  {/* 玩家信息 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-2">
                      <span className="text-white font-bold text-2xl">你</span>
                    </div>
                    <p className="text-white font-semibold">玩家</p>
                    <p className="text-green-300">${gameState.playerChips}</p>
                    {gameState.playerBet > 0 && (
                      <Badge className="mt-2 bg-blue-600">下注: ${gameState.playerBet}</Badge>
                    )}
                  </motion.div>
                </div>
              </CardContent>
            </Card>

            {/* 游戏控制 */}
            {gameState.status !== "finished" && gameState.status !== "waiting" && (
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">你的行动</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 下注金额滑块 */}
                  <div className="space-y-2">
                    <label className="text-sm text-gray-300">下注金额: ${betAmount}</label>
                    <Slider
                      value={[betAmount]}
                      onValueChange={(value) => setBetAmount(value[0])}
                      max={gameState.playerChips}
                      step={10}
                      className="w-full"
                    />
                  </div>

                  {/* 行动按钮 */}
                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      onClick={handleFold}
                      variant="destructive"
                      disabled={isLoading}
                      className="w-full"
                    >
                      弃牌
                    </Button>
                    <Button
                      onClick={handleCheck}
                      variant="outline"
                      disabled={isLoading}
                      className="w-full"
                    >
                      过牌
                    </Button>
                    <Button
                      onClick={handleCall}
                      disabled={isLoading || gameState.aiBet === gameState.playerBet}
                      className="w-full"
                    >
                      跟注
                    </Button>
                    <Button
                      onClick={handleRaise}
                      disabled={isLoading || betAmount === 0}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      加注
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 游戏开始/重置按钮 */}
            {gameState.status === "waiting" && (
              <Button
                onClick={startGame}
                disabled={isLoading}
                className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    初始化游戏...
                  </>
                ) : (
                  "开始游戏"
                )}
              </Button>
            )}

            {gameState.status === "finished" && (
              <Button
                onClick={resetGame}
                className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                新游戏
              </Button>
            )}
          </div>

          {/* 侧边栏 - 游戏信息和历史 */}
          <div className="space-y-4">
            {/* 游戏状态 */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">游戏状态</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">状态:</span>
                  <Badge variant="outline" className="text-white">
                    {gameState.status === "waiting" && "等待开始"}
                    {gameState.status === "playing" && "游戏中"}
                    {gameState.status === "betting" && "下注中"}
                    {gameState.status === "showdown" && "摊牌"}
                    {gameState.status === "finished" && "已结束"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">底池:</span>
                  <span className="text-green-400 font-semibold">${gameState.pot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">你的筹码:</span>
                  <span className="text-blue-400 font-semibold">${gameState.playerChips}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">AI 筹码:</span>
                  <span className="text-purple-400 font-semibold">${gameState.aiChips}</span>
                </div>
              </CardContent>
            </Card>

            {/* 游戏历史 */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">游戏历史</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {gameState.gameHistory.length === 0 ? (
                    <p className="text-gray-500 text-xs">暂无历史记录</p>
                  ) : (
                    gameState.gameHistory.map((event, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-xs text-gray-300 border-l-2 border-green-600 pl-2 py-1"
                      >
                        {event}
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 游戏规则 */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">游戏规则</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="rules" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                    <TabsTrigger value="rules">规则</TabsTrigger>
                    <TabsTrigger value="hands">手牌</TabsTrigger>
                  </TabsList>
                  <TabsContent value="rules" className="text-xs text-gray-300 space-y-2">
                    <p>• 每位玩家初始 1000 筹码</p>
                    <p>• 小盲注 5, 大盲注 10</p>
                    <p>• 最高可下注 3 倍底池</p>
                    <p>• AI 使用 Deep CFR 算法</p>
                  </TabsContent>
                  <TabsContent value="hands" className="text-xs text-gray-300 space-y-1">
                    <p>皇家同花顺 &gt; 同花顺 &gt; 四条</p>
                    <p>&gt; 葫芦 &gt; 同花 &gt; 顺子</p>
                    <p>&gt; 三条 &gt; 两对 &gt; 一对</p>
                    <p>&gt; 高牌</p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
