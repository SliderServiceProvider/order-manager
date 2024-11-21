import React from 'react'

const Loader = ({ isVisible }: { isVisible: boolean }) => {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-gray-500 z-[9999]"
      style={{
        backgroundColor: "rgba(0,0,0,0.9)",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-blue-500 font-bold">fetching package list...</p>
      </div>
    </div>
  );
};


export default Loader