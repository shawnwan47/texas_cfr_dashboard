"""
模型缓存和管理模块
用于高效地缓存和管理 Deep CFR 模型，支持多模型加载和版本管理
"""

import os
import hashlib
import json
import logging
from typing import Dict, Optional, List
from datetime import datetime
import threading

logger = logging.getLogger(__name__)


class ModelMetadata:
    """模型元数据"""
    
    def __init__(self, model_path: str, model_name: str = None):
        self.model_path = model_path
        self.model_name = model_name or os.path.basename(model_path)
        self.file_size = os.path.getsize(model_path) if os.path.exists(model_path) else 0
        self.file_hash = self._compute_hash()
        self.loaded_at = None
        self.last_used_at = None
        self.use_count = 0
        self.is_loaded = False
    
    def _compute_hash(self) -> str:
        """计算模型文件的哈希值"""
        if not os.path.exists(self.model_path):
            return ""
        
        sha256_hash = hashlib.sha256()
        with open(self.model_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            'model_name': self.model_name,
            'model_path': self.model_path,
            'file_size': self.file_size,
            'file_hash': self.file_hash,
            'loaded_at': self.loaded_at.isoformat() if self.loaded_at else None,
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None,
            'use_count': self.use_count,
            'is_loaded': self.is_loaded,
        }


class ModelCache:
    """模型缓存管理器"""
    
    def __init__(self, max_models: int = 3, cache_dir: str = None):
        """
        初始化模型缓存
        
        Args:
            max_models: 最多缓存的模型数量
            cache_dir: 缓存目录
        """
        self.max_models = max_models
        self.cache_dir = cache_dir or os.path.join(os.path.dirname(__file__), '.model_cache')
        self.models: Dict[str, Dict] = {}  # {model_name: {metadata, instance}}
        self.lock = threading.RLock()
        
        # 创建缓存目录
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # 加载缓存元数据
        self._load_cache_metadata()
    
    def _load_cache_metadata(self):
        """从磁盘加载缓存元数据"""
        metadata_file = os.path.join(self.cache_dir, 'metadata.json')
        if os.path.exists(metadata_file):
            try:
                with open(metadata_file, 'r') as f:
                    data = json.load(f)
                    for model_name, metadata_dict in data.items():
                        self.models[model_name] = {
                            'metadata': metadata_dict,
                            'instance': None,
                        }
                logger.info(f"Loaded cache metadata for {len(self.models)} models")
            except Exception as e:
                logger.error(f"Failed to load cache metadata: {e}")
    
    def _save_cache_metadata(self):
        """保存缓存元数据到磁盘"""
        metadata_file = os.path.join(self.cache_dir, 'metadata.json')
        try:
            data = {}
            for model_name, model_info in self.models.items():
                if isinstance(model_info['metadata'], ModelMetadata):
                    data[model_name] = model_info['metadata'].to_dict()
                else:
                    data[model_name] = model_info['metadata']
            
            with open(metadata_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save cache metadata: {e}")
    
    def register_model(self, model_path: str, model_name: str = None) -> str:
        """
        注册一个模型
        
        Args:
            model_path: 模型文件路径
            model_name: 模型名称（如果为 None，使用文件名）
            
        Returns:
            模型名称
        """
        with self.lock:
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model file not found: {model_path}")
            
            model_name = model_name or os.path.basename(model_path)
            
            # 检查是否已注册
            if model_name in self.models:
                logger.info(f"Model {model_name} already registered")
                return model_name
            
            # 检查是否超过最大模型数
            if len(self.models) >= self.max_models:
                self._evict_least_used_model()
            
            # 注册新模型
            metadata = ModelMetadata(model_path, model_name)
            self.models[model_name] = {
                'metadata': metadata,
                'instance': None,
            }
            
            self._save_cache_metadata()
            logger.info(f"Registered model: {model_name}")
            return model_name
    
    def _evict_least_used_model(self):
        """驱逐最少使用的模型"""
        if not self.models:
            return
        
        # 找到最少使用的模型
        least_used_model = min(
            self.models.items(),
            key=lambda x: (x[1]['metadata'].use_count, x[1]['metadata'].last_used_at or datetime.min)
        )
        
        model_name = least_used_model[0]
        logger.info(f"Evicting model: {model_name}")
        del self.models[model_name]
    
    def get_model_metadata(self, model_name: str) -> Optional[Dict]:
        """获取模型元数据"""
        with self.lock:
            if model_name not in self.models:
                return None
            
            metadata = self.models[model_name]['metadata']
            if isinstance(metadata, ModelMetadata):
                return metadata.to_dict()
            return metadata
    
    def list_models(self) -> List[Dict]:
        """列出所有已注册的模型"""
        with self.lock:
            models = []
            for model_name, model_info in self.models.items():
                metadata = model_info['metadata']
                if isinstance(metadata, ModelMetadata):
                    models.append(metadata.to_dict())
                else:
                    models.append(metadata)
            return models
    
    def update_model_usage(self, model_name: str):
        """更新模型的使用统计"""
        with self.lock:
            if model_name in self.models:
                metadata = self.models[model_name]['metadata']
                if isinstance(metadata, ModelMetadata):
                    metadata.last_used_at = datetime.now()
                    metadata.use_count += 1
                    self._save_cache_metadata()
    
    def mark_model_loaded(self, model_name: str):
        """标记模型已加载"""
        with self.lock:
            if model_name in self.models:
                metadata = self.models[model_name]['metadata']
                if isinstance(metadata, ModelMetadata):
                    metadata.is_loaded = True
                    metadata.loaded_at = datetime.now()
                    self._save_cache_metadata()
    
    def get_cache_stats(self) -> Dict:
        """获取缓存统计信息"""
        with self.lock:
            total_size = sum(
                model_info['metadata'].file_size 
                for model_info in self.models.values()
                if isinstance(model_info['metadata'], ModelMetadata)
            )
            
            loaded_count = sum(
                1 for model_info in self.models.values()
                if isinstance(model_info['metadata'], ModelMetadata) and model_info['metadata'].is_loaded
            )
            
            return {
                'total_models': len(self.models),
                'loaded_models': loaded_count,
                'total_cache_size': total_size,
                'max_models': self.max_models,
            }


class ModelPool:
    """模型对象池，用于复用模型实例"""
    
    def __init__(self, cache: ModelCache):
        self.cache = cache
        self.models: Dict[str, object] = {}  # {model_name: model_instance}
        self.lock = threading.RLock()
    
    def get_model(self, model_name: str) -> Optional[object]:
        """获取模型实例"""
        with self.lock:
            if model_name in self.models:
                self.cache.update_model_usage(model_name)
                return self.models[model_name]
            return None
    
    def set_model(self, model_name: str, model_instance: object):
        """设置模型实例"""
        with self.lock:
            self.models[model_name] = model_instance
            self.cache.mark_model_loaded(model_name)
    
    def remove_model(self, model_name: str):
        """移除模型实例"""
        with self.lock:
            if model_name in self.models:
                del self.models[model_name]
    
    def clear(self):
        """清空所有模型实例"""
        with self.lock:
            self.models.clear()


# 全局缓存实例
_model_cache: Optional[ModelCache] = None
_model_pool: Optional[ModelPool] = None


def get_model_cache() -> ModelCache:
    """获取全局模型缓存实例"""
    global _model_cache
    if _model_cache is None:
        _model_cache = ModelCache(max_models=3)
    return _model_cache


def get_model_pool() -> ModelPool:
    """获取全局模型对象池实例"""
    global _model_pool
    if _model_pool is None:
        _model_pool = ModelPool(get_model_cache())
    return _model_pool
