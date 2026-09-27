# Hướng dẫn phát triển tính năng Frontend (React 18 + Vite + Tailwind CSS v3) 🎨

Tài liệu này tổng hợp toàn bộ các thành phần cốt lõi đã được xây dựng sẵn trong Base Frontend của dự án **SportHub**. Frontend Team sẽ sử dụng các tiện ích này để phát triển UI nhanh chóng và chuẩn xác.

---

## 📂 Cấu trúc thư mục (Folder Structure)

```text
frontend/
├── src/
│   ├── api/             # Chứa Axios instance và các file định nghĩa API (authApi.ts, bookingApi.ts)
│   ├── hooks/           # Các custom hook, đặc biệt là hook kết nối SignalR (useSignalR.ts)
│   ├── store/           # Chứa Global State bằng Zustand (authStore.ts)
│   ├── utils/           # Các tiện ích dùng chung (authGuard.tsx chặn route)
│   ├── App.tsx          # File điều hướng (React Router) chính
│   └── index.css        # Import Tailwind & Hệ thống CSS Variables cao cấp
├── tailwind.config.js   # Cấu hình Tailwind (kết nối với CSS Variables của dự án)
└── postcss.config.js    # Cấu hình PostCSS cho Tailwind
```

---

## 🚀 5 Thành phần cốt lõi đã được thiết lập

### 1. Quản lý trạng thái với Zustand (`authStore.ts`)
Thay vì dùng Redux phức tạp, dự án dùng Zustand cực kỳ tinh gọn.
- **Tính năng:** Lưu thông tin `user` và `token` của người dùng. Tự động đồng bộ vào `localStorage` để khi F5 tải lại trang không bị văng đăng xuất.
- **Cách dùng:**
```tsx
import { useAuthStore } from '../store/authStore';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  
  return isAuthenticated ? 
    <button onClick={logout}>Đăng xuất ({user?.fullName})</button> : 
    <button>Đăng nhập</button>;
}
```

### 2. Giao tiếp API tự động gắn Token (`axiosInstance.ts`)
- **Tính năng:** Mọi request được gửi qua `axiosInstance` sẽ tự động trích xuất JWT Token từ `authStore` và nhét vào Header. Nếu Backend trả về lỗi `401 Unauthorized` (Token hết hạn), Axios sẽ tự động gọi hàm `logout()` và đẩy user ra màn hình đăng nhập.
- **Cách dùng:**
```typescript
import { axiosInstance } from '../api/axiosInstance';

export const getBookings = () => axiosInstance.get('/bookings'); // KHÔNG CẦN TỰ TRUYỀN TOKEN!
```

### 3. Bảo vệ Route & Phân quyền (`authGuard.tsx`)
- **Tính năng:** Chặn người dùng truy cập các trang không được phép.
- **Cách dùng:** Trong file `App.tsx`, bọc giao diện bằng `<ProtectedRoute>`.
```tsx
<Route 
  path="/admin/dashboard" 
  element={
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AdminDashboard />
    </ProtectedRoute>
  } 
/>
```

### 4. Kết nối Real-time (SignalR Hooks)
- **Tính năng:** Lắng nghe dữ liệu thời gian thực từ Backend (WebSockets).
- **Cách dùng:** 
```tsx
import { useSignalR, useCourtStatus } from '../hooks/useSignalR';

const CourtList = ({ facilityId }) => {
  // Tự động nhận thông báo (Toast) khi có Push Notification
  useSignalR(); 

  // Lắng nghe trạng thái sân của cơ sở (Facility) này
  useCourtStatus(facilityId);

  return <div>Giao diện danh sách sân...</div>;
}
```

### 5. Hệ thống UI với Tailwind CSS v3 & Design System (`tailwind.config.js`)
- **Tính năng:** Thay vì code CSS tay, bạn có thể dùng **100% Tailwind CSS**. Tuy nhiên, để đảm bảo Design System nhất quán (kèm hỗ trợ tự động Dark/Light Mode), tôi đã cấu hình file `tailwind.config.js` liên kết với các biến màu Premium trong `index.css`.
- **Cách dùng:** Đừng dùng màu cứng như `bg-red-500`. Hãy dùng các utility class tuỳ chỉnh của dự án:
  - Màu nền: `bg-background` (Nền chính), `bg-surface` (Nền cho khối nổi/card).
  - Màu chữ: `text-text` (Chữ chính), `text-muted` (Chữ phụ).
  - Màu chủ đạo: `bg-primary`, `text-primary`.
  - Hiệu ứng kính (CSS thủ công): class `glass`.

---

## 🛠️ Ví dụ thực tế: Code nhanh 1 màn hình Đăng Nhập bằng Tailwind

Dưới đây là minh họa cách kết hợp toàn bộ các thành phần trên lại với nhau để code màn hình Login.

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';

export const LoginPage = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await authApi.login({ phoneNumber: phone, password });
      const { user, token } = response.data.data;
      
      login(user, token); // Lưu token
      toast.success("Đăng nhập thành công!");
      
      if (user.role === 'ADMIN') navigate('/admin');
      else navigate('/player');
      
    } catch (error) {
      toast.error("Sai số điện thoại hoặc mật khẩu");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {/* 
        Sử dụng Tailwind kết hợp class 'glass' cho giao diện Premium 
        Lưu ý dùng border-border, bg-surface, text-text để hỗ trợ Dark Mode tự động 
      */}
      <div className="glass p-8 rounded-lg shadow-lg max-w-md w-full animate-fade-in border border-border">
        <h2 className="text-2xl font-bold text-center text-text mb-6">Đăng Nhập SportHub</h2>
        
        <form onSubmit={handleLogin}>
          <input 
            className="w-full p-3 mb-4 bg-surface text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            placeholder="Số điện thoại" 
            value={phone} 
            onChange={e => setPhone(e.target.value)} 
          />
          <input 
            className="w-full p-3 mb-6 bg-surface text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            type="password" 
            placeholder="Mật khẩu" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
          <button 
            type="submit" 
            className="btn btn-primary w-full py-3 rounded text-white font-semibold shadow-md hover:shadow-lg transition-transform hover:-translate-y-1"
          >
            Đăng Nhập
          </button>
        </form>
      </div>
    </div>
  );
};
```
