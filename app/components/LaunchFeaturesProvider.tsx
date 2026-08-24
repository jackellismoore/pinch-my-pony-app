"use client";

import { createContext, useContext } from "react";

type LaunchFeatures = {
  identityEnabled: boolean;
  membershipCheckoutEnabled: boolean;
};

const LaunchFeaturesContext = createContext<LaunchFeatures>({
  identityEnabled: false,
  membershipCheckoutEnabled: false,
});

export function LaunchFeaturesProvider({
  children,
  features,
}: {
  children: React.ReactNode;
  features: LaunchFeatures;
}) {
  return (
    <LaunchFeaturesContext.Provider value={features}>
      {children}
    </LaunchFeaturesContext.Provider>
  );
}

export function useLaunchFeatures() {
  return useContext(LaunchFeaturesContext);
}
