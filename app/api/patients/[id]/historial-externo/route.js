import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Patient from '@/models/Patient';
import ApiConnection from '@/models/ApiConnection';
import Sale from '@/models/Sale';

export async function GET(req, { params }) {
  const { id } = await params;

  try {
    await dbConnect();
    const patient = await Patient.findById(id);
    if (!patient) {
      return NextResponse.json({ error: 'Paciente no encontrado localmente' }, { status: 404 });
    }

    // Obtener ventas y pagos locales del paciente
    const localSales = await Sale.find({ patientId: patient._id }).lean();
    let localTotalVentas = 0;
    let localTotalPagos = 0;
    let localSaldoPendiente = 0;
    const localPagos = [];

    (localSales || []).forEach(sale => {
      localTotalVentas += Number(sale.totalToCollect) || 0;
      localSaldoPendiente += Number(sale.pendingAmount) || 0;
      
      (sale.payments || []).forEach((pay, idx) => {
        const payAmt = Number(pay.amount) || 0;
        localTotalPagos += payAmt;
        const payDate = pay.date ? new Date(pay.date) : new Date(sale.date);
        const fechaStr = !isNaN(payDate.getTime()) ? payDate.toISOString().split('T')[0] : '';
        const horaStr = !isNaN(payDate.getTime()) ? payDate.toTimeString().split(' ')[0].slice(0, 5) : '';
        
        localPagos.push({
          id: `local-${sale._id}-${idx}`,
          origen: 'Sistema Local',
          monto: payAmt,
          medio: pay.method ? (pay.method.charAt(0).toUpperCase() + pay.method.slice(1)) : 'Pago',
          fecha: fechaStr,
          hora: horaStr,
          referencia: sale.procedureName ? `Prestación: ${sale.procedureName}` : (sale.doctorName ? `Dr/a: ${sale.doctorName}` : ''),
          sucursal: 'Estética Oral',
          timestamp: !isNaN(payDate.getTime()) ? payDate.getTime() : 0
        });
      });
    });

    // Buscar conexión activa
    let connection = await ApiConnection.findOne({ 
      provider: { $regex: new RegExp('^dentalink$', 'i') }, 
      isActive: true 
    });

    if (!connection) {
      connection = await ApiConnection.findOne({ systemKey: 'DENTALINK_PACIENTES', isActive: true });
    }

    if (!connection) {
      return NextResponse.json({ 
        error: 'Integración no configurada o inactiva.',
        instructions: 'Vaya a Configuración > Integraciones y active la conexión correspondiente.',
        finanzas: {
          totalGastado: localTotalVentas,
          totalPagado: localTotalPagos,
          saldoPendiente: localSaldoPendiente,
          dentalink: { totalTratamientos: 0, totalPagos: 0, deuda: 0 },
          local: { totalVentas: localTotalVentas, totalPagos: localTotalPagos, saldoPendiente: localSaldoPendiente },
          pagos: localPagos,
          tratamientos: []
        }
      }, { status: 403 });
    }

    const { baseUrl: rawBaseUrl, apiKey: rawApiKey, settings } = connection;
    const apiKey = rawApiKey?.trim();
    // URL Base limpia sin slash al final
    let cleanedBaseUrl = rawBaseUrl.trim().endsWith('/') ? rawBaseUrl.trim().slice(0, -1) : rawBaseUrl.trim();
    
    // Rutas dinámicas desde configuración
    const endpoints = settings?.endpoints || {};
    
    const getPath = (p, def) => {
      let path = p || def;
      if (!path.startsWith('/')) path = '/' + path;
      return path;
    };

    const pathSearch = getPath(endpoints.search, "/api/v1/pacientes?q={\"rut\":{\"eq\":\"{rut}\"}}");
    const pathEvoluciones = getPath(endpoints.history_evoluciones, "/api/v1/pacientes/{externalId}/evoluciones");
    const pathCitas = getPath(endpoints.history_citas, "/api/v1/pacientes/{externalId}/citas");
    const pathTratamientos = getPath(endpoints.history_tratamientos, "/api/v1/pacientes/{externalId}/tratamientos");
    const pathDetalleTrat = getPath(endpoints.history_tratamiento_detalle, "/api/v2/tratamientos/{id}/detalles");

    const rawRut = patient.rut.trim();
    
    // Normalización de RUTs
    const normalizeRUT = (r) => {
      let clean = r.replace(/[^0-9kK]/g, '');
      if (clean.length < 2) return clean;
      const body = clean.slice(0, -1);
      const dv = clean.slice(-1).toUpperCase();
      return `${body}-${dv}`;
    };

    const addDots = (r) => {
      let clean = r.replace(/[^0-9kK]/g, '');
      if (clean.length < 2) return clean;
      const dv = clean.slice(-1);
      let body = clean.slice(0, -1);
      body = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return `${body}-${dv}`;
    };

    const formattedRut = normalizeRUT(rawRut);
    const dottedRut = addDots(rawRut);
    const searchTerms = Array.from(new Set([rawRut, formattedRut, dottedRut, rawRut.replace(/-/g, '')]));

    let externalId = null;
    let lastError = null;

    // 1. Ubicar paciente externamente usando la ruta configurada
    for (const term of searchTerms) {
      const relativePath = pathSearch.replace('{rut}', term).replace('{term}', term);
      
      let finalUrl = "";
      try {
        if (relativePath.includes('?')) {
          const firstQuestionMark = relativePath.indexOf('?');
          const pathPart = relativePath.substring(0, firstQuestionMark);
          const queryPart = relativePath.substring(firstQuestionMark + 1);
          
          const urlObj = new URL(cleanedBaseUrl + pathPart);
          
          if (queryPart.includes('=')) {
             const firstEqual = queryPart.indexOf('=');
             const qKey = queryPart.substring(0, firstEqual);
             const qVal = queryPart.substring(firstEqual + 1);
             urlObj.searchParams.set(qKey, qVal); 
          }
          finalUrl = urlObj.toString();
        } else {
          finalUrl = cleanedBaseUrl + relativePath;
        }

        const searchRes = await fetch(finalUrl, {
          headers: { 
            'Authorization': `Token ${apiKey}`, 
            'Accept': 'application/json'
          }
        });
        
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.data && searchData.data.length > 0) {
            let foundPatient = searchData.data[0];
            externalId = foundPatient.id;
            break; 
          }
        } else {
          lastError = `Status ${searchRes.status} calling: ${finalUrl}`;
        }
      } catch (e) {
        lastError = `Error: ${e.message} - URL: ${finalUrl}`;
      }
    }

    if (!externalId) {
      return NextResponse.json({ 
        found: false, 
        message: 'Paciente no hallado en el sistema externo.',
        details: `RUT: ${rawRut}. Error: ${lastError || 'Sin respuesta'}`,
        finanzas: {
          totalGastado: localTotalVentas,
          totalPagado: localTotalPagos,
          saldoPendiente: localSaldoPendiente,
          dentalink: { totalTratamientos: 0, totalPagos: 0, deuda: 0 },
          local: { totalVentas: localTotalVentas, totalPagos: localTotalPagos, saldoPendiente: localSaldoPendiente },
          pagos: localPagos,
          tratamientos: []
        }
      });
    }

    const headers = { 'Authorization': `Token ${apiKey}`, 'Accept': 'application/json' };

    // 2. Fetch de datos usando rutas configuradas
    const pQuery = JSON.stringify({ id_paciente: { eq: Number(externalId) || externalId } });
    const pagosUrl = `${cleanedBaseUrl}/v1/pagos?q=${encodeURIComponent(pQuery)}`;

    const [evoRes, citasRes, tratRes, pagosRes] = await Promise.all([
      fetch(`${cleanedBaseUrl}${pathEvoluciones.replace('{externalId}', externalId).replace('{{externalId}}', externalId)}`, { headers }),
      fetch(`${cleanedBaseUrl}${pathCitas.replace('{externalId}', externalId).replace('{{externalId}}', externalId)}`, { headers }),
      fetch(`${cleanedBaseUrl}${pathTratamientos.replace('{externalId}', externalId).replace('{{externalId}}', externalId)}`, { headers }),
      fetch(pagosUrl, { headers })
    ]);

    const evoData = evoRes.ok ? await evoRes.json() : { data: [] };
    const citasData = citasRes.ok ? await citasRes.json() : { data: [] };
    const tratData = tratRes.ok ? await tratRes.json() : { data: [] };
    const pagosData = pagosRes.ok ? await pagosRes.json() : { data: [] };

    // Procesar pagos de Dentalink
    const dentalinkPagos = (pagosData.data || []).map(p => ({
      id: `dl-${p.id}`,
      origen: 'Dentalink',
      monto: Number(p.monto_pago) || 0,
      medio: p.medio_pago || 'Pago Dentalink',
      fecha: p.fecha_recepcion || (p.fecha_creacion ? p.fecha_creacion.split(' ')[0] : ''),
      hora: p.fecha_creacion && p.fecha_creacion.includes(' ') ? p.fecha_creacion.split(' ')[1].slice(0, 5) : '',
      referencia: p.numero_referencia || '',
      sucursal: p.nombre_sucursal || '',
      timestamp: new Date(p.fecha_creacion || p.fecha_recepcion || 0).getTime()
    }));

    // Procesar tratamientos de Dentalink
    let dentalinkTotalTratamientos = 0;
    let dentalinkAbonadoTratamientos = 0;
    let dentalinkDeuda = 0;

    const tratamientos = (tratData.data || []).map(t => {
      const tot = Number(t.total) || 0;
      const abn = Number(t.abonado) || 0;
      const deu = Number(t.deuda) || 0;
      dentalinkTotalTratamientos += tot;
      dentalinkAbonadoTratamientos += abn;
      dentalinkDeuda += deu;
      return {
        id: t.id,
        nombre: t.nombre || t.nombre_tratamiento || 'Plan de Tratamiento',
        total: tot,
        abonado: abn,
        deuda: deu,
        fecha: t.fecha,
        doctor: t.nombre_dentista || 'Profesional',
        sucursal: t.nombre_sucursal || ''
      };
    });

    const sumDentalinkPagos = dentalinkPagos.reduce((acc, curr) => acc + curr.monto, 0);
    const realDentalinkPagos = Math.max(sumDentalinkPagos, dentalinkAbonadoTratamientos);

    // Totales combinados
    const totalGastado = dentalinkTotalTratamientos + localTotalVentas;
    const totalPagado = realDentalinkPagos + localTotalPagos;
    const saldoPendiente = Math.max(0, totalGastado - totalPagado);
    const historialPagos = [...dentalinkPagos, ...localPagos].sort((a, b) => b.timestamp - a.timestamp);

    // Detalles de tratamientos (V2 opcional)
    const recentTrats = (tratData.data || []).slice(0, 10);
    const detailPromises = recentTrats.map(t => 
      fetch(`${cleanedBaseUrl}${pathDetalleTrat.replace('{id}', t.id).replace('{{id}}', t.id)}`, { headers })
        .then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
    );
    const detailsResults = await Promise.all(detailPromises);

    // Consolidación de Timeline Clínico
    const timeline = [];

    (evoData.data || []).forEach(e => {
      timeline.push({
        tipo: 'evolucion',
        fecha: e.fecha,
        hora: e.hora || '',
        doctor: e.nombre_dentista || 'Profesional',
        descripcion: e.evolucion || e.comentario || 'Nota clínica',
        detalles: e.tratamiento ? `Tratamiento: ${e.tratamiento}` : null,
        timestamp: new Date(e.fecha + (e.hora ? ` ${e.hora}` : '')).getTime()
      });
    });

    (citasData.data || []).forEach(c => {
      timeline.push({
        tipo: 'cita',
        fecha: c.fecha,
        hora: c.hora_inicio || '',
        doctor: c.nombre_dentista || 'Clínica',
        descripcion: `CITA AGENDADA: ${c.nombre_estado || 'Programada'}`,
        detalles: `Sucursal: ${c.nombre_sucursal || 'Principal'}`,
        timestamp: new Date(c.fecha + (c.hora_inicio ? ` ${c.hora_inicio}` : '')).getTime()
      });
    });

    detailsResults.forEach((dr, idx) => {
      const planId = recentTrats[idx].id;
      const planNombre = recentTrats[idx].nombre || recentTrats[idx].nombre_tratamiento || `#${planId}`;
      (dr.data || []).filter(det => det.realizado === 1).forEach(det => {
        timeline.push({
          tipo: 'accion',
          fecha: det.fecha_realizacion || det.fecha_creacion,
          hora: det.hora_realizacion || '00:00:00',
          doctor: det.dentista_realizador || 'Profesional',
          descripcion: `${det.nombre_prestacion || 'Prestación realizada'}`,
          detalles: `Plan de tratamiento: ${planNombre}.`,
          sede: det.nombre_sucursal || 'Clínica',
          timestamp: new Date((det.fecha_realizacion || det.fecha_creacion) + ' ' + (det.hora_realizacion || '00:00:00')).getTime()
        });
      });
    });

    timeline.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({
      found: true,
      provider: connection.provider,
      externalId,
      finanzas: {
        totalGastado,
        totalPagado,
        saldoPendiente,
        dentalink: {
          totalTratamientos: dentalinkTotalTratamientos,
          totalPagos: realDentalinkPagos,
          deuda: dentalinkDeuda
        },
        local: {
          totalVentas: localTotalVentas,
          totalPagos: localTotalPagos,
          saldoPendiente: localSaldoPendiente
        },
        pagos: historialPagos,
        tratamientos
      },
      timeline: timeline
    });

  } catch (error) {
    console.error('Unified History Driver Error:', error);
    return NextResponse.json({ error: 'Error del motor de integración' }, { status: 500 });
  }
}
