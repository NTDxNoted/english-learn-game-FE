import { z } from 'zod';

export const resetPasswordSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Vui lòng nhập địa chỉ email')
      .email('Địa chỉ email không đúng định dạng'),
    code: z
      .string()
      .min(6, 'Mã xác minh phải đúng 6 chữ số')
      .max(6, 'Mã xác minh phải đúng 6 chữ số'),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu phải từ 8 đến 64 ký tự')
      .max(64, 'Mật khẩu phải từ 8 đến 64 ký tự')
      .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa')
      .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ cái viết thường')
      .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 chữ số')
      .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (!@#$%^&*...)'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận lại mật khẩu'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
