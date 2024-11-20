"use client";

import React, { useState } from "react";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";

interface AddressEditProps {
  initialAddress: string;
  initialFlatNo: string;
  initialDirection?: string;
  isDefault: boolean;
  onSubmit: (address: {
    address: string;
    flatNo: string;
    direction?: string;
    isDefault: boolean;
  }) => void;
}

export default function AddressForm({
  initialAddress,
  initialFlatNo,
  initialDirection,
  isDefault,
  onSubmit,
}: AddressEditProps) {
  const [address, setAddress] = useState(initialAddress);
  const [flatNo, setFlatNo] = useState(initialFlatNo);
  const [direction, setDirection] = useState(initialDirection || "");
  const [defaultAddress, setDefaultAddress] = useState(isDefault);

  const handleSubmit = () => {
    onSubmit({ address, flatNo, direction, isDefault: defaultAddress });
  };

  return (
    <div>
      {/* Map Section */}
      <div className="mb-4">
        <div className="rounded-lg overflow-hidden border border-gray-300">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3151.8354345093745!2d144.95373631531784!3d-37.81720997975133!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6ad642af0f11fd81%3A0xf5779eecbbae2464!2sEureka%20Skydeck!5e0!3m2!1sen!2sau!4v1633943001791!5m2!1sen!2sau"
            title="map"
            className="w-full h-48"
          ></iframe>
        </div>
      </div>

      {/* Address Section */}
      <div className="flex items-center justify-between mb-4">
        <Input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter Address"
          className="flex-1 mr-2"
        />
        <Button className="bg-black text-white">Locate Me</Button>
      </div>

      {/* Flat/Street Fields */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Input
          type="text"
          value={flatNo}
          onChange={(e) => setFlatNo(e.target.value)}
          placeholder="House / Apartment / Flat No."
        />
        <Input
          type="text"
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          placeholder="Street / Type Name (optional)"
        />
      </div>

      {/* Additional Instructions */}
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Extra Instructions (optional)"
          className="w-full"
        />
      </div>

      {/* Default Address Section */}
      <div className="flex items-center gap-2 mb-4">
        <span>Default Address</span>
        <div className="flex items-center space-x-4">
          <Button
            variant={defaultAddress ? "default" : "outline"}
            onClick={() => setDefaultAddress(false)}
          >
            No
          </Button>
          <Button
            variant={defaultAddress ? "outline" : "default"}
            onClick={() => setDefaultAddress(true)}
          >
            Yes
          </Button>
        </div>
      </div>

      {/* Submit Button */}
      <div className="text-right">
        <Button className="bg-black text-white" onClick={handleSubmit}>
          Submit
        </Button>
      </div>
    </div>
  );
}
