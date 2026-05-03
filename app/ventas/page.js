"use client";
import { useState, useEffect } from 'react';
import { Plus, Search, Calendar, DollarSign, User, Calculator, Trash2, Edit, Download, X, CheckCircle } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import Portal from '@/components/Portal';

export default function SalesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
  const isSuperAdmin = session?.user?.role === 'superadmin';
  const isUser = session?.user?.role === 'user';
  const { showAlert, showConfirm, showSuccess, showLoading } = useNotification();
  const [sales, setSales] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [closedDates, setClosedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [abonoPatientId, setAbonoPatientId] = useState('');
  const [patientPendingSales, setPatientPendingSales] = useState([]);
  const now = new Date();
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [abonoForm, setAbonoForm] = useState({ saleId: '', amount: 0, method: 'efectivo', date: localToday });
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const todayStr = localToday;

  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseForm, setReleaseForm] = useState({ saleId: '', amount: 0, date: localToday, clinicTotal: 0, releasedTotal: 0, doctorName: '', procedureName: '', percentage: 100 });

  const [formData, setFormData] = useState({
    date: localToday,
    procedureId: '',
    procedureName: '',
    unitPrice: 0,
    quantity: 1,
    doctorId: '',
    doctorName: '',
    patientId: '',
    patientName: '',
    discountId: '',
    discountName: '',
    discountQuantity: 0,
    discountPrice: 0,
    isTreatmentInProgress: false,
    payments: [], // Array of { method, amount }
    proceduresList: []
  });

  const [currentPayment, setCurrentPayment] = useState({ method: 'efectivo', amount: 0 });

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
    doctorId: '',
    patientId: ''
  });

  const fetchData = async () => {
    try {
      showLoading(true);
      let url = '/api/ventas';
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.doctorId) params.append('doctorId', filters.doctorId);
      if (filters.patientId) params.append('patientId', filters.patientId);
      if (params.toString()) url += `?${params.toString()}`;

      const [sRes, pRes, dRes, prRes, supRes, cRes] = await Promise.all([
        fetch(url), fetch('/api/patients'), fetch('/api/doctors'), fetch('/api/procedimientos'), fetch('/api/insumos'), fetch('/api/cierres')
      ]);
      const [salesData, patientsData, doctorsData, proceduresData, suppliesData, closedData] = await Promise.all([
        sRes.json(), pRes.json(), dRes.json(), prRes.json(), supRes.json(), cRes.json()
      ]);
      setSales(salesData);
      setPatients(patientsData);
      setDoctors(doctorsData);
      setProcedures(proceduresData);
      setSupplies(suppliesData);
      setClosedDates(Array.isArray(closedData) ? closedData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showAlert('Error al cargar datos');
    } finally {
      setLoading(false);
      showLoading(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const baseProcs = (formData.proceduresList || []);
  const activeProcHasData = (formData._id || (!formData._id && formData.procedureId));
  
  const cartProcs = baseProcs.length > 0 ? baseProcs : (activeProcHasData ? [formData] : []);

  const totalToCollect = cartProcs.reduce((acc, p) => acc + ((p.unitPrice || 0) * (p.quantity || 1)), 0);
  const discountTotal = cartProcs.reduce((acc, p) => acc + ((p.discountQuantity || 0) * (p.discountPrice || 0)), 0);
  const clinicTotal = totalToCollect - discountTotal;

  const totalPaid = cartProcs.reduce((acc, p) => acc + (p.payments || []).reduce((payAcc, pay) => payAcc + Number(pay.amount), 0), 0);
  const pending = totalToCollect - totalPaid;

  const draftProc = (baseProcs.length > 0 && activeProcHasData && !formData._id) ? formData : null;
  const draftTotalToCollect = draftProc ? ((draftProc.unitPrice || 0) * (draftProc.quantity || 1)) : 0;
  const draftDiscountTotal = draftProc ? ((draftProc.discountQuantity || 0) * (draftProc.discountPrice || 0)) : 0;
  const draftClinicTotal = draftTotalToCollect - draftDiscountTotal;
  
  const draftTotalPaid = draftProc ? (draftProc.payments || []).reduce((acc, p) => acc + Number(p.amount), 0) : 0;
  const draftPending = draftTotalToCollect - draftTotalPaid;

  const appendProcedure = () => {
     if (!formData.procedureId || !formData.doctorId) {
         showAlert('Debe seleccionar Procedimiento y Doctor antes de añadir a la lista');
         return;
     }

     const procSubtotal = (formData.unitPrice || 0) * (formData.quantity || 1);
     const procDiscount = (formData.discountQuantity || 0) * (formData.discountPrice || 0);
     
     if (procDiscount > procSubtotal) {
         showAlert('El descuento (costo interno) no puede ser mayor al precio total del procedimiento.');
         return;
     }

     let procPayments = [...(formData.payments || [])];
     if (currentPayment.amount > 0) {
         procPayments.push({ ...currentPayment, date: formData.date });
     }

     if (procPayments.length === 0) {
         procPayments.push({ method: 'efectivo', amount: 0, date: formData.date });
     }

     const procPaid = procPayments.reduce((acc, p) => acc + Number(p.amount), 0);
     if (procPaid > procSubtotal) {
         showAlert('La suma de los pagos no puede superar el precio total del procedimiento (saldo negativo).');
         return;
     }

     // If passed validation, clear the active payment input
     if (currentPayment.amount > 0) {
         setCurrentPayment({ method: 'efectivo', amount: 0 });
     }

     setFormData({
         ...formData,
         proceduresList: [...(formData.proceduresList || []), {
           procedureId: formData.procedureId,
           procedureName: formData.procedureName,
           unitPrice: formData.unitPrice,
           quantity: formData.quantity,
           doctorId: formData.doctorId,
           doctorName: formData.doctorName,
           discountId: formData.discountId,
           discountName: formData.discountName,
           discountQuantity: formData.discountQuantity,
           discountPrice: formData.discountPrice,
           isTreatmentInProgress: formData.isTreatmentInProgress,
           payments: procPayments
         }],
         procedureId: '', procedureName: '', unitPrice: 0, quantity: 1,
         doctorId: '', doctorName: '',
         discountId: '', discountName: '', discountQuantity: 0, discountPrice: 0,
         isTreatmentInProgress: false,
         payments: []
     });
  };

  const removeProcedure = (idx) => {
     const newList = [...(formData.proceduresList || [])];
     newList.splice(idx, 1);
     setFormData({ ...formData, proceduresList: newList });
  };

  const addPayment = () => {
    if (currentPayment.amount <= 0) return;
    
    const procSubtotal = (formData.unitPrice || 0) * (formData.quantity || 1);
    const existingPaid = (formData.payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
    if (existingPaid + Number(currentPayment.amount) > procSubtotal) {
        showAlert('La suma de los pagos no puede superar el precio total del procedimiento (evitar saldo negativo).');
        return;
    }

    setFormData({ ...formData, payments: [...formData.payments, currentPayment] });
    setCurrentPayment({ method: 'efectivo', amount: 0 });
  };

  const removePayment = (index) => {
    setFormData({ ...formData, payments: formData.payments.filter((_, i) => i !== index) });
  };

  const handleProcedureChange = (e) => {
    const id = e.target.value;
    const selected = procedures.find(p => p._id === id);
    if (selected) {
      setFormData({
        ...formData,
        procedureId: id,
        procedureName: selected.name,
        unitPrice: selected.price
      });
    } else {
      setFormData({
        ...formData,
        procedureId: '',
        procedureName: '',
        unitPrice: 0
      });
    }
  };

  const handleDiscountChange = (e) => {
    const id = e.target.value;
    const selected = supplies.find(s => s._id === id);
    if (selected) {
      setFormData({
        ...formData,
        discountId: id,
        discountName: selected.name,
        discountPrice: selected.unitPrice,
        discountQuantity: 1
      });
    } else {
      setFormData({
        ...formData,
        discountId: '',
        discountName: '',
        discountPrice: 0,
        discountQuantity: 0
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isUser && !formData._id && formData.date !== todayStr) {
      showAlert('Los usuarios solo pueden registrar nuevas ventas en la fecha actual.');
      return;
    }
    if (formData.date > todayStr && !isSuperAdmin) {
      showAlert('No tiene permisos para registrar ventas en fechas futuras.');
      return;
    }
    if (closedDates.includes(formData.date)) {
      showAlert('La fecha seleccionada tiene un cierre de caja realizado y está bloqueada.');
      return;
    }

    showLoading(true);

    if (formData._id) {
        if (!formData.payments || formData.payments.length === 0) {
            showAlert('Debe agregar al menos un pago');
            showLoading(false);
            return;
        }
        const res = await fetch(`/api/ventas/${formData._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        showLoading(false);
        if (res.ok) {
            setShowModal(false);
            resetForm();
            await fetchData();
            showSuccess('Venta actualizada con éxito');
        } else {
            const err = await res.json();
            showAlert(err.error || 'Error al actualizar');
        }
    } else {
        let procsToSave = [...(formData.proceduresList || [])];
        if (procsToSave.length === 0) {
             let procPayments = [...(formData.payments || [])];
             if (currentPayment.amount > 0) {
                 procPayments.push({ ...currentPayment, date: formData.date });
             }
             if (procPayments.length === 0) {
                 procPayments.push({ method: 'efectivo', amount: 0, date: formData.date });
             }

             if (!formData.procedureId || !formData.doctorId) {
                  showAlert('Debe seleccionar Procedimiento y Doctor, o añadirlos a la lista.');
                  showLoading(false);
                  return;
             }

             const procSubtotal = (formData.unitPrice || 0) * (formData.quantity || 1);
             const procDiscount = (formData.discountQuantity || 0) * (formData.discountPrice || 0);
             if (procDiscount > procSubtotal) {
                  showAlert('El descuento (costo interno) no puede ser mayor al precio total del procedimiento.');
                  showLoading(false);
                  return;
             }
             const procPaid = procPayments.reduce((acc, p) => acc + Number(p.amount), 0);
             if (procPaid > procSubtotal) {
                  showAlert('La suma de los pagos no puede superar el precio total del procedimiento (saldo negativo).');
                  showLoading(false);
                  return;
             }
             procsToSave.push({
                procedureId: formData.procedureId,
                procedureName: formData.procedureName,
                unitPrice: formData.unitPrice,
                quantity: formData.quantity,
                doctorId: formData.doctorId,
                doctorName: formData.doctorName,
                discountId: formData.discountId,
                discountName: formData.discountName,
                discountQuantity: formData.discountQuantity,
                discountPrice: formData.discountPrice,
                isTreatmentInProgress: formData.isTreatmentInProgress,
                payments: procPayments
             });
        }

        for (let proc of procsToSave) {
            if (!proc.payments || proc.payments.length === 0) {
                showAlert(`El procedimiento ${proc.procedureName || 'en edición'} no tiene ningún pago registrado.`);
                showLoading(false);
                return;
            }
        }

        const salesToCreate = procsToSave.map(proc => {
            return {
                ...proc,
                date: formData.date,
                patientId: formData.patientId,
                patientName: formData.patientName,
                payments: (proc.payments || []).map(p => ({ ...p, amount: Number(p.amount) }))
            };
        });

        for (let saleData of salesToCreate) {
            const res = await fetch('/api/ventas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saleData)
            });
            if (!res.ok) {
                const err = await res.json();
                showAlert(err.error || 'Error al guardar venta');
                showLoading(false);
                return;
            }
        }
        showLoading(false);
        setShowModal(false);
        resetForm();
        await fetchData();
        showSuccess('Venta(s) registrada(s) con éxito');
    }
  };

  const resetForm = () => {
    setFormData({
      date: localToday,
      procedureId: '',
      procedureName: '',
      unitPrice: 0,
      quantity: 1,
      doctorId: '',
      doctorName: '',
      patientId: '',
      patientName: '',
      discountId: '',
      discountName: '',
      discountQuantity: 0,
      discountPrice: 0,
      isTreatmentInProgress: false,
      payments: [],
      proceduresList: []
    });
    setCurrentPayment({ method: 'efectivo', amount: 0 });
  };

  const handleEdit = (s) => {
    setFormData({
      ...s,
      date: new Date(s.date).toISOString().split('T')[0],
      patientId: s.patientId?._id || s.patientId,
      patientName: s.patientName || (s.patientId ? `${s.patientId.name} ${s.patientId.surname}` : ''),
      discountId: s.discountId?._id || s.discountId,
      doctorId: s.doctorId?._id || s.doctorId,
      doctorName: s.doctorName || (s.doctorId ? `${s.doctorId.name} ${s.doctorId.surname}` : ''),
      procedureId: s.procedureId?._id || s.procedureId,
      unitPrice: s.unitPrice ?? 0,
      quantity: s.quantity ?? 1,
      discountQuantity: s.discountQuantity ?? 0,
      discountPrice: s.discountPrice ?? 0,
      isTreatmentInProgress: s.isTreatmentInProgress || false
    });
    setShowModal(true);
  };

  const handleReleaseCommission = (s) => {
    const cTotal = (s.totalToCollect || 0) - (s.discountTotal || 0);
    const rTotal = s.commissionReleasedTotal || 0;
    const pending = cTotal - rTotal;
    
    setReleaseForm({
      saleId: s._id,
      amount: pending,
      date: localToday,
      clinicTotal: cTotal,
      releasedTotal: rTotal,
      doctorName: s.doctorName || (s.doctorId ? `${s.doctorId.name} ${s.doctorId.surname}` : ''),
      procedureName: s.procedureName,
      percentage: 100
    });
    setShowReleaseModal(true);
  };

  const handleReleaseSubmit = async (e) => {
    e.preventDefault();
    if (releaseForm.amount <= 0) {
      showAlert('El monto a liberar debe ser mayor a 0');
      return;
    }
    const maxRelease = releaseForm.clinicTotal - releaseForm.releasedTotal;
    if (releaseForm.amount > maxRelease) {
      showAlert(`El monto no puede superar el saldo pendiente ($${maxRelease})`);
      return;
    }
    if (isUser && releaseForm.date !== todayStr) {
      showAlert('Los usuarios solo pueden registrar liberaciones en la fecha actual.');
      return;
    }
    if (closedDates.includes(releaseForm.date)) {
      showAlert('La fecha seleccionada tiene un cierre de caja realizado y está bloqueada.');
      return;
    }

    showLoading(true);
    try {
      const res = await fetch(`/api/ventas/${releaseForm.saleId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(releaseForm.amount), date: releaseForm.date })
      });
      if (res.ok) {
        setShowReleaseModal(false);
        await fetchData();
        showSuccess('Comisión liberada para el especialista');
      } else {
        const err = await res.json();
        showAlert(err.error || 'Error al liberar');
      }
    } catch (err) {
      showAlert('Error de conexión');
    } finally {
      showLoading(false);
    }
  };

  const handleDelete = async (id) => {
    showConfirm('¿Está seguro de eliminar esta venta?', async () => {
      showLoading(true);
      try {
        const res = await fetch(`/api/ventas/${id}`, { method: 'DELETE' });
        if (res.ok) {
          await fetchData();
          showSuccess('Venta eliminada');
        } else {
          const err = await res.json();
          showAlert(err.error || 'Error al eliminar');
        }
      } catch (err) {
        showAlert('Error de conexión');
      } finally {
        showLoading(false);
      }
    });
  };

  useEffect(() => {
    if (abonoPatientId) {
      fetch(`/api/ventas?patientId=${abonoPatientId}`)
        .then(res => res.json())
        .then(data => {
          setPatientPendingSales(data.filter(s => Number(s.pendingAmount) > 0));
        });
    } else {
      setPatientPendingSales([]);
      setAbonoForm(prev => ({ ...prev, saleId: '' }));
    }
  }, [abonoPatientId]);

  const handleAbonoSubmit = async (e) => {
    e.preventDefault();
    if (isUser && abonoForm.date !== todayStr) {
      showAlert('Los usuarios solo pueden registrar abonos en la fecha actual.');
      return;
    }
    if (abonoForm.date > todayStr && !isSuperAdmin) {
      showAlert('No tiene permisos para registrar abonos en fechas futuras.');
      return;
    }
    if (closedDates.includes(abonoForm.date)) {
      showAlert('La fecha seleccionada tiene un cierre de caja realizado y está bloqueada.');
      return;
    }
    if (!abonoForm.saleId) {
      showAlert('Seleccione una venta para abonar');
      return;
    }
    if (abonoForm.amount <= 0) {
      showAlert('El monto debe ser mayor a 0');
      return;
    }

    showLoading(true);
    try {
      const res = await fetch(`/api/ventas/${abonoForm.saleId}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: abonoForm.amount,
          method: abonoForm.method,
          date: abonoForm.date
        })
      });

      if (res.ok) {
        setShowAbonoModal(false);
        setAbonoPatientId('');
        setAbonoForm({ saleId: '', amount: 0, method: 'efectivo', date: localToday });
        await fetchData();
        showSuccess('Abono registrado con éxito');
      } else {
        const err = await res.json();
        showAlert(err.error || 'Error al registrar abono');
      }
    } catch (err) {
      showAlert('Error de conexión');
    } finally {
      showLoading(false);
    }
  };

  const filteredSales = (Array.isArray(sales) ? sales : []).filter(s => {
    const searchLower = searchTerm.toLowerCase();

    if (!searchLower) return true;

    return (
      (s.patientId?.name?.toLowerCase().includes(searchLower)) ||
      (s.patientId?.surname?.toLowerCase().includes(searchLower)) ||
      (s.patientName?.toLowerCase().includes(searchLower)) ||
      (s.doctorId?.name?.toLowerCase().includes(searchLower)) ||
      (s.doctorId?.surname?.toLowerCase().includes(searchLower)) ||
      (s.doctorName?.toLowerCase().includes(searchLower)) ||
      (s.procedureName?.toLowerCase().includes(searchLower)) ||
      (s.discountName?.toLowerCase().includes(searchLower))
    );
  }).sort((a, b) => {
    let aVal, bVal;

    if (['patient', 'doctor'].includes(sortConfig.key)) {
      aVal = `${a[`${sortConfig.key}Id`]?.name || ''} ${a[`${sortConfig.key}Id`]?.surname || ''}`.toLowerCase();
      bVal = `${b[`${sortConfig.key}Id`]?.name || ''} ${b[`${sortConfig.key}Id`]?.surname || ''}`.toLowerCase();
    } else {
      aVal = a[sortConfig.key];
      bVal = b[sortConfig.key];
    }

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const exportToExcel = () => {
    const data = filteredSales.map(s => ({
      Fecha: new Date(s.date).toLocaleDateString('es-CL', { timeZone: 'UTC' }),
      Paciente: s.patientId ? (`${s.patientId.name} ${s.patientId.surname}${s.patientId.isActive === false ? ' (Deshabilitado)' : ''}`).trim() : `Paciente Eliminado (${s.patientName || 'Desconocido'})`,
      Procedimiento: s.procedureId ? `${s.procedureName}${s.procedureId.isActive === false ? ' (Deshabilitado)' : ''}` : `Tratamiento Eliminado (${s.procedureName || 'Desconocido'})`,
      Doctor: s.doctorId ? (`${s.doctorId.name} ${s.doctorId.surname}${s.doctorId.isActive === false ? ' (Deshabilitado)' : ''}`).trim() : `Doctor Eliminado (${s.doctorName || 'Desconocido'})`,
      Descuento: s.discountTotal > 0 ? (s.discountId ? `${s.discountName}${s.discountId.isActive === false ? ' (Deshabilitado)' : ''} (-$${s.discountTotal})` : `Descuento Eliminado (${s.discountName}) (-$${s.discountTotal})`) : 'Ninguno',
      Total_A_Cobrar: s.totalToCollect,
      Pagado: s.totalCharged,
      Pendiente: s.pendingAmount,
      Estado_Pago: s.status === 'pagada' ? 'PAGADA' : 'PENDIENTE',
      Liberada_el: s.commissionReleaseDate ? new Date(s.commissionReleaseDate).toLocaleDateString('es-CL', { timeZone: 'UTC' }) : (s.isTreatmentInProgress ? `EN CURSO (${(s.commissionReleasedTotal || 0)} de ${(s.totalToCollect || 0) - (s.discountTotal || 0)})` : 'NO')
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");
    XLSX.writeFile(workbook, `Reporte_Ventas_EsteticaOral2L_${filters.startDate}_a_${filters.endDate}.xlsx`);
  };

  return (
    <div className="ventas-page">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Control de Ventas</h1>
          <p style={{ color: 'var(--text-light)' }}>Registro de tratamientos y cobros</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-excel" onClick={exportToExcel}>
            <Download size={20} /> Excel
          </button>
          <button className="btn btn-secondary" onClick={() => setShowAbonoModal(true)}>
            <DollarSign size={20} /> Abonar a Deuda
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={20} />
            Nueva Venta
          </button>
        </div>
      </header>

      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
          <label className="form-label">Desde</label>
          <input type="date" className="form-control" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
          <label className="form-label">Hasta</label>          <input type="date" className="form-control" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
          <label className="form-label">Doctor</label>
          <select className="form-control" value={filters.doctorId} onChange={e => setFilters({ ...filters, doctorId: e.target.value })}>
            <option value="">Todos los doctores</option>
            {doctors.map(d => <option key={d._id} value={d._id}>{d.name} {d.surname}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: 2, minWidth: '300px', marginBottom: 0, position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '1rem', bottom: '12px', color: 'var(--text-light)' }} size={16} />
          <label className="form-label">Búsqueda rápida</label>
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Paciente, Doctor, Procedimiento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={fetchData} style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ marginRight: '0.5rem' }} /> Buscar
          </button>
          <button className="btn btn-secondary" onClick={() => {
            setFilters({ startDate: '', endDate: '', doctorId: '', patientId: '' });
            setSearchTerm('');
            // Optional: call fetchData here if we want 'Limpiar' to also refresh the table automatically
            setTimeout(() => fetchData(), 0);
          }}>Limpiar</button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => requestSort('date')} style={{ cursor: 'pointer' }}>Fecha {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => requestSort('patient')} style={{ cursor: 'pointer' }}>Paciente {sortConfig.key === 'patient' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => requestSort('procedureName')} style={{ cursor: 'pointer' }}>Procedimiento {sortConfig.key === 'procedureName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => requestSort('doctor')} style={{ cursor: 'pointer' }}>Doctor {sortConfig.key === 'doctor' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th>Descuento/Ajuste</th>
              <th onClick={() => requestSort('totalToCollect')} style={{ cursor: 'pointer' }}>Total a Cobrar {sortConfig.key === 'totalToCollect' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => requestSort('totalCharged')} style={{ cursor: 'pointer' }}>Pagado {sortConfig.key === 'totalCharged' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => requestSort('pendingAmount')} style={{ cursor: 'pointer' }}>Pendiente {sortConfig.key === 'pendingAmount' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => requestSort('status')} style={{ cursor: 'pointer' }}>Estado {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" style={{ textAlign: 'center' }}>Cargando...</td></tr>
            ) : filteredSales.length === 0 ? (
              <tr><td colSpan="10" style={{ textAlign: 'center' }}>No hay ventas que coincidan</td></tr>
            ) : filteredSales.map((s) => {
              const saleDateStr = new Date(s.date).toISOString().split('T')[0];
              const isClosed = closedDates.includes(saleDateStr);
              const isUser = session?.user?.role === 'user';
              const isDisabled =
                s.patientId === null || s.patientId?.isActive === false ||
                s.doctorId === null || s.doctorId?.isActive === false ||
                s.procedureId === null || s.procedureId?.isActive === false ||
                (s.discountId === null && s.discountTotal > 0) || s.discountId?.isActive === false;

              return (
                <tr key={s._id} style={{
                  backgroundColor: isClosed ? '#f8fafc' : 'white',
                  opacity: isClosed ? 0.8 : 1
                }}>
                  <td>{new Date(s.date).toLocaleDateString('es-CL', { timeZone: 'UTC' })}</td>
                  <td>
                    {(() => {
                      const isPatientDisabled = s.patientId?.isActive === false || (s.patientId === undefined && patients.find(p => `${p.name} ${p.surname}` === s.patientName)?.isActive === false);
                      if (s.patientId || s.patientId === undefined) {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: isPatientDisabled ? 0.6 : 1 }}>
                            {isPatientDisabled && <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase' }}>DESH.</span>}
                            {s.patientId ? `${s.patientId.name} ${s.patientId.surname}` : s.patientName}
                          </div>
                        );
                      }
                      return <span style={{ color: 'var(--danger)', opacity: 0.6 }}>Paciente Eliminado ({s.patientName || 'Desconocido'})</span>;
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const isProcDisabled = s.procedureId?.isActive === false || (s.procedureId === undefined && procedures.find(p => p.name === s.procedureName)?.isActive === false);
                      if (s.procedureId || s.procedureId === undefined) {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: isProcDisabled ? 0.6 : 1 }}>
                            {isProcDisabled && <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase' }}>DESH.</span>}
                            {s.procedureName}
                          </div>
                        );
                      }
                      return <span style={{ color: 'var(--danger)', opacity: 0.6 }}>Tratamiento Eliminado ({s.procedureName || 'Desconocido'})</span>;
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const isDoctorDisabled = s.doctorId?.isActive === false || (s.doctorId === undefined && doctors.find(d => `${d.name} ${d.surname}` === s.doctorName)?.isActive === false);
                      if (s.doctorId || s.doctorId === undefined) {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: isDoctorDisabled ? 0.6 : 1 }}>
                            {isDoctorDisabled && <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase' }}>DESH.</span>}
                            {s.doctorId ? `${s.doctorId.name} ${s.doctorId.surname}` : s.doctorName}
                          </div>
                        );
                      }
                      return <span style={{ color: 'var(--danger)', opacity: 0.6 }}>Doctor Eliminado ({s.doctorName || 'Desconocido'})</span>;
                    })()}
                  </td>
                  <td>
                    {s.discountTotal > 0 ? (() => {
                      const isDiscDisabled = s.discountId?.isActive === false || (s.discountId === undefined && supplies.find(sup => sup.name === s.discountName)?.isActive === false);
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            opacity: (isDiscDisabled || s.discountId === null) ? 0.6 : 1
                          }}>
                            {isDiscDisabled && <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase' }}>DESH.</span>}
                            {s.discountId === null ? (
                              <span style={{ color: 'var(--danger)' }}>Desc. Eliminado ({s.discountName})</span>
                            ) : (
                              <span style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{s.discountName}</span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>(-${s.discountTotal.toLocaleString('es-CL')})</span>
                        </div>
                      );
                    })() : (
                      <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>-</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>${s.totalToCollect?.toLocaleString('es-CL')}</td>
                  <td>
                    <div style={{ color: 'var(--success)', fontWeight: 600 }}>${s.totalCharged?.toLocaleString('es-CL')}</div>
                    {s.payments && s.payments.length > 0 && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-light)', borderTop: '1px solid #e2e8f0', paddingTop: '0.25rem', minWidth: '130px' }}>
                        {s.payments.map((p, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', gap: '0.5rem' }}>
                            <span title={p.method} style={{ textTransform: 'capitalize' }}>
                              {new Date(p.date).toLocaleDateString('es-CL', { timeZone: 'UTC' })} ({p.method?.substring(0, 3)})
                            </span>
                            <span style={{ color: 'var(--success)' }}>${Number(p.amount).toLocaleString('es-CL')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ color: s.pendingAmount > 0 ? 'var(--danger)' : 'var(--text)' }}>
                    ${s.pendingAmount?.toLocaleString('es-CL')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        backgroundColor: s.status === 'pagada' ? '#ecfdf5' : '#fff7ed',
                        color: s.status === 'pagada' ? '#065f46' : '#9a3412',
                        fontWeight: 600
                      }}>
                        {s.status === 'pagada' ? 'PAGADA' : 'PENDIENTE'}
                      </span>
                      {s.isTreatmentInProgress && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            fontWeight: 700,
                            border: '1px solid #dbeafe',
                            alignSelf: 'flex-start'
                          }}>
                            EN CURSO
                          </span>
                          <div style={{ width: '100%', minWidth: '100px', marginTop: '2px' }}>
                             <div style={{ fontSize: '0.65rem', color: 'var(--text-light)', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                               <span>Lib: ${(s.commissionReleasedTotal || 0).toLocaleString('es-CL')}</span>
                               <span>${((s.totalToCollect || 0) - (s.discountTotal || 0)).toLocaleString('es-CL')}</span>
                             </div>
                             <div style={{ height: '5px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                               <div style={{ 
                                  height: '100%', 
                                  width: `${Math.min(100, ((s.commissionReleasedTotal || 0) / (((s.totalToCollect || 0) - (s.discountTotal || 0)) || 1)) * 100)}%`, 
                                  backgroundColor: '#3b82f6' 
                               }} />
                             </div>
                          </div>
                        </div>
                      )}
                      {s.commissionReleaseDate && (
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          backgroundColor: '#fdf4ff',
                          color: '#c026d3',
                          fontWeight: 700,
                          border: '1px solid #fae8ff',
                          marginTop: '2px'
                        }} title="Comisión liberada para pago posterior">
                          Lib: {new Date(s.commissionReleaseDate).toLocaleDateString('es-CL', { timeZone: 'UTC' })}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      {s.isTreatmentInProgress && (
                        <button
                          onClick={() => handleReleaseCommission(s)}
                          style={{ color: 'var(--success)' }}
                          className="btn-action-success"
                          title="Liberar Comisión para Doctor"
                        >
                          <Calculator size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(s)}
                        className="btn-action-edit"
                        style={{ cursor: (isClosed && !isSuperAdmin) ? 'not-allowed' : 'pointer', opacity: (isClosed && !isSuperAdmin) ? 0.5 : 1 }}
                        title={isClosed ? 'Este día ya tiene un cierre de caja' : 'Editar Venta'}
                        disabled={isClosed && !isSuperAdmin}
                      >
                        <Edit size={18} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(s._id)}
                          className="btn-action-delete"
                          style={{ cursor: isClosed ? 'not-allowed' : 'pointer', opacity: isClosed ? 0.5 : 1 }}
                          title={isClosed ? 'Este día ya tiene un cierre de caja' : 'Eliminar Venta'}
                          disabled={isClosed}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '3rem', backgroundColor: '#f8fafc' }}>
        <div style={{ textAlign: 'right' }}>
          <small style={{ color: 'var(--text-light)', fontWeight: 600 }}>Total a Cobrar</small>
          <h3 style={{ margin: 0, color: 'var(--text)' }}>
            ${filteredSales.reduce((acc, sale) => acc + (sale.totalToCollect || 0), 0).toLocaleString('es-CL')}
          </h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <small style={{ color: 'var(--text-light)', fontWeight: 600 }}>Total Pagado</small>
          <h3 style={{ margin: 0, color: 'var(--success)' }}>
            ${filteredSales.reduce((acc, sale) => acc + (sale.totalCharged || 0), 0).toLocaleString('es-CL')}
          </h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <small style={{ color: 'var(--text-light)', fontWeight: 600 }}>Total Pendiente</small>
          <h3 style={{ margin: 0, color: 'var(--danger)' }}>
            ${filteredSales.reduce((acc, sale) => acc + (sale.pendingAmount || 0), 0).toLocaleString('es-CL')}
          </h3>
        </div>
      </div>

      {showModal && (
        <Portal>
          <div className="modal-overlay">
            <div className="card" style={{ width: '1300px', maxWidth: '98vw', maxHeight: '92vh', overflowY: 'auto', overflowX: 'hidden' }}>
              <div style={{ padding: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.4rem' }}>
                    <Plus size={24} color="var(--primary)" />
                    {formData._id ? 'Editar Venta' : 'Registrar Nueva Venta'}
                  </h2>
                  <button type="button" onClick={() => setShowModal(false)} style={{ color: 'var(--text-light)', padding: '0.4rem', borderRadius: '50%', backgroundColor: '#f1f5f9' }}>
                    <Trash2 size={18} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '1.5rem', alignItems: 'start' }}>
                  {/* Left Column: Form Builder */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* STEP 0: Date and Patient */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                          <Calendar size={14} /> Fecha
                        </label>
                        <input type="date" className="form-control" style={{ padding: '0.5rem' }} value={formData.date} min={isUser ? todayStr : undefined} max={isSuperAdmin ? undefined : todayStr} disabled={!!formData._id && !isAdmin} onChange={e => {
                          const val = e.target.value;
                          if (closedDates.includes(val)) {
                             showAlert('Esta fecha tiene un cierre de caja realizado.');
                          } else {
                             setFormData({ ...formData, date: val });
                          }
                        }} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                          <User size={14} /> Paciente
                        </label>
                        <select className="form-control" style={{ padding: '0.5rem' }} value={formData.patientId} disabled={!formData._id && formData.proceduresList && formData.proceduresList.length > 0} onChange={e => {
                          const id = e.target.value;
                          const p = patients.find(pat => pat._id === id);
                          setFormData({ ...formData, patientId: id, patientName: p ? `${p.name} ${p.surname}` : '' });
                        }} required>
                          <option value="">Seleccione un paciente...</option>
                          {patients.filter(p => p.isActive !== false || p._id === formData.patientId).map(p => <option key={p._id} value={p._id}>{p.rut} - {p.name} {p.surname}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Step 1: Treatment Details */}
                    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>1</div>
                        Tratamiento y Especialista
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                        <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                          <label className="form-label" style={{ fontSize: '0.8rem' }}>Procedimiento</label>
                          <select className="form-control" style={{ padding: '0.5rem' }} value={formData.procedureId} onChange={handleProcedureChange} required={!formData.proceduresList?.length}>
                            <option value="">Seleccione Procedimiento...</option>
                            {procedures.filter(p => p.isActive !== false || p._id === formData.procedureId).map(p => (
                              <option key={p._id} value={p._id}>{p.name} (${p.price.toLocaleString('es-CL')})</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                          <label className="form-label" style={{ fontSize: '0.8rem' }}>Doctor</label>
                          <select className="form-control" style={{ padding: '0.5rem' }} value={formData.doctorId} onChange={e => {
                            const id = e.target.value;
                            const doc = doctors.find(d => d._id === id);
                            setFormData({ ...formData, doctorId: id, doctorName: doc ? `${doc.name} ${doc.surname}` : '' });
                          }} required={!formData.proceduresList?.length}>
                            <option value="">Asignar Doctor...</option>
                            {doctors.filter(d => d.isActive !== false || d._id === formData.doctorId).map(d => <option key={d._id} value={d._id}>{d.name} {d.surname}</option>)}
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8rem' }}>Precio Final</label>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', fontSize: '0.8rem' }}>$</span>
                            <input type="number" onWheel={e => e.target.blur()} className="form-control" style={{ padding: '0.5rem 0.5rem 0.5rem 1.5rem', fontSize: '0.9rem' }} value={formData.unitPrice ?? 0} onChange={e => setFormData({ ...formData, unitPrice: Number(e.target.value) })} required={!formData.proceduresList?.length} />
                          </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8rem' }}>Cantidad</label>
                          <input type="number" onWheel={e => e.target.blur()} className="form-control" style={{ padding: '0.5rem', fontSize: '0.9rem' }} value={formData.quantity ?? 1} onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })} required={!formData.proceduresList?.length} />
                        </div>
                      </div>

                      <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem', borderRadius: '8px', backgroundColor: '#fff7ed', border: '1px solid #ffedd5' }}>
                        <input type="checkbox" id="isTreatmentInProgress" checked={formData.isTreatmentInProgress} onChange={e => setFormData({ ...formData, isTreatmentInProgress: e.target.checked })} style={{ width: '17px', height: '17px', cursor: 'pointer' }} />
                        <label htmlFor="isTreatmentInProgress" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9a3412', marginBottom: 0, cursor: 'pointer' }}>
                          Tratamiento por etapas (Ej: Ortodoncia). No libera comisión hasta finalizar todas las sesiones.
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem' }}>
                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', backgroundColor: '#fcfaff' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#6d28d9', fontWeight: 600, fontSize: '0.9rem' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#6d28d9', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>2</div>
                          Insumos / Laboratorio
                        </div>
                        <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                          <select className="form-control" style={{ padding: '0.5rem', fontSize: '0.85rem' }} value={formData.discountId} onChange={handleDiscountChange}>
                            <option value="">Sin Insumo Externo...</option>
                            {supplies.filter(s => s.isActive !== false || s._id === formData.discountId).map(s => <option key={s._id} value={s._id}>{s.name} (${s.unitPrice?.toLocaleString('es-CL')})</option>)}
                          </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <input type="number" className="form-control" style={{ padding: '0.5rem', fontSize: '0.85rem' }} placeholder="Cant." value={formData.discountQuantity ?? 0} onChange={e => setFormData({ ...formData, discountQuantity: Number(e.target.value) })} />
                          <input type="number" className="form-control" style={{ padding: '0.5rem', fontSize: '0.85rem' }} placeholder="Precio" value={formData.discountPrice ?? 0} onChange={e => setFormData({ ...formData, discountPrice: Number(e.target.value) })} />
                        </div>
                      </div>

                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', backgroundColor: '#f0fdf4' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#16a34a', fontWeight: 600, fontSize: '0.9rem' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#16a34a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>3</div>
                          Registro de Pagos
                        </div>
                        {!formData._id ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <select className="form-control" style={{ padding: '0.4rem', fontSize: '0.8rem' }} value={currentPayment.method} onChange={e => setCurrentPayment({ ...currentPayment, method: e.target.value })}>
                              <option value="efectivo">Efectivo 💵</option>
                              <option value="debito">Débito 💳</option>
                              <option value="credito">Crédito 💳</option>
                              <option value="seguro">Seguro ☂️</option>
                              <option value="transferencia">Transf. 🏦</option>
                            </select>
                            <input type="number" className="form-control" style={{ padding: '0.4rem', fontSize: '0.8rem' }} placeholder="Monto" value={currentPayment.amount} onChange={e => setCurrentPayment({ ...currentPayment, amount: Number(e.target.value) })} />
                            <button type="button" className="btn btn-primary" onClick={addPayment} style={{ backgroundColor: '#16a34a', border: 'none', padding: '0 0.5rem' }}><Plus size={16} /></button>
                          </div>
                        ) : (
                          <div style={{ padding: '0.5rem', backgroundColor: '#dcfce7', borderRadius: '8px', fontSize: '0.75rem', color: '#166534', marginBottom: '0.5rem' }}>Use "Abonar" en el menú principal.</div>
                        )}
                        <div style={{ backgroundColor: 'white', borderRadius: '6px', border: '1px solid #dcfce7', height: '80px', overflowY: 'auto', fontSize: '0.8rem' }}>
                          {formData.payments.map((p, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0.5rem', borderBottom: '1px solid #f0fdf4' }}>
                              <span style={{ fontWeight: 600, color: '#15803d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {p.method === 'efectivo' ? '💵 Efectivo' : 
                                 p.method === 'debito' ? '💳 Débito' : 
                                 p.method === 'credito' ? '💳 Crédito' : 
                                 p.method === 'seguro' ? '☂️ Seguro' : '🏦 Transf.'}
                              </span>
                              <span>${Number(p.amount).toLocaleString('es-CL')} <Trash2 size={12} style={{ color: '#ef4444', marginLeft: '0.25rem', cursor: 'pointer' }} onClick={() => removePayment(i)} /></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* LIVE ITEM SUMMARY (Before adding to list) */}
                    {!formData._id && (
                      <div style={{ padding: '0.75rem', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                          <div>
                            <div style={{ fontSize: '0.6rem', color: '#0369a1', textTransform: 'uppercase' }}>Subtotal</div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>${((formData.unitPrice || 0) * (formData.quantity || 1)).toLocaleString('es-CL')}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.6rem', color: '#0369a1', textTransform: 'uppercase' }}>Insumos</div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--danger)' }}>-${((formData.discountQuantity || 0) * (formData.discountPrice || 0)).toLocaleString('es-CL')}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.6rem', color: '#0369a1', textTransform: 'uppercase' }}>Pagado</div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--success)' }}>${(formData.payments || []).reduce((acc, p) => acc + Number(p.amount), 0).toLocaleString('es-CL')}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.6rem', color: '#0369a1', textTransform: 'uppercase' }}>Saldo Ítem</div>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: ((formData.unitPrice || 0) * (formData.quantity || 1)) - (formData.payments || []).reduce((acc, p) => acc + Number(p.amount), 0) > 0 ? '#ef4444' : '#10b981' }}>
                              ${(((formData.unitPrice || 0) * (formData.quantity || 1)) - (formData.payments || []).reduce((acc, p) => acc + Number(p.amount), 0)).toLocaleString('es-CL')}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {!formData._id && (
                      <button 
                        type="button" 
                        className="btn" 
                        onClick={appendProcedure} 
                        style={{ 
                          width: '100%', 
                          padding: '0.9rem', 
                          backgroundColor: 'var(--primary)', 
                          color: 'white', 
                          border: 'none', 
                          fontWeight: 700, 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.75rem',
                          boxShadow: '0 4px 6px -1px rgba(2, 81, 88, 0.3)'
                        }}
                      >
                        <Plus size={22} /> AÑADIR TRATAMIENTO A LA LISTA
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calculator size={16} /> Procedimientos en Venta
                      </h3>
                      
                      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px' }}>
                        {formData.proceduresList?.length === 0 && !formData._id && (
                          <div style={{ padding: '2rem', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: '12px', color: 'var(--text-light)', fontSize: '0.8rem' }}>Carrito vacío</div>
                        )}
                        
                        {formData.proceduresList?.map((p, i) => {
                          const itemTotal = p.unitPrice * p.quantity;
                          const itemPaid = (p.payments || []).reduce((acc, pay) => acc + Number(pay.amount), 0);
                          const itemBalance = itemTotal - itemPaid;
                          
                          return (
                            <div key={i} style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: 'white', position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                              <button type="button" onClick={() => removeProcedure(i)} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', color: 'var(--danger)' }}>
                                <Trash2 size={14} />
                              </button>
                              <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>{p.procedureName}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Doc: {p.doctorName}</div>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                <span>{p.quantity} x ${p.unitPrice?.toLocaleString('es-CL')}</span>
                                <span style={{ fontWeight: 700 }}>${itemTotal.toLocaleString('es-CL')}</span>
                              </div>

                              {(p.discountQuantity > 0 && p.discountPrice > 0) && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem' }}>
                                  <span style={{ fontStyle: 'italic' }}>- Insumos: {p.discountName}</span>
                                  <span style={{ fontWeight: 600 }}>-${(p.discountQuantity * p.discountPrice).toLocaleString('es-CL')}</span>
                                </div>
                              )}
                              
                              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: '180px' }}>
                                  {(p.payments || []).map((pay, idx) => {
                                    const emoji = pay.method === 'efectivo' ? '💵' : 
                                                  pay.method === 'seguro' ? '☂️' : 
                                                  pay.method === 'transferencia' ? '🏦' : '💳';
                                    return (
                                      <span key={idx} style={{ fontSize: '0.6rem', backgroundColor: '#ecfdf5', color: '#065f46', padding: '2px 4px', borderRadius: '3px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        {emoji} ${Number(pay.amount).toLocaleString('es-CL')}
                                      </span>
                                    );
                                  })}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '0.6rem', color: 'var(--text-light)', textTransform: 'uppercase' }}>Saldo Ítem</div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: itemBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                    ${itemBalance.toLocaleString('es-CL')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {formData._id && (
                          <div style={{ padding: '0.75rem', border: '1.5px solid var(--primary)', borderRadius: '12px', backgroundColor: '#f0fdfa' }}>
                            <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>{formData.procedureName}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Doc: {formData.doctorName}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                              <span>{formData.quantity} x ${formData.unitPrice?.toLocaleString('es-CL')}</span>
                              <span style={{ fontWeight: 700 }}>${(formData.unitPrice * formData.quantity).toLocaleString('es-CL')}</span>
                            </div>
                            <div style={{ marginTop: '0.5rem', textAlign: 'right', borderTop: '1px solid #ccfbf1', paddingTop: '0.25rem' }}>
                               <div style={{ fontSize: '0.6rem', color: '#0f766e', textTransform: 'uppercase' }}>Saldo Venta</div>
                               <div style={{ fontSize: '0.9rem', fontWeight: 800, color: pending > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                 ${pending.toLocaleString('es-CL')}
                               </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '1rem', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ color: '#94a3b8' }}>Total Venta</span>
                          <span style={{ fontWeight: 600 }}>${totalToCollect.toLocaleString('es-CL')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, color: '#38bdf8' }}>
                          <span>Total Clínica</span>
                          <span>${clinicTotal.toLocaleString('es-CL')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80', fontSize: '0.85rem' }}>
                          <span>Pagado</span>
                          <span style={{ fontWeight: 700 }}>${totalPaid.toLocaleString('es-CL')}</span>
                        </div>
                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: pending > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(74, 222, 128, 0.2)', borderRadius: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>SALDO PENDIENTE TOTAL</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: pending > 0 ? '#f87171' : '#4ade80' }}>
                            ${pending.toLocaleString('es-CL')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                           <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '0.5rem', fontSize: '0.85rem' }}>Cerrar</button>
                           <button type="submit" className="btn btn-primary" style={{ flex: 2, backgroundColor: '#38bdf8', color: '#0f172a', border: 'none', padding: '0.5rem', fontSize: '0.85rem' }}>
                            {formData._id ? 'Actualizar' : 'Finalizar Venta'}
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {showAbonoModal && (
        <Portal>
          <div className="modal-overlay">
            <div className="card" style={{ width: '500px' }}>
              <h2>Abonar Saldo Pendiente</h2>
              <form onSubmit={handleAbonoSubmit}>
                <div className="form-group">
                  <label className="form-label">Fecha del Abono</label>
                  <input type="date" className="form-control" value={abonoForm.date} min={isUser ? todayStr : undefined} max={isSuperAdmin ? undefined : todayStr} onChange={e => {
                    const val = e.target.value;
                    if (closedDates.includes(val)) {
                       showAlert('Esta fecha tiene un cierre de caja realizado.');
                    } else {
                       setAbonoForm({ ...abonoForm, date: val });
                    }
                  }} required />
                </div>

                <div className="form-group">
                  <label className="form-label">1. Seleccionar Paciente</label>
                  <select className="form-control" value={abonoPatientId} onChange={e => setAbonoPatientId(e.target.value)} required>
                    <option value="">Buscar paciente...</option>
                    {patients.map(p => (
                      <option key={p._id} value={p._id}>{p.name} {p.surname} ({p.rut})</option>
                    ))}
                  </select>
                </div>

                {abonoPatientId && (
                  <div className="form-group">
                    <label className="form-label">2. Ventas Pendientes</label>
                    {patientPendingSales.length === 0 ? (
                      <p style={{ margin: 0, color: 'var(--text-light)' }}>Este paciente no tiene deudas pendientes.</p>
                    ) : (
                      <select className="form-control" value={abonoForm.saleId} onChange={e => setAbonoForm({ ...abonoForm, saleId: e.target.value })} required>
                        <option value="">Seleccione una venta...</option>
                        {patientPendingSales.map(s => (
                          <option key={s._id} value={s._id}>
                            {new Date(s.date).toLocaleDateString('es-CL', { timeZone: 'UTC' })} - {s.procedureName} - Deuda: ${s.pendingAmount?.toLocaleString('es-CL')}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {abonoForm.saleId && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Método de Pago</label>
                      <select className="form-control" value={abonoForm.method} onChange={e => setAbonoForm({ ...abonoForm, method: e.target.value })} required>
                        <option value="efectivo">Efectivo</option>
                        <option value="debito">Débito</option>
                        <option value="credito">Crédito</option>
                        <option value="seguro">Seguro</option>
                        <option value="transferencia">Transferencia</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Monto a Abonar</label>
                      <input type="number" onWheel={e => e.target.blur()} min="1" className="form-control" value={abonoForm.amount} onChange={e => setAbonoForm({ ...abonoForm, amount: Number(e.target.value) })} required />
                      {(() => {
                        const selectedSale = patientPendingSales.find(s => s._id === abonoForm.saleId);
                        if (selectedSale) {
                          return <small style={{ color: 'var(--text-light)' }}>La deuda es de ${selectedSale.pendingAmount.toLocaleString('es-CL')}</small>;
                        }
                        return null;
                      })()}
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button type="button" className="btn" onClick={() => setShowAbonoModal(false)} style={{ border: '1px solid var(--border)' }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={!abonoForm.saleId || patientPendingSales.length === 0}>
                    Registrar Abono
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {showReleaseModal && (
        <Portal>
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary)' }}>Liberar Comisión</h2>
                <button onClick={() => setShowReleaseModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}>
                  <X size={24} />
                </button>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>{releaseForm.procedureName}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)' }}>Doctor: {releaseForm.doctorName}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Base Total</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>${releaseForm.clinicTotal.toLocaleString('es-CL')}</div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#ecfdf5', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#059669', marginBottom: '0.25rem' }}>Ya Liberado</div>
                  <div style={{ fontWeight: 700, color: '#059669' }}>${releaseForm.releasedTotal.toLocaleString('es-CL')}</div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#fff7ed', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#ea580c', marginBottom: '0.25rem' }}>Pendiente</div>
                  <div style={{ fontWeight: 700, color: '#ea580c' }}>${(releaseForm.clinicTotal - releaseForm.releasedTotal).toLocaleString('es-CL')}</div>
                </div>
              </div>

              <form onSubmit={handleReleaseSubmit}>
                <div className="form-group">
                  <label className="form-label">Fecha de Liberación</label>
                  <input type="date" className="form-control" value={releaseForm.date} disabled style={{ backgroundColor: '#f1f5f9', color: 'var(--text-light)', cursor: 'not-allowed' }} />
                  <small style={{ color: 'var(--text-light)', display: 'block', marginTop: '0.25rem' }}>
                    La liberación siempre se registra con la fecha de hoy.
                  </small>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Monto a Liberar</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {[25, 50, 75, 100].map(pct => (
                      <button 
                        key={pct}
                        type="button" 
                        onClick={() => {
                           const maxRelease = releaseForm.clinicTotal - releaseForm.releasedTotal;
                           setReleaseForm({...releaseForm, amount: Math.round(maxRelease * (pct / 100)), percentage: pct});
                        }}
                        style={{ 
                          flex: 1, 
                          padding: '0.25rem', 
                          border: '1px solid #cbd5e1', 
                          backgroundColor: releaseForm.percentage === pct ? '#e2e8f0' : 'white', 
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: releaseForm.percentage === pct ? 600 : 400
                        }}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                  <input 
                    type="number" 
                    className="form-control" 
                    style={{ fontSize: '1.25rem', padding: '0.75rem', fontWeight: 600 }}
                    value={releaseForm.amount} 
                    onChange={e => setReleaseForm({ ...releaseForm, amount: Number(e.target.value), percentage: null })} 
                    max={releaseForm.clinicTotal - releaseForm.releasedTotal}
                    min="1"
                    required 
                  />
                  <small style={{ color: 'var(--text-light)', display: 'block', marginTop: '0.5rem' }}>
                    Al liberar, este monto se enviará al reporte de comisiones del doctor para el mes seleccionado.
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                  <button type="button" className="btn" onClick={() => setShowReleaseModal(false)} style={{ border: '1px solid var(--border)' }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={18} /> Confirmar Liberación
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
