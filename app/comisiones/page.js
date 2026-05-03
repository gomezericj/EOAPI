"use client";
import { useState, useEffect } from 'react';
import { PieChart, Mail, Calendar, Calculator, FileText, TrendingDown, TrendingUp } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';

export default function ComisionesPage() {
  const { showAlert, showSuccess, showLoading } = useNotification();
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/doctors').then(res => res.json()).then(setDoctors);
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedDoctor) return showAlert('Seleccione un doctor o Reporte Global');
    try {
      showLoading(true);
      setLoading(true);
      setReport(null);
      const url = selectedDoctor === 'ALL' 
        ? `/api/comisiones?month=${month}&year=${year}`
        : `/api/comisiones/${selectedDoctor}?month=${month}&year=${year}`;
        
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setReport({ ...data, isGlobal: selectedDoctor === 'ALL' });
      } else {
        showAlert(data.error || 'Error calculando comisiones');
      }
    } catch (err) {
      showAlert('Error de conexión con el servidor');
    } finally {
      setLoading(false);
      showLoading(false);
    }
  };

  const [sending, setSending] = useState(false);

  const handleSendEmail = async () => {
    if (!report) return;
    try {
      showLoading(true);
      setSending(true);
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, type: 'comision', month, year })
      });
      if (res.ok) {
        showSuccess(`Reporte enviado con éxito al correo: ${report.doctor.email}`);
      } else {
        showAlert('Error al enviar el correo');
      }
    } catch (error) {
      showAlert('Error de conexión');
    } finally {
      setSending(false);
      showLoading(false);
    }
  };

  return (
    <div className="comisiones-page">
      <header>
        <h1>Cálculo de Comisiones</h1>
        <p style={{ color: 'var(--text-light)' }}>Liquidación mensual de especialistas</p>
      </header>

      <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
          <label className="form-label">Doctor</label>
          <select className="form-control" value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}>
            <option value="">Seleccione Doctor...</option>
            <option value="ALL" style={{ fontWeight: 'bold' }}>REPORTE GLOBAL (TODOS)</option>
            {doctors.map(d => <option key={d._id} value={d._id}>{d.name} {d.surname}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label className="form-label">Mes</label>
          <select className="form-control" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('es', { month: 'long' }).toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label className="form-label">Año</label>
          <input type="number" className="form-control" value={year} onChange={e => setYear(parseInt(e.target.value))} />
        </div>
        <button className="btn btn-primary" onClick={handleGenerateReport} disabled={loading}>
          {loading ? 'Calculando...' : <><Calculator size={20} /> Calcular</>}
        </button>
      </div>

      {report && !report.isGlobal && (
        <>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--text-light)' }}>
              <small style={{ color: 'var(--text-light)' }}>Monto Total Facturado</small>
              <h3 style={{ margin: 0 }}>${report?.totals?.totalFacturado?.toLocaleString('es-CL') || '0'}</h3>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
              <small style={{ color: 'var(--text-light)' }}>Total Descuentos</small>
              <h3 style={{ margin: 0, color: 'var(--danger)' }}>-${report?.totals?.totalDescuentos?.toLocaleString('es-CL') || '0'}</h3>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <small style={{ color: 'var(--text-light)' }}>Subtotal (Total - Desc.)</small>
              <h3 style={{ margin: 0 }}>${report?.totals?.subtotal?.toLocaleString('es-CL') || '0'}</h3>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--secondary)' }}>
              <small style={{ color: 'var(--text-light)' }}>Comisión ({report?.doctor?.commissionPercentage || 0}%)</small>
              <h3 style={{ margin: 0 }}>${report?.totals?.commissionAmount?.toLocaleString('es-CL') || '0'}</h3>
            </div>
            <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
              <small style={{ color: 'var(--text-light)' }}>Retención ({report?.retentionPercentage || 13}%)</small>
              <h3 style={{ margin: 0 }}>-${report?.totals?.retention?.toLocaleString('es-CL') || '0'}</h3>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
              <small style={{ color: 'var(--text-light)' }}>Líquido a Pagar</small>
              <h1 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--success)' }}>${report?.totals?.totalLiquid?.toLocaleString('es-CL') || '0'}</h1>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Detalle de Ventas - {report.doctor.name} {report.doctor.surname}</h3>
              <button className="btn btn-secondary" onClick={handleSendEmail} disabled={sending}>
                <Mail size={18} /> {sending ? 'Enviando...' : 'Enviar al Doctor'}
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Paciente</th>
                    <th>Procedimiento</th>
                    <th>Monto Total</th>
                    <th>Descuento</th>
                    <th>Subtotal</th>
                    <th>Com. Bruta</th>
                    <th>Retención ({report?.retentionPercentage || 13}%)</th>
                    <th style={{ textAlign: 'right' }}>Com. Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {report?.sales?.map((s, idx) => {
                    const lineComm = s.clinicTotal * (report.doctor.commissionPercentage / 100);
                    const lineRet = !report.doctor.hasInvoice ? (lineComm * ((report.retentionPercentage || 13) / 100)) : 0;
                    const lineLiq = lineComm - lineRet;
                    
                    return (
                      <tr key={`${s._id}-${idx}`}>
                        <td>{new Date(s.date).toLocaleDateString('es-CL', { timeZone: 'UTC' })}</td>
                        <td>{s.patientId?.name || 'Invitado'} {s.patientId?.surname || ''}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {s.procedureName}
                            {s.commissionReleaseDate && !s.isPartialRelease && (
                              <span style={{ 
                                backgroundColor: 'var(--success-bg)', 
                                color: 'var(--success)', 
                                fontSize: '0.65rem', 
                                padding: '2px 6px', 
                                borderRadius: '12px',
                                fontWeight: 700,
                                border: '1px solid var(--success)'
                              }}>
                                LIBERADA
                              </span>
                            )}
                            {s.isPartialRelease && (
                              <span style={{ 
                                backgroundColor: '#eff6ff', 
                                color: '#1d4ed8', 
                                fontSize: '0.65rem', 
                                padding: '2px 6px', 
                                borderRadius: '12px',
                                fontWeight: 700,
                                border: '1px solid #dbeafe'
                              }}>
                                PARCIAL
                              </span>
                            )}
                          </div>
                          {s.isPartialRelease && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '4px' }}>
                              Lib. {s.releasePercentage}% de ${(s.originalTotalToCollect || 0).toLocaleString('es-CL')} original
                            </div>
                          )}
                        </td>
                        <td>${(s.totalToCollect || 0).toLocaleString('es-CL')}</td>
                        <td style={{ color: 'var(--danger)' }}>-${(s.discountTotal || 0).toLocaleString('es-CL')}</td>
                        <td>${(s.clinicTotal || 0).toLocaleString('es-CL')}</td>
                        <td>${Math.round(lineComm).toLocaleString('es-CL')}</td>
                        <td style={{ color: '#ef4444' }}>-${Math.round(lineRet).toLocaleString('es-CL')}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                          ${Math.round(lineLiq).toLocaleString('es-CL')}
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                    <td colSpan="3">TOTALES MENSUALES</td>
                    <td>${report?.totals?.totalFacturado?.toLocaleString('es-CL') || '0'}</td>
                    <td style={{ color: 'var(--danger)' }}>-${report?.totals?.totalDescuentos?.toLocaleString('es-CL') || '0'}</td>
                    <td>${report?.totals?.subtotal?.toLocaleString('es-CL') || '0'}</td>
                    <td>${Math.round(report?.totals?.commissionAmount || 0).toLocaleString('es-CL')}</td>
                    <td style={{ color: '#ef4444' }}>-${Math.round(report?.totals?.retention || 0).toLocaleString('es-CL')}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success)', fontSize: '1.2rem' }}>
                      ${Math.round(report?.totals?.totalLiquid || 0).toLocaleString('es-CL')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {report && report.isGlobal && (
        <>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--text-light)' }}>
              <small style={{ color: 'var(--text-light)' }}>Total Facturado Global</small>
              <h3 style={{ margin: 0 }}>${report?.globalTotals?.totalFacturado?.toLocaleString('es-CL') || '0'}</h3>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
              <small style={{ color: 'var(--text-light)' }}>Total Descuentos Global</small>
              <h3 style={{ margin: 0, color: 'var(--danger)' }}>-${report?.globalTotals?.totalDescuentos?.toLocaleString('es-CL') || '0'}</h3>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <small style={{ color: 'var(--text-light)' }}>Subtotal Global</small>
              <h3 style={{ margin: 0 }}>${report?.globalTotals?.subtotal?.toLocaleString('es-CL') || '0'}</h3>
            </div>
            <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
              <small style={{ color: 'var(--text-light)' }}>Retenciones Globales ({report?.retentionPercentage || 13}%)</small>
              <h3 style={{ margin: 0 }}>-${report?.globalTotals?.retention?.toLocaleString('es-CL') || '0'}</h3>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
              <small style={{ color: 'var(--text-light)' }}>Total a Pagar Doctores</small>
              <h1 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--success)' }}>${report?.globalTotals?.totalLiquid?.toLocaleString('es-CL') || '0'}</h1>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Consolidado Global por Doctor</h3>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Tratamientos</th>
                    <th>Total Facturado</th>
                    <th>Descuentos</th>
                    <th>Subtotal</th>
                    <th>Comisión Bruta</th>
                    <th>Retención ({report?.retentionPercentage || 13}%)</th>
                    <th style={{ textAlign: 'right' }}>Total a Pagar</th>
                  </tr>
                </thead>
                <tbody>
                  {report?.reports?.map((r) => {
                    return (
                      <tr key={r.doctor._id}>
                        <td style={{ fontWeight: 'bold' }}>{r.doctor.name} {r.doctor.surname}</td>
                        <td>{r.salesCount}</td>
                        <td>${(r.totals.totalFacturado || 0).toLocaleString('es-CL')}</td>
                        <td style={{ color: 'var(--danger)' }}>-${(r.totals.totalDescuentos || 0).toLocaleString('es-CL')}</td>
                        <td>${(r.totals.subtotal || 0).toLocaleString('es-CL')}</td>
                        <td>${Math.round(r.totals.commissionAmount || 0).toLocaleString('es-CL')}</td>
                        <td style={{ color: '#ef4444' }}>-${Math.round(r.totals.retention || 0).toLocaleString('es-CL')}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                          ${Math.round(r.totals.totalLiquid || 0).toLocaleString('es-CL')}
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                    <td colSpan="2">TOTALES MENSUALES CLINICA</td>
                    <td>${report?.globalTotals?.totalFacturado?.toLocaleString('es-CL') || '0'}</td>
                    <td style={{ color: 'var(--danger)' }}>-${report?.globalTotals?.totalDescuentos?.toLocaleString('es-CL') || '0'}</td>
                    <td>${report?.globalTotals?.subtotal?.toLocaleString('es-CL') || '0'}</td>
                    <td>${Math.round(report?.globalTotals?.commissionAmount || 0).toLocaleString('es-CL')}</td>
                    <td style={{ color: '#ef4444' }}>-${Math.round(report?.globalTotals?.retention || 0).toLocaleString('es-CL')}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success)', fontSize: '1.2rem' }}>
                      ${Math.round(report?.globalTotals?.totalLiquid || 0).toLocaleString('es-CL')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
