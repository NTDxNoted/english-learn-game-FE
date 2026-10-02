import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Vui lòng nhập địa chỉ email')
      .email('Địa chỉ email không đúng định dạng'),
    displayName: z
      .string()
      .min(3, 'Tên hiển thị phải từ 3 đến 20 ký tự')
      .max(20, 'Tên hiển thị phải từ 3 đến 20 ký tự'),
    password: z
      .string()
      .min(8, 'Mật khẩu phải từ 8 đến 64 ký tự')
      .max(64, 'Mật khẩu phải từ 8 đến 64 ký tự')
      .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa')
      .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ cái viết thường')
      .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 chữ số')
      .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (!@#$%^&*...)'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận lại mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;
