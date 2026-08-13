import { Outlet } from "react-router-dom";
import Header from "./header";
import Footer from "./footer";
import { Suspense, useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { PageSkeleton } from "./skeleton";
import { Toaster } from "react-hot-toast";
import { ScrollRestoration } from "./scroll-restoration";
import FloatingCartPreview from "./floating-cart-preview";
import { customerAuthState, shippingAddressState } from "@/state";
import CONFIG from "@/config";

function CustomerSessionSync() {
  const [customer, setCustomer] = useAtom(customerAuthState);
  const setShipping = useSetAtom(shippingAddressState);

  useEffect(() => {
    if (!customer?.orderSessionToken) return;
    let cancelled = false;
    fetch(`${CONFIG.API_BASE}/api/customer/session?sessionToken=${encodeURIComponent(customer.orderSessionToken)}`)
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (cancelled) return;
        if (response.status === 401) {
          setCustomer(null);
          setShipping(undefined);
          return;
        }
        if (!response.ok || !data?.session) return;
        const session = data.session;
        const next = {
          ...customer,
          ...session,
          verificationStatus: session.verificationStatus || "pending",
          defaultShippingAddress: {
            ...session.defaultShippingAddress,
            customerId: session.id,
            isDefault: true,
          },
        };
        setCustomer(next);
        if (next.defaultShippingAddress?.address) setShipping(next.defaultShippingAddress);
      })
      .catch((error) => console.warn("Không làm mới được phiên khách hàng", error));
    return () => { cancelled = true; };
  }, [customer?.orderSessionToken]);
  return null;
}

export default function Layout() {
  return (
    <div className="w-screen h-screen flex flex-col bg-section text-foreground">
      <Header />
      <CustomerSessionSync />
      <div className="flex-1 overflow-y-auto bg-background">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </div>
      <Footer />
      <Toaster
        containerClassName="toast-container"
        containerStyle={{
          top: "calc(50% - 24px)",
        }}
      />
      <FloatingCartPreview />
      <ScrollRestoration />
    </div>
  );
}
