import { DeliveryStage } from "@/types";
import { CheckCircle2, Circle } from "lucide-react";

interface DeliveryTimelineProps {
  stages: DeliveryStage[];
}

export function DeliveryTimeline({ stages }: DeliveryTimelineProps) {
  return (
    <div className="space-y-4">
      {stages.map((stage, index) => (
        <div key={index} className="flex items-center space-x-4">
          {stage.completed ? (
            <CheckCircle2 className="text-green-500" />
          ) : (
            <Circle className="text-gray-300" />
          )}
          <div>
            <p className="font-medium">{stage.stage}</p>
            <p className="text-sm text-gray-500">{stage.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
