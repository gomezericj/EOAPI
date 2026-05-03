"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Palette, UserPlus, Building, ChevronRight, Check } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    clinicName: 'Mi Clínica Dental',
    logoBase64: '',
    primaryColor: '#0ea5e9',
    adminName: '',
    adminSurname: '',
    adminEmail: '',
    adminPassword: ''
  });

  useEffect(() => {
    // Check if setup is actually required
    fetch('/api/setup/check')
      .then(res => res.json())
      .then(data => {
        if (!data.setupRequired) {
          router.push('/login');
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 200000) { // Limit to ~200kb
        setError('El logo debe ser menor a 200KB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logoBase64: reader.result });
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (step === 1) {
      if (!formData.clinicName) return setError('El nombre de la clínica es obligatorio');
      setStep(2);
      return;
    }
    
    if (!formData.adminName || !formData.adminEmail || !formData.adminPassword) {
      return setError('Completa los datos del administrador');
    }

    setSaving(true);
    try {
      const res = await fetch('/api/setup/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        // Setup done! Wait 2 seconds to show success, then redirect to login
        setStep(3);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(data.error || 'Error en la instalación');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>Verificando estado del sistema...</div>;
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      padding: '2rem'
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        :root { --primary: ${formData.primaryColor}; }
        .setup-card { background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); width: 100%; max-width: 500px; padding: 2.5rem; }
        .setup-input { width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; margin-top: 0.5rem; margin-bottom: 1.5rem; font-family: inherit; }
        .setup-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1); }
        .setup-btn { background: var(--primary); color: white; width: 100%; padding: 1rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; justify-content: center; alignItems: center; gap: 0.5rem; font-size: 1rem; transition: opacity 0.2s; }
        .setup-btn:hover { opacity: 0.9; }
        .color-picker { -webkit-appearance: none; border: none; width: 100%; height: 50px; border-radius: 8px; cursor: pointer; padding: 0; }
        .color-picker::-webkit-color-swatch-wrapper { padding: 0; }
        .color-picker::-webkit-color-swatch { border: none; border-radius: 8px; }
      `}} />

      <div className="setup-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#0f172a' }}>Bienvenido</h1>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Asistente de configuración inicial</p>
        </div>

        {error && <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error}</div>}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: '#ecfdf5', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Check size={40} />
            </div>
            <h2 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>¡Sistema Instalado!</h2>
            <p style={{ color: '#64748b' }}>Tu clínica ha sido configurada con éxito. Redirigiendo al inicio de sesión...</p>
          </div>
        )}

        {step < 3 && (
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1.5rem' }}><Building size={20} color="var(--primary)" /> 1. Marca de la Clínica</h3>
                
                <label style={{ fontWeight: 500, color: '#334155' }}>Nombre de la Clínica</label>
                <input type="text" className="setup-input" value={formData.clinicName} onChange={e => setFormData({...formData, clinicName: e.target.value})} placeholder="Ej: Odontología San Juan" required />

                <label style={{ fontWeight: 500, color: '#334155' }}>Logo (Opcional, máx 200KB)</label>
                <div style={{ border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', marginBottom: '1.5rem', marginTop: '0.5rem', backgroundColor: '#f8fafc', position: 'relative' }}>
                  <input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={handleFileChange} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                  {formData.logoBase64 ? (
                    <img src={formData.logoBase64} alt="Preview" style={{ maxHeight: '60px', margin: '0 auto' }} />
                  ) : (
                    <div style={{ color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <Upload size={24} />
                      <span>Haz clic o arrastra tu logo aquí</span>
                    </div>
                  )}
                </div>

                <label style={{ fontWeight: 500, color: '#334155' }}>Color Corporativo Principal</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                  <input type="color" className="color-picker" value={formData.primaryColor} onChange={e => setFormData({...formData, primaryColor: e.target.value})} style={{ flex: 1 }} />
                  <div style={{ flex: 2, display: 'flex', alignItems: 'center', padding: '0 1rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontFamily: 'monospace' }}>
                    {formData.primaryColor}
                  </div>
                </div>

                <button type="submit" className="setup-btn">Continuar <ChevronRight size={20} /></button>
              </div>
            )}

            {step === 2 && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1.5rem' }}><UserPlus size={20} color="var(--primary)" /> 2. Super Administrador</h3>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: 500, color: '#334155' }}>Nombre</label>
                    <input type="text" className="setup-input" value={formData.adminName} onChange={e => setFormData({...formData, adminName: e.target.value})} required />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: 500, color: '#334155' }}>Apellido</label>
                    <input type="text" className="setup-input" value={formData.adminSurname} onChange={e => setFormData({...formData, adminSurname: e.target.value})} required />
                  </div>
                </div>

                <label style={{ fontWeight: 500, color: '#334155' }}>Correo Electrónico</label>
                <input type="email" className="setup-input" value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} placeholder="admin@clinica.com" required />

                <label style={{ fontWeight: 500, color: '#334155' }}>Contraseña</label>
                <input type="password" className="setup-input" value={formData.adminPassword} onChange={e => setFormData({...formData, adminPassword: e.target.value})} required />

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" onClick={() => setStep(1)} className="setup-btn" style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569' }}>Volver</button>
                  <button type="submit" className="setup-btn" style={{ flex: 2 }} disabled={saving}>
                    {saving ? 'Instalando...' : 'Finalizar Instalación'} <Check size={20} />
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
