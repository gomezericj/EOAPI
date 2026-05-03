import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ApiConnection from '@/models/ApiConnection';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const rawRut = searchParams.get('rut');

  if (!rawRut) {
    return NextResponse.json({ error: 'RUT es requerido' }, { status: 400 });
  }

  await dbConnect();

  try {
    // Buscar la conexión activa (puede ser por provider o por systemKey)
    let connection = await ApiConnection.findOne({ systemKey: 'DENTALINK_PACIENTES', isActive: true });
    if (!connection) {
       connection = await ApiConnection.findOne({ provider: { $regex: new RegExp('^dentalink$', 'i') }, isActive: true });
    }

    if (!connection) {
      return NextResponse.json({ error: 'La conexión externa no está activa o configurada' }, { status: 403 });
    }

    const { baseUrl: rawBaseUrl, apiKey: rawApiKey, settings } = connection;
    const apiKey = rawApiKey?.trim();
    let cleanedBaseUrl = rawBaseUrl.trim().endsWith('/') ? rawBaseUrl.trim().slice(0, -1) : rawBaseUrl.trim();

    // Rutas dinámicas desde configuración (Agnóstico)
    const endpoints = settings?.endpoints || {};
    const pathSearch = endpoints.search || "/api/v1/pacientes?q={\"rut\":{\"eq\":\"{rut}\"}}";

    // Normalización de RUTs para búsqueda exhaustiva
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

    let foundPatientData = null;

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

        const response = await fetch(finalUrl, {
          headers: { 
            'Authorization': `Token ${apiKey}`, 
            'Accept': 'application/json' 
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const patient = data.data[0];
            foundPatientData = {
              name: patient.nombre,
              surname: patient.apellidos,
              email: patient.email,
              phone: patient.telefono || patient.celular
            };
            break;
          }
        }
      } catch (e) {
        console.error(`Attempt failed for ${finalUrl}:`, e.message);
      }
    }

    if (foundPatientData) {
      return NextResponse.json({
        found: true,
        patient: foundPatientData
      });
    }

    return NextResponse.json({ found: false });
  } catch (error) {
    console.error('Dentalink API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
