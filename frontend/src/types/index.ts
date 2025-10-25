export interface User {
  id: number;
  username: string;
  email: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

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
