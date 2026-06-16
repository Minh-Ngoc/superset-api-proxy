import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { SupersetLoginDto } from './dto/superset-login.dto';
import {
  SupersetRequestOptions,
  SupersetEmbeddedResponse,
  SupersetEmbedEnableResponse,
  SupersetDashboardDataset,
  SupersetDashboardListItem,
  SupersetDashboardListResponse,
} from './superset.interface';
import { GetGuestTokenDto } from './dto/get-guest-token.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import {
  SupersetCacheService,
  SupersetTokenCache,
} from './superset-cache.service';

/** Page size used when paginating /security/users/ */
const USERS_PAGE_SIZE = 100;

@Injectable()
export class SupersetService {
  private readonly logger = new Logger(SupersetService.name);
  private readonly baseURL: string;
  private client: AxiosInstance;

  private salemanAccountSuperset: { username: string; password: string } = {
    username: '',
    password: '',
  };
  private PHONE_NUMBER: string = '0909555888';
  private DATASETS_DASHBOARD: { table_name: string; id: number }[] = [
    { table_name: 'RLS - 1.1.1 GMV (Day)', id: 37 },
    { table_name: 'RLS - 1.2.1. Commission (Day)', id: 38 },
    { table_name: 'RLS - 1.3.1. Services Fee (Day)', id: 39 },
    { table_name: 'RLS - 2.1', id: 40 },
    { table_name: 'RLS - 3.1. Agent Performance Detail', id: 41 },
    { table_name: 'RLS - 4.1. Salesman Performance Detail', id: 42 },
    { table_name: 'RLS - 5.1. Merchant Onboarding Over Time', id: 43 },
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenCache: SupersetCacheService,
  ) {
    this.baseURL = this.configService.getOrThrow<string>('SUPERSET_BASE_URL');
    this.salemanAccountSuperset = {
      username: this.configService.getOrThrow('SUPERSET_SALEMAN_USERNAME'),
      password: this.configService.getOrThrow('SUPERSET_SALEMAN_PASSWORD'),
    }

    this.client = this.createClient();
  }

  // ─── Core HTTP helper ────────────────────────────────────────────────────

  createClient() {
    const jar = new CookieJar();
    const client = wrapper(
      axios.create({
        baseURL: this.baseURL,
        withCredentials: true,
      }),
    );
    (client.defaults as any).jar = jar;
    return client;
  }

  private async request<T = unknown>(
    options: SupersetRequestOptions,
  ): Promise<T> {
    const method = options.method?.toLowerCase() ?? 'get';
    const suffix = options.hiddenSuffix ? '' : '/api/v1';

    const config: AxiosRequestConfig = {
      url: `${this.baseURL}${suffix}${options.url}`,
      params: options.params,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: options.timeout ?? 10_000,
    };

    try {
      let response: any;

      if (method === 'get') {
        response = await this.client.get(config.url!, {
          params: config.params,
          headers: config.headers,
          timeout: config.timeout,
        });
      } else if (method === 'post') {
        response = await this.client.post(config.url!, options.data ?? {}, {
          headers: config.headers,
          timeout: config.timeout,
        });
      } else {
        throw new InternalServerErrorException(`Unsupported method: ${method}`);
      }

      return response?.data;
    } catch (error: any) {
      if (error?.response?.status === 401) throw new UnauthorizedException();

      const message =
        error?.response?.data?.message ??
        error?.response?.data?.errors?.[0]?.message ??
        error?.message ??
        'Unknown error';

      this.logger.error(
        `[Superset] ${options.method} ${options.url} failed: ${message}`,
        error?.stack,
      );

      throw new InternalServerErrorException(
        `Superset request failed: ${message}`,
      );
    }
  }

  // ─── Auth helpers (raw Superset calls) ──────────────────────────────────

  async fetchRefreshToken(dto: RefreshTokenDto) {
    const response = await this.request<{ access_token: string }>({
      method: 'POST',
      url: '/security/refresh',
      headers: { Authorization: `Bearer ${dto?.refreshToken}` },
    });

    if (!response?.access_token) {
      throw new UnauthorizedException('Không thể refresh token Superset');
    }

    return { accessToken: response?.access_token };
  }

  private async fetchAccessToken(
    username: string,
    password: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const response = await this.request<{
      access_token: string;
      refresh_token: string;
    }>({
      method: 'POST',
      url: '/security/login',
      data: { username, password, provider: 'db', refresh: true },
    });

    if (!response?.access_token) {
      throw new UnauthorizedException('Đăng nhập Superset thất bại');
    }

    return response;
  }

