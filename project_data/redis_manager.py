"""
Simple Redis session and user management for Recipe Voice Assistant
"""
import redis
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import os
from dotenv import load_dotenv

load_dotenv()

class RedisManager:
    def __init__(self):
        # Try to connect to Redis, fallback to in-memory dict if not available
        try:
            self.redis_client = redis.Redis(
                host=os.getenv('REDIS_HOST', 'localhost'),
                port=int(os.getenv('REDIS_PORT', 6379)),
                decode_responses=True,
                socket_connect_timeout=2
            )
            # Test connection
            self.redis_client.ping()
            self.use_redis = True
            print("✅ Redis connected successfully")
        except (redis.ConnectionError, redis.TimeoutError):
            print("⚠️ Redis not available, using in-memory storage")
            self.redis_client = {}
            self.use_redis = False
    
    def _get_daily_key(self, user: str) -> str:
        """Generate daily key for user data that resets at midnight"""
        today = datetime.now().strftime('%Y-%m-%d')
        return f"user:{user}:daily:{today}"
    
    def _get_user_key(self, user: str) -> str:
        """Generate persistent user key"""
        return f"user:{user}:profile"
    
    async def get_user_daily_data(self, user: str) -> Dict[str, Any]:
        """Get user's daily data (calories, meals, etc.)"""
        key = self._get_daily_key(user)
        
        if self.use_redis:
            data = self.redis_client.get(key)
            if data:
                return json.loads(data)
        else:
            data = self.redis_client.get(key)
            if data:
                return data
        
        # Return default daily data
        default_data = {
            'date': datetime.now().strftime('%Y-%m-%d'),
            'calories_budget': 1000,
            'calories_consumed': 0,
            'meals': [],
            'recipes_created': [],
            'last_updated': datetime.now().isoformat()
        }
        
        await self.set_user_daily_data(user, default_data)
        return default_data
    
    async def set_user_daily_data(self, user: str, data: Dict[str, Any]):
        """Set user's daily data"""
        key = self._get_daily_key(user)
        data['last_updated'] = datetime.now().isoformat()
        
        if self.use_redis:
            # Set with expiration at end of day
            tomorrow = datetime.now().replace(hour=23, minute=59, second=59) + timedelta(days=1)
            expire_seconds = int((tomorrow - datetime.now()).total_seconds())
            self.redis_client.setex(key, expire_seconds, json.dumps(data))
        else:
            self.redis_client[key] = data
    
    async def get_user_profile(self, user: str) -> Dict[str, Any]:
        """Get user's persistent profile data"""
        key = self._get_user_key(user)
        
        if self.use_redis:
            data = self.redis_client.get(key)
            if data:
                return json.loads(data)
        else:
            data = self.redis_client.get(key)
            if data:
                return data
        
        # Return default profile
        default_profile = {
            'username': user,
            'created': datetime.now().isoformat(),
            'preferences': {
                'voice': 'ash',
                'language': 'en',
                'daily_calorie_goal': 1000
            },
            'stats': {
                'total_recipes': 0,
                'days_active': 0,
                'favorite_ingredients': []
            }
        }
        
        await self.set_user_profile(user, default_profile)
        return default_profile
    
    async def set_user_profile(self, user: str, profile: Dict[str, Any]):
        """Set user's persistent profile data"""
        key = self._get_user_key(user)
        
        if self.use_redis:
            self.redis_client.set(key, json.dumps(profile))
        else:
            self.redis_client[key] = profile
    
    async def add_calories_consumed(self, user: str, calories: int, meal_info: Dict[str, Any]):
        """Add consumed calories to user's daily data"""
        daily_data = await self.get_user_daily_data(user)
        daily_data['calories_consumed'] += calories
        daily_data['meals'].append({
            'timestamp': datetime.now().isoformat(),
            'calories': calories,
            'info': meal_info
        })
        await self.set_user_daily_data(user, daily_data)
        return daily_data
    
    async def add_recipe_created(self, user: str, recipe_id: str, recipe_name: str):
        """Add created recipe to user's daily data"""
        daily_data = await self.get_user_daily_data(user)
        daily_data['recipes_created'].append({
            'timestamp': datetime.now().isoformat(),
            'recipe_id': recipe_id,
            'recipe_name': recipe_name
        })
        await self.set_user_daily_data(user, daily_data)
        
        # Update profile stats
        profile = await self.get_user_profile(user)
        profile['stats']['total_recipes'] += 1
        await self.set_user_profile(user, profile)
        
        return daily_data
    
    async def get_calories_remaining(self, user: str) -> int:
        """Get remaining calories for the day"""
        daily_data = await self.get_user_daily_data(user)
        return max(0, daily_data['calories_budget'] - daily_data['calories_consumed'])
    
    def close(self):
        """Close Redis connection"""
        if self.use_redis and hasattr(self.redis_client, 'close'):
            self.redis_client.close()

# Global instance
redis_manager = RedisManager()
