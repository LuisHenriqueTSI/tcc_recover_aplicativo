// Botão reutilizável do Design System Recover
export default function Button({ children, variant = 'primary', ...props }) {
  const base = 'px-4 py-2 rounded font-heading font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-secondary text-white hover:bg-secondary-dark',
    accent: 'bg-accent text-white hover:bg-accent-dark',
    outline: 'border border-primary text-primary bg-white hover:bg-primary hover:text-white',
    disabled: 'bg-neutral-light text-neutral-dark cursor-not-allowed opacity-50',
  };
  const style = `${base} ${variants[variant] || variants.primary}`;
  return (
    <button className={style} {...props}>
      {children}
    </button>
  );
}
