"use client";
import { useState, useEffect } from 'react';
import { Plus, Search, User, Phone, Mail, Edit, Trash2, Download, ToggleLeft, ToggleRight, FileText, ClipboardList, Activity, X } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import Portal from '@/components/Portal';

export default function PatientsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
  const { showAlert, showConfirm, showSuccess, showLoading } = useNotification();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    rut: '',
    name: '',
    secondName: '',
    surname: '',
    secondSurname: '',
    age: '',
    email: '',
    phone: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [isDentalinkActive, setIsDentalinkActive] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const fetchExternalHistory = async (patient) => {
    setSelectedPatient(patient);
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
          phone: data.patient.phone || ''
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

  const fetchPatients = async () => {
    const res = await fetch('/api/patients', { cache: 'no-store' });
    const data = await res.json();
    setPatients(data);
    
    try {
      const apiRes = await fetch('/api/apiconnections');
      const conns = await apiRes.json();
      const dink = conns.find(c => c.provider?.toLowerCase() === 'dentalink');
      setIsDentalinkActive(!!(dink && dink.isActive));
    } catch(err){}

    setLoading(false);
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = formData._id ? `/api/patients/${formData._id}` : '/api/patients';
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
          age: '', email: '', phone: ''
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
          setFormData({ rut: '', name: '', surname: '', email: '', phone: '', secondName: '', secondSurname: '' });
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
            <div className="card" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2>{formData._id ? 'Editar Paciente' : 'Registrar Paciente'}</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                          className="btn btn-secondary" 
                          onClick={searchInDentalink}
                          disabled={searching || !formData.rut}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
                        >
                          {searching ? 'Cargando...' : <><Search size={16} /> Buscar</>}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Edad</label>
                    <input type="number" className="form-control" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} />
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
            <div className="card" style={{ width: '900px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ClipboardList size={24} color="var(--primary)" />
                    Ficha Clínica Externa
                  </h2>
                  {selectedPatient && <p style={{ margin: '4px 0 0', color: 'var(--text-light)', fontSize: '0.9rem' }}>Paciente: <strong>{selectedPatient.name} {selectedPatient.surname}</strong> ({selectedPatient.rut})</p>}
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
                  <p>Consultando historial en Dentalink...</p>
                </div>
              ) : historyData?.error ? (
                <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fee2e2' }}>
                  <p style={{ color: '#991b1b', fontWeight: 600, marginBottom: '0.5rem' }}>{historyData.error}</p>
                  {historyData.instructions && <p style={{ fontSize: '0.85rem', color: '#b91c1c' }}>{historyData.instructions}</p>}
                  <button onClick={() => setShowHistoryModal(false)} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Entendido</button>
                </div>
              ) : !historyData?.found && historyData?.message ? (
                <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#fff7ed', borderRadius: '12px', border: '1px solid #ffedd5' }}>
                  <p style={{ color: '#9a3412', fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>{historyData.message}</p>
                  {historyData.details && <p style={{ fontSize: '0.8rem', color: '#c2410c', opacity: 0.8, marginBottom: '1rem' }}>{historyData.details}</p>}
                  <button onClick={() => setShowHistoryModal(false)} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Cerrar</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>
                      <Activity size={18} /> Antecedentes Médicos
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {historyData?.antecedentes?.length > 0 ? historyData.antecedentes.map((ant, idx) => (
                        <div key={idx} style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{ant.pregunta}</div>
                          <div style={{ fontSize: '0.9rem', color: ant.respuesta?.toLowerCase() === 'si' ? '#ef4444' : 'var(--text)', fontWeight: ant.respuesta?.toLowerCase() === 'si' ? 600 : 400 }}>
                            {ant.respuesta || 'N/A'} {ant.comentario && <em style={{ display: 'block', fontSize: '0.8rem', color: '#475569' }}>({ant.comentario})</em>}
                          </div>
                        </div>
                      )) : (
                        <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', textAlign: 'center' }}>No hay antecedentes registrados</p>
                      )}
                    </div>
                  </div>

                  <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '2rem' }}>
                    <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                      <ClipboardList size={18} /> Historial Clínico (Dentalink)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {historyData?.timeline?.length > 0 ? historyData.timeline.map((item, idx) => (
                        <div key={idx} style={{ 
                          padding: '1.25rem', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '12px', 
                          backgroundColor: 'white',
                          position: 'relative',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}>
                          <div style={{ 
                            position: 'absolute', 
                            left: '-2.4rem', 
                            top: '1.5rem', 
                            width: '0.75rem', 
                            height: '0.75rem', 
                            borderRadius: '50%', 
                            backgroundColor: item.tipo === 'accion' ? '#3b82f6' : item.tipo === 'cita' ? '#10b981' : '#f59e0b',
                            border: '3px solid white',
                            boxShadow: '0 0 0 1px #e2e8f0'
                          }} />
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e40af', fontWeight: 600, fontSize: '0.85rem' }}>
                                {item.sede && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Activity size={14} /> {item.sede},</span>}
                                <span>{item.doctor}</span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{item.fecha} {item.hora}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f97316', textTransform: 'uppercase' }}>
                              {item.tipo === 'accion' ? 'PRESTACIÓN REALIZADA' : item.tipo === 'cita' ? 'CITA AGENDADA' : 'EVOLUCIÓN/NOTA'}
                            </div>
                          </div>

                          <div style={{ 
                            fontSize: '0.95rem', 
                            lineHeight: '1.6', 
                            color: '#334155', 
                            fontWeight: 500,
                            padding: '0.5rem 0',
                            borderTop: '1px solid #f1f5f9'
                          }}>
                            {item.descripcion}
                          </div>
                          
                          {item.detalles && (
                            <div style={{ 
                              marginTop: '0.5rem', 
                              fontSize: '0.8rem', 
                              color: '#64748b', 
                              backgroundColor: '#f8fafc', 
                              padding: '0.5rem 0.75rem', 
                              borderRadius: '6px',
                              border: '1px solid #f1f5f9'
                            }}>
                              {item.detalles}
                            </div>
                          )}
                        </div>
                      )) : (
                        <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', textAlign: 'center' }}>No hay eventos en el historial</p>
                      )}
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
