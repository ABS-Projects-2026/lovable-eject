export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Container bracket — the thing being escaped */}
      <path
        d="M7 20V17C7 14.2 7 12.8 7.7 11.8C8.1 11.2 8.6 10.7 9.2 10.3"
        stroke="#22d3ee"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M17 20V17C17 14.2 17 12.8 16.3 11.8C15.9 11.2 15.4 10.7 14.8 10.3"
        stroke="#22d3ee"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
      {/* Arrow breaking free upward */}
      <path
        d="M12 14V4"
        stroke="#22d3ee"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 7.5L12 3.5L16 7.5"
        stroke="#22d3ee"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
