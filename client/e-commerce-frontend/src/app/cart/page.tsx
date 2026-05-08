import CartClient from "./CartClient";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading cart...</div>}>
      <CartClient />
    </Suspense>
  );
}