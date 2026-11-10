import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import type { LucideIcon } from 'lucide-react';
import {
  Banknote, CalendarCheck, CircleCheck, Clock, Grid, History, Landmark,
  ListRestart, LoaderCircle, LogIn, Radio, Search, Store,
} from 'lucide-react';
import type { SlotAvailability } from '../../api/bookingApi';
import { checkInApi } from '../../api/checkInApi';
import type { CheckInChannel, CheckInHistoryItem, CheckInItem } from '../../api/checkInApi';
import { getErrorMessage } from '../../api/errors';
import { facilityApi } from '../../api/facilityApi';
import type { CourtAvailability, Facility, Sport } from '../../api/facilityModels';
import { posApi } from '../../api/posApi';
import CourtTimeGrid from '../../components/CourtTimeGrid';
import { useCourtStatus } from '../../hooks/useSignalR';
import type { CourtSlotUpdate } from '../../hooks/useSignalR';
import { useAuthStore } from '../../store/authStore';

const PAYMENT_METHODS: { id: number; label: string; icon: LucideIcon }[] = [
  { id: 1, label: 'Tiền mặt tại quầy', icon: Banknote },
  { id: 2, label: 'Chuyển khoản VietQR', icon: Landmark },
];

const todayString = () => new Date().toLocaleDateString('sv-SE');
const hhmm = (time: string) => time.slice(0, 5);
const toLocalTime = (iso: string) =>
  new Date(iso.endsWith('Z') ? iso : `${iso}Z`).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/10';
const labelClass = 'text-sm font-medium text-gray-700';

