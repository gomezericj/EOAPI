"use client";
import { useState, useEffect } from 'react';
import { Plus, Search, User, Phone, Mail, Edit, Trash2, Download, ToggleLeft, ToggleRight, FileText, ClipboardList, Activity, X, DollarSign, CreditCard, CheckCircle2, AlertCircle, Receipt, Calendar } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import Portal from '@/components/Portal';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/fetcher';
import Select from 'react-select';

const DentalinkIcon = ({ size = 16, color = "#0284c7" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path 
      d="M12 2C8.5 2 5.5 3.5 4.5 6.5C3.5 9.5 3.8 13.5 5 17C6 20 8 22 10 22C11.5 22 12 20 12 18C12 20 12.5 22 14 22C16 22 18 20 19 17C20.2 13.5 20.5 9.5 19.5 6.5C18.5 3.5 15.5 2 12 2Z" 
      fill={color} 
      fillOpacity="0.2" 
    />
    <path d="M9 10C10 11.5 14 11.5 15 10" />
  </svg>
);

export default function PatientsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
  const { showAlert, showConfirm, showSuccess, showLoading } = useNotification();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    rut: '',
    name: '',
    secondName: '',
    surname: '',
    secondSurname: '',
    age: '',
    email: '',
    phone: '',
    referredByDoctorId: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [timelineFilter, setTimelineFilter] = useState('todos');

  const fetchExternalHistory = async (patient) => {
    setSelectedPatient(patient);
    setTimelineFilter('todos');
    setHistoryLoading(true);
    setHistoryData(null);
    setShowHistoryModal(true);

    try {
      const res = await fetch(`/api/patients/${patient._id}/historial-externo`);
      const data = await res.json();
      
      if (data.error) {
        setHistoryData({ error: data.error, instructions: data.instructions });
      } else {
        setHistoryData(data);
      }
    } catch (err) {
      setHistoryData({ error: 'Error de conexión con el servidor' });
    } finally {
      setHistoryLoading(false);
    }
  };

  const searchInDentalink = async () => {
    if (!formData.rut) {
      showAlert('Ingrese un RUT para buscar');
      return;
    }
    
    setSearching(true);
    try {
      const res = await fetch(`/api/dentalink/paciente?rut=${formData.rut}`);
      const data = await res.json();
      
      if (data.found) {
        setFormData(prev => ({
          ...prev,
          name: data.patient.name || '',
          surname: data.patient.surname || '',
          email: data.patient.email || '',
          phone: data.patient.phone || '',
          age: data.patient.age || prev.age || ''
        }));
        showSuccess('Paciente encontrado en Dentalink');
      } else if (data.error) {
        showAlert(data.error);
      } else {
        showAlert('No se encontró el paciente en Dentalink');
      }
    } catch (err) {
      showAlert('Error al conectar con Dentalink');
    } finally {
      setSearching(false);
    }
  };

  const { data: patientsData } = useSWR('/api/patients', fetcher);
  const { data: connsData } = useSWR('/api/apiconnections', fetcher);
  const { data: doctorsData } = useSWR('/api/doctors', fetcher);

  const patients = patientsData || [];
  const doctors = doctorsData || [];
  const loading = !patientsData;
  const isDentalinkActive = connsData?.find(c => c.provider?.toLowerCase() === 'dentalink')?.isActive || false;

  const fetchPatients = async () => {
    await mutate('/api/patients');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = formData._id ? `/api/patients/${formData._id}` : '/api/patients';
      const method = formData._id ? 'PUT' : 'POST';

      const payload = { ...formData };
      if (!payload.referredByDoctorId) {
        payload.referredByDoctorId = null;
      }

      showLoading(true);
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({
          rut: '', name: '', secondName: '', surname: '', secondSurname: '',
          age: '', email: '', phone: '', referredByDoctorId: ''
        });
        await fetchPatients();
        showSuccess(formData._id ? 'Paciente actualizado' : 'Paciente registrado');
      } else {
        const data = await res.json();
        showAlert(data.error);
      }
    } catch (err) {
      showAlert('Error al guardar paciente');
    } finally {
      showLoading(false);
    }
  };

  const filteredPatients = patients.filter(p =>
    (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.surname && p.surname.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.rut && p.rut.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportToExcel = () => {
    const data = filteredPatients.map(p => ({
      RUT: p.rut,
      Nombres: `${p.name} ${p.secondName || ''}`.trim(),
      Apellidos: `${p.surname} ${p.secondSurname || ''}`.trim(),
      Edad: p.age || '',
      Correo: p.email || '',
      Teléfono: p.phone || '',
      Estado: p.isActive !== false ? 'Activo' : 'Deshabilitado'
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pacientes");
    XLSX.writeFile(workbook, "Pacientes_EsteticaOral2L.xlsx");
  };

  return (
    <div className="patients-page">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Gestión de Pacientes</h1>
          <p style={{ color: 'var(--text-light)' }}>Listado y registro de clientes</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setFormData({ rut: '', name: '', surname: '', email: '', phone: '', secondName: '', secondSurname: '', referredByDoctorId: '' });
          setShowModal(true);
        }}>
          <Plus size={20} />
          Nuevo Paciente
        </button>
      </header>

      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} size={18} />
          <input
            type="text"
            placeholder="Buscar por RUT o nombre..."
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
              <th>RUT / Pasaporte</th>
              <th>Nombre Completo</th>
              <th>Edad</th>
              <th>Contacto</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>Cargando...</td></tr>
            ) : filteredPatients.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>No hay pacientes registrados</td></tr>
            ) : filteredPatients.map((p) => (
              <tr key={p._id} style={{ opacity: p.isActive === false ? 0.6 : 1, backgroundColor: p.isActive === false ? '#f9fafb' : 'transparent' }}>
                <td style={{ fontWeight: 600 }}>{p.rut}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {p.isActive === false && <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', textTransform: 'uppercase' }}>DESHABILITADO</span>}
                    {`${p.name} ${p.surname}`}
                  </div>
                </td>
                <td>{p.age || '-'}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={12} /> {p.phone}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={12} /> {p.email}</span>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                    {isDentalinkActive && (
                      <button 
                        className="btn-action-edit" 
                        style={{ backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}
                        title="Ver Ficha Clínica (Dentalink)" 
                        onClick={() => fetchExternalHistory(p)}
                      >
                        <FileText size={18} />
                      </button>
                    )}
                    <button className="btn-action-edit" onClick={() => {
                      setFormData({ ...p });
                      setShowModal(true);
                    }}><Edit size={18} /></button>
                    {isAdmin && (
                      <button
                        className={p.isActive === false ? "btn-action-success" : "btn-action-delete"}
                        title={p.isActive === false ? "Habilitar" : "Deshabilitar"}
                        onClick={() => {
                          showConfirm(p.isActive === false ? '¿Habilitar paciente?' : '¿Deshabilitar paciente?', async () => {
                            showLoading(true);
                            try {
                              const res = await fetch(`/api/patients/${p._id}`, { method: 'DELETE' });
                              if (res.ok) {
                                const result = await res.json();
                                await fetchPatients();
                                showSuccess(result.isActive ? 'Paciente habilitado' : 'Paciente deshabilitado');
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
            <div className="card" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
              >
                <X size={20} />
              </button>
              <h2>{formData._id ? 'Editar Paciente' : 'Registrar Paciente'}</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 105px', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">RUT / Pasaporte</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.rut} 
                        onChange={e => setFormData({ ...formData, rut: e.target.value })} 
                        required 
                        style={{ marginBottom: 0 }}
                      />
                      {isDentalinkActive && (
                        <button 
                          type="button" 
                          className="btn" 
                          onClick={searchInDentalink}
                          disabled={searching || !formData.rut}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.4rem', 
                            whiteSpace: 'nowrap',
                            backgroundColor: '#f0f9ff',
                            color: '#0369a1',
                            border: '1px solid #bae6fd',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            padding: '0 0.85rem'
                          }}
                          title="Buscar información del paciente en Dentalink por RUT"
                        >
                          {searching ? (
                            'Buscando...'
                          ) : (
                            <>
                              <DentalinkIcon size={16} color="#0284c7" />
                              <span>Buscar Dentalink</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Edad</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={formData.age} 
                      onChange={e => setFormData({ ...formData, age: e.target.value })} 
                      placeholder="0"
                      style={{ textAlign: 'center' }}
                    />
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Correo</label>
                    <input type="email" className="form-control" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input type="text" className="form-control" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Referido por (Opcional)</label>
                  <Select
                    instanceId="referredBy-select"
                    placeholder="Seleccione doctor..."
                    noOptionsMessage={() => "No se encontraron doctores"}
                    options={doctors.filter(d => d.isActive !== false).map(d => ({ value: d._id, label: `${d.name} ${d.surname}` }))}
                    value={formData.referredByDoctorId ? { value: formData.referredByDoctorId, label: doctors.find(d => d._id === formData.referredByDoctorId) ? `${doctors.find(d => d._id === formData.referredByDoctorId).name} ${doctors.find(d => d._id === formData.referredByDoctorId).surname}` : 'Doctor' } : null}
                    onChange={option => setFormData({ ...formData, referredByDoctorId: option ? option.value : '' })}
                    styles={{ control: (base) => ({ ...base, minHeight: '42px', borderRadius: '8px', borderColor: '#cbd5e1' }) }}
                    isClearable
                    menuPosition="fixed"
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ border: '1px solid var(--border)' }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Guardar Paciente</button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {showHistoryModal && (
        <Portal>
          <div className="modal-overlay">
            <div className="card" style={{ width: '1020px', maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.4rem' }}>
                    <ClipboardList size={26} color="var(--primary)" />
                    Ficha Clínica y Financiera
                  </h2>
                  {selectedPatient && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                        Paciente: <strong>{selectedPatient.name} {selectedPatient.surname}</strong> ({selectedPatient.rut})
                      </span>
                      {historyData?.externalId && (
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                          ID Dentalink #{historyData.externalId}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setShowHistoryModal(false)} 
                  style={{ 
                    padding: '0.4rem', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0', 
                    backgroundColor: '#f8fafc',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
                >
                  <X size={20} />
                </button>
              </div>

              {historyLoading ? (
                <div style={{ padding: '4rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>Consultando historial clínico y financiero en Dentalink...</p>
                </div>
              ) : historyData?.error && (!historyData?.finanzas || historyData?.finanzas?.totalGastado === 0) ? (
                <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fee2e2' }}>
                  <p style={{ color: '#991b1b', fontWeight: 600, marginBottom: '0.5rem' }}>{historyData.error}</p>
                  {historyData.instructions && <p style={{ fontSize: '0.85rem', color: '#b91c1c' }}>{historyData.instructions}</p>}
                  <button onClick={() => setShowHistoryModal(false)} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Entendido</button>
                </div>
              ) : !historyData?.found && (!historyData?.finanzas || (historyData?.finanzas?.totalGastado === 0 && historyData?.finanzas?.pagos?.length === 0)) ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', backgroundColor: '#fff7ed', borderRadius: '12px', border: '1px solid #ffedd5' }}>
                  <p style={{ color: '#9a3412', fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>{historyData.message || 'Paciente no hallado en el sistema externo.'}</p>
                  {historyData?.details && <p style={{ fontSize: '0.8rem', color: '#c2410c', opacity: 0.8, marginBottom: '1.5rem' }}>{historyData.details}</p>}
                  <button onClick={() => setShowHistoryModal(false)} className="btn btn-primary">Cerrar</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Banner de aviso si sólo está local */}
                  {!historyData?.found && (
                    <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa', color: '#9a3412', fontSize: '0.85rem' }}>
                      <strong>Nota:</strong> Paciente no encontrado en Dentalink por RUT. Mostrando información financiera y de pagos registrada en el sistema local.
                    </div>
                  )}

                  {/* Tarjetas KPI de Resumen Financiero */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    {/* Total Gastado / Presupuestado */}
                    <div style={{ 
                      backgroundColor: '#f8fafc', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '12px', 
                      padding: '1.1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        <span>Total Presupuestado</span>
                        <Receipt size={18} color="#64748b" />
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
                        ${(historyData.finanzas?.totalGastado || 0).toLocaleString('es-CL')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {historyData.finanzas?.dentalink?.totalTratamientos > 0 && historyData.finanzas?.local?.totalVentas > 0
                          ? `Dentalink: $${historyData.finanzas.dentalink.totalTratamientos.toLocaleString('es-CL')} • Local: $${historyData.finanzas.local.totalVentas.toLocaleString('es-CL')}`
                          : 'Tratamientos y presupuestos'}
                      </div>
                    </div>

                    {/* Total Pagado Real */}
                    <div style={{ 
                      backgroundColor: '#f0fdf4', 
                      border: '1px solid #bbf7d0', 
                      borderRadius: '12px', 
                      padding: '1.1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#166534', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        <span>Total Pagado Real</span>
                        <CheckCircle2 size={18} color="#16a34a" />
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d' }}>
                        ${(historyData.finanzas?.totalPagado || 0).toLocaleString('es-CL')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>
                        {historyData.finanzas?.dentalink?.totalPagos > 0 && historyData.finanzas?.local?.totalPagos > 0
                          ? `Dentalink: $${historyData.finanzas.dentalink.totalPagos.toLocaleString('es-CL')} • Local: $${historyData.finanzas.local.totalPagos.toLocaleString('es-CL')}`
                          : 'Histórico de abonos y pagos'}
                      </div>
                    </div>

                    {/* Saldo Pendiente */}
                    <div style={{ 
                      backgroundColor: (historyData.finanzas?.saldoPendiente || 0) > 0 ? '#fef2f2' : '#f0fdfa', 
                      border: `1px solid ${(historyData.finanzas?.saldoPendiente || 0) > 0 ? '#fecaca' : '#ccfbf1'}`, 
                      borderRadius: '12px', 
                      padding: '1.1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        color: (historyData.finanzas?.saldoPendiente || 0) > 0 ? '#991b1b' : '#0f766e', 
                        fontSize: '0.8rem', 
                        fontWeight: 700, 
                        textTransform: 'uppercase' 
                      }}>
                        <span>Saldo Pendiente</span>
                        <AlertCircle size={18} color={(historyData.finanzas?.saldoPendiente || 0) > 0 ? '#dc2626' : '#0d9488'} />
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: (historyData.finanzas?.saldoPendiente || 0) > 0 ? '#dc2626' : '#0f766e' }}>
                        ${(historyData.finanzas?.saldoPendiente || 0).toLocaleString('es-CL')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: (historyData.finanzas?.saldoPendiente || 0) > 0 ? '#ef4444' : '#0d9488' }}>
                        {(historyData.finanzas?.saldoPendiente || 0) > 0 ? 'Deuda acumulada por saldar' : 'Al día • Sin deuda pendiente'}
                      </div>
                    </div>
                  </div>

                  {/* Contenedor en 2 Columnas: Pagos a la izquierda y Timeline a la derecha */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.25fr)', gap: '1.5rem', alignItems: 'start' }}>
                    
                    {/* Columna Izquierda: Historial de Pagos y Abonos */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--border)', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                        <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
                          <CreditCard size={20} color="var(--primary)" />
                          Pagos y Abonos
                        </h3>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '12px' }}>
                          {historyData.finanzas?.pagos?.length || 0} registros
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '520px', overflowY: 'auto', paddingRight: '0.35rem' }}>
                        {historyData?.finanzas?.pagos?.length > 0 ? (
                          historyData.finanzas.pagos.map((pago, idx) => (
                            <div key={idx} style={{ 
                              padding: '0.85rem 1rem', 
                              backgroundColor: '#f8fafc', 
                              borderRadius: '10px', 
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.4rem',
                              transition: 'all 0.15s ease'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ 
                                  fontSize: '0.7rem', 
                                  fontWeight: 800, 
                                  padding: '2px 7px', 
                                  borderRadius: '5px', 
                                  textTransform: 'uppercase',
                                  backgroundColor: pago.origen === 'Dentalink' ? '#e0f2fe' : '#ede9fe',
                                  color: pago.origen === 'Dentalink' ? '#0369a1' : '#6d28d9',
                                  border: pago.origen === 'Dentalink' ? '1px solid #bae6fd' : '1px solid #ddd6fe'
                                }}>
                                  {pago.origen}
                                </span>
                                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#16a34a' }}>
                                  +${Number(pago.monto || 0).toLocaleString('es-CL')}
                                </span>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                <span style={{ fontWeight: 600, color: '#334155' }}>
                                  {pago.medio}
                                </span>
                                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                  {pago.fecha} {pago.hora ? `• ${pago.hora}` : ''}
                                </span>
                              </div>

                              {(pago.referencia || pago.sucursal) && (
                                <div style={{ fontSize: '0.75rem', color: '#64748b', borderTop: '1px dashed #e2e8f0', paddingTop: '0.3rem', marginTop: '0.1rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
                                  {pago.referencia && <span style={{ fontWeight: 500 }}>{pago.referencia}</span>}
                                  {pago.sucursal && <span style={{ color: '#94a3b8' }}>{pago.sucursal}</span>}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-light)', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                            <p style={{ margin: 0, fontSize: '0.85rem' }}>No hay abonos ni pagos registrados</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Columna Derecha: Historial Clínico (Dentalink) */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--border)', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
                          <Activity size={20} color="var(--primary)" />
                          Historial Clínico y Citas
                        </h3>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '12px' }}>
                          {historyData?.timeline?.length || 0} eventos
                        </span>
                      </div>

                      {/* Filtros rápidos de citas y eventos */}
                      {historyData?.timeline?.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                          {[
                            { key: 'todos', label: 'Todos', count: historyData.timeline.length },
                            { key: 'atendidas', label: 'Atendidas', count: historyData.timeline.filter(i => i.tipo === 'cita' && i.estado?.atendido).length, color: '#15803d' },
                            { key: 'no_asistio', label: 'No Asistió', count: historyData.timeline.filter(i => i.tipo === 'cita' && i.estado?.noAsistio).length, color: '#dc2626' },
                            { key: 'anuladas', label: 'Anuladas', count: historyData.timeline.filter(i => i.tipo === 'cita' && i.estado?.anulada).length, color: '#64748b' },
                            { key: 'notas', label: 'Evoluciones / Prestaciones', count: historyData.timeline.filter(i => i.tipo !== 'cita').length, color: '#2563eb' }
                          ].map(f => (
                            <button
                              key={f.key}
                              type="button"
                              onClick={() => setTimelineFilter(f.key)}
                              style={{
                                border: '1px solid',
                                borderColor: timelineFilter === f.key ? (f.color || 'var(--primary)') : '#e2e8f0',
                                backgroundColor: timelineFilter === f.key ? (f.color ? `${f.color}15` : '#e0f2fe') : '#ffffff',
                                color: timelineFilter === f.key ? (f.color || 'var(--primary)') : '#64748b',
                                fontWeight: timelineFilter === f.key ? 700 : 500,
                                fontSize: '0.72rem',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>{f.label}</span>
                              <span style={{ 
                                backgroundColor: timelineFilter === f.key ? (f.color || 'var(--primary)') : '#f1f5f9', 
                                color: timelineFilter === f.key ? '#ffffff' : '#475569',
                                padding: '1px 5px', 
                                borderRadius: '10px', 
                                fontSize: '0.65rem',
                                fontWeight: 700
                              }}>
                                {f.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '480px', overflowY: 'auto', paddingRight: '0.35rem' }}>
                        {historyData?.timeline?.length > 0 ? (
                          historyData.timeline
                            .filter(item => {
                              if (timelineFilter === 'atendidas') return item.tipo === 'cita' && item.estado?.atendido;
                              if (timelineFilter === 'no_asistio') return item.tipo === 'cita' && item.estado?.noAsistio;
                              if (timelineFilter === 'anuladas') return item.tipo === 'cita' && item.estado?.anulada;
                              if (timelineFilter === 'notas') return item.tipo !== 'cita';
                              return true;
                            })
                            .map((item, idx) => {
                              if (item.tipo === 'cita') {
                                const isAtendido = item.estado?.atendido;
                                const isNoAsistio = item.estado?.noAsistio;
                                const isAnulada = item.estado?.anulada;

                                const borderColor = isAtendido ? '#86efac' : isNoAsistio ? '#fca5a5' : isAnulada ? '#e2e8f0' : '#bae6fd';
                                const badgeBg = isAtendido ? '#dcfce7' : isNoAsistio ? '#fee2e2' : isAnulada ? '#f1f5f9' : '#e0f2fe';
                                const badgeColor = isAtendido ? '#15803d' : isNoAsistio ? '#991b1b' : isAnulada ? '#64748b' : '#0369a1';

                                return (
                                  <div key={idx} style={{ 
                                    padding: '1rem 1.15rem', 
                                    border: `1px solid ${borderColor}`, 
                                    borderRadius: '10px', 
                                    backgroundColor: isAnulada ? '#fafafa' : '#ffffff',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.6rem'
                                  }}>
                                    {/* Cabecera de la Cita */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Calendar size={15} color={badgeColor} />
                                        <span style={{ 
                                          fontSize: '0.72rem', 
                                          fontWeight: 800, 
                                          textTransform: 'uppercase',
                                          backgroundColor: badgeBg,
                                          color: badgeColor,
                                          border: `1px solid ${borderColor}`,
                                          padding: '2px 8px',
                                          borderRadius: '5px'
                                        }}>
                                          {isAtendido ? '✓ ATENDIDO / TRATAMIENTO REALIZADO' :
                                           isNoAsistio ? '⚠ NO ASISTIÓ (INASISTENCIA SIN ANULAR)' :
                                           isAnulada ? `✕ CITA ANULADA (${item.estado?.original || 'Anulada'})` :
                                           `📅 CITA: ${item.estado?.titulo || 'Agendada'}`}
                                        </span>
                                      </div>
                                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                        {item.fecha} {item.hora ? `• ${item.hora.slice(0, 5)}` : ''} {item.horaFin ? `- ${item.horaFin.slice(0, 5)}` : ''}
                                      </span>
                                    </div>

                                    {/* Profesional y Ubicación */}
                                    <div style={{ fontSize: '0.82rem', color: '#1e40af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                      <span>Dr/a: {item.doctor}</span>
                                      {item.sede && <span style={{ color: '#64748b', fontWeight: 400 }}>• {item.sede}</span>}
                                      {item.sillon && <span style={{ color: '#94a3b8', fontWeight: 400 }}>({item.sillon})</span>}
                                    </div>

                                    {/* Mensaje de Estado / Asistencia */}
                                    {isAtendido && (
                                      <div style={{ padding: '0.4rem 0.6rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '0.78rem', color: '#166534', fontWeight: 500 }}>
                                        ✓ El paciente asistió a la cita y fue atendido por el profesional.
                                      </div>
                                    )}
                                    {isNoAsistio && (
                                      <div style={{ padding: '0.4rem 0.6rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.78rem', color: '#991b1b', fontWeight: 600 }}>
                                        ⚠ La cita estaba reservada y NO fue cancelada, pero el paciente NO se presentó a la clínica.
                                      </div>
                                    )}
                                    {isAnulada && (
                                      <div style={{ padding: '0.4rem 0.6rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.78rem', color: '#64748b' }}>
                                        ✕ Esta cita fue anulada o reprogramada. No hubo atención médica en esta fecha.
                                      </div>
                                    )}

                                    {/* Detalle del Tratamiento en la Cita */}
                                    {(item.tratamiento?.nombre || item.tratamiento?.procedimientoOMotivo || item.tratamiento?.prestacionesRealizadas?.length > 0 || item.tratamiento?.evolucionesClinicas?.length > 0) && (
                                      <div style={{ 
                                        backgroundColor: isAtendido ? '#f8fafc' : '#ffffff', 
                                        border: '1px solid #e2e8f0', 
                                        borderRadius: '8px', 
                                        padding: '0.6rem 0.75rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.3rem',
                                        fontSize: '0.82rem'
                                      }}>
                                        {item.tratamiento.nombre && (
                                          <div style={{ color: '#334155' }}>
                                            <strong style={{ color: '#1e293b' }}>Plan de Tratamiento:</strong> {item.tratamiento.nombre}
                                          </div>
                                        )}
                                        {item.tratamiento.procedimientoOMotivo && (
                                          <div style={{ color: '#0f766e' }}>
                                            <strong>{isAtendido ? 'Procedimiento Realizado / Motivo:' : 'Procedimiento Programado:'}</strong> {item.tratamiento.procedimientoOMotivo}
                                          </div>
                                        )}
                                        {isAtendido && item.tratamiento.prestacionesRealizadas?.length > 0 && (
                                          <div style={{ color: '#2563eb', fontSize: '0.78rem' }}>
                                            <strong>Prestaciones concluidas este día:</strong> {item.tratamiento.prestacionesRealizadas.join(', ')}
                                          </div>
                                        )}
                                        {isAtendido && item.tratamiento.evolucionesClinicas?.length > 0 && (
                                          <div style={{ color: '#475569', fontSize: '0.78rem', fontStyle: 'italic', borderTop: '1px dashed #e2e8f0', paddingTop: '0.3rem', marginTop: '0.1rem' }}>
                                            <strong>Nota clínica del dentista:</strong> &ldquo;{item.tratamiento.evolucionesClinicas.join(' | ')}&rdquo;
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              // Renderizado de Prestaciones y Evoluciones
                              return (
                                <div key={idx} style={{ 
                                  padding: '1rem 1.15rem', 
                                  border: '1px solid #e2e8f0', 
                                  borderRadius: '10px', 
                                  backgroundColor: '#ffffff',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.4rem'
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <span style={{ 
                                        width: '8px', 
                                        height: '8px', 
                                        borderRadius: '50%', 
                                        backgroundColor: item.tipo === 'accion' ? '#3b82f6' : '#f59e0b' 
                                      }} />
                                      <span style={{ 
                                        fontSize: '0.7rem', 
                                        fontWeight: 800, 
                                        textTransform: 'uppercase',
                                        color: item.tipo === 'accion' ? '#2563eb' : '#d97706'
                                      }}>
                                        {item.tipo === 'accion' ? 'Prestación Realizada' : 'Evolución / Nota'}
                                      </span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                                      {item.fecha} {item.hora || ''}
                                    </span>
                                  </div>

                                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e40af' }}>
                                    {item.doctor} {item.sede ? `• ${item.sede}` : ''}
                                  </div>

                                  <div style={{ 
                                    fontSize: '0.9rem', 
                                    lineHeight: '1.5', 
                                    color: '#334155', 
                                    fontWeight: 500,
                                    padding: '0.35rem 0',
                                    borderTop: '1px solid #f1f5f9'
                                  }}>
                                    {item.descripcion}
                                  </div>
                                  
                                  {item.detalles && (
                                    <div style={{ 
                                      fontSize: '0.78rem', 
                                      color: '#64748b', 
                                      backgroundColor: '#f8fafc', 
                                      padding: '0.4rem 0.6rem', 
                                      borderRadius: '6px',
                                      border: '1px solid #f1f5f9'
                                    }}>
                                      {item.detalles}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                        ) : (
                          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-light)', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                            <p style={{ margin: 0, fontSize: '0.85rem' }}>No hay eventos clínicos registrados en Dentalink</p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}


      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
