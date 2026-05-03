"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

const BrandingContext = createContext(null);

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState({
    clinicName: 'Clínica Dental',
    logoBase64: '',
    primaryColor: '#0ea5e9'
  });

  useEffect(() => {
    fetch('/api/setup/check')
      .then(res => res.json())
      .then(data => {
        if (data.setting) {
          setBranding({
            clinicName: data.setting.clinicName || 'Clínica Dental',
            logoBase64: data.setting.logoBase64 || '',
            primaryColor: data.setting.primaryColor || '#0ea5e9'
          });
        }
      })
      .catch(console.error);
  }, []);

  return (
    <BrandingContext.Provider value={branding}>
      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --primary: ${branding.primaryColor};
        }
      `}} />
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);
