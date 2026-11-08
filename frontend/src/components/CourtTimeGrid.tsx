import { useEffect, useRef } from 'react';
import type { CourtAvailability, SlotAvailability } from '../api/bookingApi';

interface CourtTimeGridProps {
  courts: CourtAvailability[];
  selectedCourtId: number | null;
  selectedSlotIds: ReadonlySet<number>;
  isSlotInPast: (slot: SlotAvailability) => boolean;
  onToggleSlot: (court: CourtAvailability, slot: SlotAvailability) => void;
  onDragSelect: (court: CourtAvailability, startSlotId: number, endSlotId: number) => void;
}

const statusClass: Record<string, string> = {
  Available: 'bg-green-100 text-green-900 hover:bg-green-200',
  Held: 'bg-yellow-300 text-yellow-950',
  Confirmed: 'bg-red-400 text-red-950',
  Social: 'bg-purple-300 text-purple-950',
  Maintenance: 'bg-gray-400 text-gray-950',
  Unavailable: 'bg-gray-200 text-gray-700',
  Past: 'bg-gray-200 text-gray-500',
};

const statusLabel: Record<string, string> = {
  Available: 'Trống',
  Held: 'Đang giữ chỗ',
  Confirmed: 'Đã đặt',
  Social: 'Sự kiện',
  Maintenance: 'Bảo trì',
  Unavailable: 'Không khả dụng',
  Past: 'Đã qua',
};

export default function CourtTimeGrid({
  courts,
  selectedCourtId,
  selectedSlotIds,
  isSlotInPast,
  onToggleSlot,
  onDragSelect,
}: CourtTimeGridProps) {
  const slots = courts[0]?.slots ?? [];
  const dragStart = useRef<{ courtId: number; timeSlotId: number } | null>(null);
  const dragged = useRef(false);
  const suppressClick = useRef(false);

  useEffect(() => {
    const finishDrag = () => {
      if (!dragStart.current) return;
      dragStart.current = null;
      if (dragged.current) {
        suppressClick.current = true;
        window.setTimeout(() => {
          suppressClick.current = false;
        }, 0);
      }
      dragged.current = false;
    };

    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
    return () => {
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
    };
  }, []);

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[880px] border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-gray-600">
            <th className="sticky left-0 z-10 min-w-32 bg-gray-50 px-4 py-3">Sân</th>
            {slots.map((slot) => (
              <th key={slot.timeSlotId} className="min-w-24 px-2 py-3 text-center font-medium">
                {slot.startTime.slice(0, 5)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {courts.map((court) => (
            <tr key={court.courtId} className="border-t border-gray-100">
              <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left font-semibold">{court.courtName}</th>
              {court.slots.map((slot) => {
                const past = isSlotInPast(slot);
                const available = slot.status === 'Available' && slot.isAvailable && !past;
                const selected = court.courtId === selectedCourtId && selectedSlotIds.has(slot.timeSlotId) && available;
                const label = past ? statusLabel.Past : statusLabel[slot.status] ?? slot.status;
                return (
                  <td
                    key={slot.timeSlotId}
                    className="p-1.5"
                    onPointerDown={(event) => {
                      if (!available || (event.button !== 0 && event.pointerType !== 'touch')) return;
                      dragStart.current = { courtId: court.courtId, timeSlotId: slot.timeSlotId };
                      dragged.current = false;
                    }}
                    onPointerEnter={() => {
                      const start = dragStart.current;
                      if (!start || start.courtId !== court.courtId || start.timeSlotId === slot.timeSlotId) return;
                      dragged.current = true;
                      onDragSelect(court, start.timeSlotId, slot.timeSlotId);
                    }}
                  >
                    <button
                      type="button"
                      disabled={!available}
                      title={available ? `${selected ? 'Bỏ chọn' : 'Chọn'} ${court.courtName} - ${slot.startTime.slice(0, 5)}` : label}
                      aria-label={`${court.courtName}, ${slot.startTime.slice(0, 5)}–${slot.endTime.slice(0, 5)}: ${selected ? 'Đã chọn' : label}${slot.isPeakHour ? ', giờ cao điểm' : ''}, ${slot.price.toLocaleString('vi-VN')} đồng`}
                      aria-pressed={selected}
                      onClick={() => {
                        if (suppressClick.current) {
                          suppressClick.current = false;
                          return;
                        }
                        onToggleSlot(court, slot);
                      }}
                      className={`w-full touch-none rounded-lg px-2 py-3 text-center text-xs font-semibold transition disabled:cursor-not-allowed ${selected ? 'bg-green-500 text-white ring-2 ring-green-700 ring-offset-1' : statusClass[slot.status] ?? statusClass.Unavailable}`}
                    >
                      {available ? (
                        <>
                          {selected && <span className="mb-1 block">Đã chọn</span>}
                          <span className="block">{(slot.price / 1000).toFixed(0)}k</span>
                          {slot.isPeakHour && <span className="mt-1 block text-[10px] font-medium">Peak</span>}
                        </>
                      ) : label}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
          {courts.length === 0 && (
            <tr>
              <td colSpan={slots.length + 1} className="px-4 py-12 text-center text-gray-500">
                Không có sân phù hợp với bộ lọc.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
