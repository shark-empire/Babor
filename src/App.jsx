import React, { useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { CheckCircle, AlertCircle, Loader2, ShoppingCart, Plus, Minus, Tag } from 'lucide-react';

// --- CONFIGURATION ---
const PAYSTACK_PUBLIC_KEY = 'pk_test_cc8cf710bcbf876df9102c2a9b307407ba7d1b11'; 
const BACKEND_VERIFY_URL = 'https://your-backend-url.com/api/verify-payment';

const REGULAR_PRICE = 20;
const BULK_PRICE = 17;
const BULK_THRESHOLD = 5; // quantity ABOVE this triggers bulk price

const PRODUCTS = [
  { 
    id: 'wassce_checker', 
    name: 'WASSCE Results Checker', 
    price: REGULAR_PRICE, 
    desc: 'Check your School WASSCE results instantly.' 
  },
  { 
    id: 'novdec_checker', 
    name: 'NOVDEC Results Checker', 
    price: REGULAR_PRICE, 
    desc: 'Check your Private WASSCE / NOVDEC results instantly.' 
  },
  { 
    id: 'bece_checker', 
    name: 'BECE Results Checker', 
    price: REGULAR_PRICE, 
    desc: 'Check your Junior High School BECE results instantly.' 
  }
];

// Returns GHS 17 if qty > 5, otherwise GHS 20
const getUnitPrice = (qty) => qty > BULK_THRESHOLD ? BULK_PRICE : REGULAR_PRICE;

export default function App() {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  
  const [status, setStatus] = useState('idle'); 
  const [purchasedPins, setPurchasedPins] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Dynamic pricing logic
  const unitPrice = getUnitPrice(quantity);
  const isBulkPrice = quantity > BULK_THRESHOLD;
  const totalPrice = unitPrice * quantity;
  const savings = isBulkPrice ? (REGULAR_PRICE - BULK_PRICE) * quantity : 0;

  // --- PAYSTACK CONFIGURATION ---
  const paystackConfig = {
    reference: (new Date()).getTime().toString(),
    email: email,
    amount: totalPrice * 100, // in pesewas
    publicKey: PAYSTACK_PUBLIC_KEY,
    metadata: {
      phone: phone,
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity: quantity,
      unit_price: unitPrice,
      bulk_discount_applied: isBulkPrice,
    },
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  // --- SECURE BACKEND HANDOFF ---
  const verifyPaymentWithBackend = async (reference) => {
    setStatus('verifying');
    try {
      const response = await fetch(BACKEND_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reference: reference,
          product_id: selectedProduct.id,
          quantity: quantity 
        })
      });

      if (!response.ok) throw new Error('Failed to verify payment with the server.');

      const data = await response.json();
      setPurchasedPins(data.pins || []); 
      setStatus('success');

    } catch (error) {
      console.error(error);
      setErrorMessage('Payment was successful, but we had trouble fetching your PINs. Please contact support with your email.');
      setStatus('error');
    }
  };

  const onSuccess = (transaction) => {
    verifyPaymentWithBackend(transaction.reference);
  };

  const onClose = () => {
    console.log('Payment window closed.');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !phone) {
      alert("Please enter both email and phone number.");
      return;
    }
    initializePayment(onSuccess, onClose);
  };

  // --- RENDER HELPERS ---
  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <h2 className="text-xl font-bold text-gray-800">Verifying Payment...</h2>
        <p className="text-gray-500 mt-2 text-center max-w-md">
          Please wait while we generate your {quantity}x {selectedProduct.name} PIN(s). Do not close this page.
        </p>
      </div>
    );
  }

  if (status === 'success' && purchasedPins.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center border-t-4 border-green-500">
          <CheckCircle className="text-green-500 mx-auto mb-3" size={48} />
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Purchase Successful!</h2>
          <p className="text-gray-600 mb-4">Here are your {quantity} {selectedProduct.name} details.</p>
          
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1 mb-4">
            {purchasedPins.map((item, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg text-left border border-gray-200">
                <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">Voucher #{index + 1}</span>
                <p className="text-xs text-gray-400 font-semibold uppercase mt-2">PIN Code</p>
                <p className="text-lg font-mono font-bold text-gray-900 tracking-wider bg-white p-1.5 border rounded select-all">{item.pin}</p>
                <p className="text-xs text-gray-400 font-semibold uppercase mt-2">Serial Number</p>
                <p className="text-sm font-mono text-gray-700 bg-white p-1.5 border rounded select-all">{item.serial}</p>
              </div>
            ))}
          </div>
          
          <p className="text-sm text-gray-500 mb-4">A copy has also been sent to {email}.</p>
          <button 
            onClick={() => { setStatus('idle'); setPurchasedPins([]); setQuantity(1); }}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Buy More Pins
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN CHECKOUT UI ---
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-600 p-6 text-white text-center">
          <ShoppingCart className="mx-auto mb-2" size={32} />
          <h1 className="text-2xl font-bold">Digital PIN Store</h1>
          <p className="text-blue-100 mt-1">Instant Bulk WAEC & CSSPS Delivery</p>
        </div>

        {/* Error State */}
        {status === 'error' && (
          <div className="bg-red-50 p-4 m-6 mb-0 rounded-lg flex items-start border border-red-200">
            <AlertCircle className="text-red-500 mr-3 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Product Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Select Product</label>
            <div className="space-y-3">
              {PRODUCTS.map(product => (
                <div 
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`border rounded-xl p-4 cursor-pointer transition flex justify-between items-center ${selectedProduct.id === product.id ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-gray-200 hover:border-blue-300'}`}
                >
                  <div>
                    <h3 className="font-bold text-gray-900">{product.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{product.desc}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-blue-700">
                      GHS {unitPrice}
                    </div>
                    {isBulkPrice && (
                      <div className="text-xs line-through text-gray-400">GHS {REGULAR_PRICE}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quantity Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Quantity (Bulk Purchase)
            </label>
            <div className="flex items-center gap-4">
              <div className="flex items-center w-36 border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                <button 
                  type="button"
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  className="p-2.5 bg-gray-200 hover:bg-gray-300 transition text-gray-600"
                >
                  <Minus size={16} />
                </button>
                <span className="flex-1 text-center font-bold text-gray-800 text-lg">{quantity}</span>
                <button 
                  type="button"
                  onClick={() => setQuantity(prev => prev + 1)}
                  className="p-2.5 bg-gray-200 hover:bg-gray-300 transition text-gray-600"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Bulk discount badge — appears when qty > 5 */}
              {isBulkPrice ? (
                <div className="flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-bold px-3 py-1.5 rounded-full border border-green-200">
                  <Tag size={13} />
                  Bulk price: GHS {BULK_PRICE}/pin · Save GHS {savings}
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  Buy more than {BULK_THRESHOLD} → <span className="font-semibold text-green-600">GHS {BULK_PRICE}/pin</span>
                </p>
              )}
            </div>
          </div>

          {/* Customer Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                placeholder="Where should we send the receipts?"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number (WhatsApp/SMS)</label>
              <input 
                type="tel" 
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                placeholder="e.g. 024XXXXXXX"
              />
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-sm space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>{quantity} × GHS {unitPrice}</span>
              <span>GHS {totalPrice}</span>
            </div>
            {isBulkPrice && (
              <div className="flex justify-between text-green-600 font-semibold">
                <span>Bulk discount savings</span>
                <span>- GHS {savings}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-300 mt-1">
              <span>Total</span>
              <span>GHS {totalPrice}</span>
            </div>
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-200 flex justify-center items-center"
          >
            Pay GHS {totalPrice} Securely
          </button>
          
          <p className="text-xs text-center text-gray-400 font-medium">
            Secured by Paystack
          </p>
        </form>
      </div>
    </div>
  );
}
