import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';

const ModalTestWrapper: React.FC<{ onCloseMock?: () => void }> = ({
  onCloseMock,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button data-testid="open-modal-btn" onClick={() => setIsOpen(true)}>
        Open Modal
      </button>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          onCloseMock?.();
        }}
        title="Test Modal Title"
        description="Test modal description"
        footer={<Button data-testid="modal-confirm">Confirm</Button>}
      >
        <p>Modal body content</p>
        <button data-testid="inside-btn">Inside Button</button>
      </Modal>
    </div>
  );
};

describe('Modal component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Test">
        <p>Hidden</p>
      </Modal>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders title, description, and content when open', () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Living Room Thermostat"
        description="Set temperature setpoint"
      >
        <p>Current setting: 72°F</p>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Living Room Thermostat')).toBeInTheDocument();
    expect(screen.getByText('Set temperature setpoint')).toBeInTheDocument();
    expect(screen.getByText('Current setting: 72°F')).toBeInTheDocument();
  });

  it('closes on Escape key and triggers onClose', async () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Escape Test">
        <p>Press Escape</p>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('restores focus to previously focused element when closed', async () => {
    const user = userEvent.setup();
    render(<ModalTestWrapper />);

    const openBtn = screen.getByTestId('open-modal-btn');
    openBtn.focus();
    expect(document.activeElement).toBe(openBtn);

    // Open modal
    await user.click(openBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Close modal via Escape
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.activeElement).toBe(openBtn);
    });
  });

  it('traps focus inside the modal on Tab and Shift+Tab', () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Focus Trap Test"
        footer={<button data-testid="last-action">Done</button>}
      >
        <input data-testid="input-field" type="text" />
      </Modal>
    );

    const closeBtn = screen.getByLabelText('Close dialog');
    const inputField = screen.getByTestId('input-field');
    const lastAction = screen.getByTestId('last-action');

    // Focus input field
    inputField.focus();
    expect(document.activeElement).toBe(inputField);

    // Focus last element and press Tab -> should cycle to first focusable (closeBtn)
    lastAction.focus();
    expect(document.activeElement).toBe(lastAction);

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(closeBtn);

    // Focus first element and press Shift+Tab -> should cycle to last focusable (lastAction)
    closeBtn.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastAction);
  });
});
