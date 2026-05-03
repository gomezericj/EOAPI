"use client";
import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save } from 'lucide-react';
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
            <div className="card" style={{ width: '450px' }}>
              <h2>{formData._id ? 'Editar' : 'Nuevo'} Gasto Fijo</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Nombre del Gasto</label>
                  <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ej. Arriendo" />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea className="form-control" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required rows="3" placeholder="Detalles del gasto..."></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label">Monto (por mes)</label>
                  <input type="number" className="form-control" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} required min="0" />
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ border: '1px solid var(--border)' }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary"><Save size={16} style={{ marginRight: '0.5rem' }} /> Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
