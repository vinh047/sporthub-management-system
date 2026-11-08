import type { Role } from '../store/authStore';

/** Trang chính của từng vai trò sau khi đăng nhập */
export const homePathFor = (role: Role): string =>
  ({ PLAYER: '/player', STAFF: '/staff', ADMIN: '/admin' })[role];
