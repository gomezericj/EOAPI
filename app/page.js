"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  ChevronRight, 
  PieChart, 
  Target, 
  AlertCircle,
  CreditCard, 
  Shield, 
  Building2, 
  HeartPulse, 
  TrendingDown, 
  Receipt,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2
} from 'lucide-react';

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  const [year, month] = selectedMonth.split('-');
  const startDate = new Date(year, parseInt(month) - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, parseInt(month), 0).toISOString().split('T')[0];
  const paramsStr = new URLSearchParams({ startDate, endDate }).toString();

  const { data: sales } = useSWR(`/api/ventas?${paramsStr}`, fetcher);
  const { data: targets } = useSWR('/api/metas', fetcher);
  const { data: egresosData } = useSWR(`/api/egresos?${paramsStr}`, fetcher);

  const target = Array.isArray(targets) ? targets.find(t => t.year === parseInt(year) && t.month === parseInt(month)) : null;
  const currentMeta = target ? target.amount : 10000000;

  const total = Array.isArray(sales) ? sales.reduce((acc, s) => acc + (s.totalToCollect || 0), 0) : 0;
  const charged = Array.isArray(sales) ? sales.reduce((acc, s) => acc + (s.totalCharged || 0), 0) : 0;
  const pending = Array.isArray(sales) ? sales.reduce((acc, s) => acc + (s.pendingAmount || 0), 0) : 0;

  const expensesBreakdown = Array.isArray(egresosData) ? egresosData.reduce((acc, curr) => {
    const amt = curr.amount || 0;
    if (curr.type === 'Vale Personal') acc.valePersonal += amt;
    else if (curr.type === 'Gasto Clínica' || curr.type === 'Gasto Clinica') acc.gastoClinica += amt;
    else acc.otro += amt;
    acc.total += amt;
    return acc;
  }, { total: 0, valePersonal: 0, gastoClinica: 0, otro: 0 }) : { total: 0, valePersonal: 0, gastoClinica: 0, otro: 0 };

  const paymentMethods = Array.isArray(sales) ? sales.reduce((acc, sale) => {
    if (sale.payments) {
      sale.payments.forEach(p => {
        const m = p.method?.toLowerCase()?.trim();
        const amt = Number(p.amount) || 0;
        if (m === 'efecitvo' || m === 'efectivo') acc.efectivo += amt;
        else if (acc.hasOwnProperty(m)) acc[m] += amt;
      });
    }
    return acc;
  }, { efectivo: 0, debito: 0, credito: 0, seguro: 0, transferencia: 0, isapre: 0, fonasa: 0 }) : { efectivo: 0, debito: 0, credito: 0, seguro: 0, transferencia: 0, isapre: 0, fonasa: 0 };

  const stats = {
    totalSales: total,
    monthlySales: total,
    chargedPayments: charged,
    pendingPayments: pending,
    totalPatients: Array.isArray(sales) ? new Set(sales.map(s => s.patientId?._id)).size : 0,
    recentSales: Array.isArray(sales) ? sales.slice(0, 5) : [],
    currentMeta: currentMeta,
    paymentMethods,
    expenses: expensesBreakdown
  };

  const metaProgress = stats.currentMeta > 0 ? (stats.monthlySales / stats.currentMeta) * 100 : 0;
  const collectionRate = stats.totalSales > 0 ? (stats.chargedPayments / stats.totalSales) * 100 : 0;
  const netCashFlow = stats.chargedPayments - stats.expenses.total;

  const [yearStr, monthStr] = selectedMonth.split('-');
  const selectedYear = parseInt(yearStr);
  const selectedMonthNum = parseInt(monthStr);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;

  const isCurrentMonth = selectedYear === currentYear && selectedMonthNum === currentMonthNum;
  const isPastMonth = selectedYear < currentYear || (selectedYear === currentYear && selectedMonthNum < currentMonthNum);
  
  const totalDaysInMonth = new Date(selectedYear, selectedMonthNum, 0).getDate();
  const passedDays = isPastMonth ? totalDaysInMonth : (isCurrentMonth ? now.getDate() : 0);
  
  let projectedSales = 0;
  if (passedDays > 0) {
    projectedSales = (stats.monthlySales / passedDays) * totalDaysInMonth;
  }
  const projectedProgress = stats.currentMeta > 0 ? (projectedSales / stats.currentMeta) * 100 : 0;

  // Lista normalizada de medios de pago para desglose armónico
  const paymentItems = [
    { key: 'debito', label: 'Débito', amount: stats.paymentMethods.debito || 0, icon: CreditCard },
    { key: 'credito', label: 'Crédito', amount: stats.paymentMethods.credito || 0, icon: CreditCard },
    { key: 'transferencia', label: 'Transferencia', amount: stats.paymentMethods.transferencia || 0, icon: TrendingUp },
    { key: 'efectivo', label: 'Efectivo', amount: stats.paymentMethods.efectivo || 0, icon: DollarSign },
    { key: 'isapre', label: 'Isapre', amount: stats.paymentMethods.isapre || 0, icon: Building2 },
    { key: 'fonasa', label: 'Fonasa', amount: stats.paymentMethods.fonasa || 0, icon: HeartPulse },
    { key: 'seguro', label: 'Seguros', amount: stats.paymentMethods.seguro || 0, icon: Shield },
  ];

  // Lista normalizada de egresos
  const expenseItems = [
    { key: 'gastoClinica', label: 'Gasto Clínica', amount: stats.expenses.gastoClinica || 0, icon: Building2 },
    { key: 'valePersonal', label: 'Vale Personal', amount: stats.expenses.valePersonal || 0, icon: Users },
    { key: 'otro', label: 'Otros Egresos', amount: stats.expenses.otro || 0, icon: Receipt },
  ];

  return (
    <div className="dashboard">
      {/* Encabezado Principal */}
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Panel de Control</h1>
          <p style={{ color: 'var(--text-light)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Resumen ejecutivo de recaudación, metas y actividad clínica
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ffffff', border: '1px solid var(--border)', padding: '0.35rem 0.75rem', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <Calendar size={16} color="var(--text-light)" />
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)} 
              style={{ border: 'none', outline: 'none', background: 'transparent', fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem', cursor: 'pointer' }}
            />
          </div>
        </div>
      </header>

      {/* 4 KPIs Superiores con Diseño Minimalista Ejecutivo */}
      <div className="stats-grid" style={{ gap: '1.25rem' }}>
        {/* 1. Ventas Totales */}
        <div className="dash-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="dash-kpi-label">Ventas Totales</span>
            <div className="dash-kpi-icon" style={{ backgroundColor: '#f0fdfa', color: '#0d9488' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="dash-kpi-value">${stats.totalSales.toLocaleString('es-CL')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span className="dash-badge-neutral">
              Total facturado en el mes
            </span>
          </div>
        </div>

        {/* 2. Total Recaudado en Caja */}
        <div className="dash-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="dash-kpi-label">Total Recaudado</span>
            <div className="dash-kpi-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="dash-kpi-value">${stats.chargedPayments.toLocaleString('es-CL')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span className="dash-badge-success">
              <CheckCircle2 size={12} style={{ marginRight: '0.25rem' }} />
              {collectionRate.toFixed(0)}% cobrado
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>en caja</span>
          </div>
        </div>

        {/* 3. Pendiente de Cobro */}
        <div className="dash-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="dash-kpi-label">Por Cobrar</span>
            <div className="dash-kpi-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="dash-kpi-value" style={{ color: stats.pendingPayments > 0 ? '#b45309' : 'inherit' }}>
            ${stats.pendingPayments.toLocaleString('es-CL')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span className={stats.pendingPayments > 0 ? "dash-badge-warning" : "dash-badge-neutral"}>
              {stats.pendingPayments > 0 ? 'Abonos pendientes' : 'Al día'}
            </span>
            {stats.totalSales > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                {((stats.pendingPayments / stats.totalSales) * 100).toFixed(0)}% del total
              </span>
            )}
          </div>
        </div>

        {/* 4. Meta del Mes */}
        <div className="dash-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="dash-kpi-label">Meta del Mes</span>
            <div className="dash-kpi-icon" style={{ backgroundColor: '#f0fdfa', color: 'var(--primary)' }}>
              <Target size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <div className="dash-kpi-value" style={{ color: 'var(--primary)' }}>
              {metaProgress.toFixed(1)}%
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
              de ${(stats.currentMeta / 1000000).toFixed(1)}M
            </span>
          </div>
          
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ height: '6px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
              {isCurrentMonth && (
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(projectedProgress, 100)}%`, backgroundColor: '#cbd5e1', borderRadius: '4px' }}></div>
              )}
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(metaProgress, 100)}%`, backgroundColor: 'var(--primary)', borderRadius: '4px', zIndex: 1 }}></div>
            </div>
            {isCurrentMonth && (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Proy: ${Math.round(projectedSales / 1000000).toFixed(1)}M</span>
                <span style={{ fontWeight: 600, color: projectedSales >= stats.currentMeta ? 'var(--success)' : '#d97706' }}>
                  {projectedSales >= stats.currentMeta ? '↑ A ritmo' : '↓ Bajo ritmo'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sección Bento: Balance Financiero y Distribución (Ingresos vs Egresos) */}
      <div className="dash-bento-grid" style={{ marginTop: '1.75rem' }}>
        {/* Columna Izquierda: Ingresos por Medio de Pago */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ padding: '0.45rem', borderRadius: '8px', backgroundColor: '#f8fafc', color: 'var(--primary)', border: '1px solid #e2e8f0' }}>
                <PieChart size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
                  Ingresos por Medio de Pago
                </h3>
                <small style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>
                  Distribución de los ${stats.chargedPayments.toLocaleString('es-CL')} recaudados
                </small>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem' }}>
            {paymentItems.map((item) => {
              const IconComp = item.icon;
              const pct = stats.chargedPayments > 0 ? Math.round((item.amount / stats.chargedPayments) * 100) : 0;
              return (
                <div key={item.key} className="dash-distribution-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <IconComp size={15} color="var(--text-light)" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{item.label}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-light)' }}>{pct}%</span>
                  </div>
                  
                  <div style={{ margin: '0.45rem 0 0.4rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                    ${item.amount.toLocaleString('es-CL')}
                  </div>

                  <div style={{ height: '4px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: 'var(--secondary)', borderRadius: '3px', transition: 'width 0.4s ease' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: Flujo de Caja y Control de Egresos */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ padding: '0.45rem', borderRadius: '8px', backgroundColor: '#f8fafc', color: 'var(--primary)', border: '1px solid #e2e8f0' }}>
                <Wallet size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
                  Flujo de Caja y Egresos
                </h3>
                <small style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>
                  Balance neto y desglose de salidas
                </small>
              </div>
            </div>
          </div>

          {/* Banner Resumen de Flujo Neto */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '0.9rem 1.1rem', 
            borderRadius: '10px', 
            backgroundColor: netCashFlow >= 0 ? '#f0fdf4' : '#fff1f2', 
            border: netCashFlow >= 0 ? '1px solid #dcfce7' : '1px solid #ffe4e6',
            marginBottom: '1rem'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: netCashFlow >= 0 ? '#166534' : '#9f1239', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Flujo Neto en Caja
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: netCashFlow >= 0 ? '#15803d' : '#be123c', marginTop: '0.1rem' }}>
                ${netCashFlow.toLocaleString('es-CL')}
              </div>
              <small style={{ fontSize: '0.72rem', color: netCashFlow >= 0 ? '#166534' : '#9f1239' }}>
                Recaudado menos egresos del periodo
              </small>
            </div>
            <div style={{ 
              padding: '0.65rem', 
              borderRadius: '50%', 
              backgroundColor: netCashFlow >= 0 ? '#dcfce7' : '#ffe4e6', 
              color: netCashFlow >= 0 ? '#15803d' : '#be123c' 
            }}>
              {netCashFlow >= 0 ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
            </div>
          </div>

          {/* Desglose de Gastos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1 }}>
            {/* Total Egresos Barra Resumen */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingDown size={16} color="#dc2626" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Total Egresos</span>
              </div>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#dc2626' }}>
                -${stats.expenses.total.toLocaleString('es-CL')}
              </span>
            </div>

            {/* Categorías de Egresos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem', marginTop: '0.25rem' }}>
              {expenseItems.map((item) => {
                const IconComp = item.icon;
                const expPct = stats.expenses.total > 0 ? Math.round((item.amount / stats.expenses.total) * 100) : 0;
                return (
                  <div key={item.key} className="dash-distribution-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-light)' }}>{item.label}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-light)' }}>{expPct}%</span>
                    </div>
                    <div style={{ margin: '0.35rem 0 0.35rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                      ${item.amount.toLocaleString('es-CL')}
                    </div>
                    <div style={{ height: '3px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${expPct}%`, backgroundColor: '#94a3b8', borderRadius: '2px' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Fila Inferior: Ventas Recientes y Acceso Rápido */}
      <div className="responsive-grid-2-1" style={{ marginTop: '1.75rem' }}>
        {/* Tabla Ventas Recientes */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>Ventas Recientes</h3>
              <small style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>Últimas transacciones registradas</small>
            </div>
            <Link href="/ventas" style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              Ver Todas <ChevronRight size={16} />
            </Link>
          </div>
          <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>Fecha</th>
                  <th style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>Paciente</th>
                  <th style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>Total</th>
                  <th style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600, textAlign: 'right' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSales.length > 0 ? stats.recentSales.map((s) => (
                  <tr key={s._id} style={{ transition: 'background-color 0.15s ease' }}>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(s.date).toLocaleDateString('es-CL', { timeZone: 'UTC' })}</td>
                    <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>{s.patientId?.name} {s.patientId?.surname}</td>
                    <td style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>${(s.totalToCollect || 0).toLocaleString('es-CL')}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        backgroundColor: s.status === 'pagada' ? '#f0fdf4' : '#fffbeb',
                        color: s.status === 'pagada' ? '#166534' : '#b45309',
                        border: s.status === 'pagada' ? '1px solid #dcfce7' : '1px solid #fef3c7'
                      }}>
                        {(s.status || 'PENDIENTE').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-light)' }}>No hay ventas registradas este mes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Acceso Rápido Ejecutivo */}
        <div className="card" style={{ background: 'linear-gradient(145deg, #025158 0%, #033c41 100%)', color: 'white', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ color: 'white', margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Acceso Rápido</h3>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', margin: '0.25rem 0 1.25rem 0' }}>Acciones operativas del día</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link href="/ventas" className="dash-action-btn">
                <DollarSign size={16} /> Registrar Venta
              </Link>
              <Link href="/cierres" className="dash-action-btn">
                <Calendar size={16} /> Cierre Diario
              </Link>
              <Link href="/comisiones" className="dash-action-btn">
                <PieChart size={16} /> Comisiones Médicas
              </Link>
            </div>
          </div>
          
          <div style={{ marginTop: '2rem', padding: '1rem 1.2rem', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8rem', fontWeight: 500 }}>Base de Datos</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#4ade80', fontSize: '0.78rem', fontWeight: 600 }}>
                <div className="status-pulse-dashboard"></div>
                En Línea
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .dash-kpi-card {
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .dash-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px -2px rgba(0,0,0,0.06);
        }
        .dash-kpi-label {
          color: var(--text-light);
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.2px;
        }
        .dash-kpi-value {
          margin: 0.5rem 0 0 0;
          font-size: 1.7rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
        }
        .dash-kpi-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .dash-badge-neutral {
          font-size: 0.72rem;
          color: var(--text-light);
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          font-weight: 500;
        }
        .dash-badge-success {
          font-size: 0.72rem;
          color: #166534;
          background-color: #f0fdf4;
          border: 1px solid #dcfce7;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
        }
        .dash-badge-warning {
          font-size: 0.72rem;
          color: #b45309;
          background-color: #fffbeb;
          border: 1px solid #fef3c7;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          font-weight: 600;
        }
        .dash-bento-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 1.25rem;
        }
        @media (max-width: 1024px) {
          .dash-bento-grid {
            grid-template-columns: 1fr;
          }
        }
        .dash-distribution-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.85rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .dash-distribution-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 6px rgba(0,0,0,0.03);
        }
        .dash-action-btn {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: white;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .dash-action-btn:hover {
          background: rgba(255, 255, 255, 0.18);
          transform: translateX(3px);
          border-color: rgba(255, 255, 255, 0.3);
        }
        .status-pulse-dashboard {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #4ade80;
          box-shadow: 0 0 0 rgba(74, 222, 128, 0.7);
          animation: dashboardPulse 2s infinite;
        }
        @keyframes dashboardPulse {
          0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(74, 222, 128, 0); }
          100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
        }
      `}</style>
    </div>
  );
}
