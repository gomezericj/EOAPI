"use client";
import { useState, useEffect } from 'react';
import { Save, Palette } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useSession } from 'next-auth/react';

export default function MarcaPage() {
  const { data: session } = useSession();
  const { showAlert, showSuccess } = useNotification();
  const [clinicName, setClinicName] = useState('Clínica Dental');
  const [logoBase64, setLogoBase64] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0ea5e9');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.clinicName) setClinicName(data.clinicName);
        if (data.logoBase64) setLogoBase64(data.logoBase64);
        if (data.primaryColor) setPrimaryColor(data.primaryColor);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 200000) return showAlert('El logo debe ser menor a 200KB');
      const reader = new FileReader();
      reader.onloadend = () => setLogoBase64(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!clinicName) return showAlert('El nombre de la clínica es obligatorio');
    
    // Ensure the color is a valid hex before sending
    const hexRegex = /^#([0-9A-F]{3}){1,2}$/i;
    if (!hexRegex.test(primaryColor)) {
      return showAlert('El código de color debe ser un Hexadecimal válido (ej: #025158)');
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicName, logoBase64, primaryColor })
      });

      if (res.ok) {
        showSuccess('Configuración de marca guardada. Aplicando cambios...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const data = await res.json();
        showAlert(data.error || 'Error al guardar');
      }
    } catch (error) {
      showAlert('Error de conexión');
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="dashboard-container">
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Palette size={32} color="var(--primary)" />
          <div>
            <h1 style={{ margin: 0 }}>Marca y Apariencia</h1>
            <p style={{ color: 'var(--text-light)', margin: 0 }}>Personaliza la identidad visual de la aplicación</p>
          </div>
        </div>
      </header>

      <div className="card" style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="form-group">
          <label className="form-label">Nombre de la Clínica</label>
          <input type="text" className="form-control" value={clinicName} onChange={e => setClinicName(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Logo de la Clínica (Opcional, máx 200KB)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            {logoBase64 && <img src={logoBase64} alt="Logo" style={{ maxHeight: '60px', maxWidth: '120px', objectFit: 'contain', backgroundColor: '#f1f5f9', padding: '0.5rem', borderRadius: '8px' }} />}
            <input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={handleFileChange} />
            {logoBase64 && (
              <button className="btn btn-secondary" onClick={() => setLogoBase64('')} style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }}>Quitar Logo</button>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Color Corporativo Principal (Hexadecimal)</label>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '-0.25rem', marginBottom: '0.5rem' }}>
            Puedes usar el selector de color o pegar directamente el código completo (ej: #025158).
          </p>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input 
              type="color" 
              value={primaryColor} 
              onChange={e => setPrimaryColor(e.target.value)} 
              style={{ width: '60px', height: '50px', padding: '0', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border)' }} 
            />
            <input 
              type="text" 
              className="form-control" 
              value={primaryColor} 
              onChange={e => setPrimaryColor(e.target.value)} 
              placeholder="#000000"
              style={{ fontFamily: 'monospace', textTransform: 'uppercase', width: '150px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '1rem' }}>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={18} /> Guardar Apariencia
          </button>
        </div>
      </div>
    </div>
  );
}
