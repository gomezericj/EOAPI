"use client";
import React, { createContext, useContext, useState } from 'react';
import { AlertCircle, HelpCircle, CheckCircle2 } from 'lucide-react';
import Portal from '@/components/Portal';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState({
    show: false,
    title: '',
    message: '',
    type: 'alert', // 'alert' | 'confirm' | 'success'
    onConfirm: null,
    onCancel: null
  });

  const showLoading = (state = true) => setIsLoading(state);

  const showAlert = (message, title = 'Aviso') => {
    setIsLoading(false);
    setModal({
      show: true,
      title,
      message,
      type: 'alert',
      onConfirm: () => setModal(prev => ({ ...prev, show: false })),
      onCancel: null
    });
  };

  const showConfirm = (message, onConfirm, title = 'Confirmar') => {
    setModal({
      show: true,
      title,
      message,
      type: 'confirm',
      onConfirm: async () => {
        setModal(prev => ({ ...prev, show: false }));
        await onConfirm();
      },
      onCancel: () => setModal(prev => ({ ...prev, show: false }))
    });
  };

  const showSuccess = (message, title = 'Éxito') => {
    setIsLoading(false);
    setModal({
      show: true,
      title,
      message,
      type: 'success',
      onConfirm: () => setModal(prev => ({ ...prev, show: false })),
      onCancel: null
    });
  };

  return (
    <NotificationContext.Provider value={{ showAlert, showConfirm, showSuccess, showLoading, isLoading }}>
      {children}
      
      {isLoading && (
        <Portal>
          <div className="loading-overlay-global">
            <div className="spinner" style={{ marginBottom: '1rem' }}></div>
            <p style={{ fontWeight: 500, color: 'var(--primary)' }}>Procesando solicitud...</p>
          </div>
        </Portal>
      )}

      {modal.show && (
        <Portal>
          <div className="modal-overlay">
            <div className="card" style={{ width: '400px', textAlign: 'center', padding: '2rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                {modal.type === 'confirm' ? (
                  <HelpCircle size={48} style={{ color: 'var(--secondary)' }} />
                ) : modal.type === 'success' ? (
                  <CheckCircle2 size={48} style={{ color: 'var(--success)' }} />
                ) : (
                  <AlertCircle size={48} style={{ color: 'var(--warning)' }} />
                )}
              </div>
              <h2 style={{ marginBottom: '0.5rem' }}>{modal.title}</h2>
              <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>{modal.message}</p>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                {modal.type === 'confirm' && (
                  <button type="button" className="btn" onClick={modal.onCancel} style={{ border: '1px solid var(--border)', flex: 1 }}>
                    Cancelar
                  </button>
                )}
                <button type="button" className="btn btn-primary" onClick={modal.onConfirm} style={{ flex: 1 }}>
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </NotificationContext.Provider>
  );
};
