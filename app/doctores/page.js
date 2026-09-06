"use client";
import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Download, ToggleLeft, ToggleRight, FileCheck, Award, Percent, X, Stethoscope, Phone, Mail } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import Portal from '@/components/Portal';

export default function DoctorsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
  const { showAlert, showConfirm, showSuccess, showLoading } = useNotification();
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [systemRetention, setSystemRetention] = useState(13);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    rut: '',
    name: '',
    secondName: '',
    surname: '',
    secondSurname: '',
    age: '',
    email: '',
    phone: '',
    specialtyCommissions: [],
    defaultCommissionPercentage: '40',
    referredPatientCommissionPercentage: '50',
    hasInvoice: false
  });

  const fetchDoctors = async () => {
    const res = await fetch('/api/doctors', { cache: 'no-store' });
    const data = await res.json();
    setDoctors(data);
  };

  const fetchSpecialties = async () => {
    const res = await fetch('/api/especialidades');
    const data = await res.json();
    setSpecialties(data);
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.retentionPercentage) setSystemRetention(data.retentionPercentage);
    } catch (err) {
      console.error("Error fetching settings", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchDoctors(), fetchSpecialties(), fetchSettings()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = formData._id ? `/api/doctors/${formData._id}` : '/api/doctors';
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
          rut: '', name: '', secondName: '', surname: '', secondSurname: '',
          age: '', email: '', phone: '', specialtyCommissions: [],
          defaultCommissionPercentage: '40', referredPatientCommissionPercentage: '50', hasInvoice: false
        });
        await fetchDoctors();
        showSuccess(formData._id ? 'Doctor actualizado' : 'Doctor registrado');
      } else {
        const data = await res.json();
        showAlert(data.error);
      }
    } catch (err) {
      showAlert('Error al guardar doctor');
    } finally {
      showLoading(false);
    }
  };

  const filteredDoctors = doctors.filter(d =>
    `${d.name} ${d.secondName || ''} ${d.surname} ${d.secondSurname || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.rut.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToExcel = () => {
    const data = filteredDoctors.map(d => ({
      RUT: d.rut,
      Nombres: `${d.name} ${d.secondName || ''}`.trim(),
      Apellidos: `${d.surname} ${d.secondSurname || ''}`.trim(),
      Edad: d.age || '',
      Correo: d.email || '',
      Teléfono: d.phone || '',
      Especialidad_1: d.specialtyCommissions && d.specialtyCommissions.length > 0 ? d.specialtyCommissions[0].specialty : '',
      Especialidad_2: d.specialtyCommissions && d.specialtyCommissions.length > 1 ? d.specialtyCommissions[1].specialty : '',
      Comision_Defecto: `${d.defaultCommissionPercentage}%`,
      Factura: d.hasInvoice ? 'Sí' : 'No',
      Estado: d.isActive !== false ? 'Activo' : 'Deshabilitado'
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Doctores");
    XLSX.writeFile(workbook, "Doctores_EsteticaOral2L.xlsx");
  };

  return (
    <div className="doctors-page">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Gestión de Doctores</h1>
          <p style={{ color: 'var(--text-light)' }}>Especialistas y configuración de comisiones</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setFormData({
            rut: '', name: '', secondName: '', surname: '', secondSurname: '',
            age: '', email: '', phone: '', specialtyCommissions: [],
            defaultCommissionPercentage: '40', referredPatientCommissionPercentage: '50', hasInvoice: false
          });
          setShowModal(true);
        }}>
          <Plus size={20} /> Nuevo Doctor
        </button>
      </header>

      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} size={18} />
          <input
            type="text"
            placeholder="Buscar por RUT o Nombre..."
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
              <th>Nombre Completo</th>
              <th>Especialidades</th>
              <th>Comisión</th>
              <th>Factura</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>Cargando...</td></tr>
            ) : filteredDoctors.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>No hay doctores registrados</td></tr>
            ) : filteredDoctors.map((d) => (
              <tr key={d._id} style={{ opacity: d.isActive === false ? 0.6 : 1, backgroundColor: d.isActive === false ? '#f9fafb' : 'transparent' }}>
                <td style={{ fontWeight: 600 }}>{d.rut}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {d.isActive === false && <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', textTransform: 'uppercase' }}>DESHABILITADO</span>}
                    {`${d.name} ${d.surname}`}
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem' }}>
                    {d.specialtyCommissions && d.specialtyCommissions.map((sc, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '2px' }}>
                        <Award size={12} /> {sc.specialty} ({sc.percentage}%)
                      </div>
                    ))}
                  </div>
                </td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                    <Percent size={14} /> {d.defaultCommissionPercentage}% (Defecto)
                  </span>
                </td>
                <td>
                  {d.hasInvoice ?
                    <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><FileCheck size={14} /> Sí</span> :
                    <span style={{ color: 'var(--text-light)' }}>No</span>
                  }
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      className="btn-action-edit"
                      style={{
                        opacity: d.isActive === false ? 0.4 : 1,
                        cursor: d.isActive === false ? 'not-allowed' : 'pointer'
                      }}
                      disabled={d.isActive === false}
                      title={d.isActive === false ? "No se puede editar un doctor deshabilitado" : "Editar Doctor"}
                      onClick={() => {
                        setFormData({
                          rut: d.rut || '',
                          name: d.name || '',
                          secondName: d.secondName || '',
                          surname: d.surname || '',
                          secondSurname: d.secondSurname || '',
                          age: d.age || '',
                          email: d.email || '',
                          phone: d.phone || '',
                          specialtyCommissions: d.specialtyCommissions || [],
                          defaultCommissionPercentage: d.defaultCommissionPercentage || '40',
                          referredPatientCommissionPercentage: d.referredPatientCommissionPercentage || '50',
                          hasInvoice: d.hasInvoice || false,
                          _id: d._id
                        });
                        setShowModal(true);
                      }}><Edit size={18} /></button>
                    {isAdmin && (
                      <button
                        className={d.isActive === false ? "btn-action-success" : "btn-action-delete"}
                        title={d.isActive === false ? "Habilitar" : "Deshabilitar"}
                        onClick={() => {
                          showConfirm(d.isActive === false ? '¿Habilitar doctor?' : '¿Deshabilitar doctor?', async () => {
                            showLoading(true);
                            try {
                              const res = await fetch(`/api/doctors/${d._id}`, { method: 'DELETE' });
                              if (res.ok) {
                                const result = await res.json();
                                await fetchDoctors();
                                showSuccess(result.isActive ? 'Doctor habilitado' : 'Doctor deshabilitado');
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
                        {d.isActive === false ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
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
            <div className="card" style={{ width: '700px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
              >
                <X size={20} />
              </button>
              <h2>{formData._id ? 'Editar Doctor' : 'Registrar Doctor'}</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">RUT</label>
                    <input type="text" className="form-control" value={formData.rut} onChange={e => setFormData({ ...formData, rut: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Nombre</label>
                    <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Segundo Nombre</label>
                    <input type="text" className="form-control" value={formData.secondName} onChange={e => setFormData({ ...formData, secondName: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Apellido</label>
                    <input type="text" className="form-control" value={formData.surname} onChange={e => setFormData({ ...formData, surname: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Segundo Apellido</label>
                    <input type="text" className="form-control" value={formData.secondSurname} onChange={e => setFormData({ ...formData, secondSurname: e.target.value })} />
                  </div>
                </div>

                {/* Bloque Destacado de Configuración de Comisiones */}
                <div style={{ 
                  marginTop: '1.5rem', 
                  backgroundColor: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '14px', 
                  padding: '1.25rem' 
                }}>
                  {/* Encabezado del Bloque de Comisiones */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f0fdfa', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Percent size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--primary)' }}>
                        Esquema de Comisiones y Compensación
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)' }}>
                        Define las tasas porcentuales de pago por procedimientos y condiciones tributarias.
                      </p>
                    </div>
                  </div>

                  {/* Nivel 1: Comisiones Generales (Base vs Referido) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
                    {/* Comisión Base */}
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.95rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <label className="form-label" style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700 }}>
                          Comisión Base
                        </label>
                        <span className="badge-neutral" style={{ fontSize: '0.65rem' }}>General</span>
                      </div>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-light)', margin: '0 0 0.65rem 0', minHeight: '28px' }}>
                        Tarifa estándar para tratamientos habituales del doctor.
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input 
                          type="number" 
                          className="form-control" 
                          value={formData.defaultCommissionPercentage} 
                          onChange={e => setFormData({ ...formData, defaultCommissionPercentage: e.target.value })} 
                          disabled={!isAdmin} 
                          required 
                          style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                        />
                        <span style={{ 
                          padding: '0 0.85rem', 
                          height: '42px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          backgroundColor: '#f1f5f9', 
                          border: '1px solid #cbd5e1', 
                          borderLeft: 'none', 
                          borderTopRightRadius: '10px', 
                          borderBottomRightRadius: '10px', 
                          fontWeight: 700, 
                          color: 'var(--text-light)', 
                          fontSize: '0.85rem' 
                        }}>
                          %
                        </span>
                      </div>
                    </div>

                    {/* Comisión Paciente Referido */}
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.95rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <label className="form-label" style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700 }}>
                          Paciente Referido
                        </label>
                        <span className="badge-success" style={{ fontSize: '0.65rem' }}>Prioritaria</span>
                      </div>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-light)', margin: '0 0 0.65rem 0', minHeight: '28px' }}>
                        Aplica si el paciente fue captado o referido por el doctor.
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input 
                          type="number" 
                          className="form-control" 
                          value={formData.referredPatientCommissionPercentage} 
                          onChange={e => setFormData({ ...formData, referredPatientCommissionPercentage: e.target.value })} 
                          disabled={!isAdmin} 
                          required 
                          style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                        />
                        <span style={{ 
                          padding: '0 0.85rem', 
                          height: '42px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          backgroundColor: '#f1f5f9', 
                          border: '1px solid #cbd5e1', 
                          borderLeft: 'none', 
                          borderTopRightRadius: '10px', 
                          borderBottomRightRadius: '10px', 
                          fontWeight: 700, 
                          color: 'var(--text-light)', 
                          fontSize: '0.85rem' 
                        }}>
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Nivel 2: Excepciones por Especialidad */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
                          Tarifas Especiales por Especialidad
                        </span>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-light)', margin: 0 }}>
                          Sobrescribe la comisión base cuando el doctor ejecuta procedimientos de estas áreas.
                        </p>
                      </div>
                      {isAdmin && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setFormData({ ...formData, specialtyCommissions: [...formData.specialtyCommissions, { specialty: '', percentage: formData.defaultCommissionPercentage }] });
                          }}
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.35rem', 
                            fontSize: '0.78rem', 
                            fontWeight: 600, 
                            padding: '0.35rem 0.75rem', 
                            borderRadius: '8px', 
                            backgroundColor: '#ffffff', 
                            border: '1px solid var(--primary)', 
                            color: 'var(--primary)', 
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Plus size={14} /> Añadir Especialidad
                        </button>
                      )}
                    </div>

                    {formData.specialtyCommissions.length === 0 ? (
                      <div style={{ 
                        padding: '1rem', 
                        textAlign: 'center', 
                        backgroundColor: '#ffffff', 
                        border: '1px dashed #cbd5e1', 
                        borderRadius: '10px', 
                        color: 'var(--text-light)', 
                        fontSize: '0.78rem' 
                      }}>
                        No hay tarifas específicas configuradas. Se aplicará la <strong>Comisión Base ({formData.defaultCommissionPercentage || 0}%)</strong> para cualquier especialidad.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {formData.specialtyCommissions.map((sc, idx) => (
                          <div 
                            key={idx} 
                            style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '1.8fr 1fr auto', 
                              gap: '0.75rem', 
                              alignItems: 'center', 
                              backgroundColor: '#ffffff', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '10px', 
                              padding: '0.65rem 0.85rem' 
                            }}
                          >
                            <div>
                              <select 
                                className="form-control" 
                                value={sc.specialty} 
                                onChange={e => {
                                  const newCommissions = [...formData.specialtyCommissions];
                                  newCommissions[idx].specialty = e.target.value;
                                  setFormData({ ...formData, specialtyCommissions: newCommissions });
                                }} 
                                disabled={!isAdmin} 
                                required
                                style={{ margin: 0, fontSize: '0.85rem' }}
                              >
                                <option value="">Seleccione Especialidad...</option>
                                {specialties.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                              </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <input 
                                type="number" 
                                className="form-control" 
                                value={sc.percentage} 
                                onChange={e => {
                                  const newCommissions = [...formData.specialtyCommissions];
                                  newCommissions[idx].percentage = e.target.value;
                                  setFormData({ ...formData, specialtyCommissions: newCommissions });
                                }} 
                                disabled={!isAdmin} 
                                required 
                                style={{ margin: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0, fontSize: '0.85rem' }}
                              />
                              <span style={{ 
                                padding: '0 0.65rem', 
                                height: '40px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                backgroundColor: '#f1f5f9', 
                                border: '1px solid #cbd5e1', 
                                borderLeft: 'none', 
                                borderTopRightRadius: '10px', 
                                borderBottomRightRadius: '10px', 
                                fontWeight: 700, 
                                color: 'var(--text-light)', 
                                fontSize: '0.8rem' 
                              }}>
                                %
                              </span>
                            </div>
                            {isAdmin && (
                              <button 
                                type="button" 
                                className="btn-action-delete" 
                                onClick={() => {
                                  const newCommissions = formData.specialtyCommissions.filter((_, i) => i !== idx);
                                  setFormData({ ...formData, specialtyCommissions: newCommissions });
                                }} 
                                title="Eliminar regla especial"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Nivel 3: Régimen Tributario y Retención */}
                  <div style={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '10px', 
                    padding: '0.85rem 1rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    gap: '1rem' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '8px', 
                        backgroundColor: formData.hasInvoice ? '#f0fdf4' : '#fffbeb', 
                        color: formData.hasInvoice ? '#16a34a' : '#d97706', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <FileCheck size={18} />
                      </div>
                      <div>
                        <label htmlFor="hasInvoice" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', cursor: 'pointer', margin: 0, display: 'block' }}>
                          ¿El profesional emite Factura?
                        </label>
                        <small style={{ fontSize: '0.73rem', color: 'var(--text-light)' }}>
                          {formData.hasInvoice 
                            ? 'Exento de retención (pago íntegro contra factura)' 
                            : `Aplica retención legal del ${systemRetention}% por boleta de honorarios en el cálculo mensual.`
                          }
                        </small>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      id="hasInvoice" 
                      checked={formData.hasInvoice} 
                      onChange={e => setFormData({ ...formData, hasInvoice: e.target.checked })} 
                      disabled={!isAdmin} 
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ border: '1px solid var(--border)' }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Guardar Doctor</button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
