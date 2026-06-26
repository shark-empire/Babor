import React, { useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { CheckCircle, AlertCircle, Loader2, ShoppingCart } from 'lucide-react';

// --- CONFIGURATION ---
// Replace with your actual Paystack PUBLIC key. (Public keys are safe in frontend code).
const PAYSTACK_PUBLIC_KEY = 'pk_test_cc8cf710bcbf876df9102c2a9b307407ba7d1b11'; 
// The URL of your Supabase Edge Function, Flask app, or n8n webhook
const BACKEND_VERIFY_URL = 'https://your-backend-url.com/api/verify-payment';

const PRODUCTS = [
  { id: 'waec_result', name: 'WAEC Result Checker', price: 20, desc: 'Check WASSCE, BECE, and Nov/Dec results instantly.' },
  { id: 'cssps_placement', name: 'CSSPS Placement Card', price: 15, desc: 'Check SHS school placement details.' }
];

export default function App() {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // States: 'idle' | 'verifying' | 'success' | 'error'
  const [status, setStatus] = useState('idle'); 
  const [purchasedData, setPurchasedData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // --- PAYSTACK CONFIGURATION ---
  const paystackConfig = {
    reference: (new Date()).getTime().toString(),
    email: email,
    amount: selectedProduct.price * 100, // Paystack expects amount in pesewas
    publicKey: PAYSTACK_PUBLIC_KEY,
    metadata: {
      phone: phone,
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
    },
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  // --- SECURE BACKEND HANDOFF ---
  const verifyPaymentWithBackend = async (reference) => {
    setStatus('verifying');
    try {
      // We send ONLY the transaction reference to the backend.
      // The backend will check Paystack, grab a PIN from the database, and return it.
      const response = await fetch(BACKEND_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reference: reference,
          product_id: selectedProduct.id 
        })
      });

      if (!response.ok) throw new Error('Failed to verify payment with the server.');

      const data = await response.json();
      
      // Successfully received the secure PIN from the backend!
      setPurchasedData({
        pin: data.pin,
        serial: data.serial
      });
      setStatus('success');

    } catch (error) {
      console.error(error);
      setErrorMessage('Payment was successful, but we had trouble fetching your PIN. Please contact support with your email.');
      setStatus('error');
    }
  };

  // --- PAYMENT CALLBACKS ---
  const onSuccess = (transaction) => {
    // Paystack says success, but we don't trust the browser. 
    // We pass the reference to our backend for absolute verification.
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
          Please wait while we generate your secure {selectedProduct.name} PIN. Do not close this page.
        </p>
      </div>
    );
  }

  if (status === 'success' && purchasedData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border-t-4 border-green-500">
          <CheckCircle className="text-green-500 mx-auto mb-4" size={56} />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Purchase Successful!</h2>
          <p className="text-gray-600 mb-6">Here are your {selectedProduct.name} details.</p>
          
          <div className="bg-gray-100 p-4 rounded-lg mb-6 text-left">
            <p className="text-sm text-gray-500 font-semibold uppercase">PIN Code</p>
            <p className="text-2xl font-mono font-bold text-gray-900 tracking-wider bg-white p-2 border rounded mt-1 select-all">{purchasedData.pin}</p>
            
            <p className="text-sm text-gray-500 font-semibold uppercase mt-4">Serial Number</p>
            <p className="text-lg font-mono text-gray-800 bg-white p-2 border rounded mt-1 select-all">{purchasedData.serial}</p>
          </div>
          
          <p className="text-sm text-gray-500 mb-6">A copy has also been sent to {email}.</p>
          <button 
            onClick={() => { setStatus('idle'); setPurchasedData(null); }}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Buy Another Pin
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
          <p className="text-blue-100 mt-1">Instant WAEC & CSSPS Delivery</p>
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
                  <div className="text-lg font-black text-blue-700">
                    GHS {product.price}
                  </div>
                </div>
              ))}
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
                placeholder="Where should we send the receipt?"
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

          {/* Submit Button */}
          <button 
            type="submit" 
            className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-200 flex justify-center items-center"
          >
            Pay GHS {selectedProduct.price} Securely
          </button>
          
          <p className="text-xs text-center text-gray-400 font-medium flex justify-center items-center gap-1">
            Secured by Paystack
          </p>
        </form>
      </div>
    </div>
  );
}
