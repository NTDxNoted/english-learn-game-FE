import { z } from 'zod';

export const verifyRegisterSchema = z.object({
  email: z
    .string()
    .min(1, 'Vui lòng nhập địa chỉ email')
    .email('Địa chỉ email không đúng định dạng'),
  code: z
    .string()
    .min(1, 'Vui lòng nhập mã OTP xác minh')
    .length(6, 'Mã OTP phải bao gồm đúng 6 chữ số')
    .regex(/^\d{6}$/, 'Mã OTP chỉ bao gồm các chữ số'),
});

export type VerifyRegisterFormData = z.infer<typeof verifyRegisterSchema>;
