// Types globaux du backend CSTracker

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
}

export interface MessageResponse {
  message: string;
}
