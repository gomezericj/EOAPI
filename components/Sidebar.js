"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  Stethoscope,
  ClipboardList,
  CreditCard,
  Calendar,
  Settings,
  PieChart,
  LogOut,
  Target,
  DollarSign,
  TrendingDown,
  TrendingUp,
  LayoutDashboard,
  Star,
  Truck,
  ChevronDown,
  ChevronUp,
  Wallet,
  Calculator,
  Link as LinkIcon,
  Palette
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useBranding } from '@/context/BrandingContext';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Ventas', icon: DollarSign, path: '/ventas' },
  { 
    name: 'Gestión Médica', 
    icon: Stethoscope, 
    subItems: [
      { name: 'Pacientes', icon: Users, path: '/pacientes' },
      { name: 'Doctores', icon: ClipboardList, path: '/doctores' },
      { name: 'Procedimientos', icon: ClipboardList, path: '/procedimientos' },
      { name: 'Especialidades', icon: Star, path: '/especialidades' },
      { name: 'Proveedores', icon: Truck, path: '/proveedores' },
      { name: 'Descuentos (Costos)', icon: TrendingDown, path: '/insumos' }
    ]
  },
  { 
    name: 'Caja Diaria', 
    icon: Wallet, 
    subItems: [
      { name: 'Cierres de Caja', icon: Calendar, path: '/cierres' },
      { name: 'Egresos Diarios', icon: CreditCard, path: '/egresos' }
    ]
  },
  { 
    name: 'Finanzas', 
    icon: TrendingUp, 
    subItems: [
      { name: 'Reporte Mensual', icon: PieChart, path: '/finanzas', adminOnly: true },
      { name: 'Comisiones', icon: DollarSign, path: '/comisiones' },
      { name: 'Gastos Fijos', icon: CreditCard, path: '/finanzas/gastos-fijos', adminOnly: true },
      { name: 'Gastos Variables', icon: Wallet, path: '/finanzas/gastos-variables', adminOnly: true },
      { name: 'Pago Proveedores', icon: Truck, path: '/finanzas/proveedores', adminOnly: true },
      { name: 'Simulador Rentabilidad', icon: Calculator, path: '/finanzas/simulador', adminOnly: true }
    ]
  },
  { 
    name: 'Configuración', 
    icon: Settings, 
    subItems: [
      { name: 'Usuarios', icon: Users, path: '/usuarios', adminOnly: true },
      { name: 'Metas', icon: Target, path: '/metas', adminOnly: true },
      { name: 'Retenciones', icon: TrendingDown, path: '/configuracion', adminOnly: true },
      { name: 'Marca y Apariencia', icon: Palette, path: '/configuracion/marca', adminOnly: true },
      { name: 'Integraciones API', icon: LinkIcon, path: '/configuracion/integraciones', superadminOnly: true },
      { name: 'Logs de Actividad', icon: ClipboardList, path: '/logs', adminOnly: true }
    ]
  }
];

export default function Sidebar({ user, isOpen, setIsOpen }) {
  const pathname = usePathname();
  const branding = useBranding();
  const [openSubmenus, setOpenSubmenus] = useState(() => {
    return {
      'Gestión Médica': ['/pacientes', '/doctores', '/procedimientos', '/especialidades', '/proveedores', '/insumos'].includes(pathname),
      'Caja Diaria': ['/cierres', '/egresos'].includes(pathname),
      'Finanzas': ['/finanzas', '/finanzas/simulador', '/comisiones', '/finanzas/gastos-fijos', '/finanzas/gastos-variables', '/finanzas/proveedores'].includes(pathname),
      'Configuración': ['/configuracion', '/configuracion/marca', '/metas', '/usuarios', '/configuracion/integraciones', '/logs'].includes(pathname)
    };
  });

  const toggleSubmenu = (menuName) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  if (pathname === '/login') return null;

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`} style={{
      width: 'var(--sidebar-width)',
      backgroundColor: 'var(--primary)',
      color: 'white',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      padding: '2rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100
    }}>
      <div className="sidebar-header" style={{ marginBottom: '2.5rem', paddingLeft: '0.5rem', textAlign: 'center' }}>
        {branding?.logoBase64 ? (
          <img src={branding.logoBase64} alt={branding?.clinicName || 'Logo'} style={{ maxWidth: '80%', maxHeight: '100px', height: 'auto', marginBottom: '0.5rem', objectFit: 'contain' }} />
        ) : (
          <div style={{ padding: '1rem', border: '2px dashed rgba(255,255,255,0.3)', borderRadius: '8px', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{branding?.clinicName || 'Clínica'}</span>
          </div>
        )}
        <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.8 }}>Gestión Clínica</span>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', margin: '0 -0.5rem 0 0' }}>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {menuItems.map((item) => {
            const hasAccess = !item.adminOnly || ['admin', 'superadmin'].includes(user?.role);
            if (!hasAccess) return null;

            if (item.subItems) {
              const availableSubItems = item.subItems.filter(sub => {
                if (sub.superadminOnly) return user?.role === 'superadmin';
                if (sub.adminOnly) return ['admin', 'superadmin'].includes(user?.role);
                return true;
              });
              
              if (availableSubItems.length === 0) return null; // Hide parent if all children are hidden

              const isOpen = openSubmenus[item.name];
              const isAnyChildActive = availableSubItems.some(sub => pathname === sub.path);
              
              return (
                <li key={item.name} style={{ marginBottom: '0.5rem' }}>
                  <div 
                    className={`sidebar-link ${isAnyChildActive && !isOpen ? 'active' : ''}`}
                    onClick={() => toggleSubmenu(item.name)}
                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <item.icon size={20} />
                      <span>{item.name}</span>
                    </div>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                  
                  {isOpen && (
                    <ul style={{ listStyle: 'none', padding: '0 0 0 1rem', marginTop: '0.5rem' }}>
                      {availableSubItems.map((subItem) => {
                        const isSubActive = pathname === subItem.path;
                        return (
                          <li key={subItem.path} style={{ marginBottom: '0.5rem' }}>
                            <Link href={subItem.path} className={`sidebar-link ${isSubActive ? 'active' : ''}`} style={{ padding: '0.5rem 1rem' }}>
                              <subItem.icon size={16} />
                              <span style={{ fontSize: '0.9rem' }}>{subItem.name}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            const isActive = pathname === item.path;
            return (
              <li key={item.path} style={{ marginBottom: '0.5rem' }}>
                <Link href={item.path} className={`sidebar-link ${isActive ? 'active' : ''}`}>
                  <item.icon size={20} />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
        <div style={{ padding: '0 1rem 1rem', fontSize: '0.85rem' }}>
          <p style={{ margin: 0, opacity: 0.6 }}>Conectado como:</p>
          <p style={{ margin: 0, fontWeight: 600 }}>{user?.name || 'Usuario'}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="sidebar-logout"
        >
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}
