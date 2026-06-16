import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

export interface SupersetTokenCache {
  accessToken: string;
  refreshToken: string;
}

/**
 * Access token Superset hết hạn sau 15 phút → cache 14 phút để có buffer proactive refresh.
 * Guest token KHÔNG được cache — mỗi lần SDK gọi đều issue mới từ Superset.
 */
const ACCESS_TOKEN_TTL_SECONDS = 14 * 60; // 14 phút

/**
 * Khi TTL còn ít hơn ngưỡng này (giây), coi như "sắp hết hạn"
 * và thực hiện proactive refresh thay vì dùng token cũ.
 *
 * 120 giây = 2 phút → đủ thời gian cho SDK gọi thêm 1 lần refresh guest token
 * trước khi access token thực sự hết hạn ở phút 15.
 */
const PROACTIVE_REFRESH_THRESHOLD_SECONDS = 2 * 60;

@Injectable()
export class SupersetCacheService {
  private readonly logger = new Logger(SupersetCacheService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // ─── Key builder ──────────────────────────────────────────────────────────

  private accessKey(username: string): string {
    return `superset:access:${username}`;
  }

  // ─── Access / CSRF token ──────────────────────────────────────────────────

  /**
   * Lưu access token va refresh token vào Redis.
   * TTL: 14 phút (access token thực tế hết hạn sau 15 phút).
   */
  async setAccessTokens(
    username: string,
    tokens: SupersetTokenCache,
  ): Promise<void> {
    const key = this.accessKey(username);
    await this.redis.set(key, JSON.stringify(tokens), 'EX', ACCESS_TOKEN_TTL_SECONDS);

    this.logger.debug(`[Cache] SET ${key} TTL=${ACCESS_TOKEN_TTL_SECONDS}s`);
  }

  /**
   * Đọc access token từ cache.
   * Trả về null nếu chưa có hoặc đã hết hạn.
   */
  async getAccessTokens(username: string): Promise<SupersetTokenCache | null> {
    const key = this.accessKey(username);
    const raw = await this.redis.get(key);
    if (!raw) return null;

    return JSON.parse(raw) as SupersetTokenCache;
  }

  /**
   * Kiểm tra access token còn trong vùng "sắp hết hạn" không.
   *
   * Trả về true khi TTL còn lại ≤ PROACTIVE_REFRESH_THRESHOLD_SECONDS (2 phút).
   * Điều này xảy ra ở khoảng phút 13, đủ sớm để refresh trước khi SDK gọi
   * guest token lần thứ 4 (lần đó access token đã thực sự hết hạn).
   *
   * Trả về false nếu key không tồn tại — caller phải login mới.
   */
  async isAccessTokenNearExpiry(username: string): Promise<boolean> {
    const key = this.accessKey(username);
    const ttl = await this.redis.ttl(key); // -2 = không tồn tại, -1 = không có TTL
    if (ttl < 0) return false;

    return ttl <= PROACTIVE_REFRESH_THRESHOLD_SECONDS;
  }

  /**
   * Xoá access token (dùng khi refresh thất bại, buộc re-login).
   */
  async deleteAccessTokens(username: string): Promise<void> {
    await this.redis.del(this.accessKey(username));
  }
}