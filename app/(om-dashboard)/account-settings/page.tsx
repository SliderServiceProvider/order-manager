import AccountSettingsForm from '@/components/account-settings/AccountSettingsForm';
import React from 'react'

export default function page() {
  return (
    <div>
      <div className="page-header">
        <h4 className="text-2xl text-black font-semibold">Account Settings</h4>
      </div>
      {/* Account Settings */}
      <AccountSettingsForm/>
    </div>
  );
}
