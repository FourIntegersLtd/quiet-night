import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";

const ENTITLEMENT_ID = "Quiet Night Pro";

interface SubscriptionState {
  isPro: boolean;
  loading: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionState>({
  isPro: false,
  loading: true,
  customerInfo: null,
  currentOffering: null,
  purchase: async () => false,
  restorePurchases: async () => false,
  refresh: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);

  const checkEntitlement = (info: CustomerInfo): boolean =>
    typeof info.entitlements.active[ENTITLEMENT_ID] !== "undefined";

  const refresh = useCallback(async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      setIsPro(checkEntitlement(info));
    } catch (e) {
      __DEV__ && console.warn("[Subscription] Failed to fetch customer info", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOfferings = useCallback(async () => {
    try {
      const offerings = await Purchases.getOfferings();
      setCurrentOffering(offerings.current ?? null);
    } catch (e) {
      __DEV__ && console.warn("[Subscription] Failed to fetch offerings", e);
    }
  }, []);

  useEffect(() => {
    refresh();
    fetchOfferings();

    const listener = Purchases.addCustomerInfoUpdateListener((info) => {
      setCustomerInfo(info);
      setIsPro(checkEntitlement(info));
    });

    return () => {
      if (typeof listener === "object" && listener && "remove" in listener) {
        (listener as { remove: () => void }).remove();
      }
    };
  }, [refresh, fetchOfferings]);

  const purchase = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);
      const active = checkEntitlement(info);
      setIsPro(active);
      return active;
    } catch (e: any) {
      if (e.userCancelled) return false;
      __DEV__ && console.warn("[Subscription] Purchase failed", e);
      throw e;
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      const active = checkEntitlement(info);
      setIsPro(active);
      return active;
    } catch (e) {
      __DEV__ && console.warn("[Subscription] Restore failed", e);
      return false;
    }
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{ isPro, loading, customerInfo, currentOffering, purchase, restorePurchases, refresh }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
