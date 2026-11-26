import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowUpRight,
  Clock,
  ExternalLink,
  History,
  ListRestart,
  LogIn,
  ScanLine,
  Search,
  Store,
  UserCheck,
  X,
} from 'lucide-react';
import type { SlotAvailability } from '../../api/bookingApi';
import { checkInApi } from '../../api/checkInApi';
import type { CheckInChannel, CheckInHistoryItem, CheckInItem } from '../../api/checkInApi';
import { getErrorMessage } from '../../api/errors';
import { facilityApi } from '../../api/facilityApi';
import type { CourtAvailability, Facility, Sport } from '../../api/facilityModels';
import { posApi } from '../../api/posApi';
import type { PosCustomer } from '../../api/posApi';
import CourtTimeGrid from '../../components/CourtTimeGrid';
import ReceptionOrderModal from '../../components/ReceptionOrderModal';
import { Badge, Button, Input, Select } from '../../components/ui';
import { useCourtStatus } from '../../hooks/useSignalR';
import type { CourtSlotUpdate } from '../../hooks/useSignalR';
import { useAuthStore } from '../../store/authStore';

const todayString = () => new Date().toLocaleDateString('sv-SE');
const hhmm = (time: string) => time.slice(0, 5);
const toLocalTime = (iso: string) =>
  new Date(iso.endsWith('Z') ? iso : `${iso}Z`).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

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

  // Thông tin khách & tìm kiếm thành viên theo SĐT
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<PosCustomer | null>(null);
  const [customerResults, setCustomerResults] = useState<PosCustomer[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  const [paymentMethodId, setPaymentMethodId] = useState(1);
  const [posErrors, setPosErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availabilityReloadKey, setAvailabilityReloadKey] = useState(0);
  const [lastCreatedBooking, setLastCreatedBooking] = useState<{ id: number; code: string } | null>(null);

  // Danh sách Check-in trong ngày & Lịch sử Check-in
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'checkedIn'>('all');
  const [todayCheckIns, setTodayCheckIns] = useState<CheckInItem[]>([]);
  const [historyLogs, setHistoryLogs] = useState<CheckInHistoryItem[]>([]);
  const [checkInKeyword, setCheckInKeyword] = useState('');
  const [checkInChannel, setCheckInChannel] = useState<CheckInChannel>('Manual');
  const [loadingCheckIns, setLoadingCheckIns] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);

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
      .finally(() => active && setLoading(false));
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
      .finally(() => active && setLoadingAvailability(false));
    return () => {
      active = false;
    };
  }, [facilityId, sportId, playDate, availabilityReloadKey]);

  // Tự động tìm thành viên theo SĐT khi gõ ở form POS
  useEffect(() => {
    const query = guestPhone.trim();
    if (selectedCustomer && selectedCustomer.phoneNumber === query) {
      setCustomerResults([]);
      return;
    }
    if (query.length < 3) {
      setCustomerResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearchingCustomers(true);
      posApi
        .searchCustomers(query)
        .then(setCustomerResults)
        .catch(() => setCustomerResults([]))
        .finally(() => setSearchingCustomers(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [guestPhone, selectedCustomer]);

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

  const handleSlotUpdated = useCallback(
    (update: CourtSlotUpdate) => {
      setCourtOptions((current) =>
        current.map((court) => {
          if (court.courtId !== update.courtId) return court;
          return {
            ...court,
            slots: court.slots.map((slot) =>
              slot.timeSlotId === update.timeSlotId
                ? { ...slot, status: update.status, isAvailable: update.status === 'Available' }
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

  const isSlotInPast = useCallback((_slot: SlotAvailability) => playDate < todayString(), [playDate]);

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

  const handleSelectCustomer = (customer: PosCustomer) => {
    setSelectedCustomer(customer);
    setGuestPhone(customer.phoneNumber);
    setGuestName(customer.fullName);
    setCustomerResults([]);
    setPosErrors((prev) => ({ ...prev, guestName: '', guestPhone: '' }));
  };

  const validatePosForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!courtId) errs.courtId = 'Vui lòng chọn sân con cần bán.';
    if (slotIds.length === 0) errs.slots = 'Vui lòng chọn ít nhất 1 khung giờ.';
    else if (slotIds.length > 17) errs.slots = 'Tối đa 17 khung giờ trong một đơn.';
    if (playDate < todayString()) errs.playDate = 'Không thể tạo đơn cho ngày trong quá khứ.';

    const trimmedName = guestName.trim();
    if (!trimmedName || trimmedName.length < 2) errs.guestName = 'Nhập tên khách (tối thiểu 2 ký tự).';

    const cleanedPhone = guestPhone.trim().replace(/[\s.-]/g, '');
    if (!/^0\d{8,10}$/.test(cleanedPhone)) {
      errs.guestPhone = 'SĐT khách không hợp lệ (9–11 chữ số, bắt đầu bằng 0).';
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
        customerUserId: selectedCustomer?.userId ?? null,
      });
      if (response.data) {
        setLastCreatedBooking({ id: response.data.bookingId, code: response.data.bookingCode });
      }
      toast.success(response.message ?? 'Đặt sân tại quầy POS thành công!');
      setSlotIds([]);
      setGuestName('');
      setGuestPhone('');
      setSelectedCustomer(null);
      setCustomerResults([]);
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
    const trimmed = checkInKeyword.trim();
    if (!trimmed) {
      await loadCheckInData();
      return;
    }
    setLoadingCheckIns(true);
    try {
      setTodayCheckIns(await checkInApi.lookup(trimmed));
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
    return { totalToday, checkedInCount, waitingCount: totalToday - checkedInCount };
  }, [todayCheckIns]);

  const earnedPointsPreview = selectedCustomer && total > 0 ? Math.max(1, Math.floor(total / 10000)) : 0;

  return (
    <div className="space-y-6">
      {/* Header tương tự /player/tournaments */}
      <header className="flex flex-wrap items-center justify-between gap-6 rounded-card border border-border bg-surface-raised p-5 sm:p-8">
        <div className="max-w-2xl">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <Store size={16} aria-hidden="true" /> SportHub POS & Reception
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Bán sân tại quầy & Check-in trong ngày
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Chọn ca sân trống trên sơ đồ trực quan, nhập SĐT để tự động tìm thành viên cộng điểm thưởng và quản lý nhận/trả sân.
          </p>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted">
          <div>
            <span>Chờ Check-in</span>
            <p className="text-xl font-bold text-primary">{stats.waitingCount} ca</p>
          </div>
          <div className="border-l border-border pl-6">
            <span>Đã nhận sân</span>
            <p className="text-xl font-bold text-foreground">{stats.checkedInCount} ca</p>
          </div>
        </div>
      </header>

      {/* Bộ chọn Cơ sở, Bộ môn, Ngày chơi */}
      <section className="grid gap-3 rounded-card border border-border bg-surface-raised p-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
        <Select
          label="Cơ sở trực quầy"
          disabled={loading || availableFacilities.length === 0}
          value={facilityId}
          onChange={(e) => setFacilityId(e.target.value)}
        >
          {availableFacilities.map((facility) => (
            <option key={facility.id} value={facility.id}>
              {facility.name}
            </option>
          ))}
        </Select>

        <Select
          label="Bộ môn"
          disabled={loading || sports.length === 0}
          value={sportId}
          onChange={(e) => setSportId(e.target.value)}
        >
          {sports.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.sportName}
            </option>
          ))}
        </Select>

        <Input
          label="Ngày chơi"
          type="date"
          value={playDate}
          min={todayString()}
          onChange={(e) => setPlayDate(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-1.5 rounded-control border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setViewMode('buttons')}
            className={`rounded-control py-2 text-xs font-semibold transition-colors ${
              viewMode === 'buttons'
                ? 'border border-primary/20 bg-surface-raised text-primary shadow-design-sm'
                : 'text-muted hover:bg-surface-raised'
            }`}
          >
            Chọn nhanh
          </button>
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`rounded-control py-2 text-xs font-semibold transition-colors ${
              viewMode === 'matrix'
                ? 'border border-primary/20 bg-surface-raised text-primary shadow-design-sm'
                : 'text-muted hover:bg-surface-raised'
            }`}
          >
            Ma trận sân
          </button>
        </div>
      </section>

      {viewMode === 'matrix' && (
        <section className="space-y-3 rounded-card border border-border bg-surface-raised p-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">Sơ đồ ma trận lịch sân Real-time</h2>
            <p className="text-xs text-muted">Bấm hoặc kéo chọn các ô trống để điền vào phiếu bán sân bên dưới.</p>
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

      <div className="grid gap-6 xl:grid-cols-12 items-start">
        {/* Cột trái: Bán sân tại quầy */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-card border border-border bg-surface-raised p-5 xl:col-span-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">1. Tạo đơn bán sân POS</h2>
              <p className="text-xs text-muted">
                Nhập SĐT để tự động tìm thành viên đã đăng ký (cộng điểm & lưu lịch sử).
              </p>
            </div>
            {lastCreatedBooking && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedBookingId(lastCreatedBooking.id)}
              >
                <ExternalLink size={13} /> Đơn vừa tạo: {lastCreatedBooking.code}
              </Button>
            )}
          </div>

          <Select
            label="Chọn sân thi đấu"
            disabled={loadingAvailability || courtOptions.length === 0}
            value={courtId ?? ''}
            onChange={(e) => {
              setCourtId(Number(e.target.value) || null);
              setSlotIds([]);
            }}
          >
            {courtOptions.map((court) => (
              <option key={court.courtId} value={court.courtId}>
                {court.courtName}
              </option>
            ))}
          </Select>

          <section className="space-y-2">
            <span className="block text-sm font-medium text-foreground">
              Khung giờ ({selectedCourt?.courtName ?? 'Chưa chọn sân'}) *
            </span>
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
                    className={`flex items-center justify-between gap-2 rounded-control border px-3 py-2 text-left text-xs transition-colors ${
                      selected
                        ? 'border-primary bg-primary text-white font-semibold'
                        : canPick
                          ? 'border-border bg-surface-raised text-foreground hover:bg-surface'
                          : 'cursor-not-allowed border-border bg-surface text-muted opacity-60'
                    }`}
                  >
                    <span>{slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}</span>
                    <span>{canPick ? `${slot.price.toLocaleString('vi-VN')}đ` : 'Kín'}</span>
                  </button>
                );
              })}
            </div>
            {posErrors.slots && <p className="text-xs text-error">{posErrors.slots}</p>}
          </section>

          {/* Nhập SĐT tìm kiếm thành viên & Tên khách */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <Input
                label="Số điện thoại khách *"
                type="tel"
                value={guestPhone}
                error={posErrors.guestPhone}
                onChange={(e) => {
                  const val = e.target.value;
                  setGuestPhone(val);
                  if (selectedCustomer && selectedCustomer.phoneNumber !== val.trim()) {
                    setSelectedCustomer(null);
                  }
                  if (posErrors.guestPhone) setPosErrors((prev) => ({ ...prev, guestPhone: '' }));
                }}
                placeholder="Nhập SĐT tìm thành viên..."
                maxLength={15}
              />

              {!selectedCustomer && (searchingCustomers || customerResults.length > 0) && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-card border border-border bg-surface-raised p-1.5 shadow-design-lg text-xs">
                  {searchingCustomers ? (
                    <div className="p-2 text-center text-muted">Đang tìm thành viên...</div>
                  ) : (
                    customerResults.map((c) => (
                      <button
                        key={c.userId}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="flex w-full items-center justify-between rounded-control px-3 py-2 text-left hover:bg-surface"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{c.fullName}</p>
                          <p className="text-muted">{c.phoneNumber}</p>
                        </div>
                        <Badge variant="primary">
                          {c.currentTier} · {c.loyaltyPoints} điểm
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <Input
              label="Họ tên khách nhận sân *"
              value={guestName}
              error={posErrors.guestName}
              onChange={(e) => {
                setGuestName(e.target.value);
                if (posErrors.guestName) setPosErrors((prev) => ({ ...prev, guestName: '' }));
              }}
              placeholder="Họ và tên khách"
              maxLength={100}
            />
          </div>

          {selectedCustomer && (
            <div className="flex items-center justify-between rounded-control border border-primary/25 bg-surface px-3.5 py-2.5 text-xs">
              <div className="flex items-center gap-2">
                <UserCheck size={16} className="text-primary shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">
                    Thành viên: {selectedCustomer.fullName} ({selectedCustomer.phoneNumber})
                  </p>
                  <p className="text-muted">
                    Hạng {selectedCustomer.currentTier} · {selectedCustomer.loyaltyPoints} điểm hiện có
                    {earnedPointsPreview > 0 && (
                      <strong className="ml-1 text-primary">
                        (+{earnedPointsPreview} điểm & lưu lịch sử đơn này)
                      </strong>
                    )}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCustomer(null)}
                title="Bỏ chọn thành viên"
              >
                <X size={14} />
              </Button>
            </div>
          )}

          <Select
            label="Phương thức thanh toán tại quầy"
            value={paymentMethodId}
            onChange={(e) => setPaymentMethodId(Number(e.target.value))}
          >
            <option value={1}>Tiền mặt tại quầy</option>
            <option value={2}>Chuyển khoản VietQR</option>
          </Select>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div>
              <p className="text-xs text-muted">Tổng thanh toán ({slotIds.length} khung giờ)</p>
              <p className="text-2xl font-bold text-primary">{total.toLocaleString('vi-VN')} đ</p>
            </div>
            <Button type="submit" loading={submitting} disabled={loadingAvailability}>
              Xác nhận bán sân POS
            </Button>
          </div>
        </form>

        {/* Cột phải: Danh sách Check-in trong ngày */}
        <section className="space-y-4 rounded-card border border-border bg-surface-raised p-5 xl:col-span-6">
          <nav className="grid grid-cols-2 gap-2 rounded-card border border-border bg-surface p-1.5">
            {[
              {
                active: activeTab === 'today',
                onClick: () => setActiveTab('today'),
                icon: ScanLine,
                label: `Đơn hôm nay (${todayCheckIns.length})`,
              },
              {
                active: activeTab === 'history',
                onClick: () => setActiveTab('history'),
                icon: History,
                label: `Lịch sử Check-in (${historyLogs.length})`,
              },
            ].map(({ active, onClick, icon: Icon, label }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className={`flex items-center gap-2 rounded-control border px-3 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-primary/20 bg-surface-raised text-primary shadow-design-sm'
                    : 'border-transparent text-muted hover:bg-surface-raised'
                }`}
              >
                <Icon size={15} />
                <span>{label}</span>
                {active && <ArrowUpRight size={14} className="ml-auto" />}
              </button>
            ))}
          </nav>

          <form onSubmit={handleSearchCheckIn} className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[12rem]">
              <Input
                value={checkInKeyword}
                onChange={(e) => setCheckInKeyword(e.target.value)}
                placeholder="Nhập mã đơn hoặc SĐT khách..."
              />
            </div>
            <Select
              value={checkInChannel}
              onChange={(e) => setCheckInChannel(e.target.value as CheckInChannel)}
            >
              <option value="Manual">Tại quầy (Manual)</option>
              <option value="Phone">Theo SĐT (Phone)</option>
              <option value="QRCode">Mã QR (QRCode)</option>
            </Select>
            <Button type="submit">
              <Search size={15} /> Tìm
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCheckInKeyword('');
                void loadCheckInData();
              }}
            >
              <ListRestart size={15} />
            </Button>
          </form>

          {activeTab === 'today' && (
            <div className="flex items-center gap-1.5 text-xs">
              {[
                { key: 'all', label: `Tất cả (${todayCheckIns.length})` },
                { key: 'pending', label: `Chờ Check-in (${stats.waitingCount})` },
                { key: 'checkedIn', label: `Đã Check-in (${stats.checkedInCount})` },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(item.key as typeof statusFilter)}
                  className={`rounded-control border px-3 py-1.5 font-semibold transition-colors ${
                    statusFilter === item.key
                      ? 'border-primary/20 bg-surface text-primary'
                      : 'border-border bg-surface-raised text-muted hover:text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'today' ? (
            <div className="max-h-[440px] overflow-y-auto rounded-control border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface text-left uppercase text-muted">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Giờ / Sân</th>
                    <th className="px-3 py-2.5 font-semibold">Mã đơn</th>
                    <th className="px-3 py-2.5 font-semibold">Khách hàng</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCheckIns && (
                    <tr><td colSpan={4} className="px-3 py-8 text-center text-muted">Đang tải...</td></tr>
                  )}
                  {!loadingCheckIns && filteredTodayCheckIns.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-8 text-center text-muted">Không có đơn nào.</td></tr>
                  )}
                  {!loadingCheckIns &&
                    filteredTodayCheckIns.map((row) => (
                      <tr
                        key={row.bookingDetailId}
                        onClick={() => setSelectedBookingId(row.bookingId)}
                        className="cursor-pointer border-t border-border transition-colors hover:bg-surface"
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="font-semibold text-primary">
                            <Clock size={12} className="inline mr-1" />
                            {hhmm(row.startTime)}–{hhmm(row.endTime)}
                          </span>
                          <span className="block text-foreground">{row.courtName}</span>
                        </td>
                        <td className="px-3 py-2.5 font-mono font-semibold text-foreground underline decoration-dotted">
                          {row.bookingCode}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-semibold text-foreground">{row.customerName}</span>
                          <span className="block text-muted">{row.phone ?? '—'}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {row.checkedIn ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedBookingId(row.bookingId)}
                            >
                              <ExternalLink size={12} />
                              {row.bookingStatus === 'Completed' ? 'Đã Check-out' : 'Check-out'}
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => void handleQuickCheckIn(row)}>
                              <LogIn size={12} /> Check-in
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="max-h-[440px] overflow-y-auto rounded-control border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface text-left uppercase text-muted">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Lúc vào</th>
                    <th className="px-3 py-2.5 font-semibold">Khách / Mã đơn</th>
                    <th className="px-3 py-2.5 font-semibold">Sân / Ca giờ</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Đơn</th>
                  </tr>
                </thead>
                <tbody>
                  {!loadingCheckIns &&
                    historyLogs.map((log) => (
                      <tr
                        key={log.checkInLogId}
                        onClick={() => setSelectedBookingId(log.bookingId)}
                        className="cursor-pointer border-t border-border transition-colors hover:bg-surface"
                      >
                        <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">
                          {toLocalTime(log.checkInAt)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-semibold text-foreground">{log.customerName}</span>
                          <span className="block font-mono font-semibold text-primary underline decoration-dotted">
                            {log.bookingCode}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="font-medium text-foreground">{log.courtName}</span>
                          <span className="block text-muted">
                            {hhmm(log.startTime)}–{hhmm(log.endTime)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedBookingId(log.bookingId)}
                          >
                            <ExternalLink size={12} /> Mở đơn
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ReceptionOrderModal
        bookingId={selectedBookingId}
        defaultChannel={checkInChannel}
        onClose={() => setSelectedBookingId(null)}
        onUpdated={() => {
          setAvailabilityReloadKey((k) => k + 1);
          void loadCheckInData();
        }}
      />
    </div>
  );
}
