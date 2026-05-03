"use client";
import { useState, useEffect } from 'react';
import { ClipboardList, User, Calendar, Tag, Info, Search, Filter } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';

export default function LogsPage() {
    const { showAlert } = useNotification();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('ALL');

    const fetchLogs = async () => {
        try {
            const res = await fetch('/api/logs');
            if (!res.ok) throw new Error('Failed to fetch logs');
            const data = await res.json();
            setLogs(data);
        } catch (err) {
            console.error('Error fetching logs:', err);
            showAlert('No se pudieron cargar los logs de actividad');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.entity?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesAction = filterAction === 'ALL' || log.action === filterAction;

        return matchesSearch && matchesAction;
    });

    const getActionColor = (action) => {
        switch (action) {
            case 'CREATE': return { bg: '#dcfce7', text: '#166534' };
            case 'DELETE': return { bg: '#fee2e2', text: '#991b1b' };
            case 'UPDATE': return { bg: '#fef9c3', text: '#854d0e' };
            default: return { bg: '#f3f4f6', text: '#374151' };
        }
    };

    return (
        <div className="logs-page">
            <header style={{ marginBottom: '2rem' }}>
                <h1>Logs de Actividad</h1>
                <p style={{ color: 'var(--text-light)' }}>Registro detallado de acciones realizadas por los usuarios</p>
            </header>

            <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '250px', marginBottom: 0 }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Buscar por usuario, detalle o entidad..."
                                style={{ paddingLeft: '35px' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group" style={{ width: '200px', marginBottom: 0 }}>
                        <div style={{ position: 'relative' }}>
                            <Filter size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                            <select
                                className="form-control"
                                style={{ paddingLeft: '35px' }}
                                value={filterAction}
                                onChange={(e) => setFilterAction(e.target.value)}
                            >
                                <option value="ALL">Todas las acciones</option>
                                <option value="CREATE">Creaciones</option>
                                <option value="DELETE">Eliminaciones</option>
                                <option value="UPDATE">Actualizaciones</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha y Hora</th>
                                <th>Usuario</th>
                                <th>Acción</th>
                                <th>Entidad</th>
                                <th>Detalles</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Cargando registros...</td></tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No se encontraron registros de actividad</td></tr>
                            ) : filteredLogs.map((log) => {
                                const colors = getActionColor(log.action);
                                return (
                                    <tr key={log._id}>
                                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Calendar size={14} style={{ color: 'var(--text-light)' }} />
                                                {new Date(log.timestamp).toLocaleString('es-CL')}
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <User size={16} style={{ color: 'var(--secondary)' }} />
                                                {log.userName}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                backgroundColor: colors.bg,
                                                color: colors.text,
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                display: 'inline-block',
                                                minWidth: '70px',
                                                textAlign: 'center'
                                            }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                                                <Tag size={14} style={{ color: 'var(--text-light)' }} />
                                                {log.entity}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                                <Info size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                                {log.details}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
