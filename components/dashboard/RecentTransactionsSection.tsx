import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "../ui/card";

interface TransactionRowProps {
  invoiceId: string;
  accountManager: string;
  amount: string;
  status: string;
  statusColor: string;
}

interface RecentTransaction {
  invoice_number: string;
  from_date: string;
  to_date: string;
  delivery_count: number;
  amount: string;
  invoice_file: string;
  status: string;
  customer: {
    id: number;
    name: string;
  };
}

interface RecentTransactionsSectionProps {
  recentTransactions: RecentTransaction[];
}

function TransactionRow({
  invoiceId,
  accountManager,
  amount,
  status,
  statusColor,
}: TransactionRowProps) {
  const getStatusClasses = () => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-600";
      case "Unpaid":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600"; // Default styling if status is unrecognized
    }
  };

  return (
    <tr>
      <td className="border-t border-muted-200 py-4 px-3 text-sm">
        {invoiceId}
      </td>
      <td className="border-t border-muted-200 py-4 px-3 text-sm">
        {accountManager}
      </td>
      <td className="border-t border-muted-200 py-4 px-3 text-sm font-medium text-black">
        {amount}
      </td>
      <td className="border-t border-muted-200 py-4 px-3 text-sm font-semibold">
        <span className={`status-badge ${getStatusClasses()}`}>{status}</span>
      </td>
    </tr>
  );
}

export function RecentTransactionsSection({
  recentTransactions,
}: RecentTransactionsSectionProps): JSX.Element {
  return (
    <Card className="card bg-white w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <h4 className="text-black font-semibold uppercase">
          RECENT TRANSACTIONS
        </h4>
        <Link
          href="/invoices"
          className="rounded-lg py-1 px-2 text-sm border mt-0"
        >
          View All
        </Link>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-y-auto flex-1">
          <table className="w-full h-full">
            <thead>
              <tr>
                <th className="py-2 px-3 text-start text-xs font-medium uppercase">
                  Invoice Id
                </th>
                <th className="py-2 px-3 text-start text-xs font-medium uppercase">
                  Account Manager
                </th>
                <th className="py-2 px-3 text-start text-xs font-medium uppercase">
                  Amount
                </th>
                <th className="py-2 px-3 text-start text-xs font-medium uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((transaction) => (
                <TransactionRow
                  key={transaction.invoice_number}
                  invoiceId={transaction.invoice_number}
                  accountManager={transaction.customer.name}
                  amount={`AED ${transaction.amount}`}
                  status={transaction.status === "paid" ? "Paid" : "Unpaid"}
                  statusColor={
                    transaction.status === "paid"
                      ? "text-green-500"
                      : "text-red-500"
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
