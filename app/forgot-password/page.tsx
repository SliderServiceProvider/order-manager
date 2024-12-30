"use client";

import { useState } from "react";
import EmailForm from "./email-form";

export default function ForgotPassword() {
  const [emailSent, setEmailSent] = useState(false);

  return (
    <div className="container mx-auto max-w-md p-4">
      <h1 className="text-2xl font-bold mb-4">Forgot Password</h1>
      {!emailSent ? (
        <EmailForm onSuccess={() => setEmailSent(true)} />
      ) : (
        <p className="text-green-600">
          A password reset link has been sent to your email. Please check your
          inbox and click on the link to reset your password.
        </p>
      )}
    </div>
  );
}
