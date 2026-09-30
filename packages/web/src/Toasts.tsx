import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Notification } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

type Toast = { id: number; message: string };
const ToastContext = createContext<(message: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => current.concat({ id, message }));
  }, []);
  const dismiss = useCallback(
    (id: number) =>
      setToasts((current) => current.filter((toast) => toast.id !== id)),
    [],
  );
  const context = useMemo(() => show, [show]);
  return (
    <ToastContext.Provider value={context}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <ToastMessage key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function ToastMessage({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), 3500);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast.id]);
  return (
    <Notification
      className="toast"
      color="teal"
      icon={<IconCheck size={18} />}
      role="status"
      withCloseButton
      closeButtonProps={{ "aria-label": "Dismiss notification" }}
      onClose={() => onDismiss(toast.id)}
    >
      {toast.message}
    </Notification>
  );
}
