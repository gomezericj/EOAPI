"use client";
import { useState, useEffect } from 'react';
import { Mail, Calendar, DollarSign, Users, CreditCard, Shield, TrendingDown, TrendingUp, CheckCircle2, Trash2 } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useSession } from 'next-auth/react';

export default function CierresPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
  const { showAlert, showSuccess, showConfirm, showLoading } = useNotification();
  const now = new Date();
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [date, setDate] = useState(localToday);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('es-CL');

  const fetchReport = async () => {
    setLoading(true);
    const res = await fetch(`/api/cierres/${date}`);
    const data = await res.json();
    setReport(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, [date]);

  const handleSaveClosure = async () => {
    setSaving(true);
    showLoading(true);
    try {
      const res = await fetch(`/api/cierres/${date}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
      if (res.ok) {
        showSuccess('Cierre guardado en base de datos');
        await fetchReport();
      } else {
        showAlert('Error al guardar el cierre');
      }
    } catch (err) {
      showAlert('Error de conexión');
    } finally {
      setSaving(false);
      showLoading(false);
    }
  };

  const handleSendReport = async () => {
    setSending(true);
    showLoading(true);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, type: 'cierre' })
      });
      if (res.ok) {
        showSuccess('Reporte enviado con éxito');
      } else {
        showAlert('Error enviando el reporte');
      }
    } catch (err) {
      showAlert('Error de conexión');
    } finally {
      setSending(false);
      showLoading(false);
    }
  };

  const handleDeleteClosure = async () => {
    showConfirm('¿Está seguro de eliminar este cierre? Esto permitirá editar ventas y egresos de este día.', async () => {
      setSaving(true);
      showLoading(true);
      try {
        const res = await fetch(`/api/cierres/${date}`, { method: 'DELETE' });
        if (res.ok) {
          showSuccess('Cierre eliminado. El día ahora está abierto para ediciones.');
          await fetchReport();
        } else {
          showAlert('Error al eliminar el cierre');
        }
      } catch (err) {
        showAlert('Error de conexión');
      } finally {
        setSaving(false);
        showLoading(false);
      }
    });
  };

  return (
    <div className="cierres-page">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Cierre de Caja Diario</h1>
          <p style={{ color: 'var(--text-light)' }}>Gestión de cierres y reportes a admin</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={fetchReport} title="Refrescar datos">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
          </button>
          <label style={{ fontWeight: 600 }}>Seleccionar Fecha:</label>
          <input
            type="date"
            className="form-control"
            value={date}
            onChange={e => setDate(e.target.value)}
            max={localToday}
            style={{ width: '200px' }}
          />
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '4rem' }}>Cargando reporte...</div>
      ) : report && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#f59e0b' }}><TrendingUp size={28} /></div>
              <div>
                <small style={{ color: 'var(--text-light)', fontWeight: 600, fontSize: '0.9rem' }}>Venta Clínica (Tratamientos del {displayDate})</small>
                <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.8rem' }}>${(report.clinicalSaleTotal || 0).toLocaleString('es-CL')}</h3>
              </div>
            </div>
            <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#3b82f6' }}><DollarSign size={28} /></div>
              <div>
                <small style={{ color: 'var(--text-light)', fontWeight: 600, fontSize: '0.9rem' }}>Total Recaudado (Caja Fuerte)</small>
                <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.8rem' }}>${((report.cashTotal || 0) + (report.debitTotal || 0) + (report.creditTotal || 0) + (report.insuranceTotal || 0) + (report.transferTotal || 0)).toLocaleString('es-CL')}</h3>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div className="card" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderTop: '4px solid #10b981', padding: '1rem 0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981' }}><DollarSign size={20} /></div>
              <div><small style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>Efectivo</small><h3 style={{ margin: 0, fontSize: '1.1rem' }}>${(report.cashTotal || 0).toLocaleString('es-CL')}</h3></div>
            </div>
            <div className="card" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderTop: '4px solid var(--secondary)', padding: '1rem 0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: '#f0f9ff', color: 'var(--secondary)' }}><CreditCard size={20} /></div>
              <div><small style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>Transbank</small><h3 style={{ margin: 0, fontSize: '1.1rem' }}>${((report.debitTotal || 0) + (report.creditTotal || 0)).toLocaleString('es-CL')}</h3></div>
            </div>
            <div className="card" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderTop: '4px solid #f59e0b', padding: '1rem 0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: '#fff7ed', color: '#f59e0b' }}><TrendingUp size={20} /></div>
              <div><small style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>Transferencia</small><h3 style={{ margin: 0, fontSize: '1.1rem' }}>${(report.transferTotal || 0).toLocaleString('es-CL')}</h3></div>
            </div>
            <div className="card" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderTop: '4px solid #8b5cf6', padding: '1rem 0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: '#f5f3ff', color: '#8b5cf6' }}><Shield size={20} /></div>
              <div><small style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>Seguros</small><h3 style={{ margin: 0, fontSize: '1.1rem' }}>${(report.insuranceTotal || 0).toLocaleString('es-CL')}</h3></div>
            </div>
            <div className="card" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderTop: '4px solid #ef4444', padding: '1rem 0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#ef4444' }}><Users size={20} /></div>
              <div><small style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>Pendiente</small><h3 style={{ margin: 0, fontSize: '1.1rem' }}>${(report.pendingTotal || 0).toLocaleString('es-CL')}</h3></div>
            </div>
          </div>

          {report.isSaved && (
            <div className="card" style={{ marginBottom: '2rem', backgroundColor: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <CheckCircle2 size={24} />
                <div>
                  <strong>Este cierre ya ha sido guardado.</strong>
                  <p style={{ fontSize: '0.8rem', margin: 0 }}>Registrado el: {new Date(report.savedAt).toLocaleString('es-CL')}</p>
                </div>
              </div>
              {isAdmin && (
                <button className="btn btn-danger" onClick={handleDeleteClosure} title="Eliminar Cierre" disabled={saving}>
                  <Trash2 size={20} />
                  {saving ? 'Eliminando...' : 'Eliminar Cierre'}
                </button>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>Venta Clínica (Tratamientos del {displayDate})</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderRadius: '4px', padding: '0.75rem', marginBottom: '0.5rem', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Venta Clínica Total</span>
                    <strong style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>${(report.clinicalSaleTotal || 0).toLocaleString('es-CL')}</strong>
                  </li>
                  
                  <div style={{ backgroundColor: '#fff', padding: '0.5rem 0.5rem 0.5rem 1rem', borderLeft: '3px solid #e2e8f0', marginLeft: '0.25rem' }}>
                    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.9rem' }}><span>Efectivo</span><strong>${(report.todayTotals?.cash || 0).toLocaleString('es-CL')}</strong></li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.9rem' }}><span>Débito</span><strong>${(report.todayTotals?.debit || 0).toLocaleString('es-CL')}</strong></li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.9rem' }}><span>Crédito</span><strong>${(report.todayTotals?.credit || 0).toLocaleString('es-CL')}</strong></li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.9rem' }}><span>Seguro</span><strong>${(report.todayTotals?.insurance || 0).toLocaleString('es-CL')}</strong></li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.9rem' }}><span>Transferencia</span><strong>${(report.todayTotals?.transfer || 0).toLocaleString('es-CL')}</strong></li>
                  </div>

                  <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 600 }}>Subtotal Cobrado</span>
                    <strong style={{ fontSize: '1.1rem' }}>${((report.todayTotals?.cash || 0) + (report.todayTotals?.debit || 0) + (report.todayTotals?.credit || 0) + (report.todayTotals?.insurance || 0) + (report.todayTotals?.transfer || 0)).toLocaleString('es-CL')}</strong>
                  </li>


                  {(report.paidBeforeTotal > 0 || !report.isSaved) && (
                    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: '#64748b' }}>
                      <span>Cobradas en Días Previos</span>
                      <strong>${(report.paidBeforeTotal || 0).toLocaleString('es-CL')}</strong>
                    </li>
                  )}
                  
                  {(report.paidAfterTotal > 0 || !report.isSaved) && (
                    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: '#64748b' }}>
                      <span>Cobradas en Días Posteriores</span>
                      <strong>${(report.paidAfterTotal || 0).toLocaleString('es-CL')}</strong>
                    </li>
                  )}

                  <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', color: 'var(--danger)', borderTop: '1px dashed #cbd5e1', marginTop: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>Pendiente Actual por Cobrar</span>
                    <strong style={{ fontSize: '1.1rem' }}>${(report.pendingTotal || 0).toLocaleString('es-CL')}</strong>
                  </li>
                </ul>
              </div>

              <div>
                <h3 style={{ color: 'var(--success)', marginBottom: '1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>Abonos a Deuda Pasada</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}><span>Efectivo</span><strong>${(report.pastTotals?.cash || 0).toLocaleString('es-CL')}</strong></li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}><span>Débito</span><strong>${(report.pastTotals?.debit || 0).toLocaleString('es-CL')}</strong></li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}><span>Crédito</span><strong>${(report.pastTotals?.credit || 0).toLocaleString('es-CL')}</strong></li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}><span>Seguro</span><strong>${(report.pastTotals?.insurance || 0).toLocaleString('es-CL')}</strong></li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}><span>Transferencia</span><strong>${(report.pastTotals?.transfer || 0).toLocaleString('es-CL')}</strong></li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#ecfdf5', borderRadius: '4px', padding: '0.75rem', marginTop: '0.5rem', border: '1px solid #a7f3d0' }}>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>Total Recaudado Abonos</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--success)' }}>${((report.pastTotals?.cash || 0) + (report.pastTotals?.debit || 0) + (report.pastTotals?.credit || 0) + (report.pastTotals?.insurance || 0) + (report.pastTotals?.transfer || 0)).toLocaleString('es-CL')}</strong>
                  </li>
                </ul>
              </div>

              <div style={{ marginTop: 'auto', borderTop: '2px solid var(--border)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total General Recaudado</span>
                  <strong style={{ fontSize: '1.5rem' }}>${((report.cashTotal || 0) + (report.debitTotal || 0) + (report.creditTotal || 0) + (report.insuranceTotal || 0) + (report.transferTotal || 0)).toLocaleString('es-CL')}</strong>
                </div>
              </div>
            </div>

            <div className="card">
              <h3>Resumen Operativo</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Pacientes Atendidos con Venta</span><strong>{report.totalPatients || 0}</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Total Dinero Recaudado (+)</span><strong>${((report.cashTotal || 0) + (report.debitTotal || 0) + (report.creditTotal || 0) + (report.insuranceTotal || 0) + (report.transferTotal || 0)).toLocaleString('es-CL')}</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--border)', color: 'var(--danger)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingDown size={18} /> Egresos de Caja (-)</span>
                    <ul style={{ listStyle: 'none', paddingLeft: '1.5rem', margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                      <li style={{ marginBottom: '0.25rem' }}>• Vale Personal: ${(report.expensesByType?.valePersonal || 0).toLocaleString('es-CL')}</li>
                      <li style={{ marginBottom: '0.25rem' }}>• Gasto Clínica: ${(report.expensesByType?.gastoClinica || 0).toLocaleString('es-CL')}</li>
                      <li>• Otro: ${(report.expensesByType?.otro || 0).toLocaleString('es-CL')}</li>
                    </ul>
                  </div>
                  <strong>-${(report.expensesTotal || 0).toLocaleString('es-CL')}</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--border)', color: 'var(--warning)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={18} /> Seguros (No ingresa en el día) (-)</span>
                  <strong style={{ color: 'var(--danger)' }}>-${(report.insuranceTotal || 0).toLocaleString('es-CL')}</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 0', fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                  <span>Subtotal Neto</span>
                  <strong>${((report.cashTotal || 0) + (report.debitTotal || 0) + (report.creditTotal || 0) + (report.transferTotal || 0) - (report.expensesTotal || 0)).toLocaleString('es-CL')}</strong>
                </li>
              </ul>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <button
                  className={report.isSaved ? "btn" : "btn btn-primary"}
                  style={{ 
                    width: '100%', 
                    backgroundColor: report.isSaved ? '#e2e8f0' : undefined,
                    color: report.isSaved ? '#64748b' : undefined,
                    borderColor: report.isSaved ? '#cbd5e1' : undefined,
                    cursor: report.isSaved ? 'not-allowed' : 'pointer' 
                  }}
                  onClick={handleSaveClosure}
                  disabled={saving || report.isSaved}
                >
                  <Calendar size={20} />
                  {saving ? 'Guardando...' : report.isSaved ? 'Cierre ya guardado' : 'Guardar Cierre en Base de Datos'}
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={handleSendReport}
                  disabled={sending}
                >
                  <Mail size={20} />
                  {sending ? 'Enviando...' : 'Enviar Reporte por Correo'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
