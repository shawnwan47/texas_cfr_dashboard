"""
Deep CFR AI 推理服务
用于加载和运行预训练的 Deep CFR 模型，为 Web 对战系统提供 AI 决策
"""

import sys
import os
import torch
import numpy as np
from typing import Dict, List, Tuple, Optional
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 添加 texas_cfr 项目到路径
TEXAS_CFR_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'texas_cfr')
if os.path.exists(TEXAS_CFR_PATH):
    sys.path.insert(0, TEXAS_CFR_PATH)

try:
    from src.core.model import PokerNetwork, encode_state
    from src.utils.state_control import get_legal_action_types
    import pokers
    TEXAS_CFR_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Failed to import texas_cfr modules: {e}")
    TEXAS_CFR_AVAILABLE = False


class AIModelService:
    """Deep CFR AI 模型推理服务"""
    
    def __init__(self, model_path: Optional[str] = None, device: str = 'cpu'):
        """
        初始化 AI 服务
        
        Args:
            model_path: 预训练模型的路径
            device: 计算设备 ('cpu' 或 'cuda')
        """
        self.device = device
        self.model = None
        self.is_loaded = False
        
        if not TEXAS_CFR_AVAILABLE:
            logger.warning("texas_cfr modules not available, using fallback AI")
            return
        
        # 尝试加载模型
        if model_path:
            self.load_model(model_path)
        else:
            # 尝试加载默认模型
            default_models = [
                os.path.join(TEXAS_CFR_PATH, 'flagship_models', 'first', '1-model.pt'),
                os.path.join(TEXAS_CFR_PATH, 'flagship_models', 'first', 'mixed_checkpoint_iter_11200.pt'),
            ]
            for model_file in default_models:
                if os.path.exists(model_file):
                    self.load_model(model_file)
                    break
    
    def load_model(self, model_path: str) -> bool:
        """
        加载预训练的 Deep CFR 模型
        
        Args:
            model_path: 模型文件路径
            
        Returns:
            是否成功加载
        """
        try:
            if not os.path.exists(model_path):
                logger.error(f"Model file not found: {model_path}")
                return False
            
            # 创建模型实例（针对6人游戏）
            num_players = 6
            input_size = 52 + 52 + 5 + 1 + num_players + num_players + num_players*4 + 1 + 4 + 5
            
            self.model = PokerNetwork(
                input_size=input_size,
                hidden_size=256,
                num_actions=3  # Fold, Check/Call, Raise
            ).to(self.device)
            
            # 加载权重
            checkpoint = torch.load(model_path, map_location=self.device)
            
            # 处理不同的检查点格式
            if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
                self.model.load_state_dict(checkpoint['model_state_dict'])
            elif isinstance(checkpoint, dict) and 'state_dict' in checkpoint:
                self.model.load_state_dict(checkpoint['state_dict'])
            else:
                # 直接加载状态字典
                self.model.load_state_dict(checkpoint)
            
            self.model.eval()
            self.is_loaded = True
            logger.info(f"Successfully loaded model from {model_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.model = None
            self.is_loaded = False
            return False
    
    def get_action(self, game_state: Dict) -> Dict:
        """
        根据游戏状态获取 AI 的决策
        
        Args:
            game_state: 游戏状态字典，包含：
                - player_hand: 玩家手牌 [(rank, suit), ...]
                - community_cards: 社区牌 [(rank, suit), ...]
                - pot: 底池大小
                - player_bet: 玩家当前下注
                - ai_bet: AI 当前下注
                - player_chips: 玩家筹码
                - ai_chips: AI 筹码
                - game_stage: 游戏阶段 (0=preflop, 1=flop, 2=turn, 3=river, 4=showdown)
                
        Returns:
            决策字典，包含：
                - action: 动作类型 ('fold', 'check', 'call', 'raise')
                - amount: 下注金额（仅对 raise 有效）
                - confidence: 置信度 (0-1)
                - explanation: 决策解释
        """
        try:
            # 如果模型未加载，使用启发式决策
            if not self.is_loaded:
                return self._heuristic_decision(game_state)
            
            # 将游戏状态转换为模型输入
            state_tensor = self._convert_game_state_to_tensor(game_state)
            
            if state_tensor is None:
                logger.warning("Failed to convert game state to tensor, using heuristic")
                return self._heuristic_decision(game_state)
            
            # 获取模型预测
            with torch.no_grad():
                regrets, bet_predicts = self.model(state_tensor.unsqueeze(0))
                regrets = regrets[0].cpu().numpy()
                bet_multiplier = bet_predicts[0][0].item()
            
            # 处理合法动作
            legal_actions = self._get_legal_actions(game_state)
            
            # 使用 regret matching 计算策略
            regrets_masked = np.zeros(3)  # 3 个动作
            for action_idx in legal_actions:
                regrets_masked[action_idx] = max(regrets[action_idx], 0)
            
            # 计算策略概率
            if np.sum(regrets_masked) > 0:
                strategy = regrets_masked / np.sum(regrets_masked)
            else:
                strategy = np.ones(3) / 3
            
            # 选择最优动作
            best_action_idx = np.argmax(strategy)
            confidence = float(strategy[best_action_idx])
            
            # 转换动作
            action_names = ['fold', 'check', 'raise']
            action_name = action_names[best_action_idx]
            
            # 计算下注金额（如果是 raise）
            amount = 0
            if action_name == 'raise':
                # 基于 bet_multiplier 和当前底池计算下注
                pot = game_state.get('pot', 0)
                player_bet = game_state.get('player_bet', 0)
                ai_bet = game_state.get('ai_bet', 0)
                ai_chips = game_state.get('ai_chips', 1000)
                
                # 计算需要跟注的金额
                call_amount = max(0, player_bet - ai_bet)
                
                # 基于 bet_multiplier 计算加注金额
                raise_amount = int(pot * abs(bet_multiplier))
                raise_amount = max(10, min(raise_amount, ai_chips - call_amount))
                
                amount = call_amount + raise_amount
            
            return {
                'action': action_name,
                'amount': amount,
                'confidence': confidence,
                'explanation': f'Deep CFR 决策: {action_name} (置信度: {confidence:.2%})',
                'all_action_probs': {
                    'fold': float(strategy[0]),
                    'check': float(strategy[1]),
                    'raise': float(strategy[2]),
                }
            }
            
        except Exception as e:
            logger.error(f"Error in get_action: {e}")
            return self._heuristic_decision(game_state)
    
    def _convert_game_state_to_tensor(self, game_state: Dict) -> Optional[torch.Tensor]:
        """
        将游戏状态转换为模型输入张量
        
        Args:
            game_state: 游戏状态字典
            
        Returns:
            模型输入张量或 None
        """
        try:
            num_players = 6
            encoded = []
            
            # 玩家手牌编码 (52维)
            hand_enc = np.zeros(52)
            for rank, suit in game_state.get('player_hand', []):
                card_idx = self._card_to_index(rank, suit)
                if 0 <= card_idx < 52:
                    hand_enc[card_idx] = 1
            encoded.append(hand_enc)
            
            # 社区牌编码 (52维)
            community_enc = np.zeros(52)
            for rank, suit in game_state.get('community_cards', []):
                card_idx = self._card_to_index(rank, suit)
                if 0 <= card_idx < 52:
                    community_enc[card_idx] = 1
            encoded.append(community_enc)
            
            # 游戏阶段编码 (5维)
            stage_enc = np.zeros(5)
            stage = game_state.get('game_stage', 0)
            if 0 <= stage < 5:
                stage_enc[stage] = 1
            encoded.append(stage_enc)
            
            # 底池大小编码 (1维，归一化)
            initial_stake = game_state.get('initial_stake', 1000)
            if initial_stake <= 0:
                initial_stake = 1000
            pot_enc = [game_state.get('pot', 0) / initial_stake]
            encoded.append(pot_enc)
            
            # 按钮位置编码 (6维)
            button_enc = np.zeros(num_players)
            button = game_state.get('button', 0)
            if 0 <= button < num_players:
                button_enc[button] = 1
            encoded.append(button_enc)
            
            # 当前玩家编码 (6维)
            current_player_enc = np.zeros(num_players)
            current_player = game_state.get('current_player', 0)
            if 0 <= current_player < num_players:
                current_player_enc[current_player] = 1
            encoded.append(current_player_enc)
            
            # 玩家状态编码 (24维: 6 players * 4 attributes)
            player_states = game_state.get('player_states', [])
            for i in range(num_players):
                if i < len(player_states):
                    state = player_states[i]
                    active = 1.0 if state.get('active', False) else 0.0
                    bet = state.get('bet', 0) / initial_stake
                    pot_chips = state.get('pot_chips', 0) / initial_stake
                    stake = state.get('stake', 1000) / initial_stake
                else:
                    active = 0.0
                    bet = 0.0
                    pot_chips = 0.0
                    stake = 0.0
                encoded.append(np.array([active, bet, pot_chips, stake]))
            
            # 最小下注编码 (1维)
            min_bet = game_state.get('min_bet', 0) / initial_stake
            encoded.append([min_bet])
            
            # 合法动作编码 (4维)
            legal_actions = self._get_legal_actions(game_state)
            legal_enc = np.zeros(4)
            for action_idx in legal_actions:
                if action_idx < 4:
                    legal_enc[action_idx] = 1
            encoded.append(legal_enc)
            
            # 前一个动作编码 (5维)
            prev_action_enc = np.zeros(5)
            prev_action = game_state.get('prev_action', 0)
            if 0 <= prev_action < 5:
                prev_action_enc[prev_action] = 1
            encoded.append(prev_action_enc)
            
            # 连接所有编码
            state_array = np.concatenate(encoded)
            state_tensor = torch.FloatTensor(state_array).to(self.device)
            
            return state_tensor
            
        except Exception as e:
            logger.error(f"Error converting game state to tensor: {e}")
            return None
    
    def _card_to_index(self, rank: str, suit: str) -> int:
        """将牌转换为索引 (0-51)"""
        rank_map = {'2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, 
                    '9': 7, '10': 8, 'J': 9, 'Q': 10, 'K': 11, 'A': 12}
        suit_map = {'♠': 0, '♥': 1, '♦': 2, '♣': 3}
        
        rank_idx = rank_map.get(str(rank), 0)
        suit_idx = suit_map.get(str(suit), 0)
        
        return suit_idx * 13 + rank_idx
    
    def _get_legal_actions(self, game_state: Dict) -> List[int]:
        """
        获取合法动作列表
        
        Returns:
            合法动作索引列表 [0=fold, 1=check, 2=raise, ...]
        """
        legal_actions = []
        
        # 始终可以弃牌
        legal_actions.append(0)  # fold
        
        player_bet = game_state.get('player_bet', 0)
        ai_bet = game_state.get('ai_bet', 0)
        ai_chips = game_state.get('ai_chips', 1000)
        
        # 如果 AI 的下注等于玩家的下注，可以过牌
        if ai_bet >= player_bet:
            legal_actions.append(1)  # check
        
        # 如果有筹码，可以跟注或加注
        if ai_chips > 0:
            legal_actions.append(1)  # check/call
            legal_actions.append(2)  # raise
        
        return legal_actions
    
    def _heuristic_decision(self, game_state: Dict) -> Dict:
        """
        使用启发式规则进行决策（当模型不可用时）
        
        Args:
            game_state: 游戏状态字典
            
        Returns:
            决策字典
        """
        player_bet = game_state.get('player_bet', 0)
        ai_bet = game_state.get('ai_bet', 0)
        ai_chips = game_state.get('ai_chips', 1000)
        pot = game_state.get('pot', 0)
        
        # 简单的启发式决策逻辑
        call_amount = max(0, player_bet - ai_bet)
        
        # 如果需要跟注的金额超过筹码的 50%，考虑弃牌
        if call_amount > ai_chips * 0.5:
            return {
                'action': 'fold',
                'amount': 0,
                'confidence': 0.7,
                'explanation': '启发式决策: 下注过大，选择弃牌',
            }
        
        # 如果没有需要跟注的金额，过牌
        if call_amount == 0:
            return {
                'action': 'check',
                'amount': 0,
                'confidence': 0.6,
                'explanation': '启发式决策: 无需跟注，选择过牌',
            }
        
        # 否则跟注
        return {
            'action': 'check',
            'amount': call_amount,
            'confidence': 0.5,
            'explanation': f'启发式决策: 跟注 {call_amount} 筹码',
        }


# 全局 AI 服务实例
_ai_service: Optional[AIModelService] = None


def get_ai_service() -> AIModelService:
    """获取全局 AI 服务实例"""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIModelService()
    return _ai_service


def get_ai_decision(game_state: Dict) -> Dict:
    """获取 AI 决策的便捷函数"""
    service = get_ai_service()
    return service.get_action(game_state)
