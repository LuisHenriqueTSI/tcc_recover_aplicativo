// Input reutilizável do Design System Recover
export default function Input({ label, ...props }) {
  return (
    <label className="block mb-2">
      <span className="block text-sm font-medium text-neutral-dark mb-1">{label}</span>
      <input
        className="w-full px-3 py-2 border border-neutral-light rounded focus:outline-none focus:ring-2 focus:ring-primary"
        {...props}
      />
    </label>
  );
}
