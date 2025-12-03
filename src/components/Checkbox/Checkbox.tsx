export default function Checkbox({
    checked,
    label,
    ...props
  }: {
    label: React.ReactElement | string | number;
  } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
      <label className="inline-flex items-center cursor-pointer">
        <input
          {...props}
          type="checkbox"
          checked={checked}
          className="form-checkbox rounded-full h-5 w-5 text-twogc-purple focus:ring-twogc-purple border-twogc-gray-300"
        />
        <span className="ml-2">{label}</span>
      </label>
    );
  }