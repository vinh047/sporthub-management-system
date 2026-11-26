import { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { checkInApi } from '../../api/checkInApi';
import type { CheckInChannel, CheckInHistoryItem, CheckInItem } from '../../api/checkInApi';
import { getErrorMessage } from '../../api/errors';
import ReceptionOrderModal from '../../components/ReceptionOrderModal';
import { Badge, Button, Input, Select } from '../../components/ui';
import { EmptyState, LoadingState } from '../../components/shared';
import { useAuthStore } from '../../store/authStore';

const hhmm = (time: string) => time.slice(0, 5);
const toLocalTime = (iso: string) =>
  new Date(iso.endsWith('Z') ? iso : `${iso}Z`).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

const STATUS_TEXT: Record<string, string> = {
  Held: 'Chờ thu tiền',
  Confirmed: 'Đã xác nhận',
  Completed: 'Đã Check-out',
  NoShow: 'No-Show',
  Cancelled: 'Đã hủy',
};

export default function ReceptionPage() {
  const [facilityId, setFacilityId] = useState(() => useAuthStore.getState().user?.facilityId ?? 1);
  const [rows, setRows] = useState<CheckInItem[]>([]);
  const [historyRows, setHistoryRows] = useState<CheckInHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'checkedIn' | 'completed'>('all');
  const [channel, setChannel] = useState<CheckInChannel>('Manual');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([checkInApi.today(facilityId), checkInApi.history(facilityId)])
      .then(([todayData, historyData]) => {
        if (!active) return;
        setRows(todayData);
        setHistoryRows(historyData);
      })
      .catch((err) => active && toast.error(getErrorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [facilityId, reloadKey]);

  const reload = () => {
    setLoading(true);
    setKeyword('');
    setReloadKey((k) => k + 1);
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return reload();
    setLoading(true);
    try {
      setRows(await checkInApi.lookup(keyword.trim()));
      setActiveTab('today');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (row: CheckInItem) => {
    try {
      await checkInApi.checkIn(row.bookingDetailId, keyword ? 'Phone' : channel);
      toast.success(`Đã check-in ${row.customerName} – ${row.courtName}`);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const filteredRows = useMemo(() => {
    if (statusFilter === 'waiting')
      return rows.filter((r) => !r.checkedIn && r.bookingStatus !== 'Completed' && r.bookingStatus !== 'NoShow');
    if (statusFilter === 'checkedIn')
      return rows.filter((r) => r.checkedIn && r.bookingStatus !== 'Completed');
    if (statusFilter === 'completed')
      return rows.filter((r) => r.bookingStatus === 'Completed');
    return rows;
  }, [rows, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header tương tự /player/tournaments */}
      <header className="flex flex-wrap items-center justify-between gap-6 rounded-card border border-border bg-surface-raised p-5 sm:p-8">
        <div className="max-w-2xl">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <ScanLine size={16} aria-hidden="true" /> SportHub Reception
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Lễ tân Check-in & Lịch sử nhận sân
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Tra cứu đơn đặt sân, xác nhận Check-in khách đến nhận sân và bấm vào đơn để quản lý hoặc Check-out trả sân.
          </p>
        </div>

        <div className="w-36">
          <Input
            label="Mã cơ sở"
            type="number"
            min={1}
            value={facilityId}
            onChange={(e) => {
              setLoading(true);
              setFacilityId(Number(e.target.value) || 1);
            }}
          />
        </div>
      </header>

      {/* Thanh chuyển mục tương tự /player/tournaments */}
      <nav aria-label="Chuyên mục lễ tân" className="grid grid-cols-2 gap-2 rounded-card border border-border bg-surface p-2">
        {[
          {
            active: activeTab === 'today',
            onClick: () => setActiveTab('today'),
            icon: ScanLine,
            label: `Khách đặt sân hôm nay (${rows.length})`,
            description: 'Danh sách ca đặt trong ngày, Check-in & Check-out',
          },
          {
            active: activeTab === 'history',
            onClick: () => setActiveTab('history'),
            icon: History,
            label: `Lịch sử Check-in (${historyRows.length})`,
            description: 'Nhật ký nhận sân tại quầy lễ tân',
          },
        ].map(({ active, onClick, icon: Icon, label, description }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className={`flex items-center gap-3 rounded-control border p-3 text-left transition-colors sm:p-4 ${
              active
                ? 'border-primary/20 bg-surface-raised text-primary shadow-design-sm'
                : 'border-transparent text-muted hover:bg-surface-raised'
            }`}
          >
            <Icon size={20} className="hidden shrink-0 sm:block" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold sm:text-base">{label}</span>
              <span className="mt-1 hidden text-xs text-muted sm:block">{description}</span>
            </span>
            {active && <ArrowUpRight size={18} aria-hidden="true" className="ml-auto hidden shrink-0 sm:block" />}
          </button>
        ))}
      </nav>

      {/* Bộ lọc & Tìm kiếm */}
      <form
        onSubmit={handleSearch}
        className="grid gap-3 rounded-card border border-border bg-surface-raised p-4 sm:grid-cols-12 items-end"
      >
        <div className="sm:col-span-5">
          <Input
            label="Tìm kiếm đơn đặt sân"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Nhập mã đơn (BK/POS), tên hoặc SĐT khách..."
          />
        </div>
        <div className="sm:col-span-3">
          <Select
            label="Kênh Check-in"
            value={channel}
            onChange={(e) => setChannel(e.target.value as CheckInChannel)}
          >
            <option value="Manual">Trực tiếp (Manual)</option>
            <option value="Phone">Số điện thoại (Phone)</option>
            <option value="QRCode">Mã QR (QRCode)</option>
          </Select>
        </div>
        {activeTab === 'today' && (
          <div className="sm:col-span-2">
            <Select
              label="Trạng thái"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="all">Tất cả ({rows.length})</option>
              <option value="waiting">Chờ Check-in</option>
              <option value="checkedIn">Chờ Check-out</option>
              <option value="completed">Đã Check-out</option>
            </Select>
          </div>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" className="flex-1">
            <Search size={15} /> Tìm
          </Button>
          <Button type="button" variant="outline" onClick={reload} title="Tải lại tất cả">
            <ListRestart size={15} />
          </Button>
        </div>
      </form>

      {loading ? (
        <LoadingState label="Đang tải danh sách nhận sân…" />
      ) : activeTab === 'today' ? (
        filteredRows.length === 0 ? (
          <EmptyState
            icon={ScanLine}
            title="Không có đơn đặt sân nào"
            description="Chưa có ca đặt sân nào khớp với bộ lọc hiện tại."
          />
        ) : (
          <div className="overflow-x-auto rounded-card border border-border bg-surface-raised">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Khung giờ</th>
                  <th className="px-4 py-3 font-semibold">Sân</th>
                  <th className="px-4 py-3 font-semibold">Mã đơn</th>
                  <th className="px-4 py-3 font-semibold">Khách hàng</th>
                  <th className="px-4 py-3 font-semibold">SĐT</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Check-in</th>
                  <th className="px-4 py-3 font-semibold text-right">Quản lý đơn</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.bookingDetailId}
                    onClick={() => setSelectedBookingId(row.bookingId)}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-surface"
                  >
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-primary">
                      <Clock size={14} className="inline mr-1" />
                      {hhmm(row.startTime)}–{hhmm(row.endTime)}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{row.courtName}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-foreground underline decoration-dotted">
                      {row.bookingCode}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{row.customerName}</td>
                    <td className="px-4 py-3 text-muted">{row.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.bookingStatus === 'Completed' ? 'primary' : 'neutral'}>
                        {STATUS_TEXT[row.bookingStatus] ?? row.bookingStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {row.checkedIn ? (
                        <span className="text-xs font-semibold text-foreground">
                          Đã vào {row.checkedInAt ? toLocalTime(row.checkedInAt) : ''}
                        </span>
                      ) : row.bookingStatus === 'Confirmed' ? (
                        <Button size="sm" onClick={() => void handleCheckIn(row)}>
                          <LogIn size={13} /> Check-in
                        </Button>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBookingId(row.bookingId)}
                      >
                        <ExternalLink size={13} /> Quản lý / Check-out
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : historyRows.length === 0 ? (
        <EmptyState
          icon={History}
          title="Chưa có lịch sử Check-in"
          description="Các lượt nhận sân tại quầy lễ tân sẽ hiển thị tại đây."
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface-raised">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Thời gian Check-in</th>
                <th className="px-4 py-3 font-semibold">Mã đơn</th>
                <th className="px-4 py-3 font-semibold">Khách hàng</th>
                <th className="px-4 py-3 font-semibold">SĐT</th>
                <th className="px-4 py-3 font-semibold">Sân & Khung giờ</th>
                <th className="px-4 py-3 font-semibold">Kênh / NV</th>
                <th className="px-4 py-3 font-semibold text-right">Quản lý đơn</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map((log) => (
                <tr
                  key={log.checkInLogId}
                  onClick={() => setSelectedBookingId(log.bookingId)}
                  className="cursor-pointer border-t border-border transition-colors hover:bg-surface"
                >
                  <td className="px-4 py-3 whitespace-nowrap font-semibold text-foreground">
                    {log.playDate} · {toLocalTime(log.checkInAt)}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-primary underline decoration-dotted">
                    {log.bookingCode}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{log.customerName}</td>
                  <td className="px-4 py-3 text-muted">{log.phone ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-medium text-foreground">{log.courtName}</span>{' '}
                    <span className="text-xs text-muted">({hhmm(log.startTime)}–{hhmm(log.endTime)})</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {log.channel} · {log.staffName}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBookingId(log.bookingId)}
                    >
                      <ExternalLink size={13} /> Quản lý / Check-out
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReceptionOrderModal
        bookingId={selectedBookingId}
        defaultChannel={channel}
        onClose={() => setSelectedBookingId(null)}
        onUpdated={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
