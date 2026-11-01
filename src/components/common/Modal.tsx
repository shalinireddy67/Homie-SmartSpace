import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Focus trap & Escape key listener
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement && lastElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement && firstElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement | null;
      document.addEventListener('keydown', handleKeyDown);

      // Focus first interactive element or modal container
      const timer = setTimeout(() => {
        if (modalRef.current) {
          const firstFocusable = modalRef.current.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            modalRef.current.focus();
          }
        }
      }, 50);

      // Prevent background body scroll
      document.body.style.overflow = 'hidden';

      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        if (previouslyFocusedElement.current) {
          previouslyFocusedElement.current.focus();
        }
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  const titleId = 'modal-title';
  const descId = description ? 'modal-description' : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog container */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className={`relative w-full ${sizeClasses[size]} bg-surface text-text rounded-2xl border border-border shadow-2xl z-10 overflow-hidden transform transition-all my-8 outline-none`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-text">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-xs text-text-muted mt-0.5">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-text-muted hover:text-text"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 text-sm">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-3.5 bg-surface-subtle/50 border-t border-border/80">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

