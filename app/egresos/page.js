"use client";
import { useState, useEffect } from 'react';
import { Plus, Trash2, DollarSign, User, Tag, Edit, Search, Download } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import Portal from '@/components/Portal';

export default function ExpensesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
  const { showAlert, showConfirm, showSuccess } = useNotification();
  const [expenses, setExpenses] = useState([]);
  const [closedDates, setClosedDates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const now = new Date();
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayStr = localToday;
  const [dateRange, setDateRange] = useState({ start: localToday, end: localToday });
  const [formData, setFormData] = useState({ date: localToday, name: '', reason: '', amount: 0, type: 'Otro' });
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [displayExpenses, setDisplayExpenses] = useState([]);
  const fetchData = async () => {
    const eRes = await fetch('/api/egresos');
    setExpenses(await eRes.json());
    const cRes = await fetch('/api/cierres');
    const cData = await cRes.json();
    setClosedDates(Array.isArray(cData) ? cData : []);
  };

  const handleSearch = () => {
    const filtered = expenses.filter(e => {
      const expDateStr = new Date(e.date).toISOString().split('T')[0];
      const matchesDate = expDateStr >= dateRange.start && expDateStr <= dateRange.end;
      const matchesSearch =
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.reason.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDate && matchesSearch;
    });

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setDisplayExpenses(sorted);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [expenses, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = formData._id ? `/api/egresos/${formData._id}` : '/api/egresos';
    const method = formData._id ? 'PUT' : 'POST';

    if (formData.date > todayStr) {
      showAlert('No se pueden registrar egresos para fechas futuras.');
      return;
    }

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setShowModal(false);
      setFormData({ date: localToday, name: '', reason: '', amount: 0, type: 'Otro' });
      fetchData();
      showSuccess(formData._id ? 'Egreso actualizado' : 'Egreso registrado');
    } else {
      const err = await res.json();
      showAlert(err.error || 'Error al guardar egreso');
    }
  };

  const handleEdit = (e) => {
    setFormData({ ...e, date: new Date(e.date).toISOString().split('T')[0] }); // Keep ISO for edit since server returns ISO
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    showConfirm('¿Eliminar egreso?', async () => {
      const res = await fetch(`/api/egresos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        showSuccess('Egreso eliminado');
      } else {
        const err = await res.json();
        showAlert(err.error || 'Error al eliminar');
      }
    });
  };

  const filteredExpenses = displayExpenses;

  const exportToExcel = () => {
    const data = filteredExpenses.map(e => ({
      Fecha: new Date(e.date).toLocaleDateString('es-CL', { timeZone: 'UTC' }),
      Persona_Beneficiaria: e.name,
      Concepto: e.reason,
      Tipo: e.type,
      Monto: e.amount
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Egresos");
    XLSX.writeFile(workbook, `Registro_Egresos_EsteticaOral2L_${dateRange.start}_a_${dateRange.end}.xlsx`);
  };

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const valePersonalTotal = filteredExpenses.filter(e => e.type === 'Vale Personal').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const gastoClinicaTotal = filteredExpenses.filter(e => e.type === 'Gasto Clinica' || e.type === 'Gasto Clínica').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const otroTotal = totalExpenses - valePersonalTotal - gastoClinicaTotal;

  return (
    <div className="expenses-page">
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1>Control de Egresos</h1>
            <p style={{ color: 'var(--text-light)' }}>Salidas de efectivo de caja</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={20} /> Nuevo Egreso
          </button>
        </div>

        <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', backgroundColor: '#f8fafc', padding: '1rem', marginBottom: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Desde</label>
            <input type="date" className="form-control" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} style={{ width: '150px' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Hasta</label>
            <input type="date" className="form-control" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} style={{ width: '150px' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Búsqueda Rápida</label>
            <div className="search-bar" style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', width: '100%' }}>
              <Search size={16} color="var(--text-light)" />
              <input
                type="text"
                placeholder="Persona o Concepto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', outline: 'none', marginLeft: '0.5rem', width: '100%' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={handleSearch} style={{ height: '42px' }}>
              <Search size={16} style={{ marginRight: '0.5rem' }} /> Buscar
            </button>
            <button className="btn btn-excel" onClick={exportToExcel} style={{ height: '42px' }}>
              <Download size={20} /> Excel
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
            <DollarSign size={20} color="var(--danger)" /> Resumen de Egresos
          </h3>
          <div className="responsive-grid-4">
            <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2' }}>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#991b1b', fontWeight: 600 }}>TOTAL GASTOS</p>
              <h4 style={{ margin: '0.15rem 0 0', color: '#dc2626', fontSize: '1.1rem' }}>${totalExpenses.toLocaleString('es-CL')}</h4>
            </div>
            <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>VALE PERSONAL</p>
              <h4 style={{ margin: '0.15rem 0 0', color: '#ef4444', fontSize: '0.95rem' }}>${valePersonalTotal.toLocaleString('es-CL')}</h4>
            </div>
            <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>GASTO CLÍNICA</p>
              <h4 style={{ margin: '0.15rem 0 0', color: '#ef4444', fontSize: '0.95rem' }}>${gastoClinicaTotal.toLocaleString('es-CL')}</h4>
            </div>
            <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>OTRO</p>
              <h4 style={{ margin: '0.15rem 0 0', color: '#ef4444', fontSize: '0.95rem' }}>${otroTotal.toLocaleString('es-CL')}</h4>
            </div>
          </div>
        </div>
      </header>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => requestSort('date')} style={{ cursor: 'pointer' }}>Fecha {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => requestSort('name')} style={{ cursor: 'pointer' }}>Persona {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => requestSort('reason')} style={{ cursor: 'pointer' }}>Concepto {sortConfig.key === 'reason' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => requestSort('type')} style={{ cursor: 'pointer' }}>Tipo {sortConfig.key === 'type' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => requestSort('amount')} style={{ cursor: 'pointer' }}>Monto {sortConfig.key === 'amount' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>No hay egresos en este periodo</td></tr>
            ) : filteredExpenses.map((e) => {
              const expDateStr = new Date(e.date).toISOString().split('T')[0];
              const isClosed = closedDates.includes(expDateStr);
              return (
                <tr key={e._id}>
                  <td>{new Date(e.date).toLocaleDateString('es-CL', { timeZone: 'UTC' })}</td>
                  <td>{e.name}</td>
                  <td>{e.reason}</td>
                  <td><span className={`badge-role ${e.type === 'Vale Personal' ? 'user' : e.type === 'Gasto Clinica' ? 'superadmin' : 'admin'}`}>{e.type || 'Otro'}</span></td>
                  <td style={{ color: 'var(--danger)', fontWeight: 600 }}>-${e.amount.toLocaleString('es-CL')}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => handleEdit(e)}
                      className="btn-action-edit"
                      style={{ marginRight: isAdmin ? '1rem' : 0, cursor: isClosed ? 'not-allowed' : 'pointer', opacity: isClosed ? 0.5 : 1 }}
                      title={isClosed ? 'Este día ya tiene un cierre de caja' : 'Editar Egreso'}
                      disabled={isClosed}
                    >
                      <Edit size={16} />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(e._id)}
                        className="btn-action-delete"
                        style={{ cursor: isClosed ? 'not-allowed' : 'pointer', opacity: isClosed ? 0.5 : 1 }}
                        title={isClosed ? 'Este día ya tiene un cierre de caja' : 'Eliminar Egreso'}
                        disabled={isClosed}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Portal>
          <div className="modal-overlay">
            <div className="card" style={{ width: '450px' }}>
              <h2>Registrar Egreso</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <input type="date" className="form-control" value={formData.date} max={todayStr} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo de Egreso</label>
                  <select className="form-control" value={formData.type || 'Otro'} onChange={e => setFormData({ ...formData, type: e.target.value })} required>
                    <option value="Vale Personal">Vale Personal</option>
                    <option value="Gasto Clinica">Gasto Clinica</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Persona que retira</label>
                  <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Motivo o Concepto</label>
                  <textarea className="form-control" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} required rows="3"></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label">Monto de Efectivo</label>
                  <input type="number" className="form-control" value={formData.amount} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} required />
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ border: '1px solid var(--border)' }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--danger)' }}>Confirmar Egreso</button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
