import Link from "next/link";

interface ExploreButtonProps {
  href: string;
  label: string;
}

const ease = "ease-[cubic-bezier(0.23,1,0.32,1)]";

export default function ExploreButton({ href, label }: ExploreButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`group relative flex h-12.5 w-48 cursor-pointer items-center justify-center overflow-hidden rounded-[100px] border border-transparent bg-transparent text-sm font-semibold text-(--tp-btn-accent) shadow-[0_0_0_1.5px_var(--tp-btn-accent)] transition-all duration-600 ${ease} hover:rounded-xl hover:text-(--tp-btn-on-accent) hover:shadow-[0_0_0_12px_transparent] active:scale-95 active:shadow-[0_0_0_3px_var(--tp-btn-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--tp-btn-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--tp-btn-bg) motion-reduce:transition-none motion-reduce:active:scale-100`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
        className={`absolute -left-1/4 z-10 w-5 fill-(--tp-btn-accent) transition-all duration-800 ${ease} group-hover:left-4 group-hover:fill-(--tp-btn-on-accent) motion-reduce:transition-none`}>
        <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
      </svg>
      <span className={`relative z-10 -translate-x-2 transition-all duration-800 ${ease} group-hover:translate-x-3 motion-reduce:transition-none`}>
        {label}
      </span>
      <span aria-hidden="true"
        className={`absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--tp-btn-accent) opacity-0 transition-all duration-800 ${ease} group-hover:h-62.5 group-hover:w-62.5 group-hover:opacity-100 motion-reduce:transition-none`} />
      <svg aria-hidden="true" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
        className={`absolute right-4 z-10 w-5 fill-(--tp-btn-accent) transition-all duration-800 ${ease} group-hover:-right-1/4 group-hover:fill-(--tp-btn-on-accent) motion-reduce:transition-none`}>
        <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
      </svg>
    </Link>
  );
}
