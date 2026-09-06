"use client";
import { useState, useEffect } from 'react';
import { Plus, Target, Calendar, TrendingUp, Trash2, Edit, X } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useSession } from 'next-auth/react';
import Portal from '@/components/Portal';

export default function TargetsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
  const { showAlert, showConfirm, showSuccess, showLoading } = useNotification();
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    month: currentMonth,
    year: currentYear,
    amount: ''
  });

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const fetchTargets = async () => {
    try {
      const res = await fetch('/api/metas');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTargets(data);
      } else {
        setTargets([]);
        if (data.error) console.error(data.error);
      }
    } catch (err) {
      console.error('Error fetching targets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchTargets();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>No autorizado.</div>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      showLoading(true);
      const url = formData._id ? `/api/metas/${formData._id}` : '/api/metas';
      const method = formData._id ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({ month: currentMonth, year: currentYear, amount: '' });
        fetchTargets();
        showSuccess(formData._id ? 'Meta actualizada' : 'Meta registrada');
      } else {
        const data = await res.json();
        showAlert(data.error);
      }
    } catch (err) {
      showAlert('Error al guardar meta');
    } finally {
      showLoading(false);
    }
  };

  const handleEdit = (t) => {
    setFormData({ ...t });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    showConfirm('¿Eliminar meta?', async () => {
      try {
        showLoading(true);
        const res = await fetch(`/api/metas/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchTargets();
          showSuccess('Meta eliminada');
        } else {
          const data = await res.json();
          showAlert(data.error || 'Error al eliminar');
        }
      } catch (err) {
        showAlert('Error de conexión');
      } finally {
        showLoading(false);
      }
    });
  };

  return (
    <div className="targets-page">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Metas de Venta Mensual</h1>
          <p style={{ color: 'var(--text-light)' }}>Objetivos financieros para el equipo</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={20} />
            Establecer Meta
          </button>
        )}
      </header>

      <div className="card" style={{ maxWidth: '800px' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Periodo</th>
                <th>Meta Establecida</th>
                {isAdmin && <th style={{ textAlign: 'right' }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3" style={{ textAlign: 'center' }}>Cargando...</td></tr>
              ) : targets.length === 0 ? (
                <tr><td colSpan={isAdmin ? "3" : "2"} style={{ textAlign: 'center' }}>No hay metas establecidas</td></tr>
              ) : targets.map((t) => (
                <tr key={t._id}>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Calendar size={18} style={{ color: 'var(--secondary)' }} />
                      {months[t.month - 1]} {t.year}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <TrendingUp size={16} style={{ color: 'var(--success)' }} />
                      ${(t.amount || 0).toLocaleString('es-CL')}
                    </div>
                  </td>
                  {isAdmin && (
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-action-edit" style={{ marginRight: '1rem' }} onClick={() => handleEdit(t)}><Edit size={16} /></button>
                      <button className="btn-action-delete" onClick={() => handleDelete(t._id)}><Trash2 size={16} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Portal>
          <div className="modal-overlay">
            <div className="card" style={{ width: '480px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', borderRadius: '16px' }}>
              
              {/* Encabezado */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#f0fdfa', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Target size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {formData._id ? 'Editar Meta Mensual' : 'Establecer Meta Mensual'}
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)' }}>
                      Objetivo de recaudación mensual para el dashboard financiero.
                    </p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  title="Cerrar" 
                  style={{ 
                    width: '34px', 
                    height: '34px', 
                    borderRadius: '8px', 
                    backgroundColor: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    cursor: 'pointer', 
                    color: 'var(--text-light)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Mes de Evaluación</label>
                      <select 
                        className="form-control" 
                        value={formData.month} 
                        onChange={e => setFormData({...formData, month: parseInt(e.target.value)})}
                        style={{ marginBottom: 0 }}
                      >
                        {months.map((m, i) => (
                          <option key={m} value={i + 1}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Año</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={formData.year} 
                        onChange={e => setFormData({...formData, year: parseInt(e.target.value)})} 
                        required 
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Monto Objetivo a Recaudar ($)</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ padding: '0 0.75rem', height: '40px', display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRight: 'none', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', fontWeight: 700, color: '#64748b' }}>$</span>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={formData.amount} 
                        onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} 
                        required 
                        placeholder="Ej: 15000000"
                        style={{ margin: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, fontSize: '0.95rem', fontWeight: 600 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer de Acciones */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', fontWeight: 700 }}>Guardar Meta</button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
