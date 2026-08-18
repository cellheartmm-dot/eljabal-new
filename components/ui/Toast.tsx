"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          top: 24,
          left: 24,
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              pointerEvents: "auto",
              minWidth: 280,
              padding: "14px 20px",
              borderRadius: "14px",
              background:
                toast.type === "success"
                  ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
                  : toast.type === "error"
                  ? "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)"
                  : "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
              color: "#ffffff",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              fontSize: "14px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              animation: "toastSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <span style={{ fontSize: 18 }}>
              {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}
            </span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (msg: string) => alert(msg),
    };
  }
  return context;
}
