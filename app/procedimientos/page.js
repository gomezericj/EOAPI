"use client";
import { useState, useEffect } from 'react';
import { Plus, Search, ClipboardList, DollarSign, Trash2, Edit, Download, ToggleLeft, ToggleRight } from 'lucide-react';
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
            <div className="card" style={{ width: '500px' }}>
              <h2>{formData._id ? 'Editar Procedimiento' : 'Registrar Procedimiento'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Nombre del Procedimiento</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ej: Limpieza Dental"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Especialidad</label>
                  <select
                    className="form-control"
                    value={formData.specialty}
                    onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                  >
                    <option value="">Seleccionar Especialidad</option>
                    {specialties.map(spec => (
                      <option key={spec._id} value={spec.name}>
                        {spec.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Precio ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>

                <hr style={{ margin: '1.5rem 0', borderColor: 'var(--border)' }} />
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Estructura de Costos Fijos</h3>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Admin (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.costs?.adminPercentage || 0}
                      onChange={e => setFormData({ ...formData, costs: { ...formData.costs, adminPercentage: Number(e.target.value) } })}
                      min="0" max="100"
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Instalaciones (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.costs?.facilityPercentage || 0}
                      onChange={e => setFormData({ ...formData, costs: { ...formData.costs, facilityPercentage: Number(e.target.value) } })}
                      min="0" max="100"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Insumos y Equipos</label>
                  {formData.costs?.suppliesAndEquipment?.map((item, index) => (
                    <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
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
                        style={{ flex: 2 }}
                        required
                        disabled={!isAdmin}
                      />
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Costo"
                        value={item.price}
                        onChange={e => {
                          const newSupplies = [...(formData.costs?.suppliesAndEquipment || [])];
                          newSupplies[index].price = Number(e.target.value);
                          setFormData({ ...formData, costs: { ...formData.costs, suppliesAndEquipment: newSupplies } });
                        }}
                        style={{ flex: 1 }}
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
                        style={{ flex: 1, maxWidth: '80px' }}
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
                          style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '0 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        const newSupplies = [...(formData.costs?.suppliesAndEquipment || []), { name: '', price: 0, quantity: 1 }];
                        setFormData({ ...formData, costs: { ...(formData.costs || {}), adminPercentage: formData.costs?.adminPercentage || 0, facilityPercentage: formData.costs?.facilityPercentage || 0, suppliesAndEquipment: newSupplies } });
                      }}
                      style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', marginTop: '0.5rem', border: '1px dashed var(--border)', width: '100%', display: 'flex', justifyContent: 'center' }}
                    >
                      + Agregar Insumo/Equipo
                    </button>
                  )}
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
