export default function OrderSuccess() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-indigo-50 text-center px-4">
      <div className="text-6xl mb-4">🎉</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Placed!</h1>
      <p className="text-gray-500 max-w-sm">
        Your order has been received and is waiting for confirmation. 
        You&lsquo;ll get an email once it&lsquo;s approved.
      </p>
    </div>
  );
}