import AccountSettingsForm from "@/components/account-settings/AccountSettingsForm";
import { SavedCards } from "@/components/saved-cards/SavedCards";
import { Button } from "@/components/ui/button";
import React from "react";

export default function page() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h4 className="text-2xl text-black font-semibold">Account Settings</h4>
      </div>
      {/* Account Settings */}
      <AccountSettingsForm />
      <SavedCards />
    </div>
  );
}
