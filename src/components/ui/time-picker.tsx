import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  date: Date;
  setDate: (date: Date) => void;
  className?: string;
}

export function TimePicker({ date, setDate, className }: TimePickerProps) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hour = parseInt(e.target.value, 10);
    if (isNaN(hour) || hour < 0 || hour > 23) return;
    
    const newDate = new Date(date);
    newDate.setHours(hour);
    setDate(newDate);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const minute = parseInt(e.target.value, 10);
    if (isNaN(minute) || minute < 0 || minute > 59) return;
    
    const newDate = new Date(date);
    newDate.setMinutes(minute);
    setDate(newDate);
  };

  return (
    <div className={cn('flex items-end gap-2', className)}>
      <div className="flex-1">
        <Label htmlFor="hours" className="text-xs">Hours</Label>
        <Input
          id="hours"
          type="number"
          min="0"
          max="23"
          value={hours}
          onChange={handleHourChange}
          className="mt-1"
        />
      </div>
      <span className="text-2xl font-bold pb-2">:</span>
      <div className="flex-1">
        <Label htmlFor="minutes" className="text-xs">Minutes</Label>
        <Input
          id="minutes"
          type="number"
          min="0"
          max="59"
          value={minutes}
          onChange={handleMinuteChange}
          className="mt-1"
        />
      </div>
    </div>
  );
}
