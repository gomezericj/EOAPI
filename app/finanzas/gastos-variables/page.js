"use client";
import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useSession } from 'next-auth/react';
import Portal from '@/components/Portal';

export default function GastosVariablesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
  const { showAlert, showConfirm, showSuccess } = useNotification();
  const [expenses, setExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({ name: '', description: '', amount: 0, month: new Date().getMonth() + 1, year: currentYear });

  const months = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
  ];

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    const res = await fetch('/api/finanzas/gastos-variables');
    const data = await res.json();
    setExpenses(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = formData._id ? `/api/finanzas/gastos-variables/${formData._id}` : '/api/finanzas/gastos-variables';
    const method = formData._id ? 'PUT' : 'POST';

    // Force year to current year just in case
    const payload = { ...formData, year: currentYear, month: Number(formData.month) };

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setShowModal(false);
      setFormData({ name: '', description: '', amount: 0, month: new Date().getMonth() + 1, year: currentYear });
      fetchData();
      showSuccess(formData._id ? 'Gasto Variable actualizado' : 'Gasto Variable registrado');
    } else {
      const err = await res.json();
      showAlert(err.error || 'Error al guardar Gasto Variable');
    }
  };

  const handleEdit = (e) => {
    setFormData(e);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    showConfirm('¿Eliminar este Gasto Variable?', async () => {
      const res = await fetch(`/api/finanzas/gastos-variables/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        showSuccess('Gasto Variable eliminado');
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
          <h1>Gastos Variables</h1>
          <p style={{ color: 'var(--text-light)' }}>Gastos esporádicos aplicables a un mes específico</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} /> Nuevo Gasto Variable
        </button>
      </header>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Mes / Año</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Gasto</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Descripción</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Monto</th>
              <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No hay gastos variables registrados</td></tr>
            ) : expenses.map(e => (
              <tr key={e._id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem' }}><span className="badge-role superadmin">{months.find(m => m.value === e.month)?.label} {e.year}</span></td>
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
            <div className="card" style={{ width: '500px' }}>
              <h2>{formData._id ? 'Editar' : 'Nuevo'} Gasto Variable</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Mes</label>
                    <select className="form-control" value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} required>
                      {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Año</label>
                    <input type="number" className="form-control" value={currentYear} disabled style={{ backgroundColor: '#f1f5f9' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nombre del Gasto</label>
                  <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ej. Reparación sillón" />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea className="form-control" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required rows="3" placeholder="Detalles del gasto..."></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label">Monto</label>
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
