"use client";
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useBranding } from '@/context/BrandingContext';

export default function AppContent({ children }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const branding = useBranding();

  const isLoginPage = pathname === '/login' || pathname === '/setup';

  useEffect(() => {
    if (status === 'unauthenticated' && !isLoginPage) {
      router.push('/login');
    }
  }, [status, isLoginPage, router]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (status === 'loading') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: 'var(--text-light)', fontWeight: 500 }}>Cargando sistema...</p>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        ` }} />
      </div>
    );
  }

  if (!session && !isLoginPage) {
    return null; // Will redirect via useEffect
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="app-container">
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}
      <Sidebar user={session?.user} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="main-content">
        <div className="mobile-header">
           <button onClick={() => setIsSidebarOpen(true)} className="mobile-menu-btn"><Menu size={24} /></button>
           <h2 style={{margin: 0, fontSize: '1.2rem', color: 'var(--primary)'}}>{branding?.clinicName || 'Clínica Dental'}</h2>
        </div>
        {children}
      </main>
    </div>
  );
}
