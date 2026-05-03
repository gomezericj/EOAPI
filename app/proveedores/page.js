"use client";
import { useState, useEffect } from 'react';
import { Plus, Search, Truck, Phone, MapPin, Edit, Trash2, Download, ToggleLeft, ToggleRight, Briefcase, CreditCard } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import Portal from '@/components/Portal';

export default function ProvidersPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
  const { showAlert, showConfirm, showSuccess, showLoading } = useNotification();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    rut: '',
    address: '',
    rubro: '',
    credit: false,
    creditDays: 0
  });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/providers', { cache: 'no-store' });
      const data = await res.json();
      setProviders(data);
    } catch (err) {
      console.error('Error fetching providers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = formData._id ? `/api/providers/${formData._id}` : '/api/providers';
      const method = formData._id ? 'PUT' : 'POST';

      showLoading(true);
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({
          name: '', rut: '', address: '', rubro: '', credit: false, creditDays: 0
        });
        await fetchProviders();
        showSuccess(formData._id ? 'Proveedor actualizado' : 'Proveedor registrado');
      } else {
        const data = await res.json();
        showAlert(data.error);
      }
    } catch (err) {
      showAlert('Error al guardar proveedor');
    } finally {
      showLoading(false);
    }
  };

  const filteredProviders = providers.filter(p =>
    (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.rut && p.rut.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.rubro && p.rubro.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportToExcel = () => {
    const data = filteredProviders.map(p => ({
      Nombre: p.name,
      RUT: p.rut,
      Dirección: p.address || '',
      Rubro: p.rubro || '',
      Crédito: p.credit ? 'Sí' : 'No',
      'Días Crédito': p.creditDays || 0,
      Estado: p.isActive !== false ? 'Activo' : 'Deshabilitado'
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Proveedores");
    XLSX.writeFile(workbook, "Proveedores_ClinicaDental.xlsx");
  };

  return (
    <div className="providers-page">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Gestión de Proveedores</h1>
          <p style={{ color: 'var(--text-light)' }}>Entidades que suministran insumos y servicios</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setFormData({ name: '', rut: '', address: '', rubro: '', credit: false, creditDays: 0 });
          setShowModal(true);
        }}>
          <Plus size={20} />
          Nuevo Proveedor
        </button>
      </header>

      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, RUT o rubro..."
            className="form-control"
            style={{ paddingLeft: '3rem', margin: 0 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-excel" onClick={exportToExcel}>
          <Download size={20} /> Excel
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>RUT</th>
              <th>Nombre</th>
              <th>Rubro</th>
              <th>Crédito</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>Cargando...</td></tr>
            ) : filteredProviders.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>No hay proveedores registrados</td></tr>
            ) : filteredProviders.map((p) => (
              <tr key={p._id} style={{ opacity: p.isActive === false ? 0.6 : 1, backgroundColor: p.isActive === false ? '#f9fafb' : 'transparent' }}>
                <td style={{ fontWeight: 600 }}>{p.rut}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {p.isActive === false && <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', textTransform: 'uppercase' }}>DESHABILITADO</span>}
                    {p.name}
                  </div>
                </td>
                <td>{p.rubro || '-'}</td>
                <td>
                  {p.credit ? (
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>Sí ({p.creditDays} días)</span>
                  ) : (
                    <span style={{ color: 'var(--text-light)' }}>No</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn-action-edit" onClick={() => {
                      setFormData({ ...p });
                      setShowModal(true);
                    }}><Edit size={18} /></button>
                    {isAdmin && (
                      <button
                        className={p.isActive === false ? "btn-action-success" : "btn-action-delete"}
                        title={p.isActive === false ? "Habilitar" : "Deshabilitar"}
                        onClick={() => {
                          showConfirm(p.isActive === false ? '¿Habilitar proveedor?' : '¿Deshabilitar proveedor?', async () => {
                            showLoading(true);
                            try {
                              const res = await fetch(`/api/providers/${p._id}`, { method: 'DELETE' });
                              if (res.ok) {
                                const result = await res.json();
                                await fetchProviders();
                                showSuccess(result.isActive ? 'Proveedor habilitado' : 'Proveedor deshabilitado');
                              } else {
                                showAlert('Error al cambiar estado');
                              }
                            } catch (err) {
                              showAlert('Error procesando solicitud');
                            } finally {
                              showLoading(false);
                            }
                          });
                        }}
                      >
                        {p.isActive === false ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
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
        <Portal>
          <div className="modal-overlay">
            <div className="card" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2>{formData._id ? 'Editar Proveedor' : 'Registrar Proveedor'}</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">RUT</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.rut} 
                      onChange={e => setFormData({ ...formData, rut: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nombre / Razón Social</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.name} 
                      onChange={e => setFormData({ ...formData, name: e.target.value })} 
                      required 
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Dirección</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.address} 
                    onChange={e => setFormData({ ...formData, address: e.target.value })} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Rubro</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.rubro} 
                    onChange={e => setFormData({ ...formData, rubro: e.target.value })} 
                    placeholder="Ej: Insumos Dentales, Servicios Médicos..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'end' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.credit} 
                        onChange={e => setFormData({ ...formData, credit: e.target.checked })} 
                      />
                      ¿Ofrece Crédito?
                    </label>
                  </div>
                  {formData.credit && (
                    <div className="form-group">
                      <label className="form-label">Días de Crédito</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={formData.creditDays} 
                        onChange={e => setFormData({ ...formData, creditDays: parseInt(e.target.value) || 0 })} 
                        min="0"
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ border: '1px solid var(--border)' }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Guardar Proveedor</button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
