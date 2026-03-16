import React, { useEffect, useState } from 'react';
import { productsApi } from '@/lib/api';

interface Props {
  productId: string;
  type?: 'barcode' | 'qrcode';
  barcodeParams?: { type?: string; scale?: number; height?: number };
  qrParams?: { width?: number };
  alt?: string;
  className?: string;
}

export default function BarcodeDisplay({ productId, type = 'barcode', barcodeParams, qrParams, alt = '', className }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const blob = type === 'qrcode'
          ? await productsApi.getQRCodeImage(productId, qrParams)
          : await productsApi.getBarcodeImage(productId, barcodeParams as any);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setSrc(url);
      } catch (err: any) {
        setError(err?.message || 'Failed to load image');
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (src) URL.revokeObjectURL(src);
    };
  }, [productId, type, JSON.stringify(barcodeParams || {}), JSON.stringify(qrParams || {})]);

  if (loading) return <div className={className}>Loading...</div>;
  if (error) return <div className={className}>Error: {error}</div>;
  if (!src) return null;

  return (
    <img src={src} alt={alt || `${type} for product`} className={className} />
  );
}
