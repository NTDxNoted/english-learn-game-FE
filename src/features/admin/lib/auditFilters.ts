import { compactFilters } from './adminForms';
export function auditFilters(values: Record<string, string>): Record<string, unknown> {
  const params: Record<string, unknown> = compactFilters(values);
  if (params.scope === 'GLOBAL') delete params.topicId;
  for (const key of ['topicId', 'actorUserId']) {
    if (params[key] && (!/^\d+$/.test(String(params[key])) || !Number.isSafeInteger(Number(params[key])) || Number(params[key]) <= 0)) throw new Error(`${key} phải là ID nguyên dương.`);
  }
  if (params.operationId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(params.operationId))) throw new Error('Operation ID phải là UUID hợp lệ.');
  for (const key of ['changedFrom', 'changedTo']) {
    if (params[key]) {
      const date = new Date(String(params[key]) + '+07:00');
      if (!Number.isFinite(date.getTime())) throw new Error('Thời gian lọc không hợp lệ.');
      params[key] = date.toISOString();
    }
  }
  if (params.changedFrom && params.changedTo && String(params.changedFrom) > String(params.changedTo)) throw new Error('Thời gian bắt đầu phải trước hoặc bằng thời gian kết thúc.');
  return params;
}
export function auditDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(date) : value;
}
