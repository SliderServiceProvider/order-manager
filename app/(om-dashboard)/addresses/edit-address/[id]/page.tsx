"use client"
import React, { use, useEffect, useState } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import AddressForm from "@/components/addresses/AddressForm";

interface PageProps {
  params: Promise<{
    id: number;
  }>;
}
interface AddressData {
  address: string;
  flat_no: string;
  direction?: string;
  is_primary: boolean;
}

const Page: React.FC<PageProps> = ({ params }) => {
  const unwrappedParams = use(params); // Unwrap the `params` promise
  const { id } = unwrappedParams; // Access `id` safely

  const [loading, setLoading] = useState(true);
  const [addressData, setAddressData] = useState<AddressData | null>(null);

  useEffect(() => {
    const fetchAddress = async () => {
      if (id) {
        try {
          const response = await api.get(`/addressBook/${id}`);
          setAddressData(response.data.data);
        } catch (error) {
          console.error("Error fetching address:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchAddress();
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (!addressData) return <p>Address not found.</p>;

  return (
    <div>
      <div className="page-header flex justify-between">
        <h4 className="text-2xl text-black font-semibold">Edit Address</h4>
        <Button variant="link" className="bg-black text-white">
          <Link href="/addresses">Back to Addresses</Link>
        </Button>
      </div>
      <AddressForm
        initialAddress={addressData.address}
        initialFlatNo={addressData.flat_no}
        initialDirection={addressData.direction}
        isDefault={addressData.is_primary}
        onSubmit={(updatedData) => {
          console.log("Updated Data:", updatedData);
        }}
      />
    </div>
  );
};
export default Page;