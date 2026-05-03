"use client";
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function ConfiguracionPage() {
  const { data: session } = useSession();
  const { showAlert, showSuccess } = useNotification();
  const [retentionPercentage, setRetentionPercentage] = useState(13);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.retentionPercentage !== undefined) setRetentionPercentage(data.retentionPercentage);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (retentionPercentage < 0 || retentionPercentage > 100) {
      return showAlert('El porcentaje debe estar entre 0 y 100');
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionPercentage })
      });

      if (res.ok) {
        showSuccess('Configuración guardada correctamente');
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
        <h1>Configuración General</h1>
        <p style={{ color: 'var(--text-light)' }}>Ajustes globales del sistema</p>
      </header>

      <div className="card" style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>Retención de Comisiones</h3>
        
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>
            Porcentaje de Retención (aplica a doctores que SÍ emiten boleta)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            <input 
              type="number" 
              className="form-control" 
              value={retentionPercentage} 
              onChange={e => setRetentionPercentage(Number(e.target.value))}
              style={{ width: '150px' }}
            />
            <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>%</span>
          </div>
          <small style={{ color: 'var(--text-light)', display: 'block', marginTop: '0.5rem', lineHeight: '1.5' }}>
             La retención se aplica <strong>únicamente a los doctores que emiten boleta de honorarios</strong>. Aquellos profesionales que no emiten boleta porque <strong>emiten Factura</strong>, no sufrirán esta retención en sus comisiones (para controlarlo, asegúrate de activar o desactivar la casilla "Emite Factura" dentro del perfil de cada doctor).
          </small>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '1rem' }}>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={18} /> Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}
