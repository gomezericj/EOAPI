"use client";
import { useState, useEffect } from 'react';
import { Plus, Search, Calendar, DollarSign, User, Calculator, Trash2, Edit, Download, X, CheckCircle, ShoppingCart, Stethoscope, Package, CreditCard, Clock, Receipt } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import Portal from '@/components/Portal';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/fetcher';
import Select from 'react-select';

export default function SalesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
  const isSuperAdmin = session?.user?.role === 'superadmin';
  const isUser = session?.user?.role === 'user';
  const { showAlert, showConfirm, showSuccess, showLoading } = useNotification();
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

  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.doctorId) params.append('doctorId', filters.doctorId);
  if (filters.patientId) params.append('patientId', filters.patientId);
  const salesUrl = `/api/ventas${params.toString() ? '?' + params.toString() : ''}`;

  const { data: salesData } = useSWR(salesUrl, fetcher);
  const { data: patientsData } = useSWR('/api/patients', fetcher);
  const { data: doctorsData } = useSWR('/api/doctors', fetcher);
  const { data: proceduresData } = useSWR('/api/procedimientos', fetcher);
  const { data: suppliesData } = useSWR('/api/insumos', fetcher);
  const { data: closedData } = useSWR('/api/cierres', fetcher);

  const sales = salesData || [];
  const patients = patientsData || [];
  const doctors = doctorsData || [];
  const procedures = proceduresData || [];
  const supplies = suppliesData || [];
  const closedDates = Array.isArray(closedData) ? closedData : [];
  const loading = !salesData || !patientsData || !doctorsData || !proceduresData || !suppliesData || !closedData;

  const fetchData = async () => {
    await mutate(salesUrl);
  };

  const [searchTerm, setSearchTerm] = useState('');

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

  const { data: abonoSales } = useSWR(abonoPatientId ? `/api/ventas?patientId=${abonoPatientId}` : null, fetcher);

  useEffect(() => {
    if (abonoPatientId && abonoSales) {
      setPatientPendingSales(abonoSales.filter(s => Number(s.pendingAmount) > 0));
    } else if (!abonoPatientId) {
      setPatientPendingSales([]);
      setAbonoForm(prev => ({ ...prev, saleId: '' }));
    }
  }, [abonoSales, abonoPatientId]);

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
    const data = filteredSales.map(s => {
      const refDoctor = s.patientId?.referredByDoctorId;
      const refDoctorName = refDoctor && typeof refDoctor === 'object' ? `${refDoctor.name || ''} ${refDoctor.surname || ''}`.trim() : '';

      const refDocId = refDoctor?._id ? refDoctor._id.toString() : (typeof refDoctor === 'string' ? refDoctor : null);
      const attendingDocId = s.doctorId?._id ? s.doctorId._id.toString() : (typeof s.doctorId === 'string' ? s.doctorId : null);
      const isReferredToAttending = !!(refDocId && attendingDocId && refDocId === attendingDocId);

      return {
        Fecha: new Date(s.date).toLocaleDateString('es-CL', { timeZone: 'UTC' }),
        Paciente: s.patientId ? (`${s.patientId.name} ${s.patientId.surname}${s.patientId.isActive === false ? ' (Deshabilitado)' : ''}`).trim() : `Paciente Eliminado (${s.patientName || 'Desconocido'})`,
        Referido: isReferredToAttending ? (refDoctorName ? `SÍ (Dr/a. ${refDoctorName})` : 'SÍ') : 'NO',
        Procedimiento: s.procedureId ? `${s.procedureId.name || s.procedureName}${s.procedureId.isActive === false ? ' (Deshabilitado)' : ''}` : `Tratamiento Eliminado (${s.procedureName || 'Desconocido'})`,
        Doctor: s.doctorId ? (`${s.doctorId.name} ${s.doctorId.surname}${s.doctorId.isActive === false ? ' (Deshabilitado)' : ''}`).trim() : `Doctor Eliminado (${s.doctorName || 'Desconocido'})`,
        Descuento: s.discountTotal > 0 ? (s.discountId ? `${s.discountName}${s.discountId.isActive === false ? ' (Deshabilitado)' : ''} (-$${s.discountTotal})` : `Descuento Eliminado (${s.discountName}) (-$${s.discountTotal})`) : 'Ninguno',
        Total_A_Cobrar: s.totalToCollect,
        Pagado: s.totalCharged,
        Pendiente: s.pendingAmount,
        Estado_Pago: s.status === 'pagada' ? 'PAGADA' : 'PENDIENTE',
        Liberada_el: s.commissionReleaseDate ? new Date(s.commissionReleaseDate).toLocaleDateString('es-CL', { timeZone: 'UTC' }) : (s.isTreatmentInProgress ? `EN CURSO (${(s.commissionReleasedTotal || 0)} de ${(s.totalToCollect || 0) - (s.discountTotal || 0)})` : 'NO')
      };
    });
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
                      const refDoctor = s.patientId?.referredByDoctorId;
                      const refDoctorName = refDoctor && typeof refDoctor === 'object' ? `${refDoctor.name || ''} ${refDoctor.surname || ''}`.trim() : '';

                      const refDocId = refDoctor?._id ? refDoctor._id.toString() : (typeof refDoctor === 'string' ? refDoctor : null);
                      const attendingDocId = s.doctorId?._id ? s.doctorId._id.toString() : (typeof s.doctorId === 'string' ? s.doctorId : null);
                      const isReferredToAttending = !!(refDocId && attendingDocId && refDocId === attendingDocId);

                      if (s.patientId || s.patientId === undefined) {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: isPatientDisabled ? 0.6 : 1, flexWrap: 'wrap' }}>
                            {isPatientDisabled && <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase' }}>DESH.</span>}
                            <span>{s.patientId ? `${s.patientId.name} ${s.patientId.surname}` : s.patientName}</span>
                            {isReferredToAttending && (
                              <span style={{
                                backgroundColor: '#fef3c7',
                                color: '#d97706',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: '12px',
                                border: '1px solid #f59e0b',
                                whiteSpace: 'nowrap'
                              }} title={refDoctorName ? `Referido por Dr(a). ${refDoctorName}` : 'Paciente Referido'}>
                                REFERIDO
                              </span>
                            )}
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
                            {s.procedureId?.name || s.procedureName}
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
            <div className="card" style={{ width: '1320px', maxWidth: '98vw', maxHeight: '92vh', overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
              
              {/* Encabezado del Modal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#f0fdfa', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Receipt size={22} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {formData._id ? 'Editar Venta' : 'Registrar Nueva Venta'}
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-light)' }}>
                      Configura el plan de tratamiento, profesionales, insumos deducibles y abonos del paciente.
                    </p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  title="Cerrar" 
                  style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '10px', 
                    backgroundColor: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    cursor: 'pointer', 
                    color: 'var(--text-light)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '1.5rem', alignItems: 'start' }}>
                {/* Columna Izquierda: Constructor de Tratamientos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* PASO 0: Fecha y Paciente */}
                  <div style={{ 
                    backgroundColor: '#f8fafc', 
                    padding: '1.1rem', 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0',
                    display: 'grid', 
                    gridTemplateColumns: '1fr 2fr', 
                    gap: '1rem' 
                  }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                        <Calendar size={14} color="var(--primary)" /> Fecha de Atención
                      </label>
                      <input 
                        type="date" 
                        className="form-control" 
                        style={{ padding: '0.5rem', fontSize: '0.88rem' }} 
                        value={formData.date} 
                        min={isUser ? todayStr : undefined} 
                        max={isSuperAdmin ? undefined : todayStr} 
                        disabled={!!formData._id && !isAdmin} 
                        onChange={e => {
                          const val = e.target.value;
                          if (closedDates.includes(val)) {
                             showAlert('Esta fecha tiene un cierre de caja realizado.');
                          } else {
                             setFormData({ ...formData, date: val });
                          }
                        }} 
                        required 
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                        <User size={14} color="var(--primary)" /> Paciente
                      </label>
                      <Select
                        instanceId="patient-select"
                        isDisabled={!formData._id && formData.proceduresList && formData.proceduresList.length > 0}
                        placeholder="Buscar paciente por RUT o nombre..."
                        noOptionsMessage={() => "No se encontraron pacientes"}
                        options={patients.filter(p => p.isActive !== false || p._id === formData.patientId).map(p => ({ value: p._id, label: `${p.rut} - ${p.name} ${p.surname}` }))}
                        value={formData.patientId ? { value: formData.patientId, label: patients.find(pat => pat._id === formData.patientId) ? `${patients.find(pat => pat._id === formData.patientId).rut} - ${patients.find(pat => pat._id === formData.patientId).name} ${patients.find(pat => pat._id === formData.patientId).surname}` : formData.patientName } : null}
                        onChange={option => {
                          if (option) {
                            const p = patients.find(pat => pat._id === option.value);
                            setFormData({ ...formData, patientId: option.value, patientName: p ? `${p.name} ${p.surname}` : '' });
                          } else {
                            setFormData({ ...formData, patientId: '', patientName: '' });
                          }
                        }}
                        styles={{ control: (base) => ({ ...base, minHeight: '42px', borderRadius: '10px', borderColor: '#cbd5e1', fontSize: '0.88rem' }) }}
                        menuPosition="fixed"
                        isClearable
                      />
                    </div>
                  </div>

                  {/* PASO 1: Tratamiento y Profesional */}
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.85rem' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '8px', backgroundColor: '#f0fdfa', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Stethoscope size={15} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
                          1. Tratamiento y Profesional
                        </div>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-light)' }}>
                          Asigna el procedimiento clínico y el odontólogo tratante
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '0.85rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Procedimiento</label>
                        <Select
                          instanceId="procedure-select"
                          placeholder="Seleccione Procedimiento..."
                          noOptionsMessage={() => "No se encontraron procedimientos"}
                          options={procedures.filter(p => p.isActive !== false || p._id === formData.procedureId).map(p => ({ value: p._id, label: `${p.name} ($${p.price.toLocaleString('es-CL')})` }))}
                          value={formData.procedureId ? { value: formData.procedureId, label: procedures.find(p => p._id === formData.procedureId) ? `${procedures.find(p => p._id === formData.procedureId).name} ($${procedures.find(p => p._id === formData.procedureId).price.toLocaleString('es-CL')})` : formData.procedureName } : null}
                          onChange={option => handleProcedureChange({ target: { value: option ? option.value : '' } })}
                          styles={{ control: (base) => ({ ...base, minHeight: '40px', borderRadius: '8px', borderColor: '#cbd5e1', fontSize: '0.85rem' }) }}
                          menuPosition="fixed"
                          isClearable
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Doctor Asignado</label>
                        <Select
                          instanceId="doctor-select"
                          placeholder="Asignar Doctor..."
                          noOptionsMessage={() => "No se encontraron doctores"}
                          options={doctors.filter(d => d.isActive !== false || d._id === formData.doctorId).map(d => ({ value: d._id, label: `${d.name} ${d.surname}` }))}
                          value={formData.doctorId ? { value: formData.doctorId, label: doctors.find(d => d._id === formData.doctorId) ? `${doctors.find(d => d._id === formData.doctorId).name} ${doctors.find(d => d._id === formData.doctorId).surname}` : formData.doctorName } : null}
                          onChange={option => {
                            if (option) {
                              const doc = doctors.find(d => d._id === option.value);
                              setFormData({ ...formData, doctorId: option.value, doctorName: doc ? `${doc.name} ${doc.surname}` : '' });
                            } else {
                              setFormData({ ...formData, doctorId: '', doctorName: '' });
                            }
                          }}
                          styles={{ control: (base) => ({ ...base, minHeight: '40px', borderRadius: '8px', borderColor: '#cbd5e1', fontSize: '0.85rem' }) }}
                          menuPosition="fixed"
                          isClearable
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Precio Final Acordado</label>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ 
                            padding: '0 0.75rem', 
                            height: '40px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            backgroundColor: '#f1f5f9', 
                            border: '1px solid #cbd5e1', 
                            borderRight: 'none', 
                            borderTopLeftRadius: '8px', 
                            borderBottomLeftRadius: '8px', 
                            fontWeight: 700, 
                            color: '#64748b', 
                            fontSize: '0.85rem' 
                          }}>$</span>
                          <input 
                            type="number" 
                            onWheel={e => e.target.blur()} 
                            className="form-control" 
                            style={{ margin: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, fontSize: '0.9rem' }} 
                            value={formData.unitPrice ?? 0} 
                            onChange={e => setFormData({ ...formData, unitPrice: Number(e.target.value) })} 
                            required={!formData.proceduresList?.length} 
                          />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Cantidad de Sesiones / Unidades</label>
                        <input 
                          type="number" 
                          onWheel={e => e.target.blur()} 
                          className="form-control" 
                          style={{ margin: 0, padding: '0.5rem', fontSize: '0.9rem', borderRadius: '8px' }} 
                          value={formData.quantity ?? 1} 
                          onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })} 
                          required={!formData.proceduresList?.length} 
                          min="1"
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.85rem', borderRadius: '10px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7' }}>
                      <input 
                        type="checkbox" 
                        id="isTreatmentInProgress" 
                        checked={formData.isTreatmentInProgress} 
                        onChange={e => setFormData({ ...formData, isTreatmentInProgress: e.target.checked })} 
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#d97706' }} 
                      />
                      <label htmlFor="isTreatmentInProgress" style={{ fontSize: '0.76rem', fontWeight: 600, color: '#92400e', marginBottom: 0, cursor: 'pointer' }}>
                        Tratamiento por etapas (Ej: Ortodoncia). No libera la comisión del doctor hasta finalizar todas las sesiones.
                      </label>
                    </div>
                  </div>

                  {/* PASO 2 y 3: Insumos Deducibles y Pagos en 2 Columnas */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: '1rem' }}>
                    
                    {/* PASO 2: Insumos / Costos de Laboratorio */}
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Package size={14} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                            2. Insumo / Laboratorio
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Deducción opcional</span>
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <Select
                          instanceId="discount-select"
                          placeholder="Sin Insumo Externo..."
                          noOptionsMessage={() => "No se encontraron insumos"}
                          options={supplies.filter(s => s.isActive !== false || s._id === formData.discountId).map(s => ({ value: s._id, label: `${s.name} ($${s.unitPrice?.toLocaleString('es-CL')})` }))}
                          value={formData.discountId ? { value: formData.discountId, label: supplies.find(s => s._id === formData.discountId) ? `${supplies.find(s => s._id === formData.discountId).name} ($${supplies.find(s => s._id === formData.discountId).unitPrice?.toLocaleString('es-CL')})` : formData.discountName } : null}
                          onChange={option => handleDiscountChange({ target: { value: option ? option.value : '' } })}
                          styles={{ control: (base) => ({ ...base, minHeight: '38px', borderRadius: '8px', borderColor: '#cbd5e1', fontSize: '0.82rem' }) }}
                          menuPosition="fixed"
                          isClearable
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.5rem' }}>
                        <input 
                          type="number" 
                          className="form-control" 
                          style={{ padding: '0.45rem', fontSize: '0.82rem', margin: 0 }} 
                          placeholder="Cant." 
                          value={formData.discountQuantity ?? 0} 
                          onChange={e => setFormData({ ...formData, discountQuantity: Number(e.target.value) })} 
                        />
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ padding: '0 0.4rem', height: '36px', display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRight: 'none', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px', fontSize: '0.75rem', color: '#64748b' }}>$</span>
                          <input 
                            type="number" 
                            className="form-control" 
                            style={{ padding: '0.45rem', fontSize: '0.82rem', margin: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }} 
                            placeholder="Costo" 
                            value={formData.discountPrice ?? 0} 
                            onChange={e => setFormData({ ...formData, discountPrice: Number(e.target.value) })} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* PASO 3: Registro de Pagos */}
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CreditCard size={14} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#15803d' }}>
                            3. Pagos y Abonos
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Ingreso inmediato</span>
                        </div>
                      </div>

                      {!formData._id ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '0.45rem', marginBottom: '0.5rem' }}>
                          <select 
                            className="form-control" 
                            style={{ padding: '0.4rem', fontSize: '0.8rem', margin: 0 }} 
                            value={currentPayment.method} 
                            onChange={e => setCurrentPayment({ ...currentPayment, method: e.target.value })}
                          >
                            <option value="efectivo">Efectivo 💵</option>
                            <option value="debito">Débito 💳</option>
                            <option value="credito">Crédito 💳</option>
                            <option value="transferencia">Transf. 🏦</option>
                            <option value="seguro">Seguro ☂️</option>
                            <option value="isapre">Isapre 🏥</option>
                            <option value="fonasa">Fonasa 🩺</option>
                          </select>
                          <input 
                            type="number" 
                            className="form-control" 
                            style={{ padding: '0.4rem', fontSize: '0.8rem', margin: 0 }} 
                            placeholder="Monto $" 
                            value={currentPayment.amount} 
                            onChange={e => setCurrentPayment({ ...currentPayment, amount: Number(e.target.value) })} 
                          />
                          <button 
                            type="button" 
                            className="btn btn-primary" 
                            onClick={addPayment} 
                            style={{ backgroundColor: 'var(--primary)', border: 'none', padding: '0 0.65rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Añadir Pago"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ padding: '0.45rem 0.65rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '0.73rem', color: '#166534', marginBottom: '0.5rem' }}>
                          Para agregar nuevos pagos a una venta guardada, usa la opción "Abonar" en el listado.
                        </div>
                      )}

                      <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '82px', overflowY: 'auto', fontSize: '0.78rem' }}>
                        {formData.payments.length === 0 ? (
                          <div style={{ padding: '0.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.72rem' }}>
                            Sin pagos registrados aún
                          </div>
                        ) : (
                          formData.payments.map((p, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.6rem', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ fontWeight: 600, color: '#334155' }}>
                                {p.method === 'efectivo' ? '💵 Efectivo' : 
                                 p.method === 'debito' ? '💳 Débito' : 
                                 p.method === 'credito' ? '💳 Crédito' : 
                                 p.method === 'transferencia' ? '🏦 Transf.' :
                                 p.method === 'seguro' ? '☂️ Seguro' :
                                 p.method === 'isapre' ? '🏥 Isapre' :
                                 p.method === 'fonasa' ? '🩺 Fonasa' : p.method}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#0f172a' }}>
                                ${Number(p.amount).toLocaleString('es-CL')}
                                <Trash2 size={13} style={{ color: '#ef4444', cursor: 'pointer' }} onClick={() => removePayment(i)} title="Eliminar pago" />
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RESUMEN EN VIVO DEL TRATAMIENTO */}
                  {!formData._id && (
                    <div style={{ 
                      padding: '0.85rem 1rem', 
                      backgroundColor: '#f8fafc', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '12px',
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(4, 1fr)', 
                      gap: '0.75rem' 
                    }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Subtotal</div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary)' }}>
                          ${((formData.unitPrice || 0) * (formData.quantity || 1)).toLocaleString('es-CL')}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Deducción Insumos</div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#dc2626' }}>
                          -${((formData.discountQuantity || 0) * (formData.discountPrice || 0)).toLocaleString('es-CL')}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Pagado</div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#16a34a' }}>
                          ${(formData.payments || []).reduce((acc, p) => acc + Number(p.amount), 0).toLocaleString('es-CL')}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Saldo Ítem</div>
                        <div style={{ 
                          fontWeight: 800, 
                          fontSize: '0.95rem', 
                          color: ((formData.unitPrice || 0) * (formData.quantity || 1)) - (formData.payments || []).reduce((acc, p) => acc + Number(p.amount), 0) > 0 ? '#ea580c' : '#16a34a' 
                        }}>
                          ${(((formData.unitPrice || 0) * (formData.quantity || 1)) - (formData.payments || []).reduce((acc, p) => acc + Number(p.amount), 0)).toLocaleString('es-CL')}
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
                        padding: '0.85rem', 
                        backgroundColor: 'var(--primary)', 
                        color: 'white', 
                        border: 'none', 
                        fontWeight: 700, 
                        fontSize: '0.95rem',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgba(2, 81, 88, 0.25)',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={20} /> AÑADIR TRATAMIENTO A LA VENTA
                    </button>
                  )}
                </div>

                {/* Columna Derecha: Procedimientos en Venta y Resumen Financiero */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                  
                  {/* Procedimientos Acumulados */}
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <h3 style={{ fontSize: '0.9rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', fontWeight: 700 }}>
                        <ShoppingCart size={16} color="var(--primary)" /> Tratamientos en la Venta
                      </h3>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '10px' }}>
                        {formData._id ? '1 ítem' : `${formData.proceduresList?.length || 0} ítems`}
                      </span>
                    </div>
                    
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '420px' }}>
                      {formData.proceduresList?.length === 0 && !formData._id && (
                        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', border: '2px dashed #cbd5e1', borderRadius: '12px', color: 'var(--text-light)', fontSize: '0.8rem', backgroundColor: '#f8fafc' }}>
                          <ShoppingCart size={28} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                          <p style={{ margin: 0 }}>No has agregado procedimientos aún.</p>
                          <small style={{ color: '#94a3b8' }}>Completa el formulario de la izquierda y presiona "Añadir Tratamiento".</small>
                        </div>
                      )}
                      
                      {formData.proceduresList?.map((p, i) => {
                        const itemTotal = p.unitPrice * p.quantity;
                        const itemPaid = (p.payments || []).reduce((acc, pay) => acc + Number(pay.amount), 0);
                        const itemBalance = itemTotal - itemPaid;
                        
                        return (
                          <div key={i} style={{ padding: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#ffffff', position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                            <button 
                              type="button" 
                              onClick={() => removeProcedure(i)} 
                              style={{ position: 'absolute', top: '0.65rem', right: '0.65rem', color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer' }}
                              title="Eliminar tratamiento"
                            >
                              <Trash2 size={15} style={{ color: '#ef4444' }} />
                            </button>
                            <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.88rem', paddingRight: '1.5rem' }}>{p.procedureName}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '2px' }}>Doctor: <strong>{p.doctorName}</strong></div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.5rem', color: '#334155' }}>
                              <span>{p.quantity} × ${p.unitPrice?.toLocaleString('es-CL')}</span>
                              <span style={{ fontWeight: 700 }}>${itemTotal.toLocaleString('es-CL')}</span>
                            </div>

                            {(p.discountQuantity > 0 && p.discountPrice > 0) && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#dc2626', marginTop: '0.2rem' }}>
                                <span>- Insumos ({p.discountName})</span>
                                <span style={{ fontWeight: 600 }}>-${(p.discountQuantity * p.discountPrice).toLocaleString('es-CL')}</span>
                              </div>
                            )}
                            
                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: '180px' }}>
                                {(p.payments || []).map((pay, idx) => (
                                  <span key={idx} style={{ fontSize: '0.62rem', backgroundColor: '#ecfdf5', color: '#065f46', padding: '2px 5px', borderRadius: '4px', fontWeight: 600 }}>
                                    {pay.method} ${Number(pay.amount).toLocaleString('es-CL')}
                                  </span>
                                ))}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.62rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 700 }}>Saldo</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: itemBalance > 0 ? '#ea580c' : '#16a34a' }}>
                                  ${itemBalance.toLocaleString('es-CL')}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {formData._id && (
                        <div style={{ padding: '0.85rem', border: '1px solid #ccfbf1', borderRadius: '12px', backgroundColor: '#f0fdfa' }}>
                          <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.88rem' }}>{formData.procedureName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '2px' }}>Doctor: {formData.doctorName}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                            <span>{formData.quantity} × ${formData.unitPrice?.toLocaleString('es-CL')}</span>
                            <span style={{ fontWeight: 700 }}>${(formData.unitPrice * formData.quantity).toLocaleString('es-CL')}</span>
                          </div>
                          <div style={{ marginTop: '0.5rem', textAlign: 'right', borderTop: '1px solid #ccfbf1', paddingTop: '0.35rem' }}>
                             <div style={{ fontSize: '0.62rem', color: '#0f766e', textTransform: 'uppercase', fontWeight: 700 }}>Saldo Pendiente</div>
                             <div style={{ fontSize: '0.95rem', fontWeight: 800, color: pending > 0 ? '#ea580c' : '#16a34a' }}>
                               ${pending.toLocaleString('es-CL')}
                             </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resumen Ejecutivo de Totales */}
                  <div style={{ backgroundColor: '#0f172a', color: 'white', padding: '1.25rem', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#94a3b8' }}>
                        <span>Total Venta Bruto</span>
                        <span style={{ fontWeight: 600, color: '#f8fafc' }}>${totalToCollect.toLocaleString('es-CL')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 800, color: '#38bdf8' }}>
                        <span>Total Clínica (Base Comisionable)</span>
                        <span>${clinicTotal.toLocaleString('es-CL')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80', fontSize: '0.85rem' }}>
                        <span>Total Pagado Real</span>
                        <span style={{ fontWeight: 700 }}>${totalPaid.toLocaleString('es-CL')}</span>
                      </div>
                      
                      <div style={{ 
                        marginTop: '0.4rem', 
                        padding: '0.65rem 0.85rem', 
                        backgroundColor: pending > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(74, 222, 128, 0.15)', 
                        border: pending > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(74, 222, 128, 0.3)',
                        borderRadius: '10px', 
                        textAlign: 'center' 
                      }}>
                        <div style={{ fontSize: '0.65rem', color: '#cbd5e1', fontWeight: 700, letterSpacing: '0.05em' }}>
                          SALDO PENDIENTE TOTAL
                        </div>
                        <div style={{ fontSize: '1.45rem', fontWeight: 800, color: pending > 0 ? '#f87171' : '#4ade80', marginTop: '2px' }}>
                          ${pending.toLocaleString('es-CL')}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.5rem' }}>
                         <button 
                           type="button" 
                           className="btn" 
                           onClick={() => setShowModal(false)} 
                           style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)', padding: '0.6rem', fontSize: '0.85rem', borderRadius: '10px' }}
                         >
                           Cerrar
                         </button>
                         <button 
                           type="submit" 
                           className="btn" 
                           style={{ flex: 2, backgroundColor: '#0d9488', color: '#ffffff', border: 'none', padding: '0.6rem', fontSize: '0.88rem', fontWeight: 700, borderRadius: '10px', boxShadow: '0 4px 6px -1px rgba(13, 148, 136, 0.3)' }}
                         >
                          {formData._id ? 'Guardar Cambios' : 'Finalizar y Guardar Venta'}
                         </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {showAbonoModal && (
        <Portal>
          <div className="modal-overlay">
            <div className="card" style={{ width: '520px', position: 'relative', borderRadius: '16px' }}>
              <button 
                type="button" 
                onClick={() => setShowAbonoModal(false)} 
                style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-light)', zIndex: 10 }}
              >
                <X size={18} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={18} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>Abonar Saldo Pendiente</h2>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)' }}>Registra un pago posterior para liquidar la deuda de un paciente.</p>
                </div>
              </div>

              <form onSubmit={handleAbonoSubmit}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Fecha del Abono</label>
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
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>1. Seleccionar Paciente</label>
                  <Select
                    instanceId="abono-patient-select"
                    placeholder="Buscar paciente por RUT o nombre..."
                    noOptionsMessage={() => "No se encontraron pacientes"}
                    options={patients.map(p => ({ value: p._id, label: `${p.name} ${p.surname} (${p.rut})` }))}
                    value={abonoPatientId ? { value: abonoPatientId, label: patients.find(p => p._id === abonoPatientId) ? `${patients.find(p => p._id === abonoPatientId).name} ${patients.find(p => p._id === abonoPatientId).surname} (${patients.find(p => p._id === abonoPatientId).rut})` : 'Paciente' } : null}
                    onChange={option => setAbonoPatientId(option ? option.value : '')}
                    styles={{ control: (base) => ({ ...base, minHeight: '42px', borderRadius: '10px', borderColor: '#cbd5e1', fontSize: '0.88rem' }) }}
                    menuPosition="fixed"
                    isClearable
                  />
                </div>

                {abonoPatientId && (
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>2. Ventas con Saldo Pendiente</label>
                    {patientPendingSales.length === 0 ? (
                      <div style={{ padding: '0.85rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#166534', fontSize: '0.82rem' }}>
                        ✓ Este paciente no registra deudas ni ventas pendientes.
                      </div>
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
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Método de Pago</label>
                        <select className="form-control" value={abonoForm.method} onChange={e => setAbonoForm({ ...abonoForm, method: e.target.value })} required>
                          <option value="efectivo">Efectivo 💵</option>
                          <option value="debito">Débito 💳</option>
                          <option value="credito">Crédito 💳</option>
                          <option value="transferencia">Transferencia 🏦</option>
                          <option value="seguro">Seguro ☂️</option>
                          <option value="isapre">Isapre 🏥</option>
                          <option value="fonasa">Fonasa 🩺</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Monto a Abonar ($)</label>
                        <input type="number" onWheel={e => e.target.blur()} min="1" className="form-control" value={abonoForm.amount} onChange={e => setAbonoForm({ ...abonoForm, amount: Number(e.target.value) })} required />
                      </div>
                    </div>
                    {(() => {
                      const selectedSale = patientPendingSales.find(s => s._id === abonoForm.saleId);
                      if (selectedSale) {
                        return (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.76rem', color: '#ea580c', fontWeight: 600 }}>
                            Deuda pendiente total en esta venta: ${selectedSale.pendingAmount.toLocaleString('es-CL')}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                  <button type="button" className="btn" onClick={() => setShowAbonoModal(false)} style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}>Cancelar</button>
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
            <div className="modal-content" style={{ maxWidth: '520px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#f0fdfa', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={18} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>Liberar Comisión</h2>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)' }}>Habilita el pago de honorarios para tratamientos finalizados.</p>
                  </div>
                </div>
                <button onClick={() => setShowReleaseModal(false)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-light)' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                <p style={{ margin: '0 0 0.25rem 0', fontWeight: 700, color: 'var(--text)' }}>{releaseForm.procedureName}</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-light)' }}>Doctor: <strong>{releaseForm.doctorName}</strong></p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginBottom: '0.2rem', fontWeight: 600 }}>Base Total</div>
                  <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1rem' }}>${releaseForm.clinicTotal.toLocaleString('es-CL')}</div>
                </div>
                <div style={{ padding: '0.85rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#166534', marginBottom: '0.2rem', fontWeight: 600 }}>Ya Liberado</div>
                  <div style={{ fontWeight: 800, color: '#15803d', fontSize: '1rem' }}>${releaseForm.releasedTotal.toLocaleString('es-CL')}</div>
                </div>
                <div style={{ padding: '0.85rem', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#9a3412', marginBottom: '0.2rem', fontWeight: 600 }}>Pendiente</div>
                  <div style={{ fontWeight: 800, color: '#ea580c', fontSize: '1rem' }}>${(releaseForm.clinicTotal - releaseForm.releasedTotal).toLocaleString('es-CL')}</div>
                </div>
              </div>

              <form onSubmit={handleReleaseSubmit}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Fecha de Liberación</label>
                  <input type="date" className="form-control" value={releaseForm.date} disabled style={{ backgroundColor: '#f1f5f9', color: 'var(--text-light)', cursor: 'not-allowed' }} />
                  <small style={{ color: 'var(--text-light)', display: 'block', marginTop: '0.25rem', fontSize: '0.72rem' }}>
                    La liberación siempre se registra con la fecha de hoy.
                  </small>
                </div>
                
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Monto a Liberar ($)</label>
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
                          padding: '0.35rem', 
                          border: releaseForm.percentage === pct ? '1px solid var(--primary)' : '1px solid #cbd5e1', 
                          backgroundColor: releaseForm.percentage === pct ? '#f0fdfa' : 'white', 
                          color: releaseForm.percentage === pct ? 'var(--primary)' : '#475569',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: releaseForm.percentage === pct ? 700 : 500,
                          fontSize: '0.82rem'
                        }}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                  <input 
                    type="number" 
                    className="form-control" 
                    style={{ fontSize: '1.2rem', padding: '0.65rem', fontWeight: 700 }}
                    value={releaseForm.amount} 
                    onChange={e => setReleaseForm({ ...releaseForm, amount: Number(e.target.value), percentage: null })} 
                    max={releaseForm.clinicTotal - releaseForm.releasedTotal}
                    min="1"
                    required 
                  />
                  <small style={{ color: 'var(--text-light)', display: 'block', marginTop: '0.4rem', fontSize: '0.72rem' }}>
                    Al confirmar, este monto se imputará al reporte de comisiones del doctor.
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button type="button" className="btn" onClick={() => setShowReleaseModal(false)} style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={17} /> Confirmar Liberación
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
