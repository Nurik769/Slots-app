import { Toaster as Sonner, toast } from "sonner";

const Toaster = (props) => (
  <Sonner
    theme="dark"
    className="toaster group"
    toastOptions={{
      classNames: {
        toast:
          "group toast group-[.toaster]:bg-[#111113] group-[.toaster]:text-white group-[.toaster]:border-white/10 group-[.toaster]:shadow-lg group-[.toaster]:shadow-black/20",
        description: "group-[.toast]:text-[#94a3b8]",
        actionButton:
          "group-[.toast]:bg-emerald-500 group-[.toast]:text-white",
        cancelButton:
          "group-[.toast]:bg-[#1a1a1d] group-[.toast]:text-[#94a3b8]",
      },
    }}
    {...props}
  />
);

export { Toaster, toast };
