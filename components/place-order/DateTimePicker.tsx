"use client";

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
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[280px] justify-start text-left font-normal",
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
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="time"
            variant={"outline"}
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !time && "text-muted-foreground"
            )}
            disabled={!date}
          >
            <Clock className="mr-2 h-4 w-4" />
            {time ? time : <span>Pick a time</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0">
          <Select onValueChange={handleTimeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a time" />
            </SelectTrigger>
            <SelectContent>
              {generateTimeOptions().map((timeOption) => (
                <SelectItem key={timeOption} value={timeOption}>
                  {timeOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PopoverContent>
      </Popover>
      <div className="text-sm text-muted-foreground">
        {date && time ? (
          <p>
            Selected: {format(date, "PPP")} at {time}
          </p>
        ) : (
          <p>Please select both date and time</p>
        )}
      </div>
    </div>
  );
}