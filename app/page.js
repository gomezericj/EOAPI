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
  AlertCircle 
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalPatients: 0,
    monthlySales: 0,
    chargedPayments: 0,
    pendingPayments: 0,
    currentMeta: 10000000,
    recentSales: [],
    paymentMethods: { efectivo: 0, debito: 0, credito: 0, seguro: 0, transferencia: 0 },
    expenses: { total: 0, valePersonal: 0, gastoClinica: 0, otro: 0 }
  });
  const [selectedMonth, setSelectedMonth] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [year, month] = selectedMonth.split('-');
        const startDate = new Date(year, parseInt(month) - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, parseInt(month), 0).toISOString().split('T')[0];
        
        const params = new URLSearchParams({ startDate, endDate });
        
        const [sRes, targetsRes, egresosRes] = await Promise.all([
          fetch(`/api/ventas?${params.toString()}`),
          fetch('/api/metas'),
          fetch(`/api/egresos?${params.toString()}`)
        ]);
        
        const sales = await sRes.json();
        const targets = await targetsRes.json();
        const egresosData = await egresosRes.json();
        
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

        setStats(prev => ({
          ...prev,
          totalSales: total,
          monthlySales: total,
          chargedPayments: charged,
          pendingPayments: pending,
          totalPatients: Array.isArray(sales) ? new Set(sales.map(s => s.patientId?._id)).size : 0,
          recentSales: Array.isArray(sales) ? sales.slice(0, 5) : [],
          currentMeta: currentMeta,
          paymentMethods: Array.isArray(sales) ? sales.reduce((acc, sale) => {
            if (sale.payments) {
              sale.payments.forEach(p => {
                const m = p.method?.toLowerCase()?.trim();
                const amt = Number(p.amount) || 0;
                if (m === 'efecitvo' || m === 'efectivo') acc.efectivo += amt;
                else if (acc.hasOwnProperty(m)) acc[m] += amt;
              });
            }
            return acc;
          }, { efectivo: 0, debito: 0, credito: 0, seguro: 0, transferencia: 0 }) : { efectivo: 0, debito: 0, credito: 0, seguro: 0, transferencia: 0 },
          expenses: expensesBreakdown
        }));
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }
    };
    fetchDashboard();
  }, [selectedMonth]);

  const metaProgress = (stats.monthlySales / stats.currentMeta) * 100;

  const [yearStr, monthStr] = selectedMonth.split('-');
  const selectedYear = parseInt(yearStr);
  const selectedMonthNum = parseInt(monthStr);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;

  const isCurrentMonth = selectedYear === currentYear && selectedMonthNum === currentMonthNum;
  const isPastMonth = selectedYear < currentYear || (selectedYear === currentYear && selectedMonthNum < currentMonthNum);
  const isFutureMonth = selectedYear > currentYear || (selectedYear === currentYear && selectedMonthNum > currentMonthNum);
  
  const totalDaysInMonth = new Date(selectedYear, selectedMonthNum, 0).getDate();
  const passedDays = isPastMonth ? totalDaysInMonth : (isCurrentMonth ? now.getDate() : 0);
  
  let projectedSales = 0;
  if (passedDays > 0) {
    projectedSales = (stats.monthlySales / passedDays) * totalDaysInMonth;
  }
  const projectedProgress = stats.currentMeta > 0 ? (projectedSales / stats.currentMeta) * 100 : 0;

  return (
    <div className="dashboard">
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Resumen del Sistema</h1>
          <p style={{ color: 'var(--text-light)' }}>Monitoreo de actividad clínica y ventas</p>
        </div>
        <div>
          <input 
            type="month" 
            className="form-control" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)} 
            style={{ fontWeight: 600 }}
          />
        </div>
      </header>

      <div className="stats-grid">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Ventas Totales</span>
            <div style={{ color: 'var(--success)', padding: '0.4rem', backgroundColor: '#ecfdf5', borderRadius: '8px' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <h2 style={{ margin: '0.25rem 0', fontSize: '1.4rem' }}>${stats.totalSales.toLocaleString('es-CL')}</h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Acumulado histórico</div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Total Recaudado Caja</span>
            <div style={{ color: 'var(--primary)', padding: '0.4rem', backgroundColor: '#f0fdfa', borderRadius: '8px' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <h2 style={{ margin: '0.25rem 0', fontSize: '1.4rem', color: 'var(--primary)' }}>${stats.chargedPayments.toLocaleString('es-CL')}</h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Pagos confirmados</div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Pendiente de Cobro</span>
            <div style={{ color: 'var(--danger)', padding: '0.4rem', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
              <AlertCircle size={18} />
            </div>
          </div>
          <h2 style={{ margin: '0.25rem 0', fontSize: '1.4rem', color: 'var(--danger)' }}>${stats.pendingPayments.toLocaleString('es-CL')}</h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Abonos pendientes</div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Meta Mes</span>
            <div style={{ color: 'var(--warning)', padding: '0.4rem', backgroundColor: '#fff7ed', borderRadius: '8px' }}>
              <Target size={18} />
            </div>
          </div>
          <h2 style={{ margin: '0.25rem 0', fontSize: '1.4rem' }}>{metaProgress.toFixed(1)}%</h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Acumulado: <strong>${stats.monthlySales.toLocaleString('es-CL')}</strong></span>
            <span>Meta: <strong>${stats.currentMeta.toLocaleString('es-CL')}</strong></span>
          </div>
          <div style={{ height: '8px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginTop: '0.5rem', position: 'relative' }}>
            {isCurrentMonth && (
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(projectedProgress, 100)}%`, backgroundColor: '#cbd5e1', borderRadius: '4px', transition: 'width 1s ease-in-out' }}></div>
            )}
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(metaProgress, 100)}%`, backgroundColor: 'var(--warning)', borderRadius: '4px', transition: 'width 1s ease-in-out', zIndex: 1 }}></div>
          </div>
          {isCurrentMonth && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', textAlign: 'center', backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text)' }}>
                Proyección estimada a fin de mes:<br/> 
                <strong style={{ fontSize: '1.1rem' }}>${Math.round(projectedSales).toLocaleString('es-CL')}</strong>
              </span>
              <br/>
              {projectedSales >= stats.currentMeta ? (
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>↑ Con este ritmo se logrará la meta</span>
              ) : (
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>↓ Ritmo actual por debajo de la meta</span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Nuevo: Ingresos por Medio de Pago en el Dashboard */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <PieChart size={20} color="var(--primary)" />
          <h3 style={{ margin: 0, textTransform: 'capitalize' }}>
            Ingresos por Medio de Pago
          </h3>
        </div>
        <div className="responsive-grid-5">
          <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>EFECTIVO</p>
            <h4 style={{ margin: '0.15rem 0 0', color: '#10b981', fontSize: '0.95rem' }}>${(stats.paymentMethods.efectivo || 0).toLocaleString('es-CL')}</h4>
          </div>
          <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>DÉBITO</p>
            <h4 style={{ margin: '0.15rem 0 0', color: '#3b82f6', fontSize: '0.95rem' }}>${(stats.paymentMethods.debito || 0).toLocaleString('es-CL')}</h4>
          </div>
          <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>CRÉDITO</p>
            <h4 style={{ margin: '0.15rem 0 0', color: '#6366f1', fontSize: '0.95rem' }}>${(stats.paymentMethods.credito || 0).toLocaleString('es-CL')}</h4>
          </div>
          <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>TRANSF.</p>
            <h4 style={{ margin: '0.15rem 0 0', color: '#f59e0b', fontSize: '0.95rem' }}>${(stats.paymentMethods.transferencia || 0).toLocaleString('es-CL')}</h4>
          </div>
          <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>SEGURO</p>
            <h4 style={{ margin: '0.15rem 0 0', color: '#8b5cf6', fontSize: '0.95rem' }}>${(stats.paymentMethods.seguro || 0).toLocaleString('es-CL')}</h4>
          </div>
        </div>
      </div>
      {/* Nuevo: Desglose de Gastos (Egresos) en el Dashboard */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <AlertCircle size={20} color="#ef4444" />
          <h3 style={{ margin: 0, textTransform: 'capitalize' }}>
            Desglose de Egresos
          </h3>
        </div>
        <div className="responsive-grid-4">
          <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2' }}>
            <p style={{ margin: 0, fontSize: '0.65rem', color: '#991b1b', fontWeight: 600 }}>TOTAL GASTOS</p>
            <h4 style={{ margin: '0.15rem 0 0', color: '#dc2626', fontSize: '1.1rem' }}>${(stats.expenses.total || 0).toLocaleString('es-CL')}</h4>
          </div>
          <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>VALE PERSONAL</p>
            <h4 style={{ margin: '0.15rem 0 0', color: '#ef4444', fontSize: '0.95rem' }}>${(stats.expenses.valePersonal || 0).toLocaleString('es-CL')}</h4>
          </div>
          <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>GASTO CLÍNICA</p>
            <h4 style={{ margin: '0.15rem 0 0', color: '#ef4444', fontSize: '0.95rem' }}>${(stats.expenses.gastoClinica || 0).toLocaleString('es-CL')}</h4>
          </div>
          <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>OTRO</p>
            <h4 style={{ margin: '0.15rem 0 0', color: '#ef4444', fontSize: '0.95rem' }}>${(stats.expenses.otro || 0).toLocaleString('es-CL')}</h4>
          </div>
        </div>
      </div>

      <div className="responsive-grid-2-1" style={{ marginTop: '2rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Ventas Recientes</h3>
            <Link href="/ventas" style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              Ver Todas <ChevronRight size={16} />
            </Link>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSales.length > 0 ? stats.recentSales.map((s) => (
                  <tr key={s._id}>
                    <td>{new Date(s.date).toLocaleDateString('es-CL', { timeZone: 'UTC' })}</td>
                    <td>{s.patientId?.name} {s.patientId?.surname}</td>
                    <td style={{ fontWeight: 600 }}>${(s.totalToCollect || 0).toLocaleString('es-CL')}</td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        backgroundColor: s.status === 'pagada' ? '#d1fae5' : '#fee2e2',
                        color: s.status === 'pagada' ? '#065f46' : '#991b1b'
                      }}>{(s.status || 'PENDIENTE').toUpperCase()}</span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" style={{ textAlign: 'center' }}>No hay ventas recientes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
          <h3 style={{ color: 'white' }}>Acceso Rápido</h3>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li>
              <Link href="/ventas" className="btn dashboard-quick-btn">
                <DollarSign size={18} /> Registrar Nueva Venta
              </Link>
            </li>
            <li>
              <Link href="/cierres" className="btn dashboard-quick-btn">
                <Calendar size={18} /> Realizar Cierre Diario
              </Link>
            </li>
            <li>
              <Link href="/comisiones" className="btn dashboard-quick-btn">
                <PieChart size={18} /> Ver Comisiones de Mes
              </Link>
            </li>
          </ul>
          
          <div style={{ marginTop: '2.5rem', padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
            <h4 style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>Estado del Servidor</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', color: '#4ade80', fontSize: '0.8rem' }}>
              <div className="status-pulse-dashboard"></div>
              Conectado a MongoDB
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
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
