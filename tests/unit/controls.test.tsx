import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DimmerSlider } from '@/components/controls/DimmerSlider';
import { ColorPicker } from '@/components/controls/ColorPicker';
import { RadialDial } from '@/components/controls/RadialDial';

describe('Reusable Controls', () => {
  describe('DimmerSlider', () => {
    it('renders with current value and proper aria attributes', () => {
      render(<DimmerSlider value={75} onCommit={vi.fn()} />);

      const slider = screen.getByRole('slider', { name: /light brightness dimmer/i });
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '100');
      expect(slider).toHaveAttribute('aria-valuenow', '75');
      expect(slider).toHaveAttribute('aria-valuetext', '75 percent');
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('changes value via keyboard arrow keys and commits', async () => {
      const handleCommit = vi.fn();
      render(<DimmerSlider value={50} onCommit={handleCommit} />);

      const slider = screen.getByRole('slider');
      slider.focus();

      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      expect(handleCommit).toHaveBeenCalledWith(51);

      fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      expect(handleCommit).toHaveBeenCalledWith(50);
    });

    it('handles Home and End keys hitting min and max', () => {
      const handleCommit = vi.fn();
      render(<DimmerSlider value={50} onCommit={handleCommit} />);

      const slider = screen.getByRole('slider');
      slider.focus();

      fireEvent.keyDown(slider, { key: 'Home' });
      expect(handleCommit).toHaveBeenCalledWith(0);
      expect(screen.getByText('0% (Off)')).toBeInTheDocument();

      fireEvent.keyDown(slider, { key: 'End' });
      expect(handleCommit).toHaveBeenCalledWith(100);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('handles disabled state with aria-disabled and ignores keyboard interaction', () => {
      const handleCommit = vi.fn();
      render(
        <DimmerSlider
          value={40}
          onCommit={handleCommit}
          disabled={true}
          disabledReason="Hardware unreachable"
        />
      );

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByText('Hardware unreachable')).toBeInTheDocument();

      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      expect(handleCommit).not.toHaveBeenCalled();
    });
  });

  describe('ColorPicker', () => {
    it('renders swatches and hex input with selected color preview', () => {
      render(<ColorPicker value="#FFFFFF" onCommit={vi.fn()} />);

      const swatches = screen.getAllByRole('button', { name: /^color /i });
      expect(swatches.length).toBe(8);

      const whiteSwatch = screen.getByRole('button', { name: /color #ffffff/i });
      expect(whiteSwatch).toHaveAttribute('aria-pressed', 'true');

      const hexInput = screen.getByLabelText(/hex color code/i);
      expect(hexInput).toHaveValue('#FFFFFF');
    });

    it('commits preset color when swatch clicked', async () => {
      const user = userEvent.setup();
      const handleCommit = vi.fn();
      render(<ColorPicker value="#FFFFFF" onCommit={handleCommit} />);

      const amberSwatch = screen.getByRole('button', { name: /color #ffedd5/i });
      await user.click(amberSwatch);

      expect(handleCommit).toHaveBeenCalledWith('#FFEDD5');
    });

    it('validates hex input on blur and commits valid hex', async () => {
      const user = userEvent.setup();
      const handleCommit = vi.fn();
      render(<ColorPicker value="#FFFFFF" onCommit={handleCommit} />);

      const hexInput = screen.getByLabelText(/hex color code/i);
      await user.clear(hexInput);
      await user.type(hexInput, '#86EFAC{enter}');

      expect(handleCommit).toHaveBeenCalledWith('#86EFAC');
    });

    it('reverts invalid hex input back to original value on blur', async () => {
      const user = userEvent.setup();
      const handleCommit = vi.fn();
      render(<ColorPicker value="#FFFFFF" onCommit={handleCommit} />);

      const hexInput = screen.getByLabelText(/hex color code/i);
      await user.clear(hexInput);
      await user.type(hexInput, 'invalid');
      fireEvent.blur(hexInput);

      expect(handleCommit).not.toHaveBeenCalled();
      expect(hexInput).toHaveValue('#FFFFFF');
    });

    it('respects disabled state and ignores clicks', async () => {
      const user = userEvent.setup();
      const handleCommit = vi.fn();
      render(
        <ColorPicker
          value="#FFFFFF"
          onCommit={handleCommit}
          disabled={true}
          disabledReason="Device offline"
        />
      );

      const amberSwatch = screen.getByRole('button', { name: /color #ffedd5/i });
      expect(amberSwatch).toHaveAttribute('aria-disabled', 'true');
      await user.click(amberSwatch);

      expect(handleCommit).not.toHaveBeenCalled();
    });
  });

  describe('RadialDial', () => {
    it('renders with role="slider" and proper aria values in °C', () => {
      render(
        <RadialDial
          current={21.5}
          target={22.0}
          min={16}
          max={30}
          unit="C"
          onCommit={vi.fn()}
        />
      );

      const dial = screen.getByRole('slider', { name: /thermostat target temperature/i });
      expect(dial).toBeInTheDocument();
      expect(dial).toHaveAttribute('aria-valuemin', '16');
      expect(dial).toHaveAttribute('aria-valuemax', '30');
      expect(dial).toHaveAttribute('aria-valuenow', '22');
      expect(dial).toHaveAttribute('aria-valuetext', '22°C');
      expect(screen.getByText('Current: 21.5°C')).toBeInTheDocument();
      expect(screen.getByText('Heating')).toBeInTheDocument();
    });

    it('steps target temperature with ArrowUp and ArrowDown keys', () => {
      const handleCommit = vi.fn();
      render(
        <RadialDial
          current={21.5}
          target={22.0}
          min={16}
          max={30}
          unit="C"
          onCommit={handleCommit}
        />
      );

      const dial = screen.getByRole('slider');
      dial.focus();

      fireEvent.keyDown(dial, { key: 'ArrowUp' });
      expect(handleCommit).toHaveBeenCalledWith(22.5);

      fireEvent.keyDown(dial, { key: 'ArrowDown' });
      expect(handleCommit).toHaveBeenCalledWith(22.0);
    });

    it('hits min and max with Home and End keys and clamps', () => {
      const handleCommit = vi.fn();
      render(
        <RadialDial
          current={21.5}
          target={22.0}
          min={16}
          max={30}
          unit="C"
          onCommit={handleCommit}
        />
      );

      const dial = screen.getByRole('slider');
      dial.focus();

      fireEvent.keyDown(dial, { key: 'Home' });
      expect(handleCommit).toHaveBeenCalledWith(16);

      // Press ArrowDown at minimum -> clamps at 16
      fireEvent.keyDown(dial, { key: 'ArrowDown' });
      expect(handleCommit).toHaveBeenCalledWith(16);

      fireEvent.keyDown(dial, { key: 'End' });
      expect(handleCommit).toHaveBeenCalledWith(30);

      // Press ArrowUp at maximum -> clamps at 30
      fireEvent.keyDown(dial, { key: 'ArrowUp' });
      expect(handleCommit).toHaveBeenCalledWith(30);
    });

    it('displays rejected feedback when provided', () => {
      render(
        <RadialDial
          current={21.5}
          target={22.0}
          min={16}
          max={30}
          unit="C"
          rejectedFeedback="Target exceeds allowable limit"
          onCommit={vi.fn()}
        />
      );

      expect(screen.getByRole('alert')).toHaveTextContent('Target exceeds allowable limit');
    });

    it('handles disabled state and ignores input', () => {
      const handleCommit = vi.fn();
      render(
        <RadialDial
          current={21.5}
          target={22.0}
          min={16}
          max={30}
          unit="C"
          disabled={true}
          disabledReason="Sensor connection lost"
          onCommit={handleCommit}
        />
      );

      const dial = screen.getByRole('slider');
      expect(dial).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByText('Sensor connection lost')).toBeInTheDocument();

      fireEvent.keyDown(dial, { key: 'ArrowUp' });
      expect(handleCommit).not.toHaveBeenCalled();
    });
  });
});
