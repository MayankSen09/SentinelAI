'use client';

/**
 * WalletButton — wallet connect/disconnect button for the header.
 *
 * Requirements: 15.1, 15.2, 15.3
 */

import dynamic from 'next/dynamic';

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export function WalletButton() {
  return <WalletMultiButtonDynamic />;
}
