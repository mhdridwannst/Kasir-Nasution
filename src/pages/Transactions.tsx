import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchTransactions,
  formatRupiah,
  formatDateTime,
  extractErrorMessage,
} from '../utils/api';
import { Transaction } from '../types';
import {
  Receipt,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Printer,
  X,
  CreditCard,
  QrCode,
  Banknote,
  Building,
  CheckCircle2,
} from 'lucide-react';

export const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchInvoice, setSearchInvoice] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Detail Modal
  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  const loadTransactions = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchTransactions({ limit: 100 });
      setTransactions(res.data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(extractErrorMessage(err, 'Gagal memuat riwayat transaksi penjualan.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchInvoice =
        t.invoiceNumber.toLowerCase().includes(searchInvoice.toLowerCase()) ||
        (t.cashier?.fullName && t.cashier.fullName.toLowerCase().includes(searchInvoice.toLowerCase())) ||
        (t.cashier?.email && t.cashier.email.toLowerCase().includes(searchInvoice.toLowerCase()));

      const matchMethod =
        selectedMethod === 'all' ||
        t.paymentMethod.toLowerCase() === selectedMethod.toLowerCase();

      return matchInvoice && matchMethod;
    });
  }, [transactions, searchInvoice, selectedMethod]);

  const handleOpenDetail = (trx: Transaction) => {
    setSelectedTrx(trx);
    setIsDetailOpen(true);
  };

  const getMethodBadge = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <Banknote className="w-3 h-3 text-emerald-600" />
            <span>Tunai</span>
          </span>
        );
      case 'qris':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <QrCode className="w-3 h-3 text-blue-600" />
            <span>QRIS</span>
          </span>
        );
      case 'debit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            <CreditCard className="w-3 h-3 text-purple-600" />
            <span>Debit</span>
          </span>
        );
      case 'transfer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Building className="w-3 h-3 text-amber-600" />
            <span>Transfer</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
            {method}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-slate-800" />
            <span>Riwayat Transaksi Penjualan</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Daftar seluruh nota penjualan, status pembayaran, dan faktur kasir.
          </p>
        </div>

        <button
          onClick={loadTransactions}
          disabled={loading}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors self-start sm:self-auto"
          title="Muat Ulang Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={loadTransactions} className="underline text-red-900">
            Coba lagi
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Cari nomor invoice atau kasir..."
            value={searchInvoice}
            onChange={(e) => setSearchInvoice(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all"
          />
        </div>

        {/* Payment Method Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <button
            onClick={() => setSelectedMethod('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              selectedMethod === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Metode
          </button>
          {['cash', 'qris', 'debit', 'transfer'].map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMethod(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-colors shrink-0 ${
                selectedMethod === m
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th scope="col" className="px-5 py-3.5">No. Invoice</th>
                <th scope="col" className="px-5 py-3.5">Tanggal & Waktu</th>
                <th scope="col" className="px-5 py-3.5">Kasir</th>
                <th scope="col" className="px-5 py-3.5">Metode Bayar</th>
                <th scope="col" className="px-5 py-3.5">Total Belanja</th>
                <th scope="col" className="px-5 py-3.5">Status</th>
                <th scope="col" className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-slate-500" />
                      <span>Memuat riwayat transaksi...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
                    <p className="font-medium text-slate-700">Belum ada transaksi</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchInvoice || selectedMethod !== 'all'
                        ? 'Tidak ada transaksi yang cocok dengan filter.'
                        : 'Lakukan penjualan pertama melalui halaman Kasir (POS).'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Invoice */}
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">
                      {trx.invoiceNumber}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {formatDateTime(trx.transactionDate)}
                    </td>

                    {/* Cashier */}
                    <td className="px-5 py-4 text-xs font-medium text-slate-700">
                      {trx.cashier?.fullName || trx.cashier?.email?.split('@')[0] || 'Kasir'}
                    </td>

                    {/* Method */}
                    <td className="px-5 py-4">
                      {getMethodBadge(trx.paymentMethod)}
                    </td>

                    {/* Total Amount */}
                    <td className="px-5 py-4 font-extrabold text-slate-900">
                      {formatRupiah(trx.totalAmount)}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Selesai</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(trx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail / Struk Invoice */}
      {isDetailOpen && selectedTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 my-6">
            <div className="flex items-center justify-between pb-4 border-b border-dashed border-slate-300">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Faktur Penjualan</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedTrx.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Metadata */}
            <div className="py-3 border-b border-dashed border-slate-300 text-xs font-mono space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Waktu:</span>
                <span>{formatDateTime(selectedTrx.transactionDate)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Kasir:</span>
                <span>{selectedTrx.cashier?.fullName || selectedTrx.cashier?.email || 'Kasir'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Metode:</span>
                <span className="uppercase font-semibold text-slate-900">{selectedTrx.paymentMethod}</span>
              </div>
            </div>

            {/* Items */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-2 text-xs font-mono max-h-52 overflow-y-auto">
              {selectedTrx.details?.map((detail, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-900">{detail.product?.name || 'Produk'}</p>
                    <p className="text-slate-500 text-[11px]">
                      {detail.quantity} x {formatRupiah(detail.unitPrice)}
                    </p>
                  </div>
                  <span className="font-semibold text-slate-900 shrink-0">
                    {formatRupiah(detail.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-3 border-b border-dashed border-slate-300 text-xs font-mono space-y-1">
              {Number(selectedTrx.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Diskon:</span>
                  <span>-{formatRupiah(selectedTrx.discountAmount)}</span>
                </div>
              )}
              {Number(selectedTrx.taxAmount) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Pajak:</span>
                  <span>+{formatRupiah(selectedTrx.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1">
                <span>TOTAL:</span>
                <span>{formatRupiah(selectedTrx.totalAmount)}</span>
              </div>
            </div>

            {/* Print & Close */}
            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-1/2 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Ulang</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="w-1/2 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
