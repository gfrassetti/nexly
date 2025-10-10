import { createClient, RedisClientType } from 'redis';
import logger from '../utils/logger';
import { config } from '../config';

class CacheService {
  private client: RedisClientType | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    try {
      // Si no hay URL de Redis configurada, funcionar sin cache
      if (!config.redisUrl) {
        logger.warn('Redis URL not configured, running without cache');
        this.isConnected = false;
        return;
      }

      this.client = createClient({
        url: config.redisUrl,
        socket: {
          connectTimeout: 5000
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      logger.warn('Failed to connect to Redis, running without cache:', error);
      this.isConnected = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  private ensureConnected(): boolean {
    return this.client !== null && this.isConnected;
  }

  // Cache para estadísticas del dashboard
  async getStats(userId: string): Promise<any | null> {
    if (!this.ensureConnected()) return null;
    
    try {
      const key = `stats:dashboard:${userId}`;
      const cached = await this.client!.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting stats from cache:', error);
      return null;
    }
  }

  async setStats(userId: string, stats: any, ttlSeconds = 900): Promise<void> {
    if (!this.ensureConnected()) return;
    
    try {
      const key = `stats:dashboard:${userId}`;
      await this.client!.setEx(key, ttlSeconds, JSON.stringify(stats));
    } catch (error) {
      logger.error('Error setting stats to cache:', error);
    }
  }

  // Cache para contactos
  async getContacts(userId: string, integrationId?: string): Promise<any | null> {
    if (!this.ensureConnected()) return null;
    
    try {
      const key = integrationId 
        ? `contacts:${userId}:${integrationId}`
        : `contacts:${userId}:all`;
      const cached = await this.client!.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting contacts from cache:', error);
      return null;
    }
  }

  async setContacts(userId: string, contacts: any[], ttlSeconds = 600, integrationId?: string): Promise<void> {
    if (!this.ensureConnected()) return;
    
    try {
      const key = integrationId 
        ? `contacts:${userId}:${integrationId}`
        : `contacts:${userId}:all`;
      await this.client!.setEx(key, ttlSeconds, JSON.stringify(contacts));
    } catch (error) {
      logger.error('Error setting contacts to cache:', error);
    }
  }

  // Invalidar cache cuando hay cambios
  async invalidateUserCache(userId: string): Promise<void> {
    if (!this.ensureConnected()) return;
    
    try {
      const pattern = `*${userId}*`;
      const keys = await this.client!.keys(pattern);
      if (keys.length > 0) {
        await this.client!.del(keys);
      }
    } catch (error) {
      logger.error('Error invalidating user cache:', error);
    }
  }

  // Health check
  async ping(): Promise<boolean> {
    if (!this.ensureConnected()) return false;
    
    try {
      const result = await this.client!.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();
export default cacheService;
