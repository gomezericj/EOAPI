"use client";
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, Package, PieChart as PieIcon, Users, Building, 
  BarChart3, Calendar, Download, Search, Star, User
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

const COLORS = ['#10b981', '#ec4899', '#06b6d4', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#ea580c'];

export default function FinanzasPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });
  const [hoverEgresos, setHoverEgresos] = useState(false);

  const fetchData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/finanzas?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // Solo al cargar la página inicialmente

  if (!isAdmin) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>No autorizado para ver este módulo.</div>;
  }

  const exportToExcel = () => {
    if (!data) return;
    const statsData = data.procedures.map(p => ({
      Procedimiento: p.name,
      'Cant. Vendida': p.count,
      'Ingresos Brutos ($)': p.revenue,
      'Ganancia Neta ($)': p.profit
    }));
    const worksheet = XLSX.utils.json_to_sheet(statsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rentabilidad Procedimientos");
    XLSX.writeFile(workbook, `Analisis_Financiero_${dateRange.startDate}_${dateRange.endDate}.xlsx`);
  };

  const getPercentage = (val) => {
    if (!data || !data.summary.totalBruto) return 0;
    return ((val / data.summary.totalBruto) * 100).toFixed(1);
  };

  const InfoCard = ({ title, value, icon: Icon, color, showPercent = true, children }) => {
    const pct = getPercentage(value);
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', borderLeft: `4px solid ${color}` }}>
        <div style={{ backgroundColor: `${color}15`, padding: '1rem', borderRadius: '12px', color: color }}>
          <Icon size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
            <p style={{ color: 'var(--text-light)', fontSize: '0.875rem', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>{title}</p>
            {showPercent && (
              <span style={{ backgroundColor: `${color}15`, color: color, padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                {pct}%
              </span>
            )}
          </div>
          <h3 style={{ margin: 0, fontSize: '1.5rem', color: color }}>
            ${Math.round(value || 0).toLocaleString('es-CL')}
          </h3>
          {children}
        </div>
      </div>
    );
  };

  const formatCurrency = (value) => `$${Math.round(value).toLocaleString('es-CL')}`;

  const pieData = data ? [
    { name: 'Ganancia Neta', value: Math.max(0, data.summary.netProfit) },
    { name: 'Gastos Comisiones (Doctores)', value: Math.max(0, data.summary.totalComisiones) },
    { name: 'Costo Insumos', value: Math.max(0, data.summary.totalInsumos) },
    { name: 'Costos Administrativos', value: Math.max(0, data.summary.totalAdmin) },
    { name: 'Costo Instalaciones', value: Math.max(0, data.summary.totalInstalaciones) },
    { name: 'Gastos Fijos', value: Math.max(0, data.summary.totalFixed || 0) },
    { name: 'Gastos Variables', value: Math.max(0, data.summary.totalVariable || 0) },
    { name: 'Gastos Egresos', value: Math.max(0, data.summary.totalEgresos || 0) }
  ] : [];

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    if (percent <= 0.02) return null; // Ocultar si es menor al 2% para mejor limpieza
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div style={{ backgroundColor: 'white', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#1e293b' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
          {dataPoint.desglose && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#64748b' }}>
              <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', color: '#475569' }}>Desglose de Costos:</p>
              <ul style={{ margin: 0, paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {dataPoint.desglose.Insumos > 0 && <li>Insumos: {formatCurrency(dataPoint.desglose.Insumos)}</li>}
                {dataPoint.desglose.Admin > 0 && <li>Admin: {formatCurrency(dataPoint.desglose.Admin)}</li>}
                {dataPoint.desglose.Instalaciones > 0 && <li>Instal.: {formatCurrency(dataPoint.desglose.Instalaciones)}</li>}
                {dataPoint.desglose.Comisiones > 0 && <li>Comisiones: {formatCurrency(dataPoint.desglose.Comisiones)}</li>}
                {dataPoint.desglose.Egresos > 0 && <li>Gastos Egresos: {formatCurrency(dataPoint.desglose.Egresos)}</li>}
              </ul>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="finanzas-page" style={{ paddingBottom: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp color="var(--primary)" /> Análisis Financiero</h1>
          <p style={{ color: 'var(--text-light)' }}>Estado de resultados y rentabilidad de la clínica</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="card" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1rem', margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="var(--text-light)" />
              <input 
                type="date" 
                className="form-control" 
                style={{ margin: 0, padding: '0.25rem 0.5rem' }}
                value={dateRange.startDate}
                onChange={e => setDateRange({...dateRange, startDate: e.target.value})}
              />
            </div>
            <span style={{ color: 'var(--text-light)', alignSelf: 'center' }}>hasta</span>
            <input 
              type="date" 
              className="form-control" 
              style={{ margin: 0, padding: '0.25rem 0.5rem' }}
              value={dateRange.endDate}
              onChange={e => setDateRange({...dateRange, endDate: e.target.value})}
            />
          </div>
          <button className="btn btn-primary" onClick={fetchData} disabled={loading}>
            <Search size={20} /> Buscar
          </button>
          <button className="btn btn-excel" onClick={exportToExcel} disabled={!data || loading}>
            <Download size={20} /> Exportar
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>Calculando rentabilidad...</div>
      ) : data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <InfoCard title="Ingresos Brutos" value={data.summary.totalBruto} icon={DollarSign} color="#0d9488" showPercent={false} />
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', backgroundColor: COLORS[0], color: 'white', border: 'none', backgroundImage: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', margin: 0 }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '1rem', borderRadius: '12px', color: 'white' }}>
                <TrendingUp size={32} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1rem', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>Ganancia Neta Real</p>
                  <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {getPercentage(data.summary.netProfit)}%
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '2rem', color: 'white' }}>
                  ${Math.round(data.summary.netProfit || 0).toLocaleString('es-CL')}
                </h3>
              </div>
            </div>
          </div>

          {/* Linea 2: Costos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <InfoCard title="Costo Insumos" value={data.summary.totalInsumos} icon={Package} color={COLORS[2]} />
            <InfoCard title="Costos Administrativos" value={data.summary.totalAdmin} icon={Building} color={COLORS[3]} />
            <InfoCard title="Costo Instalaciones" value={data.summary.totalInstalaciones} icon={Building} color={COLORS[4]} />
            
            {/* Tarjeta vacía de relleno */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', backgroundColor: '#f1f5f9', border: '2px dashed #94a3b8', opacity: 1, boxShadow: 'none', margin: 0 }}>
              <div style={{ backgroundColor: '#cbd5e1', borderRadius: '12px', width: '56px', height: '56px' }}></div>
              <div>
                <div style={{ height: '12px', width: '70px', backgroundColor: '#cbd5e1', borderRadius: '4px', marginBottom: '8px' }}></div>
                <div style={{ height: '22px', width: '110px', backgroundColor: '#cbd5e1', borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>

          {/* Linea 3: Gastos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
            <InfoCard title="Gastos Comisiones (Doctores)" value={data.summary.totalComisiones} icon={Users} color={COLORS[1]} />
            <InfoCard title="Gastos Fijos" value={data.summary.totalFixed || 0} icon={Building} color={COLORS[5]} />
            <InfoCard title="Gastos Variables" value={data.summary.totalVariable || 0} icon={DollarSign} color={COLORS[6]} />
            <div 
              style={{ position: 'relative' }} 
              onMouseEnter={() => setHoverEgresos(true)} 
              onMouseLeave={() => setHoverEgresos(false)}
            >
              <InfoCard title="Gastos Egresos" value={data.summary.totalEgresos || 0} icon={DollarSign} color={COLORS[7]}>
                {hoverEgresos && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginTop: '0.5rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', zIndex: 10 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span>Vale Personal:</span>
                        <span style={{ fontWeight: 600 }}>${Math.round(data.summary.egresosByType?.valePersonal || 0).toLocaleString('es-CL')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span>Gasto Clínica:</span>
                        <span style={{ fontWeight: 600 }}>${Math.round(data.summary.egresosByType?.gastoClinica || 0).toLocaleString('es-CL')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Otro:</span>
                        <span style={{ fontWeight: 600 }}>${Math.round(data.summary.egresosByType?.otro || 0).toLocaleString('es-CL')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </InfoCard>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieIcon size={20} color="var(--primary)" /> Ingresos por Medio de Pago
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>EFECTIVO</p>
                <h4 style={{ margin: '0.5rem 0 0', color: '#10b981' }}>{formatCurrency(data.summary.paymentMethods?.efectivo || 0)}</h4>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>DÉBITO</p>
                <h4 style={{ margin: '0.5rem 0 0', color: '#3b82f6' }}>{formatCurrency(data.summary.paymentMethods?.debito || 0)}</h4>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>CRÉDITO</p>
                <h4 style={{ margin: '0.5rem 0 0', color: '#6366f1' }}>{formatCurrency(data.summary.paymentMethods?.credito || 0)}</h4>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>TRANSFERENCIA</p>
                <h4 style={{ margin: '0.5rem 0 0', color: '#f59e0b' }}>{formatCurrency(data.summary.paymentMethods?.transferencia || 0)}</h4>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>SEGURO</p>
                <h4 style={{ margin: '0.5rem 0 0', color: '#8b5cf6' }}>{formatCurrency(data.summary.paymentMethods?.seguro || 0)}</h4>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Gráfico de Dona */}
            <div className="card">
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PieIcon size={20} color="var(--primary)" /> Distribución del Dinero
              </h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={renderCustomizedLabel}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={formatCurrency} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico de Tendencia */}
            <div className="card">
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={20} color="var(--primary)" /> Tendencia de Ingresos vs Costos
              </h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="date" tickFormatter={str => str.substring(5)} />
                    <YAxis tickFormatter={(val) => `$${val/1000}k`} width={80} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                    <Legend />
                    <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Costos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Tabla Procedimientos */}
            <div className="card">
              <h3 style={{ marginBottom: '1rem' }}>Rentabilidad por Procedimiento</h3>
              <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Procedimiento</th>
                      <th style={{ textAlign: 'center' }}>Cant.</th>
                      <th style={{ textAlign: 'right' }}>Ingresos</th>
                      <th style={{ textAlign: 'right' }}>Ganancia Libra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.procedures.map((p, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td style={{ textAlign: 'center' }}>{p.count}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-light)' }}>{formatCurrency(p.revenue)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(p.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabla Doctores */}
            <div className="card">
              <h3 style={{ marginBottom: '1rem' }}>Rentabilidad por Doctor</h3>
              <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th style={{ textAlign: 'center' }}>Tratamientos</th>
                      <th style={{ textAlign: 'right' }}>Ingreso Generado</th>
                      <th style={{ textAlign: 'right' }}>Aporte a Ganancia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.doctors.map((d, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}><div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><Users size={16} color="var(--secondary)"/> {d.name}</div></td>
                        <td style={{ textAlign: 'center' }}>{d.count}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-light)' }}>{formatCurrency(d.revenue)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(d.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Fila adicional para Pacientes y Especialidades */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Tabla Especialidades */}
            <div className="card">
              <h3 style={{ marginBottom: '1rem' }}>Rentabilidad por Especialidad</h3>
              <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Especialidad</th>
                      <th style={{ textAlign: 'center' }}>Tratamientos</th>
                      <th style={{ textAlign: 'right' }}>Ingreso Generado</th>
                      <th style={{ textAlign: 'right' }}>Aporte a Ganancia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.specialties?.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>Sin datos disponibles</td></tr>
                    ) : (
                      data.specialties?.map((s, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}><div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><Star size={16} color="var(--primary)"/> {s.name}</div></td>
                          <td style={{ textAlign: 'center' }}>{s.count}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-light)' }}>{formatCurrency(s.revenue)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(s.profit)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabla Pacientes */}
            <div className="card">
              <h3 style={{ marginBottom: '1rem' }}>Rentabilidad por Paciente</h3>
              <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Paciente</th>
                      <th style={{ textAlign: 'center' }}>Adquisiciones</th>
                      <th style={{ textAlign: 'right' }}>Ingreso Generado</th>
                      <th style={{ textAlign: 'right' }}>Aporte a Ganancia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.patients?.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>Sin datos disponibles</td></tr>
                    ) : (
                      data.patients?.map((p, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}><div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><User size={16} color="var(--primary)"/> {p.name}</div></td>
                          <td style={{ textAlign: 'center' }}>{p.count}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-light)' }}>{formatCurrency(p.revenue)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(p.profit)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
