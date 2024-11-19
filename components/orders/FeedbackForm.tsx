import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconStarFilled } from "@tabler/icons-react";
import api from "@/services/api";

import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

interface FeedbackFormProps {
  orderNumber: number;
  onClose: () => void; // Close the form
  onSubmit: (orderNumber: number, rating: number, comment: string) => void; // Submit feedback
}

export default function FeedbackForm({
  orderNumber,
  onClose,
  onSubmit,
}: FeedbackFormProps) {
  const [rating, setRating] = useState(0); // User rating
  const [comment, setComment] = useState(""); // User comment
  const { toast } = useToast();

  const handleRatingClick = (value: number) => {
    setRating(value); // Set the selected rating
  };

  const handleSubmit = () => {
    if (rating === 0) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: "Please provide a rating!",
      });
      return;
    }
    onSubmit(orderNumber, rating, comment); // Submit feedback
    onClose(); // Close the form
  };

  return (
    <div className="bg-white p-6 rounded w-full">
      <h3 className="text-lg font-semibold mb-4">Rate Driver</h3>
      {/* Star Rating */}
      <div className="flex items-center mb-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <IconStarFilled
            key={index}
            className={`h-6 w-6 cursor-pointer ${
              rating > index ? "text-yellow-400" : "text-gray-300"
            }`}
            onClick={() => handleRatingClick(index + 1)}
          />
        ))}
      </div>
      {/* Comment Box */}
      <textarea
        className="w-full h-24 p-2 border rounded-md bg-gray-100"
        placeholder="Comment..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      ></textarea>
      {/* Action Buttons */}
      <div className="flex justify-end mt-4 gap-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button className="bg-black text-white" onClick={handleSubmit}>
          Confirm Review
        </Button>
      </div>
    </div>
  );
}
