"use client";
import React, { useState } from "react";
import {
  IconPackage,
  IconTruck,
  IconPhone,
  IconBrandWhatsapp,
  IconMessage,
  IconStarFilled,
} from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import api from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import FeedbackForm from "./FeedbackForm";
interface Order {
  id: number;
  order_number: number;
  order_reference_number: string;
  order_type: string;
  order_time: string;
  customer_id: string;
  recipient_phone: string;
  order_status: string;
  vehicle_type: string;
  task_status: string;
  payable_amount: string;
  order_cost: string;
  status: string;
  order_rating: string;
  created_at: string;
  cod_amount: string;
  cash_collected: string;
  detailPageLink: string;
  date_time: string;
  pickup: LocationDetails;
  drop_off: LocationDetails;
  drop_off_two?: LocationDetails;
  driver?: DriverDetails;
}

interface LocationDetails {
  id: number;
  address: string;
  short_name: string;
  flat_no?: string;
  city: string;
  direction?: string;
}

interface DriverDetails {
  id: number;
  name: string;
  phone_number: string;
  image_url: string;
  avg_rating?: string;
  total_reviews?: string;
  rating?: string;
}
interface Reason {
  id: number; // Unique identifier
  reason: string; // Reason text
}

export default function OrderCard({
  order,
  onRefresh,
}: {
  order: Order;
  onRefresh: () => void;
}) {
  const [showCancelForm, setShowCancelForm] = useState(false); // State to toggle cancel form
  const [reasons, setReasons] = useState<Reason[]>([]); // State for reasons
  const [selectedReason, setSelectedReason] = useState(""); // Selected dropdown value
  const [customReason, setCustomReason] = useState(""); // Custom reason from input
  const [showCustomInput, setShowCustomInput] = useState(false); // Toggle custom input visibility
  const [showFeedbackForm, setShowFeedbackForm] = useState(false); // Toggle feedback form
  const [loading, setLoading] = useState(false); // Loading state for API calls
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  // Fetch cancel reasons
  const fetchReasons = async () => {
    try {
      setLoading(true);
      const response = await api.get("customer/cancel-reasons");
      const data = response.data;

      setReasons(data.data); // Adjust as per API response structure
    } catch (error) {
      setError("Error fetching reasons.");
    } finally {
      setLoading(false);
    }
  };

  const handleReasonChange = (value: string) => {
    setSelectedReason(value);
    setShowCustomInput(value === "Other");
  };

  const handleSubmit = async () => {
    const reason = showCustomInput ? customReason : selectedReason;
    if (!reason) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: "Please select or provide a reason.",
      });
      return;
    }

    try {
      const response = await api.post("/cancel-order", {
        order_id: order.id,
        reason,
      });
      const responseData = response.data;
      // alert("Order cancellation submitted successfully.");
      if (responseData.status == "success") {
        toast({
          className: cn("bg-green-500 text-white"),
          title: "Success",
          description: responseData.message,
          variant: "default",
        });
        setShowCancelForm(false);
        onRefresh(); // Trigger refresh in the parent component
      } else {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description:
            responseData.message || "Failed to submit.",
        });
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "There was a problem with your request.";
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: errorMessage,
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      });
    }
  };

  const handleFeedbackSubmit = async (
    orderNumber: number,
    rating: number,
    comment: string
  ) => {
    try {
      const payload = {
        order_number: orderNumber,
        rating,
        comment,
      };

      // Replace with actual API endpoint
      const response = await api.post("/rating/rate-driver", payload);
      const responseData = response.data;
      if (responseData.status == "Success") {
        toast({
          className: cn("bg-green-500 text-white"),
          title: "Success",
          description: responseData.message,
          variant: "default",
        });
        setShowFeedbackForm(false);
        onRefresh(); // Trigger refresh in the parent component
      } else {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description:
            responseData.message ||
            "Failed to submit feedback. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: "Failed to submit feedback. Please try again.",
      });
    }
  };

  return (
    <div className="border rounded-lg p-6 shadow-sm bg-white mx-auto mb-4">
      <Link href={`/orders/order-details/${order.order_number}`}>
        {/* Order Details Section */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-gray-500 text-sm">Order Status</p>
            <p className="text-green-600">{order.status}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-sm">Order Placed at</p>
            <p>{order.date_time}</p>
          </div>
          {order.cod_amount && (
            <div className="text-right">
              <p className="text-cyan-500 text-sm">COD Amount</p>
              <p>{order.cod_amount} AED</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-gray-500 text-sm">Cost</p>
            <p>{order.payable_amount} AED</p>
          </div>
        </div>

        <hr />
        <div className="mb-4 mt-2 flex justify-between items-center">
          <p className="text-gray-600 text-sm">
            Package is
            <span className="text-green-600 ml-1">{order.task_status}</span>
          </p>
          <div>
            <span className="text-gray-600">Order Number : </span>
            {order.order_number}
          </div>
          {order.order_reference_number && (
            <div>
              <span className="text-gray-600">Order Ref Number : </span>
              {order.order_reference_number}
            </div>
          )}
        </div>
        {/* Pickup and Drop-off Locations */}
        <div className="mb-4 mt-2 flex justify-between items-center">
          <div className="flex items-center gap-4 w-1/2">
            <div className="bg-primary rounded-full p-3">
              <IconPackage className="text-black" size={24} />
            </div>
            <div>
              <p className="text-gray-800 text-sm">Package Location</p>
              <p className="text-gray-500 text-sm">{order.pickup.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 w-1/2">
            <div className="bg-primary rounded-full p-3">
              <IconTruck className="text-black" size={24} />
            </div>
            <div>
              <p className="text-gray-800 text-sm">DropOff Location</p>
              <p className="text-gray-500 text-sm">{order.drop_off.address}</p>
            </div>
          </div>
          {order.drop_off_two && (
            <div className="flex items-center gap-4 w-1/2">
              <div className="bg-primary rounded-full p-3">
                <IconTruck className="text-black" size={24} />
              </div>
              <div>
                <p className="text-gray-800 text-sm">DropOff Location 2</p>
                <p className="text-gray-500 text-sm">
                  {order.drop_off_two.address}
                </p>
              </div>
            </div>
          )}
        </div>
      </Link>
      {/* Driver Information */}
      {order.driver && (
        <div className="flex items-center justify-between border-t py-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-gray-200 w-12 h-12 flex items-center justify-center">
              <img
                src={order.driver.image_url}
                className="rounded-full w-12 h-12 object-cover"
                alt="slider driver"
              />
            </div>
            <div>
              <p className="text-gray-800">{order.driver.name}</p>
              <p className="text-gray-500 text-sm">
                <span className="text-yellow-500">★</span>{" "}
                {order.driver.avg_rating} ({order.driver.total_reviews})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {order.order_status === "Completed" ? (
              <>
                {order.order_rating === null ? (
                  // Show feedback button when no rating exists
                  <Button
                    className="bg-blue-500"
                    onClick={() => setShowFeedbackForm(true)}
                  >
                    Leave Feedback
                  </Button>
                ) : (
                  // Optional: Display feedback value (remove this block if not needed)
                  <div className="feedback_info_rep">
                    <p className="text-gray-500 mb-1">Feedback</p>
                    <p className="flex items-center">
                      <IconStarFilled className="text-yellow-500 mr-1" />
                      <span>{order.order_rating}</span>
                    </p>
                  </div>
                )}
              </>
            ) : (
              (order.order_status === "Assigned" ||
                order.order_status === "Un Assigned") && (
                // Display icons for Assigned or Un Assigned status
                <>
                  <Link
                    href={`${process.env.NEXT_PUBLIC_SERVER}/order-manager/messages/${order.order_number}/${order.customer_id}`}
                  >
                    <IconMessage
                      className="text-gray-500 cursor-pointer"
                      size={24}
                    />
                  </Link>

                  <IconPhone
                    className="text-gray-500 cursor-pointer"
                    size={24}
                  />
                  <IconBrandWhatsapp
                    className="text-gray-500 cursor-pointer"
                    size={24}
                  />
                </>
              )
            )}
          </div>
        </div>
      )}

      {/* Order Actions */}
      <div className="order-action flex justify-end gap-4 pt-4">
        {order.order_status !== "Completed" &&
          order.order_status !== "Canceled" && (
            <Button
              type="button"
              className="bg-red-500"
              onClick={(e) => {
                e.preventDefault();
                fetchReasons(); // Fetch reasons on opening cancel form
                setShowCancelForm(!showCancelForm);
              }}
            >
              Cancel Order
            </Button>
          )}
        {/* <Button className="bg-black">Track Order</Button> */}
      </div>

      {/* Cancel Order Form */}
      {showCancelForm && (
        <div className="mt-4 border rounded-lg p-4 bg-gray-100">
          <h3 className="text-lg font-semibold mb-2">Cancel Order</h3>
          {loading ? (
            <p>Loading reasons...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <>
              <div className="mb-4">
                <label
                  htmlFor="cancelReason"
                  className="block text-sm font-medium text-gray-700"
                >
                  Reason to Cancel
                </label>

                <Select onValueChange={handleReasonChange}>
                  <SelectTrigger className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white">
                    <SelectValue placeholder="-- Select a reason --" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasons.map((reason) => (
                      <SelectItem key={reason.id} value={reason.reason}>
                        {reason.reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showCustomInput && (
                <div className="mb-4">
                  <label
                    htmlFor="customReason"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Enter your reason
                  </label>
                  <textarea
                    id="customReason"
                    name="customReason"
                    rows={4}
                    className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Add a comment..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                  ></textarea>
                </div>
              )}

              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCancelForm(false)}
                >
                  Cancel
                </Button>
                <Button className="bg-red-500" onClick={handleSubmit}>
                  Confirm Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}
      {/* Feedback Form */}
      {showFeedbackForm && (
        <FeedbackForm
          orderNumber={order.order_number}
          onClose={() => setShowFeedbackForm(true)}
          onSubmit={handleFeedbackSubmit}
        />
      )}
    </div>
  );
}
