'use client'

import { useRef, useState } from 'react'
import {
  Phone, Mail, Globe, MapPin, Download,
  MessageCircle, ShieldCheck, Award,
  PiggyBank, ChevronRight, QrCode, X, User,
} from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import type { NamecardData } from './page'

// ── Brand tokens ────────────────────────────────────────────────────────────
const G  = '#009846'
const GD = '#0B3B2E'
const OR = '#F37021'
const BG = '#F5FAF7'

const CO = {
  vi: 'CÔNG TY TNHH THỰC PHẨM SỐ MỘT ĐỒNG NAI',
  short: 'THỰC PHẨM SỐ MỘT',
  websiteUrl: 'https://thucphamsomot.vn',
  website: 'thucphamsomot.vn',
  profileUrl: 'https://thucphamsomot.vn/ho-so-nang-luc',
  mapQ: 'Công+ty+TNHH+Thực+Phẩm+Số+Một+B19+KP15+Tam+Hiệp+Đồng+Nai',
  addrFull: 'B19 KP15, Phường Tam Hiệp, TP. Biên Hòa, Đồng Nai',
  addrShort: 'B19 KP15, P. Tam Hiệp, TP. Biên Hòa, Đồng Nai',
  tagVi: 'Giải pháp thực phẩm toàn diện cho mọi bếp ăn',
  tagEn: 'YOUR TRUSTED FOOD SOLUTION PARTNER',
}

function buildVcf(d: NamecardData) {
  return [
    'BEGIN:VCARD', 'VERSION:3.0', `FN:${d.name}`, `ORG:${CO.vi}`,
    d.title_vi ? `TITLE:${d.title_vi}` : '',
    d.phone ? `TEL;TYPE=CELL:${d.phone.replace(/\s/g, '')}` : '',
    d.email ? `EMAIL:${d.email}` : '',
    `URL:${CO.websiteUrl}`,
    `ADR;TYPE=WORK:;;${CO.addrFull};;;Việt Nam`,
    `NOTE:${CO.tagVi}`, 'END:VCARD',
  ].filter(Boolean).join('\r\n')
}

