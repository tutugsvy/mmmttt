'use client';

export default function CopyAddress({ address }) {
  return <button className="btn btn--ghost" type="button" onClick={() => navigator.clipboard?.writeText(address)}>Copy Address</button>;
}