export default function PosPage() {
  const user = useAuthStore((state) => state.user);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [facilityId, setFacilityId] = useState('');
  const [sportId, setSportId] = useState('');
  const [courtOptions, setCourtOptions] = useState<CourtAvailability[]>([]);
  const [courtId, setCourtId] = useState<number | null>(null);
  const [playDate, setPlayDate] = useState(todayString);
  const [slotIds, setSlotIds] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'buttons' | 'matrix'>('matrix');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState(1);
  const [posErrors, setPosErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availabilityReloadKey, setAvailabilityReloadKey] = useState(0);
  const [lastCreatedBookingCode, setLastCreatedBookingCode] = useState<string | null>(null);

  // Danh sách Check-in trong ngày & Lịch sử Check-in tại quầy POS
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'checkedIn'>('all');
  const [todayCheckIns, setTodayCheckIns] = useState<CheckInItem[]>([]);
  const [historyLogs, setHistoryLogs] = useState<CheckInHistoryItem[]>([]);
  const [checkInKeyword, setCheckInKeyword] = useState('');
  const [checkInSearchError, setCheckInSearchError] = useState<string | null>(null);
  const [checkInChannel, setCheckInChannel] = useState<CheckInChannel>('Manual');
  const [loadingCheckIns, setLoadingCheckIns] = useState(false);

  const availableFacilities = useMemo(
    () =>
      user?.role === 'STAFF' && user.facilityId
        ? facilities.filter((facility) => facility.id === user.facilityId)
        : facilities,
    [facilities, user?.facilityId, user?.role],
  );
  const selectedCourt = courtOptions.find((court) => court.courtId === courtId);
  const selectedSlots = selectedCourt?.slots ?? [];
  const chosenSlotDetails = selectedSlots.filter((slot) => slotIds.includes(slot.timeSlotId));
  const total = chosenSlotDetails.reduce((sum, slot) => sum + slot.price, 0);

  useEffect(() => {
    let active = true;
    void Promise.all([facilityApi.getFacilities(), facilityApi.getSports()])
      .then(([facilityRows, sportRows]) => {
        if (!active) return;
        const allowedFacilities =
          user?.role === 'STAFF' && user.facilityId
            ? facilityRows.filter((facility) => facility.id === user.facilityId)
            : facilityRows;
        setFacilities(facilityRows);
        setSports(sportRows);
        setFacilityId(allowedFacilities[0] ? String(allowedFacilities[0].id) : '');
        setSportId(sportRows[0] ? String(sportRows[0].id) : '');
      })
      .catch((error: unknown) => toast.error(getErrorMessage(error)))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.facilityId, user?.role]);

  useEffect(() => {
    if (!facilityId || !sportId) {
      setCourtOptions([]);
      setCourtId(null);
      setSlotIds([]);
      return;
    }
    let active = true;
    setLoadingAvailability(true);
    void facilityApi
      .getAvailability(Number(facilityId), Number(sportId), playDate)
      .then((courts) => {
        if (!active) return;
        setCourtOptions(courts);
        setCourtId((current) =>
          courts.some((court) => court.courtId === current) ? current : (courts[0]?.courtId ?? null),
        );
        setSlotIds([]);
      })
      .catch((error: unknown) => {
        if (active) {
          setCourtOptions([]);
          setCourtId(null);
          toast.error(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (active) setLoadingAvailability(false);
      });
    return () => {
      active = false;
    };
  }, [facilityId, sportId, playDate, availabilityReloadKey]);

  const loadCheckInData = useCallback(async () => {
    if (!facilityId) return;
    setLoadingCheckIns(true);
    try {
      const facIdNum = Number(facilityId);
      const [todayRows, historyRows] = await Promise.all([
        checkInApi.today(facIdNum),
        posApi.getCheckInHistory(facIdNum, todayString()),
      ]);
      setTodayCheckIns(todayRows);
      setHistoryLogs(historyRows);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingCheckIns(false);
    }
  }, [facilityId]);

  useEffect(() => {
    void loadCheckInData();
  }, [loadCheckInData]);

  // Tích hợp SignalR Real-time theo đúng chuẩn sporthub-frontend-react
  const handleSlotUpdated = useCallback(
    (update: CourtSlotUpdate) => {
      setCourtOptions((current) =>
        current.map((court) => {
          if (court.courtId !== update.courtId) return court;
          return {
            ...court,
            slots: court.slots.map((slot) =>
              slot.timeSlotId === update.timeSlotId
                ? {
                    ...slot,
                    status: update.status,
                    isAvailable: update.status === 'Available',
                  }
                : slot,
            ),
          };
        }),
      );
      if (update.status !== 'Available' && update.courtId === courtId) {
        setSlotIds((prev) => prev.filter((id) => id !== update.timeSlotId));
      }
      void loadCheckInData();
    },
    [courtId, loadCheckInData],
  );

  useCourtStatus(facilityId ? Number(facilityId) : null, playDate, handleSlotUpdated);

  const toggleSlot = (id: number) => {
    setPosErrors((prev) => ({ ...prev, slots: '' }));
    setSlotIds((prev) => (prev.includes(id) ? prev.filter((slot) => slot !== id) : [...prev, id]));
  };

  const isSlotInPast = useCallback(
    (_slot: SlotAvailability) => {
      return playDate < todayString();
    },
    [playDate],
  );

  const handleMatrixToggleSlot = (court: CourtAvailability, slot: SlotAvailability) => {
    setPosErrors((prev) => ({ ...prev, slots: '', courtId: '' }));
    if (court.courtId !== courtId) {
      setCourtId(court.courtId);
      setSlotIds([slot.timeSlotId]);
      return;
    }
    toggleSlot(slot.timeSlotId);
  };

  const handleMatrixDragSelect = (court: CourtAvailability, startSlotId: number, endSlotId: number) => {
    const min = Math.min(startSlotId, endSlotId);
    const max = Math.max(startSlotId, endSlotId);
    const rangeIds = court.slots
      .filter(
        (s) =>
          s.timeSlotId >= min &&
          s.timeSlotId <= max &&
          s.status === 'Available' &&
          s.isAvailable &&
          !isSlotInPast(s),
      )
      .map((s) => s.timeSlotId);
    setPosErrors((prev) => ({ ...prev, slots: '', courtId: '' }));
    setCourtId(court.courtId);
    setSlotIds(rangeIds);
  };

  const validatePosForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!courtId) {
      errs.courtId = 'Vui lòng chọn sân con cần bán.';
    }
    if (slotIds.length === 0) {
      errs.slots = 'Vui lòng chọn ít nhất 1 khung giờ (ca 60 phút) trên bảng ma trận hoặc danh sách ca giờ.';
    } else if (slotIds.length > 17) {
      errs.slots = 'Tối đa chỉ được chọn 17 khung giờ trong một đơn.';
    }
    if (playDate < todayString()) {
      errs.playDate = 'Không thể tạo đơn POS cho ngày đã qua trong quá khứ.';
    }

    const trimmedName = guestName.trim();
    if (!trimmedName) {
      errs.guestName = 'Vui lòng nhập họ tên khách vãng lai.';
    } else if (trimmedName.length < 2 || trimmedName.length > 100) {
      errs.guestName = 'Họ tên khách phải từ 2 đến 100 ký tự.';
    } else if (/^\d+$/.test(trimmedName)) {
      errs.guestName = 'Họ tên khách không được chỉ bao gồm chữ số.';
    }

    const cleanedPhone = guestPhone.trim().replace(/[\s.-]/g, '');
    if (!cleanedPhone) {
      errs.guestPhone = 'Vui lòng nhập số điện thoại khách vãng lai.';
    } else if (!/^0\d{8,10}$/.test(cleanedPhone)) {
      errs.guestPhone = 'SĐT khách không hợp lệ (bắt đầu bằng 0, từ 9 đến 11 chữ số).';
    }

    setPosErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validatePosForm() || !courtId) {
      toast.error('Vui lòng kiểm tra lại thông tin đơn bán sân POS.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await posApi.createBooking({
        courtId,
        playDate,
        timeSlotIds: slotIds,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim().replace(/[\s.-]/g, ''),
        paymentMethodId,
      });
      const createdCode = response.data?.bookingCode ?? null;
      setLastCreatedBookingCode(createdCode);
      toast.success(response.message ?? 'Đặt sân tại quầy POS thành công!');
      setSlotIds([]);
      setGuestName('');
      setGuestPhone('');
      setPosErrors({});
      setAvailabilityReloadKey((k) => k + 1);
      await loadCheckInData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchCheckIn = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedKeyword = checkInKeyword.trim();
    if (!trimmedKeyword) {
      setCheckInSearchError(null);
      await loadCheckInData();
      return;
    }
    if (trimmedKeyword.length < 2 || trimmedKeyword.length > 50) {
      setCheckInSearchError('Từ khóa tra cứu (mã đơn hoặc SĐT) phải từ 2 đến 50 ký tự.');
      return;
    }
    setCheckInSearchError(null);
    setLoadingCheckIns(true);
    try {
      setTodayCheckIns(await checkInApi.lookup(trimmedKeyword));
      setActiveTab('today');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingCheckIns(false);
    }
  };

  const handleQuickCheckIn = async (row: CheckInItem) => {
    try {
      await posApi.checkIn(row.bookingDetailId, checkInKeyword ? 'Phone' : checkInChannel);
      toast.success(`Đã check-in ${row.customerName} – ${row.courtName}`);
      await loadCheckInData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const filteredTodayCheckIns = useMemo(() => {
    if (statusFilter === 'pending') return todayCheckIns.filter((r) => !r.checkedIn);
    if (statusFilter === 'checkedIn') return todayCheckIns.filter((r) => r.checkedIn);
    return todayCheckIns;
  }, [todayCheckIns, statusFilter]);

  const stats = useMemo(() => {
    const totalToday = todayCheckIns.length;
    const checkedInCount = todayCheckIns.filter((r) => r.checkedIn).length;
    const waitingCount = totalToday - checkedInCount;
    return { totalToday, checkedInCount, waitingCount };
  }, [todayCheckIns]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + Chỉ số nhanh trong ngày */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
            <Radio size={13} className="animate-pulse" /> POS Lễ tân Real-time · UC10 & UC11
          </span>
          <h2 className="mt-2 text-2xl font-bold">Màn hình POS Lễ tân</h2>
          <p className="text-sm text-gray-500">
            Bán sân nhanh cho khách vãng lai, theo dõi ma trận lịch sân real-time và check-in khách trong ngày.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-xs text-center">
          <div className="px-3">
            <p className="text-xl font-extrabold text-gray-900">{stats.totalToday}</p>
            <p className="text-[11px] text-gray-500">Ca đặt hôm nay</p>
          </div>
          <div className="border-x border-gray-100 px-3">
            <p className="text-xl font-extrabold text-amber-600">{stats.waitingCount}</p>
            <p className="text-[11px] text-gray-500">Chờ Check-in</p>
          </div>
          <div className="px-3">
            <p className="text-xl font-extrabold text-emerald-600">{stats.checkedInCount}</p>
            <p className="text-[11px] text-gray-500">Đã Check-in</p>
          </div>
        </div>
      </div>

      {/* Bộ chọn Cơ sở, Bộ môn, Ngày chơi dùng chung */}
      <section className="grid gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Cơ sở trực quầy">
          <select
            required
            disabled={loading || availableFacilities.length === 0}
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            className={inputClass}
          >
            {availableFacilities.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bộ môn">
          <select
            required
            disabled={loading || sports.length === 0}
            value={sportId}
            onChange={(e) => setSportId(e.target.value)}
            className={inputClass}
          >
            {sports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.sportName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ngày chơi">
          <input
            required
            type="date"
            value={playDate}
            min={todayString()}
            onChange={(e) => setPlayDate(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Chế độ xem lịch sân">
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode('buttons')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                viewMode === 'buttons' ? 'bg-white text-red-700 shadow-xs' : 'text-gray-600'
              }`}
            >
              <Store size={14} /> Chọn nhanh
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                viewMode === 'matrix' ? 'bg-white text-red-700 shadow-xs' : 'text-gray-600'
              }`}
            >
              <Grid size={14} /> Ma trận sân
            </button>
          </div>
        </Field>
      </section>

      {/* Nếu bật chế độ Ma trận sân: hiển thị CourtTimeGrid chuẩn sporthub-frontend-react */}
      {viewMode === 'matrix' && (
        <section className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-900">Sơ đồ ma trận lịch sân Real-time (`CourtTimeGrid`)</h3>
              <p className="text-xs text-gray-500">
                Bấm hoặc kéo chọn các ô màu xanh lá (Trống) để điền nhanh vào phiếu bán sân POS bên dưới.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-green-200 border border-green-500" /> Trống</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-yellow-300" /> Đang giữ chỗ</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-400" /> Đã đặt</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-purple-300" /> Sự kiện</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-gray-400" /> Bảo trì</span>
            </div>
          </div>

          <CourtTimeGrid
            courts={courtOptions}
            selectedCourtId={courtId}
            selectedSlotIds={new Set(slotIds)}
            isSlotInPast={isSlotInPast}
            onToggleSlot={handleMatrixToggleSlot}
            onDragSelect={handleMatrixDragSelect}
          />
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-12">
        {/* Cột trái: Bán sân nhanh cho khách vãng lai */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6 xl:col-span-6"
        >
          <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">1. Bán sân nhanh cho khách vãng lai</h3>
              <p className="text-xs text-gray-500">
                Chọn sân & ca giờ trống, thu tiền tại quầy và xác nhận đơn ngay lập tức.
              </p>
            </div>
            {lastCreatedBookingCode && (
              <span className="rounded-xl bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                Đơn vừa tạo: {lastCreatedBookingCode}
              </span>
            )}
          </div>

          <Field label="Chọn sân thi đấu">
            <select
              required
              disabled={loadingAvailability || courtOptions.length === 0}
              value={courtId ?? ''}
              onChange={(e) => {
                setCourtId(Number(e.target.value) || null);
                setSlotIds([]);
              }}
              className={inputClass}
            >
              {courtOptions.map((court) => (
                <option key={court.courtId} value={court.courtId}>
                  {court.courtName}
                </option>
              ))}
            </select>
          </Field>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className={labelClass}>Khung giờ ({selectedCourt?.courtName ?? 'Chưa chọn sân'}) *</span>
              {loadingAvailability && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <LoaderCircle size={14} className="animate-spin" /> Đang tải lịch...
                </span>
              )}
            </div>
            {selectedSlots.length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                Không có khung giờ cho lựa chọn này.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {selectedSlots.map((slot) => {
                  const selected = slotIds.includes(slot.timeSlotId);
                  const past = isSlotInPast(slot);
                  const canPick = slot.isAvailable && !past;
                  return (
                    <button
                      key={slot.timeSlotId}
                      type="button"
                      disabled={!canPick || loadingAvailability}
                      onClick={() => toggleSlot(slot.timeSlotId)}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                        selected
                          ? 'border-red-700 bg-red-700 text-white shadow-xs'
                          : canPick
                            ? 'border-gray-200 bg-white text-gray-700 hover:border-red-200'
                            : 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        {selected ? <CircleCheck size={14} /> : <Clock size={14} />}
                        {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}
                        {slot.isPeakHour && (
                          <span className="rounded bg-amber-100 px-1 text-[10px] text-amber-800">Peak</span>
                        )}
                      </span>
                      <span className="whitespace-nowrap">
                        {canPick ? `${slot.price.toLocaleString('vi-VN')}đ` : past ? 'Đã qua' : 'Đã kín'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {posErrors.slots && (
              <p className="text-xs font-medium text-red-600">{posErrors.slots}</p>
            )}
            {posErrors.playDate && (
              <p className="text-xs font-medium text-red-600">{posErrors.playDate}</p>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên khách vãng lai *">
              <input
                value={guestName}
                onChange={(e) => {
                  setGuestName(e.target.value);
                  if (posErrors.guestName) setPosErrors((prev) => ({ ...prev, guestName: '' }));
                }}
                placeholder="VD: Nguyễn Văn Khách (2–100 ký tự)"
                maxLength={100}
                className={`${inputClass} ${posErrors.guestName ? 'border-red-400 bg-red-50/40' : ''}`}
              />
              {posErrors.guestName && (
                <p className="mt-1 text-xs font-medium text-red-600">{posErrors.guestName}</p>
              )}
            </Field>
            <Field label="Số điện thoại khách *">
              <input
                type="tel"
                value={guestPhone}
                onChange={(e) => {
                  setGuestPhone(e.target.value);
                  if (posErrors.guestPhone) setPosErrors((prev) => ({ ...prev, guestPhone: '' }));
                }}
                placeholder="VD: 0909123456"
                maxLength={15}
                className={`${inputClass} ${posErrors.guestPhone ? 'border-red-400 bg-red-50/40' : ''}`}
              />
              {posErrors.guestPhone && (
                <p className="mt-1 text-xs font-medium text-red-600">{posErrors.guestPhone}</p>
              )}
            </Field>
          </div>

          <div className="space-y-1.5">
            <span className={labelClass}>Phương thức thanh toán tại quầy</span>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMethodId(id)}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                    paymentMethodId === id
                      ? 'border-red-600 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-700 hover:border-red-200'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tóm tắt chi tiết các ca giờ đã chọn */}
          {chosenSlotDetails.length > 0 && (
            <div className="rounded-xl bg-gray-50 p-3.5 text-xs space-y-1.5">
              <p className="font-semibold text-gray-700">
                Phiếu tạm tính · {selectedCourt?.courtName} ({playDate}):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {chosenSlotDetails.map((s) => (
                  <span
                    key={s.timeSlotId}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 font-medium text-gray-700"
                  >
                    {hhmm(s.startTime)}–{hhmm(s.endTime)}: <strong>{s.price.toLocaleString('vi-VN')}đ</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {availableFacilities.length === 0 && !loading && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              Tài khoản chưa được gán cơ sở hoặc chưa có cơ sở đang hoạt động.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
            <div>
              <p className="text-xs text-gray-500">Tổng thanh toán ({slotIds.length} khung giờ)</p>
              <p className="text-2xl font-extrabold text-red-700">{total.toLocaleString('vi-VN')} đ</p>
            </div>
            <button
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-red-600 px-6 py-3 font-semibold text-white shadow-md hover:from-red-800 hover:to-red-700 disabled:opacity-60"
              type="submit"
              disabled={submitting || loadingAvailability}
            >
              {submitting ? <LoaderCircle size={18} className="animate-spin" /> : <CircleCheck size={18} />}
              {submitting ? 'Đang tạo đơn...' : 'Xác nhận bán sân POS'}
            </button>
          </div>
        </form>

        {/* Cột phải: Danh sách Check-in trong ngày & Lịch sử Check-in tại quầy POS */}
        <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6 xl:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">2. Danh sách Check-in trong ngày</h3>
              <p className="text-xs text-gray-500">
                Tra cứu mã đơn / SĐT khách và bấm Check-in nhận sân tại quầy POS.
              </p>
            </div>
            <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('today')}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 transition ${
                  activeTab === 'today' ? 'bg-white text-red-700 shadow-xs' : 'text-gray-600'
                }`}
              >
                <CalendarCheck size={13} /> Đơn hôm nay ({todayCheckIns.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 transition ${
                  activeTab === 'history' ? 'bg-white text-red-700 shadow-xs' : 'text-gray-600'
                }`}
              >
                <History size={13} /> Lịch sử Check-in ({historyLogs.length})
              </button>
            </div>
          </div>

          <form onSubmit={handleSearchCheckIn} className="space-y-1.5">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[12rem]">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={checkInKeyword}
                  onChange={(e) => {
                    setCheckInKeyword(e.target.value);
                    if (checkInSearchError) setCheckInSearchError(null);
                  }}
                  maxLength={50}
                  placeholder="Nhập mã đơn (BK/POS) hoặc SĐT khách (2–50 ký tự)..."
                  className={`w-full rounded-xl border py-2 pl-9 pr-3 text-sm focus:outline-none ${
                    checkInSearchError
                      ? 'border-red-400 bg-red-50/40 focus:border-red-600'
                      : 'border-gray-200 bg-white focus:border-red-600'
                  }`}
                />
              </div>
              <select
                value={checkInChannel}
                onChange={(e) => setCheckInChannel(e.target.value as CheckInChannel)}
                className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-semibold text-gray-700"
                title="Kênh Check-in"
              >
                <option value="Manual">Tại quầy (Manual)</option>
                <option value="Phone">Theo SĐT (Phone)</option>
                <option value="QRCode">Quét mã (QRCode)</option>
              </select>
              <button
                type="submit"
                className="rounded-xl bg-red-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-800"
              >
                Tìm
              </button>
              <button
                type="button"
                onClick={() => {
                  setCheckInKeyword('');
                  setCheckInSearchError(null);
                  void loadCheckInData();
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:border-red-200 hover:text-red-700"
              >
                <ListRestart size={14} /> Tất cả
              </button>
            </div>
            {checkInSearchError && (
              <p className="text-xs font-medium text-red-600">{checkInSearchError}</p>
            )}
          </form>

          {activeTab === 'today' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-medium">Hiển thị:</span>
              {[
                { key: 'all', label: `Tất cả (${todayCheckIns.length})` },
                { key: 'pending', label: `Chờ Check-in (${stats.waitingCount})` },
                { key: 'checkedIn', label: `Đã Check-in (${stats.checkedInCount})` },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(item.key as typeof statusFilter)}
                  className={`rounded-full px-3 py-1 font-semibold transition ${
                    statusFilter === item.key
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'today' ? (
            <div className="max-h-[460px] overflow-y-auto overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 text-left uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Giờ / Sân</th>
                    <th className="px-3 py-2.5 font-semibold">Mã đơn</th>
                    <th className="px-3 py-2.5 font-semibold">Khách hàng</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCheckIns && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                        Đang tải danh sách check-in...
                      </td>
                    </tr>
                  )}
                  {!loadingCheckIns && filteredTodayCheckIns.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                        Không có đơn đặt sân nào khớp bộ lọc hôm nay.
                      </td>
                    </tr>
                  )}
                  {!loadingCheckIns &&
                    filteredTodayCheckIns.map((row) => {
                      const isJustCreated =
                        lastCreatedBookingCode && row.bookingCode === lastCreatedBookingCode;
                      return (
                        <tr
                          key={row.bookingDetailId}
                          className={`border-t border-gray-100 transition ${
                            isJustCreated ? 'bg-amber-50/70' : 'hover:bg-gray-50/60'
                          }`}
                        >
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="font-bold text-red-700">
                              {hhmm(row.startTime)}–{hhmm(row.endTime)}
                            </span>
                            <span className="block font-medium text-gray-700">{row.courtName}</span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-gray-600">
                            {row.bookingCode}
                            {isJustCreated && (
                              <span className="ml-1 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-sans font-bold text-amber-900">
                                Mới
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-semibold text-gray-800">{row.customerName}</span>
                            <span className="block text-gray-400">{row.phone ?? '—'}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            {row.checkedIn ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                                <CircleCheck size={13} /> Đã vào {row.checkedInAt ? toLocalTime(row.checkedInAt) : ''}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleQuickCheckIn(row)}
                                className="inline-flex items-center gap-1 rounded-lg bg-red-700 px-3 py-1.5 font-semibold text-white shadow-2xs hover:bg-red-800"
                              >
                                <LogIn size={13} /> Check-in
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="max-h-[460px] overflow-y-auto overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 text-left uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Lúc vào</th>
                    <th className="px-3 py-2.5 font-semibold">Khách / Mã đơn</th>
                    <th className="px-3 py-2.5 font-semibold">Sân / Ca giờ</th>
                    <th className="px-3 py-2.5 font-semibold">Kênh / Lễ tân</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCheckIns && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                        Đang tải lịch sử check-in...
                      </td>
                    </tr>
                  )}
                  {!loadingCheckIns && historyLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                        Chưa có lượt check-in nào được ghi nhận hôm nay.
                      </td>
                    </tr>
                  )}
                  {!loadingCheckIns &&
                    historyLogs.map((log) => (
                      <tr key={log.checkInLogId} className="border-t border-gray-100 hover:bg-gray-50/60">
                        <td className="px-3 py-2.5 font-semibold text-emerald-700 whitespace-nowrap">
                          {toLocalTime(log.checkInAt)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-semibold text-gray-900">{log.customerName}</span>
                          <span className="block font-mono text-gray-400">{log.bookingCode}</span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="font-medium text-gray-800">{log.courtName}</span>
                          <span className="block text-gray-500">
                            {hhmm(log.startTime)}–{hhmm(log.endTime)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-semibold text-gray-700">
                            {log.channel}
                          </span>
                          <span className="block text-gray-400 mt-0.5">{log.staffName}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}
