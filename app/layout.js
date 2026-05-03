import './globals.css';
import Sidebar from '@/components/Sidebar';
import { NotificationProvider } from '@/context/NotificationContext';
import SessionWrapper from '@/components/SessionWrapper';
import AppContent from '@/components/AppContent';
import NavigationProgressBar from '@/components/NavigationProgressBar';
import { BrandingProvider } from '@/context/BrandingContext';

export const metadata = {
  title: 'Estética Oral 2L',
  description: 'Gestión de pacientes, tratamientos y comisiones',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body suppressHydrationWarning>
        <SessionWrapper>
          <BrandingProvider>
            <NotificationProvider>
              <NavigationProgressBar />
              <AppContent>{children}</AppContent>
            </NotificationProvider>
          </BrandingProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
