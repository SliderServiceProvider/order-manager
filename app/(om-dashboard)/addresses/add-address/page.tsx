"use client"
import { Button } from "@/components/ui/button";
import Link from "next/link";
import React, { useState } from "react";
import AddressForm from "@/components/addresses/AddressForm";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Page() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      const response = await api.post("/order-manager/createAddress", formData);
      const responseData = response.data;

      if (response.status === 200) {
        toast({
          className: cn("bg-green-500 text-white"),
          title: "Success",
          description: responseData.message,
          variant: "default",
        });
        router.push("/addresses");
      } else {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description:
            responseData.message || "Failed to submit payout request.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred during submission.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header flex justify-between">
        <h4 className="text-2xl text-black font-semibold">Add Address</h4>
        <Button variant="link" className="bg-black text-white">
          <Link href="/addresses">Back to Addresses</Link>
        </Button>
      </div>
      {/* Address Form */}
      <AddressForm
        initialAddress="" // For creation, start with empty values
        initialFlatNo=""
        initialDirection=""
        initialStreet=""
        initialCoordinates={undefined} // Allow AddressForm to initialize coordinates
        isDefault={false} // New addresses are not default by default
        onSubmit={handleFormSubmit} // Pass the submission handler
        isSubmitting={isSubmitting} // Control submission state
      />
    </div>
  );
}
