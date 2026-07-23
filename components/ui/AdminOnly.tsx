'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/components/AuthProvider';

/** Chỉ hiện nội dung khi đang đăng nhập quyền quản trị (nút thêm/sửa/xóa dữ liệu chung). */
export default function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;
  return <>{children}</>;
}
