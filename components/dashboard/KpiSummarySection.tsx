// KpiSummarySection.tsx
import React from "react";
import { MapPinHouse, Package, Split } from "lucide-react";
import { IconCoins, IconCreditCardPay, IconMoneybag } from "@tabler/icons-react";
import { Card, CardContent, CardHeader } from "../ui/card";

interface KpiSummaryProps {
  totalPayoutValue: string;
  totalOrderCount: string;
  completedPayoutValue: string;
  totalAvailablePayoutBalance: string;
  totalToupBalance: string;
  totalWalletBalance: string;
}

interface KpiSummarySectionProps {
  kpiSummary: KpiSummaryProps;
}

interface SummaryItemProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  change: string;
  bgColor: string;
  type: string;
}

function SummaryItem({
  icon,
  title,
  value,
  change,
  bgColor,
  type
}: SummaryItemProps) {
  return (
    <div className="flex flex-col gap-2 py-4 px-6 border-b border-r-0 md:border-b-0 md:border-r border-gray-200 dark:border-gray-700">
      <div
        className={`flex items-center justify-center min-h-12 min-w-12 max-h-12 max-w-12 text-gray-900 rounded-full text-2xl ${bgColor}`}
      >
        {icon}
      </div>
      <div className="mt-4">
        <div className="mb-1 text-gray-500">{title}</div>
        <h3 className="mb-1 text-3xl font-bold">
          {type === "amount" && <span className="text-sm mr-1">AED</span>}
          {value}
        </h3>
        {/* <div className="inline-flex items-center flex-wrap gap-1">
          <span className="flex items-center text-green-500 font-bold">
            <span>+</span>
            <span>{change}</span>
          </span>
          <span className="text-gray-500">vs last month</span>
        </div> */}
      </div>
    </div>
  );
}

export function KpiSummarySection({
  kpiSummary,
}: KpiSummarySectionProps): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <Card className="card bg-white">
        <CardHeader className="pb-0">
          <h4 className="text-black text-xl font-semibold uppercase">
            KPI Summary
          </h4>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
            <SummaryItem
              icon={<Package />}
              title="Total Orders"
              value={kpiSummary.totalOrderCount.toString()}
              change="0%" // Placeholder
              bgColor="bg-sky-200"
              type="count"
            />
            <SummaryItem
              icon={<IconMoneybag />}
              title="Total Payout Value"
              value={kpiSummary.totalPayoutValue}
              change="0%" // Placeholder, update with actual data if available
              bgColor="bg-rose-200"
              type="amount"
            />
            <SummaryItem
              icon={<IconCreditCardPay />}
              title="Completed Payout Value"
              value={kpiSummary.completedPayoutValue}
              change="0%" // Placeholder
              bgColor="bg-green-200"
              type="amount"
            />
            <SummaryItem
              icon={<IconCoins />}
              title="Available Balance"
              value={kpiSummary.totalWalletBalance}
              change="0%" // Placeholder
              bgColor="bg-purple-200"
              type="amount"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
