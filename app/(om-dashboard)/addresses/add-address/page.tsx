import { Button } from '@/components/ui/button';
import Link from 'next/link';
import React from 'react'

export default function page() {
  return (
    <div>
      <div className="page-header flex justify-between">
        <h4 className="text-2xl text-black font-semibold">Add Address</h4>
        <Button variant="link" className="bg-black text-white">
          <Link href="/addresses">Back to Addresses</Link>
        </Button>
      </div>
      {/* Addres List */}
      <div>
      </div>
    </div>
  );
}
