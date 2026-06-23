import ProfileActions from "./actions";
import FollowOA from "./follow-oa";
import Points from "./points";
import UserInfo from "./user-info";

export default function ProfilePage() {
  return (
    <div className="min-h-full bg-background p-4 space-y-2.5">
      <UserInfo>
        <Points />
      </UserInfo>
      <ProfileActions />
      
      {/* Contact Info Block */}
      <div className="bg-white rounded-xl p-4 shadow-sm border-[0.5px] border-black/15">
        <h2 className="text-sm font-bold text-primary mb-3">Thông tin liên hệ TPS1</h2>
        <div className="space-y-2 text-sm text-subtitle">
          <p>🏢 VP: B19 KP15, Tam Hiệp, Đồng Nai</p>
          <p>☎️ Hotline: <a href="tel:0898902222" className="text-primary font-medium">089 890 2222</a></p>
          <p>📱 Zalo/Viber: <span className="text-primary font-medium">+84.898902222</span></p>
          <p>📧 Email: <a href="mailto:contact@thucphamsomot.vn" className="text-primary font-medium">contact@thucphamsomot.vn</a></p>
        </div>
      </div>

      <FollowOA />
    </div>
  );
}
