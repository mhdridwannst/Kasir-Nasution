import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  fetchProducts,
  createTransaction,
  formatRupiah,
  formatDateTime,
  extractErrorMessage,
} from '../utils/api';
import { sounds } from '../utils/sound';
import { Product, CartItem, PaymentMethod, Transaction } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  CreditCard,
  QrCode,
  Banknote,
  Building,
  CheckCircle2,
  Printer,
  RotateCcw,
  X,
  Package,
  ArrowRight,
  PauseCircle,
  PlayCircle,
  Volume2,
  VolumeX,
  Trash2,
  Sparkles,
  Coffee,
  Utensils,
  Cookie,
  ShoppingBag,
} from 'lucide-react';

interface ParkedOrder {
  id: string;
  label: string;
  cart: CartItem[];
  discountAmount: number;
  taxAmount: number;
  timestamp: string;
  subtotal: number;
}

export const Pos: React.FC = () => {
  const { user } = useAuth();

  // Master products & search state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sound toggle
  const [soundOn, setSoundOn] = useState<boolean>(sounds.isEnabled());

  // Active Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);

  // Parked Orders (Tahan Tagihan)
  const [parkedOrders, setParkedOrders] = useState<ParkedOrder[]>(() => {
    try {
      const saved = localStorage.getItem('pos_parked_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isParkedModalOpen, setIsParkedModalOpen] = useState<boolean>(false);
  const [parkLabelInput, setParkLabelInput] = useState<string>('');
  const [isParkPromptOpen, setIsParkPromptOpen] = useState<boolean>(false);

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [submittingTrx, setSubmittingTrx] = useState<boolean>(false);

  // Receipt Modal State
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);

  // Save parked orders to localStorage
  useEffect(() => {
    localStorage.setItem('pos_parked_orders', JSON.stringify(parkedOrders));
  }, [parkedOrders]);

  // Load products
  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetchProducts({ limit: 100 });
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Keyboard Shortcuts (Hotkeys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input (except for specific function keys)
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          setParkLabelInput(`Pelanggan #${parkedOrders.length + 1}`);
          setIsParkPromptOpen(true);
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0 && !isCheckoutOpen) {
          handleOpenCheckout();
        }
      } else if (e.key === 'Escape') {
        setIsCheckoutOpen(false);
        setIsParkedModalOpen(false);
        setIsParkPromptOpen(false);
        setIsReceiptOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, isCheckoutOpen, parkedOrders.length]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Category Color & Icon Styling Helper
  const getCategoryTheme = (cat?: string | null) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('kopi') || c.includes('coffee')) {
      return {
        badge: 'bg-amber-100 text-amber-900 border-amber-300',
        avatarBg: 'bg-gradient-to-br from-amber-600 to-amber-800 text-white',
        icon: Coffee,
      };
    }
    if (c.includes('makan') || c.includes('food') || c.includes('rice') || c.includes('nasi')) {
      return {
        badge: 'bg-orange-100 text-orange-900 border-orange-300',
        avatarBg: 'bg-gradient-to-br from-orange-500 to-red-600 text-white',
        icon: Utensils,
      };
    }
    if (c.includes('minum') || c.includes('drink') || c.includes('tea') || c.includes('teh') || c.includes('jus')) {
      return {
        badge: 'bg-cyan-100 text-cyan-900 border-cyan-300',
        avatarBg: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white',
        icon: Sparkles,
      };
    }
    if (c.includes('snack') || c.includes('camilan') || c.includes('kue') || c.includes('roti')) {
      return {
        badge: 'bg-purple-100 text-purple-900 border-purple-300',
        avatarBg: 'bg-gradient-to-br from-purple-500 to-pink-600 text-white',
        icon: Cookie,
      };
    }
    return {
      badge: 'bg-slate-100 text-slate-800 border-slate-300',
      avatarBg: 'bg-gradient-to-br from-slate-700 to-slate-900 text-white',
      icon: ShoppingBag,
    };
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory =
        selectedCategory === 'all' ||
        (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());

      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);
  const cashChange = Math.max(0, cashReceived - grandTotal);

  // Toggle Sound Effect
  const handleToggleSound = () => {
    const next = sounds.toggleSound();
    setSoundOn(next);
    if (next) sounds.playBeep();
  };

  // Add product to cart
  const handleAddToCart = (product: Product) => {
    const stock = product.inventoryStocks?.[0];
    const availableQty = stock ? Number(stock.quantity) : 0;

    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    const currentInCart = existingIndex > -1 ? cart[existingIndex].quantity : 0;

    if (currentInCart + 1 > availableQty) {
      sounds.playAlert();
      alert(`Stok tidak mencukupi! Hanya tersisa ${availableQty} unit.`);
      return;
    }

    sounds.playBeep();
    const price = Number(product.sellingPrice);

    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      newCart[existingIndex].subtotal = newCart[existingIndex].quantity * price;
      setCart(newCart);
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          unitPrice: price,
          subtotal: price,
        },
      ]);
    }
  };

  // Update item quantity
  const handleUpdateQuantity = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    const stock = product?.inventoryStocks?.[0];
    const availableQty = stock ? Number(stock.quantity) : 0;

    const currentItem = cart.find((i) => i.product.id === productId);
    if (!currentItem) return;

    const nextQty = currentItem.quantity + delta;

    if (delta > 0 && nextQty > availableQty) {
      sounds.playAlert();
      alert(`Maksimal stok tercapai (${availableQty} unit).`);
      return;
    }

    sounds.playBeep();

    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            if (nextQty <= 0) return null;
            return {
              ...item,
              quantity: nextQty,
              subtotal: nextQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Remove single item
  const handleRemoveItem = (productId: string) => {
    sounds.playBeep();
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Clear cart
  const handleClearCart = () => {
    if (cart.length > 0 && window.confirm('Kosongkan semua barang dari keranjang kasir?')) {
      sounds.playAlert();
      setCart([]);
      setDiscountAmount(0);
      setTaxAmount(0);
    }
  };

  // Park Order (Tahan Tagihan)
  const handleConfirmParkOrder = () => {
    if (cart.length === 0) return;
    const label = parkLabelInput.trim() || `Pelanggan #${parkedOrders.length + 1}`;

    const newParked: ParkedOrder = {
      id: String(Date.now()),
      label,
      cart: [...cart],
      discountAmount,
      taxAmount,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      subtotal,
    };

    setParkedOrders([newParked, ...parkedOrders]);
    setCart([]);
    setDiscountAmount(0);
    setTaxAmount(0);
    setIsParkPromptOpen(false);
    sounds.playBeep();
  };

  // Recall Parked Order
  const handleRecallOrder = (order: ParkedOrder) => {
    if (cart.length > 0 && !window.confirm('Keranjang saat ini masih berisi barang. Gantikan dengan tagihan yang ditahan?')) {
      return;
    }

    setCart(order.cart);
    setDiscountAmount(order.discountAmount);
    setTaxAmount(order.taxAmount);
    setParkedOrders(parkedOrders.filter((o) => o.id !== order.id));
    setIsParkedModalOpen(false);
    sounds.playBeep();
  };

  // Delete Parked Order
  const handleDeleteParkedOrder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Hapus tagihan tertahan ini?')) {
      setParkedOrders(parkedOrders.filter((o) => o.id !== id));
    }
  };

  // Open Checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    sounds.playBeep();
    setCashReceived(grandTotal);
    setIsCheckoutOpen(true);
  };

  // Process Checkout
  const handleProcessCheckout = async () => {
    if (paymentMethod === 'cash' && cashReceived < grandTotal) {
      sounds.playAlert();
      alert('Uang yang diterima kurang dari total tagihan!');
      return;
    }

    setSubmittingTrx(true);
    try {
      const payload = {
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        paymentMethod,
        taxAmount,
        discountAmount,
        outletName: 'Main Outlet',
      };

      const res = await createTransaction(payload);
      sounds.playSuccessChime();
      setCompletedTransaction(res.data);
      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);

      // Refresh product stock
      loadProducts();
    } catch (err) {
      sounds.playAlert();
      alert(extractErrorMessage(err, 'Gagal memproses transaksi kasir.'));
    } finally {
      setSubmittingTrx(false);
    }
  };

  // New Transaction after print
  const handleNewTransaction = () => {
    setCart([]);
    setDiscountAmount(0);
    setTaxAmount(0);
    setCashReceived(0);
    setIsReceiptOpen(false);
    setCompletedTransaction(null);
    sounds.playBeep();
  };

  return (
    <div className="flex-1 flex flex-col h-auto lg:h-[calc(100vh-0px)] overflow-hidden bg-slate-100/90 antialiased">
      {/* TOP POS HEADER BAR */}
      <div className="bg-white border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="font-extrabold text-slate-900 text-sm tracking-tight">Terminal Kasir POS</h2>
          </div>
          <span className="hidden sm:inline-block text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
            Outlet: Main Outlet
          </span>
        </div>

        {/* Audio Toggle & Parked Orders Badge */}
        <div className="flex items-center gap-2">
          {/* Sound Effect Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
              soundOn ? 'bg-slate-100 text-slate-800 hover:bg-slate-200' : 'bg-slate-50 text-slate-400'
            }`}
            title={soundOn ? 'Suara Aktif' : 'Suara Dimatikan'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden md:inline text-[11px]">{soundOn ? 'Suara On' : 'Mute'}</span>
          </button>

          {/* Parked Orders Button */}
          <button
            onClick={() => setIsParkedModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              parkedOrders.length > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <PauseCircle className="w-4 h-4" />
            <span>Tagihan Tertahan</span>
            {parkedOrders.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-amber-700 font-extrabold text-[11px] flex items-center justify-center">
                {parkedOrders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN SPLIT VIEW */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT PANEL: CATALOG & PRODUCTS GRID */}
        <section className="flex-1 flex flex-col h-full overflow-hidden p-4 lg:p-5 border-r border-slate-200/80">
          {/* Search Bar with Keyboard Hint */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari produk, SKU, barcode (tekan '/' atau F2)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-16 py-2.5 bg-white border border-slate-200/90 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs transition-all"
              />
              <div className="absolute right-3 top-2.5 flex items-center gap-1">
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 rounded border border-slate-200">
                    /
                  </kbd>
                )}
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-2xs ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200/80'
              }`}
            >
              Semua ({products.length})
            </button>
            {categories.map((cat) => {
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap capitalize transition-all border shadow-2xs ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 hover:bg-slate-200/80 border-slate-200/80'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">Memuat katalog produk toko...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <Package className="w-12 h-12 text-slate-300 mb-2 stroke-1" />
                <p className="text-sm font-semibold text-slate-700">Produk Tidak Ditemukan</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {searchQuery
                    ? `Tidak ada produk dengan kata kunci "${searchQuery}"`
                    : 'Belum ada produk di toko ini.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-4">
                {filteredProducts.map((p) => {
                  const stock = p.inventoryStocks?.[0];
                  const availableQty = stock ? Number(stock.quantity) : 0;
                  const isOutOfStock = availableQty <= 0;

                  // In cart count
                  const cartItem = cart.find((i) => i.product.id === p.id);
                  const countInCart = cartItem ? cartItem.quantity : 0;

                  // Initials for avatar
                  const initials = p.name
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase();

                  const theme = getCategoryTheme(p.category);
                  const CatIcon = theme.icon;

                  return (
                    <button
                      key={p.id}
                      onClick={() => !isOutOfStock && handleAddToCart(p)}
                      disabled={isOutOfStock}
                      className={`relative bg-white rounded-2xl p-3.5 border text-left flex flex-col justify-between transition-all group select-none ${
                        isOutOfStock
                          ? 'opacity-50 bg-slate-50 border-slate-200 cursor-not-allowed'
                          : 'border-slate-200/90 hover:border-slate-900/40 hover:shadow-md hover:-translate-y-0.5 active:scale-97 cursor-pointer'
                      }`}
                    >
                      {/* Badge if item in cart */}
                      {countInCart > 0 && (
                        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center shadow-md animate-bounce ring-2 ring-white">
                          {countInCart}
                        </span>
                      )}

                      <div>
                        {/* Avatar & Category */}
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className={`w-8 h-8 rounded-xl ${theme.avatarBg} flex items-center justify-center font-black text-xs shadow-xs`}>
                            {initials || <CatIcon className="w-4 h-4" />}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border capitalize truncate ${theme.badge}`}>
                            {p.category || 'Umum'}
                          </span>
                        </div>

                        {/* Product Name */}
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors">
                          {p.name}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-end justify-between">
                        <div>
                          <span className="text-[11px] text-slate-400 block font-mono">
                            {p.sku}
                          </span>
                          <span className="text-sm font-extrabold text-slate-900 block tabular-nums">
                            {formatRupiah(p.sellingPrice)}
                          </span>
                        </div>

                        {/* Stock indicator */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isOutOfStock
                              ? 'bg-red-100 text-red-700'
                              : availableQty <= 5
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isOutOfStock ? 'Habis' : `Stok: ${availableQty}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* BOTTOM SHORTCUT HUD BAR */}
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-mono overflow-x-auto">
            <div className="flex items-center gap-3">
              <span><kbd className="px-1.5 py-0.5 bg-white border rounded font-semibold text-slate-700">[/]</kbd> Cari Produk</span>
              <span><kbd className="px-1.5 py-0.5 bg-white border rounded font-semibold text-slate-700">[F4]</kbd> Tahan Tagihan</span>
              <span><kbd className="px-1.5 py-0.5 bg-white border rounded font-semibold text-slate-700">[F8]</kbd> Bayar Sekarang</span>
              <span><kbd className="px-1.5 py-0.5 bg-white border rounded font-semibold text-slate-700">[ESC]</kbd> Batal</span>
            </div>
            <span className="text-slate-400 hidden sm:inline">NexPOS Keyboard-Ready</span>
          </div>
        </section>

        {/* RIGHT PANEL: CART & BILLING PANEL */}
        <section className="w-full lg:w-96 xl:w-[420px] bg-white flex flex-col h-auto lg:h-full border-t lg:border-t-0 shadow-lg lg:shadow-none">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-slate-900" />
              <h2 className="font-black text-slate-900 text-base">Keranjang Kasir</h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-xs font-extrabold tabular-nums">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {cart.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      setParkLabelInput(`Pelanggan #${parkedOrders.length + 1}`);
                      setIsParkPromptOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Tahan Pesanan (F4)"
                  >
                    <PauseCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Tahan</span>
                  </button>

                  <button
                    onClick={handleClearCart}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Kosongkan Keranjang"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="h-64 lg:h-full flex flex-col items-center justify-center text-slate-400 text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
                  <ShoppingCart className="w-8 h-8 text-slate-300 stroke-1" />
                </div>
                <p className="font-bold text-slate-800 text-sm">Keranjang Masih Kosong</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Klik produk dari katalog atau scan barcode untuk menambahkan pesanan.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-900 text-xs truncate">
                      {item.product.name}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono tabular-nums">
                      {formatRupiah(item.unitPrice)}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 p-1 rounded-xl border border-slate-200/80">
                    <button
                      onClick={() => handleUpdateQuantity(item.product.id, -1)}
                      className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shadow-2xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs text-slate-900 tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQuantity(item.product.id, 1)}
                      className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Subtotal & Delete */}
                  <div className="text-right shrink-0 w-24">
                    <span className="font-extrabold text-xs text-slate-900 block tabular-nums">
                      {formatRupiah(item.subtotal)}
                    </span>
                    <button
                      onClick={() => handleRemoveItem(item.product.id)}
                      className="text-[11px] text-slate-400 hover:text-red-600 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Billing Calculation & Action Bottom Area */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-3">
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900 tabular-nums">{formatRupiah(subtotal)}</span>
              </div>

              {/* Diskon */}
              <div className="flex items-center justify-between">
                <span>Diskon (Rp)</span>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-24 text-right py-1 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 tabular-nums"
                />
              </div>

              {/* Total Tagihan */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-slate-900 text-sm">Total Tagihan</span>
                <span className="font-black text-slate-900 text-xl tabular-nums text-emerald-700">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </div>

            {/* Pay Button */}
            <button
              onClick={handleOpenCheckout}
              disabled={cart.length === 0}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Bayar Sekarang (F8)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>

      {/* MODAL: PARK ORDER PROMPT (Tahan Tagihan) */}
      {isParkPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <PauseCircle className="w-5 h-5 text-amber-500" />
              <span>Tahan Tagihan Transaksi</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Simpan sementara pesanan ini untuk melayani antrean berikutnya.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Nama / Label Pesanan
              </label>
              <input
                type="text"
                autoFocus
                value={parkLabelInput}
                onChange={(e) => setParkLabelInput(e.target.value)}
                placeholder="Contoh: Meja 4 / Budi"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setIsParkPromptOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmParkOrder}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-sm"
              >
                Simpan & Tahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DAFTAR TAGIHAN TERTAHAN */}
      {isParkedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-base">Daftar Tagihan Tertahan</h3>
              </div>
              <button onClick={() => setIsParkedModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {parkedOrders.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <PauseCircle className="w-10 h-10 mx-auto text-slate-200 mb-2 stroke-1" />
                  <p className="text-xs font-semibold text-slate-600">Tidak ada tagihan yang tertahan.</p>
                </div>
              ) : (
                parkedOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => handleRecallOrder(order)}
                    className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-900">{order.label}</p>
                      <p className="text-xs text-slate-400">
                        {order.cart.length} item • {order.timestamp}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-black text-sm text-slate-900 tabular-nums">
                        {formatRupiah(order.subtotal)}
                      </span>
                      <button
                        onClick={(e) => handleDeleteParkedOrder(order.id, e)}
                        className="p-1 text-slate-400 hover:text-red-600"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <PlayCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setIsParkedModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHECKOUT & PEMBAYARAN */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 my-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Pembayaran Kasir</h3>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Grand Total Display */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl text-center shadow-inner">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  Total Tagihan Belanja
                </span>
                <p className="text-3xl font-black text-emerald-400 mt-1 tabular-nums">
                  {formatRupiah(grandTotal)}
                </p>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Pilih Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('cash');
                      sounds.playBeep();
                    }}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Tunai (Cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('qris');
                      sounds.playBeep();
                    }}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all ${
                      paymentMethod === 'qris'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>QRIS Instant</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('debit');
                      sounds.playBeep();
                    }}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all ${
                      paymentMethod === 'debit'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Kartu Debit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('transfer');
                      sounds.playBeep();
                    }}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all ${
                      paymentMethod === 'transfer'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Building className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Transfer Bank</span>
                  </button>
                </div>
              </div>

              {/* Cash Options if 'cash' */}
              {paymentMethod === 'cash' ? (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Uang Diterima (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      autoFocus
                      value={cashReceived || ''}
                      onChange={(e) => setCashReceived(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-xl font-black bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 tabular-nums"
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCashReceived(grandTotal);
                        sounds.playBeep();
                      }}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800"
                    >
                      Uang Pas
                    </button>
                    {[10000, 20000, 50000, 100000, 200000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setCashReceived(amt);
                          sounds.playBeep();
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 tabular-nums"
                      >
                        {formatRupiah(amt)}
                      </button>
                    ))}
                  </div>

                  {/* Kembalian */}
                  <div className="p-3.5 rounded-xl bg-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Uang Kembalian:</span>
                    <span
                      className={`text-base font-black tabular-nums ${
                        cashReceived >= grandTotal ? 'text-emerald-700' : 'text-red-500'
                      }`}
                    >
                      {cashReceived >= grandTotal
                        ? formatRupiah(cashChange)
                        : `Kurang ${formatRupiah(grandTotal - cashReceived)}`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                  <p className="font-bold">Konfirmasi Non-Tunai ({paymentMethod.toUpperCase()})</p>
                  <p className="mt-1 text-blue-700">
                    Pastikan pembayaran telah terkonfirmasi pada mesin EDC atau mutasi bank sebelum menyelesaikan transaksi.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  disabled={submittingTrx}
                  className="w-1/3 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessCheckout}
                  disabled={submittingTrx || (paymentMethod === 'cash' && cashReceived < grandTotal)}
                  className="w-2/3 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingTrx ? (
                    <span>Memproses...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Selesaikan Transaksi</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DIGITAL THERMAL RECEIPT / NOTA PEMBAYARAN */}
      {isReceiptOpen && completedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 my-6">
            {/* The printable thermal wrapper */}
            <div id="thermal-receipt-printable">
              {/* Header Nota */}
              <div className="text-center pb-3 border-b border-dashed border-slate-400">
                <div className="no-print w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                  {user?.tenantSlug || 'NexPOS'}
                </h2>
                <p className="text-[10px] text-slate-500">Struk Resmi Kasir</p>
                <div className="mt-1 text-[10px] text-slate-500 font-mono">
                  <p>Faktur: {completedTransaction.invoiceNumber}</p>
                  <p>{formatDateTime(completedTransaction.transactionDate)}</p>
                  <p>Kasir: {user?.name || user?.email?.split('@')[0] || 'Staff'}</p>
                </div>
              </div>

              {/* Item List Nota */}
              <div className="py-3 border-b border-dashed border-slate-400 space-y-1.5 text-xs font-mono">
                {completedTransaction.details?.map((detail, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div className="pr-2">
                      <p className="font-bold text-slate-900">{detail.product?.name || 'Item'}</p>
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

              {/* Calculations Nota */}
              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-xs font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatRupiah(subtotal)}</span>
                </div>
                {Number(completedTransaction.discountAmount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Diskon</span>
                    <span className="tabular-nums">-{formatRupiah(completedTransaction.discountAmount)}</span>
                  </div>
                )}
                {Number(completedTransaction.taxAmount) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Pajak</span>
                    <span className="tabular-nums">+{formatRupiah(completedTransaction.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-300">
                  <span>TOTAL</span>
                  <span className="text-sm tabular-nums">{formatRupiah(completedTransaction.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1">
                  <span className="uppercase">Metode: {completedTransaction.paymentMethod}</span>
                  <span className="tabular-nums">
                    {paymentMethod === 'cash' ? formatRupiah(cashReceived) : formatRupiah(completedTransaction.totalAmount)}
                  </span>
                </div>
                {paymentMethod === 'cash' && (
                  <div className="flex justify-between text-slate-600 font-bold">
                    <span>Kembalian</span>
                    <span className="tabular-nums">{formatRupiah(cashChange)}</span>
                  </div>
                )}
              </div>

              {/* Footer Nota */}
              <div className="text-center pt-3 text-xs text-slate-500">
                <p className="font-bold text-slate-700">Terima Kasih atas Kunjungan Anda!</p>
                <p className="text-[9px] mt-0.5">Barang yang dibeli tidak dapat ditukar/dikembalikan.</p>
              </div>
            </div>

            {/* Action Buttons for screen (hidden in print) */}
            <div className="no-print flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-1/2 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Thermal</span>
              </button>
              <button
                type="button"
                onClick={handleNewTransaction}
                className="w-1/2 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>Transaksi Baru</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pos;