  private async fetchCsrfToken(accessToken: string): Promise<{ token: string }> {
    const response = await this.request<any>({
      method: 'GET',
      url: '/security/csrf_token',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response?.result) {
      throw new InternalServerErrorException(
        'Không thể lấy CSRF token từ Superset',
      );
    }

    return { token: response.result };
  }

  async fetchGuestToken(
    payload: GetGuestTokenDto,
    headers: CurrentUserPayload,
  ): Promise<string> {
    const body = {
      resources: [{ id: payload.embeddedId, type: 'dashboard' }],
      rls: payload.rlsRules ?? [],
      user: { username: payload.username },
    };

    const response = await this.request<{ token: string }>({
      method: 'POST',
      url: '/security/guest_token',
      data: body,
      headers: {
        Authorization: `Bearer ${headers.accessToken}`,
        'X-CSRFToken': headers.csrfToken,
        Referer: this.baseURL,
        Origin: this.baseURL,
      },
    });

    if (!response?.token) {
      throw new InternalServerErrorException(
        'Không thể lấy Guest token từ Superset',
      );
    }

    return response.token;
  }

  // ─── Cached auth helpers ─────────────────────────────────────────────────

  /**
   * Login Superset và lưu kết quả vào Redis.
   * TTL: 14 phút (access token thực tế hết hạn sau 15 phút).
   */
  async login(dto: SupersetLoginDto) {
    const { username, password } = dto;
    this.logger.log(`Auth flow started: user=${username}`);

    const token = await this.fetchAccessToken(username, password);
    const csrfRes = await this.fetchCsrfToken(token.access_token);

    const cache: SupersetTokenCache = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
    };

    await this.tokenCache.setAccessTokens(username, cache);

    this.logger.log(`Auth flow completed: user=${username}`);

    return {
      csrfToken: csrfRes.token,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
    };
  }

  /**
   * Lấy access token hợp lệ từ Redis (có cache).
   *
   * Logic:
   * 1. Không có cache → login mới → lưu cache.
   * 2. Cache còn hạn nhưng sắp hết (TTL ≤ 2 phút, tức ~phút 13) → proactive refresh
   *    bằng refresh token → cập nhật cache.
   * 3. Cache còn hạn thoải mái → trả về ngay.
   *
   * Nhờ đó, khi @superset-ui/embedded-sdk gọi refreshGuestToken lần thứ 4
   * (phút 15-20), access token đã được gia hạn sẵn và không bị 401.
   */
  private async getAccessTokenCached(username: string, password: string): Promise<SupersetTokenCache> {
    const cached = await this.tokenCache.getAccessTokens(username);

    // Case 1: Không có cache → login mới
    if (!cached) {
      this.logger.log(`[Cache] MISS access token for ${username}, logging in`);
      return this.login({ username, password });
    }

    // Case 2: Cache sắp hết hạn (phút 13+) → proactive refresh
    const nearExpiry = await this.tokenCache.isAccessTokenNearExpiry(username);
    if (nearExpiry) {
      this.logger.log(
        `[Cache] Access token for ${username} near expiry — proactive refresh`,
      );
      return this.refreshAccessTokenCached(username, cached.refreshToken, password);
    }

    // Case 3: Cache còn tốt
    this.logger.debug(`[Cache] HIT access token for ${username}`);
    return cached;
  }

