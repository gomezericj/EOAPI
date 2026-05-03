"use client";
import { useState, useEffect } from 'react';
import { Plus, User, Mail, Shield, Trash2, Key, Edit, Eye, EyeOff } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useSession } from 'next-auth/react';
import Portal from '@/components/Portal';

export default function UsersPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === 'superadmin';
  const isAdmin = session?.user?.role === 'admin' || isSuperAdmin;
  const { showAlert, showConfirm, showSuccess } = useNotification();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/usuarios');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role !== 'user') {
      fetchUsers();
    }
  }, [session]);

  if (session?.user?.role === 'user') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
        <h2>Acceso Denegado</h2>
        <p style={{ color: 'var(--text-light)' }}>No tienes los permisos necesarios para gestionar usuarios.</p>
      </div>
    );
  }

  const canEdit = (u) => {
    if (isSuperAdmin) return true;
    if (session?.user?.role === 'admin' && u.role === 'superadmin') return false;
    return true;
  };

  const canDelete = (u) => {
    if (u._id === session?.user?.id) return false;
    if (session?.user?.role === 'admin' && u.role === 'superadmin') return false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const isEditing = !!formData._id;
      const url = isEditing ? `/api/usuarios/${formData._id}` : '/api/usuarios';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({ name: '', surname: '', email: '', password: '', role: 'user' });
        fetchUsers();
        showSuccess(isEditing ? 'Usuario actualizado' : 'Usuario creado');
      } else {
        const data = await res.json();
        showAlert(data.error || 'Error al guardar usuario');
      }
    } catch (err) {
      showAlert('Error de conexión');
    }
  };

  const handleDelete = async (id) => {
    showConfirm('¿Está seguro de eliminar este usuario?', async () => {
      try {
        const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchUsers();
          showSuccess('Usuario eliminado');
        } else {
          const err = await res.json();
          showAlert(err.error || 'Error al eliminar');
        }
      } catch (err) {
        showAlert('Error de conexión');
      }
    });
  };

  const handleEdit = (u) => {
    setFormData({ ...u, password: '' });
    setShowModal(true);
  };

  return (
    <div className="users-page">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Gestión de Usuarios</h1>
          <p style={{ color: 'var(--text-light)' }}>Administra accesos y permisos al sistema</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setFormData({ name: '', surname: '', email: '', password: '', role: 'user' });
          setShowModal(true);
        }}>
          <Plus size={20} />
          Nuevo Usuario
        </button>
      </header>

      <div className="card" style={{ maxWidth: '900px' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ textAlign: 'center' }}>Cargando...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center' }}>No hay usuarios registrados</td></tr>
              ) : users.map((u) => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <User size={18} style={{ color: 'var(--secondary)' }} />
                      {u.name} {u.surname}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-light)' }}>
                      <Mail size={14} /> {u.email}
                    </div>
                  </td>
                  <td>
                    <span style={{
                      backgroundColor: u.role === 'superadmin' ? '#fce7f3' : u.role === 'admin' ? '#fee2e2' : '#e0e7ff',
                      color: u.role === 'superadmin' ? '#9d174d' : u.role === 'admin' ? '#991b1b' : '#3730a3',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      <Shield size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      {u.role === 'superadmin' ? 'Súper Administrador' : u.role === 'admin' ? 'Administrador' : 'Usuario'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {canEdit(u) && (
                      <button className="btn-action-edit" style={{ marginRight: '1rem' }} onClick={() => handleEdit(u)}><Edit size={16} /></button>
                    )}
                    {canDelete(u) && (
                      <button className="btn-action-delete" onClick={() => handleDelete(u._id)}><Trash2 size={16} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Portal>
          <div className="modal-overlay">
            <div className="card" style={{ width: '500px' }}>
              <h2>{formData._id ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}</h2>
              <form onSubmit={handleSubmit} autoComplete="off">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Nombre</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Apellido</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.surname}
                      onChange={e => setFormData({ ...formData, surname: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Electrónico</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                    autoComplete="off"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Contraseña
                    {formData._id && <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginLeft: '0.5rem', fontWeight: 'normal' }}>(Dejar en blanco para mantener actual)</span>}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      required={!formData._id}
                      style={{ paddingRight: '2.5rem' }}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-light)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Rol del Usuario</label>
                  <select
                    className="form-control"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    disabled={formData._id === session?.user?.id}
                  >
                    <option value="user">Usuario (Ventas y Pacientes)</option>
                    {(isAdmin || isSuperAdmin) && (
                       <option value="admin">Administrador (Gestión Configuración)</option>
                    )}
                    {formData.role === 'superadmin' && (
                       <option value="superadmin">Súper Administrador (Control Total)</option>
                    )}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ border: '1px solid var(--border)' }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">{formData._id ? 'Guardar Cambios' : 'Crear Usuario'}</button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
