'use client';
import React, { ReactNode } from 'react';
import { Button } from './index';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'primary',
  isLoading = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div 
        className="w-full max-w-sm bg-card border border-border-2 rounded-2xl shadow-2xl overflow-hidden animate-fadeUp"
        style={{ animationDuration: '0.2s' }}
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-ink mb-2">{title}</h3>
          <p className="text-[13.5px] text-muted leading-relaxed">
            {message}
          </p>
        </div>
        
        <div className="px-6 py-4 bg-surface flex justify-end gap-3 border-t border-border">
          <Button 
            variant="ghost" 
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button 
            variant={variant === 'danger' ? 'danger' : 'primary'} 
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
