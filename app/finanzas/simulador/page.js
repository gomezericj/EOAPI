"use client";
import React, { useState, useEffect } from 'react';
import { 
  Calculator, AlertTriangle, CheckCircle, Search, UserCircle, Download, DollarSign, Stethoscope, Percent, ArrowUpDown
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';

export default function RentabilidadSimuladorPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
  
  const [procedimientos, setProcedimientos] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for the Simulation
  const [selectedDocId, setSelectedDocId] = useState('');
  const [manualCommission, setManualCommission] = useState(0); // If no doctor selected
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'neta', direction: 'desc' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resProcs, resDocs] = await Promise.all([
          fetch('/api/procedimientos'),
          fetch('/api/doctors')
        ]);
        const procs = await resProcs.json();
        const docs = await resDocs.json();
        
        setProcedimientos(procs.filter(p => p.isActive !== false));
        setDoctors(docs.filter(d => d.isActive !== false));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (isAdmin) fetchData();
  }, [isAdmin]);

  if (!isAdmin) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>No autorizado.</div>;
  }

  // Calculate the active commission to apply
  const activeDoctor = doctors.find(d => d._id === selectedDocId);
  const activeCommissionPct = activeDoctor ? (activeDoctor.commissionPercentage || 0) : manualCommission;

  // Process data for the table
  let tableData = procedimientos.map(p => {
    const price = p.price || 0;
    
    // Cost calculation
    const costs = p.costs || {};
    const insumosTotal = (costs.suppliesAndEquipment || []).reduce((acc, s) => acc + (s.price * (s.quantity || 1)), 0);
    const adminPct = costs.adminPercentage || 0;
    const facilityPct = costs.facilityPercentage || 0;
    const adminTotal = price * (adminPct / 100);
    const facilityTotal = price * (facilityPct / 100);
    
    const costosFijos = insumosTotal + adminTotal + facilityTotal;
    const isNegativePrice = costosFijos > price; 
    
    // Profit before doctor commission (Margen de Maniobra)
    const margenBruto = price - costosFijos;
    const margenPct = price > 0 ? (margenBruto / price) * 100 : 0;
    
    const comisionAmount = price * (activeCommissionPct / 100);
    
    // Final profit to the clinic
    const neta = margenBruto - comisionAmount;
    const netaPct = price > 0 ? (neta / price) * 100 : 0;
    
    // Max allowable commission
    const maxComisionPct = price > 0 ? (margenBruto / price) * 100 : 0;

    return {
      _id: p._id,
      name: p.name,
      price,
      insumosTotal,
      adminTotal,
      facilityTotal,
      adminPct,
      facilityPct,
      costosFijos,
      margenBruto,
      margenPct,
      comisionAmount,
      neta,
      netaPct,
      maxComisionPct,
      isLosingMoney: neta < 0
    };
  });

  // Filter
  if (searchTerm) {
    tableData = tableData.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }

  // Sorting
  tableData.sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const exportToExcel = () => {
    const exportData = tableData.map(t => ({
      'Procedimiento': t.name,
      'Precio ($)': t.price,
      'Insumos ($)': t.insumosTotal,
      [`Costo Admin (${t.adminPct}%) ($)`]: t.adminTotal,
      [`Costo Instal. (${t.facilityPct}%) ($)`]: t.facilityTotal,
      'Margen Fijo Disponible ($)': t.margenBruto,
      'Margen Fijo Disponible (%)': t.margenPct.toFixed(1) + '%',
      [`Comisión Simulada (${activeCommissionPct}%) ($)`]: t.comisionAmount,
      'Ganancia Clínica Neta ($)': t.neta,
      'Ganancia Clínica Neta (%)': t.netaPct.toFixed(1) + '%',
      'Estado': t.isLosingMoney ? 'PÉRDIDA' : 'RENTABLE',
      'Límite Máximo de Comisión (Para no perder) (%)': t.maxComisionPct.toFixed(1) + '%'
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Simulador");
    XLSX.writeFile(workbook, `Simulador_Rentabilidad.xlsx`);
  };

  const formatCurrency = (val) => `$${Math.round(val || 0).toLocaleString('es-CL')}`;

  return (
    <div className="simulador-page" style={{ paddingBottom: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calculator color="var(--primary)" /> Simulador de Rentabilidad Real
        </h1>
        <p style={{ color: 'var(--text-light)' }}>
          Analiza cuáles de tus procedimientos te dan pérdida y descubre el máximo porcentaje negociable.
        </p>
      </header>

      {/* Simulator Control Panel */}
      <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--primary)' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserCircle size={20} /> Entorno de Simulación
        </h3>
        
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: '250px', marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>1. Seleccionar Doctor Contratado</label>
            <select 
              className="form-control" 
              value={selectedDocId} 
              onChange={e => setSelectedDocId(e.target.value)}
              style={{ margin: 0, backgroundColor: '#f8fafc', fontWeight: 600 }}
            >
              <option value="">-- Simulador Libre (Manual) --</option>
              {doctors.map(d => (
                <option key={d._id} value={d._id}>{d.name} {d.surname} ({d.commissionPercentage}%)</option>
              ))}
            </select>
          </div>
          
          <div className="form-group" style={{ minWidth: '150px', marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>2. Comisión a Aplicar (%)</label>
            <input 
              type="number" 
              className="form-control" 
              value={activeCommissionPct}
              onChange={e => {
                setSelectedDocId(''); // Switch to manual
                setManualCommission(Number(e.target.value));
              }}
              style={{ margin: 0, fontWeight: 'bold', color: 'var(--primary)', textAlign: 'center' }}
              min="0" max="100"
              disabled={selectedDocId !== ''}
            />
          </div>
        </div>
        {!selectedDocId && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
            Usando porcentaje manual para toda la clínica. Selecciona un doctor para usar su tarifa automática.
          </p>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>Cargando matriz matemática...</div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} size={16} />
              <input
                type="text"
                placeholder="Buscar procedimiento..."
                className="form-control"
                style={{ paddingLeft: '2.5rem', margin: 0 }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn btn-excel" onClick={exportToExcel}>
              <Download size={18} /> Excel
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container" style={{ margin: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '1rem 0.75rem', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('name')}>
                      Procedimiento <ArrowUpDown size={12}/>
                    </th>
                    <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('price')}>Precio <ArrowUpDown size={12}/></th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#64748b', minWidth: '180px' }}>Desglose de Costos Fijos</th>
                    <th style={{ textAlign: 'center', backgroundColor: '#eff6ff', color: '#1e3a8a', cursor: 'pointer' }} onClick={() => handleSort('margenBruto')}>
                      Margen Disp <ArrowUpDown size={12}/>
                    </th>
                    <th style={{ textAlign: 'right', borderLeft: '1px dashed #cbd5e1' }}>Comisión Doc (-{activeCommissionPct}%)</th>
                    <th style={{ textAlign: 'right', fontWeight: 800, cursor: 'pointer', minWidth: '110px' }} onClick={() => handleSort('neta')}>
                      Ganancia Clínica <ArrowUpDown size={12}/>
                    </th>
                    <th style={{ textAlign: 'center', backgroundColor: '#f1f5f9', cursor: 'pointer', minWidth: '120px' }} onClick={() => handleSort('maxComisionPct')}>
                      Tope / Límite Máx <ArrowUpDown size={12}/>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No hay resultados</td></tr>
                  ) : (
                    tableData.map((t) => (
                      <tr key={t._id} style={{ backgroundColor: t.isLosingMoney ? '#fef2f2' : 'transparent', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ fontWeight: 600, borderLeft: t.isLosingMoney ? '4px solid #ef4444' : '4px solid transparent' }}>
                          <span style={{ display: 'block', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(t.price)}</td>
                        <td style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.8rem', lineHeight: '1.5' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Insumos:</span> <strong style={{color:'#64748b'}}>{formatCurrency(t.insumosTotal)}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Admin ({t.adminPct}%):</span> <strong style={{color:'#64748b'}}>{formatCurrency(t.adminTotal)}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Instal ({t.facilityPct}%):</span> <strong style={{color:'#64748b'}}>{formatCurrency(t.facilityTotal)}</strong></div>
                        </td>
                        <td style={{ textAlign: 'center', backgroundColor: '#eff6ff', color: '#1e3a8a' }}>
                          <div style={{ fontWeight: 600 }}>{formatCurrency(t.margenBruto)}</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>({t.margenPct.toFixed(1)}%)</div>
                        </td>
                        <td style={{ textAlign: 'right', color: '#f59e0b', borderLeft: '1px dashed #cbd5e1', fontWeight: 600 }}>
                          -{formatCurrency(t.comisionAmount)}
                        </td>
                        <td style={{ textAlign: 'right', color: t.isLosingMoney ? '#ef4444' : '#10b981' }}>
                          <div style={{ fontWeight: 800 }}>{formatCurrency(t.neta)}</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>({t.netaPct.toFixed(1)}%)</div>
                        </td>
                        <td style={{ textAlign: 'center', backgroundColor: '#f1f5f9', padding: '0.5rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', color: t.isLosingMoney ? '#ef4444' : '#64748b', fontWeight: t.isLosingMoney ? 700 : 500 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '1rem' }}>
                              {t.isLosingMoney ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                              {t.maxComisionPct <= 0 ? '0' : t.maxComisionPct.toFixed(1)}%
                            </div>
                            <span style={{ fontSize: '0.65rem', lineHeight: '1.1', textAlign: 'center', maxWidth: '110px', opacity: 0.8 }}>
                              Comisión máx. recomendada para no dar pérdida
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
