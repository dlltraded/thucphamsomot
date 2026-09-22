import HorizontalDivider from "@/components/horizontal-divider";
import Section from "@/components/section";
import { StationSkeleton } from "@/components/skeleton";
import TransitionLink from "@/components/transition-link";
import {
  HomeIcon,
  LocationMarkerLineIcon,
  LocationMarkerPackageIcon,
  PackageDeliveryIcon,
  PlusIcon,
  ShipperIcon,
} from "@/components/vectors";
import {
  customerAuthState,
  deliveryModeState,
  selectedStationState,
  shippingAddressState,
  selectedDeliveryDateState,
  selectedAddressIdState,
  orderConfigDataState,
  customerAddressesState,
  cutoffInfoState,
} from "@/state";
import { useAtom, useAtomValue } from "jotai";
import { Suspense, useEffect } from "react";
import DeliverySummary from "./delivery-summary";
import CONFIG from "@/config";
import { Icon } from "zmp-ui";

function formatMinutes(mins: number) {
  if (mins <= 0) return "đã qua giờ chốt";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `còn ${h}h${m > 0 ? m + "p" : ""}` : `còn ${m} phút`;
}

function ShippingAddressSummary() {
  const [shippingAddress, setShippingAddress] = useAtom(shippingAddressState);
  const [selectedAddressId, setSelectedAddressId] = useAtom(selectedAddressIdState);
  const customerAddresses = useAtomValue(customerAddressesState);
  const customer = useAtomValue(customerAuthState);

  if (customerAddresses.length > 0) {
    return (
      <div className="p-4 space-y-2.5">
        <label className="text-xs font-semibold text-subtitle block">
          Chọn địa chỉ nhận hàng ({customerAddresses.length} địa chỉ)
        </label>
        <select
          value={selectedAddressId}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedAddressId(id);
            const chosen = customerAddresses.find((a) => a.id === id);
            if (chosen) {
              setShippingAddress({
                id: chosen.id,
                alias: chosen.label || "Địa chỉ giao hàng",
                address: chosen.address,
                name: chosen.contact_name || customer?.name || "",
                phone: chosen.contact_phone || customer?.phone || "",
                customerId: customer?.id,
                isDefault: chosen.is_default,
              });
            }
          }}
          className="w-full text-xs font-medium bg-background border border-black/10 rounded-xl p-2.5 focus:outline-none focus:border-primary text-black"
        >
          {customerAddresses.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label} — {a.address} {a.contact_name ? `(${a.contact_name})` : ""}
            </option>
          ))}
        </select>
        {shippingAddress && (
          <div className="bg-background/80 rounded-xl p-3 text-xs space-y-0.5">
            <div className="font-semibold text-primary">{shippingAddress.alias}</div>
            <div className="text-subtitle">{shippingAddress.address}</div>
            <div className="text-2xs text-subtitle">
              Người nhận: {shippingAddress.name} · {shippingAddress.phone}
            </div>
          </div>
        )}
        <div className="pt-1">
          <TransitionLink
            to="/shipping-address"
            className="text-2xs font-medium text-primary flex items-center gap-1"
          >
            <PlusIcon width={12} height={12} />
            Thêm địa chỉ giao hàng mới
          </TransitionLink>
        </div>
      </div>
    );
  }

  if (!shippingAddress) {
    return (
      <TransitionLink
        className="flex flex-col space-y-2 justify-center items-center p-4 w-full"
        to="/shipping-address"
      >
        <LocationMarkerPackageIcon />
        <div className="flex space-x-1 items-center text-center p-2">
          <PlusIcon width={16} height={16} />
          <span className="text-sm font-medium">Thêm địa chỉ nhận hàng</span>
        </div>
      </TransitionLink>
    );
  }

  return (
    <DeliverySummary
      icon={<LocationMarkerLineIcon />}
      title="Địa chỉ nhận hàng"
      subtitle={shippingAddress.alias}
      description={shippingAddress.address}
      linkTo="/shipping-address"
    />
  );
}

function SelectedStationSummary() {
  const selectedStation = useAtomValue(selectedStationState);
  return (
    <DeliverySummary
      icon={<HomeIcon />}
      title="Nhận hàng tại"
      subtitle={selectedStation.name}
      description={selectedStation.address}
      linkTo="/stations"
    />
  );
}

