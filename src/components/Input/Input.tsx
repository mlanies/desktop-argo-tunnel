import classNames from "classnames";
import "./Input.css";

export default function Input({
  className: propsClassName,
  addonBefore,
  addonAfter,
  type: inputType,
  readOnly,
  ...props
}: {
  addonBefore?: React.ReactNode;
  addonAfter?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const className = classNames(
    "inputForm",
    propsClassName,
  );

  return (
    <div className={className}>
      {addonBefore}
      <input
        {...props}
        type={inputType}
        readOnly={readOnly}
        className="input"
      />
      {addonAfter}
    </div>
  );
}
