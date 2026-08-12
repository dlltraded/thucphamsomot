import { customerAuthState } from "@/state";
import { useAtomValue } from "jotai";
import { PropsWithChildren } from "react";
import { DefaultUserAvatar } from "@/components/vectors";

const TIER_LABEL: Record<string, string> = {
  VIP1: "VIP1",
  VIP2: "VIP2",
  VIP3: "VIP3",
};

function UserInfo({ children }: PropsWithChildren) {
  const customerAuth = useAtomValue(customerAuthState);

  if (customerAuth) {
    return (
      <>
        <div className="bg-section rounded-lg p-4 flex items-center space-x-4 border-[0.5px] border-black/15">
          <DefaultUserAvatar width={40} height={40} className="flex-none" />
          <div className="space-y-0.5 flex-1 overflow-hidden">
            <div className="text-lg truncate">{customerAuth.name}</div>
            <div className="text-sm text-subtitle truncate">
              {customerAuth.code}
              {customerAuth.tier
                ? ` · ${TIER_LABEL[customerAuth.tier] || customerAuth.tier}`
                : ""}
            </div>
          </div>
        </div>
        {children}
      </>
    );
  }

  return (
    <div className="bg-section rounded-lg p-4 flex items-center space-x-4 border-[0.5px] border-black/15">
      <DefaultUserAvatar width={40} height={40} className="flex-none" />
      <div className="space-y-0.5 flex-1 overflow-hidden">
        <div className="text-lg truncate">Khách</div>
        <div className="text-sm text-subtitle truncate">
          Đăng nhập tài khoản khách hàng để xem thông tin đầy đủ
        </div>
      </div>
    </div>
  );
}

export default UserInfo;
