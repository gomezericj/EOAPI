"use client";
import { useState, useEffect } from 'react';
import { Plus, Search, Stethoscope, Phone, Mail, Award, Percent, FileCheck, Edit, Trash2, Download, ToggleLeft, ToggleRight } from 'lucide-react';
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
    specialty1: '',
    specialty2: '',
    commissionPercentage: '40',
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
          age: '', email: '', phone: '', specialty1: '', specialty2: '',
          commissionPercentage: '40', hasInvoice: false
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
      Especialidad_1: d.specialty1,
      Especialidad_2: d.specialty2 || '',
      Comision_Pct: `${d.commissionPercentage}%`,
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
            age: '', email: '', phone: '', specialty1: '', specialty2: '',
            commissionPercentage: '40', hasInvoice: false
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Award size={12} /> {d.specialty1}</div>
                    {d.specialty2 && <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Award size={12} /> {d.specialty2}</div>}
                  </div>
                </td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                    <Percent size={14} /> {d.commissionPercentage}%
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
                          specialty1: d.specialty1 || '',
                          specialty2: d.specialty2 || '',
                          commissionPercentage: d.commissionPercentage || '',
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
            <div className="card" style={{ width: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Primera Especialidad</label>
                    <select className="form-control" value={formData.specialty1} onChange={e => setFormData({ ...formData, specialty1: e.target.value })} required>
                      <option value="">Seleccione...</option>
                      {specialties.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Segunda Especialidad</label>
                    <select className="form-control" value={formData.specialty2} onChange={e => setFormData({ ...formData, specialty2: e.target.value })}>
                      <option value="">Ninguna / Seleccione...</option>
                      {specialties.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Porcentaje Comisión (%)</label>
                    <input type="number" className="form-control" value={formData.commissionPercentage} onChange={e => setFormData({ ...formData, commissionPercentage: e.target.value })} disabled={!isAdmin} required />
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '2rem', gap: '0.5rem' }}>
                    <input type="checkbox" id="hasInvoice" checked={formData.hasInvoice} onChange={e => setFormData({ ...formData, hasInvoice: e.target.checked })} disabled={!isAdmin} />
                    <label htmlFor="hasInvoice" className="form-label" style={{ marginBottom: 0 }}>¿Emite Factura? (Si NO emite factura, aplica Retención {systemRetention}% Boleta)</label>
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
