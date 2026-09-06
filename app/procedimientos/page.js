"use client";
import { useState, useEffect } from 'react';
import { Plus, Search, ClipboardList, DollarSign, Trash2, Edit, Download, ToggleLeft, ToggleRight, X, Package, Percent } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import Portal from '@/components/Portal';

export default function ProceduresPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
  const { showAlert, showConfirm, showSuccess, showLoading } = useNotification();
  const [procedures, setProcedures] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    specialty: '',
    costs: {
      suppliesAndEquipment: [],
      adminPercentage: 0,
      facilityPercentage: 0
    }
  });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProcedures = async () => {
    try {
      const res = await fetch('/api/procedimientos', { cache: 'no-store' });
      const data = await res.json();
      setProcedures(data);
    } catch (err) {
      console.error('Error fetching procedures:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecialties = async () => {
    try {
      const res = await fetch('/api/especialidades', { cache: 'no-store' });
      const data = await res.json();
      setSpecialties(data);
    } catch (err) {
      console.error('Error fetching specialties:', err);
    }
  };

  useEffect(() => {
    fetchProcedures();
    fetchSpecialties();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = formData._id ? `/api/procedimientos/${formData._id}` : '/api/procedimientos';
      const method = formData._id ? 'PUT' : 'POST';

      showLoading(true);
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({ name: '', price: '', specialty: '', costs: { suppliesAndEquipment: [], adminPercentage: 0, facilityPercentage: 0 } });
        await fetchProcedures();
        showSuccess(formData._id ? 'Procedimiento actualizado' : 'Procedimiento registrado');
      } else {
        const data = await res.json();
        showAlert(data.error);
      }
    } catch (err) {
      showAlert('Error al guardar procedimiento');
    } finally {
      showLoading(false);
    }
  };

  const handleToggleStatus = async (p) => {
    showConfirm(p.isActive === false ? '¿Habilitar procedimiento?' : '¿Deshabilitar procedimiento?', async () => {
      showLoading(true);
      try {
        const res = await fetch(`/api/procedimientos/${p._id}`, { method: 'DELETE' });
        if (res.ok) {
          const result = await res.json();
          await fetchProcedures();
          showSuccess(result.isActive ? 'Procedimiento habilitado' : 'Procedimiento deshabilitado');
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

  const handleEdit = (p) => {
    setFormData({ 
      ...p,
      costs: p.costs || { suppliesAndEquipment: [], adminPercentage: 0, facilityPercentage: 0 }
    });
    setShowModal(true);
  };

  const filteredProcedures = procedures.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.specialty && p.specialty.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportToExcel = () => {
    const data = filteredProcedures.map(p => ({
      Procedimiento: p.name,
      Especialidad: p.specialty || 'General',
      Precio: p.price,
      Estado: p.isActive !== false ? 'Activo' : 'Deshabilitado'
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Procedimientos");
    XLSX.writeFile(workbook, "Lista_Procedimientos_EsteticaOral2L.xlsx");
  };

  return (
    <div className="procedures-page">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Gestión de Procedimientos</h1>
          <p style={{ color: 'var(--text-light)' }}>Configura los servicios y sus precios</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => {
            setFormData({ name: '', price: '', specialty: '', duration: '', description: '', costs: { suppliesAndEquipment: [], adminPercentage: 0, facilityPercentage: 0 } });
            setShowModal(true);
          }}>
            <Plus size={20} />
            Nuevo Procedimiento
          </button>
        )}
      </header>

      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} size={18} />
          <input
            type="text"
            placeholder="Buscar procedimiento o especialidad..."
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
              <th>Procedimiento</th>
              <th>Especialidad</th>
              <th>Precio</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ textAlign: 'center' }}>Cargando...</td></tr>
            ) : filteredProcedures.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center' }}>No hay procedimientos registrados</td></tr>
            ) : filteredProcedures.map((p) => (
              <tr key={p._id} style={{ opacity: p.isActive === false ? 0.6 : 1, backgroundColor: p.isActive === false ? '#f9fafb' : 'transparent' }}>
                <td style={{ fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ClipboardList size={18} style={{ color: p.isActive === false ? 'var(--text-light)' : 'var(--secondary)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {p.isActive === false && <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', textTransform: 'uppercase' }}>DESHABILITADO</span>}
                      {p.name}
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{
                    backgroundColor: p.isActive === false ? '#eee' : 'var(--accent)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: p.isActive === false ? '#888' : 'var(--primary)'
                  }}>
                    {p.specialty || 'General'}
                  </span>
                </td>
                <td style={{ fontWeight: 700, color: p.isActive === false ? '#888' : 'var(--primary)' }}>
                  ${p.price.toLocaleString('es-CL')}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn-action-edit" onClick={() => handleEdit(p)}><Edit size={18} /></button>
                    {isAdmin && (
                      <button
                        className={p.isActive === false ? "btn-action-success" : "btn-action-delete"}
                        title={p.isActive === false ? "Habilitar" : "Deshabilitar"}
                        onClick={() => handleToggleStatus(p)}
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
            <div className="card" style={{ width: '620px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', borderRadius: '16px' }}>
              
              {/* Encabezado */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#f0fdfa', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {formData._id ? 'Editar Procedimiento' : 'Registrar Procedimiento'}
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)' }}>
                      Configuración del catálogo clínico, tarifas base y estructura de costos.
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
                
                {/* Bloque 1: Datos Principales */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                      Nombre del Procedimiento
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Ej: Profilaxis y Destartraje"
                      style={{ marginBottom: 0 }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.85rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Especialidad</label>
                      <select
                        className="form-control"
                        value={formData.specialty}
                        onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                        style={{ marginBottom: 0 }}
                      >
                        <option value="">Seleccionar Especialidad...</option>
                        {specialties.map(spec => (
                          <option key={spec._id} value={spec.name}>
                            {spec.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Precio Lista ($)</label>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ padding: '0 0.65rem', height: '40px', display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRight: 'none', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', fontWeight: 700, color: '#64748b' }}>$</span>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.price}
                          onChange={e => setFormData({ ...formData, price: e.target.value })}
                          required
                          placeholder="0"
                          style={{ margin: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloque 2: Estructura de Costos Fijos */}
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#f0fdfa', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Percent size={14} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)' }}>
                        Estructura de Costos Fijos
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                        Porcentajes imputables a administración e infraestructura clínica
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Administración (%)</label>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.costs?.adminPercentage || 0}
                          onChange={e => setFormData({ ...formData, costs: { ...formData.costs, adminPercentage: Number(e.target.value) } })}
                          min="0" max="100"
                          disabled={!isAdmin}
                          style={{ margin: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                        />
                        <span style={{ padding: '0 0.65rem', height: '40px', display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderLeft: 'none', borderTopRightRadius: '8px', borderBottomRightRadius: '8px', fontWeight: 700, color: '#64748b', fontSize: '0.8rem' }}>%</span>
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Instalaciones (%)</label>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.costs?.facilityPercentage || 0}
                          onChange={e => setFormData({ ...formData, costs: { ...formData.costs, facilityPercentage: Number(e.target.value) } })}
                          min="0" max="100"
                          disabled={!isAdmin}
                          style={{ margin: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                        />
                        <span style={{ padding: '0 0.65rem', height: '40px', display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderLeft: 'none', borderTopRightRadius: '8px', borderBottomRightRadius: '8px', fontWeight: 700, color: '#64748b', fontSize: '0.8rem' }}>%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloque 3: Insumos y Equipos Requeridos */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={14} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                          Insumos y Equipos Requeridos
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Materiales específicos consumidos</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          const newSupplies = [...(formData.costs?.suppliesAndEquipment || []), { name: '', price: 0, quantity: 1 }];
                          setFormData({ ...formData, costs: { ...(formData.costs || {}), adminPercentage: formData.costs?.adminPercentage || 0, facilityPercentage: formData.costs?.facilityPercentage || 0, suppliesAndEquipment: newSupplies } });
                        }}
                        style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', borderRadius: '8px', color: 'var(--primary)', fontWeight: 600 }}
                      >
                        + Agregar Insumo
                      </button>
                    )}
                  </div>

                  {(!formData.costs?.suppliesAndEquipment || formData.costs.suppliesAndEquipment.length === 0) ? (
                    <div style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: 'var(--text-light)', fontSize: '0.78rem' }}>
                      No se han vinculado insumos específicos a este procedimiento.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {formData.costs.suppliesAndEquipment.map((item, index) => (
                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px auto', gap: '0.5rem', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.5rem', borderRadius: '8px' }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Nombre del insumo"
                            value={item.name}
                            onChange={e => {
                              const newSupplies = [...(formData.costs?.suppliesAndEquipment || [])];
                              newSupplies[index].name = e.target.value;
                              setFormData({ ...formData, costs: { ...formData.costs, suppliesAndEquipment: newSupplies } });
                            }}
                            style={{ margin: 0, fontSize: '0.82rem' }}
                            required
                            disabled={!isAdmin}
                          />
                          <input
                            type="number"
                            className="form-control"
                            placeholder="Costo $"
                            value={item.price}
                            onChange={e => {
                              const newSupplies = [...(formData.costs?.suppliesAndEquipment || [])];
                              newSupplies[index].price = Number(e.target.value);
                              setFormData({ ...formData, costs: { ...formData.costs, suppliesAndEquipment: newSupplies } });
                            }}
                            style={{ margin: 0, fontSize: '0.82rem' }}
                            required
                            min="0"
                            disabled={!isAdmin}
                          />
                          <input
                            type="number"
                            className="form-control"
                            placeholder="Cant."
                            value={item.quantity}
                            onChange={e => {
                              const newSupplies = [...(formData.costs?.suppliesAndEquipment || [])];
                              newSupplies[index].quantity = Number(e.target.value);
                              setFormData({ ...formData, costs: { ...formData.costs, suppliesAndEquipment: newSupplies } });
                            }}
                            style={{ margin: 0, fontSize: '0.82rem', textAlign: 'center' }}
                            required
                            min="1"
                            disabled={!isAdmin}
                          />
                          {isAdmin && (
                            <button 
                              type="button" 
                              onClick={() => {
                                const newSupplies = formData.costs.suppliesAndEquipment.filter((_, i) => i !== index);
                                setFormData({ ...formData, costs: { ...formData.costs, suppliesAndEquipment: newSupplies } });
                              }}
                              style={{ backgroundColor: 'transparent', color: '#ef4444', border: 'none', padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Eliminar insumo"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer de Acciones */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', fontWeight: 700 }}>Guardar Procedimiento</button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
