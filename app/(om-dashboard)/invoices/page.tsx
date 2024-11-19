import InvoiceList from '@/components/invoice/InvoiceList';
import { Button } from '@/components/ui/button';
import { IconCreditCardPay } from '@tabler/icons-react';
import React from 'react'

export default function page() {
  return (
    <div>
      <div className="page-header flex justify-between">
        <h4 className="text-2xl text-black font-semibold">My Invoices</h4>
        <Button className='bg-black'><IconCreditCardPay/> Pay Invoice</Button>
      </div>
      <div>
        <InvoiceList />
      </div>
    </div>
  );
}
