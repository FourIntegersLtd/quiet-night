"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

import { ConfirmModal, type ConfirmModalButton, type ConfirmModalIcon } from "@/components/ConfirmModal";

type AlertOptions = {
  title: string;
  message: string;
  buttons?: ConfirmModalButton[];
  icon?: ConfirmModalIcon;
};

type AlertContextValue = {
  show: (options: AlertOptions) => void;
};

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [buttons, setButtons] = useState<ConfirmModalButton[]>([]);
  const [icon, setIcon] = useState<ConfirmModalIcon | undefined>();

  const show = useCallback((options: AlertOptions) => {
    setTitle(options.title);
    setMessage(options.message);
    setIcon(options.icon);
    setButtons(
      options.buttons && options.buttons.length > 0
        ? options.buttons
        : [{ text: "OK", onPress: () => {} }]
    );
    setVisible(true);
  }, []);

  const onRequestClose = useCallback(() => setVisible(false), []);

  return (
    <AlertContext.Provider value={{ show }}>
      {children}
      <ConfirmModal
        visible={visible}
        title={title}
        message={message}
        buttons={buttons}
        icon={icon}
        onRequestClose={onRequestClose}
      />
    </AlertContext.Provider>
  );
}

export function useAlert(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error("useAlert must be used within AlertProvider");
  }
  return ctx;
}
