"use client";
import { useState, useEffect } from 'react';
import { Truck, Calendar, DollarSign, Search, FileText } from 'lucide-react';

export default function PagoProveedoresPage() {
  const getFirstAndLastDay = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA');
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString('en-CA');
    return { firstDay, lastDay };
  };

  const { firstDay, lastDay } = getFirstAndLastDay();
  const [filters, setFilters] = useState({
    startDate: firstDay,
    endDate: lastDay,
    providerId: 'all'
  });

  const [providersList, setProvidersList] = useState([]);
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch Providers List purely for the dropdown
  useEffect(() => {
    fetch('/api/providers')
      .then(res => {
        if (!res.ok) throw new Error('API failed');
        return res.json();
      })
      .then(data => setProvidersList(data || []))
      .catch(console.error);
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const res = await fetch(`/api/finanzas/proveedores?${params.toString()}`);
      const data = await res.json();
      setReport(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const totalGlobal = report.reduce((acc, prov) => acc + prov.totalOwed, 0);

  return (
    <div className="finanzas-page">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Reporte de Pago a Proveedores</h1>
          <p style={{ color: 'var(--text-light)' }}>
            Total adeudado por concepto de Insumos/Laboratorios asociados a Ventas Clínicas
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <FileText size={20} /> Imprimir
          </button>
        </div>
      </header>

      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', backgroundColor: '#f8fafc' }}>
        <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
          <label className="form-label">Desde</label>
          <input type="date" className="form-control" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
          <label className="form-label">Hasta</label>
          <input type="date" className="form-control" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
        </div>
        <div className="form-group" style={{ flex: 2, minWidth: '250px', marginBottom: 0 }}>
          <label className="form-label">Buscar Proveedor</label>
          <select className="form-control" value={filters.providerId} onChange={e => setFilters({ ...filters, providerId: e.target.value })}>
            <option value="all">Todos los Proveedores</option>
            {providersList.map(prov => (
              <option key={prov._id} value={prov._id}>{prov.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={fetchReport} style={{ height: '42px', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ marginRight: '0.5rem' }} /> Generar
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--danger)', backgroundColor: '#fff5f5' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#dc2626' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 600 }}>MONTO TOTAL ADEUDADO AL PERIODO</span>
              <h2 style={{ margin: '0.25rem 0 0 0', fontSize: '2rem', color: '#dc2626' }}>
                ${totalGlobal.toLocaleString('es-CL')}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Generando reporte...</div>
      ) : report.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
          No se encontraron deudas para los parámetros de búsqueda indicados
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {report.map((provData) => (
            <div key={provData.providerId} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                  <Truck size={24} /> {provData.providerName.toUpperCase()}
                </h2>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>A PAGAR AL PROVEEDOR</span>
                  <h3 style={{ margin: 0, color: 'var(--danger)', fontSize: '1.5rem' }}>${provData.totalOwed.toLocaleString('es-CL')}</h3>
                </div>
              </div>

              <div className="table-container" style={{ margin: 0, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                <table>
                  <thead style={{ backgroundColor: '#f8fafc' }}>
                    <tr>
                      <th>Fecha Venta</th>
                      <th>Paciente</th>
                      <th>Tratamiento Asoc.</th>
                      <th>Insumo/Trabajo Cobrado</th>
                      <th>Cant.</th>
                      <th>Precio Unit.</th>
                      <th style={{ textAlign: 'right' }}>Adeudado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {provData.details.map((detail, idx) => (
                      <tr key={idx} style={{ fontSize: '0.9rem' }}>
                        <td>{new Date(detail.date).toLocaleDateString('es-CL', { timeZone: 'UTC' })}</td>
                        <td>{detail.patientName}</td>
                        <td>{detail.procedureName}</td>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{detail.supplyName}</td>
                        <td>{detail.quantity}</td>
                        <td>${detail.unitPrice.toLocaleString('es-CL')}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>
                          ${detail.totalCost.toLocaleString('es-CL')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
