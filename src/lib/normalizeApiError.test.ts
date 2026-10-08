import { AxiosError, AxiosHeaders } from 'axios';
import { expect, it } from 'vitest';
import { normalizeApiError } from './normalizeApiError';
function response(data: unknown, status: number) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, { data, status, statusText: '', headers: {}, config });
}
it('keeps ACCOUNT_BLOCKED from code', () => expect(normalizeApiError(response({ code: 'ACCOUNT_BLOCKED', message: 'Blocked' }, 403))).toMatchObject({ errorCode: 'ACCOUNT_BLOCKED', message: 'Blocked', statusCode: 403 }));
it('keeps Cognito errors instead of classifying them as expired sessions', () => expect(normalizeApiError(response({ code: 'COGNITO_ACCESS_DENIED', message: 'Local block committed' }, 502))).toMatchObject({ errorCode: 'COGNITO_ACCESS_DENIED', statusCode: 502 }));
it('uses detail when message is absent', () => expect(normalizeApiError(response({ detail: 'Invalid name' }, 400)).message).toBe('Invalid name'));
it.each([null, '', '<html>Bad gateway</html>'])('handles non-JSON body %s', (data) => expect(normalizeApiError(response(data, 502)).message).toContain('Dịch vụ bên ngoài'));
it('handles timeouts as an uncertain outcome', () => expect(normalizeApiError(new AxiosError('Timeout', 'ECONNABORTED')).message).toContain('vẫn đang xử lý'));