function Delivery() {
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useAtom(deliveryModeState);
  const [deliveryDate, setDeliveryDate] = useAtom(selectedDeliveryDateState);
  const [, setAddressId] = useAtom(selectedAddressIdState);
  const [orderConfig, setOrderConfig] = useAtom(orderConfigDataState);
  const [, setCustomerAddresses] = useAtom(customerAddressesState);
  const [cutoffInfo, setCutoffInfo] = useAtom(cutoffInfoState);
  const [, setShippingAddress] = useAtom(shippingAddressState);
  const customer = useAtomValue(customerAuthState);

  // 1. Tải order-config (giờ chốt, ngày giao sớm nhất, sổ địa chỉ)
  useEffect(() => {
    if (!customer?.orderSessionToken) return;
    const fetchConfig = async () => {
      try {
        const res = await fetch(
          `${CONFIG.API_BASE}/api/customer/order-config?sessionToken=${encodeURIComponent(
            customer.orderSessionToken
          )}`
        );
        const data = await res.json();
        if (data.ok) {
          setOrderConfig(data.config);
          if (data.config?.earliestDate) {
            setDeliveryDate((prev) => prev || data.config.earliestDate);
          }
          if (Array.isArray(data.addresses)) {
            setCustomerAddresses(data.addresses);
            const def = data.addresses.find((a: any) => a.is_default) || data.addresses[0];
            if (def) {
              setAddressId(def.id);
              setShippingAddress({
                id: def.id,
                alias: def.label || "Địa chỉ giao hàng",
                address: def.address,
                name: def.contact_name || customer.name,
                phone: def.contact_phone || customer.phone,
                customerId: customer.id,
                isDefault: def.is_default,
              });
            }
          }
        }
      } catch (err) {
        console.warn("Không tải được order-config:", err);
      }
    };
    fetchConfig();
  }, [customer?.orderSessionToken]);

  // 2. Tính lại giờ chốt khi đổi ngày giao hàng
  useEffect(() => {
    if (!deliveryDate || !customer?.orderSessionToken) return;
    const checkCutoff = async () => {
      try {
        const res = await fetch(
          `${CONFIG.API_BASE}/api/customer/order-config?deliveryDate=${deliveryDate}&sessionToken=${encodeURIComponent(
            customer.orderSessionToken
          )}`
        );
        const data = await res.json();
        if (data.ok && data.cutoff) {
          setCutoffInfo(data.cutoff);
        }
      } catch {
        // ignore
      }
    };
    const timer = setTimeout(checkCutoff, 250);
    return () => clearTimeout(timer);
  }, [deliveryDate, customer?.orderSessionToken]);

  return (
    <Section title="Thông tin giao nhận" className="rounded-lg space-y-2">
      {/* Chọn ngày giao hàng */}
      <div className="p-4 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-subtitle flex items-center gap-1.5">
            <Icon icon="zi-calendar" size={14} className="text-primary" />
            Ngày giao hàng mong muốn *
          </label>
          {orderConfig?.cutoffTime && (
            <span className="text-2xs text-subtitle">
              Giờ chốt: {orderConfig.cutoffTime}
            </span>
          )}
        </div>
        <input
          type="date"
          value={deliveryDate}
          min={orderConfig?.earliestDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          className="w-full text-xs font-semibold bg-background border border-black/10 rounded-xl p-2.5 focus:outline-none focus:border-primary text-black"
        />

        {cutoffInfo?.isLate ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-2xs leading-4 text-amber-900 flex items-start gap-1.5">
            <span className="text-sm">⚠️</span>
            <span>
              Đã qua giờ chốt ({cutoffInfo.cutoffTime}) cho ngày này. Đơn hàng sẽ được xếp vào ca giao tiếp theo.
            </span>
          </div>
        ) : cutoffInfo && cutoffInfo.minutesLeft > 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-2xs leading-4 text-emerald-800 flex items-center gap-1.5">
            <Icon icon="zi-clock-1" size={13} className="text-emerald-600" />
            <span>
              Hạn chốt đơn: {cutoffInfo.cutoffTime} ({formatMinutes(cutoffInfo.minutesLeft)})
            </span>
          </div>
        ) : null}
      </div>

      <HorizontalDivider />

      {/* Phương thức nhận hàng */}
      <div className="grid grid-cols-2 gap-4 p-4 pt-1 pb-2">
        {(
          [
            {
              type: "shipping",
              name: "Giao tận nơi",
              icon: <ShipperIcon />,
            },
            {
              type: "pickup",
              name: "Tự đến lấy",
              icon: <PackageDeliveryIcon />,
            },
          ] as const
        ).map((option) => (
          <button
            key={option.type}
            className={"flex justify-center items-center space-x-2 text-base font-medium bg-background rounded-full h-12 px-3.5 ".concat(
              selectedDeliveryMode === option.type
                ? "border border-primary text-primary"
                : ""
            )}
            onClick={() => setSelectedDeliveryMode(option.type)}
          >
            {option.icon}
            <span>{option.name}</span>
          </button>
        ))}
      </div>

      <HorizontalDivider />

      {selectedDeliveryMode === "shipping" ? (
        <ShippingAddressSummary />
      ) : (
        <Suspense fallback={<StationSkeleton />}>
          <SelectedStationSummary />
        </Suspense>
      )}
    </Section>
  );
}

export default Delivery;
