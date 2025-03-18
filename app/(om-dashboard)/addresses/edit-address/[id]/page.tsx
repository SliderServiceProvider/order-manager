"use client";

import React, { use, useEffect, useState } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import AddressForm from "@/components/addresses/AddressForm";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{
    id: number;
  }>;
}

interface AddressData {
  address: string;
  nick_name: string|null;
  flat_no: string;
  type_name?: string;
  direction?: string;
  latitude: number;
  longitude: number;
  is_primary: boolean;
}

const Page: React.FC<PageProps> = ({ params }) => {
  const unwrappedParams = use(params); // Unwrap the `params` promise
  const { id } = unwrappedParams; // Access `id` safely
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // Submission state
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

  const handleFormSubmit = async (updatedData: any) => {
    setIsSubmitting(true); // Start loading
    try {
      const payload = { ...updatedData, id }; // Include `id` in payload
      const response = await api.post("/order-manager/updateAddress", payload);

      if (response.status === 200) {
        toast({
          className: cn("bg-green-500 text-white"),
          title: "Success",
          description: "Address updated successfully!",
        });
        router.push("/addresses");
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update the address.",
        });
      }
    } catch (error:any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false); // Stop loading
    }
  };

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
        initialNickName={addressData.nick_name}
        initialFlatNo={addressData.flat_no}
        initialDirection={addressData.direction}
        initialStreet={addressData.type_name}
        initialCoordinates={{
          lat: addressData.latitude,
          lng: addressData.longitude,
        }}
        isDefault={addressData.is_primary}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting} // Pass `isSubmitting` state
      />
    </div>
  );
};

export default Page;
