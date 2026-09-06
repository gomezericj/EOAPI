"use client";
import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X, DollarSign } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useSession } from 'next-auth/react';
import Portal from '@/components/Portal';

export default function GastosFijosPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
  const { showAlert, showConfirm, showSuccess } = useNotification();
  const [expenses, setExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', amount: 0 });

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    const res = await fetch('/api/finanzas/gastos-fijos');
    const data = await res.json();
    setExpenses(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = formData._id ? `/api/finanzas/gastos-fijos/${formData._id}` : '/api/finanzas/gastos-fijos';
    const method = formData._id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      setShowModal(false);
      setFormData({ name: '', description: '', amount: 0 });
      fetchData();
      showSuccess(formData._id ? 'Gasto Fijo actualizado' : 'Gasto Fijo registrado');
    } else {
      const err = await res.json();
      showAlert(err.error || 'Error al guardar Gasto Fijo');
    }
  };

  const handleEdit = (e) => {
    setFormData(e);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    showConfirm('¿Eliminar este Gasto Fijo?', async () => {
      const res = await fetch(`/api/finanzas/gastos-fijos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        showSuccess('Gasto Fijo eliminado');
      } else {
        const err = await res.json();
        showAlert(err.error || 'Error al eliminar');
      }
    });
  };

  if (!isAdmin) return <div style={{ padding: '2rem' }}>No tienes acceso a esta página.</div>;

  return (
    <div className="expenses-page">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Gastos Fijos</h1>
          <p style={{ color: 'var(--text-light)' }}>Gestión de gastos fijos mensuales (Ej. Arriendo, Luz, Sueldos base)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} /> Nuevo Gasto Fijo
        </button>
      </header>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Gasto</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Descripción</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Monto Mensual</th>
              <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No hay gastos fijos registrados</td></tr>
            ) : expenses.map(e => (
              <tr key={e._id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem', fontWeight: 500 }}>{e.name}</td>
                <td style={{ padding: '1rem', color: 'var(--text-light)' }}>{e.description}</td>
                <td style={{ padding: '1rem', color: 'var(--danger)', fontWeight: 600 }}>${e.amount.toLocaleString('es-CL')}</td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button onClick={() => handleEdit(e)} className="btn-action-edit" style={{ marginRight: '0.5rem' }}><Edit size={16} /></button>
                  <button onClick={() => handleDelete(e._id)} className="btn-action-delete"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Portal>
          <div className="modal-overlay">
            <div className="card" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', borderRadius: '16px' }}>
              
              {/* Encabezado */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#f0fdfa', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {formData._id ? 'Editar Gasto Fijo' : 'Nuevo Gasto Fijo'}
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)' }}>
                      Costos recurrentes fijos imputados mes a mes a la clínica.
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
                  <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Nombre del Gasto</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      required 
                      placeholder="Ej: Arriendo, Internet, Software Dental..." 
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Descripción o Notas</label>
                    <textarea 
                      className="form-control" 
                      value={formData.description} 
                      onChange={e => setFormData({...formData, description: e.target.value})} 
                      required 
                      rows="2" 
                      placeholder="Detalles sobre contrato o proveedor..."
                      style={{ marginBottom: 0 }}
                    ></textarea>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Monto Fijo Mensual ($)</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ padding: '0 0.75rem', height: '40px', display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRight: 'none', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', fontWeight: 700, color: '#64748b' }}>$</span>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={formData.amount} 
                        onChange={e => setFormData({...formData, amount: Number(e.target.value)})} 
                        required 
                        min="0" 
                        style={{ margin: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, fontSize: '0.95rem', fontWeight: 600 }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', fontWeight: 700 }}>
                    <Save size={16} style={{ marginRight: '0.4rem' }} /> Guardar Gasto
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
