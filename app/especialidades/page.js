"use client";
import { useState, useEffect } from 'react';
import { Plus, Search, Star, Trash2, Edit, ToggleLeft, ToggleRight } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useSession } from 'next-auth/react';
import Portal from '@/components/Portal';

export default function SpecialtiesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
  const { showAlert, showConfirm, showSuccess, showLoading } = useNotification();
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '' });

  const fetchSpecialties = async () => {
    try {
      const res = await fetch('/api/especialidades', { cache: 'no-store' });
      const data = await res.json();
      setSpecialties(data);
    } catch (err) {
      console.error('Error fetching specialties:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecialties();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = formData._id ? `/api/especialidades/${formData._id}` : '/api/especialidades';
      const method = formData._id ? 'PUT' : 'POST';

      showLoading(true);
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({ name: '' });
        await fetchSpecialties();
        showSuccess(formData._id ? 'Especialidad actualizada' : 'Especialidad registrada');
      } else {
        const data = await res.json();
        showAlert(data.error);
      }
    } catch (err) {
      showAlert('Error al guardar especialidad');
    } finally {
      showLoading(false);
    }
  };

  const handleEdit = (s) => {
    setFormData({ ...s });
    setShowModal(true);
  };

  const handleToggleStatus = async (s) => {
    showConfirm(s.isActive === false ? '¿Habilitar especialidad?' : '¿Deshabilitar especialidad?', async () => {
      showLoading(true);
      try {
        const res = await fetch(`/api/especialidades/${s._id}`, { method: 'DELETE' });
        if (res.ok) {
          const result = await res.json();
          setSpecialties(prev => prev.map(item => item._id === s._id ? { ...item, isActive: result.isActive } : item));
          showSuccess(result.isActive ? 'Especialidad habilitada' : 'Especialidad deshabilitada');
        } else {
          showAlert('Error al cambiar estado');
        }
      } catch (err) {
        showAlert('Error procesando solicitud');
      } finally {
        showLoading(false);
      }
    });
  };

  return (
    <div className="specialties-page">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Gestión de Especialidades</h1>
          <p style={{ color: 'var(--text-light)' }}>Define las especialidades médicas de la clínica</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          Nueva Especialidad
        </button>
      </header>

      <div className="card" style={{ maxWidth: '600px', margin: '0 0 2rem 0' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Especialidad</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="2" style={{ textAlign: 'center' }}>Cargando...</td></tr>
              ) : specialties.length === 0 ? (
                <tr><td colSpan="2" style={{ textAlign: 'center' }}>No hay especialidades registradas</td></tr>
              ) : specialties.map((s) => (
                <tr key={s._id} style={{ opacity: s.isActive === false ? 0.6 : 1, backgroundColor: s.isActive === false ? '#f9fafb' : 'transparent' }}>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Star size={18} style={{ color: s.isActive === false ? '#888' : 'var(--warning)' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {s.isActive === false && <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', textTransform: 'uppercase' }}>DESHABILITADO</span>}
                        {s.name}
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn-action-edit" onClick={() => handleEdit(s)}><Edit size={18} /></button>
                      {isAdmin && (
                        <button
                          className={s.isActive === false ? "btn-action-success" : "btn-action-delete"}
                          title={s.isActive === false ? "Habilitar" : "Deshabilitar"}
                          onClick={() => handleToggleStatus(s)}
                        >
                          {s.isActive === false ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Portal>
          <div className="modal-overlay">
            <div className="card" style={{ width: '400px' }}>
              <h2>{formData._id ? 'Editar Especialidad' : 'Registrar Especialidad'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Nombre de Especialidad</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ej: Ortodoncia"
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ border: '1px solid var(--border)' }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
