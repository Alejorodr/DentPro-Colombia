// Lucide-style static icons used by the DentPro UI kits.
// Production code uses components/ui/Icon.tsx with AnimateIcons/Lucide.

const DPKitIcon = ({
  children,
  size = 20,
  className = "",
  style = {},
  strokeWidth = 2,
  viewBox = "0 0 24 24",
  ...props
}) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox={viewBox}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
    style={style}
  >
    {children}
  </svg>
);

const I = {};

I.List = (p) => <DPKitIcon {...p}><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></DPKitIcon>;
I.X = (p) => <DPKitIcon {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></DPKitIcon>;
I.CaretLeft = (p) => <DPKitIcon {...p}><path d="m15 18-6-6 6-6" /></DPKitIcon>;
I.CaretRight = (p) => <DPKitIcon {...p}><path d="m9 18 6-6-6-6" /></DPKitIcon>;
I.MagnifyingGlass = (p) => <DPKitIcon {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></DPKitIcon>;
I.Bell = (p) => <DPKitIcon {...p}><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" /></DPKitIcon>;
I.Question = (p) => <DPKitIcon {...p}><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4" /><path d="M12 17h.01" /></DPKitIcon>;
I.Gear = (p) => <DPKitIcon {...p}><circle cx="12" cy="12" r="3.5" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.1a1.65 1.65 0 0 0-.4-1.1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.1A1.65 1.65 0 0 0 4.2 9a1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.1a1.65 1.65 0 0 0 .4 1.1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.23.33.43.68.6 1h.1a2 2 0 1 1 0 4H20c-.17.35-.37.67-.6 1Z" /></DPKitIcon>;

I.Phone = (p) => <DPKitIcon {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.63 2.63a2 2 0 0 1-.45 2.11L8.1 9.65a16 16 0 0 0 6.25 6.25l1.19-1.19a2 2 0 0 1 2.11-.45c.85.3 1.73.51 2.63.63A2 2 0 0 1 22 16.92Z" /></DPKitIcon>;
I.WhatsappLogo = (p) => <DPKitIcon {...p}><path d="M4.7 19.3 6 15.9a7.4 7.4 0 1 1 2.2 2.1Z" /><path d="M9.5 8.8c.25-.28.55-.26.76.04l.82 1.16c.18.26.14.6-.1.82l-.34.33c.54 1.02 1.36 1.83 2.4 2.36l.35-.34c.24-.23.56-.27.82-.08l1.15.82c.3.21.32.52.05.77-.54.52-1.18.78-1.9.6-2.34-.56-4.2-2.38-4.8-4.72-.18-.72.1-1.36.78-1.76Z" /></DPKitIcon>;
I.EnvelopeSimple = (p) => <DPKitIcon {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></DPKitIcon>;
I.ChatCircleDots = (p) => <DPKitIcon {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5a8.5 8.5 0 1 1 17 0Z" /><path d="M9 12h.01" /><path d="M12 12h.01" /><path d="M15 12h.01" /></DPKitIcon>;
I.MapPin = (p) => <DPKitIcon {...p}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></DPKitIcon>;
I.Clock = (p) => <DPKitIcon {...p}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></DPKitIcon>;

I.InstagramLogo = (p) => <DPKitIcon {...p}><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.2" /><path d="M16.7 7.5h.01" /></DPKitIcon>;
I.FacebookLogo = (p) => <DPKitIcon {...p}><path d="M15 8h-2a2 2 0 0 0-2 2v2H9v3h2v6h3v-6h2.2l.8-3H14v-1.6c0-.8.3-1.4 1.3-1.4H17V6.3A9.8 9.8 0 0 0 15 6Z" /></DPKitIcon>;
I.TiktokLogo = (p) => <DPKitIcon {...p}><path d="M14 4v10.1a4.1 4.1 0 1 1-3.3-4" /><path d="M14 4c.7 2.9 2.35 4.55 5 5" /></DPKitIcon>;

I.Sparkle = (p) => <DPKitIcon {...p}><path d="m12 3-1.9 5.8L4.3 10.7l5.8 1.9L12 18.4l1.9-5.8 5.8-1.9-5.8-1.9Z" /><path d="M19 3v4" /><path d="M21 5h-4" /><path d="M5 17v3" /><path d="M6.5 18.5h-3" /></DPKitIcon>;
I.Sparkles = I.Sparkle;
I.Smiley = (p) => <DPKitIcon {...p}><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01" /><path d="M15 9h.01" /></DPKitIcon>;
I.Stethoscope = (p) => <DPKitIcon {...p}><path d="M6 3v5a6 6 0 0 0 12 0V3" /><path d="M8 3H4" /><path d="M20 3h-4" /><path d="M12 14v3a4 4 0 0 0 8 0v-1" /><circle cx="20" cy="15" r="2" /></DPKitIcon>;
I.DiamondsFour = (p) => <DPKitIcon {...p}><path d="m12 2 4 4-4 4-4-4Z" /><path d="m12 14 4 4-4 4-4-4Z" /><path d="m2 12 4-4 4 4-4 4Z" /><path d="m14 12 4-4 4 4-4 4Z" /></DPKitIcon>;
I.Tooth = (p) => <DPKitIcon {...p}><path d="M8.6 3.4c1.35 0 2.1.7 3.4.7s2.05-.7 3.4-.7c2.35 0 4 1.9 4 4.52 0 1.8-.7 3.12-1.35 4.25-.72 1.25-1.04 2.5-1.25 3.95-.28 1.9-.78 4.48-2.35 4.48-1.02 0-1.25-1.2-1.6-2.86-.24-1.13-.48-2.35-.85-2.35s-.61 1.22-.85 2.35c-.35 1.66-.58 2.86-1.6 2.86-1.57 0-2.07-2.58-2.35-4.48-.21-1.45-.53-2.7-1.25-3.95C5.3 11.04 4.6 9.72 4.6 7.92c0-2.62 1.65-4.52 4-4.52Z" /><path d="M9.3 6.6c.77.38 1.62.58 2.7.58s1.93-.2 2.7-.58" /></DPKitIcon>;
I.Baby = (p) => <DPKitIcon {...p}><path d="M9 12h.01" /><path d="M15 12h.01" /><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" /><path d="M19 11a7 7 0 1 1-14 0c0-2 .9-3.8 2.3-5.1C7.7 7 9 8 11 8c2.4 0 3.2-1.3 3.2-2.3C17 6.7 19 8.7 19 11Z" /></DPKitIcon>;

I.CheckCircle = (p) => <DPKitIcon {...p}><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></DPKitIcon>;
I.CalendarCheck = (p) => <DPKitIcon {...p}><path d="M8 2v4" /><path d="M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /><path d="m9 16 2 2 4-4" /></DPKitIcon>;
I.ShieldCheck = (p) => <DPKitIcon {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></DPKitIcon>;
I.UsersThree = (p) => <DPKitIcon {...p}><path d="M16 21v-2a4 4 0 0 0-8 0v2" /><circle cx="12" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M2 21v-2a4 4 0 0 1 3-3.87" /><path d="M8 3.13a4 4 0 0 0 0 7.75" /></DPKitIcon>;
I.CreditCard = (p) => <DPKitIcon {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></DPKitIcon>;
I.Headset = (p) => <DPKitIcon {...p}><path d="M3 14v-3a9 9 0 0 1 18 0v3" /><path d="M21 14v2a3 3 0 0 1-3 3h-2" /><path d="M3 14h4v5H5a2 2 0 0 1-2-2Z" /><path d="M21 14h-4v5h2a2 2 0 0 0 2-2Z" /></DPKitIcon>;
I.ChartLineUp = (p) => <DPKitIcon {...p}><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-4 4" /><path d="M15 9h4v4" /></DPKitIcon>;
I.Medal = (p) => <DPKitIcon {...p}><path d="M7.2 2h9.6L14 8h-4Z" /><circle cx="12" cy="15" r="6" /><path d="m10.5 15 1 1 2-2" /></DPKitIcon>;

I.UserCircle = (p) => <DPKitIcon {...p}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M7 20.7a5 5 0 0 1 10 0" /></DPKitIcon>;
I.SignIn = (p) => <DPKitIcon {...p}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="m10 17 5-5-5-5" /><path d="M15 12H3" /></DPKitIcon>;
I.SignOut = (p) => <DPKitIcon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></DPKitIcon>;
I.House = (p) => <DPKitIcon {...p}><path d="m3 11 9-8 9 8" /><path d="M5 10v11h14V10" /><path d="M9 21v-6h6v6" /></DPKitIcon>;
I.Users = (p) => <DPKitIcon {...p}><path d="M16 21v-2a4 4 0 0 0-8 0v2" /><circle cx="12" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></DPKitIcon>;
I.ClipboardText = (p) => <DPKitIcon {...p}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M8 12h8" /><path d="M8 16h6" /></DPKitIcon>;
I.SquaresFour = (p) => <DPKitIcon {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></DPKitIcon>;
I.ClockCounter = (p) => <DPKitIcon {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v6h6" /><path d="M12 7v5l3 2" /></DPKitIcon>;
I.FileText = (p) => <DPKitIcon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h5" /></DPKitIcon>;
I.TrendUp = (p) => <DPKitIcon {...p}><path d="m3 17 6-6 4 4 8-8" /><path d="M14 7h7v7" /></DPKitIcon>;
I.Sun = (p) => <DPKitIcon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></DPKitIcon>;
I.Moon = (p) => <DPKitIcon {...p}><path d="M20.99 12.8A8.5 8.5 0 1 1 11.2 3.01 7 7 0 0 0 20.99 12.8Z" /></DPKitIcon>;

window.DPIcons = I;
