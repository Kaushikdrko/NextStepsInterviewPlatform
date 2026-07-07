import { apiFetch } from '@/lib/utils/api-client';

type UserResponse = {
  id: string;
  email: string;
  name?: string | null;
  user_type: string;
};

export function getUser(userId: string) {
  return apiFetch<UserResponse>(`/api/users/${userId}`);
}
