interface LoadDetailsProps {
  loadId: string;
  origin: {
    name: string;
    location: string;
  };
  destination: {
    name: string;
    location: string;
  };
  equipment: string;
  rate: string;
  weight: string;
  driver: {
    name: string;
    phone: string;
  };
  truck: {
    number: string;
    trailer: string;
  };
}

export default function LoadDetails({
  loadId,
  origin,
  destination,
  equipment,
  rate,
  weight,
  driver,
  truck,
}: LoadDetailsProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Load Details</h2>
        <div className="text-lg font-bold text-gray-700">#{loadId}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-500">Origin</h3>
          <p className="font-medium">{origin.name}</p>
          <p className="text-sm text-gray-600">{origin.location}</p>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-500">Destination</h3>
          <p className="font-medium">{destination.name}</p>
          <p className="text-sm text-gray-600">{destination.location}</p>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-500">Equipment</h3>
          <p className="font-medium">{equipment}</p>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-500">Rate per mile</h3>
          <p className="font-medium">{rate}</p>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-500">Weight</h3>
          <p className="font-medium">{weight}</p>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-500">Driver</h3>
          <p className="font-medium">{driver.name}</p>
          <p className="text-sm text-gray-600">{driver.phone}</p>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-500">Truck Number</h3>
          <p className="font-medium">{truck.number}</p>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-500">Trailer Number</h3>
          <p className="font-medium">{truck.trailer}</p>
        </div>
      </div>
    </div>
  );
}
