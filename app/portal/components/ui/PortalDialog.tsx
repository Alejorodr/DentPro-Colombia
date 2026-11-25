"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";

const SIZE_CLASSES = {
  sm: "w-[min(24rem,calc(100%-2rem))]",
  md: "w-[min(28rem,calc(100%-2rem))]",
  lg: "w-[min(32rem,calc(100%-2rem))]",
  xl: "w-[min(42rem,calc(100%-2rem))]",
  full: "w-[min(64rem,calc(100%-2rem))]",
} as const;

const PANEL_CLASSES =
  "overflow-y-auto rounded-2xl border-0 bg-white p-6 text-slate-700 shadow-xl dark:bg-surface-elevated dark:text-slate-200";

type PortalDialogProps = {
  /** Se llama cuando el diálogo se cierra: Esc, gesto de volver, clic afuera o `close()`. */
  onClose: () => void;
  /** id del título visible. Si no hay título visible, usa `label`. */
  labelledBy?: string;
  label?: string;
  size?: keyof typeof SIZE_CLASSES;
  /**
   * Clic en el fondo para cerrar. Solo para diálogos de lectura o confirmación: en formularios
   * un clic accidental perdería lo escrito. Esc y el gesto de volver cierran siempre.
   */
  dismissible?: boolean;
  /** Reemplaza el estilo del panel (fondo, padding, bordes, overflow). El ancho lo da `size`. */
  className?: string;
  children: ReactNode;
};

/**
 * Modal del portal sobre `<dialog>` nativo abierto con `showModal()` (DOG-40). El navegador da el
 * foco atrapado, la página inerte, Esc y el retorno del foco; no hace falta `role="dialog"`,
 * `aria-modal` ni una trampa de foco a mano. Se monta de forma condicional, como antes.
 */
export function PortalDialog({
  onClose,
  labelledBy,
  label,
  size = "lg",
  dismissible = false,
  className = PANEL_CLASSES,
  children,
}: PortalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const mountedRef = useRef(true);
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    mountedRef.current = true;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      // El padre lo desmonta (p. ej. tras guardar): cerrar devuelve el foco a quien lo abrió.
      mountedRef.current = false;
      if (dialog?.open) dialog.close();
    };
  }, []);

  // El fondo y el propio <dialog> son el mismo target: lo que no cae en un hijo está afuera del
  // contenido. Se exige presionar y soltar afuera para que arrastrar al seleccionar texto no cierre.
  const handlePointerDown = (event: PointerEvent<HTMLDialogElement>) => {
    pressedOnBackdrop.current = dismissible && event.target === event.currentTarget && isOutside(event);
  };
  const handlePointerUp = (event: PointerEvent<HTMLDialogElement>) => {
    if (pressedOnBackdrop.current && event.target === event.currentTarget && isOutside(event)) {
      event.currentTarget.close();
    }
    pressedOnBackdrop.current = false;
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      onClose={() => {
        if (mountedRef.current) onCloseRef.current();
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className={`portal-dialog m-auto max-h-[calc(100dvh-2rem)] max-w-none ${SIZE_CLASSES[size]} ${className}`}
    >
      {children}
    </dialog>
  );
}

function isOutside(event: PointerEvent<HTMLDialogElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
}
