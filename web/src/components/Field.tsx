type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  hint?: string;
  defaultValue?: string;
  placeholder?: string;
  max?: string;
  autoComplete?: string;
};

/** Ein beschriftetes Eingabefeld. Eine Stelle für alle Formularfelder. */
export function Field({
  label,
  name,
  type = "text",
  required,
  hint,
  defaultValue,
  placeholder,
  max,
  autoComplete,
}: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        {label}
        {required ? null : (
          <span className="ml-1.5 font-normal text-ink-soft">optional</span>
        )}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        max={max}
        autoComplete={autoComplete}
        className="border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-pitch"
      />
      {hint ? <span className="text-xs text-ink-soft">{hint}</span> : null}
    </label>
  );
}

export function Select({
  label,
  name,
  required,
  hint,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  hint?: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        {label}
        {required ? null : (
          <span className="ml-1.5 font-normal text-ink-soft">optional</span>
        )}
      </span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-pitch"
      >
        <option value="" disabled>
          Bitte wählen
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <span className="text-xs text-ink-soft">{hint}</span> : null}
    </label>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="border-l-2 border-pitch bg-surface px-4 py-3 text-sm"
    >
      {children}
    </p>
  );
}

export function Submit({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="border border-pitch bg-pitch px-5 py-2.5 text-sm font-medium text-white"
    >
      {children}
    </button>
  );
}
