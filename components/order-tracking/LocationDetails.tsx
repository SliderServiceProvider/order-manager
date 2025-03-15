import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Phone } from "lucide-react";

interface LocationDetailsProps {
  title: string;
  icon: React.ReactNode;
  orderRefNo: string;
  address: string;
  flatNo?: string;
  city?: string;
  direction?: string;
  startDateTime: string;
  endDateTime: string;
  recipientNumber?: string | null;
  codAmount?: string | null;
  cashCollectionStatus?: number | null;
}

export default function LocationDetails({
  title,
  icon,
  orderRefNo,
  cashCollectionStatus,
  address,
  flatNo,
  city,
  direction,
  startDateTime,
  endDateTime,
  recipientNumber,
  codAmount,
}: LocationDetailsProps) {
  // Compute display text for cash collection status
  const cashCollectedText =
    cashCollectionStatus === 0
      ? "N/A"
      : cashCollectionStatus === 1
      ? "Collected"
      : cashCollectionStatus === 2
      ? "Not Collected"
      : "";
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">{icon}</div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          {codAmount && (
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-700 border-amber-200"
            >
              COD: {codAmount} AED
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Address</div>
            <div className="font-medium">{address}</div>
            {flatNo && <div className="text-sm mt-1">{flatNo}</div>}
            {city && <div className="text-sm">{city}</div>}
            {direction && (
              <div className="text-sm text-muted-foreground mt-1">
                <span className="font-medium">Directions:</span> {direction}
              </div>
            )}
          </div>

          {recipientNumber && (
            <>
              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Recipient Number
                  </div>
                  <div className="text-sm font-medium">{recipientNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Order Reference Number
                  </div>
                  <div className="text-sm font-medium">{orderRefNo}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Cash Collected
                  </div>
                  <div className="text-sm font-medium">{cashCollectedText}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
