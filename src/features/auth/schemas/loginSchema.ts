import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Vui lòng nhập địa chỉ email')
    .email('Địa chỉ email không đúng định dạng'),
  password: z
    .string()
    .min(1, 'Vui lòng nhập mật khẩu'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
