import type { ApiResponse } from './checkHealth';

export const requestData = async <T>(
  promise: Promise<{ data: ApiResponse<T> }>,
): Promise<T> => {
  const response = (await promise).data;
  if (!response.success || response.data == null) {
    throw new Error(response.message || response.errors?.join(' ') || 'Máy chủ không trả về dữ liệu hợp lệ.');
  }
  return response.data;
};

export const requestAction = async (
  promise: Promise<{ data: ApiResponse<unknown> }>,
): Promise<void> => {
  const response = (await promise).data;
  if (!response.success) {
    throw new Error(response.message || response.errors?.join(' ') || 'Thao tác không thành công.');
  }
};
