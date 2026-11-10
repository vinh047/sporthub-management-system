import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Building, CircleCheck, Clock, History, ListRestart, LogIn, Search } from 'lucide-react';
import { checkInApi } from '../../api/checkInApi';
import type { CheckInChannel, CheckInHistoryItem, CheckInItem } from '../../api/checkInApi';
import { getErrorMessage } from '../../api/errors';
import { useAuthStore } from '../../store/authStore';

const hhmm = (time: string) => time.slice(0, 5);
const TODAY_LABEL = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

// Backend trả giờ UTC nhưng không có chữ "Z" ở cuối
const toLocalTime = (iso: string) =>
  new Date(iso.endsWith('Z') ? iso : `${iso}Z`).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export default function ReceptionPage() {
  // Staff mặc định xem cơ sở được phân công; Admin chọn cơ sở bất kỳ
  const [facilityId, setFacilityId] = useState(() => useAuthStore.getState().user?.facilityId ?? 1);
  const [rows, setRows] = useState<CheckInItem[]>([]);
  const [historyRows, setHistoryRows] = useState<CheckInHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [channel, setChannel] = useState<CheckInChannel>('Manual');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500 capitalize">{TODAY_LABEL}</p>
          <h2 className="text-2xl font-bold">Lễ tân Check-in & Lịch sử nhận sân</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 bg-white p-1 text-xs font-semibold shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === 'today' ? 'bg-red-700 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Khách đặt sân hôm nay ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 transition ${
                activeTab === 'history' ? 'bg-red-700 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <History size={14} /> Lịch sử Check-in ({historyRows.length})
            </button>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
            <Building size={16} className="text-gray-400" />
            Cơ sở
            <input
              type="number"
              min={1}
              value={facilityId}
              onChange={(e) => {
                setLoading(true);
                setFacilityId(Number(e.target.value) || 1);
              }}
              className="w-14 rounded-md border border-gray-200 px-2 py-0.5 focus:border-red-600 focus:outline-none"
            />
          </label>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[16rem]">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Nhập mã đơn hoặc số điện thoại khách"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 shadow-sm focus:border-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/10"
          />
        </div>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as CheckInChannel)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm"
        >
          <option value="Manual">Kênh: Trực tiếp (Manual)</option>
          <option value="Phone">Kênh: Số điện thoại (Phone)</option>
          <option value="QRCode">Kênh: Mã QR (QRCode)</option>
        </select>
        <button className="flex items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-red-800" type="submit">
          <Search size={16} /> Tìm
        </button>
        <button
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-medium text-gray-700 hover:border-red-200 hover:text-red-700"
          type="button"
          onClick={reload}
        >
          <ListRestart size={16} /> Tất cả
        </button>
      </form>

      {activeTab === 'today' ? (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Giờ</th>
                <th className="px-4 py-3 font-semibold">Sân</th>
                <th className="px-4 py-3 font-semibold">Mã đơn</th>
                <th className="px-4 py-3 font-semibold">Khách</th>
                <th className="px-4 py-3 font-semibold">SĐT</th>
                <th className="px-4 py-3 font-semibold">Check-in</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">Đang tải...</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">Không có đơn nào.</td></tr>
              )}
              {!loading &&
                rows.map((row) => (
                  <tr key={row.bookingDetailId} className="border-t border-gray-100 hover:bg-gray-50/60">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 font-semibold text-red-700">
                        <Clock size={14} /> {hhmm(row.startTime)}–{hhmm(row.endTime)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{row.courtName}</td>
                    <td className="px-4 py-3 font-mono text-gray-600">{row.bookingCode}</td>
                    <td className="px-4 py-3">{row.customerName}</td>
                    <td className="px-4 py-3 text-gray-600">{row.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      {row.checkedIn ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          <CircleCheck size={14} /> Đã vào lúc {row.checkedInAt ? toLocalTime(row.checkedInAt) : ''}
                        </span>
                      ) : (
                        <button
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
                          onClick={() => handleCheckIn(row)}
                        >
                          <LogIn size={14} /> Check-in
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Thời gian Check-in</th>
                <th className="px-4 py-3 font-semibold">Mã đơn</th>
                <th className="px-4 py-3 font-semibold">Khách hàng</th>
                <th className="px-4 py-3 font-semibold">SĐT</th>
                <th className="px-4 py-3 font-semibold">Sân & Khung giờ</th>
                <th className="px-4 py-3 font-semibold">Kênh</th>
                <th className="px-4 py-3 font-semibold">Nhân viên</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Đang tải lịch sử...</td></tr>
              )}
              {!loading && historyRows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Chưa có lịch sử check-in nào.</td></tr>
              )}
              {!loading &&
                historyRows.map((log) => (
                  <tr key={log.checkInLogId} className="border-t border-gray-100 hover:bg-gray-50/60">
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-emerald-700">
                      {log.playDate} · {toLocalTime(log.checkInAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600">{log.bookingCode}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{log.customerName}</td>
                    <td className="px-4 py-3 text-gray-600">{log.phone ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{log.courtName}</span>{' '}
                      <span className="text-xs text-gray-500">({hhmm(log.startTime)}–{hhmm(log.endTime)})</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        {log.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.staffName}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
