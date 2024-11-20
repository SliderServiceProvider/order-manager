"use client";
import { use, useEffect, useState } from "react";
import InvoiceOrder from "@/components/invoice/InvoiceOrder";
import api from "@/services/api";

interface PageProps {
  params: Promise<{
    invoice_number: string;
  }>;
}

interface InvoiceProps {
  id: number | undefined;
  isShowOrderRefNo: boolean | undefined;
}

const Page: React.FC<PageProps> = ({ params }) => {
  // Unwrap `params` using `React.use()`
  const unwrappedParams = use(params);
  const { invoice_number } = unwrappedParams;
  const [isShowOrderRefNo, setIsShowOrderRefNo] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceProps | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `/order-manager/invoice-details/${invoice_number}`
      );
      const data = response.data;
      setIsShowOrderRefNo(data.isShowOrderRefNo);
      setInvoice(data.invoice);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch the invoice on mount
  useEffect(() => {
    if (invoice_number) {
      fetchInvoice();
    }
  }, [invoice_number]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!invoice) {
    return <div>No invoice found.</div>;
  }

  return (
    <div>
      <div className="page-header flex justify-between">
        <h4 className="text-2xl text-black font-semibold">
          Invoice Details / {invoice_number}
        </h4>
      </div>
      <div>
        <InvoiceOrder
          isShowOrderRefNo={isShowOrderRefNo} // Ensure boolean value
          invoiceId={invoice.id ?? 0} // Provide default value for `id`
        />
      </div>
    </div>
  );
};

export default Page;
