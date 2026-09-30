import {
  ActionIcon,
  Button,
  Modal,
  Progress,
  Tooltip,
  type ButtonProps,
} from "@mantine/core";
import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";

type TaskButtonProps = Omit<ButtonProps, "variant"> & {
  variant?: "default" | "primary" | "danger";
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
};

export function TaskButton({ variant = "default", ...props }: TaskButtonProps) {
  return (
    <Button
      {...props}
      variant={variant === "default" ? "default" : "filled"}
      color={variant === "danger" ? "red" : undefined}
    />
  );
}

export function IconAction({
  label,
  icon,
  onClick,
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}) {
  return (
    <Tooltip label={label} withArrow openDelay={500}>
      <ActionIcon
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        variant="subtle"
        size={32}
      >
        {icon}
      </ActionIcon>
    </Tooltip>
  );
}

export function DialogShell({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Modal
      opened
      onClose={onClose}
      centered
      withCloseButton={false}
      title={title}
      size={wide ? "900px" : "630px"}
      padding={20}
      classNames={{
        header: "taskdroid-modal-header",
        overlay: "taskdroid-modal-overlay",
        content: `dialog${wide ? " wide" : ""}`,
      }}
    >
      {children}
    </Modal>
  );
}

export function ProgressBar({
  value,
  label,
  size = 10,
  className,
}: {
  value: number;
  label: string;
  size?: number;
  className?: string;
}) {
  const boundedValue = Math.min(100, Math.max(0, value));
  return (
    <Progress
      value={boundedValue}
      size={size}
      radius="xl"
      aria-label={label}
      className={className}
      classNames={{ section: "taskdroid-progress-section" }}
    />
  );
}
