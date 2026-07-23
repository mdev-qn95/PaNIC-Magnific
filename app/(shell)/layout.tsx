import AppShell from '@/components/AppShell';
import AuthProvider from '@/components/AuthProvider';
import ConfirmProvider from '@/components/ui/ConfirmProvider';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ConfirmProvider>
        {/* Khung cao đúng viewport: sidebar + header cố định, chỉ content cuộn dọc */}
        <div className="flex h-screen overflow-hidden">
          <AppShell />
          <main className="flex h-screen min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {children}
          </main>
        </div>
      </ConfirmProvider>
    </AuthProvider>
  );
}
