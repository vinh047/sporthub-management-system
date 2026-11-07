import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { LoaderCircle, Megaphone, Percent, Plus, TicketPercent } from 'lucide-react';
import { getErrorMessage } from '../../api/errors';
import { promotionApi } from '../../api/promotionApi';
import type { CreatePromotionRequest, Promotion } from '../../api/promotionApi';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 focus:border-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/10';
const toLocalInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const DEFAULT_START_DATE = toLocalInput(new Date());
const DEFAULT_END_DATE = toLocalInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    promoCode: '', title: '', discountType: 'Percentage' as 'Percentage' | 'FixedAmount',
    discountValue: '10', maxDiscountAmount: '', minOrderAmount: '0',
    usageLimitTotal: '', usageLimitPerUser: '1',
    startDate: DEFAULT_START_DATE,
    endDate: DEFAULT_END_DATE,
    isOffPeakOnly: false,
  });

  const loadPromotions = useCallback(async () => {
    try {
      setPromotions(await promotionApi.getActive());
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPromotions(); }, [loadPromotions]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const body: CreatePromotionRequest = {
        promoCode: form.promoCode.trim().toUpperCase(),
        title: form.title.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
        minOrderAmount: Number(form.minOrderAmount),
        usageLimitTotal: form.usageLimitTotal ? Number(form.usageLimitTotal) : null,
        usageLimitPerUser: Number(form.usageLimitPerUser),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        isOffPeakOnly: form.isOffPeakOnly,
      };
      await promotionApi.create(body);
      toast.success('Đã tạo chương trình khuyến mãi.');
      setForm((current) => ({ ...current, promoCode: '', title: '' }));
      await loadPromotions();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <p className="text-sm font-medium text-red-700">UC22 · Campaign & voucher</p>
        <h2 className="mt-1 text-2xl font-bold">Khuyến mãi</h2>
        <p className="mt-1 text-sm text-gray-500">Tạo mã giảm giá phần trăm/số tiền, giới hạn sử dụng và ưu đãi giờ thấp điểm.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
          <h3 className="flex items-center gap-2 font-semibold"><Plus size={18} className="text-red-700" />Tạo chiến dịch</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mã khuyến mãi"><input required maxLength={30} value={form.promoCode} onChange={(e) => setForm({ ...form, promoCode: e.target.value.toUpperCase().replace(/\s/g, '') })} placeholder="VD: PICKLE20" className={inputClass} /></Field>
            <Field label="Tên chương trình"><input required maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ưu đãi giờ thấp điểm" className={inputClass} /></Field>
            <Field label="Loại giảm"><select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as 'Percentage' | 'FixedAmount' })} className={inputClass}><option value="Percentage">Phần trăm (%)</option><option value="FixedAmount">Số tiền cố định</option></select></Field>
            <Field label={form.discountType === 'Percentage' ? 'Mức giảm (%)' : 'Mức giảm (đồng)'}><input required type="number" min={0.01} max={form.discountType === 'Percentage' ? 100 : undefined} step={form.discountType === 'Percentage' ? 0.1 : 1000} value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} className={inputClass} /></Field>
            <Field label="Giảm tối đa (đồng)"><input type="number" min={0} step={1000} value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })} placeholder="Không giới hạn" className={inputClass} /></Field>
            <Field label="Đơn tối thiểu (đồng)"><input required type="number" min={0} step={1000} value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} className={inputClass} /></Field>
            <Field label="Tổng lượt dùng"><input type="number" min={1} value={form.usageLimitTotal} onChange={(e) => setForm({ ...form, usageLimitTotal: e.target.value })} placeholder="Không giới hạn" className={inputClass} /><span className="text-xs text-gray-500">Chỉ tính voucher đã áp dụng thành công vào đơn.</span></Field>
            <Field label="Lượt dùng mỗi người"><input required type="number" min={1} value={form.usageLimitPerUser} onChange={(e) => setForm({ ...form, usageLimitPerUser: e.target.value })} className={inputClass} /></Field>
            <Field label="Bắt đầu"><input required type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputClass} /></Field>
            <Field label="Kết thúc"><input required type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={inputClass} /></Field>
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
            <input type="checkbox" checked={form.isOffPeakOnly} onChange={(e) => setForm({ ...form, isOffPeakOnly: e.target.checked })} className="mt-1 accent-red-700" />
            <span><span className="block text-sm font-semibold text-amber-900">Chỉ áp dụng giờ thấp điểm</span><span className="mt-0.5 block text-xs text-amber-800">Khi áp dụng voucher vào đơn, máy chủ tự kiểm tra khung giờ đặt sân.</span></span>
          </label>
          <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-60">
            {submitting ? <LoaderCircle size={17} className="animate-spin" /> : <Megaphone size={17} />}Tạo khuyến mãi
          </button>
        </form>

        <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><h3 className="font-semibold">Mã đang hoạt động</h3><p className="text-xs text-gray-500">Dữ liệu lấy từ chương trình có hiệu lực hiện tại.</p></div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-700"><TicketPercent size={19} /></span>
          </div>
          {loading ? <Loading /> : promotions.length === 0
            ? <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">Chưa có khuyến mãi đang hoạt động.</div>
            : <ul className="space-y-3">
              {promotions.map((promo) => <li key={promo.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="truncate font-semibold text-gray-900">{promo.title}</p><p className="mt-1 text-xs text-gray-500">{promo.promoCode}</p></div>
                  <span className="shrink-0 rounded-lg bg-red-50 px-2.5 py-1 text-sm font-bold text-red-700">{promo.discountType === 'Percentage' ? `${promo.discountValue}%` : `${promo.discountValue.toLocaleString('vi-VN')} đ`}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="rounded-md bg-gray-50 px-2 py-1">Đơn từ {promo.minOrderAmount.toLocaleString('vi-VN')} đ</span>
                  {promo.maxDiscountAmount !== null && <span className="rounded-md bg-gray-50 px-2 py-1">Tối đa {promo.maxDiscountAmount.toLocaleString('vi-VN')} đ</span>}
                  {promo.isOffPeakOnly && <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-800"><Percent size={12} className="mr-1 inline" />Giờ thấp điểm</span>}
                  {promo.usageLimitTotal !== null && <span className="rounded-md bg-gray-50 px-2 py-1">Tối đa {promo.usageLimitTotal} voucher</span>}
                  <span className="rounded-md bg-gray-50 px-2 py-1">Tối đa {promo.usageLimitPerUser}/người</span>
                </div>
                <p className="mt-2 text-[11px] text-gray-400">{new Date(promo.startDate).toLocaleDateString('vi-VN')} – {new Date(promo.endDate).toLocaleDateString('vi-VN')}</p>
              </li>)}
            </ul>}
        </section>
      </div>
      <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Giới hạn lượt dùng và ghi nhận sử dụng voucher cần được hoàn thiện đồng bộ với luồng Booking/Social trước khi chạy nghiệp vụ thật.</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium text-gray-700">{label}</span>{children}</label>;
}

function Loading() {
  return <div className="flex items-center gap-2 py-8 text-sm text-gray-500"><LoaderCircle size={16} className="animate-spin" />Đang tải...</div>;
}
