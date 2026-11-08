import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LoaderCircle, TicketPercent } from 'lucide-react';
import { PublicSiteFooter, PublicSiteHeader } from '../../components/PublicSiteChrome';
import { getErrorMessage } from '../../api/errors';
import { promotionApi } from '../../api/promotionApi';
import type { Promotion, UserVoucher } from '../../api/promotionApi';
import { useAuthStore } from '../../store/authStore';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 focus:border-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/10';

export default function VouchersPage() {
  const { isAuthenticated, user } = useAuthStore();
  const isPlayer = isAuthenticated && user?.role === 'PLAYER';
  const location = useLocation();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [wallet, setWallet] = useState<UserVoucher[]>([]);
  const [bookingId, setBookingId] = useState('');
  const [selectedVoucherId, setSelectedVoucherId] = useState('');
  const [loading, setLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setWalletError(null);
    try {
      const available = await promotionApi.getActive();
      setPromotions(available);
      if (isPlayer) {
        try {
          setWallet(await promotionApi.getWallet());
        } catch (error) {
          setWallet([]);
          setWalletError(getErrorMessage(error));
          toast.error(getErrorMessage(error));
        }
      } else {
        setWallet([]);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [isPlayer]);

  useEffect(() => { void loadData(); }, [loadData]);

  const claim = async (promotionId: number) => {
    setClaimingId(promotionId);
    try {
      const voucher = await promotionApi.claim(promotionId);
      setWallet((current) => [voucher, ...current]);
      setSelectedVoucherId(String(voucher.id));
      toast.success('Đã thêm voucher vào ví của bạn.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setClaimingId(null);
    }
  };

  const redeem = async () => {
    if (!selectedVoucherId || !bookingId || Number(bookingId) < 1) {
      toast.error('Chọn voucher và nhập ID đơn đặt sân đang giữ chỗ.');
      return;
    }
    setRedeeming(true);
    try {
      const result = await promotionApi.redeem({
        userVoucherId: Number(selectedVoucherId),
        bookingId: Number(bookingId),
      });
      setWallet((current) => current.map((voucher) =>
        voucher.id === Number(selectedVoucherId) ? { ...voucher, isUsed: true, usedAt: new Date().toISOString() } : voucher));
      toast.success(`Đã áp dụng voucher. Giảm ${result.discountAmount.toLocaleString('vi-VN')} đ.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setRedeeming(false);
    }
  };

  const availableVouchers = wallet.filter((voucher) => !voucher.isUsed && new Date(voucher.expiresAt) >= new Date());

  return (
    <div id="top" className="min-h-screen flex flex-col bg-background text-text">
      <PublicSiteHeader />
      <main className="max-w-6xl mx-auto w-full flex-1 px-4 py-8 md:py-12">
      <div className="space-y-6 animate-fade-in">
      <section>
        <p className="text-sm font-medium text-red-700">Ưu đãi · UC22–UC23</p>
        <h2 className="mt-1 text-2xl font-bold">{isPlayer ? 'Khuyến mãi & ví voucher' : 'Khuyến mãi đang mở'}</h2>
        <p className="mt-1 text-sm text-gray-500">Xem ưu đãi công khai; đăng nhập để nhận voucher và quản lý ví cá nhân.</p>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="font-semibold">Khuyến mãi đang mở</h3>
          <p className="text-xs text-gray-500">Hạn mức lượt dùng được tính khi voucher được áp dụng thành công vào đơn.</p>
        </div>
        {loading ? <Loading label="Đang tải khuyến mãi..." />
          : promotions.length === 0 ? <Empty text="Hiện chưa có khuyến mãi hoạt động." />
            : <div className="grid gap-4 md:grid-cols-2">
              {promotions.map((promo) => <article key={promo.id} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700"><TicketPercent size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold">{promo.title}</h4>
                    <p className="mt-1 text-xs text-gray-500">Mã {promo.promoCode} · Đơn từ {promo.minOrderAmount.toLocaleString('vi-VN')} đ</p>
                    <p className="mt-1 text-xs text-gray-500">{promo.isOffPeakOnly ? 'Chỉ áp dụng giờ thấp điểm · ' : ''}Hạn {new Date(promo.endDate).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <strong className="shrink-0 rounded-lg bg-red-50 px-2.5 py-1 text-sm text-red-700">
                    {promo.discountType === 'Percentage' ? `${promo.discountValue}%` : `${promo.discountValue.toLocaleString('vi-VN')} đ`}
                  </strong>
                </div>
                {isPlayer
                  ? <button type="button" onClick={() => void claim(promo.id)} disabled={claimingId !== null} className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                    {claimingId === promo.id && <LoaderCircle size={16} className="animate-spin" />}Nhận voucher
                  </button>
                  : <Link to="/login" state={{ from: location }} className="mt-4 flex items-center justify-center rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">Đăng nhập để nhận ưu đãi</Link>}
              </article>)}
            </div>}
      </section>

      {isPlayer ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
          <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div><h3 className="font-semibold">Ví voucher của tôi</h3><p className="text-xs text-gray-500">Voucher đã nhận từ các chương trình.</p></div>
              <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{wallet.length} voucher</span>
            </div>
            {walletError ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{walletError}</p>
              : loading ? <Loading label="Đang tải ví voucher..." />
              : wallet.length === 0 ? <Empty text="Ví voucher đang trống. Nhận một ưu đãi ở phía trên." />
                : <ul className="space-y-3">
                  {wallet.map((voucher) => {
                    const expired = new Date(voucher.expiresAt) < new Date();
                    return <li key={voucher.id} className={`rounded-xl border p-4 ${voucher.isUsed || expired ? 'border-gray-100 bg-gray-50 opacity-70' : 'border-red-100 bg-red-50/50'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="font-semibold">{voucher.title}</p><p className="mt-1 font-mono text-sm text-red-700">{voucher.promoCode}</p></div>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${voucher.isUsed ? 'bg-gray-200 text-gray-600' : expired ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {voucher.isUsed ? 'Đã sử dụng' : expired ? 'Hết hạn' : 'Có thể dùng'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {voucher.discountType === 'Percentage' ? `Giảm ${voucher.discountValue}%` : `Giảm ${voucher.discountValue.toLocaleString('vi-VN')} đ`}
                        {voucher.maxDiscountAmount !== null ? ` · Tối đa ${voucher.maxDiscountAmount.toLocaleString('vi-VN')} đ` : ''}
                        {` · HSD ${new Date(voucher.expiresAt).toLocaleDateString('vi-VN')}`}
                      </p>
                    </li>;
                  })}
                </ul>}
          </section>

          <section className="h-fit space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div><h3 className="font-semibold">Áp dụng voucher vào đơn</h3><p className="mt-1 text-xs text-gray-500">Chỉ áp dụng được cho đơn đang giữ chỗ, chưa hết hạn và thuộc tài khoản của bạn.</p></div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-700">Voucher</span>
              <select value={selectedVoucherId} onChange={(e) => setSelectedVoucherId(e.target.value)} className={inputClass}>
                <option value="">Chọn voucher</option>
                {availableVouchers.map((voucher) => <option key={voucher.id} value={voucher.id}>{voucher.promoCode} · {voucher.title}</option>)}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-700">ID đơn đặt sân</span>
              <input required type="number" min={1} value={bookingId} onChange={(e) => setBookingId(e.target.value)} placeholder="ID đơn đang giữ chỗ" className={inputClass} />
            </label>
            <button type="button" onClick={() => void redeem()} disabled={redeeming || availableVouchers.length === 0} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60">
              {redeeming && <LoaderCircle size={17} className="animate-spin" />}Áp dụng vào đơn
            </button>
            <p className="text-xs text-gray-500">Máy chủ kiểm tra đơn tối thiểu và giờ thấp điểm, sau đó cập nhật số tiền đơn và đánh dấu voucher đã dùng trong cùng transaction.</p>
          </section>
        </div>
      ) : <section className="rounded-2xl border border-red-100 bg-red-50/60 p-6 text-center">
        <h3 className="font-semibold text-gray-900">Ưu đãi công khai dành cho mọi người</h3>
        <p className="mt-1 text-sm text-gray-600">{isAuthenticated ? 'Ví voucher chỉ dành cho tài khoản người chơi.' : 'Bạn có thể xem các chương trình khuyến mãi mà không cần đăng nhập. Đăng nhập hoặc đăng ký để nhận voucher và quản lý ví ưu đãi của mình.'}</p>
        <div className="mt-4 flex justify-center gap-3">
          {!isAuthenticated && <>
            <Link to="/login" state={{ from: location }} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">Đăng nhập</Link>
            <Link to="/register" className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Đăng ký</Link>
          </>}
        </div>
      </section>}
      </div>
      </main>
      <PublicSiteFooter />
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500"><LoaderCircle size={16} className="animate-spin" />{label}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-7 text-center text-sm text-gray-500">{text}</div>;
}
