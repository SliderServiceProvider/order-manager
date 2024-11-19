import React from "react";
import {
  IconPackage,
  IconTruck,
  IconPhone,
  IconBrandWhatsapp,
  IconMessage,
} from "@tabler/icons-react";
import Link from "next/link";
interface Order {
  id: number;
  order_number: string;
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
  created_at: string;
  cod_amount: string;
  cash_collected: string;
  detailPageLink: string;
  date_time: string;
  pickup: string;
  drop_off: string;
  drop_off_two: string;
  driver: string;
}

export default function OrderCard({ order }: { order: Order }) {
  return (
    <div className="border rounded-lg p-6 shadow-sm bg-white mx-auto mb-4">
      <Link
        href={`/orders/order-details/${order.order_number}`}
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-gray-500 text-sm">Order Status</p>
            <p className="text-green-600">{order.status}</p>
          </div>
          <button className="bg-black text-white px-4 py-2 rounded-md text-sm">
            Track Order
          </button>
          <div className="text-right">
            <p className="text-gray-500 text-sm">Order Placed at</p>
            <p>{order.date_time}</p>
          </div>
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
            <span className="text-gray-600">Order Number : </span>{" "}
            {order.order_number}
          </div>
        </div>

        <div className="flex gap-8 items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary rounded-full p-3">
              <IconPackage className="text-black" size={24} />
            </div>
            <div>
              <p className=" text-gray-800 text-sm">Package Location</p>
              <p className="text-gray-500 text-sm">
                4 Al As-hum St - Mohamed Bin Zayed City - ME-11 – Abu Dhabi –
                United Arab Emirates
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-primary rounded-full p-3">
              <IconTruck className="text-black" size={24} />
            </div>
            <div>
              <p className=" text-gray-800 text-sm">Deliver Location</p>
              <p className="text-gray-500 text-sm">
                17 المزهر - Mohamed Bin Zayed City - Z27 – Abu Dhabi – United
                Arab Emirates
              </p>
            </div>
          </div>
        </div>
        <hr />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-gray-200 w-12 h-12 flex items-center justify-center">
              {/* Placeholder for user avatar */}
              <p className=" text-gray-600">W</p>
            </div>
            <div>
              <p className="text-gray-800">waleed</p>
              <p className="text-gray-500 text-sm">
                <span className="text-yellow-500">★</span> 0 (0 reviews)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <IconMessage className="text-gray-500 cursor-pointer" size={24} />
            <IconPhone className="text-gray-500 cursor-pointer" size={24} />
            <IconBrandWhatsapp
              className="text-gray-500 cursor-pointer"
              size={24}
            />
          </div>
        </div>
      </Link>
    </div>
  );
}
