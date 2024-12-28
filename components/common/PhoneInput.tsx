import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/services/api";

interface CountryCode {
  id: number;
  name: string;
  phonecode: string;
  code: string;
}

interface PhoneInputProps {
  countryCode: string;
  phoneNumber: string;
  onPhoneChange: (countryCode: string, phoneNumber: string) => void;
}

export function PhoneInput({
  countryCode,
  phoneNumber,
  onPhoneChange,
}: PhoneInputProps) {
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(
    null
  );

  useEffect(() => {
    const fetchCountryCodes = async () => {
      try {
        const response = await api.get("/getCountryCode");
        const data = response.data;
        setCountryCodes(data);

        // Set initial selected country based on countryCode prop
        if (countryCode) {
          const initialCountry = data.find(
            (country: CountryCode) =>
              country.phonecode === countryCode.replace("+", "")
          );
          setSelectedCountry(initialCountry || null);
        }
      } catch (error) {
        console.error("Error fetching country codes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCountryCodes();
  }, [countryCode]);

  const handleCountryCodeChange = (value: string) => {
    const selectedCountry = countryCodes.find(
      (country) => country.phonecode === value
    );
    setSelectedCountry(selectedCountry || null);
    const normalizedCode = value.startsWith("+") ? value : `+${value}`;
    onPhoneChange(normalizedCode, phoneNumber);
  };

  const handlePhoneNumberChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newPhoneNumber = event.target.value.replace(/\D/g, "");
    onPhoneChange(countryCode, newPhoneNumber);
  };

  if (loading) {
    return <div>Loading country codes...</div>;
  }

  return (
    <div className="space-y-1">
      <Label htmlFor="phoneNumber">Phone Number</Label>
      <div className="flex">
        <Select
          onValueChange={handleCountryCodeChange}
          value={countryCode.replace("+", "")}
        >
          <SelectTrigger className="w-[110px]">
            <SelectValue>
              {selectedCountry ? selectedCountry.phonecode : countryCode}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {countryCodes.map((country) => (
              <SelectItem key={country.id} value={country.phonecode}>
                {country.name} ({country.phonecode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id="phoneNumber"
          className="flex-1 ml-2"
          placeholder="Enter your phone number"
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
        />
      </div>
    </div>
  );
}

export default PhoneInput;
