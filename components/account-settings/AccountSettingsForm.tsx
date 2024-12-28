"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings } from "lucide-react";
import { Button } from "../ui/button";

import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import api from "@/services/api";
import { useState, useEffect } from "react";
import { PhoneInput } from "../common/PhoneInput";

interface UserProfileData {
  name: string;
  email: string;
  phone_number?: string;
  auth_token?: string;
  city: string;
  user_type: number;
  referral_code: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  iban_number: string;
}

interface CountryCode {
  id: number;
  name: string;
  dial_code: string;
  code: string;
}

export default function AccountSettingsForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [referralCode, setReferralCode] = useState("");
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    dial_code: "",
    phone_number: "",
    email: "",
    city: "default",
    accountType: "2",
  });
  const [bankData, setBankData] = useState({
    bank_name: "",
    account_holder_name: "",
    account_number: "",
    iban_number: "",
  });

  const [submitLoading, setSubmitLoading] = useState(false);
  const [bankSubmitLoading, setBankSubmitLoading] = useState(false);

  // Handle input changes for both forms
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id in bankData) {
      setBankData((prev) => ({ ...prev, [id]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

  // Handle select change
  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get(`/order-manager/getProfileData/`);
        const data = response.data;
        console.log(data);

        // Populate form fields with fetched data
        setFormData({
          name: data.name || "",
          email: data.email || "",
          dial_code: data.dial_code || "",
          phone_number: data.phone_number || "",
          city: data.city || "",
          accountType: data.user_type ? data.user_type.toString() : "1",
        });

        setBankData({
          bank_name: data.bank_name || "",
          account_holder_name: data.account_holder_name || "",
          account_number: data.account_number || "",
          iban_number: data.iban_number || "",
        });
        // Set referral code separately
        setReferralCode(data.referral_code || "");
      } catch (error) {
        console.error("Error fetching address:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load profile data.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Submit form
  const handleSubmit = async () => {
    setSubmitLoading(true);
    try {
      const response = await api.post(
        "/order-manager/updateProfileInfo",
        formData
      );
      const responseData = response.data;

      if (responseData.success) {
        toast({
          className: cn("bg-green-500 text-white"),
          title: "Success",
          description: responseData.message,
          variant: "default",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description:
            responseData.message || "Failed to submit payout request.",
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
    } finally {
      setSubmitLoading(false);
    }
  };

  const handlePhoneChange = (countryCode: string, phoneNumber: string) => {
    setFormData((prev) => ({
      ...prev,
      dial_code: countryCode.startsWith("+") ? countryCode : `+${countryCode}`,
      phone_number: phoneNumber,
    }));
  };

  // Submit bank data
  const handleBankSubmit = async () => {
    setBankSubmitLoading(true);
    try {
      const response = await api.post("/user/update-account-details", bankData);
      console.log(response);

      if (response.status == 200) {
        toast({
          className: cn("bg-green-500 text-white"),
          title: "Bank Details Updated",
          description: "Your bank details have been successfully updated.",
        });
      } else {
        throw new Error(response.data.message || "Bank details update failed.");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.response.data.message || "Failed to update bank details.",
      });
    } finally {
      setBankSubmitLoading(false);
    }
  };

  // if (loading) {
  //   return <div>Loading...</div>;
  // }

  return (
    <div className="flex gap-4">
      <Card className="w-full md:w-1/2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-medium">
            <Settings className="h-5 w-5 text-orange-500" />
            Profile Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <PhoneInput
              countryCode={
                formData.dial_code.startsWith("+")
                  ? formData.dial_code
                  : `+${formData.dial_code}`
              }
              phoneNumber={formData.phone_number || ""}
              onPhoneChange={handlePhoneChange}
            />

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="city">City</Label>
              <Select
                value={formData.city}
                onValueChange={(value) => handleSelectChange("city", value)}
              >
                <SelectTrigger id="city">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Abu Dhabi">Abu Dhabi</SelectItem>
                  <SelectItem value="Ajman">Ajman</SelectItem>
                  <SelectItem value="Dubai">Dubai</SelectItem>
                  <SelectItem value="Fujairah">Fujairah</SelectItem>
                  <SelectItem value="Ras al-Khaimah">Ras al-Khaimah</SelectItem>
                  <SelectItem value="Sharjah">Sharjah</SelectItem>
                  <SelectItem value="Umm Al Quwain">Umm Al Quwain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="accountType">Account Type</Label>
              <Select
                value={formData.accountType}
                onValueChange={(value) =>
                  handleSelectChange("accountType", value)
                }
              >
                <SelectTrigger id="accountType">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Customer</SelectItem>
                  <SelectItem value="2">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="referralCode">Referral Code</Label>
              <Input
                id="referralCode"
                value={referralCode}
                className="bg-gray-50"
                readOnly
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            className="bg-black text-white"
            onClick={handleSubmit}
            disabled={submitLoading}
          >
            {submitLoading ? "Updating..." : "Update"}
          </Button>
        </CardFooter>
      </Card>
      {/* Bank Account Settings Form */}
      <Card className="w-full md:w-1/2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-medium">
            <Settings className="h-5 w-5 text-orange-500" />
            Bank Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                placeholder="Enter your bank name"
                value={bankData.bank_name}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="account_holder_name">Account Holder Name</Label>
              <Input
                id="account_holder_name"
                placeholder="Enter your account name"
                value={bankData.account_holder_name}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="account_number">Account Number</Label>
              <Input
                id="account_number"
                placeholder="Enter your account number"
                value={bankData.account_number}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="iban_number">IBAN Number</Label>
              <Input
                id="iban_number"
                placeholder="Enter your IBAN number"
                value={bankData.iban_number}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            className="bg-black text-white"
            onClick={handleBankSubmit}
            disabled={bankSubmitLoading}
          >
            {bankSubmitLoading ? "Updating..." : "Update Bank Details"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
