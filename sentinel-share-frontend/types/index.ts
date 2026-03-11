export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

export interface FileRecord {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface ShareLink {
  id: string;
  file_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface DownloadResponse {
  url: string;
  expiresIn: number;
}

export interface ApiError {
  error: string;
}
