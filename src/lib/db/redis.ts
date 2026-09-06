import Redis from 'ioredis';
import { EventEmitter } from 'events';

const mockEventBus = new EventEmitter();

class MockRedis {
  private store: Map<string, string> = new Map();

  async set(key: string, value: string, ex?: 'EX', time?: number) {
    this.store.set(key, value);
    if (ex === 'EX' && time) {
      setTimeout(() => {
        this.store.delete(key);
      }, time * 1000);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async del(key: string) {
    this.store.delete(key);
  }

  // Pub/Sub Mock
  async publish(channel: string, message: string) {
    mockEventBus.emit('message', channel, message);
    return 1;
  }

  async subscribe(channel: string) {
    return 1;
  }

  on(event: string, listener: (...args: any[]) => void) {
    mockEventBus.on(event, listener);
    return this;
  }

  off(event: string, listener: (...args: any[]) => void) {
    mockEventBus.off(event, listener);
    return this;
  }
}

const getRedisClient = () => {
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL);
  }
  return new MockRedis() as unknown as Redis;
};

// Default client for set/get
export const redis = getRedisClient();

// Dedicated clients for Pub/Sub (ioredis requires separate clients for sub)
export const redisPublisher = getRedisClient();
export const redisSubscriber = getRedisClient();