  /**
   * Refresh access token dùng refresh token.
   * Nếu refresh thất bại (refresh token cũng hết hạn) → xoá cache → login mới.
   *
   * Sau khi refresh, CSRF token cũng phải được lấy lại vì nó bind với access token.
   */
  private async refreshAccessTokenCached(
    username: string,
    refreshToken: string,
    password: string,
  ): Promise<SupersetTokenCache> {
    try {
      const refreshed = await this.request<{ access_token: string }>({
        method: 'POST',
        url: '/security/refresh',
        headers: { Authorization: `Bearer ${refreshToken}` },
      });

      if (!refreshed?.access_token) {
        throw new Error('Empty access_token from refresh endpoint');
      }

      // CSRF token phải lấy lại vì nó gắn với access token mới
      const csrfRes = await this.fetchCsrfToken(refreshed.access_token);

      const updated: SupersetTokenCache = {
        accessToken: refreshed.access_token,
        refreshToken,           // refresh token không thay đổi
      };

      await this.tokenCache.setAccessTokens(username, updated);

      this.logger.log(`[Cache] Access token refreshed and cached for ${username}`);
      return updated;
    } catch (err: any) {
      this.logger.warn(
        `[Cache] Refresh token failed for ${username}: ${err?.message} — falling back to login`,
      );

      // Refresh token cũng hết hạn → xoá cache cũ → login lại từ đầu
      await this.tokenCache.deleteAccessTokens(username);
      return this.login({ username, password });
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Lấy guest token — issue mới mỗi lần SDK gọi, không cache.
   *
   * Chỉ access token + csrf token được cache trong Redis:
   *   Phút  0–13: access token còn hạn → lấy từ Redis → issue guest token mới.
   *   Phút 13–15: access token sắp hết hạn → proactive refresh bằng refresh token
   *               → lưu access token mới vào Redis → issue guest token mới.
   *   Phút 15+:   access token cũ đã hết hạn, nhưng đã được refresh ở bước trên
   *               → không còn bị 401.
   */
  async getGuestToken(payload: GetGuestTokenDto, res: any): Promise<void> {
    const { embeddedId } = payload;
    const { username, password } = this.salemanAccountSuperset;

    // 1. Lấy access token từ Redis (có proactive refresh)
    const { accessToken } = await this.getAccessTokenCached(username, password);

    // 2. Lấy CSRF token mới mỗi lần — cookie session không persist được
    const { token: csrfToken } = await this.fetchCsrfToken(accessToken);

    // 3. Issue guest token
    const datasetIds = this.DATASETS_DASHBOARD.map((d) => d.id);

    const guestToken = await this.fetchGuestToken(
      {
        username,
        embeddedId,
        rlsRules: datasetIds.map((d) => ({
          clause: `hierarchy_phone IS NOT NULL AND hierarchy_phone @> ARRAY['${this.PHONE_NUMBER}']`,
          dataset: d,
        })),
      },
      { csrfToken, accessToken },
    );

    this.logger.log(
      `[Superset] Guest token issued for user=${username} dashboard=${embeddedId}`,
    );

    res.send({ token: guestToken });
  }

  // ─── Admin token (dùng nội bộ bởi SyncService) ───────────────────────────

  async getAdminAccessToken(): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const username = this.configService.getOrThrow<string>('SUPERSET_ADMIN_USERNAME');
    const password = this.configService.getOrThrow<string>('SUPERSET_ADMIN_PASSWORD');
    return this.fetchAccessToken(username, password);
  }

  // ─── Dashboard sync methods ───────────────────────────────────────────────

  private async fetchDashboardsPage(
    accessToken: string,
    page: number,
  ): Promise<SupersetDashboardListResponse> {
    const risonQ = `(page:${page},page_size:${USERS_PAGE_SIZE})`;
    return this.request<SupersetDashboardListResponse>({
      method: 'GET',
      url: '/dashboard',
      params: { q: risonQ },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async fetchAllDashboards(accessToken: string): Promise<SupersetDashboardListItem[]> {
    const firstPage = await this.fetchDashboardsPage(accessToken, 0);
    const total = firstPage.count;
    const allDashboards: SupersetDashboardListItem[] = [...firstPage.result];

    const totalPages = Math.ceil(total / USERS_PAGE_SIZE);
    if (totalPages > 1) {
      const pagePromises = Array.from({ length: totalPages - 1 }, (_, i) =>
        this.fetchDashboardsPage(accessToken, i + 1),
      );
      const remaining = await Promise.all(pagePromises);
      for (const page of remaining) allDashboards.push(...page.result);
    }

    this.logger.log(`[Sync] Fetched ${allDashboards.length}/${total} dashboards from Superset`);
    return allDashboards;
  }

  async fetchDashboardEmbeddedId(
    accessToken: string,
    dashboardId: number,
  ): Promise<string | null> {
    try {
      const response = await this.request<SupersetEmbeddedResponse>({
        method: 'GET',
        url: `/dashboard/${dashboardId}/embedded`,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response?.result?.uuid ?? null;
    } catch (error: any) {
      if (error?.status === 404 || error?.message?.includes('404')) return null;
      throw error;
    }
  }

  async enableDashboardEmbedding(
    accessToken: string,
    csrfToken: string,
    dashboardId: number,
    allowedDomains: string[] = [],
  ): Promise<string> {
    const response = await this.request<SupersetEmbedEnableResponse>({
      method: 'POST',
      url: `/dashboard/${dashboardId}/embedded`,
      data: { allowed_domains: allowedDomains },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-CSRFToken': csrfToken,
      },
    });

    const uuid = response?.result?.uuid;
    if (!uuid) {
      throw new InternalServerErrorException(
        `Không thể enable embedding cho dashboard id=${dashboardId}`,
      );
    }

    this.logger.log(`[Sync] Embedding enabled: dashboard=${dashboardId}, uuid=${uuid}`);
    return uuid;
  }

  async fetchDashboardDatasetIds(
    accessToken: string,
    dashboardId: number,
  ): Promise<number[]> {
    const response = await this.request<{ result: SupersetDashboardDataset[] }>({
      method: 'GET',
      url: `/dashboard/${dashboardId}/datasets`,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return (response?.result ?? []).map((ds) => ds.id);
  }
}
