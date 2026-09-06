"use client";
import { useState, useEffect } from 'react';
import { Plus, Search, Truck, Phone, MapPin, Edit, Trash2, Download, ToggleLeft, ToggleRight, Briefcase, CreditCard, X } from 'lucide-react';
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
            <div className="card" style={{ width: '580px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', borderRadius: '16px' }}>
              
              {/* Encabezado */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#f0fdfa', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Truck size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {formData._id ? 'Editar Proveedor' : 'Registrar Proveedor'}
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)' }}>
                      Empresas y laboratorios de insumos, servicios y equipamiento dental.
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
                
                {/* Bloque 1: Identificación y Contacto */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>RUT</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.rut} 
                        onChange={e => setFormData({ ...formData, rut: e.target.value })} 
                        required 
                        placeholder="76.123.456-7"
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Razón Social / Nombre</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.name} 
                        onChange={e => setFormData({ ...formData, name: e.target.value })} 
                        required 
                        placeholder="Ej: Dental Express SpA"
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '0.85rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Rubro o Giro</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.rubro} 
                        onChange={e => setFormData({ ...formData, rubro: e.target.value })} 
                        placeholder="Ej: Instrumental, Ortodoncia..."
                        style={{ marginBottom: 0 }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Dirección Comercial</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.address} 
                        onChange={e => setFormData({ ...formData, address: e.target.value })} 
                        placeholder="Av. Providencia 1234, Of 502"
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bloque 2: Condiciones Comerciales y Crédito */}
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#f0fdfa', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CreditCard size={14} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)' }}>
                        Condiciones Comerciales
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Plazos y convenios de pago a crédito</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem' }}>
                      <input 
                        type="checkbox" 
                        id="providerCredit"
                        checked={formData.credit} 
                        onChange={e => setFormData({ ...formData, credit: e.target.checked })} 
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                      <label htmlFor="providerCredit" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', cursor: 'pointer', margin: 0 }}>
                        ¿Ofrece Crédito a la Clínica?
                      </label>
                    </div>

                    {formData.credit ? (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Plazo de Crédito (Días)</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          value={formData.creditDays} 
                          onChange={e => setFormData({ ...formData, creditDays: parseInt(e.target.value) || 0 })} 
                          min="0"
                          placeholder="30"
                          style={{ marginBottom: 0 }}
                        />
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                        Modalidad contado / transferencia contra entrega.
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer de Acciones */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', fontWeight: 700 }}>Guardar Proveedor</button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
