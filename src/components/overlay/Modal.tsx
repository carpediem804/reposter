"use client";
import { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onCloseAction: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onCloseAction, title, children, maxWidth = "max-w-5xl" }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCloseAction} />
      <div className={`relative bg-white w-full ${maxWidth} sm:mx-4 mx-0 rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-200 p-0 max-h-[90vh] sm:max-h-[85vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onCloseAction} className="text-gray-500 hover:text-gray-700" aria-label="닫기">✕</button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}