function downloadVcf(d: NamecardData) {
  const blob = new Blob([buildVcf(d)], { type: 'text/vcard;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `lien-he-${d.id}.vcf`
  a.click()
  URL.revokeObjectURL(a.href)
}

// ── Main component ───────────────────────────────────────────────────────────
export default function NamecardClient({
  data,
  currentUrl,
}: {
  data: NamecardData
  currentUrl: string
}) {
  const [showQr, setShowQr] = useState(false)
  const qrRef = useRef<HTMLCanvasElement>(null)

  const phoneRaw = data.phone.replace(/\s/g, '')
  const phoneDisplay = data.phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')

  const downloadQr = () => {
    const canvas = qrRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `qr-${data.id}.png`
    a.click()
  }

  const card: React.CSSProperties = {
    background: '#fff',
    borderRadius: 13,
    boxShadow: '0 1px 5px rgba(0,0,0,0.07)',
    overflow: 'hidden',
  }
  const P = 11

  const contactRows = [
    { icon: Phone,  label: 'ĐIỆN THOẠI DI ĐỘNG', value: phoneDisplay,  href: `tel:${phoneRaw}`,           ext: false },
    { icon: Mail,   label: 'HÒM THƯ EMAIL',       value: data.email,    href: `mailto:${data.email}`,      ext: false },
    { icon: Globe,  label: 'TRANG WEB',            value: CO.website,    href: CO.websiteUrl,               ext: true  },
    { icon: MapPin, label: 'ĐỊA CHỈ VĂN PHÒNG',   value: CO.addrShort,  href: `https://www.google.com/maps/search/?api=1&query=${CO.mapQ}`, ext: true },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${BG};font-family:'Be Vietnam Pro',sans-serif}
        /* Hide all main site chrome on namecard pages */
        .site-header,.site-footer,.social-widget,.company-profile-widget,
        .cart-badge-btn,.cart-drawer,.cart-badge-count,
        [class*="site-header"],[class*="site-footer"],[class*="social-widget"],
        [class*="company-profile"],[class*="cart-badge"],[class*="cart-drawer"]
        {display:none!important;visibility:hidden!important}
        .nc{background:${BG};min-height:100vh;display:flex;justify-content:center}
        .nw{width:100%;max-width:430px;background:${BG}}
        @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .f0{animation:fu .45s .00s ease both}
        .f1{animation:fu .45s .06s ease both}
        .f2{animation:fu .45s .12s ease both}
        .f3{animation:fu .45s .18s ease both}
        .f4{animation:fu .45s .24s ease both}
        .tap{transition:transform .1s;cursor:pointer;-webkit-tap-highlight-color:transparent}
        .tap:active{transform:scale(.97)}
        .row-a{display:flex;align-items:center;gap:10px;padding:8px 12px;text-decoration:none;color:inherit;transition:background .12s}
        .row-a:not(:last-child){border-bottom:1px solid #F3F4F6}
        .row-a:hover{background:#FAFDF8}
        @keyframes leafSway{0%,100%{transform:rotate(0deg) scale(1)}50%{transform:rotate(6deg) scale(1.04)}}
        @keyframes leafSway2{0%,100%{transform:rotate(0deg) scale(1)}50%{transform:rotate(-5deg) scale(1.03)}}
      `}</style>

      <div className="nc">
        <div className="nw">

          {/* ── BANNER ─────────────────────────────────────────── */}
          <div className="f0" style={{ height: 90, overflow: 'hidden', flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/food-banner.jpg" alt="Thực phẩm tươi"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }} />
          </div>

          {/* ── WAVE ────────────────────────────────────────────── */}
          <div style={{ marginTop: -1, flexShrink: 0 }}>
            <svg viewBox="0 0 430 24" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', width: '100%', height: 24 }}>
              <path d="M0 24 L0 11 Q108 -2 215 7 Q322 16 430 1 L430 24 Z" fill={BG} />
              <path d="M0 12 Q108 0 215 8 Q322 17 430 2 L430 5 Q322 20 215 11 Q108 3 0 15 Z" fill={G} opacity=".9" />
              <path d="M0 16 Q108 4 215 12 Q322 20 430 6 L430 8 Q322 22 215 14 Q108 6 0 18 Z" fill={OR} opacity=".85" />
            </svg>
          </div>

          {/* ── AVATAR + NAME ───────────────────────────────────── */}
          <div className="f1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -50, position: 'relative', zIndex: 2 }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', padding: 3, background: `linear-gradient(135deg,${G} 0%,#fff 50%,${OR} 100%)`, boxShadow: '0 5px 15px rgba(0,0,0,.12)', marginBottom: 7, flexShrink: 0 }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '3px solid #fff', overflow: 'hidden', background: '#f3f4f6' }}>
                {data.photo_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={data.photo_url} alt={data.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={40} color="#ccc" strokeWidth={1.5} /></div>}
              </div>
            </div>
            <h1 style={{ fontSize: 21, fontWeight: 900, color: GD, letterSpacing: '-.3px', textAlign: 'center', lineHeight: 1.1, marginBottom: 6, padding: '0 14px' }}>
              {data.name}
            </h1>
            <span style={{ background: G, color: '#fff', fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', borderRadius: 999, padding: '4px 14px', display: 'inline-block', marginBottom: 3 }}>
              {data.title_vi || 'GIÁM ĐỐC ĐIỀU HÀNH'}
            </span>
            <p style={{ fontSize: 11, color: '#6B7280', fontStyle: 'italic', fontWeight: 500, marginBottom: 7 }}>
              {data.title_en || 'Executive Director'}
            </p>
          </div>

          {/* ── ACTION BUTTONS ──────────────────────────────────── */}
          <div className="f2" style={{ padding: `0 ${P}px 5px`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
            <button onClick={() => downloadVcf(data)} className="tap"
              style={{ ...card, border: 'none', padding: '10px 4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Download size={21} color="#fff" strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#374151', textAlign: 'center', lineHeight: 1.2 }}>Lưu Danh Bạ</span>
            </button>

            <a href={`https://zalo.me/${phoneRaw}`} target="_blank" rel="noopener noreferrer" className="tap"
              style={{ ...card, padding: '10px 4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#0068FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageCircle size={21} color="#fff" strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#374151', textAlign: 'center', lineHeight: 1.2 }}>Nhắn Zalo</span>
            </a>

            <button onClick={() => setShowQr(true)} className="tap"
              style={{ ...card, border: 'none', padding: '10px 4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: OR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QrCode size={21} color="#fff" strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#374151', textAlign: 'center', lineHeight: 1.2 }}>Mã QR</span>
            </button>
          </div>

          {/* ── CONTACT CARD ────────────────────────────────────── */}
          <div className="f2" style={{ padding: `0 ${P}px 5px` }}>
            <div style={card}>
              {contactRows.map(({ icon: Icon, label, value, href, ext }, i) => (
                <a key={i} href={href} target={ext ? '_blank' : undefined}
                  rel={ext ? 'noopener noreferrer' : undefined} className="row-a">
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EEF7F2', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} color={G} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 8.5, fontWeight: 700, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 1 }}>{label}</p>
                    <p style={{ fontSize: i === 3 ? 12 : 13, fontWeight: 800, color: '#111827', lineHeight: 1.25, whiteSpace: i === 3 ? 'normal' : 'nowrap', overflow: i === 3 ? 'visible' : 'hidden', textOverflow: 'ellipsis' }}>{value}</p>
                  </div>
                  <ChevronRight size={13} color="#D1D5DB" strokeWidth={2} style={{ flexShrink: 0 }} />
                </a>
              ))}
            </div>
          </div>

          {/* ── COMPANY CARD ────────────────────────────────────── */}
          <div className="f3" style={{ padding: `0 ${P}px 5px` }}>
            <div style={{ ...card, padding: '10px 11px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 68, height: 68, borderRadius: 11, background: '#EEF7F2', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/tps1-logo-horizontal.png" alt="TPS1" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 900, color: G, marginBottom: 1 }}>{CO.short}</p>
                <p style={{ fontSize: 8.5, fontWeight: 600, color: '#6B7280', marginBottom: 2, lineHeight: 1.3 }}>{CO.vi}</p>
                <p style={{ fontSize: 10, fontStyle: 'italic', color: '#374151', marginBottom: 1, lineHeight: 1.3 }}>"{CO.tagVi}"</p>
                <p style={{ fontSize: 7.5, fontWeight: 700, color: '#9CA3AF', letterSpacing: '.05em', marginBottom: 5 }}>{CO.tagEn}</p>
                <a href={CO.profileUrl} target="_blank" rel="noopener noreferrer" className="tap"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: G, color: '#fff', fontSize: 9.5, fontWeight: 800, letterSpacing: '.04em', padding: '5px 10px', borderRadius: 999, textDecoration: 'none', boxShadow: '0 2px 7px rgba(0,152,70,.28)' }}>
                  XEM HỒ SƠ NĂNG LỰC <ChevronRight size={10} strokeWidth={3} />
                </a>
              </div>
            </div>
          </div>

          {/* ── SERVICE COMMITMENT ──────────────────────────────── */}
          <div className="f3" style={{ padding: `0 ${P}px 5px` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <div style={{ flex: 1, height: 1, background: G, opacity: .32 }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: GD, letterSpacing: '.1em', whiteSpace: 'nowrap' }}>CAM KẾT DỊCH VỤ</span>
              <div style={{ flex: 1, height: 1, background: G, opacity: .32 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
              {([
                { Icon: ShieldCheck, vi: 'AN TOÀN',    en: 'SAFE',      color: G,  bg: '#EEF7F2' },
                { Icon: Award,       vi: 'CHẤT LƯỢNG', en: 'QUALITY',   color: G,  bg: '#EEF7F2' },
                { Icon: PiggyBank,   vi: 'TIẾT KIỆM',  en: 'EFFICIENT', color: OR, bg: '#FFF7ED' },
              ] as const).map(({ Icon, vi, en, color, bg }, i) => (
                <div key={i} style={{ ...card, padding: '9px 4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} color={color} strokeWidth={1.8} />
                  </div>
                  <p style={{ fontSize: 9.5, fontWeight: 800, color: '#111', letterSpacing: '.02em', textAlign: 'center', lineHeight: 1.2 }}>{vi}</p>
                  <p style={{ fontSize: 8, fontWeight: 700, color, letterSpacing: '.07em', marginTop: -2 }}>{en}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── FOOTER ──────────────────────────────────────────── */}
          <footer className="f4" style={{ position: 'relative', background: 'linear-gradient(170deg,#D6F0E0 0%,#EEF7F2 40%,#C8EDD8 100%)', borderTop: '2px solid #A8D8B9', padding: '14px 16px 18px', textAlign: 'center', overflow: 'hidden', marginTop: 2 }}>
            <svg style={{ position: 'absolute', bottom: -8, left: -8, width: 90, height: 90, opacity: .22, animation: 'leafSway 4s ease-in-out infinite', transformOrigin: 'bottom left', pointerEvents: 'none' }} viewBox="0 0 100 100">
              <path d="M10 90 C10 90 5 50 40 30 C60 18 85 20 90 10 C90 10 95 55 60 72 C40 82 10 90 10 90Z" fill="#009846"/>
              <line x1="10" y1="90" x2="70" y2="25" stroke="#fff" strokeWidth="1.5" strokeOpacity=".4"/>
              <line x1="35" y1="55" x2="65" y2="35" stroke="#fff" strokeWidth="1" strokeOpacity=".3"/>
            </svg>
            <svg style={{ position: 'absolute', bottom: -10, right: -10, width: 85, height: 85, opacity: .2, animation: 'leafSway2 5s ease-in-out infinite', transformOrigin: 'bottom right', pointerEvents: 'none' }} viewBox="0 0 100 100">
              <path d="M90 90 C90 90 95 50 60 30 C40 18 15 20 10 10 C10 10 5 55 40 72 C60 82 90 90 90 90Z" fill="#F37021"/>
              <line x1="90" y1="90" x2="30" y2="25" stroke="#fff" strokeWidth="1.5" strokeOpacity=".35"/>
            </svg>
            <svg style={{ position: 'absolute', top: 4, right: 18, width: 28, height: 28, opacity: .18, animation: 'leafSway 6s ease-in-out infinite reverse', pointerEvents: 'none' }} viewBox="0 0 50 50">
              <path d="M5 45 C5 45 2 25 20 15 C30 9 43 10 45 5 C45 5 48 28 30 36 C20 41 5 45 5 45Z" fill="#009846"/>
            </svg>
            <svg style={{ position: 'absolute', top: 2, left: 14, width: 22, height: 22, opacity: .15, animation: 'leafSway2 7s ease-in-out infinite', pointerEvents: 'none' }} viewBox="0 0 50 50">
              <path d="M45 45 C45 45 48 25 30 15 C20 9 7 10 5 5 C5 5 2 28 20 36 C30 41 45 45 45 45Z" fill="#F37021"/>
            </svg>
            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/tps1-logo-horizontal.png" alt="TPS1"
                style={{ height: 28, objectFit: 'contain', display: 'block', margin: '0 auto 5px', filter: 'drop-shadow(0 1px 3px rgba(0,100,40,.15))' }} />
              <p style={{ fontSize: 10.5, fontWeight: 800, color: GD, letterSpacing: '.04em', marginBottom: 2 }}>{CO.vi}</p>
              <p style={{ fontSize: 10, color: '#5A8A6A' }}>© {new Date().getFullYear()} Thực Phẩm Số Một.</p>
            </div>
          </footer>

        </div>
      </div>

      {/* ── QR MODAL ──────────────────────────────────────────────── */}
      {showQr && (
        <div onClick={e => e.target === e.currentTarget && setShowQr(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(11,59,46,.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 22, padding: '24px 18px 18px', width: '100%', maxWidth: 310, textAlign: 'center', position: 'relative', boxShadow: '0 18px 50px rgba(0,0,0,.2)' }}>
            <button onClick={() => setShowQr(false)}
              style={{ position: 'absolute', top: 11, right: 11, width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} strokeWidth={2.5} color="#6B7280" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/tps1-logo-horizontal.png" alt="Logo" style={{ height: 24, objectFit: 'contain', margin: '0 auto 9px', display: 'block' }} />
            <h3 style={{ fontSize: 14, fontWeight: 900, color: GD, marginBottom: 2 }}>{data.name}</h3>
            <p style={{ fontSize: 9.5, color: G, fontWeight: 700, letterSpacing: '.1em', marginBottom: 14 }}>{data.title_vi}</p>
            <div style={{ width: 190, height: 190, margin: '0 auto 12px', borderRadius: 14, border: '2px solid #E5E7EB', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QRCodeCanvas
                ref={qrRef}
                value={currentUrl}
                size={170}
                bgColor="#ffffff"
                fgColor={G}
                level="M"
                style={{ borderRadius: 7 }}
              />
            </div>
            <p style={{ fontSize: 11.5, color: '#6B7280', marginBottom: 13 }}>Quét mã để lưu thông tin liên hệ</p>
            <button onClick={downloadQr} className="tap"
              style={{ width: '100%', padding: '11px 0', borderRadius: 12, border: 'none', background: G, color: '#fff', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 14px rgba(0,152,70,.28)' }}>
              <Download size={14} strokeWidth={2.5} /> Tải hình QR
            </button>
          </div>
        </div>
      )}
    </>
  )
}
