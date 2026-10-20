import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Vui lòng nhập địa chỉ email')
    .email('Địa chỉ email không đúng định dạng'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
