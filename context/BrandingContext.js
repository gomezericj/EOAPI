"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

const BrandingContext = createContext(null);

export const BrandingProvider = ({ children, initialBranding }) => {
  const [branding, setBranding] = useState(initialBranding || {
    clinicName: 'Clínica Dental',
    logoBase64: '',
    primaryColor: '#0ea5e9'
  });

  // Si el usuario cambia el color desde la interfaz, lo aplicamos de inmediato al root HTML
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--primary', branding.primaryColor);
    }
  }, [branding.primaryColor]);

  return (
    <BrandingContext.Provider value={{ branding, setBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  // Compatibilidad: antes retornaba directamente "branding", ahora retorna { branding, setBranding }
  // Para no romper otras partes del código que esperan solo el objeto branding, devolvemos el objeto extendido.
  return { ...context.branding, setBranding: context.setBranding };
};
