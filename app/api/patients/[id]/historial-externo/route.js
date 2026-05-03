import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Patient from '@/models/Patient';
import ApiConnection from '@/models/ApiConnection';

export async function GET(req, { params }) {
  const { id } = await params;

  try {
    await dbConnect();
    const patient = await Patient.findById(id);
    if (!patient) {
      return NextResponse.json({ error: 'Paciente no encontrado localmente' }, { status: 404 });
    }

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
        instructions: 'Vaya a Configuración > Integraciones y active la conexión correspondiente.' 
      }, { status: 403 });
    }

    const { baseUrl: rawBaseUrl, apiKey: rawApiKey, settings } = connection;
    const apiKey = rawApiKey?.trim();
    // URL Base limpia sin slash al final
    let cleanedBaseUrl = rawBaseUrl.trim().endsWith('/') ? rawBaseUrl.trim().slice(0, -1) : rawBaseUrl.trim();
    
    // Rutas dinámicas desde configuración (Agnóstico)
    const endpoints = settings?.endpoints || {};
    
    // Fallbacks inteligentes y limpieza de placeholders
    const getPath = (p, def) => {
      let path = p || def;
      if (!path.startsWith('/')) path = '/' + path;
      return path; // No reemplazamos llaves globales para no romper JSON
    };

    const pathSearch = getPath(endpoints.search, "/api/v1/pacientes?q={\"rut\":{\"eq\":\"{rut}\"}}");
    const pathAntecedentes = getPath(endpoints.history_antecedents, "/api/v2/pacientes/{externalId}/antecedentesmedicos");
    const pathEvoluciones = getPath(endpoints.history_evoluciones, "/api/v1/pacientes/{externalId}/evoluciones");
    const pathCitas = getPath(endpoints.history_citas, "/api/v1/pacientes/{externalId}/citas");
    const pathTratamientos = getPath(endpoints.history_tratamientos, "/api/v1/pacientes/{externalId}/tratamientos");
    const pathDetalleTrat = getPath(endpoints.history_tratamiento_detalle, "/api/v2/tratamientos/{id}/detalles");

    const rawRut = patient.rut.trim();
    
    // Normalización de RUTs (Esto sí es un poco específico de Chile, pero útil)
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
      // Reemplazar el placeholder
      const relativePath = pathSearch.replace('{rut}', term).replace('{term}', term);
      
      // Construir URL robusta con encoding de parámetros
      let finalUrl = "";
      try {
        if (relativePath.includes('?')) {
          const firstQuestionMark = relativePath.indexOf('?');
          const pathPart = relativePath.substring(0, firstQuestionMark);
          const queryPart = relativePath.substring(firstQuestionMark + 1);
          
          const urlObj = new URL(cleanedBaseUrl + pathPart);
          
          // Extraer la query y codificarla correctamente (solo el primer =)
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
        details: `RUT: ${rawRut}. Error: ${lastError || 'Sin respuesta'}`
      });
    }

    const headers = { 'Authorization': `Token ${apiKey}`, 'Accept': 'application/json' };

    // 2. Fetch de datos usando rutas configuradas
    const [anteRes, evoRes, citasRes, tratRes] = await Promise.all([
      fetch(`${cleanedBaseUrl}${pathAntecedentes.replace('{externalId}', externalId).replace('{{externalId}}', externalId)}`, { headers }),
      fetch(`${cleanedBaseUrl}${pathEvoluciones.replace('{externalId}', externalId).replace('{{externalId}}', externalId)}`, { headers }),
      fetch(`${cleanedBaseUrl}${pathCitas.replace('{externalId}', externalId).replace('{{externalId}}', externalId)}`, { headers }),
      fetch(`${cleanedBaseUrl}${pathTratamientos.replace('{externalId}', externalId).replace('{{externalId}}', externalId)}`, { headers })
    ]);

    const anteData = anteRes.ok ? await anteRes.json() : { data: [] };
    const evoData = evoRes.ok ? await evoRes.json() : { data: [] };
    const citasData = citasRes.ok ? await citasRes.json() : { data: [] };
    const tratData = tratRes.ok ? await tratRes.json() : { data: [] };

    // Detalles de tratamientos (V2 opcional)
    const recentTrats = (tratData.data || []).slice(0, 10);
    const detailPromises = recentTrats.map(t => 
      fetch(`${cleanedBaseUrl}${pathDetalleTrat.replace('{id}', t.id).replace('{{id}}', t.id)}`, { headers })
        .then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
    );
    const detailsResults = await Promise.all(detailPromises);

    // Consolidación de Timeline
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
      const planNombre = recentTrats[idx].nombre_tratamiento || `#${planId}`;
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
      antecedentes: anteData.data || [],
      timeline: timeline
    });

  } catch (error) {
    console.error('Unified History Driver Error:', error);
    return NextResponse.json({ error: 'Error del motor de integración' }, { status: 500 });
  }
}
