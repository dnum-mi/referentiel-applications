import type { App, ComponentPublicInstance } from "vue";
import type { Router } from "vue-router";

declare global {
  interface Window {
    _paq: any[];
    Piwik?: {
      getAsyncTracker: () => MatomoInstance;
    };
  }
}

export interface MatomoOptions {
  host: string;
  siteId: number;
  trackerFileName?: string;
  trackerScriptUrl?: string;
  trackerUrl?: string;
  router?: Router;
  enableLinkTracking?: boolean;
  enableHeartBeatTimer?: boolean;
  heartBeatTimerInterval?: number;
  disableCookies?: boolean;
  requireConsent?: boolean;
  userId?: string;
  debug?: boolean;
}

interface MatomoInstance {
  trackPageView: (title?: string) => void;
  trackEvent: (category: string, action: string, name?: string, value?: number) => void;
  setCustomUrl: (url: string) => void;
  setReferrerUrl: (url: string) => void;
  enableLinkTracking: () => void;
}

interface MatomoPluginProperties {
  $matomo: MatomoInstance;
}

declare module "@vue/runtime-core" {
  interface ComponentCustomProperties extends MatomoPluginProperties {}
}

const defaultOptions: Partial<MatomoOptions> = {
  trackerFileName: "matomo",
  enableLinkTracking: true,
  enableHeartBeatTimer: false,
  heartBeatTimerInterval: 15,
  disableCookies: false,
  requireConsent: false,
  debug: false,
};

export default {
  install(app: App, setupOptions: MatomoOptions) {
    const options = { ...defaultOptions, ...setupOptions };
    const { host, siteId, trackerFileName, trackerUrl, trackerScriptUrl, router, debug } = options;

    window._paq = window._paq || [];

    window._paq.push(["setTrackerUrl", trackerUrl || `${host}/${trackerFileName}.php`]);
    window._paq.push(["setSiteId", siteId]);

    if (options.requireConsent) {
      window._paq.push(["requireConsent"]);
    }

    if (options.userId) {
      window._paq.push(["setUserId", options.userId]);
    }

    if (options.enableLinkTracking) {
      window._paq.push(["enableLinkTracking"]);
    }

    if (options.disableCookies) {
      window._paq.push(["disableCookies"]);
    }

    if (options.enableHeartBeatTimer) {
      window._paq.push(["enableHeartBeatTimer", options.heartBeatTimerInterval]);
    }

    // Chargement asynchrone du script
    const trackerScript = trackerScriptUrl || `${host}/${trackerFileName}.js`;
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = trackerScript;

    script.onload = () => {
      if (!window.Piwik) {
        console.error("Matomo n'a pas été chargé correctement");
        return;
      }

      const matomo = window.Piwik.getAsyncTracker();

      // Configuration des méthodes globales
      app.config.globalProperties.$matomo = {
        trackPageView(title?: string) {
          debug && console.log("[Matomo] Track page view:", title);
          matomo.trackPageView(title);
        },
        trackEvent(category: string, action: string, name?: string, value?: number) {
          debug && console.log("[Matomo] Track event:", { category, action, name, value });
          matomo.trackEvent(category, action, name, value);
        },
        setCustomUrl(url: string) {
          debug && console.log("[Matomo] Set custom URL:", url);
          matomo.setCustomUrl(url);
        },
        setReferrerUrl(url: string) {
          debug && console.log("[Matomo] Set referrer URL:", url);
          matomo.setReferrerUrl(url);
        },
        enableLinkTracking() {
          matomo.enableLinkTracking();
        },
      };

      // Intégration avec Vue Router
      if (router) {
        router.afterEach((to, from) => {
          const title = typeof to.meta.title === "string" ? to.meta.title : document.title;
          const url = window.location.origin + to.fullPath;
          const referrerUrl = from.fullPath ? window.location.origin + from.fullPath : undefined;

          if (to.meta.analyticsIgnore) {
            debug && console.log("[Matomo] Ignoring route:", to.fullPath);
            return;
          }

          debug && console.log("[Matomo] Tracking route:", to.fullPath);

          if (referrerUrl) {
            matomo.setReferrerUrl(referrerUrl);
          }
          matomo.setCustomUrl(url);
          matomo.trackPageView(title);
        });
      }
    };

    script.onerror = (error) => {
      console.error("Erreur de chargement du script Matomo:", error);
    };

    document.head.appendChild(script);
  },
};
