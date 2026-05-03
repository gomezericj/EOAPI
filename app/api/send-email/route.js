import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { report, type, month, year } = await req.json();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'reportesesteticaoral024@gmail.com',
        pass: 'rrfdawjkrzbwkwsk'
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    let mailOptions = {
      from: '"Estética Oral 2L" <reportesesteticaoral024@gmail.com>',
    };

    if (type === 'comision') {
      const { doctor } = report;
      const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      const periodString = month && year ? `${monthNames[month - 1]} ${year}` : 'el mes';
      
      mailOptions.to = doctor.email;
      mailOptions.subject = `Liquidación de Comisiones ${periodString} - ${doctor.name} ${doctor.surname}`;
      mailOptions.html = `
        <h1 style="color: #0f766e;">Reporte de Comisiones</h1>
        <p>Estimado/a <strong>${doctor.name} ${doctor.surname}</strong>,</p>
        <p>Adjuntamos el resumen de sus comisiones correspondientes al periodo <strong>${periodString}</strong>:</p>
        
        <div style="background-color: #f1f5f9; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;">
          <ul style="list-style: none; padding: 0;">
            <li style="margin-bottom: 0.5rem;"><strong>Monto Total Facturado:</strong> $${(report.totals.totalFacturado || 0).toLocaleString('es-CL')}</li>
            <li style="margin-bottom: 0.5rem; color: #dc2626;"><strong>Total Descuentos:</strong> -$${(report.totals.totalDescuentos || 0).toLocaleString('es-CL')}</li>
            <li style="margin-bottom: 0.5rem; border-top: 1px solid #cbd5e1; padding-top: 0.5rem;"><strong>Subtotal (Neto):</strong> $${report.totals.subtotal.toLocaleString('es-CL')}</li>
            <li style="margin-bottom: 0.5rem;"><strong>Comisión (${doctor.commissionPercentage}%):</strong> $${report.totals.commissionAmount.toLocaleString('es-CL')}</li>
            <li style="margin-bottom: 0.5rem; color: #dc2626;"><strong>Retención Aplicada (${report.retentionPercentage || 13}%):</strong> -$${Math.round(report.totals.retention).toLocaleString('es-CL')}</li>
            <li style="margin-top: 1rem; font-size: 1.2rem; color: #10b981;"><strong>Líquido a Pagar:</strong> $${Math.round(report.totals.totalLiquid).toLocaleString('es-CL')}</li>
          </ul>
        </div>

        <h3>Detalle de Tratamientos:</h3>
        <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 0.8rem;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th>Fecha</th>
              <th>Paciente</th>
              <th>Procedimiento</th>
              <th>Total</th>
              <th>Desc.</th>
              <th>Subtotal</th>
              <th>C.Bruta</th>
              <th>Ret. (${report.retentionPercentage || 13}%)</th>
              <th>Líquido</th>
            </tr>
          </thead>
          <tbody>
            ${report.sales.map(s => {
              const lineComm = s.clinicTotal * (report.doctor.commissionPercentage / 100);
              const lineRet = !report.doctor.hasInvoice ? (lineComm * ((report.retentionPercentage || 13) / 100)) : 0;
              const lineLiq = lineComm - lineRet;
              
              return `
                <tr>
                  <td>${new Date(s.date).toLocaleDateString('es-CL', { timeZone: 'UTC' })}</td>
                  <td>${s.patientId && typeof s.patientId === 'object' ? `${s.patientId.name || ''} ${s.patientId.surname || ''}` : 'P. no reg.'}</td>
                  <td>
                    ${s.procedureName || 'N/A'}
                    ${s.commissionReleaseDate ? '<br/><span style="background-color: #dcfce7; color: #15803d; font-size: 0.65rem; padding: 2px 4px; border-radius: 4px; font-weight: bold; border: 1px solid #15803d;">LIBERADA</span>' : ''}
                  </td>
                  <td>$${(s.totalToCollect || 0).toLocaleString('es-CL')}</td>
                  <td style="color: #dc2626;">-$${(s.discountTotal || 0).toLocaleString('es-CL')}</td>
                  <td>$${(s.clinicTotal || 0).toLocaleString('es-CL')}</td>
                  <td>$${Math.round(lineComm).toLocaleString('es-CL')}</td>
                  <td style="color: #ef4444;">-$${Math.round(lineRet).toLocaleString('es-CL')}</td>
                  <td style="font-weight: bold; color: #10b981;">$${Math.round(lineLiq).toLocaleString('es-CL')}</td>
                </tr>
              `;
            }).join('')}
            <tr style="background-color: #f1f5f9; font-weight: bold;">
              <td colspan="3">TOTALES</td>
              <td>$${(report.totals.totalFacturado || 0).toLocaleString('es-CL')}</td>
              <td style="color: #dc2626;">-$${(report.totals.totalDescuentos || 0).toLocaleString('es-CL')}</td>
              <td>$${(report.totals.subtotal || 0).toLocaleString('es-CL')}</td>
              <td>$${Math.round(report.totals.commissionAmount || 0).toLocaleString('es-CL')}</td>
              <td style="color: #ef4444;">-$${Math.round(report.totals.retention || 0).toLocaleString('es-CL')}</td>
              <td style="color: #10b981;">$${Math.round(report.totals.totalLiquid || 0).toLocaleString('es-CL')}</td>
            </tr>
          </tbody>
        </table>
        
        <p style="margin-top: 2rem; font-size: 0.9rem; color: #64748b;">Este es un correo automático generado por el Sistema de Gestión de Estética Oral 2L.</p>
      `;
    } else {
      // Default to Cierre Diario
      mailOptions.to = ['gomez.ericj@gmail.com', 'elizabethlopez1803@gmail.com'];
      mailOptions.subject = `Cierre Diario de Caja - ${new Date(report.date || Date.now()).toLocaleDateString('es-CL', { timeZone: 'UTC'})}`;
      mailOptions.html = `
        <div style="font-family: Arial, sans-serif; color: #334155; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #025158; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Reporte de Cierre Diario</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">${new Date(report.date || Date.now()).toLocaleDateString('es-CL', { timeZone: 'UTC'})}</p>
          </div>
          
          <div style="padding: 20px; background-color: #f8fafc;">
            
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
              <tr>
                <td style="background-color: white; border-radius: 8px; padding: 15px; border-left: 4px solid #f59e0b; box-shadow: 0 1px 3px rgba(0,0,0,0.1); width: 48%;">
                  <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase;">Venta Clínica (Tratamientos Históricos)</p>
                  <h2 style="margin: 5px 0 0; color: #f59e0b; font-size: 22px;">$${(report.clinicalSaleTotal || 0).toLocaleString('es-CL')}</h2>
                </td>
                <td width="4%"></td>
                <td style="background-color: white; border-radius: 8px; padding: 15px; border-left: 4px solid #3b82f6; box-shadow: 0 1px 3px rgba(0,0,0,0.1); width: 48%;">
                  <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase;">Total Recaudado (Caja Fuerte)</p>
                  <h2 style="margin: 5px 0 0; color: #3b82f6; font-size: 22px;">$${(report.totalCollectedGeneral || 0).toLocaleString('es-CL')}</h2>
                </td>
              </tr>
            </table>

            <div style="background-color: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px;">
              <h3 style="margin-top: 0; color: #f59e0b; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Desglose Venta Clínica (${new Date(report.date || Date.now()).toLocaleDateString('es-CL', { timeZone: 'UTC'})})</h3>
              <ul style="list-style: none; padding: 0; margin: 0; line-height: 2;">
                <li><strong>Efectivo:</strong> $${(report.todayTotals?.cash || 0).toLocaleString('es-CL')}</li>
                <li><strong>Débito:</strong> $${(report.todayTotals?.debit || 0).toLocaleString('es-CL')}</li>
                <li><strong>Crédito:</strong> $${(report.todayTotals?.credit || 0).toLocaleString('es-CL')}</li>
                <li><strong>Transferencia:</strong> $${(report.todayTotals?.transfer || 0).toLocaleString('es-CL')}</li>
                <li><strong>Seguro:</strong> $${(report.todayTotals?.insurance || 0).toLocaleString('es-CL')}</li>
                <li style="color: #ef4444;"><strong>Pendiente por Cobrar:</strong> $${(report.pendingTotal || 0).toLocaleString('es-CL')}</li>
              </ul>
            </div>

            <div style="background-color: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px;">
              <h3 style="margin-top: 0; color: #10b981; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Desglose Abonos a Deuda Pasada</h3>
              <ul style="list-style: none; padding: 0; margin: 0; line-height: 2;">
                <li><strong>Efectivo:</strong> $${(report.pastTotals?.cash || 0).toLocaleString('es-CL')}</li>
                <li><strong>Débito:</strong> $${(report.pastTotals?.debit || 0).toLocaleString('es-CL')}</li>
                <li><strong>Crédito:</strong> $${(report.pastTotals?.credit || 0).toLocaleString('es-CL')}</li>
                <li><strong>Transferencia:</strong> $${(report.pastTotals?.transfer || 0).toLocaleString('es-CL')}</li>
                <li><strong>Seguro:</strong> $${(report.pastTotals?.insurance || 0).toLocaleString('es-CL')}</li>
                <li style="border-top: 1px dashed #e2e8f0; margin-top: 5px; padding-top: 5px; color: #10b981; font-weight: bold;"><strong>Total Abonos (Caja extra):</strong> $${(report.pastDebtCollected || 0).toLocaleString('es-CL')}</li>
              </ul>
            </div>

            <div style="background-color: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h3 style="margin-top: 0; color: #025158; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Resumen Operativo Contable</h3>
              <table width="100%" cellpadding="5" cellspacing="0" style="line-height: 1.5;">
                <tr>
                  <td>Pacientes Atendidos:</td>
                  <td align="right"><strong>${report.totalPatients || 0}</strong></td>
                </tr>
                <tr>
                  <td>Dinero Total Recaudado (Billetes/TRX) (+) :</td>
                  <td align="right"><strong>$${(report.totalCollectedGeneral || 0).toLocaleString('es-CL')}</strong></td>
                </tr>
                <tr style="color: #ef4444;">
                  <td>Egresos de Caja (-) :</td>
                  <td align="right"><strong>-$${(report.expensesTotal || 0).toLocaleString('es-CL')}</strong></td>
                </tr>
                <tr style="color: #f59e0b;">
                  <td>Pagos por Seguro retenidos (-) :</td>
                  <td align="right"><strong>-$${(report.insuranceTotal || 0).toLocaleString('es-CL')}</strong></td>
                </tr>
                <tr>
                  <td colspan="2"><hr style="border: 0; border-top: 2px solid #025158; margin: 10px 0;" /></td>
                </tr>
                <tr style="font-size: 18px; color: #025158;">
                  <td><strong>SUBTOTAL NETO (Caja Diaria) :</strong></td>
                  <td align="right"><strong>$${(report.netSubtotal || 0).toLocaleString('es-CL')}</strong></td>
                </tr>
              </table>
            </div>

          </div>
          <div style="background-color: #e2e8f0; text-align: center; padding: 15px; font-size: 12px; color: #64748b;">
            Este es un reporte automático generado por el Sistema Gestor de Estética Oral 2L.
          </div>
        </div>
      `;
    }

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, message: 'Reporte enviado con éxito' });
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
