export interface User {
  id: number;
  username: string;
  email: string;
  is_superuser?: boolean;
}

export interface Account {
  id: number;
  name: string;
  email?: string;
  ceo_name?: string;
  niche?: string;
  location?: string;
  domain_name_main?: string;
  website_url?: string;
  date_joined?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface WebhookFolder {
  id: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  parent: number | null;
  webhook_count: number;
  total_webhook_count: number;
  full_path: string;
  subfolders: WebhookFolder[];
  account?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFolderRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parent?: number | null;
  account?: number | null;
}

export interface UpdateFolderRequest extends Partial<CreateFolderRequest> {}

export interface Webhook {
  id: number;
  name: string;
  url: string;
  http_method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: Record<string, string>;
  payload: Record<string, any> | string;
  is_active: boolean;
  schedule_type: 'once' | 'recurring';
  scheduled_at?: string;
  cron_expression?: string;
  timezone: string;
  max_retries: number;
  retry_delay: number;
  timeout: number;
  folder?: number | null;
  folder_name?: string;
  folder_color?: string;
  account?: number | null;
  account_name?: string;
  last_execution_at?: string | null;
  execution_count: number;
  last_execution_status?: 'success' | 'failed' | 'pending' | 'retrying' | null;
  created_at: string;
  updated_at: string;
  user: number;
  celery_task_id?: string | null;
  celery_periodic_task_id?: number | null;
}

export interface WebhookExecution {
  id: number;
  webhook: number;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  response_code: number | null;
  response_body: string;
  error_message: string;
  attempt_number: number;
  executed_at: string;
}

export interface CreateWebhookRequest {
  name: string;
  url: string;
  http_method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  payload?: Record<string, any> | string;
  schedule_type: 'once' | 'recurring';
  scheduled_at?: string;
  cron_expression?: string;
  timezone?: string;
  max_retries?: number;
  retry_delay?: number;
  timeout?: number;
  folder?: number | null;
  account?: number | null;
}

export interface UpdateWebhookRequest extends Partial<CreateWebhookRequest> {
  is_active?: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
