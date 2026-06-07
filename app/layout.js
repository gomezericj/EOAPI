import React, { Suspense } from 'react';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { NotificationProvider } from '@/context/NotificationContext';
import SessionWrapper from '@/components/SessionWrapper';
import AppContent from '@/components/AppContent';
import NavigationProgressBar from '@/components/NavigationProgressBar';
import { BrandingProvider } from '@/context/BrandingContext';
import dbConnect from '@/lib/mongodb';
import Setting from '@/models/Setting';

export const metadata = {
  title: 'Estética Oral 2L',
  description: 'Gestión de pacientes, tratamientos y comisiones',
};

export default async function RootLayout({ children }) {
  await dbConnect();
  // Fetch branding setting from DB (assuming there's only one setting doc)
  const settingDoc = await Setting.findOne() || {};
  
  const initialBranding = {
    clinicName: settingDoc.clinicName || 'Clínica Dental',
    logoBase64: settingDoc.logoBase64 || '',
    primaryColor: settingDoc.primaryColor || '#0ea5e9'
  };

  return (
    <html lang="es">
      <head>
        <style dangerouslySetInnerHTML={{__html: `
          :root {
            --primary: ${initialBranding.primaryColor};
          }
        `}} />
      </head>
      <body suppressHydrationWarning>
        <SessionWrapper>
          <BrandingProvider initialBranding={initialBranding}>
            <NotificationProvider>
              <Suspense fallback={null}>
                <NavigationProgressBar />
              </Suspense>
              <AppContent>{children}</AppContent>
            </NotificationProvider>
          </BrandingProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
