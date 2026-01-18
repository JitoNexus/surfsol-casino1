import React, { useMemo } from 'react';
import { ArrowLeft, Copy, QrCode, RotateCcw } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

type Props = {
  address?: string;
  balance: number;
  onBack: () => void;
  onRefresh: () => void;
};

const WalletScreen: React.FC<Props> = ({ address, balance, onBack, onRefresh }) => {
  const shortAddress = useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 6)}…${address.slice(-6)}`;
  }, [address]);

  const copy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = address;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const qrValue = address ? `solana:${address}` : '';

  return (
    <div className="px-6 pb-28">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-300 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-bold">Back</span>
        </button>
        <button
          onClick={onRefresh}
          className="bg-white/10 hover:bg-white/15 px-3 py-2 rounded-xl font-bold text-sm border border-white/10 inline-flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="glass-morphism rounded-3xl p-5 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-black uppercase tracking-widest text-gray-300">Deposit Wallet</div>
          <div className="text-xs font-bold text-surfsol-accent">Solana</div>
        </div>

        <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
          <div className="text-xs text-gray-400 mb-2">Address</div>
          {address ? (
            <>
              <div className="font-mono text-sm text-white break-all">{address}</div>
              <div className="mt-3 flex items-center gap-2">
                <div className="text-xs text-gray-400 font-bold">{shortAddress}</div>
                <button
                  onClick={copy}
                  className="ml-auto px-3 py-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 font-bold text-sm inline-flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
            </>
          ) : (
            <div className="text-gray-400 text-sm">Open the Mini App from Telegram to load your wallet.</div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <QrCode className="w-4 h-4 text-surfsol-accent" />
              <div className="text-sm font-bold">Deposit QR</div>
            </div>
            <div className="flex items-center justify-center">
              {address ? (
                <div className="bg-white p-3 rounded-2xl">
                  <QRCodeCanvas value={qrValue} size={180} includeMargin />
                </div>
              ) : (
                <div className="text-gray-400 text-sm">No address</div>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-3">
              Send SOL to this address. Then press Refresh.
            </div>
          </div>

          <div className="bg-gradient-to-br from-surfsol-primary/20 to-surfsol-secondary/10 rounded-2xl p-4 border border-white/10">
            <div className="text-sm font-black uppercase tracking-widest text-white/80 mb-1">Balance</div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-black">{balance.toFixed(4)}</div>
              <div className="text-sm font-bold text-white/70">SOL</div>
            </div>
            <div className="text-xs text-white/60 mt-2">
              Deposits are non-custodial. Don’t send other tokens.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletScreen;
