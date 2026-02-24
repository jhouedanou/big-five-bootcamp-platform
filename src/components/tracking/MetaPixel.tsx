"use client";

import { useEffect } from "react";
import Script from "next/script";

declare global {
  interface Window {
    fbq: ((...args: unknown[]) => void) | undefined;
    _fbq: ((...args: unknown[]) => void) | undefined;
  }
}

interface MetaPixelProps {
  pixelId: string;
}

export function MetaPixel({ pixelId }: MetaPixelProps) {
  useEffect(() => {
    // Don't initialize if no pixel ID
    if (!pixelId) return;
  }, [pixelId]);

  if (!pixelId) return null;

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

/**
 * Track a custom Meta Pixel event.
 * Call this from client components after user actions.
 */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, unknown>
) {
  if (
    typeof window !== "undefined" &&
    typeof window.fbq === "function"
  ) {
    window.fbq("track", eventName, params);
  }
}

export default MetaPixel;
