import React from "react";

export function PaymentLinkButton({ paymentLink }: { paymentLink: { url: string } }) {
  if (!paymentLink?.url) return <span>No payment link available</span>;
  return (
    <a href={paymentLink.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
      Pay Now
    </a>
  );
}