
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './utils/authGuard';

// Public pages
import HomePage from './page/user/HomePage';
import LoginPage from './page/auth/LoginPage';
import RegisterPage from './page/auth/RegisterPage';
import VouchersPage from './page/user/VouchersPage';
import TournamentHubPage, {
    LegacyMyTournamentsRedirect
} from './page/user/TournamentHubPage';
import SocialSessionsPage from './page/user/SocialSessionsPage';
import SocialSessionDetailPage from './page/user/SocialSessionDetailPage';

// Player layout and pages
import PlayerLayout from './layouts/PlayerLayout';
import PlayerHomePage from './page/user/PlayerHomePage';
import BookingPage from './page/user/BookingPage';
import MyBookingsPage from './page/user/MyBookingsPage';
import ProfilePage from './page/user/ProfilePage';
import PlayerSkillsPage from './page/user/PlayerSkillsPage';
import ChangePasswordPage from './page/user/ChangePasswordPage';
import SocialTicketsPage from './page/user/SocialTicketsPage';
import PlayerRatingPage from './page/user/PlayerRatingPage';

// Admin and Staff layout
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
import SocialManagePage from './page/admin/SocialManagePage';

// Components
import ReceptionOrderModal from './components/ReceptionOrderModal';
import SignalRListener from './components/SignalRListener';

function App() {
    return (
        <BrowserRouter>
            <Toaster
                position="top-center"
                toastOptions={{
                    style: {
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-light)'
                    }
                }}
            />

            {/* Kết nối nhận thông báo SignalR */}
            <SignalRListener />

            <Routes>
                {/* ================= PUBLIC ROUTES ================= */}
                <Route path="/" element={<HomePage />} />
                <Route path="/social" element={<SocialSessionsPage />} />
                <Route path="/social/:id" element={<SocialSessionDetailPage />} />
                <Route path="/tournaments" element={<TournamentHubPage />} />
                <Route path="/vouchers" element={<VouchersPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* ================= PLAYER ROUTES ================= */}
                <Route
                    path="/player"
                    element={
                        <ProtectedRoute allowedRoles={['PLAYER']}>
                            <PlayerLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<PlayerHomePage />} />

                    {/* Booking */}
                    <Route path="booking" element={<BookingPage />} />
                    <Route path="my-bookings" element={<MyBookingsPage />} />

                    {/* Player Profile */}
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="profile/skills" element={<PlayerSkillsPage />} />
                    <Route path="profile/security" element={<ChangePasswordPage />} />

                    {/* Vouchers */}
                    <Route path="vouchers" element={<VouchersPage />} />

                    {/* Tournaments */}
                    <Route path="tournaments" element={<TournamentHubPage />} />
                    <Route
                        path="my-tournaments"
                        element={<LegacyMyTournamentsRedirect />}
                    />

                    {/* Social Sessions */}
                    <Route path="social" element={<SocialSessionsPage />} />
                    <Route path="social/:id" element={<SocialSessionDetailPage />} />
                    <Route path="social-tickets" element={<SocialTicketsPage />} />

                    {/* Player Rating */}
                    <Route path="rating" element={<PlayerRatingPage />} />
                </Route>

                {/* ================= STAFF ROUTES ================= */}
                <Route
                    path="/staff"
                    element={
                        <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
                            <AdminLayout area="staff" />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<StaffHomePage />} />

                    <Route path="reception" element={<ReceptionPage />} />
                    <Route
                        path="reception/orders/:bookingId"
                        element={<ReceptionOrderModal standalone />}
                    />
                    <Route path="pos" element={<PosPage />} />
                    <Route path="maintenance" element={<MaintenancePage />} />

                    {/* Social Management */}
                    <Route path="social" element={<SocialManagePage />} />

                    <Route path="tournaments" element={<AdminTournamentsPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                </Route>

                {/* ================= ADMIN ROUTES ================= */}
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute allowedRoles={['ADMIN']}>
                            <AdminLayout area="admin" />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<AdminHomePage />} />

                    <Route path="reception" element={<ReceptionPage />} />
                    <Route
                        path="reception/orders/:bookingId"
                        element={<ReceptionOrderModal standalone />}
                    />
                    <Route path="pos" element={<PosPage />} />
                    <Route path="maintenance" element={<MaintenancePage />} />

                    {/* Facility Management */}
                    <Route path="facilities" element={<FacilitiesPage />} />
                    <Route path="pricing" element={<PricingPage />} />
                    <Route path="promotions" element={<PromotionsPage />} />

                    {/* Staff and Player Management */}
                    <Route path="staff" element={<StaffManagementPage />} />
                    <Route path="players" element={<PlayerManagementPage />} />

                    {/* Social Management */}
                    <Route path="social" element={<SocialManagePage />} />

                    {/* Tournaments and Reports */}
                    <Route path="tournaments" element={<AdminTournamentsPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                </Route>

                {/* ================= 404 ================= */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
