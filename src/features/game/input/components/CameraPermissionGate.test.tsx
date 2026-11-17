// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CameraPermissionGate } from './CameraPermissionGate';

afterEach(cleanup);

it('renders back button and triggers camera, mouse, and back handlers', async () => {
  const onAllowCamera = vi.fn();
  const onUseMouse = vi.fn();
  const onBack = vi.fn();

  render(
    <CameraPermissionGate
      onAllowCamera={onAllowCamera}
      onUseMouse={onUseMouse}
      onBack={onBack}
    />,
  );

  await userEvent.click(screen.getByRole('button', { name: /Cho phép & Bật camera/i }));
  await userEvent.click(screen.getByRole('button', { name: /Chơi bằng chuột \/ cảm ứng/i }));
  await userEvent.click(screen.getByRole('button', { name: /Quay về danh sách chủ đề/i }));

  expect(onAllowCamera).toHaveBeenCalledTimes(1);
  expect(onUseMouse).toHaveBeenCalledTimes(1);
  expect(onBack).toHaveBeenCalledTimes(1);
});
