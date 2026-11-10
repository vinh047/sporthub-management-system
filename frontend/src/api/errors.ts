import axios from 'axios';

/** Lấy thông báo lỗi dễ đọc từ BaseResponse của backend */
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'Không kết nối được máy chủ.';
    const data = err.response.data as { message?: string; errors?: string[] } | undefined;
    if (data?.errors?.length) return data.errors.join(' ');
    if (data?.message) return data.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Đã có lỗi xảy ra.';
}
