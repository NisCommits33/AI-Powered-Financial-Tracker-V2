"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-surface group-[.toaster]:text-white group-[.toaster]:border-white/20 group-[.toaster]:shadow-lg",
                    description: "group-[.toast]:text-white/70",
                    actionButton:
                        "group-[.toast]:bg-primary group-[.toast]:text-white",
                    cancelButton:
                        "group-[.toast]:bg-white/20 group-[.toast]:text-white",
                },
            }}
            {...props}
        />
    );
};

export { Toaster };