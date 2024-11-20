import AddressCard from "@/components/addresses/AddressCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";

export default function page() {
  return (
    <div>
      <div className="page-header flex justify-between">
        <h4 className="text-2xl text-black font-semibold">My Addresses</h4>
        <Button variant="link" className="bg-black text-white">
          <Link href="/addresses/add-address">Add Address</Link>
        </Button>
      </div>
      {/* Addres List */}
      <div>
        <AddressCard />
      </div>
    </div>
  );
}
