"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';
import { Settings, Save, Link as LinkIcon, Trash2, ToggleLeft, ToggleRight, Plus, Code, Info } from 'lucide-react';
import Portal from '@/components/Portal';

export default function IntegrationsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { showAlert, showSuccess, showConfirm } = useNotification();
  
  const isSuperadmin = session?.user?.role === 'superadmin';
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    provider: '', systemKey: '', environment: 'PROD', baseUrl: '', apiKey: '', clientId: '', clientSecret: '', isActive: false, settings: {}
  });
  const [settingsJson, setSettingsJson] = useState('{}');

  useEffect(() => {
    if (session && !isSuperadmin) {
      router.push('/');
    }
  }, [session, isSuperadmin, router]);

  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/apiconnections');
      const data = await res.json();
      setConnections(data);
    } catch(err) {
      showAlert('Error cargando integraciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if(isSuperadmin) fetchConnections();
  }, [isSuperadmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let parsedSettings = {};
    try {
      parsedSettings = JSON.parse(settingsJson);
    } catch (e) {
      showAlert('El JSON de configuración avanzada no es válido');
      return;
    }

    const payload = { ...formData, settings: parsedSettings };
    const url = formData._id ? `/api/apiconnections/${formData._id}` : '/api/apiconnections';
    const method = formData._id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        await fetchConnections();
        showSuccess(formData._id ? 'Conexión actualizada' : 'Conexión creada');
      } else {
        const err = await res.json();
        showAlert(err.error || 'Error al guardar conexión');
      }
    } catch (err) {
      showAlert('Error de red');
    }
  };

  const fillDentalinkDefaults = () => {
    // Buscar si ya existe una conexión para actualizarla en vez de crear una duplicada
    const existing = connections.find(c => c.systemKey === 'DENTALINK_PACIENTES' || c.provider?.toLowerCase() === 'dentalink');
    
    const dentalinkDefaults = {
      endpoints: {
        search: "/api/v1/pacientes?q={\"rut\":{\"eq\":\"{rut}\"}}",
        history_antecedents: "/api/v2/pacientes/{{externalId}}/antecedentesmedicos",
        history_evolutions: "/api/v1/pacientes/{{externalId}}/evoluciones",
        history_citas: "/api/v1/pacientes/{{externalId}}/citas",
        history_tratamientos: "/api/v1/pacientes/{{externalId}}/tratamientos",
        history_tratamiento_detalle: "/api/v2/tratamientos/{{id}}/detalles"
      },
      mapping: {
        doctor_field: "nombre_dentista",
        evolution_field: "evolucion",
        treatment_action_field: "nombre_prestacion"
      },
      webhooks: {
        new_patient_url: "",
        new_payment_url: ""
      }
    };

    setFormData({
      ...(existing || formData),
      provider: 'Dentalink',
      systemKey: 'DENTALINK_PACIENTES',
      baseUrl: 'https://api.dentalink.healthatom.com',
      isActive: existing ? existing.isActive : true
    });
    setSettingsJson(JSON.stringify(dentalinkDefaults, null, 2));
    setShowModal(true);
  };

  const handleToggle = async (conn) => {
    try {
      const res = await fetch(`/api/apiconnections/${conn._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !conn.isActive })
      });
      if (res.ok) {
        await fetchConnections();
        showSuccess(conn.isActive ? 'Integración Appagada' : 'Integración Encendida');
      }
    } catch(err) {
      showAlert('Error cambiando estado');
    }
  };

  const handleDelete = async (id) => {
    showConfirm('¿Estás seguro de querer eliminar esta conexión?', async () => {
      const res = await fetch(`/api/apiconnections/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchConnections();
        showSuccess('Conexión eliminada');
      } else {
        showAlert('Error eliminando');
      }
    });
  };

  if (!isSuperadmin) return null;
  if (loading) return <div>Cargando integraciones...</div>;

  return (
    <div className="dashboard-container">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Integraciones API</h1>
          <p style={{ color: 'var(--text-light)' }}>Gestiona las conexiones con software de terceros (Dentalink, Pagos, etc.)</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={fillDentalinkDefaults}>
            <Code size={18} /> Cargar Plantilla Dentalink
          </button>
          <button className="btn btn-primary" onClick={() => {
            setFormData({ provider: '', systemKey: '', environment: 'PROD', baseUrl: '', apiKey: '', clientId: '', clientSecret: '', isActive: false, settings: {} });
            setSettingsJson('{}');
            setShowModal(true);
          }}>
            <Plus size={20} /> Nueva Integración
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {connections.map(conn => (
          <div 
            key={conn._id} 
            className="card" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem', 
              transition: 'all 0.3s ease',
              borderTop: conn.isActive ? '5px solid #10b981' : '5px solid #ef4444',
              boxShadow: conn.isActive ? '0 10px 15px -3px rgba(16, 185, 129, 0.1), 0 4px 6px -2px rgba(16, 185, 129, 0.05)' : 'var(--shadow)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: conn.isActive ? 'var(--primary)' : 'var(--text-light)' }}>
                <LinkIcon size={20} color={conn.isActive ? '#10b981' : 'var(--text-light)'} /> 
                {conn.provider} 
                <span style={{fontSize: '0.65rem', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#475569'}}>{conn.systemKey}</span>
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className={`badge-role ${conn.isActive ? 'admin' : 'user'}`} style={{ backgroundColor: conn.isActive ? '#d1fae5' : '#f1f5f9', color: conn.isActive ? '#065f46' : '#64748b', fontSize: '0.7rem' }}>
                  {conn.environment}
                </span>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              padding: '0.6rem 1rem', 
              borderRadius: '8px', 
              backgroundColor: conn.isActive ? 'rgba(16, 185, 129, 0.08)' : '#f8fafc',
              border: conn.isActive ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border)'
            }}>
              <div className={`status-pulse ${conn.isActive ? 'active' : 'inactive'}`} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: conn.isActive ? '#059669' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                  Estado Actual
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: conn.isActive ? '#065f46' : 'var(--text)' }}>
                  {conn.isActive ? 'CONECTADO Y ACTIVO' : 'DESCONECTADO / APAGADO'}
                </div>
              </div>
            </div>
            
            <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', wordBreak: 'break-all' }}>
              <strong>Endpoint:</strong><br/>
              <code style={{ fontSize: '0.75rem', color: 'var(--primary-light)' }}>{conn.baseUrl}</code>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button 
                onClick={() => handleToggle(conn)}
                className="btn"
                style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.8rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  backgroundColor: conn.isActive ? '#fff1f2' : '#f0fdf4', 
                  color: conn.isActive ? '#e11d48' : '#16a34a',
                  border: conn.isActive ? '1px solid #fecdd3' : '1px solid #bbfcce',
                  width: '140px'
                }}
              >
                {conn.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                {conn.isActive ? 'Desactivar' : 'Activar'}
              </button>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <button className="btn-action-edit" title="Configurar" onClick={() => { 
                   setFormData(conn); 
                   setSettingsJson(JSON.stringify(conn.settings || {}, null, 2));
                   setShowModal(true); 
                 }}><Settings size={16} /></button>
                 <button className="btn-action-delete" title="Eliminar" onClick={() => handleDelete(conn._id)}><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .status-pulse {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          position: relative;
        }
        .status-pulse.active {
          background-color: #10b981;
          box-shadow: 0 0 0 rgba(16, 185, 129, 0.7);
          animation: statusPulseGreen 2s infinite;
        }
        .status-pulse.inactive {
          background-color: #cbd5e1;
        }
        @keyframes statusPulseGreen {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>

      {showModal && (
        <Portal>
          <div className="modal-overlay">
            <div className="card" style={{ width: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Settings color="var(--primary)" />
                {formData._id ? 'Editar Integración' : 'Nueva Integración'}
              </h2>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Proveedor / Nombre Descriptivo</label>
                    <input type="text" className="form-control" value={formData.provider} onChange={e => setFormData({...formData, provider: e.target.value})} required placeholder="Ej. Dentalink, Hubspot..." />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">System Key (Driver Id)</label>
                    <input type="text" className="form-control" value={formData.systemKey} onChange={e => setFormData({...formData, systemKey: e.target.value.toUpperCase().replace(/\s+/g, '_')})} required placeholder="DENTALINK_PACIENTES" disabled={!!formData._id} />
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Entorno</label>
                    <select className="form-control" value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value})}>
                      <option value="PROD">Producción (PROD)</option>
                      <option value="TEST">Pruebas (TEST)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Base URL (API Endpoint)</label>
                    <input type="url" className="form-control" value={formData.baseUrl} onChange={e => setFormData({...formData, baseUrl: e.target.value})} required placeholder="https://api..." />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">API Key / Authorization Token</label>
                  <input type="password" className="form-control" value={formData.apiKey} onChange={e => setFormData({...formData, apiKey: e.target.value})} placeholder="Ingrese el token de acceso" />
                </div>

                <div style={{ backgroundColor: '#fdf2f2', padding: '1rem', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b', fontSize: '0.9rem' }}>
                    <Code size={16} /> Configuración Avanzada (JSON Mapping)
                  </h4>
                  <div style={{ position: 'relative' }}>
                    <textarea 
                      className="form-control" 
                      style={{ height: '300px', fontFamily: 'monospace', fontSize: '0.8rem', backgroundColor: '#1e293b', color: '#e2e8f0', lineHeight: '1.5', padding: '1rem' }}
                      value={settingsJson}
                      onChange={e => setSettingsJson(e.target.value)}
                    />
                    <div style={{ position: 'absolute', right: '10px', top: '10px' }}>
                      <Info size={14} color="#64748b" title="Define aquí los endpoints específicos y mapeos de campos para que el sistema sea agnóstico." />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginRight: 'auto' }}>
                      <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                      Activo
                   </label>
                  <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ border: '1px solid var(--border)' }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary"><Save size={18} style={{marginRight: '0.5rem'}}/>Guardar Configuración</button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
