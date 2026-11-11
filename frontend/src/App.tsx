
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './utils/authGuard';

import HomePage from './page/user/HomePage';
import LoginPage from './page/auth/LoginPage';
import RegisterPage from './page/auth/RegisterPage';

import PlayerLayout from './layouts/PlayerLayout';
import PlayerHomePage from './page/user/PlayerHomePage';
import BookingPage from './page/user/BookingPage';
import MyBookingsPage from './page/user/MyBookingsPage';
import VouchersPage from './page/user/VouchersPage';
import ProfilePage from './page/user/ProfilePage';
import PlayerSkillsPage from './page/user/PlayerSkillsPage';
import ChangePasswordPage from './page/user/ChangePasswordPage';
import TournamentHubPage, {
    LegacyMyTournamentsRedirect
} from './page/user/TournamentHubPage';

import AdminLayout from './layouts/AdminLayout';
import StaffHomePage from './page/admin/StaffHomePage';
import AdminHomePage from './page/admin/AdminHomePage';
import ReceptionPage from './page/admin/ReceptionPage';
import PosPage from './page/admin/PosPage';
import FacilitiesPage from './page/admin/FacilitiesPage';
import MaintenancePage from './page/admin/MaintenancePage';
import PricingPage from './page/admin/PricingPage';
import PromotionsPage from './page/admin/PromotionsPage';
import AdminTournamentsPage from './page/admin/AdminTournamentsPage';
import ReportsPage from './page/admin/ReportsPage';
import StaffManagementPage from './page/admin/StaffManagementPage';
import PlayerManagementPage from './page/admin/PlayerManagementPage';

import ReceptionOrderModal from './components/ReceptionOrderModal';
import SignalRListener from './components/SignalRListener';

function App() {
    return (
        <BrowserRouter>
        <Toaster
                position= "top-center"
    toastOptions = {{
        style: {
            background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                    border: '1px solid var(--border-light)'
        }
    }
}
            />

{/* Kết nối nhận thông báo SignalR */ }
<SignalRListener />

    <Routes>
{/* Các trang công khai */ }
<Route path="/" element = {< HomePage />} />
    < Route path = "/tournaments" element = {< TournamentHubPage />} />
        < Route path = "/vouchers" element = {< VouchersPage />} />
            < Route path = "/login" element = {< LoginPage />} />
                < Route path = "/register" element = {< RegisterPage />} />

{/* Khu vực người chơi */ }
<Route
                    path="/player"
element = {
                        < ProtectedRoute allowedRoles = { ['PLAYER']} >
    <PlayerLayout />
    </ProtectedRoute>
                    }
                >
    <Route index element = {< PlayerHomePage />} />
        < Route path = "vouchers" element = {< VouchersPage />} />
            < Route path = "profile" element = {< ProfilePage />} />
                < Route path = "profile/skills" element = {< PlayerSkillsPage />} />
                    < Route path = "profile/security" element = {< ChangePasswordPage />} />
                        < Route path = "booking" element = {< BookingPage />} />
                            < Route path = "my-bookings" element = {< MyBookingsPage />} />
                                < Route path = "tournaments" element = {< TournamentHubPage />} />
                                    < Route
path = "my-tournaments"
element = {< LegacyMyTournamentsRedirect />}
                    />
    </Route>

{/* Khu vực nhân viên - Admin cũng được phép truy cập */ }
<Route
                    path="/staff"
element = {
                        < ProtectedRoute allowedRoles = { ['STAFF', 'ADMIN']} >
    <AdminLayout area="staff" />
        </ProtectedRoute>
                    }
                >
    <Route index element = {< StaffHomePage />} />
        < Route path = "reception" element = {< ReceptionPage />} />
            < Route
path = "reception/orders/:bookingId"
element = {< ReceptionOrderModal standalone />}
                    />
    < Route path = "pos" element = {< PosPage />} />
        < Route path = "maintenance" element = {< MaintenancePage />} />
            < Route path = "tournaments" element = {< AdminTournamentsPage />} />
                < Route path = "reports" element = {< ReportsPage />} />
                    </Route>

{/* Khu vực quản trị viên */ }
<Route
                    path="/admin"
element = {
                        < ProtectedRoute allowedRoles = { ['ADMIN']} >
    <AdminLayout area="admin" />
        </ProtectedRoute>
                    }
                >
    <Route index element = {< AdminHomePage />} />
        < Route path = "reception" element = {< ReceptionPage />} />
            < Route
path = "reception/orders/:bookingId"
element = {< ReceptionOrderModal standalone />}
                    />
    < Route path = "pos" element = {< PosPage />} />
        < Route path = "maintenance" element = {< MaintenancePage />} />
            < Route path = "facilities" element = {< FacilitiesPage />} />
                < Route path = "pricing" element = {< PricingPage />} />
                    < Route path = "promotions" element = {< PromotionsPage />} />
                        < Route path = "staff" element = {< StaffManagementPage />} />
                            < Route path = "players" element = {< PlayerManagementPage />} />
                                < Route path = "tournaments" element = {< AdminTournamentsPage />} />
                                    < Route path = "reports" element = {< ReportsPage />} />
                                        </Route>

{/* Trang không tồn tại */ }
<Route path="*" element = {< Navigate to = "/" replace />} />
    </Routes>
    </BrowserRouter>
    );
}

export default App;
