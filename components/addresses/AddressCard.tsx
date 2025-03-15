"use client";
import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "../ui/dialog";

interface AddressCardProps {
  id: number;
  is_primary: boolean;
  address: string;
  flat_no: string;
  direction: string;
  type_name: string;
  nick_name: string;
}

export default function AddressCard() {
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<AddressCardProps[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showConfirmModalForPrimary, setShowConfirmModalForPrimary] =
    useState(false);
  const [addressToDelete, setAddressToDelete] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const response = await api.get("/addressBook");
      const data = response.data;
      setAddresses(data.data);
    } catch (error) {
      console.error("Error fetching addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteAddress = async (id: number) => {
    try {
      const response = await api.get(`/delete/address/${id}`);
      const responseData = response.data;
      if (responseData.status == "Success") {
        toast({
          className: cn("bg-green-500 text-white"),
          title: "Success",
          description: responseData.message,
          variant: "default",
        });
        setAddresses(addresses.filter((address) => address.id !== id));
        setShowConfirmModal(false);
      } else {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description:
            responseData.message || "Failed to submit payout request.",
        });
      }
      
    } catch (error:any) {
        toast({
          variant: "destructive",
          title: "Error deleting address",
          description: error,
        });
    }
  };

  const setAsPrimaryddress = async (id: number) => {
    try {
      const response = await api.get(`/primary/address/${id}`);
      const responseData = response.data;
      if (responseData.status == "Success") {
        toast({
          className: cn("bg-green-500 text-white"),
          title: "Success",
          description: responseData.message,
          variant: "default",
        });
        setShowConfirmModalForPrimary(false);
        // Refresh the list of addresses
        await fetchAddresses();
      } else {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description:
            responseData.message || "Failed to submit payout request.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting address",
        description: error,
      });
    }
  };

  const handleDeleteClick = (id: number) => {
    setAddressToDelete(id);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = () => {
    if (addressToDelete !== null) {
      deleteAddress(addressToDelete);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setAddressToDelete(null);
  };


  // set as Priamary
  const handleSetAsPrimaryClick = (id: number) => {
    setAddressToDelete(id);
    setShowConfirmModalForPrimary(true);
  };

  const handleConfirmForPrimary = () => {
    if (addressToDelete !== null) {
      setAsPrimaryddress(addressToDelete);
    }
  };

  const handleCancelForPrimary = () => {
    setShowConfirmModalForPrimary(false);
  };


  useEffect(() => {
    fetchAddresses();
  }, []);

  return (
    <div>
      {loading ? (
        <div className="text-center">
          <p>Loading...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.length > 0 ? (
            addresses.map((address) => (
              <Card key={address.id}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-10 lg:gap-4">
                    <div className="map-card hidden lg:flex">
                      {address.is_primary ? (
                        <span className="bg-black rounded-md text-sm p-1 text-white">
                          Primary
                        </span>
                      ) : (
                        ""
                      )}
                    </div>
                    <div className="col-span-8">
                      <div className="flex justify-between mb-3">
                        <div>
                          <span className="text-gray-500">
                            Apartment/ Flat No
                          </span>
                          <p>{address.flat_no}</p>
                        </div>
                        {address.direction ? (
                          <div>
                            <span className="text-gray-500">Direction</span>
                            <p>{address.direction}</p>
                          </div>
                        ) : (
                          ""
                        )}
                        <div>
                          <span className="text-gray-500">Nick Name</span>
                          <p>{address.nick_name}</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Address</span>
                        <p>{address.address}</p>
                      </div>
                    </div>
                    <div className="flex lg:flex-col justify-end lg:justify-center flex-1 gap-2">
                      <Button variant="link" className="bg-gray-100 text-gray-700">
                        <Link href={`/addresses/edit-address/${address.id}`}>
                          Edit
                        </Link>
                      </Button>
                      {address.is_primary ? (
                        <></>
                      ) : (
                        <Button
                          className="text-white bg-emerald-500"
                          onClick={() => handleSetAsPrimaryClick(address.id)}
                        >
                          Set as Primary
                        </Button>
                      )}

                      <Button
                        className=" bg-red-500"
                        onClick={() => handleDeleteClick(address.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div>No records found.</div>
          )}
        </div>
      )}

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete this address? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete}>
              Cancel
            </Button>
            <Button
              className="bg-black text-white"
              onClick={handleConfirmDelete}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* set primary modal */}
      <Dialog
        open={showConfirmModalForPrimary}
        onOpenChange={setShowConfirmModalForPrimary}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Updation</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to change this address as primary</p>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelForPrimary}>
              Cancel
            </Button>
            <Button
              className="bg-black text-white"
              onClick={handleConfirmForPrimary}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
