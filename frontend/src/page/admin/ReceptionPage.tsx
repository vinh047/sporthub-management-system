import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { checkInApi } from '../../api/checkInApi';
import type { CheckInItem } from '../../api/checkInApi';
import { getErrorMessage } from '../../api/errors';

const hhmm = (time: string) => time.slice(0, 5);
const TODAY_LABEL = new Date().toLocaleDateString('vi-VN');

// Backend trả giờ UTC nhưng không có chữ "Z" ở cuối
const toLocalTime = (iso: string) =>
  new Date(iso.endsWith('Z') ? iso : `${iso}Z`).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export default function ReceptionPage() {
  // TODO: lấy cơ sở từ thông tin nhân viên khi TV2 thêm FacilityId vào token
  const [facilityId, setFacilityId] = useState(1);
  const [rows, setRows] = useState<CheckInItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    checkInApi
      .today(facilityId)
      .then((data) => active && setRows(data))
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
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (row: CheckInItem) => {
    try {
      await checkInApi.checkIn(row.bookingDetailId, keyword ? 'Phone' : 'Manual');
      toast.success(`Đã check-in ${row.customerName} – ${row.courtName}`);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Lễ tân – khách đặt sân hôm nay</h1>
          <p className="text-sm text-muted">{TODAY_LABEL}</p>
        </div>
        <label className="text-sm">
          Cơ sở{' '}
          <input
            type="number"
            min={1}
            value={facilityId}
            onChange={(e) => {
              setLoading(true);
              setFacilityId(Number(e.target.value) || 1);
            }}
            className="w-20 ml-1 px-2 py-1 border border-border rounded bg-background"
          />
        </label>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Nhập mã đơn hoặc số điện thoại khách"
          className="flex-1 px-3 py-2 border border-border rounded bg-background"
        />
        <button className="btn btn-primary" type="submit">Tìm</button>
        <button className="btn border border-border" type="button" onClick={reload}>Tất cả</button>
      </form>

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left">
            <tr>
              <th className="px-3 py-2">Giờ</th>
              <th className="px-3 py-2">Sân</th>
              <th className="px-3 py-2">Mã đơn</th>
              <th className="px-3 py-2">Khách</th>
              <th className="px-3 py-2">SĐT</th>
              <th className="px-3 py-2">Check-in</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted">Đang tải...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted">Không có đơn nào.</td></tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={row.bookingDetailId} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-nowrap">{hhmm(row.startTime)}–{hhmm(row.endTime)}</td>
                  <td className="px-3 py-2">{row.courtName}</td>
                  <td className="px-3 py-2 font-mono">{row.bookingCode}</td>
                  <td className="px-3 py-2">{row.customerName}</td>
                  <td className="px-3 py-2">{row.phone ?? '—'}</td>
                  <td className="px-3 py-2">
                    {row.checkedIn ? (
                      <span className="text-emerald-600 font-medium">
                        Đã vào lúc {row.checkedInAt ? toLocalTime(row.checkedInAt) : ''}
                      </span>
                    ) : (
                      <button className="btn btn-primary text-xs" onClick={() => handleCheckIn(row)}>
                        Check-in
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
