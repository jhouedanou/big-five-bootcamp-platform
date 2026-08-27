"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"

export function TawkTo() {
  const pathname = usePathname()
  if (pathname?.startsWith("/admin")) return null

  return (
    // `lazyOnload` : un widget de chat (~200 Ko) n'a rien à faire en concurrence
    // avec l'hydratation — il pesait sur INP/TBT de toute la surface publique.
    <Script id="tawk-to" strategy="lazyOnload">
      {`
        var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
        (function(){
          var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
          s1.async=true;
          s1.src='https://embed.tawk.to/6a1db0360071501c2cc23ec6/1jq1vgm3s';
          s1.charset='UTF-8';
          s1.setAttribute('crossorigin','*');
          s0.parentNode.insertBefore(s1,s0);
        })();
      `}
    </Script>
  )
}
