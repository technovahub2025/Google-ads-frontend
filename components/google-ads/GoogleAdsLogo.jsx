export default function GoogleAdsLogo({ className = 'w-16 h-16', variant = 'full' }) {
  if (variant === 'icon') {
    return (
      <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="16" className="fill-google-ads-blue" />
        <path
          d="M32 12 L44 50 L18 30 L44 14 L18 34 L32 50 Z"
          className="fill-google-ads-green"
        />
        <circle cx="32" cy="32" r="8" className="fill-white" />
      </svg>
    )
  }

  return (
    <svg className={className} viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-google-ads-blue" />
      <path
        d="M20 4 L30 38 L8 20 L30 8 L8 22 L20 38 Z"
        className="fill-google-ads-green"
      />
      <circle cx="20" cy="20" r="6" className="fill-white" />
      <text x="52" y="27" className="font-headline-md text-headline-md text-primary" fontWeight="700">
        Google Ads
      </text>
    </svg>
  )
}
