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
  Download,
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

  // Aggregate metrics from filtered data
  const totalRevenue = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
  }, [filteredTransactions]);

  const averageTicket = useMemo(() => {
    if (filteredTransactions.length === 0) return 0;
    return totalRevenue / filteredTransactions.length;
  }, [filteredTransactions, totalRevenue]);

  const handleOpenDetail = (trx: Transaction) => {
    setSelectedTrx(trx);
    setIsDetailOpen(true);
  };

  // Export to CSV / Excel
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('Tidak ada data transaksi untuk diekspor.');
      return;
    }

    const headers = [
      'No. Invoice',
      'Tanggal & Waktu',
      'Kasir',
      'Metode Bayar',
      'Rincian Produk (Item x Qty)',
      'Subtotal',
      'Diskon',
      'Pajak',
      'Total Penjualan',
    ];

    const rows = filteredTransactions.map((trx) => {
      const itemsSummary = (trx.details || [])
        .map((d) => `${d.product?.name || 'Item'} (${d.quantity}x)`)
        .join(' | ');

      const subtotalCalc = (trx.details || []).reduce(
        (sum, d) => sum + Number(d.subtotal),
        0
      );

      return [
        `"${trx.invoiceNumber}"`,
        `"${formatDateTime(trx.transactionDate)}"`,
        `"${trx.cashier?.fullName || trx.cashier?.email || 'Staff'}"`,
        `"${trx.paymentMethod.toUpperCase()}"`,
        `"${itemsSummary}"`,
        subtotalCalc,
        trx.discountAmount || 0,
        trx.taxAmount || 0,
        trx.totalAmount,
      ];
    });

    const csvContent =
      '\uFEFF' + // UTF-8 BOM for Excel
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan-penjualan-nexpos-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMethodBadge = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <Banknote className="w-3 h-3 text-emerald-600" />
            <span>Tunai</span>
          </span>
        );
      case 'qris':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            <QrCode className="w-3 h-3 text-blue-600" />
            <span>QRIS</span>
          </span>
        );
      case 'debit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
            <CreditCard className="w-3 h-3 text-purple-600" />
            <span>Debit</span>
          </span>
        );
      case 'transfer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Building className="w-3 h-3 text-amber-600" />
            <span>Transfer</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 capitalize">
            {method}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 antialiased">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-slate-800" />
            <span>Riwayat Transaksi Penjualan</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Rekap seluruh nota kasir, faktur digital, dan laporan omzet per metode bayar.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadTransactions}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-all"
            title="Download file CSV / Excel"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Laporan (Excel)</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Omzet Terpilih
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
            {formatRupiah(totalRevenue)}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            {filteredTransactions.length} nota berhasil
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Transaksi
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
            {filteredTransactions.length}{' '}
            <span className="text-sm font-normal text-slate-400">transaksi</span>
          </p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            Tersimpan dalam database
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Rata-rata per Nota (AOV)
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
            {formatRupiah(averageTicket)}
          </p>
          <span className="text-[11px] text-blue-600 font-semibold mt-1 block">
            Nilai rata-rata keranjang
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={loadTransactions} className="underline text-red-900">
            Coba lagi
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors shrink-0 ${
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
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
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
                    <p className="font-bold text-slate-700">Belum ada transaksi</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchInvoice || selectedMethod !== 'all'
                        ? 'Tidak ada transaksi yang cocok dengan filter pencarian.'
                        : 'Lakukan penjualan pertama melalui halaman Kasir (POS).'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Invoice */}
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                      {trx.invoiceNumber}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {formatDateTime(trx.transactionDate)}
                    </td>

                    {/* Cashier */}
                    <td className="px-5 py-3.5 text-xs font-semibold text-slate-700">
                      {trx.cashier?.fullName || trx.cashier?.email?.split('@')[0] || 'Kasir'}
                    </td>

                    {/* Method */}
                    <td className="px-5 py-3.5">
                      {getMethodBadge(trx.paymentMethod)}
                    </td>

                    {/* Total Amount */}
                    <td className="px-5 py-3.5 font-black text-slate-900 tabular-nums">
                      {formatRupiah(trx.totalAmount)}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Selesai</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenDetail(trx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail & Cetak</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail & Cetak Ulang Nota (Thermal Compatible) */}
      {isDetailOpen && selectedTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 my-6">
            {/* The printable container */}
            <div id="thermal-receipt-printable">
              <div className="text-center pb-3 border-b border-dashed border-slate-400 relative">
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="no-print absolute right-0 top-0 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="font-black text-slate-900 text-base uppercase">Faktur Penjualan</h3>
                <div className="mt-1 text-[10px] text-slate-500 font-mono">
                  <p>No: {selectedTrx.invoiceNumber}</p>
                  <p>{formatDateTime(selectedTrx.transactionDate)}</p>
                  <p>Kasir: {selectedTrx.cashier?.fullName || selectedTrx.cashier?.email || 'Kasir'}</p>
                </div>
              </div>

              {/* Items */}
              <div className="py-3 border-b border-dashed border-slate-400 space-y-1.5 text-xs font-mono max-h-52 overflow-y-auto">
                {selectedTrx.details?.map((detail, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900">{detail.product?.name || 'Produk'}</p>
                      <p className="text-slate-500 text-[10px]">
                        {detail.quantity} x {formatRupiah(detail.unitPrice)}
                      </p>
                    </div>
                    <span className="font-bold text-slate-900 shrink-0 tabular-nums">
                      {formatRupiah(detail.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="py-2.5 border-b border-dashed border-slate-400 text-xs font-mono space-y-1">
                {Number(selectedTrx.discountAmount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Diskon:</span>
                    <span className="tabular-nums">-{formatRupiah(selectedTrx.discountAmount)}</span>
                  </div>
                )}
                {Number(selectedTrx.taxAmount) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Pajak:</span>
                    <span className="tabular-nums">+{formatRupiah(selectedTrx.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-300">
                  <span>TOTAL:</span>
                  <span className="tabular-nums">{formatRupiah(selectedTrx.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600 pt-0.5">
                  <span className="uppercase">Metode: {selectedTrx.paymentMethod}</span>
                  <span className="font-bold tabular-nums">{formatRupiah(selectedTrx.totalAmount)}</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[10px] text-slate-400">
                <p>Salinan Struk Resmi NexPOS</p>
              </div>
            </div>

            {/* Print & Close (No Print) */}
            <div className="no-print flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-1/2 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Nota</span>
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
