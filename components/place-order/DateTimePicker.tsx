import * as React from "react";
import {
  addHours,
  format,
  isBefore,
  isToday,
  set,
  startOfToday,
} from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DateTimePicker({
  onDateTimeChange,
}: {
  onDateTimeChange: (date: Date | null, time: string | null) => void;
}) {
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [time, setTime] = React.useState<string | undefined>(undefined);

  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
    onDateTimeChange(newDate || null, time || null);
  };

  const handleTimeChange = (newTime: string | undefined) => {
    setTime(newTime);
    onDateTimeChange(date || null, newTime || null);
  };

  const generateTimeOptions = () => {
    const options: string[] = [];
    const now = new Date();
    const startTime =
      date && isToday(date)
        ? addHours(now, 1)
        : set(now, { hours: 0, minutes: 0, seconds: 0 });
    const endTime = set(now, { hours: 23, minutes: 45, seconds: 0 });

    for (let i = startTime; isBefore(i, endTime); i = addHours(i, 0.25)) {
      options.push(format(i, "HH:mm"));
    }

    return options;
  };

  return (
    <div className="flex gap-2">
      {/* Date Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[280px] h-11 justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateChange}
            disabled={(d) => isBefore(d, startOfToday())}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Time Picker */}
      <Select onValueChange={handleTimeChange} disabled={!date}>
        <SelectTrigger
          className={cn(
            "w-[280px] h-11 text-left",
            !time && "text-muted-foreground"
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          <SelectValue
            placeholder={date ? "Pick a time" : "Select a date first"}
          />
        </SelectTrigger>
        <SelectContent>
          {generateTimeOptions().map((timeOption) => (
            <SelectItem key={timeOption} value={timeOption}>
              {timeOption}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
