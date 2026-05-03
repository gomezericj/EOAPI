"use client";
import { useState, useEffect } from 'react';
import { Plus, Search, Package, Trash2, Tag, Truck, Edit, ToggleLeft, ToggleRight } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useSession } from 'next-auth/react';

export default function SuppliesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
  const { showAlert, showConfirm, showSuccess } = useNotification();
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [providers, setProviders] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Insumo',
    unitPrice: '',
    providerId: '',
    providerName: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSupplies = async () => {
    try {
      const res = await fetch('/api/insumos', { cache: 'no-store' });
      const data = await res.json();
      setSupplies(data);
    } catch (err) {
      console.error('Error fetching supplies:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      setProviders(data.filter(p => p.isActive !== false));
    } catch (err) {
      console.error('Error fetching providers:', err);
    }
  };

  useEffect(() => {
    fetchSupplies();
    fetchProviders();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = formData._id ? `/api/insumos/${formData._id}` : '/api/insumos';
      const method = formData._id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({ name: '', category: 'Insumo', unitPrice: '', providerId: '', providerName: '' });
        fetchSupplies();
        showSuccess(formData._id ? 'Costo actualizado' : 'Costo registrado');
      } else {
        const data = await res.json();
        showAlert(data.error);
      }
    } catch (err) {
      showAlert('Error al guardar');
    }
  };

  const handleEdit = (s) => {
    setFormData({ ...s });
    setShowModal(true);
  };

  const handleToggleStatus = async (s) => {
    showConfirm(s.isActive === false ? '¿Habilitar ítem?' : '¿Deshabilitar ítem?', async () => {
      try {
        const res = await fetch(`/api/insumos/${s._id}`, { method: 'DELETE' });
        if (res.ok) {
          const result = await res.json();
          setSupplies(prev => prev.map(item => item._id === s._id ? { ...item, isActive: result.isActive } : item));
          showSuccess(result.isActive ? 'Ítem habilitado' : 'Ítem deshabilitado');
        } else {
          showAlert('Error al cambiar estado');
        }
      } catch (err) {
        showAlert('Error procesando solicitud');
      }
    });
  };

  const filteredSupplies = supplies.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.providerName && s.providerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.provider && s.provider.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="supplies-page">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Gestión de Descuentos y Costos</h1>
          <p style={{ color: 'var(--text-light)' }}>Control de insumos, laboratorio y otros costos directos</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setFormData({ name: '', category: 'Insumo', unitPrice: '', providerId: '', providerName: '' });
          setShowModal(true);
        }}>
          <Plus size={20} />
          Nuevo Descuento/Costo
        </button>
      </header>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} size={18} />
          <input
            type="text"
            placeholder="Buscar ítem..."
            className="form-control"
            style={{ paddingLeft: '3rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Descuento / Costo</th>
              <th>Categoría</th>
              <th>Costo Base</th>
              <th>Proveedor</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>Cargando...</td></tr>
            ) : filteredSupplies.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>No hay ítems registrados</td></tr>
            ) : filteredSupplies.map((s) => (
              <tr key={s._id} style={{ opacity: s.isActive === false ? 0.6 : 1, backgroundColor: s.isActive === false ? '#f9fafb' : 'transparent' }}>
                <td style={{ fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Package size={18} style={{ color: s.isActive === false ? '#888' : 'var(--secondary)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {s.isActive === false && <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', textTransform: 'uppercase' }}>DESHABILITADO</span>}
                      {s.name}
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{
                    backgroundColor: s.isActive === false ? '#eee' : 'var(--accent)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: s.isActive === false ? '#888' : 'var(--primary)'
                  }}>
                    {s.category}
                  </span>
                </td>
                <td style={{ fontWeight: 700, color: s.isActive === false ? '#888' : 'var(--danger)' }}>
                  ${(s.unitPrice || 0).toLocaleString('es-CL')}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                    <Truck size={14} /> {s.providerName || s.provider || 'Sin proveedor'}
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

      {showModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '500px' }}>
            <h2>{formData._id ? 'Editar Descuento/Costo' : 'Registrar Descuento o Costo'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre del Descuento/Costo</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ej: Anestesia Carpule"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select
                  className="form-control"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="Insumo">Insumo Médico</option>
                  <option value="Laboratorio">Laboratorio</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Costo ($)</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.unitPrice}
                  onChange={e => setFormData({ ...formData, unitPrice: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Proveedor</label>
                <select
                  className="form-control"
                  value={formData.providerId || ""}
                  onChange={e => {
                    const id = e.target.value;
                    const provider = providers.find(p => p._id === id);
                    setFormData({ 
                      ...formData, 
                      providerId: id, 
                      providerName: provider ? provider.name : '' 
                    });
                  }}
                  required
                >
                  <option value="">Seleccione un proveedor...</option>
                  {providers.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ border: '1px solid var(--border)' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
