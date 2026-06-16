// ─── Core HTTP ────────────────────────────────────────────────────────────────

export interface SupersetRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeout?: number;
  hiddenSuffix?: boolean;
}

export interface SupersetLoginResponse {
  csrfToken: string;
  accessToken: string;
  refreshToken: string;
}

export interface GetGuestTokenPayload {
  username: string;
  accessToken: string;
  csrfToken: string;
  dashboardEmbeddedId: string;
  rlsRules?: { clause: string; dataset: number }[];
}

// ─── FAB Security API: Role ───────────────────────────────────────────────────

/**
 * Role object returned by GET /api/v1/security/roles/
 * Requires FAB_ADD_SECURITY_API=True in superset_config.py
 */
export interface SupersetRole {
  id: number;
  name: string;
}

export interface SupersetRoleListResponse {
  count: number;
  result: SupersetRole[];
  ids?: number[];
}

// ─── RLS API ──────────────────────────────────────────────────────────────────

/**
 * RLS filter object returned by GET /api/v1/rowlevelsecurity/
 * Does NOT require FAB_ADD_SECURITY_API — endpoint is always available.
 *
 * Mỗi filter gắn với một hoặc nhiều roles và một hoặc nhiều tables (datasets).
 */
export interface SupersetRlsFilter {
  id: number;
  name: string;
  description?: string | null;
  filter_type: 'Regular' | 'Base';
  group_key?: string | null;
  clause: string;
  /** Datasets mà filter này áp dụng */
  tables: Array<{ id: number; schema: string; table_name: string }>;
  /** Roles mà filter này áp dụng */
  roles: Array<{ id: number; name: string }>;
}

export interface SupersetRlsListResponse {
  count: number;
  result: SupersetRlsFilter[];
  ids?: number[];
}

// ─── FAB Security API: User ───────────────────────────────────────────────────

/**
 * User object returned by GET /api/v1/security/users/
 * Requires FAB_ADD_SECURITY_API=True in superset_config.py
 */
export interface SupersetUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  active: boolean;
  /** FAB roles assigned to this user (e.g. "Admin", "Alpha", "Gamma") */
  roles: Array<{ id: number; name: string }>;
  last_login?: string | null;
  login_count?: number | null;
  created_on?: string | null;
  changed_on?: string | null;
}

export interface SupersetUserListResponse {
  count: number;
  result: SupersetUser[];
  ids?: number[];
}

// ─── Sync result types ────────────────────────────────────────────────────────

export type SyncStatus = 'created' | 'updated' | 'skipped' | 'error';

export interface SyncRoleResult {
  roleName: string;
  status: SyncStatus;
  reason?: string;
}

export interface SyncRolesReport {
  syncedAt: string;
  totalFromSuperset: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  details: SyncRoleResult[];
}

export interface SyncAccountResult {
  username: string;
  status: SyncStatus;
  reason?: string;
}

export interface SyncAccountsReport {
  syncedAt: string;
  totalFromSuperset: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  details: SyncAccountResult[];
}

/** Combined report từ POST /sync/all */
export interface SyncAllReport {
  roles: SyncRolesReport;
  accounts: SyncAccountsReport;
}

export interface SyncDashboardPermissionsResult {
  roleName: string;
  status: SyncStatus;
  /** Số rlsRules được sync vào dashboardPermissions của role */
  rlsRulesSynced?: number;
  reason?: string;
}

export interface SyncDashboardPermissionsReport {
  syncedAt: string;
  totalRlsFilters: number;
  rolesAffected: number;
  details: SyncDashboardPermissionsResult[];
}

export type SupersetDashboardDetailResponse = {
  result: SupersetDashboardDetail;
};

export type SupersetDashboardDetail = {
  id: number;
  slug?: string | null;
  url?: string;
  dashboard_title: string;
  thumbnail_url?: string | null;
  published: boolean;

  css?: string;
  theme?: SupersetDashboardTheme | null;

  // Superset trả string JSON, nên parse thủ công nếu cần
  json_metadata?: string;
  position_json?: string;

  certified_by?: string | null;
  certification_details?: string | null;

  changed_by_name?: string;
  changed_by?: SupersetUser;
  changed_on?: string;

  created_by?: SupersetUser;

  charts?: string[];

  // Với guest user có thể bị Superset xoá khỏi response
  owners?: SupersetUser[];
  roles?: SupersetRole[];

  tags?: SupersetTag[];

  changed_on_delta_humanized?: string;
  created_on_delta_humanized?: string;

  is_managed_externally?: boolean | null;
  uuid?: string | null;
};

export type SupersetTag = {
  id: number;
  name: string;
  type: number | string;
};

export type SupersetDashboardTheme = {
  id: number;
  theme_name: string;
  json_data: string;
};

export interface PermalinkResult {
  permalinkKey: string;
  dataMask: DataMask;
}

export interface NativeFilter {
  id: string;
  name: string;
  datasetId: string;
  column: string;
  multiSelect: boolean;
  controlValues?: string;
}

type DataMaskEntry = {
  id: string;
  extraFormData: {
    filters: Array<{ col: string; op: 'IN'; val: Array<string | number> }>;
  };
  filterState: { value: Array<string | number>; label: string };
  ownState: Record<string, never>;
};

export type DataMask = Record<string, DataMaskEntry>;
export type PortalFilters = Record<
  string,
  string | number | Array<string | number>
>;

// Thêm vào superset.interface.ts

/** Response từ GET /api/v1/dashboard/?q=... */
export interface SupersetDashboardListItem {
  id: number;
  /** Slug trong Superset — có thể null nếu chưa đặt */
  slug: string | null;
  /** Tên dashboard */
  dashboard_title: string;
  /** published | draft */
  status: string;
}

export interface SupersetDashboardListResponse {
  count: number;
  result: SupersetDashboardListItem[];
}

/** Response từ GET /api/v1/dashboard/{id}/embedded */
export interface SupersetEmbeddedConfig {
  /** UUID dùng cho Embedded SDK */
  uuid: string;
  allowed_domains: string[];
}

export interface SupersetEmbeddedResponse {
  result: SupersetEmbeddedConfig;
}

/** Response từ POST /api/v1/dashboard/{id}/embedded (enable embedding) */
export interface SupersetEmbedEnableResponse {
  result: SupersetEmbeddedConfig;
}

/** Một dataset trong response GET /api/v1/dashboard/{id}/datasets */
export interface SupersetDashboardDataset {
  id: number;
  table_name: string;
  schema: string;
}
